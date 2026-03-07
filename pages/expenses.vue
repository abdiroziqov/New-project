<script setup lang="ts">
import type { CostProfile, ExpenseCategory, OperationalExpense, PaymentMethod } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const {
  expenses,
  expenseCategories,
  paymentMethods,
  defaultCosts,
  factoryOptions,
  latestDate,
  addExpense,
  updateExpense,
  removeExpense,
  updateDefaultCosts,
  getDefaultSalePricePerTon
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()

const createExpenseFormState = (): Omit<OperationalExpense, 'id'> => ({
  date: latestDate.value,
  factory: 'Oybek',
  category: 'Ishchi',
  description: '',
  amount: 0,
  paymentMethod: 'Naqd',
  notes: ''
})

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: '',
  category: ''
})

const expenseForm = reactive<Omit<OperationalExpense, 'id'>>(createExpenseFormState())
const costForm = reactive<CostProfile>({
  ...defaultCosts.value
})

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const deleteDialogOpen = ref(false)
const selectedExpense = ref<OperationalExpense | null>(null)

const columns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'category', label: 'Kategoriya' },
  { key: 'description', label: 'Tavsif' },
  { key: 'paymentMethod', label: 'To`lov turi' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const filteredExpenses = computed(() =>
  expenses.value
    .filter((record) => {
      if (filters.startDate && record.date < filters.startDate) {
        return false
      }

      if (filters.endDate && record.date > filters.endDate) {
        return false
      }

      if (filters.factory && record.factory !== filters.factory) {
        return false
      }

      if (filters.category && record.category !== filters.category) {
        return false
      }

      return true
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

const expensesSummary = computed(() => {
  const total = filteredExpenses.value.reduce((sum, record) => sum + record.amount, 0)
  const categories = new Set(filteredExpenses.value.map((record) => record.category))

  return {
    total,
    count: filteredExpenses.value.length,
    categories: categories.size
  }
})

const sandBaggedCostPerTon = computed(() => getCostPerTon(costForm, 'Qum'))
const sandBulkCostPerTon = computed(() => getBulkCostPerTon(costForm, 'Qum'))
const chalkBaggedCostPerTon = computed(() => getCostPerTon(costForm, 'Mel'))
const sandSalePricePerTon = computed(() => getDefaultSalePricePerTon(costForm, 'Qum'))
const chalkSalePricePerTon = computed(() => getDefaultSalePricePerTon(costForm, 'Mel'))
const tableRows = computed<Record<string, unknown>[]>(() => [...filteredExpenses.value])

const resetExpenseForm = () => {
  Object.assign(expenseForm, createExpenseFormState())
  editingId.value = null
  formError.value = ''
}

const openCreateModal = () => {
  if (!isAdmin.value) {
    return
  }

  resetExpenseForm()
  modalOpen.value = true
}

const openEditModal = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  const record = row as OperationalExpense

  Object.assign(expenseForm, {
    date: record.date,
    factory: record.factory,
    category: record.category,
    description: record.description,
    amount: record.amount,
    paymentMethod: record.paymentMethod,
    notes: record.notes
  })

  editingId.value = record.id
  formError.value = ''
  modalOpen.value = true
}

const saveExpense = () => {
  if (!isAdmin.value) {
    return
  }

  const payload: Omit<OperationalExpense, 'id'> = {
    date: expenseForm.date,
    factory: expenseForm.factory,
    category: expenseForm.category as ExpenseCategory,
    description: expenseForm.description.trim(),
    amount: Number(expenseForm.amount),
    paymentMethod: expenseForm.paymentMethod as PaymentMethod,
    notes: expenseForm.notes.trim()
  }

  if (!payload.date || !payload.factory || !payload.description) {
    formError.value = 'Sana, zavod va tavsifni kiriting.'
    return
  }

  if (payload.amount <= 0) {
    formError.value = 'Chiqim summasi 0 dan katta bo`lishi kerak.'
    return
  }

  if (editingId.value) {
    updateExpense({
      id: editingId.value,
      ...payload
    })
  } else {
    addExpense(payload)
  }

  modalOpen.value = false
  resetExpenseForm()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedExpense.value = row as OperationalExpense
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value) {
    return
  }

  if (selectedExpense.value) {
    removeExpense(selectedExpense.value.id)
  }

  selectedExpense.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedExpense.value = null
  deleteDialogOpen.value = false
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.factory = ''
  filters.category = ''
}

const saveDefaultCosts = () => {
  if (!isAdmin.value) {
    return
  }

  updateDefaultCosts({
    sandPricePerTon: Number(costForm.sandPricePerTon),
    chalkPricePerTon: Number(costForm.chalkPricePerTon),
    sandWorkerCostPerTon: Number(costForm.sandWorkerCostPerTon),
    chalkWorkerCostPerTon: Number(costForm.chalkWorkerCostPerTon),
    loadingCostPerTon: Number(costForm.loadingCostPerTon),
    foodCostPerTon: Number(costForm.foodCostPerTon),
    supervisorCostPerTon: Number(costForm.supervisorCostPerTon),
    electricityCostPerTon: Number(costForm.electricityCostPerTon),
    stoneCostPerTon: Number(costForm.stoneCostPerTon),
    bagCostPerTon: Number(costForm.bagCostPerTon)
  })
}

const resetCostForm = () => {
  Object.assign(costForm, defaultCosts.value)
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">Chiqimlar</h2>
      <p class="page-subtitle">Kunlik chiqimlar, default sotuv narxlari va avtomatik tannarx sozlamalari.</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">Chiqim qo'shish</button>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard title="Jami chiqim" :value="formatSom(expensesSummary.total)" subtitle="filtrlangan yozuvlar" />
    <StatCard title="Yozuvlar" :value="expensesSummary.count" subtitle="chiqimlar soni" />
    <StatCard title="Kategoriya" :value="expensesSummary.categories" subtitle="faol turlar" />
    <StatCard title="Qum qoplik" :value="formatSom(sandBaggedCostPerTon)" subtitle="1 kg tannarx" />
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-5">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.factory" label="Zavod" :options="factoryOptions" placeholder="Hamma zavod" />
      <AppSelect
        v-model="filters.category"
        label="Kategoriya"
        :options="expenseCategories.map((item) => ({ label: item, value: item }))"
        placeholder="Hamma kategoriya"
      />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full" @click="clearFilters">Filtrni tozalash</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Kunlik chiqimlar</h3>
      </header>

      <AppTable :columns="columns" :rows="tableRows" empty-text="Chiqim yozuvlari topilmadi.">
        <template #cell-category="{ value }">
          <span class="data-chip">{{ value }}</span>
        </template>

        <template #cell-amount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <template v-if="isAdmin">
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openEditModal(row)">Tahrirlash</button>
            <button type="button" class="btn-danger !px-3 !py-1.5 text-xs" @click="askDelete(row)">O'chirish</button>
          </template>
          <span v-else class="text-xs text-slate-400">Faqat admin</span>
        </div>
      </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Avtomatik tannarx sozlamasi</h3>
          <p class="text-xs text-slate-500">Bu qiymatlar o'zgarsa kunlik hisob, dashboard va hisobotlar avtomatik yangilanadi</p>
        </div>
        <span class="data-chip">Qum qoplik = {{ formatSom(sandBaggedCostPerTon) }} / kg</span>
      </header>

      <div class="mb-4 grid gap-3 md:grid-cols-2">
        <div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">Qum sotuv narxi / kg</p>
          <p class="mt-1 text-lg font-semibold text-sky-900">{{ formatSom(sandSalePricePerTon) }}</p>
        </div>
        <div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">Mel sotuv narxi / kg</p>
          <p class="mt-1 text-lg font-semibold text-sky-900">{{ formatSom(chalkSalePricePerTon) }}</p>
        </div>
      </div>

      <div class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qum qoplik 1 kg</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatSom(sandBaggedCostPerTon) }}</p>
        </div>
        <div class="rounded-2xl bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">Qum rasipnoy 1 kg</p>
          <p class="mt-1 text-lg font-semibold text-sky-700">{{ formatSom(sandBulkCostPerTon) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Mel qoplik 1 kg</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatSom(chalkBaggedCostPerTon) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-100 px-4 py-3">
          <p class="text-xs text-slate-500">Mel rasipnoy 1 kg</p>
          <p class="mt-1 text-lg font-semibold text-slate-500">Yo`q</p>
        </div>
      </div>

      <div class="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        `240 / 250` sotuv narxi `/kg`. Tannarxga kirmaydi. Qoplik tannarx:
        `Qum = 185`, `Mel = 190`.
        `Mel`da rasipnoy yo`q. `Qum` rasipnoyda `qop` va `yuklash` hisoblanmaydi.
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <AppInput v-model="costForm.sandPricePerTon" type="number" min="0" step="0.01" label="Qum sotuv narxi / kg" :disabled="!isAdmin" />
        <AppInput v-model="costForm.chalkPricePerTon" type="number" min="0" step="0.01" label="Mel sotuv narxi / kg" :disabled="!isAdmin" />
        <AppInput v-model="costForm.sandWorkerCostPerTon" type="number" min="0" step="0.01" label="Qum ishchi" :disabled="!isAdmin" />
        <AppInput v-model="costForm.chalkWorkerCostPerTon" type="number" min="0" step="0.01" label="Mel ishchi" :disabled="!isAdmin" />
        <AppInput v-model="costForm.loadingCostPerTon" type="number" min="0" step="0.01" label="Ortib berish" :disabled="!isAdmin" />
        <AppInput v-model="costForm.foodCostPerTon" type="number" min="0" step="0.01" label="Ovqat" :disabled="!isAdmin" />
        <AppInput v-model="costForm.supervisorCostPerTon" type="number" min="0" step="0.01" label="Boshqaruvchi" :disabled="!isAdmin" />
        <AppInput v-model="costForm.electricityCostPerTon" type="number" min="0" step="0.01" label="Svet" :disabled="!isAdmin" />
        <AppInput v-model="costForm.stoneCostPerTon" type="number" min="0" step="0.01" label="Tosh" :disabled="!isAdmin" />
        <AppInput v-model="costForm.bagCostPerTon" type="number" min="0" step="0.01" label="Qop" :disabled="!isAdmin" />
      </div>

      <div v-if="isAdmin" class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetCostForm">Orqaga qaytarish</button>
        <button type="button" class="btn-primary" @click="saveDefaultCosts">Saqlash</button>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Formula mahsulot turiga qarab ishlaydi. `Qum` uchun ishchi `35`, `Mel` uchun ishchi `40`.
        `Qum/Mel sotuv narxi / kg` saqlanadi, lekin tannarxga qo'shilmaydi.
        Rasipnoyda `ortib berish` va `qop` hisobga olinmaydi.
      </div>
    </article>
  </section>

  <AppModal :open="modalOpen" :title="editingId ? 'Chiqimni tahrirlash' : 'Chiqim qo`shish'" @close="modalOpen = false">
    <div class="grid gap-4 md:grid-cols-2">
      <AppInput v-model="expenseForm.date" type="date" label="Sana" required />
      <AppSelect v-model="expenseForm.factory" label="Zavod" :options="factoryOptions" required />
      <AppSelect
        v-model="expenseForm.category"
        label="Kategoriya"
        :options="expenseCategories.map((item) => ({ label: item, value: item }))"
        required
      />
      <AppSelect
        v-model="expenseForm.paymentMethod"
        label="To`lov turi"
        :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        required
      />
      <AppInput v-model="expenseForm.description" label="Tavsif" placeholder="Nimaga chiqim bo'ldi?" required />
      <AppInput v-model="expenseForm.amount" type="number" min="0" step="0.01" label="Summa" required />
      <div class="md:col-span-2">
        <AppInput v-model="expenseForm.notes" label="Izoh" placeholder="Qo'shimcha izoh" />
      </div>
    </div>

    <p v-if="formError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ formError }}
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="modalOpen = false">Bekor qilish</button>
        <button type="button" class="btn-primary" @click="saveExpense">
          {{ editingId ? 'Saqlash' : 'Qo`shish' }}
        </button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Chiqim yozuvini o'chirish"
    :message="`Tanlangan ${selectedExpense?.description ?? ''} chiqimini o'chirasizmi?`"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />
</template>
