export type ProductionShift = 'Morning' | 'Evening' | 'Night'
export type ProductionStatus = 'completed' | 'in_progress' | 'paused'

export interface ProductionRecord {
  id: string
  date: string
  productType: string
  batchNo: string
  shift: ProductionShift
  unitsProduced: number
  defectUnits: number
  supervisor: string
  status: ProductionStatus
}
