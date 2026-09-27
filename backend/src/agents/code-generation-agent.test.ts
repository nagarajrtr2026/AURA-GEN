import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CodeGenerationAgent } from './code-generation-agent.js'
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js'
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

test('MOCK_LLM returns a validated renderer payload with preserved form state', async () => {
  const formState = {
    personal: { fullName: 'Preserved Person', email: 'person@example.test', phone: '5550100', dateOfBirth: '1990-01-01', address: '12 Test Road', city: 'Test City', state: 'CA', pincode: '12345' },
    employment: { employmentType: 'Salaried', companyName: 'Example Co', jobTitle: 'Engineer', yearsOfExperience: '8', monthlyIncome: '9000' },
    financial: { annualIncome: '108000', existingLoans: 'Home loan', monthlyExpenses: '1200', creditScore: '760', dependents: '2' },
    tax: { panNumber: 'ABCDE1234F', taxResidency: 'India', previousYearTaxPaid: '5000', taxDeductionInfo: '80C' },
    currentSection: 'financial',
    isSubmitted: false,
  }
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
  })

  assert.equal(generatedUIPayloadSchema.safeParse(payload).success, true)
  assert.equal(payload.component, 'StepWizard')
  assert.deepEqual(payload.state, formState)
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

  const payload = await new CodeGenerationAgent(false, provider).generate({
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
    new CodeGenerationAgent(false, provider).generate({
      telemetry: { cursorVelocity: 0, hesitation: 0, repeatedClicks: 5, fieldErrors: 1, activeField: null },
      frictionLevel: 'HIGH',
      context: 'High friction detected.',
      formState: {},
    }),
    /Generated React code was rejected/,
  )
})