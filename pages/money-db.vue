<script setup lang="ts">
import type { CashInRecord, ExpenseCategory, FactoryName, OperationalExpense, PaymentMethod } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard',
  middleware: 'role',
  roles: ['admin']
})

type MoneyEntryType = 'kirim' | 'chiqim'

type MoneyDbRow = Record<string, unknown> & {
  id: string
  entryType: MoneyEntryType
  date: string
  typeLabel: string
  category: string
  description: string
  paymentMethod: PaymentMethod
  amount: number
  notes: string
  source: CashInRecord | OperationalExpense
}

const {
  cashInRecords,
  expenses,
  expenseCategories,
  paymentMethods,
  factoryOptions,
  addCashInRecord,
  updateCashInRecord,
  removeCashInRecord,
  addExpense,
  updateExpense,
  removeExpense
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom } = useFormatting()
const { setCurrentMonth, setRecentDays } = useDateRangePresets()
const { t } = useUiLocale()

const todayIso = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''

  return `${year}-${month}-${day}`
}

const createCashInForm = () => ({
  date: todayIso(),
  amount: 0,
  paymentMethod: 'Naqd' as PaymentMethod,
  description: '',
  notes: ''
})

const createExpenseForm = (): Omit<OperationalExpense, 'id'> => ({
  date: todayIso(),
  factory: '',
  category: 'Boshqa' as ExpenseCategory,
  description: '',
  amount: 0,
  paymentMethod: 'Naqd' as PaymentMethod,
  notes: ''
})

const filters = reactive({
  startDate: '',
  endDate: '',
  entryType: '',
  paymentMethod: ''
})
const cashInForm = reactive(createCashInForm())
const expenseForm = reactive(createExpenseForm())
const editForm = reactive({
  id: '',
  entryType: 'kirim' as MoneyEntryType,
  date: todayIso(),
  factory: '' as FactoryName | '',
  category: 'Boshqa' as ExpenseCategory,
  amount: 0,
  paymentMethod: 'Naqd' as PaymentMethod,
  description: '',
  notes: '',
  createdAt: ''
})

const formError = ref('')
const editError = ref('')
const editModalOpen = ref(false)
const deleteDialogOpen = ref(false)
const selectedRow = ref<MoneyDbRow | null>(null)

const roundAmount = (value: number) => Number(value.toFixed(2))

const paymentMethodOptions = computed(() => paymentMethods.map((method) => ({ label: method, value: method })))
const filterPaymentMethodOptions = computed(() => [{ label: 'Hammasi', value: '' }, ...paymentMethodOptions.value])
const entryTypeOptions = [
  { label: 'Hammasi', value: '' },
  { label: 'Kirim', value: 'kirim' },
  { label: 'Chiqim', value: 'chiqim' }
]
const expenseCategoryOptions = computed(() =>
  expenseCategories
    .filter((category) => category !== "Ta'minotchi to'lovi")
    .map((category) => ({ label: category, value: category }))
)
const expenseFactoryOptions = computed(() => [{ label: 'Umumiy', value: '' }, ...factoryOptions.value])

const columns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'typeLabel', label: 'Tur' },
  { key: 'category', label: 'Kategoriya' },
  { key: 'description', label: 'Tavsif' },
  { key: 'paymentMethod', label: 'To`lov turi' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const allRows = computed<MoneyDbRow[]>(() => [
  ...cashInRecords.value.map((record) => ({
    id: record.id,
    entryType: 'kirim' as MoneyEntryType,
    date: record.date,
    typeLabel: 'Kirim',
    category: 'Pul kirimi',
    description: record.description || 'Pul kirimi',
    paymentMethod: record.paymentMethod,
    amount: record.amount,
    notes: record.notes,
    source: record
  })),
  ...expenses.value.map((record) => ({
    id: record.id,
    entryType: 'chiqim' as MoneyEntryType,
    date: record.date,
    typeLabel: 'Chiqim',
    category: record.category,
    description: record.description || record.category,
    paymentMethod: record.paymentMethod,
    amount: record.amount,
    notes: record.notes,
    source: record
  }))
])

const filteredRows = computed(() =>
  allRows.value
    .filter((row) => {
      if (filters.startDate && row.date < filters.startDate) {
        return false
      }

      if (filters.endDate && row.date > filters.endDate) {
        return false
      }

      if (filters.entryType && row.entryType !== filters.entryType) {
        return false
      }

      if (filters.paymentMethod && row.paymentMethod !== filters.paymentMethod) {
        return false
      }

      return true
    })
    .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id))
)

const summary = computed(() => {
  const incoming = roundAmount(
    filteredRows.value
      .filter((row) => row.entryType === 'kirim')
      .reduce((sum, row) => sum + row.amount, 0)
  )
  const outgoing = roundAmount(
    filteredRows.value
      .filter((row) => row.entryType === 'chiqim')
      .reduce((sum, row) => sum + row.amount, 0)
  )

  return {
    incoming,
    outgoing,
    balance: roundAmount(incoming - outgoing),
    count: filteredRows.value.length
  }
})

const resetCashInForm = () => {
  Object.assign(cashInForm, createCashInForm())
  formError.value = ''
}

const resetExpenseForm = () => {
  Object.assign(expenseForm, createExpenseForm())
  formError.value = ''
}

const saveCashIn = () => {
  if (!isAdmin.value) {
    return
  }

  const amount = Number(cashInForm.amount)

  if (!cashInForm.date || amount <= 0) {
    formError.value = 'Pul kirimi uchun sana va summani to`g`ri kiriting.'
    return
  }

  addCashInRecord({
    date: cashInForm.date,
    amount,
    paymentMethod: cashInForm.paymentMethod,
    description: cashInForm.description.trim() || 'Pul kirimi',
    notes: cashInForm.notes.trim()
  })
  resetCashInForm()
}

const saveExpense = () => {
  if (!isAdmin.value) {
    return
  }

  const amount = Number(expenseForm.amount)

  if (!expenseForm.date || amount <= 0) {
    formError.value = 'Harajat uchun sana va summani to`g`ri kiriting.'
    return
  }

  addExpense({
    date: expenseForm.date,
    factory: expenseForm.factory,
    category: expenseForm.category,
    description: expenseForm.description.trim() || expenseForm.category,
    amount,
    paymentMethod: expenseForm.paymentMethod,
    notes: expenseForm.notes.trim()
  })
  resetExpenseForm()
}

const openEditModal = (row: Record<string, unknown>) => {
  const entry = row as MoneyDbRow
  const source = entry.source as CashInRecord | OperationalExpense

  selectedRow.value = entry
  Object.assign(editForm, {
    id: entry.id,
    entryType: entry.entryType,
    date: entry.date,
    factory: entry.entryType === 'chiqim' ? (source as OperationalExpense).factory : '',
    category: entry.entryType === 'chiqim' ? (source as OperationalExpense).category : 'Boshqa',
    amount: entry.amount,
    paymentMethod: entry.paymentMethod,
    description: entry.description,
    notes: entry.notes,
    createdAt: entry.entryType === 'kirim' ? (source as CashInRecord).createdAt : ''
  })
  editError.value = ''
  editModalOpen.value = true
}

const closeEditModal = () => {
  selectedRow.value = null
  editError.value = ''
  editModalOpen.value = false
}

const saveEdit = () => {
  if (!isAdmin.value) {
    return
  }

  const amount = Number(editForm.amount)

  if (!editForm.date || amount <= 0) {
    editError.value = 'Sana va summa to`g`ri bo`lishi kerak.'
    return
  }

  if (editForm.entryType === 'kirim') {
    updateCashInRecord({
      id: editForm.id,
      date: editForm.date,
      amount,
      paymentMethod: editForm.paymentMethod,
      description: editForm.description.trim() || 'Pul kirimi',
      notes: editForm.notes.trim(),
      createdAt: editForm.createdAt
    })
  } else {
    updateExpense({
      id: editForm.id,
      date: editForm.date,
      factory: editForm.factory,
      category: editForm.category,
      description: editForm.description.trim() || editForm.category,
      amount,
      paymentMethod: editForm.paymentMethod,
      notes: editForm.notes.trim()
    })
  }

  closeEditModal()
}

const askDelete = (row: Record<string, unknown>) => {
  selectedRow.value = row as MoneyDbRow
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value || !selectedRow.value) {
    return
  }

  if (selectedRow.value.entryType === 'kirim') {
    removeCashInRecord(selectedRow.value.id)
  } else {
    removeExpense(selectedRow.value.id)
  }

  selectedRow.value = null
  deleteDialogOpen.value = false
}

const closeDeleteDialog = () => {
  selectedRow.value = null
  deleteDialogOpen.value = false
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.entryType = ''
  filters.paymentMethod = ''
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Pul DB') }}</h2>
      <p class="page-subtitle">{{ t('Kelgan pul va umumiy harajatlar bir joyda yuritiladi.') }}</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard title="Balans" :value="formatSom(summary.balance)" subtitle="kirim minus chiqim" />
    <StatCard title="Kelgan pul" :value="formatSom(summary.incoming)" subtitle="filtrlangan kirim" />
    <StatCard title="Chiqim" :value="formatSom(summary.outgoing)" subtitle="filtrlangan harajat" />
    <StatCard title="Yozuvlar" :value="summary.count" subtitle="jami yozuv" />
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Pul kirimi') }}</h3>
        <p class="text-xs text-slate-500">{{ t('Klient qarziga tegmaydigan umumiy kelgan pullar.') }}</p>
      </header>

      <div class="grid gap-3 md:grid-cols-2">
        <AppInput v-model="cashInForm.date" type="date" label="Sana" :invalid="formError !== '' && !cashInForm.date" />
        <AppInput v-model="cashInForm.amount" type="number" min="0" step="0.01" label="Summa" :invalid="formError !== '' && Number(cashInForm.amount) <= 0" />
        <AppSelect v-model="cashInForm.paymentMethod" label="To`lov turi" :options="paymentMethodOptions" />
        <AppInput v-model="cashInForm.description" label="Tavsif" placeholder="Masalan, kassaga kirim" />
        <AppInput v-model="cashInForm.notes" class="md:col-span-2" label="Izoh" placeholder="Qo'shimcha izoh" />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetCashInForm">{{ t('Tozalash') }}</button>
        <button type="button" class="btn-primary" @click="saveCashIn">{{ t("Qo'shish") }}</button>
      </div>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Harajat') }}</h3>
        <p class="text-xs text-slate-500">{{ t('Bozorlik, soliq, kredit va boshqa chiqimlar.') }}</p>
      </header>

      <div class="grid gap-3 md:grid-cols-2">
        <AppInput v-model="expenseForm.date" type="date" label="Sana" :invalid="formError !== '' && !expenseForm.date" />
        <AppSelect v-model="expenseForm.category" label="Kategoriya" :options="expenseCategoryOptions" />
        <AppSelect v-model="expenseForm.factory" label="Zavod" :options="expenseFactoryOptions" />
        <AppInput v-model="expenseForm.amount" type="number" min="0" step="0.01" label="Summa" :invalid="formError !== '' && Number(expenseForm.amount) <= 0" />
        <AppSelect v-model="expenseForm.paymentMethod" label="To`lov turi" :options="paymentMethodOptions" />
        <AppInput v-model="expenseForm.description" label="Tavsif" placeholder="Masalan, bozorlik" />
        <AppInput v-model="expenseForm.notes" class="md:col-span-2" label="Izoh" placeholder="Qo'shimcha izoh" />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetExpenseForm">{{ t('Tozalash') }}</button>
        <button type="button" class="btn-primary" @click="saveExpense">{{ t("Qo'shish") }}</button>
      </div>
    </article>
  </section>

  <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
    {{ formError }}
  </p>

  <section class="panel p-4">
    <div class="grid gap-3 border-b border-slate-100 pb-4 md:grid-cols-5">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.entryType" label="Tur" :options="entryTypeOptions" />
      <AppSelect v-model="filters.paymentMethod" label="To`lov turi" :options="filterPaymentMethodOptions" />
      <div class="flex items-end gap-2">
        <button type="button" class="btn-secondary w-full !px-3" @click="setCurrentMonth(filters)">{{ t('Joriy oy') }}</button>
        <button type="button" class="btn-secondary w-full !px-3" @click="clearFilters">{{ t('Hammasi') }}</button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">{{ t('Oxirgi 30 kun') }}</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">{{ t('Oxirgi 7 kun') }}</button>
    </div>

    <div class="mt-4">
      <AppTable :columns="columns" :rows="filteredRows" empty-text="Pul DB yozuvlari topilmadi.">
        <template #cell-typeLabel="{ row, value }">
          <span :class="['font-semibold', row.entryType === 'kirim' ? 'text-emerald-700' : 'text-rose-700']">
            {{ t(String(value)) }}
          </span>
        </template>

        <template #cell-amount="{ row, value }">
          <span :class="['font-semibold', row.entryType === 'kirim' ? 'text-emerald-700' : 'text-rose-700']">
            {{ formatSom(Number(value)) }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openEditModal(row)">
              {{ t('Tahrirlash') }}
            </button>
            <button type="button" class="btn-danger !px-3 !py-1.5 text-xs" @click="askDelete(row)">
              {{ t("O'chirish") }}
            </button>
          </div>
        </template>
      </AppTable>
    </div>
  </section>

  <AppModal :open="editModalOpen" title="Yozuvni tahrirlash" size="md" @close="closeEditModal">
    <div class="grid gap-3 md:grid-cols-2">
      <AppInput v-model="editForm.date" type="date" label="Sana" :invalid="editError !== '' && !editForm.date" />
      <AppInput v-model="editForm.amount" type="number" min="0" step="0.01" label="Summa" :invalid="editError !== '' && Number(editForm.amount) <= 0" />
      <AppSelect
        v-if="editForm.entryType === 'chiqim'"
        v-model="editForm.category"
        label="Kategoriya"
        :options="expenseCategoryOptions"
      />
      <AppSelect
        v-if="editForm.entryType === 'chiqim'"
        v-model="editForm.factory"
        label="Zavod"
        :options="expenseFactoryOptions"
      />
      <AppSelect v-model="editForm.paymentMethod" label="To`lov turi" :options="paymentMethodOptions" />
      <AppInput v-model="editForm.description" label="Tavsif" />
      <AppInput v-model="editForm.notes" class="md:col-span-2" label="Izoh" />
    </div>

    <p v-if="editError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ editError }}
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="closeEditModal">{{ t('Bekor qilish') }}</button>
        <button type="button" class="btn-primary" @click="saveEdit">{{ t('Saqlash') }}</button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Yozuvni o'chirish"
    message="Tanlangan yozuvni o'chirasizmi?"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDeleteDialog"
  />
</template>
