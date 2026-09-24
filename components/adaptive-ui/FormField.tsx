'use client'

export function FormField({
  label,
  htmlFor,
  value,
  type = 'text',
  placeholder,
  onChange,
  onFocus,
  onBlur,
  rows,
}: {
  label: string
  htmlFor: string
  value: string
  type?: string
  placeholder?: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  rows?: number
}) {
  const commonClassName = 'w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d] outline-none transition placeholder:text-[#a2b4af] focus:border-[#6ca897] focus:ring-4 focus:ring-[#d8eee7]'

  if (type === 'textarea') {
    return (
      <div className="md:col-span-2">
        <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
        <textarea id={htmlFor} aria-label={label} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onBlur={onBlur} rows={rows ?? 3} className={commonClassName + ' resize-none'} />
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input id={htmlFor} aria-label={label} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onBlur={onBlur} className={commonClassName} />
    </div>
  )
}
