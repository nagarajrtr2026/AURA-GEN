import type { CognitiveLoadState, TelemetryData } from '@/types/telemetry'

export function calculateCognitiveLoad(telemetry: TelemetryData): CognitiveLoadState {
  const score = Math.min(100, telemetry.cursorVelocity * 0.35 + telemetry.hesitationTime * 0.25 + telemetry.repeatedClickCount * 12 + telemetry.fieldErrorCount * 18)
  const level = score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW'

  return {
    score: Math.round(score),
    level,
    triggerStatus: level === 'HIGH' ? 'triggered' : level === 'MEDIUM' ? 'detecting' : 'idle',
    lastUpdated: Date.now(),
  }
}
