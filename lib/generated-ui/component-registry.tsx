import { type ComponentType } from 'react'

export type ApprovedComponentName = 'TextInput' | 'SelectInput' | 'NumberInput' | 'DateInput' | 'StepWizard' | 'FinancialSummary'

export const componentRegistry: Record<ApprovedComponentName, ComponentType<any>> = {
  TextInput: ({ label, placeholder }: { label: string; placeholder?: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} placeholder={placeholder} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  ),
  SelectInput: ({ label, options = [] }: { label: string; options: Array<{ value: string; label: string }> }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <select aria-label={label} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  ),
  NumberInput: ({ label, placeholder }: { label: string; placeholder?: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} type="number" placeholder={placeholder} className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  ),
  DateInput: ({ label }: { label: string }) => (
    <div className="rounded-xl border border-[#dfeae7] bg-white p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">{label}</label>
      <input aria-label={label} type="date" className="w-full rounded-lg border border-[#dce9e5] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#31534d]" />
    </div>
  ),
  StepWizard: ({ steps = [] }: { steps: Array<{ id: string; title: string; fields: unknown[] }> }) => (
    <div className="space-y-4 rounded-2xl border border-[#dfeae7] bg-white p-4">
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-xl border border-[#edf2ef] bg-[#f7faf9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">Step {index + 1}</p>
          <h3 className="mt-2 text-lg font-semibold text-[#214e46]">{step.title}</h3>
        </div>
      ))}
    </div>
  ),
  FinancialSummary: ({ title, description }: { title?: string; description?: string }) => (
    <div className="rounded-2xl border border-[#dfeae7] bg-white p-5">
      <h3 className="text-lg font-semibold text-[#214e46]">{title ?? 'Financial Summary'}</h3>
      <p className="mt-2 text-sm text-[#78928b]">{description ?? 'Your form data is validated and simplified into a step-by-step view.'}</p>
    </div>
  ),
}
