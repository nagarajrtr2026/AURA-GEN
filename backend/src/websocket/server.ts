import { WebSocketServer } from 'ws'
import type { WebSocket as WsSocket } from 'ws'
import type { TelemetryEvent, WebSocketPayload } from '../types/telemetry.js'

export class AuraWebSocketServer {
  private server: WebSocketServer

  constructor(port: number) {
    this.server = new WebSocketServer({ port })
  }

  start() {
    this.server.on('connection', (socket: WsSocket) => {
      socket.send(JSON.stringify({ type: 'connection_established', timestamp: Date.now(), data: { status: 'connected' } }))

      socket.on('message', (raw) => {
        try {
          const event = JSON.parse(raw.toString()) as Partial<TelemetryEvent> & { requestId?: string }
          const payload: WebSocketPayload & { requestId?: string } = {
            type: event.type ?? 'telemetry_update',
            timestamp: Date.now(),
            data: event.data as Record<string, unknown>,
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

  close() {
    this.server.close()
  }
}
