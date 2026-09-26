import { z } from 'zod'
import { CODE_GENERATION_PROMPT } from '../prompts/code-generation-prompt.js'
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js'
import { LangChainProviderAdapter } from '../services/langchain-provider.js'
import { validateGeneratedReactCode } from '../services/react-code-validator.js'
import type { GeneratedUIPayload, LLMRequestPayload } from '../types/telemetry.js'

const mockGeneratedUI: GeneratedUIPayload = {
  id: 'mock-ui-001',
  version: '1.0.0',
  type: 'step_wizard',
  component: 'StepWizard',
  props: {
    title: 'A simpler way forward',
    description: 'We reduced the form into a shorter guided flow.',
    steps: [
      {
        id: 'name',
        title: 'Your name',
        fields: [{ name: 'fullName', type: 'text', label: 'Full name', placeholder: 'Full name', required: true }],
      },
      {
        id: 'income',
        title: 'Income overview',
        fields: [
          {
            name: 'employmentType',
            type: 'select',
            label: 'Employment type',
            options: [
              { value: 'salaried', label: 'Salaried' },
              { value: 'self_employed', label: 'Self-employed' },
            ],
          },
          { name: 'annualIncome', type: 'number', label: 'Annual income', placeholder: '500000' },
        ],
      },
      {
        id: 'summary',
        title: 'Review',
        fields: [{ name: 'confirmation', type: 'text', label: 'Review your application' }],
      },
    ],
  },
  fields: ['fullName', 'employmentType', 'annualIncome'],
  state: {},
  timestamp: Date.now(),
}

const mockGeneratedReactCode = `export default function AdaptiveGeneratedUI() {
  return <section><h2>A simpler way forward</h2><p>Continue with your application.</p></section>
}`

const llmResponseSchema = z.object({
  reactCode: z.string().min(1),
  payload: generatedUIPayloadSchema,
})

export class CodeGenerationAgent {
  private readonly mockLlm: boolean
  private readonly provider: Pick<LangChainProviderAdapter, 'generate'>

  constructor(mockLlm: boolean, provider: Pick<LangChainProviderAdapter, 'generate'> = new LangChainProviderAdapter()) {
    this.mockLlm = mockLlm
    this.provider = provider
  }

  async generate(payload: LLMRequestPayload): Promise<GeneratedUIPayload> {
    if (this.mockLlm) {
      const validation = validateGeneratedReactCode(mockGeneratedReactCode)
      if (!validation.approved) {
        throw new Error(`Generated React code was rejected: ${validation.error}`)
      }
      return generatedUIPayloadSchema.parse({
        ...mockGeneratedUI,
        state: payload.formState,
        timestamp: Date.now(),
      })
    }

    const prompt = CODE_GENERATION_PROMPT.replace('{{TELEMETRY}}', JSON.stringify(payload, null, 2))

    try {
      const raw = await this.provider.generate(prompt)
      const parsed = JSON.parse(raw) as unknown
      const safe = llmResponseSchema.safeParse(parsed)
      if (!safe.success) {
        throw new Error(`LLM output failed validation: ${safe.error.message}`)
      }

      const validation = validateGeneratedReactCode(safe.data.reactCode)
      if (!validation.approved) {
        throw new Error(`Generated React code was rejected: ${validation.error}`)
      }

      return generatedUIPayloadSchema.parse({
        ...safe.data.payload,
        state: payload.formState,
        timestamp: Date.now(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error.'
      throw new Error(`Code generation failed: ${message}`)
    }
  }
}
