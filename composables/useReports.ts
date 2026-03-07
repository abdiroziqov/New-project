import activitiesSource from '~/data/mock/activities.json'
import type { ExpenseRecord } from '~/types/expense'
import type { ProductionRecord } from '~/types/production'
import type { ActivityRecord, ChartPoint } from '~/types/report'
import type { SalesRecord } from '~/types/sales'

const activitiesSeed = activitiesSource as ActivityRecord[]

const dateInRange = (value: string, start: string, end: string) => {
  if (!start && !end) {
    return true
  }

  const date = new Date(value)

  if (start && date < new Date(start)) {
    return false
  }

  if (end && date > new Date(end)) {
    return false
  }

  return true
}

const buildPointsFromMap = (map: Map<string, number>, color?: string) => {
  return Array.from(map.entries()).map<ChartPoint>(([label, value]) => ({
    label,
    value,
    color
  }))
}

export const useReports = () => {
  const { records } = useProduction()
  const { expenses } = useExpenses()
  const { sales } = useSales()
  const { inventoryValue } = useMaterials()

  const activities = useState<ActivityRecord[]>('data:activities', () => [...activitiesSeed])

  const totalProduction = computed(() => {
    return records.value.reduce((sum, item) => sum + item.unitsProduced, 0)
  })

  const totalDefects = computed(() => {
    return records.value.reduce((sum, item) => sum + item.defectUnits, 0)
  })

  const defectRate = computed(() => {
    if (!totalProduction.value) {
      return 0
    }

    return Number(((totalDefects.value / totalProduction.value) * 100).toFixed(2))
  })

  const totalSales = computed(() => {
    return sales.value.reduce((sum, item) => sum + item.totalAmount, 0)
  })

  const totalExpenses = computed(() => {
    return expenses.value.reduce((sum, item) => sum + item.amount, 0)
  })

  const netProfit = computed(() => totalSales.value - totalExpenses.value)

  const productionTrend = computed<ChartPoint[]>(() => {
    const buckets = new Map<string, number>()

    const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))

    sorted.forEach((record) => {
      const key = record.date.slice(5)
      buckets.set(key, (buckets.get(key) ?? 0) + record.unitsProduced)
    })

    return buildPointsFromMap(buckets, '#1f88ff')
  })

  const expensesByCategory = computed<ChartPoint[]>(() => {
    const buckets = new Map<string, number>()

    expenses.value.forEach((expense) => {
      buckets.set(expense.category, (buckets.get(expense.category) ?? 0) + expense.amount)
    })

    return buildPointsFromMap(buckets)
  })

  const salesByChannel = computed<ChartPoint[]>(() => {
    const buckets = new Map<string, number>()

    sales.value.forEach((sale) => {
      buckets.set(sale.channel, (buckets.get(sale.channel) ?? 0) + sale.totalAmount)
    })

    return buildPointsFromMap(buckets)
  })

  const recentActivities = computed(() => activities.value.slice(0, 6))

  const topProducts = computed(() => {
    const buckets = new Map<string, { quantity: number; revenue: number }>()

    sales.value.forEach((record) => {
      const current = buckets.get(record.productType) ?? { quantity: 0, revenue: 0 }
      current.quantity += record.quantity
      current.revenue += record.totalAmount
      buckets.set(record.productType, current)
    })

    return Array.from(buckets.entries())
      .map(([productType, metrics]) => ({ productType, ...metrics }))
      .sort((a, b) => b.revenue - a.revenue)
  })

  const reportInRange = (startDate: string, endDate: string) => {
    const production = records.value.filter((item) => dateInRange(item.date, startDate, endDate))
    const filteredExpenses = expenses.value.filter((item) => dateInRange(item.date, startDate, endDate))
    const filteredSales = sales.value.filter((item) => dateInRange(item.date, startDate, endDate))

    const productionUnits = production.reduce((sum, item) => sum + item.unitsProduced, 0)
    const defects = production.reduce((sum, item) => sum + item.defectUnits, 0)
    const expenseTotal = filteredExpenses.reduce((sum, item) => sum + item.amount, 0)
    const salesTotal = filteredSales.reduce((sum, item) => sum + item.totalAmount, 0)

    return {
      productionUnits,
      defects,
      defectRate: productionUnits ? Number(((defects / productionUnits) * 100).toFixed(2)) : 0,
      expenseTotal,
      salesTotal,
      grossProfit: salesTotal - expenseTotal,
      production,
      expenses: filteredExpenses,
      sales: filteredSales
    }
  }

  return {
    totalProduction,
    totalDefects,
    defectRate,
    totalSales,
    totalExpenses,
    netProfit,
    inventoryValue,
    productionTrend,
    expensesByCategory,
    salesByChannel,
    recentActivities,
    topProducts,
    reportInRange
  }
}
