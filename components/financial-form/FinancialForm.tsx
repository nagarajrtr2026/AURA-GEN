'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FinancialFormState } from '@/types/financial-form'

export const formSections = [
  {
    section: 'personal',
    title: 'Personal information',
    description: 'Tell us a little about yourself.',
    items: [
      ['fullName', 'Full name', 'text', 'e.g. Nagaraj M'],
      ['email', 'Email address', 'email', 'name@company.com'],
      ['phone', 'Phone number', 'tel', '+91 98765 43210'],
      ['dateOfBirth', 'Date of birth', 'date', ''],
      ['address', 'Address', 'text', 'House number and street'],
      ['city', 'City', 'text', 'e.g. Bengaluru'],
      ['state', 'State', 'text', 'e.g. Karnataka'],
      ['pincode', 'Pincode', 'text', '560001'],
    ],
  },
  {
    section: 'employment',
    title: 'Employment information',
    description: 'Help us understand your income source.',
    items: [
      ['employmentType', 'Employment type', 'select', ''],
      ['companyName', 'Company name', 'text', 'e.g. Infotact Solutions'],
      ['jobTitle', 'Job title', 'text', 'e.g. Product Designer'],
      ['yearsOfExperience', 'Years of experience', 'number', 'e.g. 5'],
      ['monthlyIncome', 'Monthly income', 'number', '₹ 0'],
    ],
  },
  {
    section: 'financial',
    title: 'Financial information',
    description: 'A snapshot of your current financial position.',
    items: [
      ['annualIncome', 'Annual income', 'number', '₹ 500000'],
      ['existingLoans', 'Existing loans', 'text', 'e.g. Home loan'],
      ['monthlyExpenses', 'Monthly expenses', 'number', '₹ 35000'],
      ['creditScore', 'Credit score', 'number', 'e.g. 760'],
      ['dependents', 'Number of dependents', 'number', 'e.g. 2'],
    ],
  },
  {
    section: 'tax',
    title: 'Tax information',
    description: 'Keep your tax details accurate and secure.',
    items: [
      ['panNumber', 'PAN number', 'text', 'ABCDE1234F'],
      ['taxResidency', 'Tax residency', 'select', ''],
      ['previousYearTaxPaid', 'Previous year tax paid', 'number', '₹ 0'],
      ['taxDeductionInfo', 'Tax deduction information', 'textarea', '80C, home loan interest, etc.'],
    ],
  },
] as const

export function getValue(form: FinancialFormState, section: string, key: string) {
  return ((form[section as keyof FinancialFormState] as Record<string, string> | undefined)?.[key] ?? '')
}

export function updateValue(
  form: FinancialFormState,
  setForm: React.Dispatch<React.SetStateAction<FinancialFormState>>,
  section: string,
  key: string,
  value: string,
) {
  setForm((current) => ({
    ...current,
    [section]: {
      ...(current[section as keyof FinancialFormState] as Record<string, string>),
      [key]: value,
    },
  }))
}

export function FieldControl({
  item,
  value,
  onChange,
  onFocus,
  onBlur,
}: {
  item: readonly [string, string, string, string]
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
}) {
  const [key, label, type, placeholder] = item

  if (type === 'select') {
    return (
      <select
        id={key}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d] outline-none transition focus:border-[#6ca897] focus:ring-4 focus:ring-[#d8eee7]"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {(key === 'employmentType' ? ['Salaried', 'Self-Employed', 'Freelance', 'Business'] : ['India', 'Non-Resident']).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'textarea') {
    return (
      <textarea
        id={key}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={3}
        className="w-full resize-none rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d] outline-none transition placeholder:text-[#a2b4af] focus:border-[#6ca897] focus:ring-4 focus:ring-[#d8eee7]"
      />
    )
  }

  return (
    <input
      id={key}
      aria-label={label}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className="w-full rounded-lg border border-[#dce9e5] bg-white px-3.5 py-3 text-sm text-[#31534d] outline-none transition placeholder:text-[#a2b4af] focus:border-[#6ca897] focus:ring-4 focus:ring-[#d8eee7]"
    />
  )
}

export function FinancialForm({
  form,
  setForm,
  onAdaptive,
  onFocusField,
  onBlurField,
}: {
  form: FinancialFormState
  setForm: React.Dispatch<React.SetStateAction<FinancialFormState>>
  onAdaptive: () => void
  onFocusField: (field: string) => void
  onBlurField: (field: string, hasError?: boolean) => void
}) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const current = formSections[sectionIndex]
  const total = formSections.reduce((sum, section) => sum + section.items.length, 0)
  const filled = formSections.reduce((sum, section) => sum + section.items.filter(([key]) => getValue(form, section.section, key)).length, 0)

  const completion = useMemo(() => Math.max(8, (filled / total) * 100), [filled, total])

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.15em] text-[#91a7a1]">Application flow</p>
        <div className="flex flex-col gap-1">
          {formSections.map((section, index) => (
            <button
              key={section.section}
              type="button"
              onClick={() => setSectionIndex(index)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${index === sectionIndex ? 'bg-[#e6f2ed] font-semibold text-[#24564d]' : 'text-[#76908a] hover:bg-[#f0f6f3]'}`}
            >
              <span className={`grid size-6 place-items-center rounded-full text-[10px] font-semibold ${index < sectionIndex ? 'bg-[#5aa18d] text-white' : index === sectionIndex ? 'border border-[#74af9f] text-[#4d897b]' : 'bg-[#edf3f0] text-[#8da29d]'}`}>
                {index < sectionIndex ? <Check className="size-3" /> : index + 1}
              </span>
              {section.title.replace(' information', '')}
            </button>
          ))}

          <div className="mt-5 rounded-xl border border-[#dcebe6] bg-[#f7fbf9] p-3">
            <p className="text-xs font-semibold text-[#42675f]">
              {filled} of {total} completed
            </p>
            <div className="mt-2 h-1 rounded-full bg-[#e3eeea]">
              <div className="h-full rounded-full bg-[#5a9e89]" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>
      </aside>

      <section className="rounded-2xl border border-[#dce9e5] bg-white p-5 shadow-[0_12px_40px_rgba(36,83,73,.05)] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfeae7] bg-[#f6faf9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#57857a]">
              {String(sectionIndex + 1).padStart(2, '0')} / 04
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#234c45]">{current.title}</h2>
            <p className="mt-2 text-sm text-[#7e978f]">{current.description}</p>
          </div>

          <button
            type="button"
            onClick={onAdaptive}
            className="hidden rounded-lg border border-[#d8e8e2] bg-[#f7faf9] px-3 py-2 text-xs font-semibold text-[#50776d] md:inline-flex"
          >
            <Sparkles className="mr-2 size-3.5" />
            Simplify flow
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {current.items.map(([key, label, type, placeholder]) => {
            const value = getValue(form, current.section, key)

            return (
              <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                <label htmlFor={key} className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[#7c9991]">
                  {label}
                </label>
                <FieldControl
                  item={[key, label, type, placeholder]}
                  value={value}
                  onChange={(nextValue) => updateValue(form, setForm, current.section, key, nextValue)}
                  onFocus={() => onFocusField(key)}
                  onBlur={() => onBlurField(key, false)}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#edf2ef] pt-5">
          <button
            type="button"
            onClick={() => setSectionIndex((currentIndex) => Math.max(0, currentIndex - 1))}
            className="rounded-lg border border-[#d9e8e3] bg-white px-4 py-2 text-sm font-medium text-[#52766f]"
            disabled={sectionIndex === 0}
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => setSectionIndex((currentIndex) => Math.min(formSections.length - 1, currentIndex + 1))}
            className="rounded-lg bg-[#214d46] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#214d46]/15"
          >
            {sectionIndex === formSections.length - 1 ? 'Review' : 'Continue'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function WizardStep({
  form,
  setForm,
  onBack,
}: {
  form: FinancialFormState
  setForm: React.Dispatch<React.SetStateAction<FinancialFormState>>
  onBack: () => void
}) {
  const [step, setStep] = useState(0)
  const wizardSteps = [
    { key: 'fullName', question: 'What is your full name?', section: 'personal', type: 'text', placeholder: 'Nagaraj M' },
    { key: 'employmentType', question: 'How do you earn your income?', section: 'employment', type: 'select', placeholder: 'Select employment type' },
    { key: 'annualIncome', question: 'What is your annual income?', section: 'financial', type: 'number', placeholder: '₹ 500000' },
    { key: 'monthlyExpenses', question: 'What are your monthly expenses?', section: 'financial', type: 'number', placeholder: '₹ 35000' },
    { key: 'panNumber', question: 'What is your PAN number?', section: 'tax', type: 'text', placeholder: 'ABCDE1234F' },
  ] as const

  const current = wizardSteps[step]
  const value = getValue(form, current.section, current.key)

  const changeValue = (nextValue: string) => updateValue(form, setForm, current.section, current.key, nextValue)

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#cfe4dc] bg-white p-6 shadow-[0_18px_70px_rgba(37,94,78,.1)] sm:p-10">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfeae7] bg-[#f6faf9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#57857a]">
          <Sparkles className="size-3" />
          Adaptive UI active
        </span>
        <span className="text-xs font-semibold text-[#88a09a]">Step {step + 1} of {wizardSteps.length}</span>
      </div>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#e6f1ed]">
        <motion.div animate={{ width: `${((step + 1) / wizardSteps.length) * 100}%` }} className="h-full rounded-full bg-[#5c9e89]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.22 }}
          className="py-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#72a194]">A simpler way forward</p>
          <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-[#214e46] sm:text-4xl">{current.question}</h2>
          <p className="mt-3 text-sm text-[#8ba19b]">Your information stays safe while AuraGen adapts the experience.</p>

          <div className="mt-9">
            {current.type === 'select' ? (
              <select
                autoFocus
                aria-label={current.question}
                value={value}
                onChange={(event) => changeValue(event.target.value)}
                className="w-full rounded-xl border border-[#b9d8cd] bg-[#f8fcfa] px-4 py-4 text-base text-[#31564d] outline-none focus:ring-4 focus:ring-[#d9eee7]"
              >
                <option value="">{current.placeholder}</option>
                {['Salaried', 'Self-Employed', 'Freelance', 'Business'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                autoFocus
                aria-label={current.question}
                value={value}
                onChange={(event) => changeValue(event.target.value)}
                placeholder={current.placeholder}
                type={current.type}
                className="w-full rounded-xl border border-[#b9d8cd] bg-[#f8fcfa] px-4 py-4 text-base text-[#31564d] outline-none focus:ring-4 focus:ring-[#d9eee7]"
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-[#edf2ef] pt-5">
        <button type="button" onClick={onBack} className="rounded-lg border border-[#d8e8e2] bg-white px-4 py-2 text-sm font-medium text-[#50776d]">
          Back to form
        </button>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="rounded-lg border border-[#d9e8e3] bg-white px-4 py-2 text-sm font-medium text-[#52766f] disabled:cursor-not-allowed disabled:opacity-50">
            Previous
          </button>
          <button type="button" onClick={() => setStep((value) => Math.min(wizardSteps.length - 1, value + 1))} className="rounded-lg bg-[#214d46] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#214d46]/15">
            {step === wizardSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
