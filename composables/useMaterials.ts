import stocksSource from '~/data/mock/raw-material-stocks.json'
import transactionsSource from '~/data/mock/raw-material-transactions.json'
import type { RawMaterialStock, RawMaterialTransaction } from '~/types/material'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const seedStocks = stocksSource as RawMaterialStock[]
const seedTransactions = transactionsSource as RawMaterialTransaction[]

const createId = () => `t-${Math.random().toString(36).slice(2, 8)}`

const transactionDelta = (transaction: RawMaterialTransaction) =>
  transaction.type === 'incoming' ? transaction.quantity : -transaction.quantity

const applyTransaction = (
  stocks: RawMaterialStock[],
  transaction: RawMaterialTransaction,
  multiplier = 1
) => {
  const stock = stocks.find((item) => item.id === transaction.materialId)

  if (!stock) {
    return
  }

  const delta = transactionDelta(transaction) * multiplier
  stock.quantity = Math.max(0, stock.quantity + delta)
  stock.lastUpdated = transaction.date
}

export const useMaterials = () => {
  const stocks = useState<RawMaterialStock[]>('data:materials:stocks', () => clone(seedStocks))
  const transactions = useState<RawMaterialTransaction[]>(
    'data:materials:transactions',
    () => clone(seedTransactions)
  )

  const lowStockItems = computed(() => {
    return stocks.value.filter((item) => item.quantity <= item.reorderLevel)
  })

  const inventoryValue = computed(() => {
    return stocks.value.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  })

  const addTransaction = (payload: Omit<RawMaterialTransaction, 'id'>) => {
    const transaction = {
      ...payload,
      id: createId()
    }

    transactions.value.unshift(transaction)
    applyTransaction(stocks.value, transaction)
  }

  const updateTransaction = (payload: RawMaterialTransaction) => {
    const index = transactions.value.findIndex((item) => item.id === payload.id)

    if (index === -1) {
      return
    }

    const previous = transactions.value[index]
    applyTransaction(stocks.value, previous, -1)

    transactions.value[index] = { ...payload }
    applyTransaction(stocks.value, payload)
  }

  const removeTransaction = (id: string) => {
    const index = transactions.value.findIndex((item) => item.id === id)

    if (index === -1) {
      return
    }

    applyTransaction(stocks.value, transactions.value[index], -1)
    transactions.value.splice(index, 1)
  }

  return {
    stocks,
    transactions,
    lowStockItems,
    inventoryValue,
    addTransaction,
    updateTransaction,
    removeTransaction
  }
}
