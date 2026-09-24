import type { CognitiveLoadState, TelemetryData } from '@/types/telemetry'

export function calculateCognitiveLoad(telemetry: TelemetryData): CognitiveLoadState {
  const score = Math.min(100, Math.max(0, telemetry.cursorVelocity / 9 + telemetry.fieldErrorCount * 10 + telemetry.repeatedClickCount * 8 + telemetry.hesitationTime / 170))
  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'

  return {
    score: Math.round(score),
    level,
    triggerStatus: level === 'HIGH' ? 'triggered' : level === 'MEDIUM' ? 'detecting' : 'idle',
    lastUpdated: Date.now(),
  }
}
