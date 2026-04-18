<script setup lang="ts">
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { latestDate, todaySummary, overallSummary, todayFactoryBreakdown, recentSales, recentLoads, recentExpenses, buildSummary } =
  useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { getSupplierChipClass } = useSupplierHighlight()
const { t } = useUiLocale()
const dashboardWindowDays = ref<15 | 30>(15)

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
const subtractDays = (dateValue: string, days: number) => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}
const dashboardWindowStart = computed(() => subtractDays(latestDate.value, dashboardWindowDays.value - 1))
const dashboardWindowSummary = computed(() => buildSummary(dashboardWindowStart.value, latestDate.value))
const dashboardWindowLabel = computed(() => `${formatDate(dashboardWindowStart.value)} - ${formatDate(latestDate.value)}`)
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

const dashboardAlerts = computed(() => {
  const summary = dashboardWindowSummary.value
  const alerts: Array<{ level: 'danger' | 'warning' | 'ok'; title: string; message: string }> = []

  if (summary.extraExpensesTotal > summary.totalRevenue && summary.extraExpensesTotal > 0) {
    alerts.push({
      level: 'danger',
      title: "Harajat ko'payib ketdi",
      message: `Kelgan puldan harajat ko'p bo'ldi: ${formatSom(summary.extraExpensesTotal)} xarajat, ${formatSom(summary.totalRevenue)} tushum.`
    })
  }

  if (summary.moneyOutTotal > summary.moneyInTotal && summary.moneyOutTotal > 0) {
    alerts.push({
      level: 'warning',
      title: "Pul chiqimi oshib ketdi",
      message: `Pul chiqimi kirimdan ko'p: ${formatSom(summary.moneyOutTotal)} chiqim, ${formatSom(summary.moneyInTotal)} kirim.`
    })
  }

  if (summary.totalProfit < 0) {
    alerts.push({
      level: 'danger',
      title: 'Davr zarar bilan ishladi',
      message: `${dashboardWindowDays.value} kunlik natija manfiy: ${formatSom(summary.totalProfit)}.`
    })
  }

  if (summary.totalDebt > 0 && summary.totalRevenue > 0 && summary.totalDebt >= summary.totalRevenue * 0.35) {
    alerts.push({
      level: 'warning',
      title: "Qarz ko'payib ketdi",
      message: `Ochiq qarz ${formatSom(summary.totalDebt)} ga chiqdi. Bu tushumga nisbatan yuqori.`
    })
  }

  if (!alerts.length) {
    alerts.push({
      level: 'ok',
      title: 'Nazorat joyida',
      message: `${dashboardWindowDays.value} kunlik hisobda xavfli og'ish ko'rinmadi.`
    })
  }

  return alerts
})

const saleRows = computed<Record<string, unknown>[]>(() => [...recentSales.value])
const loadRows = computed<Record<string, unknown>[]>(() => [...recentLoads.value])
const expenseRows = computed<Record<string, unknown>[]>(() => [...recentExpenses.value])
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
    <article class="panel overflow-hidden p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-3">
          <span class="data-chip">{{ t('Oxirgi sana') }}: {{ latestDateLabel }}</span>
          <div>
            <h2 class="page-title">{{ t('Ming Bir Hazina uchun kunlik hisob') }}</h2>
            <p class="page-subtitle">
              {{ t("Oybek va Jamshid zavodlarining tosh kirimi, sarf, sotuv va foydasi bir joyda.") }}
            </p>
          </div>
        </div>

        <div class="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div class="rounded-2xl bg-sky-50 px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-sky-700">{{ t('Bugungi kirim') }}</p>
            <p class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(todaySummary.totalOutputTons) }}</p>
          </div>
          <div class="rounded-2xl bg-slate-100 px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-slate-700">{{ t('Bugungi tosh sarfi') }}</p>
            <p class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(todaySummary.totalUsedStoneTons) }}</p>
          </div>
          <div class="rounded-2xl bg-amber-50 px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-amber-700">{{ t('Bugungi sotuv') }}</p>
            <p class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(todaySummary.totalSoldTons) }}</p>
          </div>
        </div>
      </div>
    </article>

    <article class="panel p-6">
      <p class="text-sm font-semibold text-slate-700">{{ t("Bugungi qisqa ko'rinish") }}</p>
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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ t("15/30 kunlik nazorat") }}</h3>
        <p class="text-sm text-slate-500">{{ dashboardWindowLabel }}</p>
      </div>

      <div class="flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="dashboardWindowDays === 15 ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-600'"
          @click="dashboardWindowDays = 15"
        >
          15 kun
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="dashboardWindowDays === 30 ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-600'"
          @click="dashboardWindowDays = 30"
        >
          30 kun
        </button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard :title="`${dashboardWindowDays} kun tushum`" :value="formatSom(dashboardWindowSummary.totalRevenue)" subtitle="sotuv bo'yicha" />
      <StatCard :title="`${dashboardWindowDays} kun harajat`" :value="formatSom(dashboardWindowSummary.extraExpensesTotal)" subtitle="qo'shimcha xarajat" />
      <StatCard :title="`${dashboardWindowDays} kun foyda`" :value="formatSom(dashboardWindowSummary.totalProfit)" subtitle="tushum - tannarx - harajat" />
      <StatCard :title="`${dashboardWindowDays} kun qarz`" :value="formatSom(dashboardWindowSummary.totalDebt)" subtitle="ochiq qoldiq" />
    </div>

    <div class="grid gap-3">
      <article
        v-for="(alert, index) in dashboardAlerts"
        :key="`${alert.title}-${index}`"
        class="rounded-2xl border px-4 py-3"
        :class="
          alert.level === 'danger'
            ? 'border-rose-200 bg-rose-50'
            : alert.level === 'warning'
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
        "
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              class="text-sm font-semibold"
              :class="
                alert.level === 'danger'
                  ? 'text-rose-700'
                  : alert.level === 'warning'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              "
            >
              {{ alert.title }}
            </p>
            <p class="mt-1 text-sm text-slate-700">{{ alert.message }}</p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="
              alert.level === 'danger'
                ? 'bg-rose-100 text-rose-700'
                : alert.level === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            "
          >
            Eslatma
          </span>
        </div>
      </article>
    </div>
  </section>

  <section class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900">{{ t("Pul qoldig'i") }}</h3>
      <p class="text-sm text-slate-500">{{ t("To'lovlar tarixi va chiqimlar bo'yicha joriy summa.") }}</p>
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
      <h3 class="text-base font-semibold text-slate-900">{{ t("Ishchi to'lovi tartibi") }}</h3>
      <p class="text-sm text-slate-500">{{ t("Jamshid kunlik beriladi, Oybek esa oy oxirigacha yig'iladi.") }}</p>
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
          <p class="text-xs uppercase tracking-wide text-brand-600">{{ t(card.factory) }} {{ t('zavod') }}</p>
          <h3 class="mt-1 text-xl font-bold text-slate-900">{{ formatTons(card.outputTons) }}</h3>
          <p class="text-sm text-slate-500">{{ t('Bugungi ishlab chiqish') }}</p>
        </div>
        <span class="data-chip">{{ t('Sotildi') }}: {{ formatTons(card.soldTons) }}</span>
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
    <article class="panel min-w-0 overflow-hidden p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('Oxirgi sotuvlar') }}</h3>
          <p class="text-xs text-slate-500">{{ t('Kimga necha tonna ketgani') }}</p>
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

    <article class="panel min-w-0 overflow-hidden p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('Oxirgi kirimlar') }}</h3>
          <p class="text-xs text-slate-500">{{ t('Howo yoki Kamazda kelgan tosh') }}</p>
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

    <article class="panel min-w-0 overflow-hidden p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('Oxirgi chiqimlar') }}</h3>
          <p class="text-xs text-slate-500">{{ t('Svet, ishchi, bozorlik va boshqa chiqimlar') }}</p>
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
