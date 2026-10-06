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
void wsServer.start().catch((error) => console.error('AuraGen WebSocket server failed to start.', error));
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        llmProvider: 'openai-compatible',
        llmConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: config.openAiModel,
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
                const message = 'Unable to generate an adaptive interface. Your form data is safe; retry or continue with the original form.';
                wsServer.sendToRequest(requestId, 'ui_generation_error', { message });
                return res.status(500).json({ error: 'Code generation failed.', message });
            }
        }
        return res.status(200).json({ success: true, decision });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown telemetry error.';
        return res.status(500).json({ error: 'Telemetry processing failed.', message });
    }
});
app.listen(config.port, () => {
    console.log(`AuraGen backend listening on http://localhost:${config.port}`);
});
