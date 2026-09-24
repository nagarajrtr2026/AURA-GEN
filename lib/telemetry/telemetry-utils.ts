import type { TelemetryData } from '@/types/telemetry'

export function normalizeTelemetryScore(telemetry: TelemetryData): number {
  const frictionScore = Math.min(100, Math.max(0, telemetry.cursorVelocity / 8 + telemetry.fieldErrorCount * 12 + telemetry.repeatedClickCount * 8 + telemetry.hesitationTime / 180))
  return Math.round(frictionScore)
}

export function describeTelemetryState(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}
