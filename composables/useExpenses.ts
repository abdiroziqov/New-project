import expensesSource from '~/data/mock/expenses.json'
import type { ExpenseCategory, ExpenseRecord } from '~/types/expense'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const seedExpenses = expensesSource as ExpenseRecord[]

const createId = () => `e-${Math.random().toString(36).slice(2, 8)}`

export const legacyExpenseCategories: ExpenseCategory[] = [
  'Maintenance',
  'Utilities',
  'Payroll',
  'Logistics',
  'Procurement',
  'Compliance',
  'Other'
]

export const useExpenses = () => {
  const expenses = useState<ExpenseRecord[]>('data:expenses', () => clone(seedExpenses))

  const totalExpenses = computed(() => {
    return expenses.value.reduce((sum, item) => sum + item.amount, 0)
  })

  const addExpense = (payload: Omit<ExpenseRecord, 'id'>) => {
    expenses.value.unshift({
      ...payload,
      id: createId()
    })
  }

  const updateExpense = (payload: ExpenseRecord) => {
    const index = expenses.value.findIndex((expense) => expense.id === payload.id)

    if (index !== -1) {
      expenses.value[index] = { ...payload }
    }
  }

  const removeExpense = (id: string) => {
    expenses.value = expenses.value.filter((expense) => expense.id !== id)
  }

  return {
    expenses,
    totalExpenses,
    addExpense,
    updateExpense,
    removeExpense
  }
}
