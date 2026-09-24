export type AdaptiveMode = 'original' | 'adaptive' | 'fallback'
export type AdaptivePhase =
  | 'MONITORING'
  | 'FRICTION_DETECTED'
  | 'HIGH_COGNITIVE_LOAD'
  | 'GENERATION_STARTED'
  | 'GENERATION_COMPLETE'
  | 'MORPHING'
  | 'ADAPTIVE_UI_ACTIVE'
  | 'ERROR'
  | 'FALLBACK'

export interface AdaptiveUIContextState {
  phase: AdaptivePhase
  mode: AdaptiveMode
  generationStatus: 'idle' | 'started' | 'complete' | 'error'
  fallbackMessage: string
  lastError: string | null
}

export interface AdaptiveUIFieldOption {
  value: string
  label: string
}

export interface AdaptiveUIField {
  name: string
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'textarea'
  label: string
  placeholder?: string
  required?: boolean
  options?: AdaptiveUIFieldOption[]
}

export interface AdaptiveUIStep {
  id: string
  title: string
  fields: AdaptiveUIField[]
}

export interface AdaptiveUIPayload {
  id: string
  version: string
  type: 'step_wizard' | 'simplified_form' | 'adaptive_form'
  component: 'TextInput' | 'SelectInput' | 'NumberInput' | 'DateInput' | 'StepWizard' | 'FinancialSummary'
  props: {
    title?: string
    description?: string
    fields?: AdaptiveUIField[]
    steps?: AdaptiveUIStep[]
  }
  fields: string[]
  state: Record<string, unknown>
  timestamp: number
}
