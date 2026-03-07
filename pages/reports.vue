<script setup lang="ts">
import type { FactoryName } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { factoryOptions, buildSummary } = useFactoryAccounting()
const { formatSom, formatTons } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: ''
})

const summary = computed(() => buildSummary(filters.startDate, filters.endDate, filters.factory as FactoryName | ''))

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
      productionComponentTotals: summary.value.productionComponentTotals
    },
    factoryBreakdown: summary.value.factoryBreakdown,
    topClients: summary.value.topClients,
    clientProfitRows: summary.value.clientProfitRows
  }

  downloadFile(JSON.stringify(payload, null, 2), 'kunlik-hisobot.json', 'application/json')
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
    ['foodCost', summary.value.productionComponentTotals.food],
    ['electricityCost', summary.value.productionComponentTotals.electricity],
    ['loadingCost', summary.value.productionComponentTotals.loading]
  ]

  const csv = rows.map((row) => row.join(',')).join('\n')
  downloadFile(csv, 'kunlik-hisobot.csv', 'text/csv')
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">Hisobotlar</h2>
      <p class="page-subtitle">Sana oralig'i bo'yicha kirim, tannarx, sotuv va foydani ko'ring.</p>
    </div>

    <div class="flex gap-2">
      <button type="button" class="btn-secondary" @click="exportCsv">CSV export</button>
      <button type="button" class="btn-primary" @click="exportJson">JSON export</button>
    </div>
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-4">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.factory" label="Zavod" :options="factoryOptions" placeholder="Hamma zavod" />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full" @click="clearFilters">Filtrni tozalash</button>
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

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
    <StatCard title="Sotilgan yuk" :value="formatTons(summary.totalSoldTons)" subtitle="oylik sotuv" />
    <StatCard title="Tosh sarfi" :value="formatTons(summary.totalUsedStoneTons)" subtitle="ishlatilgan tosh" />
    <StatCard title="Qop" :value="summary.totalNewBags" subtitle="ishlatilgan yangi qop" />
    <StatCard title="Ishchi" :value="formatSom(summary.productionComponentTotals.worker)" subtitle="avtomatik ishlab chiqarish" />
    <StatCard title="Pitaniya" :value="formatSom(summary.productionComponentTotals.food)" subtitle="ovqat xarajati" />
    <StatCard title="Svet" :value="formatSom(summary.productionComponentTotals.electricity)" subtitle="elektr energiya" />
    <StatCard title="Ortib berish" :value="formatSom(summary.productionComponentTotals.loading)" subtitle="faqat qoplik" />
    <StatCard title="Boshqa chiqim" :value="formatSom(summary.totalOperationalExpenses)" subtitle="qo'shimcha xarajatlar" />
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
</template>
