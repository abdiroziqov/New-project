import salesSource from '~/data/mock/sales.json'
import type { SalesRecord } from '~/types/sales'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const seedSales = salesSource as SalesRecord[]

const createId = () => `s-${Math.random().toString(36).slice(2, 8)}`

export const useSales = () => {
  const sales = useState<SalesRecord[]>('data:sales', () => clone(seedSales))

  const totalSales = computed(() => sales.value.reduce((sum, record) => sum + record.totalAmount, 0))

  const addSale = (payload: Omit<SalesRecord, 'id'>) => {
    sales.value.unshift({
      ...payload,
      id: createId()
    })
  }

  const updateSale = (payload: SalesRecord) => {
    const index = sales.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      sales.value[index] = { ...payload }
    }
  }

  const removeSale = (id: string) => {
    sales.value = sales.value.filter((record) => record.id !== id)
  }

  return {
    sales,
    totalSales,
    addSale,
    updateSale,
    removeSale
  }
}
