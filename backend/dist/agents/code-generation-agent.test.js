import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CodeGenerationAgent } from './code-generation-agent.js';
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js';
import { FrictionEngine } from '../services/friction-engine.js';
test('friction engine identifies high interaction friction', () => {
    const decision = new FrictionEngine().evaluateTelemetry({
        type: 'telemetry_update',
        timestamp: Date.now(),
        data: {
            cursorVelocity: 0,
            hesitation: 0,
            repeatedClicks: 5,
            fieldErrors: 1,
            activeField: 'annualIncome',
        },
    });
    assert.equal(decision.level, 'HIGH');
});
test('MOCK_LLM returns a validated renderer payload with preserved form state', async () => {
    const formState = {
        personal: { fullName: 'Preserved Person' },
        financial: { annualIncome: '80000' },
    };
    const payload = await new CodeGenerationAgent(true).generate({
        telemetry: {
            cursorVelocity: 0,
            hesitation: 0,
            repeatedClicks: 5,
            fieldErrors: 1,
            activeField: 'annualIncome',
        },
        frictionLevel: 'HIGH',
        context: 'High friction detected at annualIncome.',
        formState,
    });
    assert.equal(generatedUIPayloadSchema.safeParse(payload).success, true);
    assert.equal(payload.component, 'StepWizard');
    assert.deepEqual(payload.state, formState);
});
test('approved LangChain output continues as structured UI', async () => {
    const provider = {
        generate: async () => JSON.stringify({
            reactCode: 'export default function View() { return <section><h2>Ready</h2></section> }',
            payload: {
                id: 'generated-ui',
                version: '1.0.0',
                type: 'step_wizard',
                component: 'StepWizard',
                props: { steps: [] },
                fields: [],
                state: {},
                timestamp: Date.now(),
            },
        }),
    };
    const formState = { personal: { fullName: 'Approved Person' } };
    const payload = await new CodeGenerationAgent(false, provider).generate({
        telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
        frictionLevel: 'HIGH',
        context: 'High friction detected.',
        formState,
    });
    assert.equal(payload.component, 'StepWizard');
    assert.deepEqual(payload.state, formState);
});
test('malicious LangChain output is rejected before UI is returned', async () => {
    const provider = {
        generate: async () => JSON.stringify({
            reactCode: 'export default function View() { eval("attack()"); return <section /> }',
            payload: {
                id: 'generated-ui',
                version: '1.0.0',
                type: 'step_wizard',
                component: 'StepWizard',
                props: { steps: [] },
                fields: [],
                state: {},
                timestamp: Date.now(),
            },
        }),
    };
    await assert.rejects(new CodeGenerationAgent(false, provider).generate({
        telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
        frictionLevel: 'HIGH',
        context: 'High friction detected.',
        formState: {},
    }), /Generated React code was rejected/);
});
