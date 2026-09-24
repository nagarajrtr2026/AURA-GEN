'use client'

export function FormReview({ values }: { values: Record<string, string> }) {
  return (
    <div className="rounded-2xl border border-[#dfeae7] bg-[#f7fbfa] p-5">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6d9a8c]">Review</p>
      <div className="mt-4 space-y-3">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between border-b border-[#edf2ef] pb-2 last:border-b-0 last:pb-0">
            <span className="text-xs uppercase tracking-[.12em] text-[#7c9991]">{key}</span>
            <span className="text-sm font-medium text-[#224d46]">{value || 'Not provided'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
