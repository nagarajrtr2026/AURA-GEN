'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WebSocketEvent, WebSocketEventType } from '@/types/websocket'
import type { TelemetryData } from '@/types/telemetry'

export type WebSocketMode = 'mock' | 'real'

export function createMockWebSocketEvent(type: WebSocketEventType): WebSocketEvent {
  const now = Date.now()

  const payloadMap: Record<WebSocketEventType, Record<string, unknown>> = {
    connection_established: { status: 'connected' },
    validation_error: { message: 'The backend sent an invalid event.' },
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
  const socketUrl = useMemo(() => process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001', [])
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', [])
  const socketRef = useRef<WebSocket | null>(null)
  const [mode, setMode] = useState<WebSocketMode>('real')
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null)
  const [events, setEvents] = useState<WebSocketEvent[]>([])

  useEffect(() => {
    if (mode !== 'real') {
      setConnected(false)
      return
    }

    const socket = new WebSocket(socketUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setConnected(true)
      const connectionEvent: WebSocketEvent = {
        type: 'connection_established',
        timestamp: Date.now(),
        data: { status: 'connected' },
      }
      setLastEvent(connectionEvent)
      setEvents((current) => [...current.slice(-19), connectionEvent])
    }

    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as WebSocketEvent
        if (typeof event.type !== 'string') return
        if (event.type === 'connection_established') setConnected(true)
        setLastEvent(event)
        setEvents((current) => [...current.slice(-19), event])
      } catch {
        const invalidEvent: WebSocketEvent = {
          type: 'validation_error',
          timestamp: Date.now(),
          data: { message: 'The backend sent an invalid event.' },
        }
        setLastEvent(invalidEvent)
      }
    }

    return () => {
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [mode, socketUrl])

  const send = useCallback((event: WebSocketEvent) => {
    if (mode === 'real' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event))
    }
    setLastEvent(event)
    setEvents((current) => [...current.slice(-9), event])
  }, [mode])

  const emitMock = useCallback((type: WebSocketEventType) => {
    const event = createMockWebSocketEvent(type)
    send(event)
    return event
  }, [send])

  const sendTelemetry = useCallback(async (telemetry: TelemetryData, formState: Record<string, unknown>) => {
    const response = await fetch(`${apiUrl}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cursorVelocity: telemetry.cursorVelocity,
        hesitation: telemetry.hesitationTime,
        repeatedClicks: telemetry.repeatedClickCount,
        fieldErrors: telemetry.fieldErrorCount,
        activeField: telemetry.activeField,
        formState,
      }),
    })

    const result = await response.json() as { success?: boolean; payload?: unknown; error?: string; message?: string }
    if (!response.ok || !result.success || result.payload === undefined || result.payload === null) {
      throw new Error(result.message ?? result.error ?? 'Backend did not generate a UI payload for this telemetry.')
    }

    return result.payload
  }, [apiUrl])

  const reset = useCallback(() => {
    setLastEvent(null)
    setEvents([])
  }, [])

  return {
    mode,
    connected,
    socketUrl,
    apiUrl,
    lastEvent,
    events,
    send,
    emitMock,
    sendTelemetry,
    reset,
    setMode,
    setConnected,
  }
}
