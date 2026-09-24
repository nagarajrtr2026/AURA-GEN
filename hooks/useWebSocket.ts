'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WebSocketEvent, WebSocketEventType } from '@/types/websocket'

export type WebSocketMode = 'mock' | 'real'

export function createMockWebSocketEvent(type: WebSocketEventType): WebSocketEvent {
  const now = Date.now()

  const payloadMap: Record<WebSocketEventType, Record<string, unknown>> = {
    telemetry_update: { score: 42, activeField: 'annualIncome' },
    cognitive_load_update: { score: 71, level: 'HIGH' },
    ui_generation_started: { status: 'started', payloadType: 'step_wizard' },
    ui_generation_stream: { progress: 64, status: 'rendering' },
    ui_generation_complete: { status: 'complete', payloadType: 'step_wizard' },
    ui_generation_error: { message: 'Unable to adapt the interface right now. Your current form data is safe.', error: 'mock-generation-failure' },
    ui_fallback: { message: 'Unable to adapt the interface right now. Your current form data is safe.' },
    ui_morph_start: { mode: 'adaptive' },
    ui_morph_complete: { mode: 'adaptive', completed: true },
  }

  return {
    type,
    timestamp: now,
    data: payloadMap[type],
  }
}

export function useWebSocket() {
  const socketUrl = useMemo(() => process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080', [])
  const [mode, setMode] = useState<WebSocketMode>('mock')
  const [connected, setConnected] = useState(true)
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null)
  const [events, setEvents] = useState<WebSocketEvent[]>([])

  useEffect(() => {
    const initial = createMockWebSocketEvent('telemetry_update')
    setLastEvent(initial)
    setEvents((current) => [...current.slice(-9), initial])
  }, [])

  const send = useCallback((event: WebSocketEvent) => {
    setLastEvent(event)
    setEvents((current) => [...current.slice(-9), event])
  }, [])

  const emitMock = useCallback((type: WebSocketEventType) => {
    const event = createMockWebSocketEvent(type)
    send(event)
    return event
  }, [send])

  const reset = useCallback(() => {
    setLastEvent(null)
    setEvents([])
    setConnected(true)
  }, [])

  return {
    mode,
    connected,
    socketUrl,
    lastEvent,
    events,
    send,
    emitMock,
    reset,
    setMode,
    setConnected,
  }
}
