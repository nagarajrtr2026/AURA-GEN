'use client'

import type { CognitiveLoadState } from '@/types/telemetry'

export function CognitiveLoadCard({ score, level, triggerStatus }: CognitiveLoadState) {
  return (
    <div className="rounded-2xl border border-[#dce9e5] bg-white p-5 shadow-[0_12px_30px_rgba(28,57,52,.04)]">
      <p className="text-xs text-[#86a19a]">Cognitive load</p>
      <p className="mt-2 text-3xl font-semibold text-[#244e46]">
        {score}
        <span className="text-sm text-[#9aafaa]"> / 100</span>
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-[#edf3f0]">
        <div className="h-full rounded-full bg-[#5b9d89]" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-xs font-semibold text-[#4a8d7b]">
        {level} · {triggerStatus}
      </p>
    </div>
  )
}
