'use client'

import type { Dispatch, SetStateAction } from 'react'
import { WizardStep as FinancialWizardStep } from '@/components/financial-form/FinancialForm'
import type { FinancialFormState } from '@/types/financial-form'

export function WizardStep({
  form,
  setForm,
  onBack,
}: {
  form: FinancialFormState
  setForm: Dispatch<SetStateAction<FinancialFormState>>
  onBack: () => void
}) {
  return <FinancialWizardStep form={form} setForm={setForm} onBack={onBack} />
}
