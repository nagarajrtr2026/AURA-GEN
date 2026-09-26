import type { AdaptiveUIPayload } from '@/types/adaptive-ui'
import type { WebSocketEvent, WebSocketEventType } from '@/types/websocket'

export function createMockWebSocketEvent(type: WebSocketEventType): WebSocketEvent {
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
    timestamp: Date.now(),
    data: payloadMap[type],
  }
}

export function createDemoAdaptivePayload(): AdaptiveUIPayload {
  return {
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
  }
}
