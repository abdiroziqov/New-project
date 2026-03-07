export type ExpenseCategory =
  | 'Maintenance'
  | 'Utilities'
  | 'Payroll'
  | 'Logistics'
  | 'Procurement'
  | 'Compliance'
  | 'Other'

export type ExpenseStatus = 'approved' | 'pending' | 'rejected'

export interface ExpenseRecord {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  vendor: string
  amount: number
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Card'
  status: ExpenseStatus
}
