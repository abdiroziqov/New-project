<script setup lang="ts">
import type { BalanceType, IncomingLoadRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { supplierSummaries, getSupplierProfile } = useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { getSupplierChipClass } = useSupplierHighlight()
const { downloadWorkbook } = useExcelExport()
const { printWorkbook } = usePdfExport()
const { t } = useUiLocale()

const filters = reactive({
  supplier: ''
})

const selectedSupplierName = ref('')

const supplierColumns: TableColumn[] = [
  { key: 'supplierName', label: "Ta'minotchi", headerClass: 'font-bold text-brand-700', cellClass: 'font-bold text-brand-700' },
  { key: 'totalTons', label: 'Jami tosh', align: 'right' },
  { key: 'averagePricePerTon', label: "O'rtacha narx / tonna", align: 'right' },
  { key: 'totalAmount', label: 'Jami summa', align: 'right' },
  { key: 'totalPaid', label: "To'langan", align: 'right' },
  { key: 'balance', label: 'Balans', align: 'right' }
]

const supplierLoadColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'vehicleType', label: 'Mashina' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'pricePerTon', label: 'Narx / tonna', align: 'right' },
  { key: 'totalAmount', label: 'Jami summa', align: 'right' },
  { key: 'paidAmount', label: "To'langan", align: 'right' },
  { key: 'balance', label: 'Balans', align: 'right' }
]

const filteredSuppliers = computed(() =>
  supplierSummaries.value.filter((supplier) => {
    if (!filters.supplier.trim()) {
      return true
    }

    return supplier.supplierName.toLowerCase().includes(filters.supplier.trim().toLowerCase())
  })
)

watch(
  filteredSuppliers,
  (items) => {
    if (!items.length) {
      selectedSupplierName.value = ''
      return
    }

    if (!items.some((item) => item.supplierName === selectedSupplierName.value)) {
      selectedSupplierName.value = items[0].supplierName
    }
  },
  { immediate: true }
)

const selectedSupplierProfile = computed(() => getSupplierProfile(selectedSupplierName.value))
const selectedSupplierSummary = computed(() => selectedSupplierProfile.value.summary)
const selectedSupplierContact = computed(() => selectedSupplierProfile.value.contact)

const summaryTotals = computed(() => ({
  supplierCount: filteredSuppliers.value.length,
  totalTons: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalTons, 0),
  totalAmount: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalAmount, 0),
  totalPaid: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalPaid, 0),
  totalDebt: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalDebt, 0),
  totalAdvance: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalAdvance, 0),
  totalBarter: filteredSuppliers.value.reduce((sum, supplier) => sum + supplier.totalBarter, 0)
}))

const supplierRows = computed<Record<string, unknown>[]>(() =>
  filteredSuppliers.value.map((supplier) => ({
    ...supplier,
    balance: supplier.balanceAmount
  }))
)

const selectedSupplierLoadRows = computed<Record<string, unknown>[]>(() =>
  selectedSupplierProfile.value.recentLoads.map((record) => {
    const advanceAmount = getLoadAdvanceAmount(record.totalAmount, record.paidAmount)
    const balanceType: BalanceType = advanceAmount > 0 ? 'bizga_qarz' : record.remainingAmount > 0 ? 'bizdan_qarz' : 'yopilgan'

    return {
      ...record,
      balance: advanceAmount > 0 ? advanceAmount : record.remainingAmount,
      balanceType
    }
  })
)

const selectSupplier = (supplierName: string) => {
  selectedSupplierName.value = supplierName
}

const clearFilters = () => {
  filters.supplier = ''
}

const buildDirectorySheets = () => [
  {
    name: 'Ta`minotchilar',
    columns: supplierColumns,
    rows: filteredSuppliers.value.map((supplier) => ({
      supplierName: supplier.supplierName,
      totalTons: Number(supplier.totalTons.toFixed(2)),
      averagePricePerTon: Math.round(supplier.averagePricePerTon),
      totalAmount: Math.round(supplier.totalAmount),
      totalPaid: Math.round(supplier.totalPaid),
      balance: Math.round(supplier.balanceAmount),
      balanceLabel: balanceLabel(supplier.balanceType)
    }))
  },
  {
    name: 'Xulosa',
    rows: [
      { metric: "Ta'minotchilar soni", value: summaryTotals.value.supplierCount },
      { metric: 'Jami tosh', value: Number(summaryTotals.value.totalTons.toFixed(2)) },
      { metric: 'Jami summa', value: Math.round(summaryTotals.value.totalAmount) },
      { metric: "Jami to'langan", value: Math.round(summaryTotals.value.totalPaid) },
      { metric: 'Barter', value: Math.round(summaryTotals.value.totalBarter) },
      { metric: 'Biz qarzmiz', value: Math.round(summaryTotals.value.totalDebt) },
      { metric: 'U qarz', value: Math.round(summaryTotals.value.totalAdvance) }
    ]
  }
]

const buildSelectedSupplierSheets = () => {
  if (!selectedSupplierSummary.value) {
    return []
  }

  return [
    {
      name: 'Xulosa',
      rows: [
        { metric: "Ta'minotchi", value: selectedSupplierSummary.value.supplierName },
        { metric: 'Jami tosh', value: Number(selectedSupplierSummary.value.totalTons.toFixed(2)) },
        { metric: "O'rtacha narx / tonna", value: Math.round(selectedSupplierSummary.value.averagePricePerTon) },
        { metric: 'Jami summa', value: Math.round(selectedSupplierSummary.value.totalAmount) },
        { metric: "Jami to'langan", value: Math.round(selectedSupplierSummary.value.totalPaid) },
        { metric: 'Barter', value: Math.round(selectedSupplierSummary.value.totalBarter) },
        { metric: 'Biz qarzmiz', value: Math.round(selectedSupplierSummary.value.totalDebt) },
        { metric: 'U qarz', value: Math.round(selectedSupplierSummary.value.totalAdvance) },
        { metric: 'Balans turi', value: balanceLabel(selectedSupplierSummary.value.balanceType) },
        { metric: 'Balans summa', value: Math.round(selectedSupplierSummary.value.balanceAmount) },
        { metric: 'Telefon', value: selectedSupplierContact.value?.phone ?? '' },
        { metric: 'Manzil', value: selectedSupplierContact.value?.address ?? '' }
      ]
    },
    {
      name: 'Yuklar',
      columns: supplierLoadColumns,
      rows: selectedSupplierProfile.value.recentLoads.map((record) => {
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
          balanceLabel: balanceLabel(balanceType)
        }
      })
    }
  ]
}

const exportDirectoryExcel = () => {
  downloadWorkbook('taminotchilar', buildDirectorySheets())
}

const exportDirectoryPdf = () => {
  printWorkbook("Ta'minotchilar", buildDirectorySheets())
}

const exportSelectedSupplierExcel = () => {
  downloadWorkbook(`${selectedSupplierName.value || 'supplier'}-hisobi`, buildSelectedSupplierSheets())
}

const exportSelectedSupplierPdf = () => {
  printWorkbook(`${selectedSupplierName.value || "Ta'minotchi"} hisobi`, buildSelectedSupplierSheets())
}

const getLoadAdvanceAmount = (totalAmount: number, paidAmount: number) => Math.max(Number((paidAmount - totalAmount).toFixed(2)), 0)

const balanceLabel = (balanceType: unknown) => {
  if (balanceType === 'bizdan_qarz') {
    return 'Biz qarzmiz'
  }

  if (balanceType === 'bizga_qarz') {
    return 'U qarz'
  }

  return 'Yopilgan'
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
</script>

<template>
  <section class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t("Ta'minotchilar") }}</h2>
      <p class="page-subtitle">{{ t("Sizga tosh olib keladigan odamlar va firmalarning umumiy hisoboti.") }}</p>
    </div>

    <ExportActions label="Yuklab olish" @excel="exportDirectoryExcel" @pdf="exportDirectoryPdf" />
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <StatCard title="Ta'minotchilar" :value="summaryTotals.supplierCount" subtitle="faol supplierlar" />
    <StatCard title="Jami tosh" :value="formatTons(summaryTotals.totalTons)" subtitle="butun davr" />
    <StatCard title="Jami summa" :value="formatSom(summaryTotals.totalAmount)" subtitle="hamma kirimlar" />
    <StatCard title="Barter" :value="formatSom(summaryTotals.totalBarter)" subtitle="o'zaro yopilgan" />
    <StatCard title="Biz qarzmiz" :value="formatSom(summaryTotals.totalDebt)" subtitle="supplierlarga qoldiq" />
    <StatCard title="U qarz" :value="formatSom(summaryTotals.totalAdvance)" subtitle="ortiqcha to'lov" />
  </section>

  <section class="panel p-4">
    <div class="grid gap-3 md:grid-cols-[1fr_auto]">
      <AppInput
        v-model="filters.supplier"
        label="Ta'minotchi"
        placeholder="Masalan, Begzod yoki Jorabek"
      />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full md:w-auto" @click="clearFilters">{{ t('Tozalash') }}</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
    <article class="panel min-w-0 p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t("Ta'minotchi ro'yxati") }}</h3>
          <p class="text-xs text-slate-500">{{ t("Butun davr bo'yicha tosh, summa va balans.") }}</p>
        </div>
      </header>

      <AppTable :columns="supplierColumns" :rows="supplierRows" empty-text="Ta'minotchilar topilmadi.">
        <template #cell-supplierName="{ value }">
          <button type="button" :class="['text-left font-bold text-brand-700 hover:underline', getSupplierChipClass(value)]" @click="selectSupplier(String(value))">
            {{ value }}
          </button>
        </template>

        <template #cell-totalTons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-averagePricePerTon="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-totalAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-totalPaid="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-balance="{ row, value }">
          <span :class="['font-semibold', balanceToneClass(row.balanceType)]">
            {{ balanceLabel(row.balanceType) }}: {{ formatSom(Number(value)) }}
          </span>
        </template>
      </AppTable>
    </article>

    <article class="panel min-w-0 p-5">
      <template v-if="selectedSupplierSummary">
        <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ selectedSupplierSummary.supplierName }}</h3>
            <p class="text-xs text-slate-500">{{ t("Ta'minotchi bo'yicha to'liq hisob va yuklar tarixi.") }}</p>
          </div>
          <ExportActions label="Yuklab olish" @excel="exportSelectedSupplierExcel" @pdf="exportSelectedSupplierPdf" />
        </header>

        <div class="grid gap-4 md:grid-cols-5">
          <div class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Jami tosh</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatTons(selectedSupplierSummary.totalTons) }}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">O'rtacha narx / tonna</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatSom(selectedSupplierSummary.averagePricePerTon) }}</p>
          </div>
          <div class="rounded-2xl bg-rose-50 px-4 py-3">
            <p class="text-xs text-rose-700">Biz qarzmiz</p>
            <p class="mt-1 text-lg font-semibold text-rose-700">{{ formatSom(selectedSupplierSummary.totalDebt) }}</p>
          </div>
          <div class="rounded-2xl bg-sky-50 px-4 py-3">
            <p class="text-xs text-sky-700">U qarz</p>
            <p class="mt-1 text-lg font-semibold text-sky-700">{{ formatSom(selectedSupplierSummary.totalAdvance) }}</p>
          </div>
          <div class="rounded-2xl bg-brand-50 px-4 py-3">
            <p class="text-xs text-brand-700">Barter</p>
            <p class="mt-1 text-lg font-semibold text-brand-700">{{ formatSom(selectedSupplierSummary.totalBarter) }}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-4">
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Jami summa</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(selectedSupplierSummary.totalAmount) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Jami to'langan</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(selectedSupplierSummary.totalPaid) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Oxirgi sana</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatDate(selectedSupplierSummary.lastLoadDate) }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Yozuvlar soni</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ selectedSupplierProfile.loadCount }}</p>
          </div>
        </div>

        <div v-if="selectedSupplierContact" class="mt-4 grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Telefon</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedSupplierContact.phone || '-' }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Manzil</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedSupplierContact.address || '-' }}</p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <p class="text-xs text-slate-500">Balans holati</p>
            <p class="mt-1 text-sm font-semibold" :class="balanceToneClass(selectedSupplierSummary.balanceType)">
              {{ balanceLabel(selectedSupplierSummary.balanceType) }}: {{ formatSom(selectedSupplierSummary.balanceAmount) }}
            </p>
          </div>
        </div>

        <div class="mt-4">
          <AppTable :columns="supplierLoadColumns" :rows="selectedSupplierLoadRows" empty-text="Bu ta'minotchi bo'yicha kirim topilmadi.">
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
      </template>

      <div v-else class="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        {{ t("Ta'minotchi tanlang. Shu yerda butun davr bo'yicha tosh, pul va qarz ko'rinadi.") }}
      </div>
    </article>
  </section>
</template>
