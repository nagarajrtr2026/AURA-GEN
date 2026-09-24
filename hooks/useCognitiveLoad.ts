'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CognitiveLoadState, TelemetryData } from '@/types/telemetry'

export function useCognitiveLoad(telemetry: TelemetryData, enabled = true) {
  const [score, setScore] = useState(18)
  const calculated = useMemo(() => Math.min(100, Math.round(18 + telemetry.cursorVelocity * 0.12 + telemetry.hesitationTime / 90 + telemetry.repeatedClickCount * 7 + telemetry.fieldErrorCount * 8)), [telemetry])
  useEffect(() => { if (!enabled) return; setScore((current) => Math.min(100, Math.max(current, calculated))) }, [calculated, enabled])
  const level = score >= 72 ? 'HIGH' : score >= 42 ? 'MEDIUM' : 'LOW'
  const state: CognitiveLoadState = { score, level, triggerStatus: level === 'HIGH' ? 'triggered' : level === 'MEDIUM' ? 'detecting' : 'idle', lastUpdated: Date.now() }
  return state
}
