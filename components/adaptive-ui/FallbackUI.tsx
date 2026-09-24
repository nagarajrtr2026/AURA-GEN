'use client'

import { AlertTriangle } from 'lucide-react'

export function FallbackUI({ message, onContinue, onRetry }: { message: string; onContinue: () => void; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#f1d6d6] bg-[#fff7f7] p-5 shadow-[0_16px_40px_rgba(112,69,69,.06)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-white text-[#bf6666]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-base font-semibold text-[#5d3636]">Unable to adapt the interface right now.</p>
          <p className="mt-2 text-sm text-[#7f5050]">{message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={onContinue} className="rounded-lg bg-[#214d46] px-4 py-2.5 text-sm font-semibold text-white">
              Continue with original form
            </button>
            <button type="button" onClick={onRetry} className="rounded-lg border border-[#e0c8c8] bg-white px-4 py-2.5 text-sm font-semibold text-[#6d4d4d]">
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
