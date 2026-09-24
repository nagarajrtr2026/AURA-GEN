'use client'

import { useMemo } from 'react'
import type { CognitiveLoadLevel, CognitiveLoadState, TelemetryData } from '@/types/telemetry'

export function useCognitiveLoad(telemetry: TelemetryData, enabled = true) {
  const score = useMemo(() => {
    if (!enabled) {
      return 0
    }

    const fieldDurations = Object.values(telemetry.fieldInteractions)
    const averageInteraction = fieldDurations.length
      ? fieldDurations.reduce((sum, value) => sum + value, 0) / fieldDurations.length
      : 0

    const derived = 18 +
      Math.min(telemetry.cursorVelocity * 0.38, 28) +
      Math.min(telemetry.hesitationTime / 22, 24) +
      telemetry.repeatedClickCount * 9 +
      telemetry.fieldErrorCount * 11 +
      (telemetry.activeField ? 7 : 0) +
      Math.min(averageInteraction / 180, 18)

    return Math.max(0, Math.min(100, Math.round(derived)))
  }, [enabled, telemetry])

  const level: CognitiveLoadLevel = score >= 72 ? 'HIGH' : score >= 42 ? 'MEDIUM' : 'LOW'

  const state: CognitiveLoadState = {
    score,
    level,
    triggerStatus: level === 'HIGH' ? 'triggered' : level === 'MEDIUM' ? 'detecting' : 'idle',
    lastUpdated: telemetry.timestamp,
  }

  return state
}
