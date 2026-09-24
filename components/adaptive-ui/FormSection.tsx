'use client'

import type { ReactNode } from 'react'

export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#dce9e5] bg-white p-5 shadow-[0_12px_40px_rgba(36,83,73,.05)] sm:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#234c45]">{title}</h2>
        <p className="mt-2 text-sm text-[#7e978f]">{description}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  )
}
