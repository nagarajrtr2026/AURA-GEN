export interface CursorPosition {
  x: number
  y: number
  timestamp: number
}

export interface TelemetryData {
  cursorVelocity: number
  hesitationTime: number
  clickCount: number
  repeatedClickCount: number
  fieldErrorCount: number
  activeField: string | null
  fieldInteractions: Record<string, number>
  timestamp: number
  cursorPath: CursorPosition[]
}

export type CognitiveLoadLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface CognitiveLoadState {
  score: number
  level: CognitiveLoadLevel
  triggerStatus: 'idle' | 'detecting' | 'triggered'
  lastUpdated: number
}

export interface TelemetryConfig {
  velocityThreshold: number
  hesitationThreshold: number
  clickErrorThreshold: number
  triggeredThreshold: number
}
