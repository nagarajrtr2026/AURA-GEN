'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import type { AdaptivePhase, AdaptiveMode } from '@/types/adaptive-ui'

export function AdaptiveUI({
  phase,
  mode,
  title,
  description,
  children,
}: {
  phase: AdaptivePhase
  mode: AdaptiveMode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#dfeae7] bg-white p-5 shadow-[0_18px_50px_rgba(35,92,76,.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6d9a8c]">{mode === 'adaptive' ? 'Adaptive UI' : 'Fallback UI'}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#204c45]">{title}</h2>
          <p className="mt-2 text-sm text-[#78928b]">{description}</p>
        </div>

        <div className="rounded-full border border-[#dfeae7] bg-[#f6faf9] p-2 text-[#487a6d]">
          {phase === 'FALLBACK' ? <AlertTriangle className="size-4" /> : mode === 'adaptive' ? <Sparkles className="size-4" /> : <CheckCircle2 className="size-4" />}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </motion.section>
  )
}
