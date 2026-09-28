export type WebSocketEventType =
  | 'connection_established'
  | 'validation_error'
  | 'telemetry_update'
  | 'cognitive_load_update'
  | 'ui_generation_started'
  | 'ui_generation_stream'
  | 'ui_generation_complete'
  | 'ui_generation_error'
  | 'ui_fallback'
  | 'ui_morph_start'
  | 'ui_morph_complete'

export interface WebSocketEvent {
  type: WebSocketEventType
  timestamp: number
  data?: Record<string, unknown>
  requestId?: string
}

export type UIGenerationStage = 'generation_start' | 'first_token' | 'streaming' | 'cache_hit' | 'validation_complete'

export interface UIGenerationMetrics {
  generation_start: 0
  first_token: number | null
  validation_complete: number
  cache_status: 'miss' | 'cache' | 'inflight'
}

export interface UIGenerationProgress {
  stage: UIGenerationStage
  tokenCount: number
  firstTokenMs?: number | null
  cacheStatus?: 'cache' | 'inflight'
  metrics?: UIGenerationMetrics
}

export interface CognitiveLoadUpdateEvent extends WebSocketEvent {
  type: 'cognitive_load_update'
  data: {
    score: number
    level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

export interface UIGenerationCompleteEvent extends WebSocketEvent {
  type: 'ui_generation_complete'
  data: {
    payload: import('@/types/generated-ui').GeneratedUIPayload
  }
}

export interface UIGenerationErrorEvent extends WebSocketEvent {
  type: 'ui_generation_error'
  data: {
    message: string
    error?: string
  }
}
