import { z } from 'zod'
import { CODE_GENERATION_PROMPT } from '../prompts/code-generation-prompt.js'
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js'
import { LangChainProviderAdapter } from '../services/langchain-provider.js'
import { validateGeneratedReactCode } from '../services/react-code-validator.js'
import type { GeneratedUIPayload, LLMRequestPayload } from '../types/telemetry.js'

const llmResponseSchema = z.object({
  reactCode: z.string().min(1),
  payload: z.record(z.unknown()),
})

export interface GenerationCallbacks {
  onToken?: (token: string) => void
  onCacheHit?: (kind: 'cache' | 'inflight') => void
}

interface CachedPayload {
  expiresAt: number
  payload: GeneratedUIPayload
}

interface InFlightGeneration {
  promise: Promise<GeneratedUIPayload>
  tokenListeners: Set<(token: string) => void>
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

function normalizeGeneratedPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const props = payload.props && typeof payload.props === 'object' && !Array.isArray(payload.props)
    ? payload.props as Record<string, unknown>
    : {}
  const validComponents = ['TextInput', 'SelectInput', 'NumberInput', 'DateInput', 'StepWizard', 'FinancialSummary']
  const rawFields = Array.isArray(payload.fields) ? payload.fields : []
  const rawSteps = Array.isArray(props.steps) ? props.steps : undefined
  const steps = rawSteps?.map((step, index) => {
    const normalizedStep = step && typeof step === 'object' && !Array.isArray(step)
      ? step as Record<string, unknown>
      : {}
    return {
      ...normalizedStep,
      id: typeof normalizedStep.id === 'string' ? normalizedStep.id : `step-${index + 1}`,
      title: typeof normalizedStep.title === 'string' ? normalizedStep.title : `Step ${index + 1}`,
      fields: Array.isArray(normalizedStep.fields) ? normalizedStep.fields : [],
    }
  })
  const stepFields = steps?.flatMap((step) => step.fields) ?? []
  const propFields = Array.isArray(props.fields) ? props.fields : []
  const rawFieldObjects = rawFields.filter((field) => field && typeof field === 'object' && !Array.isArray(field))
  const stepFieldObjects = stepFields.filter((field) => field && typeof field === 'object' && !Array.isArray(field))
  const candidateFields = propFields.some((field) => field && typeof field === 'object' && !Array.isArray(field))
    ? propFields
    : stepFieldObjects.length > 0
      ? stepFieldObjects
      : rawFieldObjects.length > 0
        ? rawFieldObjects
        : propFields.length > 0 ? propFields : stepFields
  const uniqueFields = candidateFields
    .filter((field): field is Record<string, unknown> =>
      Boolean(field && typeof field === 'object' && !Array.isArray(field) && typeof field.name === 'string'),
    )
    .filter((field, index) =>
      candidateFields.findIndex((candidate) =>
        candidate && typeof candidate === 'object' && !Array.isArray(candidate) && candidate.name === field.name,
      ) === index,
    )
  const fieldNames = [
    ...new Set([
      ...rawFields.flatMap((field) => {
        if (typeof field === 'string') return [field]
        if (field && typeof field === 'object' && !Array.isArray(field) && typeof field.name === 'string') return [field.name]
        return []
      }),
      ...uniqueFields.map((field) => field.name as string),
    ]),
  ]
  const validTypes = ['step_wizard', 'simplified_form', 'adaptive_form']
  const type = typeof payload.type === 'string' && validTypes.includes(payload.type)
    ? payload.type
    : payload.type === 'form'
      ? 'step_wizard'
      : payload.type === 'ui_payload'
        ? steps?.length ? 'step_wizard' : 'adaptive_form'
      : payload.type
  const wizardSteps = type === 'step_wizard' && uniqueFields.length > 0
    ? uniqueFields.map((field, index) => ({
      id: field.name as string || `step-${index + 1}`,
      title: typeof field.label === 'string' ? field.label : `Financial detail ${index + 1}`,
      fields: [field],
    }))
    : steps
  const firstField = candidateFields[0] && typeof candidateFields[0] === 'object' && !Array.isArray(candidateFields[0])
    ? candidateFields[0] as Record<string, unknown>
    : undefined
  const fieldComponent = firstField?.type === 'select'
    ? 'SelectInput'
    : firstField?.type === 'number'
      ? 'NumberInput'
      : firstField?.type === 'date'
        ? 'DateInput'
        : 'TextInput'
  const component = type === 'step_wizard'
    ? 'StepWizard'
    : typeof payload.component === 'string' && validComponents.includes(payload.component)
      ? payload.component
      : wizardSteps?.length
        ? 'StepWizard'
        : fieldComponent

  return {
    ...payload,
    component,
    type,
    props: {
      ...props,
      ...(wizardSteps ? { steps: wizardSteps } : {}),
    },
    fields: fieldNames,
    state: payload.state && typeof payload.state === 'object' && !Array.isArray(payload.state) ? payload.state : {},
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
  }
}

export class CodeGenerationAgent {
  private readonly provider: Pick<LangChainProviderAdapter, 'generate'>
  private readonly cache = new Map<string, CachedPayload>()
  private readonly inFlight = new Map<string, InFlightGeneration>()

  constructor(provider: Pick<LangChainProviderAdapter, 'generate'> = new LangChainProviderAdapter()) {
    this.provider = provider
  }

  async generate(payload: LLMRequestPayload, callbacks: GenerationCallbacks = {}): Promise<GeneratedUIPayload> {
    const cacheKey = this.getCacheKey(payload)
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      this.cache.delete(cacheKey)
      this.cache.set(cacheKey, cached)
      console.info('[CodeGenerationAgent] cache hit')
      callbacks.onCacheHit?.('cache')
      return this.withCurrentState(cached.payload, payload.formState)
    }
    if (cached) this.cache.delete(cacheKey)

    const pending = this.inFlight.get(cacheKey)
    if (pending) {
      console.info('[CodeGenerationAgent] in-flight cache hit')
      callbacks.onCacheHit?.('inflight')
      if (callbacks.onToken) pending.tokenListeners.add(callbacks.onToken)
      try {
        return this.withCurrentState(await pending.promise, payload.formState)
      } finally {
        if (callbacks.onToken) pending.tokenListeners.delete(callbacks.onToken)
      }
    }

    console.info('[CodeGenerationAgent] cache miss')
    const tokenListeners = new Set<(token: string) => void>()
    if (callbacks.onToken) tokenListeners.add(callbacks.onToken)
    const generation = Promise.resolve().then(() => this.generateUncached(payload, {
      onToken: (token) => {
        tokenListeners.forEach((listener) => {
          try {
            listener(token)
          } catch (error) {
            console.warn('[CodeGenerationAgent] token listener failed', error)
          }
        })
      },
    }))
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
    this.inFlight.set(cacheKey, { promise: generation, tokenListeners })
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
    const promptContext = {
      ...payload,
      formState: Object.fromEntries(
        Object.entries(payload.formState).map(([key, value]) => [key, key === 'currentSection' ? value : shapeOf(value)]),
      ),
    }
    const prompt = CODE_GENERATION_PROMPT.replace('{{TELEMETRY}}', JSON.stringify(promptContext, null, 2))

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

      const validatedPayload = generatedUIPayloadSchema.safeParse({
        ...normalizeGeneratedPayload(safe.data.payload),
        state: payload.formState,
        timestamp: Date.now(),
      })
      if (!validatedPayload.success) {
        throw new Error(`LLM output failed validation: ${validatedPayload.error.message}`)
      }

      return validatedPayload.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error.'
      throw new Error(`Code generation failed: ${message}`)
    }
  }
}
