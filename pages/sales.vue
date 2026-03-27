<script setup lang="ts">
import type { FactoryName, PaymentMethod, SaleRecord, ShipmentType } from '~/types/accounting'
import type { TableColumn } from '~/types/report'
import { isBulkAllowedForProduct, normalizeShipmentTypeForProduct } from '~/composables/useProductRules'

definePageMeta({
  layout: 'dashboard'
})

const {
  sales,
  productTypes,
  paymentMethods,
  clientOptions,
  latestDate,
  addSale,
  updateSale,
  removeSale,
  clientDirectory,
  getClientProfile,
  buildSaleReceiptMessage,
  buildTelegramLink
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()
const { downloadWorkbook } = useExcelExport()
const { printWorkbook } = usePdfExport()
const { t } = useUiLocale()

const createFormState = (): Omit<
  SaleRecord,
  'id' | 'totalAmount' | 'remainingAmount' | 'advanceAmount' | 'balanceAmount' | 'balanceType' | 'paymentStatus'
> => ({
  date: latestDate.value,
  time: '',
  factory: 'Oybek',
  clientName: '',
  productName: 'Qum',
  shipmentType: 'qoplik',
  tons: 0,
  pricePerTon: 0,
  paidAmount: 0,
  paymentMethod: 'Naqd',
  notes: ''
})

const filters = reactive({
  startDate: '',
  endDate: '',
  shipmentType: '',
  status: '',
  clientName: ''
})

const form = reactive(createFormState())
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const deleteDialogOpen = ref(false)
const selectedSale = ref<SaleRecord | null>(null)
const receiptModalOpen = ref(false)
const receiptSale = ref<SaleRecord | null>(null)
const copiedReceipt = ref(false)
const receiptSending = ref(false)
const receiptError = ref('')
const receiptSuccess = ref('')

const columns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'clientName', label: 'Klient' },
  { key: 'productName', label: 'Mahsulot' },
  { key: 'shipmentType', label: 'Yuk turi' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'pricePerTon', label: 'Narx/kg', align: 'right' },
  { key: 'paymentMethod', label: 'To`lov turi' },
  { key: 'balance', label: 'Balans', align: 'right' },
  { key: 'paymentStatus', label: 'Holat' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const filteredSales = computed(() =>
  sales.value
    .filter((record) => {
      if (filters.startDate && record.date < filters.startDate) {
        return false
      }

      if (filters.endDate && record.date > filters.endDate) {
        return false
      }

      if (filters.shipmentType && record.shipmentType !== filters.shipmentType) {
        return false
      }

      if (filters.status && record.paymentStatus !== filters.status) {
        return false
      }

      if (filters.clientName && record.clientName !== filters.clientName) {
        return false
      }

      return true
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

const salesSummary = computed(() => {
  const totalTons = filteredSales.value.reduce((sum, record) => sum + record.tons, 0)
  const totalRevenue = filteredSales.value.reduce((sum, record) => sum + record.totalAmount, 0)
  const totalPaid = filteredSales.value.reduce((sum, record) => sum + record.paidAmount, 0)
  const totalDebt = filteredSales.value.reduce((sum, record) => sum + record.remainingAmount, 0)
  const totalAdvance = filteredSales.value.reduce((sum, record) => sum + record.advanceAmount, 0)
  const clients = new Set(filteredSales.value.map((record) => record.clientName))

  return {
    totalTons,
    totalRevenue,
    totalPaid,
    totalDebt,
    totalAdvance,
    clientCount: clients.size
  }
})

const clientSelectOptions = computed(() => {
  const optionMap = new Map(clientOptions.value.map((option) => [option.value, option]))

  if (form.clientName && !optionMap.has(form.clientName)) {
    optionMap.set(form.clientName, { label: form.clientName, value: form.clientName })
  }

  return Array.from(optionMap.values())
})

const filterClientOptions = computed(() => clientOptions.value)
const formBulkAllowed = computed(() => isBulkAllowedForProduct(form.productName))
const activeClientProfile = computed(() => getClientProfile(form.clientName))
const activeClientSummary = computed(() => activeClientProfile.value.summary)
const activeClientContact = computed(() => activeClientProfile.value.contact)
const activeClientSales = computed(() => activeClientProfile.value.recentSales)
const activeClientLastSale = computed(() => activeClientProfile.value.lastSale)
const editingSaleRecord = computed(() => sales.value.find((record) => record.id === editingId.value) ?? null)

const formTotal = computed(() => getSaleTotal(Number(form.tons), Number(form.pricePerTon)))
const formRemainingAmount = computed(() => getRemainingAmount(formTotal.value, Number(form.paidAmount || 0)))
const formAdvanceAmount = computed(() => getAdvanceAmount(formTotal.value, Number(form.paidAmount || 0)))
const formBalanceType = computed(() => getBalanceType(formTotal.value, Number(form.paidAmount || 0)))
const formBalanceAmount = computed(() => getBalanceAmount(formTotal.value, Number(form.paidAmount || 0)))
const currentClientNetBalance = computed(() => {
  if (!activeClientSummary.value) {
    return 0
  }

  if (activeClientSummary.value.balanceType === 'bizga_qarz') {
    return activeClientSummary.value.balanceAmount
  }

  if (activeClientSummary.value.balanceType === 'bizdan_qarz') {
    return -activeClientSummary.value.balanceAmount
  }

  return 0
})
const editingSaleNetBalance = computed(() => {
  if (!editingSaleRecord.value) {
    return 0
  }

  if (editingSaleRecord.value.clientName.trim().toLowerCase() !== form.clientName.trim().toLowerCase()) {
    return 0
  }

  if (editingSaleRecord.value.balanceType === 'bizga_qarz') {
    return editingSaleRecord.value.balanceAmount
  }

  if (editingSaleRecord.value.balanceType === 'bizdan_qarz') {
    return -editingSaleRecord.value.balanceAmount
  }

  return 0
})
const formNetBalance = computed(() => {
  if (formBalanceType.value === 'bizga_qarz') {
    return formBalanceAmount.value
  }

  if (formBalanceType.value === 'bizdan_qarz') {
    return -formBalanceAmount.value
  }

  return 0
})
const projectedClientNetBalance = computed(() =>
  Number((currentClientNetBalance.value - editingSaleNetBalance.value + formNetBalance.value).toFixed(2))
)
const projectedClientBalanceType = computed(() => {
  if (projectedClientNetBalance.value > 0) {
    return 'bizga_qarz'
  }

  if (projectedClientNetBalance.value < 0) {
    return 'bizdan_qarz'
  }

  return 'yopilgan'
})
const projectedClientBalanceAmount = computed(() => Math.abs(projectedClientNetBalance.value))

const tableRows = computed<Record<string, unknown>[]>(() =>
  filteredSales.value.map((record) => ({
    ...record,
    balance: record.balanceAmount
  }))
)

const buildSalesSheets = () => {
  return [
    {
      name: 'Sotuvlar',
      columns: [
        { key: 'date', label: 'Sana' },
        { key: 'time', label: 'Soat' },
        { key: 'factory', label: 'Zavod' },
        { key: 'clientName', label: 'Klient' },
        { key: 'productName', label: 'Mahsulot' },
        { key: 'shipmentType', label: 'Yuk turi' },
        { key: 'tons', label: 'Tonna' },
        { key: 'pricePerTon', label: 'Narx / kg' },
        { key: 'totalAmount', label: 'Jami summa' },
        { key: 'paidAmount', label: "To'langan" },
        { key: 'paymentMethod', label: "To'lov turi" },
        { key: 'balanceLabel', label: 'Balans turi' },
        { key: 'balanceAmount', label: 'Balans' },
        { key: 'paymentStatus', label: 'Holat' },
        { key: 'notes', label: 'Izoh' }
      ],
      rows: filteredSales.value.map((record) => ({
        date: formatDate(record.date),
        time: record.time,
        factory: record.factory,
        clientName: record.clientName,
        productName: record.productName,
        shipmentType: record.shipmentType,
        tons: Number(record.tons.toFixed(2)),
        pricePerTon: Math.round(record.pricePerTon),
        totalAmount: Math.round(record.totalAmount),
        paidAmount: Math.round(record.paidAmount),
        paymentMethod: record.paymentMethod,
        balanceLabel: balanceLabel(record.balanceType),
        balanceAmount: Math.round(record.balanceAmount),
        paymentStatus: record.paymentStatus,
        notes: record.notes
      }))
    },
    {
      name: 'Xulosa',
      rows: [
        { metric: 'Sotilgan tonna', value: Number(salesSummary.value.totalTons.toFixed(2)) },
        { metric: 'Tushum', value: Math.round(salesSummary.value.totalRevenue) },
        { metric: "To'langan", value: Math.round(salesSummary.value.totalPaid) },
        { metric: 'Bizga qarz', value: Math.round(salesSummary.value.totalDebt) },
        { metric: 'Bizdan qarz', value: Math.round(salesSummary.value.totalAdvance) },
        { metric: 'Klient soni', value: salesSummary.value.clientCount }
      ]
    }
  ]
}

const exportSalesExcel = () => {
  downloadWorkbook('sotuvlar', buildSalesSheets())
}

const exportSalesPdf = () => {
  printWorkbook('Sotuvlar', buildSalesSheets())
}

const statusClass = (status: unknown) => {
  if (status === 'tolangan') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'qisman') {
    return 'bg-amber-100 text-amber-700'
  }

  if (status === 'avans') {
    return 'bg-sky-100 text-sky-700'
  }

  return 'bg-rose-100 text-rose-700'
}

const balanceToneClass = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'text-rose-700'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'text-sky-700'
  }

  return 'text-emerald-700'
}

const balanceLabel = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'Bizga qarz'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'Bizdan qarz'
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

  const record = row as SaleRecord

  Object.assign(form, {
    date: record.date,
    time: record.time,
    factory: record.factory,
    clientName: record.clientName,
    productName: record.productName,
    shipmentType: normalizeShipmentTypeForProduct(record.productName, record.shipmentType),
    tons: record.tons,
    pricePerTon: record.pricePerTon,
    paidAmount: record.paidAmount,
    paymentMethod: record.paymentMethod,
    notes: record.notes
  })

  editingId.value = record.id
  formError.value = ''
  modalOpen.value = true
}

const saveSale = () => {
  if (!isAdmin.value) {
    return
  }

  formError.value = ''

  const payload = {
    date: form.date,
    time: form.time,
    factory: form.factory as FactoryName,
    clientName: form.clientName.trim(),
    productName: form.productName.trim() || 'Qum',
    shipmentType: normalizeShipmentTypeForProduct(form.productName, form.shipmentType as ShipmentType),
    tons: Number(form.tons),
    pricePerTon: Number(form.pricePerTon),
    paidAmount: Number(form.paidAmount),
    paymentMethod: form.paymentMethod as PaymentMethod,
    notes: form.notes.trim()
  }

  if (!payload.date || !payload.clientName) {
    formError.value = 'Sana va klientni tanlang.'
    return
  }

  if (payload.tons <= 0 || payload.pricePerTon <= 0) {
    formError.value = 'Tonna va narx 0 dan katta bo`lishi kerak.'
    return
  }

  if (payload.paidAmount < 0) {
    formError.value = 'To`langan summa manfiy bo`lmasin.'
    return
  }

  if (payload.paidAmount > formTotal.value) {
    formError.value = 'To`langan summa jami summadan katta bo`lmasin.'
    return
  }

  if (editingId.value) {
    updateSale({
      id: editingId.value,
      ...payload
    })
  } else {
    addSale(payload)
  }

  modalOpen.value = false
  resetForm()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedSale.value = row as SaleRecord
  deleteDialogOpen.value = true
}

const openReceiptModal = (row: Record<string, unknown>) => {
  receiptSale.value = row as SaleRecord
  copiedReceipt.value = false
  receiptError.value = ''
  receiptSuccess.value = ''
  receiptModalOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value) {
    return
  }

  if (selectedSale.value) {
    removeSale(selectedSale.value.id)
  }

  selectedSale.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedSale.value = null
  deleteDialogOpen.value = false
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.shipmentType = ''
  filters.status = ''
  filters.clientName = ''
}

const receiptProfile = computed(() => getClientProfile(receiptSale.value?.clientName ?? ''))
const receiptPhone = computed(() => receiptProfile.value.contact?.phone ?? '')
const receiptTelegramChatId = computed(() => receiptProfile.value.contact?.telegramChatId ?? '')
const receiptTelegramUsername = computed(() => receiptProfile.value.contact?.telegramUsername ?? '')
const receiptMessage = computed(() => (receiptSale.value ? buildSaleReceiptMessage(receiptSale.value) : ''))
const receiptTelegramLink = computed(() => buildTelegramLink(receiptTelegramUsername.value))

const copyReceiptMessage = async () => {
  if (!receiptMessage.value || !import.meta.client || !navigator.clipboard) {
    return
  }

  await navigator.clipboard.writeText(receiptMessage.value)
  copiedReceipt.value = true
}

const sendReceiptTelegram = async () => {
  if (!isAdmin.value || !receiptSale.value) {
    return
  }

  receiptSending.value = true
  receiptError.value = ''
  receiptSuccess.value = ''

  try {
    await $fetch('/api/notifications/telegram/send', {
      method: 'POST',
      body: {
        clientName: receiptSale.value.clientName,
        message: receiptMessage.value
      }
    })

    receiptSuccess.value = 'Telegram yuborildi.'
  } catch (error) {
    receiptError.value = error instanceof Error ? error.message : 'Telegram yuborishda xato.'
  } finally {
    receiptSending.value = false
  }
}

const applyLastSaleDefaults = () => {
  if (!activeClientLastSale.value) {
    return
  }

  form.productName = activeClientLastSale.value.productName
  form.shipmentType = normalizeShipmentTypeForProduct(activeClientLastSale.value.productName, activeClientLastSale.value.shipmentType)
  form.pricePerTon = activeClientLastSale.value.pricePerTon
  form.paymentMethod = activeClientLastSale.value.paymentMethod
}

watch(
  () => form.productName,
  (productName) => {
    form.shipmentType = normalizeShipmentTypeForProduct(productName, form.shipmentType as ShipmentType)
  }
)
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Sotuvlar') }}</h2>
      <p class="page-subtitle">{{ t('Klient tanlanadi, mahsulot turi ko`rsatiladi, balans va to`lov turi avtomatik ko`rinadi.') }}</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <div class="flex flex-wrap gap-2">
      <ExportActions @excel="exportSalesExcel" @pdf="exportSalesPdf" />
      <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">{{ t("Sotuv qo'shish") }}</button>
    </div>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Sotilgan tonna" :value="formatTons(salesSummary.totalTons)" subtitle="filtrlangan yozuvlar" />
    <StatCard title="Tushum" :value="formatSom(salesSummary.totalRevenue)" subtitle="jami summa" />
    <StatCard title="To'langan" :value="formatSom(salesSummary.totalPaid)" subtitle="olingan pul" />
    <StatCard title="Bizga qarz" :value="formatSom(salesSummary.totalDebt)" subtitle="klientlardan" />
    <StatCard title="Bizdan qarz" :value="formatSom(salesSummary.totalAdvance)" subtitle="avans / ortiqcha to`lov" />
  </section>

  <section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
    <article class="panel p-4">
      <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">{{ t('Joriy oy') }}</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">{{ t('Oxirgi 30 kun') }}</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">{{ t('Oxirgi 7 kun') }}</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">{{ t('Hammasi') }}</button>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-5">
        <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
        <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
        <AppSelect
          v-model="filters.shipmentType"
          label="Yuk turi"
          :options="[
            { label: 'Qoplik', value: 'qoplik' },
            { label: 'Rasipnoy', value: 'rasipnoy' }
          ]"
          placeholder="Hammasi"
        />
        <AppSelect
          v-model="filters.status"
          label="Holat"
          :options="[
            { label: 'Qarzdor', value: 'qarzdor' },
            { label: 'Qisman', value: 'qisman' },
            { label: 'To`langan', value: 'tolangan' },
            { label: 'Avans', value: 'avans' }
          ]"
          placeholder="Hammasi"
        />
        <AppSelect v-model="filters.clientName" label="Klient" :options="filterClientOptions" :translate-options="false" :searchable="true" placeholder="Hamma klient" />
      </div>
    </article>

    <article class="panel p-4">
      <p class="text-sm font-semibold text-slate-900">{{ t('Klient tanlash') }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t('Yangi klientni avval `Klientlar` sahifasida qo`shing, keyin bu yerda tanlaysiz.') }}</p>
      <NuxtLink to="/users" class="btn-secondary mt-4 w-full">{{ t('Klientlar sahifasi') }}</NuxtLink>
      <div class="mt-4 flex flex-wrap gap-2">
        <span v-for="client in clientDirectory.slice(0, 8)" :key="client.id" class="data-chip">
          {{ client.clientName }}
        </span>
      </div>
    </article>
  </section>

  <section class="panel p-5">
    <AppTable :columns="columns" :rows="tableRows" empty-text="Sotuv yozuvlari topilmadi.">
      <template #cell-shipmentType="{ value }">
        <span class="data-chip capitalize">{{ value }}</span>
      </template>

      <template #cell-tons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-pricePerTon="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-paymentMethod="{ value }">
        <span class="data-chip">{{ value }}</span>
      </template>

      <template #cell-balance="{ row, value }">
        <span :class="['font-semibold', balanceToneClass(row.balanceType)]">
          {{ balanceLabel(row.balanceType) }}: {{ formatSom(Number(value)) }}
        </span>
      </template>

      <template #cell-paymentStatus="{ value }">
        <span :class="['inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize', statusClass(value)]">
          {{ value }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openReceiptModal(row)">TG</button>
          <template v-if="isAdmin">
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openEditModal(row)">{{ t('Tahrirlash') }}</button>
            <button type="button" class="btn-danger !px-3 !py-1.5 text-xs" @click="askDelete(row)">{{ t("O'chirish") }}</button>
          </template>
        </div>
      </template>
    </AppTable>
  </section>

  <AppModal :open="modalOpen" :title="editingId ? 'Sotuvni tahrirlash' : 'Sotuv qo`shish'" size="lg" @close="modalOpen = false">
    <div class="grid gap-4 md:grid-cols-2">
      <AppInput v-model="form.date" type="date" label="Sana" :invalid="Boolean(formError) && !form.date" required />
      <AppInput v-model="form.time" type="time" label="Soat" />

      <div class="md:col-span-2 grid gap-3 md:grid-cols-[1fr_auto]">
        <AppSelect
          v-model="form.clientName"
          label="Klient"
          :options="clientSelectOptions"
          :translate-options="false"
          :searchable="true"
          placeholder="Klientni tanlang"
          :invalid="Boolean(formError) && !form.clientName.trim()"
          required
        />
        <div class="flex items-end">
          <NuxtLink to="/users" class="btn-secondary w-full">{{ t("Klient qo'shish") }}</NuxtLink>
        </div>
      </div>

      <AppSelect
        v-model="form.productName"
        label="Mahsulot turi"
        :options="productTypes.map((item) => ({ label: item, value: item }))"
        :invalid="Boolean(formError) && !form.productName"
        required
      />
      <AppSelect
        v-model="form.shipmentType"
        label="Yuk turi"
        :options="formBulkAllowed
          ? [
              { label: 'Qoplik', value: 'qoplik' },
              { label: 'Rasipnoy', value: 'rasipnoy' }
            ]
          : [{ label: 'Qoplik', value: 'qoplik' }]"
        :invalid="Boolean(formError) && !form.shipmentType"
        required
      />
      <AppInput v-model="form.tons" type="number" min="0" step="0.01" label="Tonna" :invalid="Boolean(formError) && Number(form.tons) <= 0" required />
      <AppInput
        v-model="form.pricePerTon"
        type="number"
        min="0"
        step="0.01"
        label="Narx / kg"
        :invalid="Boolean(formError) && Number(form.pricePerTon) <= 0"
        required
      />
      <AppInput
        v-model="form.paidAmount"
        type="number"
        min="0"
        step="0.01"
        label="To'langan summa"
        :invalid="Boolean(formError) && Number(form.paidAmount) < 0"
        required
      />
      <AppSelect
        v-model="form.paymentMethod"
        label="To`lov turi"
        :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        :invalid="Boolean(formError) && !form.paymentMethod"
        required
      />

      <p v-if="!formBulkAllowed" class="text-xs text-amber-700 md:col-span-2">Mel faqat qoplik sotiladi.</p>

      <div v-if="activeClientSummary" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">{{ activeClientSummary.clientName }} klient kartasi</p>
            <p class="text-xs text-slate-500">Balans, telefon va oxirgi sotuv shu yerda ko`rinadi.</p>
          </div>

          <button v-if="activeClientLastSale" type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="applyLastSaleDefaults">
            Oxirgi narxni qo'yish
          </button>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-4">
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Jami tonna</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatTons(activeClientSummary.totalTons) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Jami tushum</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(activeClientSummary.totalRevenue) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Balans turi</p>
            <p class="mt-1 text-base font-semibold" :class="balanceToneClass(activeClientSummary.balanceType)">
              {{ balanceLabel(activeClientSummary.balanceType) }}
            </p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Balans</p>
            <p class="mt-1 text-base font-semibold" :class="balanceToneClass(activeClientSummary.balanceType)">
              {{ formatSom(activeClientSummary.balanceAmount) }}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Hozirgi klient balansi</p>
            <p class="mt-1 text-base font-semibold" :class="balanceToneClass(activeClientSummary.balanceType)">
              {{ balanceLabel(activeClientSummary.balanceType) }}: {{ formatSom(activeClientSummary.balanceAmount) }}
            </p>
          </div>
          <div class="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
            <p class="text-xs text-slate-500">Shu yukdan keyingi balans</p>
            <p class="mt-1 text-base font-semibold" :class="balanceToneClass(projectedClientBalanceType)">
              {{ balanceLabel(projectedClientBalanceType) }}: {{ formatSom(projectedClientBalanceAmount) }}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-4">
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Telefon</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeClientContact?.phone || '-' }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Manzil</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeClientContact?.address || '-' }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Oxirgi sana</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatDate(activeClientSummary.lastPurchaseDate) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3">
            <p class="text-xs text-slate-500">Oxirgi zavod</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeClientSummary.lastPurchaseDate ? activeClientSummary.lastFactory : '-' }}</p>
          </div>
        </div>

        <div v-if="activeClientSales.length" class="mt-4 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Oxirgi yuklar</p>
          <div
            v-for="sale in activeClientSales"
            :key="sale.id"
            class="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:grid-cols-[1fr_0.9fr_0.9fr_0.8fr_0.9fr_1fr]"
          >
            <span class="font-medium text-slate-900">{{ formatDate(sale.date) }}</span>
            <span>{{ sale.factory }}</span>
            <span>{{ sale.productName }}</span>
            <span class="capitalize">{{ sale.shipmentType }}</span>
            <span>{{ formatTons(sale.tons) }}</span>
            <span :class="['font-semibold', balanceToneClass(sale.balanceType)]">
              {{ balanceLabel(sale.balanceType) }}: {{ formatSom(sale.balanceAmount) }}
            </span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl bg-slate-50 p-4 md:col-span-2">
        <div class="grid gap-3 md:grid-cols-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Jami summa</p>
            <p class="mt-1 text-lg font-bold text-slate-900">{{ formatSom(formTotal) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Bizga qarz</p>
            <p class="mt-1 text-lg font-bold text-rose-700">{{ formatSom(formRemainingAmount) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Bizdan qarz</p>
            <p class="mt-1 text-lg font-bold text-sky-700">{{ formatSom(formAdvanceAmount) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Balans turi</p>
            <p class="mt-1 text-lg font-bold" :class="balanceToneClass(formBalanceType)">{{ balanceLabel(formBalanceType) }}</p>
          </div>
        </div>
      </div>

      <div class="md:col-span-2">
        <AppInput v-model="form.notes" label="Izoh" placeholder="Masalan, 20 tonna qum, Click orqali to`lov" />
      </div>
    </div>

    <p v-if="formError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ formError }}
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <p v-if="formError" class="mr-auto max-w-sm text-sm font-medium text-rose-700">
          {{ formError }}
        </p>
        <button type="button" class="btn-secondary" @click="modalOpen = false">{{ t('Bekor qilish') }}</button>
        <button type="button" class="btn-primary" @click="saveSale">
          {{ editingId ? t('Saqlash') : t("Qo`shish") }}
        </button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Sotuvni o'chirish"
    :message="`${selectedSale?.clientName ?? ''} sotuv yozuvini o'chirasizmi?`"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />

  <AppModal :open="receiptModalOpen" title="Telegram chek" size="lg" @close="receiptModalOpen = false">
    <div class="space-y-4">
      <div class="grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Klient</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ receiptSale?.clientName || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Telefon</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ receiptPhone || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Telegram chat ID</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ receiptTelegramChatId || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qarz</p>
          <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(receiptSale?.remainingAmount ?? 0) }}</p>
        </div>
      </div>

      <div class="rounded-2xl bg-slate-950 p-4 text-sm text-white">
        <pre class="whitespace-pre-wrap font-mono">{{ receiptMessage }}</pre>
      </div>

      <div class="rounded-2xl bg-slate-50 p-4 text-sm">
        <p class="text-xs text-slate-500">Telegram username</p>
        <p class="mt-1 font-semibold text-slate-900">{{ receiptTelegramUsername ? `@${receiptTelegramUsername}` : '-' }}</p>
      </div>

      <p v-if="copiedReceipt" class="text-sm text-emerald-700">Xabar matni copy qilindi.</p>
      <p v-if="receiptSuccess" class="text-sm text-emerald-700">{{ receiptSuccess }}</p>
      <p v-if="receiptError" class="text-sm text-rose-700">{{ receiptError }}</p>
      <p v-if="!receiptTelegramChatId" class="text-sm text-amber-700">Telegram yuborish uchun klient kartasiga chat ID kiriting.</p>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <NuxtLink v-if="receiptTelegramLink" :to="receiptTelegramLink" target="_blank" class="btn-secondary">TG profil</NuxtLink>
        <button type="button" class="btn-secondary" @click="copyReceiptMessage">Copy</button>
        <button type="button" class="btn-primary" :disabled="!receiptTelegramChatId || receiptSending || !isAdmin" @click="sendReceiptTelegram">
          {{ receiptSending ? 'Yuborilmoqda...' : 'Telegram yuborish' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
