'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowRight, BadgeCheck, BarChart3, Bot, Check, Code2, FileText, Gauge, LockKeyhole, RotateCcw, Send, ShieldCheck, Sparkles, Timer, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DynamicRenderer } from '@/components/adaptive-ui/DynamicRenderer'
import { FinancialForm, WizardStep } from '@/components/financial-form/FinancialForm'
import { Header } from '@/components/layout/Header'
import { CognitiveLoadCard } from '@/components/cognitive-load/CognitiveLoadCard'
import { TelemetryMonitor } from '@/components/telemetry/TelemetryMonitor'
import { useCognitiveLoad } from '@/hooks/useCognitiveLoad'
import { useTelemetry } from '@/hooks/useTelemetry'
import { useWebSocket } from '@/hooks/useWebSocket'
import { createDemoGeneratedUI } from '@/lib/websocket'
import type { GeneratedUIPayload } from '@/types/generated-ui'
import type { FinancialFormState } from '@/types/financial-form'

const blank: FinancialFormState = {
  personal: {},
  employment: {},
  financial: {},
  tax: {},
  currentSection: 'personal',
  isSubmitted: false,
}

type AdaptivePhase =
  | 'MONITORING'
  | 'FRICTION_DETECTED'
  | 'HIGH_COGNITIVE_LOAD'
  | 'GENERATION_STARTED'
  | 'GENERATION_COMPLETE'
  | 'MORPHING'
  | 'ADAPTIVE_UI_ACTIVE'
  | 'ERROR'
  | 'FALLBACK'

function Badge({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'slate' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${tone === 'green' ? 'border-[#cfe6de] bg-[#edf8f3] text-[#2f8169]' : tone === 'amber' ? 'border-[#f0dfb8] bg-[#fff8e7] text-[#a06d1f]' : 'border-[#dce7e3] bg-white text-[#6d8580]'}`}>
      {children}
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf2ef] py-3 last:border-b-0">
      <span className="text-xs text-[#76908a]">{label}</span>
      <span className="text-xs font-semibold text-[#2b4e48]">{value}</span>
    </div>
  )
}

function getAdaptiveStatusText(phase: AdaptivePhase) {
  switch (phase) {
    case 'MONITORING':
      return 'Monitoring form friction'
    case 'FRICTION_DETECTED':
      return 'Friction detected'
    case 'HIGH_COGNITIVE_LOAD':
      return 'High cognitive load'
    case 'GENERATION_STARTED':
      return 'Generating adaptive flow'
    case 'GENERATION_COMPLETE':
      return 'Adaptive flow ready'
    case 'MORPHING':
      return 'Morphing interface'
    case 'ADAPTIVE_UI_ACTIVE':
      return 'Adaptive UI active'
    case 'ERROR':
      return 'Generation error'
    case 'FALLBACK':
      return 'Fallback mode'
    default:
      return 'Monitoring'
  }
}

function FinancialExperience() {
  const [form, setForm] = useState<FinancialFormState>(blank)
  const telemetryApi = useTelemetry()
  const cognitive = useCognitiveLoad(telemetryApi.telemetry)
  const socket = useWebSocket()
  const [phase, setPhase] = useState<AdaptivePhase>('MONITORING')
  const [mode, setMode] = useState<'original' | 'adaptive' | 'fallback'>('original')
  const [generatedUI, setGeneratedUI] = useState<GeneratedUIPayload | null>(null)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'started' | 'complete' | 'error'>('idle')
  const [monitorExpanded, setMonitorExpanded] = useState(true)
  const [demoMode, setDemoMode] = useState(true)
  const [fallbackMessage, setFallbackMessage] = useState('Unable to adapt the interface right now. Your current form data is safe.')
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (!demoMode || phase === 'ADAPTIVE_UI_ACTIVE' || phase === 'FALLBACK' || phase === 'ERROR') {
      return
    }

    if (cognitive.level === 'HIGH' && phase === 'MONITORING') {
      setPhase('FRICTION_DETECTED')
      setMode('adaptive')
      socket.emitMock('cognitive_load_update')

      const detectTimer = window.setTimeout(() => {
        setPhase('HIGH_COGNITIVE_LOAD')
        socket.emitMock('ui_generation_started')
        setGenerationStatus('started')
      }, 700)

      return () => window.clearTimeout(detectTimer)
    }
  }, [cognitive.level, demoMode, phase, socket])

  useEffect(() => {
    if (phase !== 'HIGH_COGNITIVE_LOAD' && phase !== 'GENERATION_STARTED') {
      return
    }

    const generationTimer = window.setTimeout(() => {
      const payload = createDemoGeneratedUI()
      setGeneratedUI(payload)
      setGenerationStatus('complete')
      setPhase('GENERATION_COMPLETE')
      socket.emitMock('ui_generation_complete')

      window.setTimeout(() => {
        setPhase('MORPHING')
        socket.emitMock('ui_morph_start')
        window.setTimeout(() => {
          setPhase('ADAPTIVE_UI_ACTIVE')
          setMode('adaptive')
          socket.emitMock('ui_morph_complete')
        }, 600)
      }, 400)
    }, 900)

    return () => window.clearTimeout(generationTimer)
  }, [phase, socket])

  const handleAdaptiveStart = () => {
    setMode('adaptive')
    setPhase('GENERATION_STARTED')
    setGenerationStatus('started')
    socket.emitMock('ui_generation_started')
  }

  const handleFallback = () => {
    const message = 'Unable to adapt the interface right now. Your current form data is safe.'
    setFallbackMessage(message)
    setLastError(message)
    setGenerationStatus('error')
    setPhase('FALLBACK')
    setMode('fallback')
    socket.emitMock('ui_fallback')
  }

  const handleContinueOriginal = () => {
    setPhase('MONITORING')
    setMode('original')
    setGenerationStatus('idle')
    setGeneratedUI(null)
    setLastError(null)
    setFallbackMessage('Unable to adapt the interface right now. Your current form data is safe.')
    socket.emitMock('ui_fallback')
  }

  const handleTryAgain = () => {
    setPhase('GENERATION_STARTED')
    setGenerationStatus('started')
    setMode('adaptive')
    setFallbackMessage('Unable to adapt the interface right now. Your current form data is safe.')
    socket.emitMock('ui_generation_started')

    const retryTimer = window.setTimeout(() => {
      const payload = createDemoGeneratedUI()
      setGeneratedUI(payload)
      setGenerationStatus('complete')
      setPhase('GENERATION_COMPLETE')
      socket.emitMock('ui_generation_complete')
      window.setTimeout(() => {
        setPhase('MORPHING')
        socket.emitMock('ui_morph_start')
        window.setTimeout(() => {
          setPhase('ADAPTIVE_UI_ACTIVE')
          setMode('adaptive')
          socket.emitMock('ui_morph_complete')
        }, 600)
      }, 400)
    }, 900)

    return () => window.clearTimeout(retryTimer)
  }

  const handleSimulate = () => {
    telemetryApi.simulateFrustration()
    setPhase('FRICTION_DETECTED')
    setMode('adaptive')
    socket.emitMock('cognitive_load_update')
  }

  const resetDemo = () => {
    setForm(blank)
    setPhase('MONITORING')
    setMode('original')
    setGeneratedUI(null)
    setGenerationStatus('idle')
    setFallbackMessage('Unable to adapt the interface right now. Your current form data is safe.')
    setLastError(null)
    socket.reset()
    telemetryApi.resetTelemetry()
  }

  return (
    <div className="min-h-screen bg-[#f7faf9] text-[#294c45]">
      <Header connected={phase !== 'MONITORING' || socket.connected} />
      <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-10 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Badge><LockKeyhole className="size-3" />Secure workspace</Badge>
              <span className="text-xs text-[#90a6a0]">Application ID · AG-24091</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#214b44] sm:text-4xl">Financial application</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#78928b]">
              A guided application designed to adapt when the process starts to feel complex.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#dce9e5] bg-white px-3 py-2 text-xs font-semibold text-[#658078]">
              <input type="checkbox" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} className="accent-[#438674]" />
              Demo mode
            </label>
            <button type="button" onClick={resetDemo} className="inline-flex items-center gap-2 rounded-lg border border-[#d8e8e2] bg-white px-3 py-2 text-xs font-semibold text-[#50776d]">
              <RotateCcw className="size-3.5" />
              Reset demo
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge tone="slate">{getAdaptiveStatusText(phase)}</Badge>
          <Badge tone={cognitive.level === 'HIGH' ? 'amber' : 'green'}>{cognitive.level} cognitive load</Badge>
          <Badge tone="slate">Generation: {generationStatus}</Badge>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'FRICTION_DETECTED' || phase === 'HIGH_COGNITIVE_LOAD' || phase === 'GENERATION_STARTED' || phase === 'GENERATION_COMPLETE' || phase === 'MORPHING' ? (
            <motion.div key="adaptive-message" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mb-6 rounded-2xl border border-[#dce9e5] bg-[#edf7f3] p-4 text-sm text-[#2b4d48]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-[#3d8b73]">
                    <Gauge className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Adaptive response active</p>
                    <p className="text-xs text-[#5c7b76]">High friction detected in the financial workflow.</p>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#5b8d7d]">{phase}</span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_320px]">
          <div className="space-y-6">
            {phase === 'ADAPTIVE_UI_ACTIVE' || phase === 'MORPHING' || phase === 'GENERATION_COMPLETE' ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                <div className="rounded-2xl border border-[#dfeae7] bg-white p-4 shadow-[0_18px_50px_rgba(35,92,76,.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6d9a8c]">Adaptive UI</p>
                      <h2 className="mt-2 text-2xl font-semibold text-[#204c45]">Simplified application flow</h2>
                    </div>
                    <button type="button" onClick={() => setPhase('MONITORING')} className="rounded-lg border border-[#d8e8e2] bg-white px-3 py-2 text-xs font-semibold text-[#50776d]">
                      Back to form
                    </button>
                  </div>
                </div>
                <DynamicRenderer payload={generatedUI} fallbackMessage={fallbackMessage} />
                {phase === 'ADAPTIVE_UI_ACTIVE' && <WizardStep form={form} setForm={setForm} onBack={() => setPhase('MONITORING')} />}
              </motion.div>
            ) : (
              <FinancialForm
                form={form}
                setForm={setForm}
                onAdaptive={handleAdaptiveStart}
                onFocusField={(field) => telemetryApi.focusField(field)}
                onBlurField={(field, hasError = false) => telemetryApi.blurField(field, hasError)}
              />
            )}

            {phase === 'FALLBACK' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#f1d6d6] bg-[#fff7f7] p-5 shadow-[0_16px_40px_rgba(112,69,69,.06)]">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-[#bf6666]">
                    <X className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-[#5d3636]">Unable to adapt the interface right now.</p>
                    <p className="mt-2 text-sm text-[#7f5050]">{fallbackMessage}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={handleContinueOriginal} className="rounded-lg bg-[#214d46] px-4 py-2.5 text-sm font-semibold text-white">
                        Continue with original form
                      </button>
                      <button type="button" onClick={handleTryAgain} className="rounded-lg border border-[#e0c8c8] bg-white px-4 py-2.5 text-sm font-semibold text-[#6d4d4d]">
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-5">
            <CognitiveLoadCard {...cognitive} />
            <div className="rounded-2xl border border-[#dce9e5] bg-white p-5 shadow-[0_12px_30px_rgba(28,57,52,.04)]">
              <p className="text-xs text-[#86a19a]">Adaptive UI state</p>
              <p className="mt-3 text-lg font-semibold text-[#244e46]">{phase}</p>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Status" value={generationStatus} />
                <SummaryRow label="WebSocket" value={socket.connected ? 'connected' : 'standby'} />
                <SummaryRow label="Mode" value={socket.mode} />
                <SummaryRow label="Last event" value={socket.lastEvent?.type ?? 'none'} />
              </div>
            </div>
            <div className="rounded-2xl border border-[#dce9e5] bg-white p-5 shadow-[0_12px_30px_rgba(28,57,52,.04)]">
              <p className="text-xs text-[#86a19a]">Form summary</p>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Cursor velocity" value={`${telemetryApi.telemetry.cursorVelocity} px/s`} />
                <SummaryRow label="Hesitation" value={`${Math.round((telemetryApi.telemetry.hesitationTime / 100) * 10) / 10}s`} />
                <SummaryRow label="Repeated clicks" value={`${telemetryApi.telemetry.repeatedClickCount}`} />
                <SummaryRow label="Errors" value={`${telemetryApi.telemetry.fieldErrorCount}`} />
                <SummaryRow label="Active field" value={telemetryApi.telemetry.activeField ?? 'none'} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <TelemetryMonitor score={cognitive.score} telemetry={telemetryApi.telemetry} onSimulate={handleSimulate} expanded={monitorExpanded} setExpanded={setMonitorExpanded} />
    </div>
  )
}

export function FinancialFormPage() {
  return <FinancialExperience />
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7faf9]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <Badge><Sparkles className="size-3" />Generative interface systems</Badge>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-[#1d443d] sm:text-6xl">
              Interfaces that get <span className="text-[#5c9988]">simpler</span> when work gets hard.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#78928b]">
              AuraGen detects interaction friction in real time and reshapes complex workflows into focused, step-by-step experiences — without losing the user&apos;s progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/financial-form" className="flex items-center gap-2 rounded-lg bg-[#214d46] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#214d46]/15 transition hover:bg-[#173d37]">
                Open financial application<ArrowRight className="size-4" />
              </Link>
              <Link href="/demo" className="flex items-center gap-2 rounded-lg border border-[#d8e8e2] bg-white px-5 py-3 text-sm font-semibold text-[#4a7168]">
                Explore the demo
              </Link>
            </div>
            <div className="mt-12 flex gap-8 border-t border-[#dce9e5] pt-6">
              <div>
                <p className="text-2xl font-semibold text-[#28554c]">&lt; 2s</p>
                <p className="mt-1 text-xs text-[#829a93]">targeted redesign</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#28554c]">100%</p>
                <p className="mt-1 text-xs text-[#829a93]">state preserved</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#28554c]">AST</p>
                <p className="mt-1 text-xs text-[#829a93]">validated output</p>
              </div>
            </div>
          </div>

          <div className="relative rounded-3xl border border-[#d4e8e1] bg-white p-5 shadow-[0_24px_80px_rgba(43,98,84,.12)]">
            <div className="rounded-2xl bg-[#f6faf8] p-5">
              <div className="flex items-center justify-between border-b border-[#e1eee9] pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#e8f4ef] text-[#4f9987]">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#255148]">Live waveform</p>
                    <p className="text-xs text-[#819c96]">Task friction + adaptation</p>
                  </div>
                </div>
                <Badge tone="green">Stable</Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Observation', value: '4.2s', tone: 'bg-[#e7f4ee]' },
                  { label: 'Response', value: '1.7s', tone: 'bg-[#edf5f2]' },
                  { label: 'Recovery', value: '94%', tone: 'bg-[#f2f9f6]' },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} rounded-xl p-3`}>
                    <p className="text-[10px] uppercase tracking-[.14em] text-[#66837c]">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-[#204c45]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-[#dfeae7] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#6d9a8c]">Cognitive load</span>
                  <span className="text-xs text-[#588b7d]">LOW</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef3f1]">
                  <div className="h-full w-[38%] rounded-full bg-[#5a9e89]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export function DemoPage() {
  return (
    <div className="min-h-screen bg-[#f7faf9]">
      <Header />
      <main className="mx-auto max-w-[1050px] px-5 pb-24 pt-12 lg:px-8">
        <div className="max-w-2xl">
          <Badge><Bot className="size-3" />Interactive demonstration</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#214b44]">Watch the interface respond to friction.</h1>
          <p className="mt-3 text-sm leading-6 text-[#78928b]">
            Open the application and use the floating monitor to simulate frustration. The local prototype will raise the score and morph the workflow into a focused wizard.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Activity, title: '1. Observe', text: 'Signals stay in the background while you work.' },
            { icon: Gauge, title: '2. Detect', text: 'A transparent friction score crosses its threshold.' },
            { icon: Sparkles, title: '3. Adapt', text: 'The same form becomes a calmer guided flow.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[#dce9e5] bg-white p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-[#e7f3ee] text-[#559785]">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-5 font-semibold text-[#315950]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#839b94]">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#cfe5dc] bg-[#edf7f3] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#61998a]">Ready when you are</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#255148]">Run the adaptive UI demo</h2>
            </div>
            <Link href="/financial-form" className="flex items-center justify-center gap-2 rounded-lg bg-[#214d46] px-5 py-3 text-sm font-semibold text-white">
              Launch demo<ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export function DeveloperPage() {
  const telemetryApi = useTelemetry()
  const cognitive = useCognitiveLoad(telemetryApi.telemetry)
  const socket = useWebSocket()

  const events = useMemo(
    () => [
      { type: 'telemetry_update', time: 'now', desc: 'Interaction signals captured' },
      { type: 'cognitive_load_update', time: '12s ago', desc: `Score recalculated · ${cognitive.score}/100` },
      { type: socket.lastEvent?.type ?? 'idle', time: 'just now', desc: socket.lastEvent?.data ? 'Mock payload received' : 'Awaiting event' },
    ],
    [cognitive.score, socket.lastEvent],
  )

  return (
    <div className="min-h-screen bg-[#f7faf9]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <Badge><Code2 className="size-3" />Developer view</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#214b44]">System observability</h1>
            <p className="mt-2 text-sm text-[#78928b]">A transparent view into the frontend integration contract.</p>
          </div>
          <Link href="/financial-form" className="hidden items-center gap-2 rounded-lg border border-[#d8e8e2] bg-white px-4 py-2.5 text-sm font-semibold text-[#50776d] sm:flex">
            Open application<ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <CognitiveLoadCard {...cognitive} />
          <div className="rounded-2xl border border-[#dce9e5] bg-white p-5">
            <p className="text-xs text-[#86a19a]">WebSocket connection</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-[#244e46]">
              <span className={`size-2 rounded-full ${socket.connected ? 'bg-[#3ca77b]' : 'bg-[#a9bcb7]'}`} />
              {socket.connected ? 'Connected' : 'Standby'}
            </p>
            <p className="mt-3 font-mono text-[10px] text-[#8ba39c]">NEXT_PUBLIC_WS_URL = {socket.socketUrl}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => socket.setMode(socket.mode === 'mock' ? 'real' : 'mock')} className="rounded-lg border border-[#d8e8e2] bg-white px-3 py-2 text-xs font-semibold text-[#50776d]">
                {socket.mode === 'mock' ? 'Switch to Real' : 'Switch to Mock'}
              </button>
              <button type="button" onClick={socket.reset} className="rounded-lg border border-[#d8e8e2] bg-white px-3 py-2 text-xs font-semibold text-[#50776d]">
                Reset session
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce9e5] bg-white p-5">
            <p className="text-xs text-[#86a19a]">Adaptive UI state</p>
            <p className="mt-3 text-lg font-semibold text-[#244e46]">Monitoring</p>
            <div className="mt-4 space-y-3">
              <SummaryRow label="WS mode" value={socket.mode} />
              <SummaryRow label="Score" value={`${cognitive.score}/100`} />
              <SummaryRow label="Level" value={cognitive.level} />
              <SummaryRow label="Fallback" value={socket.lastEvent?.type === 'ui_fallback' ? 'active' : 'idle'} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-[#dce9e5] bg-white p-5">
            <p className="text-xs text-[#86a19a]">Telemetry values</p>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Cursor velocity" value={`${telemetryApi.telemetry.cursorVelocity} px/s`} />
              <SummaryRow label="Hesitation time" value={`${Math.round((telemetryApi.telemetry.hesitationTime / 100) * 10) / 10}s`} />
              <SummaryRow label="Repeated clicks" value={`${telemetryApi.telemetry.repeatedClickCount}`} />
              <SummaryRow label="Field errors" value={`${telemetryApi.telemetry.fieldErrorCount}`} />
              <SummaryRow label="Active field" value={telemetryApi.telemetry.activeField ?? 'none'} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce9e5] bg-white p-5">
            <p className="text-xs text-[#86a19a]">Event stream</p>
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <div key={`${event.type}-${event.time}`} className="rounded-xl border border-[#edf2ef] bg-[#f7faf9] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6d9a8c]">{event.type}</span>
                    <span className="text-[10px] text-[#7d948e]">{event.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#2b4e48]">{event.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FinancialExperience
