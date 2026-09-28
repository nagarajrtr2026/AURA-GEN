'use client'

import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useEffect, useState, type ComponentType } from 'react'
import type { GeneratedUIPayload } from '@/types/generated-ui'
import type { UIGenerationProgress } from '@/types/websocket'

const LoadingCard = () => (
  <div className="rounded-2xl border border-[#dfeae7] bg-white p-6 text-sm text-[#67827d]">
    Loading adaptive interface…
  </div>
)

const ErrorCard = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-[#f2d7d7] bg-[#fff7f7] p-6 text-sm text-[#7c4a4a]">
    {message}
  </div>
)

function RenderCompleteSignal({ payloadId, onRenderComplete }: { payloadId: string; onRenderComplete: (payloadId: string) => void }) {
  useEffect(() => onRenderComplete(payloadId), [onRenderComplete, payloadId])
  return null
}

function ProgressView({ progress }: { progress: UIGenerationProgress }) {
  const cached = progress.stage === 'cache_hit' || progress.cacheStatus !== undefined
  const label = cached ? 'Reusing a validated adaptive interface' : progress.stage === 'validation_complete' ? 'Validation complete, preparing interface' : 'Generating adaptive interface'

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#dfeae7] bg-white px-4 py-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#42675f]">{label}</p>
        <span className="text-[11px] text-[#78928b]">{cached ? `${progress.cacheStatus ?? 'cache'} hit` : `${progress.tokenCount} tokens`}</span>
      </div>
      {!cached && <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#e6f1ed]">
        <motion.div className="h-full w-1/3 rounded-full bg-[#5c9e89]" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />
      </div>}
    </motion.div>
  )
}

type GeneratedStep = NonNullable<GeneratedUIPayload['props']['steps']>[number]

function GeneratedStepWizard({
  steps = [],
  values = {},
  onFieldChange,
}: {
  steps: GeneratedStep[]
  values?: Record<string, string>
  onFieldChange?: (name: string, value: string) => void
}) {
  const [step, setStep] = useState(0)
  const current = steps[step]

  if (!current) return <ErrorCard message="The generated wizard has no available steps." />

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#cfe4dc] bg-white p-6 shadow-[0_18px_70px_rgba(37,94,78,.1)] sm:p-10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#57857a]">Adaptive UI active</span>
        <span className="text-xs font-semibold text-[#88a09a]">Step {step + 1} of {steps.length}</span>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#e6f1ed]">
        <motion.div animate={{ width: `${((step + 1) / steps.length) * 100}%` }} className="h-full bg-[#5c9e89]" />
      </div>
      <AnimatePresence mode="wait">
        <motion.section key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="py-10">
          <h2 className="text-2xl font-semibold text-[#214e46]">{current.title}</h2>
          <div className="mt-6 space-y-4">
            {current.fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={`generated-${field.name}`} className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{field.label}</label>
                {field.type === 'select' ? (
                  <select id={`generated-${field.name}`} aria-label={field.label} value={values[field.name] ?? ''} onChange={(event) => onFieldChange?.(field.name, event.target.value)} className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d]">
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea id={`generated-${field.name}`} aria-label={field.label} value={values[field.name] ?? ''} placeholder={field.placeholder} onChange={(event) => onFieldChange?.(field.name, event.target.value)} rows={3} className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d]" />
                ) : (
                  <input id={`generated-${field.name}`} aria-label={field.label} type={field.type} value={values[field.name] ?? ''} placeholder={field.placeholder} onChange={(event) => onFieldChange?.(field.name, event.target.value)} className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d]" />
                )}
              </div>
            ))}
          </div>
        </motion.section>
      </AnimatePresence>
      <div className="flex items-center justify-between border-t border-[#edf2ef] pt-5">
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="rounded-lg border border-[#d9e8e3] bg-white px-4 py-2 text-sm font-medium text-[#52766f] disabled:opacity-50">Previous</button>
        <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="rounded-lg bg-[#214d46] px-5 py-2.5 text-sm font-semibold text-white">{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
      </div>
    </div>
  )
}

const componentMap: Record<string, ComponentType<any>> = {
  TextInput: dynamic(() => Promise.resolve(({ label, placeholder }: { label: string; placeholder?: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} placeholder={placeholder} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  )), { ssr: false }),
  SelectInput: dynamic(() => Promise.resolve(({ label, options = [] }: { label: string; options: Array<{ value: string; label: string }> }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <select aria-label={label} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )), { ssr: false }),
  NumberInput: dynamic(() => Promise.resolve(({ label, placeholder }: { label: string; placeholder?: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} type="number" placeholder={placeholder} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  )), { ssr: false }),
  DateInput: dynamic(() => Promise.resolve(({ label }: { label: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} type="date" className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  )), { ssr: false }),
  StepWizard: dynamic(() => Promise.resolve(GeneratedStepWizard), { ssr: false }),
  FinancialSummary: dynamic(() => Promise.resolve(({ title, description }: { title?: string; description?: string }) => (
    <div className="rounded-2xl border border-[#dfeae7] bg-white p-5">
      <h3 className="text-lg font-semibold text-[#214e46]">{title ?? 'Financial Summary'}</h3>
      <p className="mt-2 text-sm text-[#78928b]">{description ?? 'Your form data is validated and simplified into a step-by-step view.'}</p>
    </div>
  )), { ssr: false }),
}

export function DynamicRenderer({ payload, fallbackMessage, values, onFieldChange, generationProgress, onRenderComplete }: {
  payload: GeneratedUIPayload | null
  fallbackMessage?: string
  values?: Record<string, string>
  onFieldChange?: (name: string, value: string) => void
  generationProgress?: UIGenerationProgress | null
  onRenderComplete?: (payloadId: string) => void
}) {
  if (!payload) {
    if (generationProgress) return <ProgressView progress={generationProgress} />
    return <ErrorCard message={fallbackMessage ?? 'Unable to adapt the interface right now. Your current form data is safe.'} />
  }

  const Component = componentMap[payload.component]

  if (!Component) {
    return <ErrorCard message="This generated component type is not approved for safe rendering." />
  }

  if (payload.component === 'StepWizard') {
    return (
      <Suspense fallback={<LoadingCard />}>
        <>
          {generationProgress && <ProgressView progress={generationProgress} />}
          <Component steps={payload.props.steps ?? []} values={values} onFieldChange={onFieldChange} />
          {onRenderComplete && <RenderCompleteSignal payloadId={payload.id} onRenderComplete={onRenderComplete} />}
        </>
      </Suspense>
    )
  }

  if (payload.component === 'FinancialSummary') {
    return (
      <Suspense fallback={<LoadingCard />}>
        <>
          {generationProgress && <ProgressView progress={generationProgress} />}
          <Component title={payload.props.title} description={payload.props.description} />
          {onRenderComplete && <RenderCompleteSignal payloadId={payload.id} onRenderComplete={onRenderComplete} />}
        </>
      </Suspense>
    )
  }

  const field = payload.props.fields?.[0]
  return (
    <Suspense fallback={<LoadingCard />}>
      <>
        {generationProgress && <ProgressView progress={generationProgress} />}
        <Component label={field?.label ?? 'Generated field'} placeholder={field?.placeholder} options={field?.options ?? []} />
        {onRenderComplete && <RenderCompleteSignal payloadId={payload.id} onRenderComplete={onRenderComplete} />}
      </>
    </Suspense>
  )
}
