export interface PersonalInformation {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  city: string
  state: string
  pincode: string
}

export interface EmploymentInformation {
  employmentType: 'Salaried' | 'Self-Employed' | 'Freelance' | 'Business' | ''
  companyName: string
  jobTitle: string
  yearsOfExperience: string
  monthlyIncome: string
}

export interface FinancialInformation {
  annualIncome: string
  existingLoans: string
  monthlyExpenses: string
  creditScore: string
  dependents: string
}

export interface TaxInformation {
  panNumber: string
  taxResidency: 'India' | 'Non-Resident' | ''
  previousYearTaxPaid: string
  taxDeductionInfo: string
}

export interface FinancialFormState {
  personal: Partial<PersonalInformation>
  employment: Partial<EmploymentInformation>
  financial: Partial<FinancialInformation>
  tax: Partial<TaxInformation>
  currentSection: 'personal' | 'employment' | 'financial' | 'tax' | 'review'
  isSubmitted: boolean
}

export interface FormErrors {
  [key: string]: string
}
