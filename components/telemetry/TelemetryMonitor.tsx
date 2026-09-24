'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, Gauge, MousePointer2, Timer, X } from 'lucide-react'
import type { useTelemetry } from '@/hooks/useTelemetry'

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Timer }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf2ef] py-3 last:border-0">
      <span className="flex items-center gap-2 text-xs text-[#76908a]">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-xs font-semibold text-[#2b4e48]">{value}</span>
    </div>
  )
}

export function TelemetryMonitor({
  score,
  telemetry,
  onSimulate,
  expanded,
  setExpanded,
}: {
  score: number
  telemetry: ReturnType<typeof useTelemetry>['telemetry']
  onSimulate: () => void
  expanded: boolean
  setExpanded: (value: boolean) => void
}) {
  const tone = score > 71 ? 'amber' : 'green'

  return (
    <motion.aside layout className="fixed bottom-5 right-5 z-40 w-[286px] overflow-hidden rounded-2xl border border-[#d7e8e1] bg-white/95 shadow-[0_18px_60px_rgba(33,73,65,.14)] backdrop-blur-xl">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between border-b border-[#edf2ef] px-4 py-3.5 text-left">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#345b53]">
          <Gauge className="size-4 text-[#4e9886]" />
          Cognitive load monitor
        </span>
        {expanded ? <ChevronDown className="size-4 text-[#89a19b]" /> : <ChevronLeft className="size-4 text-[#89a19b]" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-[#86a09a]">Interaction friction</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-[#214b44]">
                    {score}
                    <span className="text-sm font-normal text-[#94aaa4]"> / 100</span>
                  </p>
                </div>

                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${tone === 'amber' ? 'border-[#f0dfb8] bg-[#fff8e7] text-[#a06d1f]' : 'border-[#cfe6de] bg-[#edf8f3] text-[#2f8169]'}`}>
                  {score > 71 ? 'High friction' : score > 41 ? 'Moderate' : 'Low friction'}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf3f0]">
                <motion.div animate={{ width: `${score}%` }} className={`h-full rounded-full ${score > 71 ? 'bg-[#d69a3b]' : 'bg-[#4d9a84]'}`} />
              </div>

              <div className="mt-3">
                <Metric label="Cursor velocity" value={`${telemetry.cursorVelocity} px/s`} icon={MousePointer2} />
                <Metric label="Hesitation" value={`${Math.round((telemetry.hesitationTime / 100) * 10) / 10}s`} icon={Timer} />
                <Metric label="Click errors" value={`${telemetry.fieldErrorCount}`} icon={X} />
              </div>

              <button type="button" onClick={onSimulate} className="mt-4 w-full rounded-xl bg-[#214d46] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-[#214d46]/15">
                Simulate frustration
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
