'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TelemetryData } from '@/types/telemetry'

const initialTelemetry: TelemetryData = {
  cursorVelocity: 0,
  hesitationTime: 0,
  clickCount: 0,
  repeatedClickCount: 0,
  fieldErrorCount: 0,
  activeField: null,
  fieldInteractions: {},
  timestamp: Date.now(),
  cursorPath: [],
}

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry)
  const lastMove = useRef({ x: 0, y: 0, timestamp: Date.now() })
  const lastClick = useRef(0)
  const fieldStart = useRef<Record<string, number>>({})

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const now = Date.now()
      const previous = lastMove.current
      const elapsed = Math.max(now - previous.timestamp, 1)
      const velocity = Math.round((Math.hypot(event.clientX - previous.x, event.clientY - previous.y) / elapsed) * 100)

      lastMove.current = { x: event.clientX, y: event.clientY, timestamp: now }

      setTelemetry((current) => ({
        ...current,
        cursorVelocity: Math.min(100, velocity),
        timestamp: now,
        cursorPath: [...current.cursorPath.slice(-8), { x: event.clientX, y: event.clientY, timestamp: now }],
      }))
    }

    const onClick = () => {
      const now = Date.now()
      setTelemetry((current) => ({
        ...current,
        clickCount: current.clickCount + 1,
        repeatedClickCount: now - lastClick.current < 450 ? current.repeatedClickCount + 1 : current.repeatedClickCount,
        timestamp: now,
      }))
      lastClick.current = now
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  const focusField = useCallback((field: string) => {
    fieldStart.current[field] = Date.now()
    setTelemetry((current) => ({
      ...current,
      activeField: field,
      timestamp: Date.now(),
    }))
  }, [])

  const blurField = useCallback((field: string, hasError = false) => {
    const startedAt = fieldStart.current[field] ?? Date.now()
    const duration = Math.max(Date.now() - startedAt, 0)

    setTelemetry((current) => {
      const nextFieldInteractions = {
        ...current.fieldInteractions,
        [field]: (current.fieldInteractions[field] ?? 0) + duration,
      }

      return {
        ...current,
        hesitationTime: Math.min(9999, Math.max(current.hesitationTime, duration)),
        fieldErrorCount: current.fieldErrorCount + (hasError ? 1 : 0),
        activeField: current.activeField === field ? null : current.activeField,
        fieldInteractions: nextFieldInteractions,
        timestamp: Date.now(),
      }
    })

    delete fieldStart.current[field]
  }, [])

  const simulateFrustration = useCallback(() => {
    setTelemetry((current) => ({
      ...current,
      clickCount: current.clickCount + 2,
      repeatedClickCount: current.repeatedClickCount + 2,
      hesitationTime: Math.min(9999, current.hesitationTime + 1100),
      cursorVelocity: Math.min(100, current.cursorVelocity + 15),
      fieldErrorCount: current.fieldErrorCount + 1,
      timestamp: Date.now(),
    }))
  }, [])

  const resetTelemetry = useCallback(() => {
    setTelemetry({ ...initialTelemetry, timestamp: Date.now() })
  }, [])

  return { telemetry, focusField, blurField, simulateFrustration, resetTelemetry }
}
