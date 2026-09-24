'use client'

import { motion } from 'framer-motion'
import { Gauge, Loader2 } from 'lucide-react'

export function GenerationState({ status, message }: { status: 'idle' | 'started' | 'complete' | 'error'; message: string }) {
  return (
    <div className="rounded-2xl border border-[#dfeae7] bg-[#f7fbfa] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {status === 'started' ? <Loader2 className="size-4 animate-spin text-[#3a876d]" /> : <Gauge className="size-4 text-[#3a876d]" />}
          <div>
            <p className="text-sm font-semibold text-[#224d46]">Generation status</p>
            <p className="text-xs text-[#72908a]">{status}</p>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-xs font-semibold uppercase tracking-[.12em] text-[#5b8d7d]">
          {status}
        </motion.div>
      </div>
      <p className="mt-3 text-sm text-[#5e7a73]">{message}</p>
    </div>
  )
}
