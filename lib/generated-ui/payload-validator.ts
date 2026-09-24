import type { AdaptiveUIPayload } from '@/types/adaptive-ui'

export const ALLOWED_UI_COMPONENTS = new Set<AdaptiveUIPayload['component']>([
  'TextInput',
  'SelectInput',
  'NumberInput',
  'DateInput',
  'StepWizard',
  'FinancialSummary',
])

export function validateGeneratedUIPayload(value: unknown): { valid: boolean; payload?: AdaptiveUIPayload; error?: string } {
  if (!value || typeof value !== 'object') {
    return { valid: false, error: 'Unknown or invalid generated UI payload.' }
  }

  const candidate = value as Partial<AdaptiveUIPayload>

  if (!candidate.id || !candidate.version || !candidate.type || !candidate.component || !Array.isArray(candidate.fields)) {
    return { valid: false, error: 'Unknown or invalid generated UI payload.' }
  }

  if (!['step_wizard', 'simplified_form', 'adaptive_form'].includes(candidate.type)) {
    return { valid: false, error: 'Unknown or invalid generated UI payload.' }
  }

  if (!ALLOWED_UI_COMPONENTS.has(candidate.component as AdaptiveUIPayload['component'])) {
    return { valid: false, error: 'This generated component type is not approved for safe rendering.' }
  }

  return { valid: true, payload: candidate as AdaptiveUIPayload }
}
