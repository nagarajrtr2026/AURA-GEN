import express from 'express';
import { performance } from 'node:perf_hooks';
import { config } from './config.js';
import { CodeGenerationAgent } from './agents/code-generation-agent.js';
import { FrictionEngine } from './services/friction-engine.js';
import { telemetryInputSchema } from './schemas/ui-schema.js';
import { AuraWebSocketServer } from './websocket/server.js';
const app = express();
app.use(express.json());
app.use((_req, res, next) => {
    const origin = _req.header('Origin');
    if (origin && origin !== config.frontendOrigin)
        return res.sendStatus(403);
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS')
        return res.sendStatus(204);
    next();
});
const frictionEngine = new FrictionEngine();
const codeGenerationAgent = new CodeGenerationAgent();
const wsServer = new AuraWebSocketServer(config.wsPort, config.frontendOrigin);
function hasGroqApiKey() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    return Boolean(apiKey && !apiKey.startsWith('replace-with-'));
}
function getGenerationFailure(error) {
    const diagnostic = error instanceof Error ? error.message : 'Unknown generation error.';
    const normalized = diagnostic.toLowerCase();
    if (normalized.includes('no credits remaining') || normalized.includes('insufficient_quota')) {
        return {
            message: 'AI generation is unavailable because the Groq account has reached its usage or billing limit. Check Groq console usage and billing, then choose “Try again.” Your form data is safe.',
            diagnostic,
        };
    }
    if (normalized.includes('401') || normalized.includes('invalid_api_key')) {
        return {
            message: 'Groq rejected the API key. Update GROQ_API_KEY in backend/.env, restart the backend, then choose “Try again.” Your form data is safe.',
            diagnostic,
        };
    }
    if (normalized.includes('429') || normalized.includes('rate limit')) {
        return {
            message: 'Groq is rate-limiting requests. Wait until the Groq usage limit resets, then choose “Try again.” Your form data is safe.',
            diagnostic,
        };
    }
    return {
        message: 'Unable to generate an adaptive interface. Your form data is safe; check the backend logs, then retry or continue with the original form.',
        diagnostic,
    };
}
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        llmProvider: 'groq',
        llmConfigured: hasGroqApiKey(),
        websocketReady: true,
        model: config.groqModel,
        port: config.port,
    });
});
app.post('/api/telemetry', async (req, res) => {
    try {
        const parsed = telemetryInputSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }
        const event = {
            type: 'telemetry_update',
            timestamp: Date.now(),
            data: {
                cursorVelocity: parsed.data.cursorVelocity,
                hesitation: parsed.data.hesitation,
                repeatedClicks: parsed.data.repeatedClicks,
                fieldErrors: parsed.data.fieldErrors,
                activeField: parsed.data.activeField ?? null,
                formState: parsed.data.formState ?? {},
            },
        };
        const decision = frictionEngine.evaluateTelemetry(event);
        wsServer.broadcast('cognitive_load_update', {
            score: decision.score,
            level: decision.level,
            reason: decision.reason,
        });
        if (decision.level === 'HIGH') {
            const requestId = parsed.data.requestId ?? `ui-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
            try {
                if (!hasGroqApiKey()) {
                    const message = 'Adaptive generation is not configured. Add a valid GROQ_API_KEY to backend/.env, then restart the development server.';
                    wsServer.sendToRequest(requestId, 'ui_generation_error', { message });
                    return res.status(503).json({ error: 'Generation is not configured.', message });
                }
                const generationStart = performance.now();
                let firstTokenMs = null;
                let tokenCount = 0;
                let cacheStatus = 'miss';
                wsServer.sendToRequest(requestId, 'ui_generation_started', { status: 'started', startedAt: Date.now() });
                const generationRequest = {
                    telemetry: {
                        cursorVelocity: event.data.cursorVelocity,
                        hesitation: event.data.hesitation,
                        repeatedClicks: event.data.repeatedClicks,
                        fieldErrors: event.data.fieldErrors,
                        activeField: event.data.activeField ?? null,
                        clickCount: parsed.data.interactionContext?.clickCount ?? 0,
                        fieldInteractions: parsed.data.interactionContext?.fieldInteractions ?? {},
                    },
                    frictionLevel: decision.level,
                    context: JSON.stringify({
                        friction: { score: decision.score, level: decision.level, reason: decision.reason },
                        activeField: decision.activeField,
                        interaction: parsed.data.interactionContext ?? {},
                    }),
                    formState: parsed.data.formState ?? {},
                };
                const payload = await codeGenerationAgent.generate(generationRequest, {
                    onToken: (token) => {
                        tokenCount += 1;
                        if (firstTokenMs === null)
                            firstTokenMs = Number((performance.now() - generationStart).toFixed(1));
                        wsServer.sendToRequest(requestId, 'ui_generation_stream', {
                            requestId,
                            stage: tokenCount === 1 ? 'first_token' : 'streaming',
                            token,
                            tokenCount,
                            firstTokenMs,
                        });
                    },
                    onCacheHit: (kind) => {
                        cacheStatus = kind;
                    },
                });
                const validationCompleteMs = Number((performance.now() - generationStart).toFixed(1));
                const metrics = {
                    generation_start: 0,
                    first_token: firstTokenMs,
                    validation_complete: validationCompleteMs,
                    cache_status: cacheStatus,
                };
                if (cacheStatus !== 'miss') {
                    wsServer.sendToRequest(requestId, 'ui_generation_stream', {
                        requestId,
                        stage: 'cache_hit',
                        tokenCount,
                        cacheStatus,
                    });
                }
                wsServer.sendToRequest(requestId, 'ui_generation_stream', {
                    requestId,
                    stage: 'validation_complete',
                    tokenCount,
                    metrics,
                });
                wsServer.sendToRequest(requestId, 'ui_generation_complete', { payload, metrics });
                return res.status(200).json({ success: true, decision, payload, metrics, requestId });
            }
            catch (error) {
                console.error(`[AuraGen] Code generation failed for request ${requestId}.`, error);
                const failure = getGenerationFailure(error);
                const errorData = {
                    message: failure.message,
                    ...(process.env.NODE_ENV === 'production' ? {} : { diagnostic: failure.diagnostic }),
                };
                wsServer.sendToRequest(requestId, 'ui_generation_error', errorData);
                return res.status(500).json({
                    error: 'Code generation failed.',
                    ...errorData,
                });
            }
        }
        return res.status(200).json({ success: true, decision });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown telemetry error.';
        return res.status(500).json({ error: 'Telemetry processing failed.', message });
    }
});
async function start() {
    await wsServer.start();
    const httpServer = app.listen(config.port);
    await new Promise((resolve, reject) => {
        httpServer.once('listening', resolve);
        httpServer.once('error', reject);
    });
    console.log(`AuraGen backend listening on http://localhost:${config.port} (WebSocket :${config.wsPort})`);
}
void start().catch((error) => {
    console.error('AuraGen backend failed to start.', error);
    wsServer.close();
    process.exitCode = 1;
});
