import express from 'express';
import { config } from './config.js';
import { CodeGenerationAgent } from './agents/code-generation-agent.js';
import { FrictionEngine } from './services/friction-engine.js';
import { telemetryInputSchema } from './schemas/ui-schema.js';
import { AuraWebSocketServer } from './websocket/server.js';
const app = express();
app.use(express.json());
const frictionEngine = new FrictionEngine();
const codeGenerationAgent = new CodeGenerationAgent(config.mockLlm);
const wsServer = new AuraWebSocketServer(config.port + 1);
wsServer.start();
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', mockLlm: config.mockLlm, port: config.port });
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
            },
        };
        const decision = frictionEngine.evaluateTelemetry(event);
        wsServer.broadcast('cognitive_load_update', {
            score: decision.score,
            level: decision.level,
            activeField: decision.activeField,
            reason: decision.reason,
        });
        if (decision.level === 'HIGH') {
            try {
                const payload = await codeGenerationAgent.generate({
                    telemetry: {
                        cursorVelocity: event.data.cursorVelocity,
                        hesitation: event.data.hesitation,
                        repeatedClicks: event.data.repeatedClicks,
                        fieldErrors: event.data.fieldErrors,
                        activeField: event.data.activeField ?? null,
                    },
                    frictionLevel: decision.level,
                    context: `High friction detected at field: ${decision.activeField ?? 'unknown'}`,
                });
                wsServer.broadcast('ui_generation_started', { status: 'started' });
                wsServer.broadcast('ui_generation_complete', { payload });
                return res.status(200).json({ success: true, decision, payload });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown generation error.';
                wsServer.broadcast('ui_generation_error', { message });
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
