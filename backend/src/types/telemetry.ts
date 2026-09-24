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
}

export interface GeneratedUIField {
  name: string
  type: 'text_input' | 'number_input' | 'select_input' | 'date_input' | 'checkbox' | 'button'
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
  type: 'step_wizard' | 'financial_summary'
  component: 'step_wizard' | 'financial_summary' | 'text_input' | 'number_input' | 'select_input' | 'date_input' | 'checkbox' | 'button'
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
