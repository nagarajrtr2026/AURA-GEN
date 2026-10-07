import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CodeGenerationAgent } from './code-generation-agent.js'
import { FrictionEngine } from '../services/friction-engine.js'

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
  })

  assert.equal(decision.level, 'HIGH')
})

test('approved LangChain output continues as structured UI', async () => {
  let generatedPrompt = ''
  const provider = {
    generate: async (prompt: string) => {
      generatedPrompt = prompt
      return JSON.stringify({
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
      })
    },
  }
  const formState = {
    personal: { fullName: 'Approved Person', email: 'approved@example.test' },
    employment: { companyName: 'Context Co', jobTitle: 'Designer' },
    financial: { annualIncome: '91000', monthlyExpenses: '2300' },
    tax: { panNumber: 'FGHIJ1234K' },
    currentSection: 'financial',
    isSubmitted: false,
  }
  const context = JSON.stringify({
    friction: { score: 94, level: 'HIGH', reason: 'Repeated corrections' },
    activeField: 'annualIncome',
    interaction: { clickCount: 12, fieldInteractions: { annualIncome: 3400 }, currentSection: 'financial' },
  })

  const payload = await new CodeGenerationAgent(provider).generate({
    telemetry: {
      cursorVelocity: 28,
      hesitation: 2400,
      repeatedClicks: 5,
      fieldErrors: 2,
      activeField: 'annualIncome',
      clickCount: 12,
      fieldInteractions: { annualIncome: 3400 },
    },
    frictionLevel: 'HIGH',
    context,
    formState,
  })

  assert.equal(payload.component, 'StepWizard')
  assert.deepEqual(payload.state, formState)
  assert.match(generatedPrompt, /"activeField": "annualIncome"/)
  assert.match(generatedPrompt, /"clickCount": 12/)
  assert.match(generatedPrompt, /"currentSection": "financial"/)
  assert.match(generatedPrompt, /Repeated corrections/)
  assert.doesNotMatch(generatedPrompt, /91000|Approved Person|approved@example/)
})

test('normalizes Groq form payloads into one financial field per wizard step', async () => {
  const agent = new CodeGenerationAgent({
    generate: async () => JSON.stringify({
      reactCode: 'export default function View() { return <section><h2>Ready</h2></section> }',
      payload: {
        id: 'groq-ui',
        version: '1.0.0',
        type: 'form',
        component: 'step_wizard',
        props: {
          steps: [{ id: 'financial', title: 'Financial information' }],
        },
        fields: [
          { name: 'annualIncome', type: 'number', label: 'Annual income' },
          { name: 'monthlyExpenses', type: 'number', label: 'Monthly expenses' },
        ],
        state: {},
        timestamp: new Date().toISOString(),
      },
    }),
  })

  const payload = await agent.generate({
    telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
    frictionLevel: 'HIGH',
    context: 'High friction detected.',
    formState: { currentSection: 'financial', financial: { annualIncome: '91000' } },
  })

  assert.deepEqual(payload.fields, ['annualIncome', 'monthlyExpenses'])
  assert.equal(payload.type, 'step_wizard')
  assert.equal(payload.component, 'StepWizard')
  assert.equal(payload.props.steps?.length, 2)
  assert.deepEqual(payload.props.steps?.map((step) => step.fields.map((field) => field.name)), [
    ['annualIncome'],
    ['monthlyExpenses'],
  ])
  assert.equal(typeof payload.timestamp, 'number')
  assert.deepEqual(payload.state, { currentSection: 'financial', financial: { annualIncome: '91000' } })
})

test('similar concurrent generation requests share one streamed LLM call and keep each form state', async () => {
  let calls = 0
  const streamedTokens: string[] = []
  const response = JSON.stringify({
    reactCode: 'export default function View() { return <section><h2>Ready</h2></section> }',
    payload: {
      id: 'cached-ui',
      version: '1.0.0',
      type: 'step_wizard',
      component: 'StepWizard',
      props: { steps: [] },
      fields: [],
      state: {},
      timestamp: Date.now(),
    },
  })
  const provider = {
    generate: async (_prompt: string, onToken?: (token: string) => void) => {
      calls += 1
      onToken?.('{"payload":')
      await Promise.resolve()
      onToken?.('...}')
      return response
    },
  }
  const agent = new CodeGenerationAgent(provider)
  const baseRequest = {
    telemetry: { cursorVelocity: 20, hesitation: 800, repeatedClicks: 5, fieldErrors: 1, activeField: 'annualIncome' },
    frictionLevel: 'HIGH' as const,
    context: JSON.stringify({ interaction: { currentSection: 'financial' } }),
    formState: { currentSection: 'financial', financial: { annualIncome: '91000' } },
  }
  const cacheHitKinds: string[] = []
  const concurrentTokens: string[] = []
  const [first, concurrent] = await Promise.all([
    agent.generate(baseRequest, { onToken: (token) => streamedTokens.push(token) }),
    agent.generate({ ...baseRequest, formState: { currentSection: 'financial', financial: { annualIncome: '120000' } } }, {
      onCacheHit: (kind) => cacheHitKinds.push(kind),
      onToken: (token) => concurrentTokens.push(token),
    }),
  ])
  const cachedHits: string[] = []
  const cached = await agent.generate({ ...baseRequest, formState: { currentSection: 'financial', financial: { annualIncome: '150000' } } }, {
    onCacheHit: (kind) => cachedHits.push(kind),
  })

  assert.equal(calls, 1)
  assert.deepEqual(streamedTokens, ['{"payload":', '...}'])
  assert.deepEqual(concurrentTokens, streamedTokens)
  assert.deepEqual(cacheHitKinds, ['inflight'])
  assert.deepEqual(cachedHits, ['cache'])
  assert.deepEqual(first.state, baseRequest.formState)
  assert.deepEqual(concurrent.state, { currentSection: 'financial', financial: { annualIncome: '120000' } })
  assert.deepEqual(cached.state, { currentSection: 'financial', financial: { annualIncome: '150000' } })
})

test('invalid JSON and invalid Zod payloads fail safely without returning generated UI', async () => {
  const request = {
    telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
    frictionLevel: 'HIGH' as const,
    context: 'High friction detected.',
    formState: { currentSection: 'financial', financial: { annualIncome: '91000' } },
  }

  await assert.rejects(
    new CodeGenerationAgent({ generate: async () => '{not-json' }).generate(request),
    /Code generation failed/,
  )
  await assert.rejects(
    new CodeGenerationAgent({ generate: async () => JSON.stringify({ reactCode: 'export default function View() { return <section /> }', payload: {} }) }).generate(request),
    /LLM output failed validation/,
  )
})

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
  }

  await assert.rejects(
    new CodeGenerationAgent(provider).generate({
      telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
      frictionLevel: 'HIGH',
      context: 'High friction detected.',
      formState: {},
    }),
    /Generated React code was rejected/,
  )
})