'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIGenerationMetrics, WebSocketEvent } from '@/types/websocket'
import type { TelemetryData } from '@/types/telemetry'

export function useWebSocket() {
  const socketUrl = useMemo(() => process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001', [])
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', [])
  const socketRef = useRef<WebSocket | null>(null)
  const socketReadyWaiters = useRef(new Set<(socket: WebSocket | null) => void>())
  const subscriptionWaiters = useRef(new Map<string, () => void>())
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null)
  const [events, setEvents] = useState<WebSocketEvent[]>([])

  useEffect(() => {
    let disposed = false
    let reconnectTimer: number | null = null
    const socket = new WebSocket(socketUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setConnected(true)
      socketReadyWaiters.current.forEach((resolve) => resolve(socket))
      socketReadyWaiters.current.clear()
      const connectionEvent: WebSocketEvent = {
        type: 'connection_established',
        timestamp: Date.now(),
        data: { status: 'connected' },
      }
      setLastEvent(connectionEvent)
      setEvents((current) => [...current.slice(-199), connectionEvent])
    }

    socket.onclose = () => {
      setConnected(false)
      socketReadyWaiters.current.forEach((resolve) => resolve(null))
      socketReadyWaiters.current.clear()
      if (!disposed) {
        reconnectTimer = window.setTimeout(() => setConnectionAttempt((attempt) => attempt + 1), 750)
      }
    }
    socket.onerror = () => setConnected(false)
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as WebSocketEvent
        if (typeof event.type !== 'string') return
        if (event.type === 'connection_established') setConnected(true)
        if (event.type === 'generation_subscription_ready' && event.requestId) {
          subscriptionWaiters.current.get(event.requestId)?.()
          subscriptionWaiters.current.delete(event.requestId)
        }
        setLastEvent(event)
        setEvents((current) => [...current.slice(-199), event])
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
      disposed = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [connectionAttempt, socketUrl])

  const send = useCallback((event: WebSocketEvent) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event))
    }
    setLastEvent(event)
    setEvents((current) => [...current.slice(-99), event])
  }, [])

  const sendTelemetry = useCallback(async (
    telemetry: TelemetryData,
    formState: Record<string, unknown>,
    interactionContext: {
      clickCount: number
      fieldInteractions: Record<string, number>
      currentSection: string
      isSubmitted: boolean
    },
    requestId?: string,
  ) => {
    let generationSocket: WebSocket | null = null
    const currentSocket = socketRef.current
    if (currentSocket?.readyState === WebSocket.OPEN) {
      generationSocket = currentSocket
    } else if (currentSocket?.readyState === WebSocket.CONNECTING) {
      generationSocket = await new Promise<WebSocket | null>((resolve) => {
        let timeout = 0
        let settled = false
        const finish = (socket: WebSocket | null) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          socketReadyWaiters.current.delete(finish)
          resolve(socket)
        }
        timeout = window.setTimeout(() => finish(null), 250)
        socketReadyWaiters.current.add(finish)
      })
    }

    if (requestId && generationSocket?.readyState === WebSocket.OPEN) {
      const subscriptionReady = new Promise<void>((resolve) => {
        const timeout = window.setTimeout(() => {
          subscriptionWaiters.current.delete(requestId)
          resolve()
        }, 150)
        subscriptionWaiters.current.set(requestId, () => {
          window.clearTimeout(timeout)
          resolve()
        })
      })
      generationSocket.send(JSON.stringify({ type: 'generation_subscribe', timestamp: Date.now(), requestId, data: {} }))
      await subscriptionReady
    }

    try {
      const response = await fetch(`${apiUrl}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(requestId ? { requestId } : {}),
          cursorVelocity: telemetry.cursorVelocity,
          hesitation: telemetry.hesitationTime,
          repeatedClicks: telemetry.repeatedClickCount,
          fieldErrors: telemetry.fieldErrorCount,
          activeField: telemetry.activeField,
          formState,
          interactionContext,
        }),
      })

      const result = await response.json() as { success?: boolean; payload?: unknown; metrics?: UIGenerationMetrics; error?: string; message?: string }
      if (!response.ok || !result.success || result.payload === undefined || result.payload === null) {
        throw new Error(result.message ?? result.error ?? 'Backend did not generate a UI payload for this telemetry.')
      }

      return { payload: result.payload, metrics: result.metrics }
    } finally {
      if (requestId && generationSocket?.readyState === WebSocket.OPEN) {
        generationSocket.send(JSON.stringify({ type: 'generation_unsubscribe', timestamp: Date.now(), requestId, data: {} }))
      }
    }
  }, [apiUrl])

  const reset = useCallback(() => {
    setLastEvent(null)
    setEvents([])
  }, [])

  return {
    connected,
    socketUrl,
    apiUrl,
    lastEvent,
    events,
    send,
    sendTelemetry,
    reset,
  }
}
