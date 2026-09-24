'use client'

import { useCallback, useMemo, useState } from 'react'
import { createDemoAdaptivePayload } from '@/lib/websocket/mockWebSocket'
import type { AdaptivePhase, AdaptiveMode } from '@/types/adaptive-ui'

export function useAdaptiveUI() {
  const [phase, setPhase] = useState<AdaptivePhase>('MONITORING')
  const [mode, setMode] = useState<AdaptiveMode>('original')
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'started' | 'complete' | 'error'>('idle')
  const [generatedUI, setGeneratedUI] = useState<ReturnType<typeof createDemoAdaptivePayload> | null>(null)
  const [fallbackMessage, setFallbackMessage] = useState('Unable to adapt the interface right now. Your current form data is safe.')
  const [lastError, setLastError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setPhase('MONITORING')
    setMode('original')
    setGenerationStatus('idle')
    setGeneratedUI(null)
    setFallbackMessage('Unable to adapt the interface right now. Your current form data is safe.')
    setLastError(null)
  }, [])

  const startGeneration = useCallback(() => {
    setMode('adaptive')
    setPhase('GENERATION_STARTED')
    setGenerationStatus('started')
    setLastError(null)
  }, [])

  const completeGeneration = useCallback(() => {
    const payload = createDemoAdaptivePayload()
    setGeneratedUI(payload)
    setGenerationStatus('complete')
    setPhase('GENERATION_COMPLETE')
  }, [])

  const setFallback = useCallback((message?: string) => {
    const nextMessage = message ?? 'Unable to adapt the interface right now. Your current form data is safe.'
    setFallbackMessage(nextMessage)
    setLastError(nextMessage)
    setGenerationStatus('error')
    setPhase('FALLBACK')
    setMode('fallback')
  }, [])

  return useMemo(
    () => ({
      phase,
      mode,
      generationStatus,
      generatedUI,
      fallbackMessage,
      lastError,
      setPhase,
      setMode,
      setGenerationStatus,
      setGeneratedUI,
      setFallbackMessage,
      setLastError,
      reset,
      startGeneration,
      completeGeneration,
      setFallback,
    }),
    [phase, mode, generationStatus, generatedUI, fallbackMessage, lastError, reset, startGeneration, completeGeneration, setFallback],
  )
}
