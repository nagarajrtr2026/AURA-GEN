import { WebSocketServer } from 'ws'
import type { WebSocket as WsSocket } from 'ws'
import type { WebSocketPayload } from '../types/telemetry.js'

export class AuraWebSocketServer {
  private server: WebSocketServer
  private readonly generationSubscribers = new Map<string, WsSocket>()
  private started = false

  constructor(port: number, allowedOrigin?: string) {
    this.server = new WebSocketServer({
      port,
      verifyClient: (info: { origin: string }) => !allowedOrigin || !info.origin || info.origin === allowedOrigin,
    })
  }

  start() {
    if (this.started) return Promise.resolve()
    this.started = true

    this.server.on('connection', (socket: WsSocket) => {
      socket.send(JSON.stringify({ type: 'connection_established', timestamp: Date.now(), data: { status: 'connected' } }))
      socket.on('close', () => {
        for (const [requestId, subscriber] of this.generationSubscribers) {
          if (subscriber === socket) this.generationSubscribers.delete(requestId)
        }
      })

      socket.on('message', (raw) => {
        try {
          const event = JSON.parse(raw.toString()) as { type?: string; requestId?: string; data?: unknown }
          if (event.type === 'generation_subscribe' && typeof event.requestId === 'string') {
            this.generationSubscribers.set(event.requestId, socket)
            socket.send(JSON.stringify({
              type: 'generation_subscription_ready',
              timestamp: Date.now(),
              requestId: event.requestId,
              data: { status: 'subscribed' },
            }))
            return
          }
          if (event.type === 'generation_unsubscribe' && typeof event.requestId === 'string') {
            if (this.generationSubscribers.get(event.requestId) === socket) this.generationSubscribers.delete(event.requestId)
            return
          }
          const eventType = event.type
          if (!eventType || !['telemetry_update', 'ui_fallback', 'ui_morph_start', 'ui_morph_complete'].includes(eventType)) return

          const payload: WebSocketPayload & { requestId?: string } = {
            type: eventType,
            timestamp: Date.now(),
            data: event.data as Record<string, unknown> | undefined,
            ...(typeof event.requestId === 'string' ? { requestId: event.requestId } : {}),
          }

          this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify(payload))
            }
          })
        } catch {
          socket.send(JSON.stringify({ type: 'validation_error', timestamp: Date.now(), data: { message: 'Invalid telemetry payload.' } }))
        }
      })
    })

    if (this.server.address()) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      this.server.once('listening', resolve)
      this.server.once('error', reject)
    })
  }

  get port(): number | null {
    const address = this.server.address()
    return address && typeof address !== 'string' ? address.port : null
  }

  sendToRequest(requestId: string, type: string, data: Record<string, unknown>) {
    const socket = this.generationSubscribers.get(requestId)
    if (socket?.readyState === 1) {
      const payload = { type, timestamp: Date.now(), data, requestId }
      socket.send(JSON.stringify(payload))
    }
    if (type === 'ui_generation_complete' || type === 'ui_generation_error') {
      this.generationSubscribers.delete(requestId)
    }
  }

  broadcast(type: string, data: Record<string, unknown>) {
    const payload: WebSocketPayload & { requestId?: string } = {
      type,
      timestamp: Date.now(),
      data,
      ...(typeof data.requestId === 'string' ? { requestId: data.requestId } : {}),
    }

    this.server.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(payload))
      }
    })
  }

  close(callback?: (error?: Error) => void) {
    this.server.close(callback)
  }
}
