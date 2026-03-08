<script setup lang="ts">
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { latestDate, todaySummary, overallSummary, todayFactoryBreakdown, recentSales, recentLoads, recentExpenses, buildSummary } =
  useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { getSupplierChipClass } = useSupplierHighlight()

const salesColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'clientName', label: 'Klient' },
  { key: 'shipmentType', label: 'Yuk turi' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'totalAmount', label: 'Jami', align: 'right' }
]

const loadColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'vehicleType', label: 'Mashina' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'supplier', label: "Ta'minotchi" }
]

const expenseColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'category', label: 'Kategoriya' },
  { key: 'description', label: 'Tavsif' },
  { key: 'amount', label: 'Summa', align: 'right' }
]

const latestDateLabel = computed(() => formatDate(latestDate.value))
const currentMonthStart = computed(() => `${latestDate.value.slice(0, 7)}-01`)
const currentMonthSummary = computed(() => buildSummary(currentMonthStart.value, latestDate.value))
const jamshidDailyWorker = computed(
  () => todaySummary.value.workerPaymentByFactory.find((item) => item.factory === 'Jamshid')?.paidNow ?? 0
)
const oybekMonthlyWorker = computed(
  () => currentMonthSummary.value.workerPaymentByFactory.find((item) => item.factory === 'Oybek')?.accrued ?? 0
)

const todayFactoryCards = computed(() =>
  todayFactoryBreakdown.value.map((summary, index) => ({
    factory: index === 0 ? 'Oybek' : 'Jamshid',
    outputTons: summary.totalOutputTons,
    soldTons: summary.totalSoldTons,
    revenue: summary.totalRevenue,
    profit: summary.totalProfit
  }))
)

const paymentMethodCards = computed(() =>
  overallSummary.value.paymentMethodBreakdown.map((item) => ({
    title: item.method,
    value: formatSom(item.balance),
    subtitle: `Kirim ${formatSom(item.incoming)} · Chiqim ${formatSom(item.outgoing)}`
  }))
)

const saleRows = computed<Record<string, unknown>[]>(() => [...recentSales.value])
const loadRows = computed<Record<string, unknown>[]>(() => [...recentLoads.value])
const expenseRows = computed<Record<string, unknown>[]>(() => [...recentExpenses.value])
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
    <article class="panel overflow-hidden p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-3">
          <span class="data-chip">Oxirgi sana: {{ latestDateLabel }}</span>
          <div>
            <h2 class="page-title">Ming Bir Hazina uchun kunlik hisob</h2>
            <p class="page-subtitle">
              Oybek va Jamshid zavodlarining tosh kirimi, sarf, sotuv va foydasi bir joyda.
            </p>
          </div>
        </div>

        <div class="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div class="rounded-2xl bg-sky-50 px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-sky-700">Bugungi kirim</p>
            <p class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(todaySummary.totalIncomingTons) }}</p>
          </div>
          <div class="rounded-2xl bg-amber-50 px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-amber-700">Bugungi sotuv</p>
            <p class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(todaySummary.totalSoldTons) }}</p>
          </div>
        </div>
      </div>
    </article>

    <article class="panel p-6">
      <p class="text-sm font-semibold text-slate-700">Bugungi qisqa ko'rinish</p>
      <div class="mt-4 space-y-3">
        <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <span class="text-sm text-slate-500">Tushum</span>
          <span class="text-lg font-bold text-slate-900">{{ formatSom(todaySummary.totalRevenue) }}</span>
        </div>
        <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <span class="text-sm text-slate-500">Tannarx</span>
          <span class="text-lg font-bold text-slate-900">{{ formatSom(todaySummary.totalCost) }}</span>
        </div>
        <div class="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
          <span class="text-sm text-emerald-700">Foyda</span>
          <span class="text-lg font-bold text-emerald-700">{{ formatSom(todaySummary.totalProfit) }}</span>
        </div>
      </div>
    </article>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Bugungi tushum" :value="formatSom(todaySummary.totalRevenue)" subtitle="klientlardan kirim" />
    <StatCard title="Bugungi foyda" :value="formatSom(todaySummary.totalProfit)" subtitle="tushum - tannarx" />
    <StatCard title="Bugungi chiqim" :value="formatSom(todaySummary.extraExpensesTotal)" subtitle="qo'shimcha xarajat" />
    <StatCard title="Qarz qoldiq" :value="formatSom(overallSummary.totalDebt)" subtitle="ochiq klient qarzi" />
    <StatCard title="Umumiy sotilgan" :value="formatTons(overallSummary.totalSoldTons)" subtitle="hamma yozuvlar" />
  </section>

  <section class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900">Pul qoldig'i</h3>
      <p class="text-sm text-slate-500">To'lovlar tarixi va chiqimlar bo'yicha joriy summa.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Jami pul"
        :value="formatSom(overallSummary.moneyBalanceTotal)"
        :subtitle="`Kirim ${formatSom(overallSummary.moneyInTotal)} · Chiqim ${formatSom(overallSummary.moneyOutTotal)}`"
      />

      <StatCard
        v-for="card in paymentMethodCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :subtitle="card.subtitle"
      />
    </div>
  </section>

  <section class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900">Ishchi to'lovi tartibi</h3>
      <p class="text-sm text-slate-500">Jamshid kunlik beriladi, Oybek esa oy oxirigacha yig'iladi.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <StatCard title="Jamshid bugungi ishchi" :value="formatSom(jamshidDailyWorker)" subtitle="har kun beriladi" />
      <StatCard title="Oybek joriy oy oyligi" :value="formatSom(oybekMonthlyWorker)" subtitle="oy oxiriga yig'iladi" />
    </div>
  </section>

  <section class="grid gap-4 md:grid-cols-2">
    <article
      v-for="card in todayFactoryCards"
      :key="card.factory"
      class="panel bg-gradient-to-br from-white via-white to-sky-50 p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-brand-600">{{ card.factory }} zavod</p>
          <h3 class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(card.outputTons) }}</h3>
          <p class="text-sm text-slate-500">Bugungi ishlab chiqish</p>
        </div>
        <span class="data-chip">Sotildi: {{ formatTons(card.soldTons) }}</span>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Tushum</p>
          <p class="text-lg font-semibold text-slate-900">{{ formatSom(card.revenue) }}</p>
        </div>
        <div class="rounded-2xl bg-emerald-50 px-4 py-3">
          <p class="text-xs text-emerald-700">Foyda</p>
          <p class="text-lg font-semibold text-emerald-700">{{ formatSom(card.profit) }}</p>
        </div>
      </div>
    </article>
  </section>

  <section class="grid gap-4 lg:grid-cols-3">
    <ChartCard
      title="Tushum trendi"
      subtitle="Sana bo'yicha sotuv summasi"
      type="line"
      :points="overallSummary.revenueTrend"
      class="lg:col-span-2"
    />
    <ChartCard
      title="Yuk turi"
      subtitle="Qoplik va rasipnoy"
      type="pie"
      :points="overallSummary.shipmentSplit"
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-3">
    <ChartCard title="Sotilgan tonna trendi" subtitle="Klientlarga chiqqan yuk" type="bar" :points="overallSummary.tonsTrend" />
    <ChartCard title="Kirim tosh trendi" subtitle="Howo va Kamaz kirimi" type="bar" :points="overallSummary.incomingTrend" />
    <ChartCard title="Chiqim trendi" subtitle="Kunlik qo'shimcha chiqimlar" type="bar" :points="overallSummary.expenseTrend" />
  </section>

  <section class="grid gap-4 xl:grid-cols-3">
    <article class="panel p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Oxirgi sotuvlar</h3>
          <p class="text-xs text-slate-500">Kimga necha tonna ketgani</p>
        </div>
      </header>

      <AppTable :columns="salesColumns" :rows="saleRows" empty-text="Sotuv yozuvlari topilmadi.">
        <template #cell-shipmentType="{ value }">
          <span class="data-chip capitalize">{{ value }}</span>
        </template>

        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-totalAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Oxirgi kirimlar</h3>
          <p class="text-xs text-slate-500">Howo yoki Kamazda kelgan tosh</p>
        </div>
      </header>

      <AppTable :columns="loadColumns" :rows="loadRows" empty-text="Kirim yozuvlari topilmadi.">
        <template #cell-vehicleType="{ value }">
          <span class="data-chip">{{ value }}</span>
        </template>

        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-supplier="{ value }">
          <span :class="getSupplierChipClass(value)">{{ value }}</span>
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Oxirgi chiqimlar</h3>
          <p class="text-xs text-slate-500">Svet, ishchi, bozorlik va boshqa chiqimlar</p>
        </div>
      </header>

      <AppTable :columns="expenseColumns" :rows="expenseRows" empty-text="Chiqim yozuvlari topilmadi.">
        <template #cell-category="{ value }">
          <span class="data-chip">{{ value }}</span>
        </template>

        <template #cell-amount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>
      </AppTable>
    </article>
  </section>
</template>
