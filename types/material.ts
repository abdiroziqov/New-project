export interface RawMaterialStock {
  id: string
  material: string
  unit: string
  quantity: number
  reorderLevel: number
  unitCost: number
  supplier: string
  lastUpdated: string
}

export type MaterialTransactionType = 'incoming' | 'usage'

export interface RawMaterialTransaction {
  id: string
  date: string
  materialId: string
  material: string
  type: MaterialTransactionType
  quantity: number
  unit: string
  reference: string
  notes: string
  operator: string
}
