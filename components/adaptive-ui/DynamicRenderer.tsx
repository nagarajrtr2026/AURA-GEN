'use client'

import dynamic from 'next/dynamic'
import { Suspense, type ComponentType } from 'react'
import type { GeneratedUIPayload } from '@/types/generated-ui'

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
  StepWizard: dynamic(() => Promise.resolve(({ steps = [] }: { steps: Array<{ id: string; title: string; fields: unknown[] }> }) => (
    <div className="space-y-4 rounded-2xl border border-[#dfeae7] bg-white p-4">
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-xl border border-[#edf2ef] bg-[#f7faf9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">Step {index + 1}</p>
          <h3 className="mt-2 text-lg font-semibold text-[#214e46]">{step.title}</h3>
        </div>
      ))}
    </div>
  )), { ssr: false }),
  FinancialSummary: dynamic(() => Promise.resolve(({ title, description }: { title?: string; description?: string }) => (
    <div className="rounded-2xl border border-[#dfeae7] bg-white p-5">
      <h3 className="text-lg font-semibold text-[#214e46]">{title ?? 'Financial Summary'}</h3>
      <p className="mt-2 text-sm text-[#78928b]">{description ?? 'Your form data is validated and simplified into a step-by-step view.'}</p>
    </div>
  )), { ssr: false }),
}

export function DynamicRenderer({ payload, fallbackMessage }: { payload: GeneratedUIPayload | null; fallbackMessage?: string }) {
  if (!payload) {
    return <ErrorCard message={fallbackMessage ?? 'Unable to adapt the interface right now. Your current form data is safe.'} />
  }

  const Component = componentMap[payload.component]

  if (!Component) {
    return <ErrorCard message="This generated component type is not approved for safe rendering." />
  }

  if (payload.component === 'StepWizard') {
    return (
      <Suspense fallback={<LoadingCard />}>
        <Component steps={payload.props.steps ?? []} title={payload.props.title} description={payload.props.description} />
      </Suspense>
    )
  }

  if (payload.component === 'FinancialSummary') {
    return (
      <Suspense fallback={<LoadingCard />}>
        <Component title={payload.props.title} description={payload.props.description} />
      </Suspense>
    )
  }

  const field = payload.props.fields?.[0]
  return (
    <Suspense fallback={<LoadingCard />}>
      <Component label={field?.label ?? 'Generated field'} placeholder={field?.placeholder} options={field?.options ?? []} />
    </Suspense>
  )
}
