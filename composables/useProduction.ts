import recordsSource from '~/data/mock/production-records.json'
import type { ProductionRecord } from '~/types/production'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const seedRecords = recordsSource as ProductionRecord[]

const createId = () => `p-${Math.random().toString(36).slice(2, 8)}`

export const calculateEfficiency = (record: Pick<ProductionRecord, 'unitsProduced' | 'defectUnits'>) => {
  if (!record.unitsProduced) {
    return 0
  }

  return Number((((record.unitsProduced - record.defectUnits) / record.unitsProduced) * 100).toFixed(2))
}

export const useProduction = () => {
  const records = useState<ProductionRecord[]>('data:production', () => clone(seedRecords))

  const productTypes = computed(() => {
    return [...new Set(records.value.map((record) => record.productType))].sort()
  })

  const addRecord = (payload: Omit<ProductionRecord, 'id'>) => {
    records.value.unshift({
      ...payload,
      id: createId()
    })
  }

  const updateRecord = (payload: ProductionRecord) => {
    const index = records.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      records.value[index] = { ...payload }
    }
  }

  const removeRecord = (id: string) => {
    records.value = records.value.filter((record) => record.id !== id)
  }

  return {
    records,
    productTypes,
    addRecord,
    updateRecord,
    removeRecord
  }
}
