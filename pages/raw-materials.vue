<script setup lang="ts">
import type { BalanceType, FactoryName, IncomingLoadRecord, PaymentStatus, VehicleType } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

type IncomingLoadFormState = {
  date: string
  factory: FactoryName
  vehicleType: VehicleType
  tons: number
  supplier: string
  totalAmount: number
  paidAmount: number
  notes: string
}

const {
  incomingLoads,
  factoryOptions,
  latestDate,
  addIncomingLoad,
  updateIncomingLoad,
  removeIncomingLoad,
  getSupplierProfile
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()
const { getSupplierChipClass, getSupplierInputClass } = useSupplierHighlight()
const { downloadWorkbook } = useExcelExport()
const { printWorkbook } = usePdfExport()

const createFormState = (): IncomingLoadFormState => ({
  date: latestDate.value,
  factory: 'Oybek',
  vehicleType: 'Howo',
  tons: 0,
  supplier: '',
  totalAmount: 0,
  paidAmount: 0,
  notes: ''
})

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: '',
  vehicleType: '',
  supplier: ''
})

const form = reactive<IncomingLoadFormState>(createFormState())
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const deleteDialogOpen = ref(false)
const selectedLoad = ref<IncomingLoadRecord | null>(null)

const supplierModalOpen = ref(false)
const selectedSupplierName = ref('')

const columns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'vehicleType', label: 'Mashina' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'pricePerTon', label: 'Narx / tonna', align: 'right' },
  { key: 'supplier', label: "Ta'minotchi" },
  { key: 'totalAmount', label: 'Jami narx', align: 'right' },
  { key: 'balance', label: 'Balans', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const supplierLoadColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'vehicleType', label: 'Mashina' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'pricePerTon', label: 'Narx / tonna', align: 'right' },
  { key: 'totalAmount', label: 'Jami narx', align: 'right' },
  { key: 'paidAmount', label: 'To\`langan', align: 'right' },
  { key: 'balance', label: 'Balans', align: 'right' }
]

const filteredLoads = computed(() =>
  incomingLoads.value
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

      if (filters.vehicleType && record.vehicleType !== filters.vehicleType) {
        return false
      }

      if (filters.supplier && !record.supplier.toLowerCase().includes(filters.supplier.trim().toLowerCase())) {
        return false
      }

      return true
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

const loadSummary = computed(() => {
  const totalTons = filteredLoads.value.reduce((sum, record) => sum + record.tons, 0)
  const totalAmount = filteredLoads.value.reduce((sum, record) => sum + record.totalAmount, 0)
  const totalPaid = filteredLoads.value.reduce((sum, record) => sum + record.paidAmount, 0)
  const totalDebt = filteredLoads.value.reduce((sum, record) => sum + record.remainingAmount, 0)
  const totalAdvance = filteredLoads.value.reduce(
    (sum, record) => sum + getLoadAdvanceAmount(record.totalAmount, record.paidAmount),
    0
  )

  return {
    totalTons,
    totalAmount,
    totalPaid,
    totalDebt,
    totalAdvance
  }
})

const tableRows = computed<Record<string, unknown>[]>(() =>
  filteredLoads.value.map((record) => {
    const advanceAmount = getLoadAdvanceAmount(record.totalAmount, record.paidAmount)
    const balanceType: BalanceType = advanceAmount > 0 ? 'bizga_qarz' : record.remainingAmount > 0 ? 'bizdan_qarz' : 'yopilgan'

    return {
      ...record,
      balance: advanceAmount > 0 ? advanceAmount : record.remainingAmount,
      balanceType,
      advanceAmount
    }
  })
)

const formTotalAmount = computed(() => Number(form.totalAmount || 0))
const formPricePerTon = computed(() => getLoadPricePerTon(Number(form.tons), formTotalAmount.value))
const formRemainingAmount = computed(() => getRemainingAmount(formTotalAmount.value, Number(form.paidAmount || 0)))
const formAdvanceAmount = computed(() => getLoadAdvanceAmount(formTotalAmount.value, Number(form.paidAmount || 0)))
const formBalanceType = computed<BalanceType>(() => {
  if (formAdvanceAmount.value > 0) {
    return 'bizga_qarz'
  }

  if (formRemainingAmount.value > 0) {
    return 'bizdan_qarz'
  }

  return 'yopilgan'
})
const formPaymentStatus = computed<PaymentStatus>(() => getPaymentStatus(formTotalAmount.value, Number(form.paidAmount || 0)))

const supplierProfile = computed(() => getSupplierProfile(selectedSupplierName.value))
const supplierSummary = computed(() => supplierProfile.value.summary)
const supplierContact = computed(() => supplierProfile.value.contact)
const supplierLoadRows = computed<Record<string, unknown>[]>(() =>
  supplierProfile.value.recentLoads.map((record) => {
    const advanceAmount = getLoadAdvanceAmount(record.totalAmount, record.paidAmount)
    const balanceType: BalanceType = advanceAmount > 0 ? 'bizga_qarz' : record.remainingAmount > 0 ? 'bizdan_qarz' : 'yopilgan'

    return {
      ...record,
      balance: advanceAmount > 0 ? advanceAmount : record.remainingAmount,
      balanceType,
      advanceAmount
    }
  })
)

const buildFilteredLoadSheets = () => {
  return [
    {
      name: 'Tosh kirimi',
      columns: [
        { key: 'date', label: 'Sana' },
        { key: 'factory', label: 'Zavod' },
        { key: 'vehicleType', label: 'Mashina' },
        { key: 'supplier', label: "Ta'minotchi" },
        { key: 'tons', label: 'Tonna' },
        { key: 'pricePerTon', label: 'Narx / tonna' },
        { key: 'totalAmount', label: 'Jami narx' },
        { key: 'paidAmount', label: "To'langan" },
        { key: 'remainingDebt', label: 'Biz qarzmiz' },
        { key: 'advanceAmount', label: 'U qarz' },
        { key: 'balanceLabel', label: 'Holat' },
        { key: 'notes', label: 'Izoh' }
      ],
      rows: filteredLoads.value.map((record) => {
        const advanceAmount = getLoadAdvanceAmount(record.totalAmount, record.paidAmount)
        const balanceType: BalanceType = advanceAmount > 0 ? 'bizga_qarz' : record.remainingAmount > 0 ? 'bizdan_qarz' : 'yopilgan'

        return {
          date: formatDate(record.date),
          factory: record.factory,
          vehicleType: record.vehicleType,
          supplier: record.supplier,
          tons: Number(record.tons.toFixed(2)),
          pricePerTon: Math.round(record.pricePerTon),
          totalAmount: Math.round(record.totalAmount),
          paidAmount: Math.round(record.paidAmount),
          remainingDebt: Math.round(record.remainingAmount),
          advanceAmount: Math.round(advanceAmount),
          balanceLabel: balanceLabel(balanceType),
          notes: record.notes
        }
      })
    },
    {
      name: 'Xulosa',
      rows: [
        { metric: 'Jami tonna', value: Number(loadSummary.value.totalTons.toFixed(2)) },
        { metric: 'Jami summa', value: Math.round(loadSummary.value.totalAmount) },
        { metric: "To'langan", value: Math.round(loadSummary.value.totalPaid) },
        { metric: 'Biz qarzmiz', value: Math.round(loadSummary.value.totalDebt) },
        { metric: 'U qarz', value: Math.round(loadSummary.value.totalAdvance) }
      ]
    }
  ]
}

const exportFilteredLoadsExcel = () => {
  downloadWorkbook('tosh-kirimi', buildFilteredLoadSheets())
}

const exportFilteredLoadsPdf = () => {
  printWorkbook('Tosh kirimi', buildFilteredLoadSheets())
}

const buildSupplierSheets = () => {
  if (!supplierSummary.value) {
    return []
  }

  return [
    {
      name: 'Xulosa',
      rows: [
        { metric: "Ta'minotchi", value: supplierSummary.value.supplierName },
        { metric: 'Jami tosh', value: Number(supplierSummary.value.totalTons.toFixed(2)) },
        { metric: "O'rtacha narx / tonna", value: Math.round(supplierSummary.value.averagePricePerTon) },
        { metric: 'Jami summa', value: Math.round(supplierSummary.value.totalAmount) },
        { metric: "Jami to'langan", value: Math.round(supplierSummary.value.totalPaid) },
        { metric: 'Biz qarzmiz', value: Math.round(supplierSummary.value.totalDebt) },
        { metric: 'U qarz', value: Math.round(supplierSummary.value.totalAdvance) },
        { metric: 'Balans turi', value: balanceLabel(supplierSummary.value.balanceType) },
        { metric: 'Balans summa', value: Math.round(supplierSummary.value.balanceAmount) },
        { metric: 'Telefon', value: supplierContact.value?.phone ?? '' },
        { metric: 'Manzil', value: supplierContact.value?.address ?? '' }
      ]
    },
    {
      name: 'Yuklar',
      columns: supplierLoadColumns,
      rows: supplierProfile.value.recentLoads.map((record) => {
        const advanceAmount = getLoadAdvanceAmount(record.totalAmount, record.paidAmount)
        const balanceType: BalanceType = advanceAmount > 0 ? 'bizga_qarz' : record.remainingAmount > 0 ? 'bizdan_qarz' : 'yopilgan'

        return {
          date: formatDate(record.date),
          factory: record.factory,
          vehicleType: record.vehicleType,
          tons: Number(record.tons.toFixed(2)),
          pricePerTon: Math.round(record.pricePerTon),
          totalAmount: Math.round(record.totalAmount),
          paidAmount: Math.round(record.paidAmount),
          balance: Math.round(advanceAmount > 0 ? advanceAmount : record.remainingAmount),
          notes: record.notes,
          balanceLabel: balanceLabel(balanceType)
        }
      })
    }
  ]
}

const exportSupplierLoadsExcel = () => {
  downloadWorkbook(`${selectedSupplierName.value || 'supplier'}-tosh-hisobi`, buildSupplierSheets())
}

const exportSupplierLoadsPdf = () => {
  printWorkbook(`${selectedSupplierName.value || "Ta'minotchi"} tosh hisobi`, buildSupplierSheets())
}

const balanceToneClass = (balanceType: unknown) => {
  if (balanceType === 'bizdan_qarz') {
    return 'text-rose-700'
  }

  if (balanceType === 'bizga_qarz') {
    return 'text-sky-700'
  }

  return 'text-emerald-700'
}

const balanceLabel = (balanceType: unknown) => {
  if (balanceType === 'bizdan_qarz') {
    return 'Biz qarzmiz'
  }

  if (balanceType === 'bizga_qarz') {
    return 'U qarz'
  }

  return 'Yopilgan'
}

const resetForm = () => {
  Object.assign(form, createFormState())
  editingId.value = null
  formError.value = ''
}

const openCreateModal = () => {
  if (!isAdmin.value) {
    return
  }

  resetForm()
  modalOpen.value = true
}

const openEditModal = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  const record = row as IncomingLoadRecord

  Object.assign(form, {
    date: record.date,
    factory: record.factory,
    vehicleType: record.vehicleType,
    tons: record.tons,
    supplier: record.supplier,
    totalAmount: record.totalAmount,
    paidAmount: record.paidAmount,
    notes: record.notes
  })

  editingId.value = record.id
  formError.value = ''
  modalOpen.value = true
}

const openSupplierProfileModal = (supplierName: string) => {
  selectedSupplierName.value = supplierName
  supplierModalOpen.value = true
}

const saveLoad = () => {
  if (!isAdmin.value) {
    return
  }

  const totalAmount = Number(form.totalAmount)
  const paidAmount = Number(form.paidAmount)
  const pricePerTon = getLoadPricePerTon(Number(form.tons), totalAmount)

  const payload: Omit<IncomingLoadRecord, 'id'> = {
    date: form.date,
    factory: form.factory as FactoryName,
    vehicleType: form.vehicleType as VehicleType,
    tons: Number(form.tons),
    supplier: form.supplier.trim(),
    pricePerTon,
    totalAmount,
    paidAmount,
    remainingAmount: getRemainingAmount(totalAmount, paidAmount),
    paymentStatus: getPaymentStatus(totalAmount, paidAmount),
    notes: form.notes.trim()
  }

  if (!payload.date || !payload.factory || !payload.vehicleType) {
    formError.value = 'Sana, zavod va mashina turini kiriting.'
    return
  }

  if (payload.tons <= 0) {
    formError.value = 'Tonna miqdori 0 dan katta bo`lishi kerak.'
    return
  }

  if (!payload.supplier) {
    formError.value = 'Ta`minotchini kiriting.'
    return
  }

  if (payload.totalAmount <= 0 || payload.paidAmount < 0) {
    formError.value = 'Jami narx 0 dan katta bo`lsin, to`langan summa esa manfiy bo`lmasin.'
    return
  }

  if (editingId.value) {
    updateIncomingLoad({
      id: editingId.value,
      ...payload
    })
  } else {
    addIncomingLoad(payload)
  }

  modalOpen.value = false
  resetForm()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedLoad.value = row as IncomingLoadRecord
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value) {
    return
  }

  if (selectedLoad.value) {
    removeIncomingLoad(selectedLoad.value.id)
  }

  selectedLoad.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedLoad.value = null
  deleteDialogOpen.value = false
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.factory = ''
  filters.vehicleType = ''
  filters.supplier = ''
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">Tosh kirimi</h2>
      <p class="page-subtitle">Howo yoki Kamazda kelgan tosh uchun jami kelish narxini kiriting. Narx / tonna avtomatik hisoblanadi.</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <div class="flex flex-wrap gap-2">
      <ExportActions @excel="exportFilteredLoadsExcel" @pdf="exportFilteredLoadsPdf" />
      <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">Kirim qo'shish</button>
    </div>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Jami kirim" :value="formatTons(loadSummary.totalTons)" subtitle="filtrlangan yozuvlar" />
    <StatCard title="Jami summa" :value="formatSom(loadSummary.totalAmount)" subtitle="supplier bo'yicha" />
    <StatCard title="To'langan" :value="formatSom(loadSummary.totalPaid)" subtitle="berilgan pul" />
    <StatCard title="Biz qarzmiz" :value="formatSom(loadSummary.totalDebt)" subtitle="supplierga qoldiq" />
    <StatCard title="U qarz" :value="formatSom(loadSummary.totalAdvance)" subtitle="ortiqcha to'lov" />
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-6">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.factory" label="Zavod" :options="factoryOptions" placeholder="Hamma zavod" />
      <AppSelect
        v-model="filters.vehicleType"
        label="Mashina turi"
        :options="[
          { label: 'Howo', value: 'Howo' },
          { label: 'Kamaz', value: 'Kamaz' }
        ]"
        placeholder="Hammasi"
      />
      <AppInput
        v-model="filters.supplier"
        label="Ta'minotchi"
        placeholder="Kimdan kelgan?"
        :input-class="getSupplierInputClass(filters.supplier)"
      />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full" @click="clearFilters">Filtrni tozalash</button>
      </div>
    </div>
  </section>

  <section class="panel p-5">
    <AppTable :columns="columns" :rows="tableRows" empty-text="Tosh kirimi yozuvlari topilmadi.">
      <template #cell-vehicleType="{ value }">
        <span class="data-chip">{{ value }}</span>
      </template>

      <template #cell-tons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-pricePerTon="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-supplier="{ value }">
        <button type="button" :class="getSupplierChipClass(value)" @click="openSupplierProfileModal(String(value))">
          {{ value }}
        </button>
      </template>

      <template #cell-totalAmount="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-balance="{ row, value }">
        <span :class="['font-semibold', balanceToneClass(row.balanceType)]">
          {{ balanceLabel(row.balanceType) }}: {{ formatSom(Number(value)) }}
        </span>
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
  </section>

  <AppModal :open="modalOpen" :title="editingId ? 'Kirimni tahrirlash' : 'Kirim qo`shish'" size="xl" @close="modalOpen = false">
    <div class="grid gap-4 md:grid-cols-2">
      <AppInput v-model="form.date" type="date" label="Sana" required />
      <AppSelect v-model="form.factory" label="Zavod" :options="factoryOptions" required />
      <AppSelect
        v-model="form.vehicleType"
        label="Mashina turi"
        :options="[
          { label: 'Howo', value: 'Howo' },
          { label: 'Kamaz', value: 'Kamaz' }
        ]"
        required
      />
      <AppInput v-model="form.tons" type="number" min="0" step="0.01" label="Tonna" required />
      <AppInput v-model="form.totalAmount" type="number" min="0" step="0.01" label="Jami narx" required />
      <AppInput v-model="form.paidAmount" type="number" min="0" step="0.01" label="To'langan summa" />
      <AppInput
        v-model="form.supplier"
        label="Ta'minotchi"
        placeholder="Karer yoki ta'minotchi nomi"
        :input-class="getSupplierInputClass(form.supplier)"
        required
      />
      <div class="md:col-span-2">
        <AppInput v-model="form.notes" label="Izoh" placeholder="Masalan, ertalabgi Howo yuk" />
      </div>
    </div>

    <div class="mt-4 rounded-2xl bg-slate-50 p-4">
      <div class="grid gap-3 md:grid-cols-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">Jami summa</p>
          <p class="mt-1 text-lg font-bold text-slate-900">{{ formatSom(formTotalAmount) }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">Avtomatik narx / tonna</p>
          <p class="mt-1 text-lg font-bold text-slate-900">{{ formatSom(formPricePerTon) }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">Biz qarzmiz</p>
          <p class="mt-1 text-lg font-bold text-rose-700">{{ formatSom(formRemainingAmount) }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">U qarz</p>
          <p class="mt-1 text-lg font-bold text-sky-700">{{ formatSom(formAdvanceAmount) }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">Holat</p>
          <p class="mt-1 text-lg font-bold" :class="balanceToneClass(formBalanceType)">{{ balanceLabel(formBalanceType) }}</p>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">Holat: {{ formPaymentStatus }}</p>
      <p class="mt-2 text-xs text-slate-500">Masalan, 1 Howo uchun `2 000 000` yoki `1 800 000` jami narx kiriting. Narx / tonna avtomatik chiqadi.</p>
    </div>

    <p v-if="formError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ formError }}
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="modalOpen = false">Bekor qilish</button>
        <button type="button" class="btn-primary" @click="saveLoad">
          {{ editingId ? 'Saqlash' : 'Qo`shish' }}
        </button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="supplierModalOpen" :title="selectedSupplierName || 'Ta`minotchi profili'" size="xl" @close="supplierModalOpen = false">
    <div v-if="supplierSummary" class="space-y-4">
      <div class="flex justify-end">
        <ExportActions label="Supplier yuklab olish" @excel="exportSupplierLoadsExcel" @pdf="exportSupplierLoadsPdf" />
      </div>

      <div class="grid gap-4 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Jami tosh</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatTons(supplierSummary.totalTons) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">O'rtacha narx / tonna</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatSom(supplierSummary.averagePricePerTon) }}</p>
        </div>
        <div class="rounded-2xl bg-rose-50 px-4 py-3">
          <p class="text-xs text-rose-700">Biz qarzmiz</p>
          <p class="mt-1 text-lg font-semibold text-rose-700">{{ formatSom(supplierSummary.totalDebt) }}</p>
        </div>
        <div class="rounded-2xl bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">U qarz</p>
          <p class="mt-1 text-lg font-semibold text-sky-700">{{ formatSom(supplierSummary.totalAdvance) }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-4">
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Jami summa</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(supplierSummary.totalAmount) }}</p>
        </div>
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Jami to'langan</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(supplierSummary.totalPaid) }}</p>
        </div>
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Oxirgi sana</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatDate(supplierSummary.lastLoadDate) }}</p>
        </div>
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Yozuvlar soni</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ supplierProfile.loadCount }}</p>
        </div>
      </div>

      <div v-if="supplierContact" class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Telefon</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ supplierContact.phone || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Manzil</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ supplierContact.address || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <p class="text-xs text-slate-500">Balans holati</p>
          <p class="mt-1 text-sm font-semibold" :class="balanceToneClass(supplierSummary.balanceType)">
            {{ balanceLabel(supplierSummary.balanceType) }}: {{ formatSom(supplierSummary.balanceAmount) }}
          </p>
        </div>
      </div>

      <AppTable :columns="supplierLoadColumns" :rows="supplierLoadRows" empty-text="Bu ta'minotchi bo'yicha kirim topilmadi.">
        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-pricePerTon="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-totalAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-paidAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-balance="{ row, value }">
          <span :class="['font-semibold', balanceToneClass(row.balanceType)]">
            {{ balanceLabel(row.balanceType) }}: {{ formatSom(Number(value)) }}
          </span>
        </template>
      </AppTable>
    </div>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Kirim yozuvini o'chirish"
    :message="`Tanlangan ${selectedLoad?.vehicleType ?? ''} kirimini o'chirasizmi?`"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />
</template>
