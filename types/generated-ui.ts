export interface GeneratedUIField {
  name: string
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'textarea'
  label: string
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

export interface GeneratedUIPayload {
  id: string
  version: string
  type: 'step_wizard' | 'simplified_form' | 'adaptive_form'
  component: 'TextInput' | 'SelectInput' | 'NumberInput' | 'DateInput' | 'StepWizard' | 'FinancialSummary'
  props: {
    title?: string
    description?: string
    fields?: GeneratedUIField[]
    steps?: Array<{
      id: string
      title: string
      fields: GeneratedUIField[]
    }>
  }
  fields: string[]
  state: Record<string, unknown>
  timestamp: number
}

export interface AdaptiveUIState {
  isTransitioning: boolean
  isGenerating: boolean
  hasGenerated: boolean
  generatedUI: GeneratedUIPayload | null
  error: string | null
  fallbackReason: string | null
}

export type UIRenderMode = 'original' | 'adaptive' | 'fallback'

export const ALLOWED_UI_COMPONENTS = new Set<GeneratedUIPayload['component']>([
  'TextInput',
  'SelectInput',
  'NumberInput',
  'DateInput',
  'StepWizard',
  'FinancialSummary',
])

export function isGeneratedUIPayload(value: unknown): value is GeneratedUIPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<GeneratedUIPayload>

  if (!payload.id || !payload.version || !payload.type || !payload.component || !Array.isArray(payload.fields)) {
    return false
  }

  if (!['step_wizard', 'simplified_form', 'adaptive_form'].includes(payload.type)) {
    return false
  }

  if (!ALLOWED_UI_COMPONENTS.has(payload.component as GeneratedUIPayload['component'])) {
    return false
  }

  return typeof payload.timestamp === 'number'
}

export function validateGeneratedUIPayload(value: unknown): { valid: boolean; payload?: GeneratedUIPayload; error?: string } {
  if (!isGeneratedUIPayload(value)) {
    return { valid: false, error: 'Unknown or invalid generated UI payload.' }
  }

  return { valid: true, payload: value }
}
