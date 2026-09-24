'use client'

import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionStatus({ connected, mode }: { connected: boolean; mode: 'mock' | 'real' }) {
  return (
    <div className="rounded-2xl border border-[#dce9e5] bg-white p-4 shadow-[0_12px_30px_rgba(28,57,52,.04)]">
      <p className="text-xs text-[#86a19a]">Connection</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#244e46]">
          {connected ? <Wifi className="size-4 text-[#4d9a84]" /> : <WifiOff className="size-4 text-[#bf6666]" />}
          {connected ? 'Connected' : 'Offline'}
        </span>
        <span className="rounded-full border border-[#dfeae7] bg-[#f6faf9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#5b8d7d]">{mode}</span>
      </div>
    </div>
  )
}
