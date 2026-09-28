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

export interface GenerationCallbacks {
  onToken?: (token: string) => void
  onCacheHit?: (kind: 'cache' | 'inflight') => void
}

interface CachedPayload {
  expiresAt: number
  payload: GeneratedUIPayload
}

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 50

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, shapeOf(child)]),
    )
  }
  return typeof value
}

export class CodeGenerationAgent {
  private readonly mockLlm: boolean
  private readonly provider: Pick<LangChainProviderAdapter, 'generate'>
  private readonly cache = new Map<string, CachedPayload>()
  private readonly inFlight = new Map<string, Promise<GeneratedUIPayload>>()

  constructor(mockLlm: boolean, provider: Pick<LangChainProviderAdapter, 'generate'> = new LangChainProviderAdapter()) {
    this.mockLlm = mockLlm
    this.provider = provider
  }

  async generate(payload: LLMRequestPayload, callbacks: GenerationCallbacks = {}): Promise<GeneratedUIPayload> {
    const cacheKey = this.getCacheKey(payload)
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      this.cache.delete(cacheKey)
      this.cache.set(cacheKey, cached)
      callbacks.onCacheHit?.('cache')
      return this.withCurrentState(cached.payload, payload.formState)
    }
    if (cached) this.cache.delete(cacheKey)

    const pending = this.inFlight.get(cacheKey)
    if (pending) {
      callbacks.onCacheHit?.('inflight')
      return this.withCurrentState(await pending, payload.formState)
    }

    const generation = this.generateUncached(payload, callbacks)
      .then((generated) => {
        this.cache.set(cacheKey, { payload: generated, expiresAt: Date.now() + CACHE_TTL_MS })
        while (this.cache.size > CACHE_MAX_ENTRIES) {
          const oldestKey = this.cache.keys().next().value
          if (oldestKey === undefined) break
          this.cache.delete(oldestKey)
        }
        return generated
      })
      .finally(() => this.inFlight.delete(cacheKey))
    this.inFlight.set(cacheKey, generation)
    return this.withCurrentState(await generation, payload.formState)
  }

  private getCacheKey(payload: LLMRequestPayload) {
    const formShape = Object.fromEntries(
      Object.entries(payload.formState).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [
        key,
        key === 'currentSection' ? value : shapeOf(value),
      ]),
    )
    return JSON.stringify({
      frictionLevel: payload.frictionLevel,
      activeField: payload.telemetry.activeField,
      currentSection: payload.formState.currentSection,
      formShape,
    })
  }

  private withCurrentState(payload: GeneratedUIPayload, formState: Record<string, unknown>): GeneratedUIPayload {
    return { ...payload, state: formState, timestamp: Date.now() }
  }

  private async generateUncached(payload: LLMRequestPayload, callbacks: GenerationCallbacks): Promise<GeneratedUIPayload> {
    if (this.mockLlm) {
      for (const token of mockGeneratedReactCode.match(/\S+\s*/g) ?? []) {
        callbacks.onToken?.(token)
        await new Promise((resolve) => setTimeout(resolve, 8))
      }
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
      const raw = await this.provider.generate(prompt, callbacks.onToken)
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
