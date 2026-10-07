'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIGenerationMetrics, WebSocketEvent } from '@/types/websocket'
import type { TelemetryData } from '@/types/telemetry'

interface BackendHealth {
  status?: string
  llmConfigured?: boolean
  websocketReady?: boolean
}

async function getBackendHealth(apiUrl: string): Promise<BackendHealth> {
  const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Backend health check returned ${response.status}.`)
  const health = await response.json() as BackendHealth
  if (health.status !== 'ok') throw new Error('AuraGen backend is not ready.')
  return health
}

export function useWebSocket() {
  const socketUrl = useMemo(() => process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001', [])
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', [])
  const socketRef = useRef<WebSocket | null>(null)
  const socketReadyWaiters = useRef(new Set<(socket: WebSocket | null) => void>())
  const subscriptionWaiters = useRef(new Map<string, () => void>())
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null)
  const [events, setEvents] = useState<WebSocketEvent[]>([])

  useEffect(() => {
    let disposed = false
    let reconnectTimer: number | null = null
    let retryDelay = 750

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        void connectWhenBackendReady()
      }, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 5000)
    }

    const connectWhenBackendReady = async () => {
      try {
        const health = await getBackendHealth(apiUrl)
        if (health.websocketReady !== true) {
          throw new Error('Backend WebSocket service is not ready.')
        }
      } catch {
        scheduleReconnect()
        return
      }

      if (disposed) return

      let socket: WebSocket
      try {
        socket = new WebSocket(socketUrl)
      } catch {
        scheduleReconnect()
        return
      }
      socketRef.current = socket

      socket.onopen = () => {
        retryDelay = 750
        setConnected(true)
        socketReadyWaiters.current.forEach((resolve) => resolve(socket))
        socketReadyWaiters.current.clear()
      }

      socket.onclose = () => {
        setConnected(false)
        if (socketRef.current === socket) socketRef.current = null
        socketReadyWaiters.current.forEach((resolve) => resolve(null))
        socketReadyWaiters.current.clear()
        scheduleReconnect()
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
    }

    void connectWhenBackendReady()

    return () => {
      disposed = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [apiUrl, socketUrl])

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
      const health = await getBackendHealth(apiUrl)
      if (!health.llmConfigured) {
        throw new Error('Adaptive generation needs a valid GROQ_API_KEY in backend/.env. Add the key, then restart the development server.')
      }

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

      let result: { success?: boolean; payload?: unknown; metrics?: UIGenerationMetrics; error?: string; message?: string; diagnostic?: string }
      try {
        result = await response.json() as typeof result
      } catch {
        throw new Error(`AuraGen backend returned an invalid response (${response.status}). Check the backend logs.`)
      }
      if (!response.ok || !result.success || result.payload === undefined || result.payload === null) {
        throw new Error(result.message ?? result.error ?? 'Backend did not generate a UI payload for this telemetry.')
      }

      return { payload: result.payload, metrics: result.metrics }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Cannot reach the AuraGen backend at ${apiUrl}. Start it with "npm run dev" and check its terminal output.`)
      }
      throw error
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
