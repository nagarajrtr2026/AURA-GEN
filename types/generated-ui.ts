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
  component: string
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
