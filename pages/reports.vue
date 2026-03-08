<script setup lang="ts">
import type { FactoryName, MonthlyArchiveRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { factoryOptions, buildSummary, monthlyArchiveRecords } = useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()
const { downloadWorkbook } = useExcelExport()
const { printWorkbook } = usePdfExport()
const { t } = useUiLocale()

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: ''
})

const summary = computed(() => buildSummary(filters.startDate, filters.endDate, filters.factory as FactoryName | ''))
const jamshidWorkerSummary = computed(
  () => summary.value.workerPaymentByFactory.find((item) => item.factory === 'Jamshid') ?? null
)
const oybekWorkerSummary = computed(
  () => summary.value.workerPaymentByFactory.find((item) => item.factory === 'Oybek') ?? null
)

const factoryColumns: TableColumn[] = [
  { key: 'factory', label: 'Zavod' },
  { key: 'incomingTons', label: 'Kirim', align: 'right' },
  { key: 'outputTons', label: 'Mahsulot', align: 'right' },
  { key: 'soldTons', label: 'Sotildi', align: 'right' },
  { key: 'revenue', label: 'Tushum', align: 'right' },
  { key: 'debt', label: 'Qarz', align: 'right' },
  { key: 'cost', label: 'Tannarx', align: 'right' },
  { key: 'profit', label: 'Foyda', align: 'right' }
]

const clientColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'revenue', label: 'Tushum', align: 'right' },
  { key: 'debt', label: 'Qarz', align: 'right' }
]

const profitColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'revenue', label: 'Tushum', align: 'right' },
  { key: 'estimatedCost', label: 'Tannarx', align: 'right' },
  { key: 'allocatedExpenses', label: 'Qo`shimcha chiqim', align: 'right' },
  { key: 'estimatedProfit', label: 'Foyda', align: 'right' },
  { key: 'orderCount', label: 'Yuk soni', align: 'right' }
]

const monthlyArchiveColumns: TableColumn[] = [
  { key: 'title', label: 'Arxiv' },
  { key: 'period', label: 'Davr' },
  { key: 'factoryScope', label: 'Kesim' },
  { key: 'producedTons', label: 'Ishlab chiqdi', align: 'right' },
  { key: 'shippedTons', label: 'Sotildi', align: 'right' },
  { key: 'stonePaymentTotal', label: 'Toshga pul', align: 'right' },
  { key: 'incomingMoneyTotal', label: 'Kelgan pul', align: 'right' },
  { key: 'declaredExpenseTotal', label: 'Rasxod', align: 'right' },
  { key: 'declaredProfitTotal', label: 'Foyda', align: 'right' }
]

const monthlyArchiveItemColumns: TableColumn[] = [
  { key: 'label', label: 'Nomi' },
  { key: 'sectionLabel', label: 'Turi' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'note', label: 'Izoh' }
]

const archiveFactoryLabels = {
  combined: 'Ikkala zavod',
  Oybek: 'Oybek',
  Jamshid: 'Jamshid'
} as const

const archiveSectionLabels = {
  income: 'Kirim',
  expense: 'Chiqim',
  note: 'Eslatma'
} as const

const factoryRows = computed<Record<string, unknown>[]>(() => [...summary.value.factoryBreakdown])
const clientRows = computed<Record<string, unknown>[]>(() => [...summary.value.topClients])
const profitRows = computed<Record<string, unknown>[]>(() => [...summary.value.clientProfitRows])
const productionCostRows = computed<Record<string, unknown>[]>(() => [
  { label: 'Ishchi', value: summary.value.productionComponentTotals.worker },
  { label: 'Ortib berish', value: summary.value.productionComponentTotals.loading },
  { label: 'Ovqat', value: summary.value.productionComponentTotals.food },
  { label: 'Boshqaruvchi', value: summary.value.productionComponentTotals.supervisor },
  { label: 'Svet', value: summary.value.productionComponentTotals.electricity },
  { label: 'Tosh', value: summary.value.productionComponentTotals.stone },
  { label: 'Qop', value: summary.value.productionComponentTotals.bag }
])

const archiveMatchesFilters = (record: MonthlyArchiveRecord) => {
  if (filters.startDate && record.endDate < filters.startDate) {
    return false
  }

  if (filters.endDate && record.startDate > filters.endDate) {
    return false
  }

  if (filters.factory && record.factoryScope !== 'combined' && record.factoryScope !== filters.factory) {
    return false
  }

  return true
}

const filteredMonthlyArchives = computed(() =>
  monthlyArchiveRecords.value
    .filter((record) => archiveMatchesFilters(record))
    .slice()
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
)

const activeMonthlyArchiveId = ref('')

watch(
  filteredMonthlyArchives,
  (records) => {
    if (!records.some((record) => record.id === activeMonthlyArchiveId.value)) {
      activeMonthlyArchiveId.value = records[0]?.id ?? ''
    }
  },
  { immediate: true }
)

const activeMonthlyArchive = computed(
  () => filteredMonthlyArchives.value.find((record) => record.id === activeMonthlyArchiveId.value) ?? filteredMonthlyArchives.value[0] ?? null
)

const monthlyArchiveRows = computed<Record<string, unknown>[]>(() =>
  filteredMonthlyArchives.value.map((record) => ({
    id: record.id,
    title: record.title,
    period: `${formatDate(record.startDate)} - ${formatDate(record.endDate)}`,
    factoryScope: archiveFactoryLabels[record.factoryScope],
    producedTons: record.producedTons,
    shippedTons: record.shippedTons,
    stonePaymentTotal: record.stonePaymentTotal,
    incomingMoneyTotal: record.incomingMoneyTotal,
    declaredExpenseTotal: record.declaredExpenseTotal,
    declaredProfitTotal: record.declaredProfitTotal
  }))
)

const monthlyArchiveItemRows = computed<Record<string, unknown>[]>(() =>
  (activeMonthlyArchive.value?.items ?? []).map((item, index) => ({
    id: `${activeMonthlyArchive.value?.id ?? 'archive'}-${index}`,
    label: item.label,
    sectionLabel: archiveSectionLabels[item.section],
    amount: item.amount,
    note: item.note
  }))
)

const selectMonthlyArchive = (archiveId: string) => {
  activeMonthlyArchiveId.value = archiveId
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.factory = ''
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  if (!import.meta.client) {
    return
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

const exportJson = () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    filters: { ...filters },
    summary: {
      totalIncomingTons: summary.value.totalIncomingTons,
      totalUsedStoneTons: summary.value.totalUsedStoneTons,
      totalOutputTons: summary.value.totalOutputTons,
      totalSoldTons: summary.value.totalSoldTons,
      totalRevenue: summary.value.totalRevenue,
      extraExpensesTotal: summary.value.extraExpensesTotal,
      totalDebt: summary.value.totalDebt,
      totalCost: summary.value.totalCost,
      totalProfit: summary.value.totalProfit,
      totalNewBags: summary.value.totalNewBags,
      productionComponentTotals: summary.value.productionComponentTotals,
      workerPaymentByFactory: summary.value.workerPaymentByFactory
    },
    factoryBreakdown: summary.value.factoryBreakdown,
    topClients: summary.value.topClients,
    clientProfitRows: summary.value.clientProfitRows,
    monthlyArchiveRecords: filteredMonthlyArchives.value
  }

  downloadFile(JSON.stringify(payload, null, 2), 'kunlik-hisobot.json', 'application/json')
}

const buildReportSheets = () => {
  return [
    {
      name: 'Xulosa',
      rows: [
        { metric: 'Kirim tosh', value: Number(summary.value.totalIncomingTons.toFixed(2)) },
        { metric: 'Mahsulot', value: Number(summary.value.totalOutputTons.toFixed(2)) },
        { metric: 'Sotilgan yuk', value: Number(summary.value.totalSoldTons.toFixed(2)) },
        { metric: 'Tushum', value: Math.round(summary.value.totalRevenue) },
        { metric: 'Chiqim', value: Math.round(summary.value.extraExpensesTotal) },
        { metric: 'Qarz', value: Math.round(summary.value.totalDebt) },
        { metric: 'Foyda', value: Math.round(summary.value.totalProfit) },
        { metric: 'Jamshid ishchi (kunlik)', value: Math.round(jamshidWorkerSummary.value?.paidNow ?? 0) },
        { metric: 'Oybek ishchi (oylik)', value: Math.round(oybekWorkerSummary.value?.accrued ?? 0) }
      ]
    },
    {
      name: 'Zavodlar',
      columns: factoryColumns,
      rows: factoryRows.value
    },
    {
      name: 'Klientlar',
      columns: clientColumns,
      rows: clientRows.value
    },
    {
      name: 'Klient foyda',
      columns: profitColumns,
      rows: profitRows.value
    },
    {
      name: 'Oylik arxiv',
      columns: monthlyArchiveColumns,
      rows: monthlyArchiveRows.value
    }
  ]
}

const exportExcel = () => {
  downloadWorkbook('hisobotlar', buildReportSheets())
}

const exportPdf = () => {
  printWorkbook('Hisobotlar', buildReportSheets())
}

const exportCsv = () => {
  const rows = [
    ['metric', 'value'],
    ['totalIncomingTons', summary.value.totalIncomingTons],
    ['totalUsedStoneTons', summary.value.totalUsedStoneTons],
    ['totalOutputTons', summary.value.totalOutputTons],
    ['totalSoldTons', summary.value.totalSoldTons],
    ['totalRevenue', summary.value.totalRevenue],
    ['extraExpensesTotal', summary.value.extraExpensesTotal],
    ['totalDebt', summary.value.totalDebt],
    ['totalCost', summary.value.totalCost],
    ['totalProfit', summary.value.totalProfit],
    ['totalNewBags', summary.value.totalNewBags],
    ['workerCost', summary.value.productionComponentTotals.worker],
    ['jamshidWorkerDaily', jamshidWorkerSummary.value?.paidNow ?? 0],
    ['oybekWorkerMonthly', oybekWorkerSummary.value?.accrued ?? 0],
    ['foodCost', summary.value.productionComponentTotals.food],
    ['electricityCost', summary.value.productionComponentTotals.electricity],
    ['loadingCost', summary.value.productionComponentTotals.loading]
  ]

  if (activeMonthlyArchive.value) {
    rows.push(['archiveTitle', activeMonthlyArchive.value.title])
    rows.push(['archiveProducedTons', activeMonthlyArchive.value.producedTons])
    rows.push(['archiveShippedTons', activeMonthlyArchive.value.shippedTons])
    rows.push(['archiveStonePaymentTotal', activeMonthlyArchive.value.stonePaymentTotal])
    rows.push(['archiveIncomingMoneyTotal', activeMonthlyArchive.value.incomingMoneyTotal])
    rows.push(['archiveDeclaredExpenseTotal', activeMonthlyArchive.value.declaredExpenseTotal])
    rows.push(['archiveDeclaredProfitTotal', activeMonthlyArchive.value.declaredProfitTotal])
  }

  const csv = rows.map((row) => row.join(',')).join('\n')
  downloadFile(csv, 'kunlik-hisobot.csv', 'text/csv')
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Hisobotlar') }}</h2>
      <p class="page-subtitle">{{ t("Sana oralig'i bo'yicha kirim, tannarx, sotuv va foydani ko'ring.") }}</p>
    </div>

    <div class="flex gap-2">
      <ExportActions label="Yuklab olish" @excel="exportExcel" @pdf="exportPdf" />
      <button type="button" class="btn-secondary" @click="exportCsv">{{ t('CSV export') }}</button>
      <button type="button" class="btn-primary" @click="exportJson">{{ t('JSON export') }}</button>
    </div>
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">{{ t('Joriy oy') }}</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">{{ t('Oxirgi 30 kun') }}</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">{{ t('Oxirgi 7 kun') }}</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">{{ t('Hammasi') }}</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-4">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.factory" label="Zavod" :options="factoryOptions" placeholder="Hamma zavod" />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full" @click="clearFilters">{{ t('Filtrni tozalash') }}</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
    <StatCard title="Kirim tosh" :value="formatTons(summary.totalIncomingTons)" subtitle="filtrlangan davr" />
    <StatCard title="Mahsulot" :value="formatTons(summary.totalOutputTons)" subtitle="qoplik + rasipnoy" />
    <StatCard title="Tushum" :value="formatSom(summary.totalRevenue)" subtitle="sotuv bo'yicha" />
    <StatCard title="Chiqim" :value="formatSom(summary.extraExpensesTotal)" subtitle="qo'shimcha xarajat" />
    <StatCard title="Qarz" :value="formatSom(summary.totalDebt)" subtitle="ochiq qoldiq" />
    <StatCard title="Foyda" :value="formatSom(summary.totalProfit)" subtitle="tushum - tannarx" />
  </section>

  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard title="Sotilgan yuk" :value="formatTons(summary.totalSoldTons)" subtitle="oylik sotuv" />
    <StatCard title="Tosh sarfi" :value="formatTons(summary.totalUsedStoneTons)" subtitle="ishlatilgan tosh" />
    <StatCard title="Qop" :value="summary.totalNewBags" subtitle="ishlatilgan yangi qop" />
    <StatCard title="Ishchi" :value="formatSom(summary.productionComponentTotals.worker)" subtitle="avtomatik ishlab chiqarish" />
    <StatCard title="Pitaniya" :value="formatSom(summary.productionComponentTotals.food)" subtitle="ovqat xarajati" />
    <StatCard title="Svet" :value="formatSom(summary.productionComponentTotals.electricity)" subtitle="elektr energiya" />
    <StatCard title="Ortib berish" :value="formatSom(summary.productionComponentTotals.loading)" subtitle="faqat qoplik" />
    <StatCard title="Boshqa chiqim" :value="formatSom(summary.totalOperationalExpenses)" subtitle="qo'shimcha xarajatlar" />
  </section>

  <section class="grid gap-4 sm:grid-cols-2">
    <StatCard title="Jamshid ishchi puli" :value="formatSom(jamshidWorkerSummary?.paidNow ?? 0)" subtitle="har kun beriladi" />
    <StatCard title="Oybek yig'ilgan oylik" :value="formatSom(oybekWorkerSummary?.accrued ?? 0)" subtitle="oy oxiriga yig'iladi" />
  </section>

  <section class="grid gap-4 lg:grid-cols-3">
    <ChartCard title="Tushum trendi" subtitle="Sana bo'yicha" type="line" :points="summary.revenueTrend" class="lg:col-span-2" />
    <ChartCard title="Yuk turi" subtitle="Qoplik va rasipnoy" type="pie" :points="summary.shipmentSplit" />
  </section>

  <section class="grid gap-4 lg:grid-cols-3">
    <ChartCard title="Kirim tosh" subtitle="Howo va Kamaz kirimi" type="bar" :points="summary.incomingTrend" />
    <ChartCard title="Tannarx tarkibi" subtitle="Joriy 1 kg avtomatik tarkibi" type="pie" :points="summary.costBreakdown" />
    <ChartCard title="Chiqim kategoriyasi" subtitle="Qo'shimcha chiqimlar kesimi" type="pie" :points="summary.expenseByCategory" />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Zavodlar bo'yicha kesim</h3>
      </header>

      <AppTable :columns="factoryColumns" :rows="factoryRows" empty-text="Tanlangan davrda zavod hisobi topilmadi.">
        <template #cell-incomingTons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-outputTons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-soldTons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-revenue="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-debt="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-cost="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-profit="{ value }">
          {{ formatSom(Number(value)) }}
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Top klientlar</h3>
      </header>

      <AppTable :columns="clientColumns" :rows="clientRows" empty-text="Klientlar bo'yicha ma'lumot topilmadi.">
        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-revenue="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-debt="{ value }">
          <span class="font-semibold text-rose-700">{{ formatSom(Number(value)) }}</span>
        </template>
      </AppTable>
    </article>
  </section>

  <section class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">Ishlab chiqarish breakdown</h3>
      <p class="text-xs text-slate-500">Tanlangan davr ichida avtomatik hisoblangan ishlab chiqarish xarajatlari.</p>
    </header>

    <div class="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
      <div v-for="row in productionCostRows" :key="String(row.label)" class="rounded-2xl bg-slate-50 px-4 py-3">
        <p class="text-xs text-slate-500">{{ row.label }}</p>
        <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(Number(row.value)) }}</p>
      </div>
    </div>
  </section>

  <section class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">Klient bo'yicha foyda</h3>
      <p class="text-xs text-slate-500">Taxminiy foyda: tushum - ishlab chiqarish tannarxi - qo'shimcha chiqim ulushi.</p>
    </header>

    <AppTable :columns="profitColumns" :rows="profitRows" empty-text="Bu davr uchun klient foydasi topilmadi.">
      <template #cell-tons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-revenue="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-estimatedCost="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-allocatedExpenses="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-estimatedProfit="{ value }">
        <span :class="Number(value) >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'">
          {{ formatSom(Number(value)) }}
        </span>
      </template>
    </AppTable>
  </section>

  <section class="panel p-5">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">Qo'lda kiritilgan oylik arxiv</h3>
        <p class="text-xs text-slate-500">Daftardan ko'chirilgan umumiy oy hisobi shu yerda saqlanadi.</p>
      </div>

      <div v-if="activeMonthlyArchive" class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        Tanlangan: {{ activeMonthlyArchive.title }}
      </div>
    </header>

    <AppTable :columns="monthlyArchiveColumns" :rows="monthlyArchiveRows" empty-text="Bu filtr bo'yicha oylik arxiv topilmadi.">
      <template #cell-title="{ row, value }">
        <button
          type="button"
          class="text-left font-semibold transition"
          :class="row.id === activeMonthlyArchive?.id ? 'text-brand-700' : 'text-slate-800 hover:text-brand-700'"
          @click="selectMonthlyArchive(String(row.id))"
        >
          {{ value }}
        </button>
      </template>

      <template #cell-producedTons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-shippedTons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-stonePaymentTotal="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-incomingMoneyTotal="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-declaredExpenseTotal="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-declaredProfitTotal="{ value }">
        {{ formatSom(Number(value)) }}
      </template>
    </AppTable>
  </section>

  <section v-if="activeMonthlyArchive" class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">{{ activeMonthlyArchive.title }}</h3>
      <p class="text-xs text-slate-500">
        {{ formatDate(activeMonthlyArchive.startDate) }} - {{ formatDate(activeMonthlyArchive.endDate) }} ·
        {{ archiveFactoryLabels[activeMonthlyArchive.factoryScope] }}
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard title="Ishlab chiqdi" :value="formatTons(activeMonthlyArchive.producedTons)" subtitle="umumiy ishlab chiqarish" />
      <StatCard title="Sotildi" :value="formatTons(activeMonthlyArchive.shippedTons)" subtitle="ortilgan yuk" />
      <StatCard title="Toshga pul" :value="formatSom(activeMonthlyArchive.stonePaymentTotal)" subtitle="ta'minotchi xarajati" />
      <StatCard title="Kelgan pul" :value="formatSom(activeMonthlyArchive.incomingMoneyTotal)" subtitle="oy bo'yicha kirim" />
      <StatCard title="Rasxod / foyda" :value="formatSom(activeMonthlyArchive.declaredExpenseTotal)" :subtitle="`Foyda: ${formatSom(activeMonthlyArchive.declaredProfitTotal)}`" />
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <article class="rounded-3xl bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tosh ma'lumoti</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeMonthlyArchive.stoneLoadSummary || '-' }}</p>
        <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Izoh</p>
        <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ activeMonthlyArchive.notes || 'Izoh kiritilmagan.' }}</p>
      </article>

      <article class="rounded-3xl bg-amber-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Muhim</p>
        <p class="mt-2 text-sm leading-6 text-amber-900">
          Bu bo'lim kunlik transaction emas. Daftardan olingan umumiy oylik yozuvlar arxiv sifatida saqlanadi va alohida
          hisobot uchun ishlatiladi.
        </p>
      </article>
    </div>

    <div class="mt-4">
      <AppTable :columns="monthlyArchiveItemColumns" :rows="monthlyArchiveItemRows" empty-text="Arxiv itemlari topilmadi.">
        <template #cell-amount="{ row, value }">
          <span
            :class="row.sectionLabel === 'Kirim' ? 'font-semibold text-emerald-700' : row.sectionLabel === 'Chiqim' ? 'font-semibold text-rose-700' : 'font-semibold text-slate-600'"
          >
            {{ formatSom(Number(value)) }}
          </span>
        </template>
      </AppTable>
    </div>
  </section>
</template>
