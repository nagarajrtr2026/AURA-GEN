import { z } from 'zod'
import { CODE_GENERATION_PROMPT } from '../prompts/code-generation-prompt.js'
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js'
import { LangChainProviderAdapter } from '../services/langchain-provider.js'
import type { GeneratedUIPayload, LLMRequestPayload } from '../types/telemetry.js'

const mockGeneratedUI: GeneratedUIPayload = {
  id: 'mock-ui-001',
  version: '1.0.0',
  type: 'step_wizard',
  component: 'step_wizard',
  props: {
    title: 'A simpler way forward',
    description: 'We reduced the form into a shorter guided flow.',
    steps: [
      {
        id: 'name',
        title: 'Your name',
        fields: [{ name: 'fullName', type: 'text_input', label: 'Full name', placeholder: 'Nagaraj M', required: true }],
      },
      {
        id: 'income',
        title: 'Income overview',
        fields: [
          {
            name: 'employmentType',
            type: 'select_input',
            label: 'Employment type',
            options: [
              { value: 'salaried', label: 'Salaried' },
              { value: 'self_employed', label: 'Self-employed' },
            ],
          },
          { name: 'annualIncome', type: 'number_input', label: 'Annual income', placeholder: '₹ 500000' },
        ],
      },
      {
        id: 'summary',
        title: 'Review',
        fields: [{ name: 'submit', type: 'button', label: 'Continue securely' }],
      },
    ],
  },
  fields: ['fullName', 'employmentType', 'annualIncome'],
  state: {},
  timestamp: Date.now(),
}

const llmResponseSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  type: z.enum(['step_wizard', 'financial_summary']),
  component: z.enum(['step_wizard', 'financial_summary']),
  props: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(z.any()).optional(),
    steps: z.array(z.any()).optional(),
  }),
  fields: z.array(z.string()),
  state: z.record(z.unknown()),
  timestamp: z.number(),
})

export class CodeGenerationAgent {
  private readonly mockLlm: boolean
  private readonly provider: LangChainProviderAdapter

  constructor(mockLlm: boolean) {
    this.mockLlm = mockLlm
    this.provider = new LangChainProviderAdapter()
  }

  async generate(payload: LLMRequestPayload): Promise<GeneratedUIPayload> {
    if (this.mockLlm) {
      return mockGeneratedUI
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required when MOCK_LLM=false.')
    }

    const prompt = CODE_GENERATION_PROMPT.replace('{{TELEMETRY}}', JSON.stringify(payload, null, 2))

    try {
      const raw = await this.provider.generate(prompt)
      const parsed = JSON.parse(raw) as unknown
      const safe = llmResponseSchema.safeParse(parsed)
      if (!safe.success) {
        throw new Error(`LLM output failed validation: ${safe.error.message}`)
      }

      return generatedUIPayloadSchema.parse({ ...safe.data, timestamp: Date.now() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error.'
      throw new Error(`Code generation failed: ${message}`)
    }
  }
}
