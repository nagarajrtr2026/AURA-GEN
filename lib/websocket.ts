import type { GeneratedUIPayload } from '@/types/generated-ui'
import type { WebSocketEvent, WebSocketEventType } from '@/types/websocket'

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

export class AuraWebSocket {
  private socket: WebSocket | null = null
  private listeners = new Set<(event: WebSocketEvent) => void>()

  connect() {
    if (typeof window === 'undefined' || this.socket) return

    try {
      this.socket = new WebSocket(WS_URL)
      this.socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as WebSocketEvent
          this.listeners.forEach((listener) => listener(event))
        } catch {
          // Invalid payloads are ignored until the backend contract is available.
        }
      }
      this.socket.onclose = () => {
        this.socket = null
      }
      this.socket.onerror = () => {
        this.socket = null
      }
    } catch {
      this.socket = null
    }
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  subscribe(listener: (event: WebSocketEvent) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(event: WebSocketEvent) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event))
    }
  }
}

export const auraWebSocket = new AuraWebSocket()

export const createEvent = (type: WebSocketEventType, data?: Record<string, unknown>): WebSocketEvent => ({
  type,
  data,
  timestamp: Date.now(),
})

export const createDemoGeneratedUI = (): GeneratedUIPayload => ({
  id: 'wizard-v1',
  version: '1.0.0',
  type: 'step_wizard',
  component: 'StepWizard',
  props: {
    title: 'A simpler way forward',
    description: 'A focused flow based on your progress.',
    steps: [
      { id: 'fullName', title: 'Your name', fields: [{ name: 'fullName', type: 'text', label: 'Full name', placeholder: 'Nagaraj M' }] },
      { id: 'employmentType', title: 'Income type', fields: [{ name: 'employmentType', type: 'select', label: 'Employment type', options: [{ value: 'Salaried', label: 'Salaried' }, { value: 'Self-Employed', label: 'Self-Employed' }] }] },
      { id: 'annualIncome', title: 'Annual income', fields: [{ name: 'annualIncome', type: 'number', label: 'Annual income', placeholder: '₹ 500000' }] },
      { id: 'monthlyExpenses', title: 'Monthly expenses', fields: [{ name: 'monthlyExpenses', type: 'number', label: 'Monthly expenses', placeholder: '₹ 35000' }] },
      { id: 'panNumber', title: 'Tax details', fields: [{ name: 'panNumber', type: 'text', label: 'PAN number', placeholder: 'ABCDE1234F' }] },
    ],
  },
  fields: ['fullName', 'employmentType', 'annualIncome', 'monthlyExpenses', 'panNumber'],
  state: {},
  timestamp: Date.now(),
})

export function isWebSocketConnected() {
  return typeof window !== 'undefined' && auraWebSocket['socket']?.readyState === WebSocket.OPEN
}

export function useWebSocketPlaceholder() {
  return { url: WS_URL, mode: 'mock' as const }
}
