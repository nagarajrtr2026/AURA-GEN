'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

export function StepWizard({
  steps,
  title,
  description,
}: {
  steps: Array<{ id: string; title: string; fields: Array<{ name: string; label: string; type?: string; placeholder?: string }> }>
  title?: string
  description?: string
}) {
  const [step, setStep] = useState(0)
  const current = steps[step]

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#cfe4dc] bg-white p-6 shadow-[0_18px_70px_rgba(37,94,78,.1)] sm:p-10">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfeae7] bg-[#f6faf9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#57857a]">
          <Sparkles className="size-3" />
          Adaptive UI active
        </span>
        <span className="text-xs font-semibold text-[#88a09a]">Step {step + 1} of {steps.length}</span>
      </div>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#e6f1ed]">
        <motion.div animate={{ width: `${((step + 1) / steps.length) * 100}%` }} className="h-full rounded-full bg-[#5c9e89]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current.id} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.22 }} className="py-16">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#72a194]">{title ?? 'A simpler way forward'}</p>
          <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-[#214e46] sm:text-4xl">{current.title}</h2>
          <p className="mt-3 text-sm text-[#8ba19b]">{description ?? 'Your information stays safe while AuraGen adapts the experience.'}</p>

          <div className="mt-9 space-y-3">
            {current.fields.map((field) => (
              <div key={field.name} className="rounded-xl border border-[#dfeae7] bg-[#f8fbfa] p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{field.label}</label>
                <input aria-label={field.label} type={field.type ?? 'text'} placeholder={field.placeholder} className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d] outline-none transition placeholder:text-[#a2b4af] focus:border-[#6ca897] focus:ring-4 focus:ring-[#d8eee7]" />
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-[#edf2ef] pt-5">
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="rounded-lg border border-[#d9e8e3] bg-white px-4 py-2 text-sm font-medium text-[#52766f] disabled:cursor-not-allowed disabled:opacity-50">
          Previous
        </button>

        <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="rounded-lg bg-[#214d46] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#214d46]/15">
          {step === steps.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}
