export type FrictionLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface TelemetryEvent {
  type: 'telemetry_update'
  timestamp: number
  data: {
    cursorVelocity: number
    hesitation: number
    repeatedClicks: number
    fieldErrors: number
    activeField: string | null
    [key: string]: unknown
  }
}

export interface FrictionDecision {
  level: FrictionLevel
  score: number
  reason: string
  activeField: string | null
}

export interface LLMRequestPayload {
  telemetry: {
    cursorVelocity: number
    hesitation: number
    repeatedClicks: number
    fieldErrors: number
    activeField: string | null
  }
  frictionLevel: FrictionLevel
  context: string
  formState: Record<string, unknown>
}

export interface GeneratedUIField {
  name: string
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'textarea'
  label: string
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

export interface GeneratedUIStep {
  id: string
  title: string
  fields: GeneratedUIField[]
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
    steps?: GeneratedUIStep[]
  }
  fields: string[]
  state: Record<string, unknown>
  timestamp: number
}

export interface WebSocketPayload {
  type: string
  timestamp: number
  data?: Record<string, unknown>
}
