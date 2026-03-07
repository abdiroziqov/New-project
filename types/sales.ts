export type PaymentStatus = 'paid' | 'partial' | 'pending'

export interface SalesRecord {
  id: string
  date: string
  customer: string
  productType: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentStatus: PaymentStatus
  channel: 'B2B' | 'Retail' | 'Export'
}
