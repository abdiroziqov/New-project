<script setup lang="ts">
import type { FactoryName } from '~/types/accounting'

definePageMeta({
  layout: 'dashboard'
})

const { buildSummary, latestDate } = useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { t } = useUiLocale()

const initialMonth = latestDate.value.slice(0, 7)
const selectedMonth = ref(initialMonth)

const monthStart = computed(() => `${selectedMonth.value}-01`)
const monthEnd = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)

  if (!year || !month) {
    return latestDate.value
  }

  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
})

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)

  if (!year || !month) {
    return selectedMonth.value
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1))
})

const summary = computed(() => buildSummary(monthStart.value, monthEnd.value))

const heroCards = computed(() => [
  {
    title: 'Kelgan tosh',
    value: formatTons(summary.value.totalIncomingTons),
    subtitle: 'oy davomida keldi'
  },
  {
    title: 'Chiqqan yuk',
    value: formatTons(summary.value.totalSoldTons),
    subtitle: 'oy davomida sotildi'
  },
  {
    title: 'Oy tushumi',
    value: formatSom(summary.value.totalRevenue),
    subtitle: 'jami kirgan pul'
  },
  {
    title: 'Oy harajati',
    value: formatSom(summary.value.totalCost),
    subtitle: 'tannarx va chiqim'
  },
  {
    title: 'Oy foydasi',
    value: formatSom(summary.value.totalProfit),
    subtitle: 'oy yakuni natija'
  }
])

const factoryCards = computed(() =>
  summary.value.factoryBreakdown.map((item) => ({
    factory: item.factory as FactoryName,
    incomingTons: formatTons(item.incomingTons),
    soldTons: formatTons(item.soldTons),
    revenue: formatSom(item.revenue),
    cost: formatSom(item.cost),
    profit: formatSom(item.profit)
  }))
)

const secondaryCards = computed(() => [
  {
    title: 'Tosh sarfi',
    value: formatTons(summary.value.totalUsedStoneTons),
    subtitle: 'ishlab chiqarishda ishladi'
  },
  {
    title: 'Mahsulot chiqdi',
    value: formatTons(summary.value.totalOutputTons),
    subtitle: 'oy davomida ishlab chiqdi'
  },
  {
    title: 'Ochiq qarz',
    value: formatSom(summary.value.totalDebt),
    subtitle: 'oy oxiridagi qarz'
  }
])
</script>

<template>
  <div class="space-y-6">
    <section class="panel p-5 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">{{ t('Analiz DB') }}</p>
          <h2 class="text-2xl font-black tracking-tight text-slate-900">{{ monthLabel }}</h2>
          <p class="text-sm text-slate-500">
            {{ formatDate(monthStart) }} - {{ formatDate(monthEnd) }}
          </p>
        </div>

        <div class="w-full max-w-xs">
          <AppInput v-model="selectedMonth" type="month" label="Oy" />
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <article
        v-for="card in heroCards"
        :key="card.title"
        class="panel rounded-[28px] p-5"
      >
        <p class="text-sm font-semibold text-slate-500">{{ t(card.title) }}</p>
        <p class="mt-3 text-3xl font-black tracking-tight text-slate-900">{{ card.value }}</p>
        <p class="mt-2 text-xs text-slate-500">{{ t(card.subtitle) }}</p>
      </article>
    </section>

    <section class="grid gap-4 lg:grid-cols-3">
      <article
        v-for="card in secondaryCards"
        :key="card.title"
        class="panel rounded-[28px] p-5"
      >
        <p class="text-sm font-semibold text-slate-500">{{ t(card.title) }}</p>
        <p class="mt-3 text-2xl font-black tracking-tight text-slate-900">{{ card.value }}</p>
        <p class="mt-2 text-xs text-slate-500">{{ t(card.subtitle) }}</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article
        v-for="item in factoryCards"
        :key="item.factory"
        class="panel rounded-[32px] p-6"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ t('Zavod') }}</p>
            <h3 class="mt-2 text-2xl font-black tracking-tight text-slate-900">{{ item.factory }}</h3>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {{ t('Oy kesimi') }}
          </span>
        </div>

        <dl class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50 p-4">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Kelgan tosh') }}</dt>
            <dd class="mt-2 text-xl font-bold text-slate-900">{{ item.incomingTons }}</dd>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Chiqqan yuk') }}</dt>
            <dd class="mt-2 text-xl font-bold text-slate-900">{{ item.soldTons }}</dd>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Tushum') }}</dt>
            <dd class="mt-2 text-xl font-bold text-emerald-700">{{ item.revenue }}</dd>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Harajat') }}</dt>
            <dd class="mt-2 text-xl font-bold text-rose-700">{{ item.cost }}</dd>
          </div>
        </dl>

        <div class="mt-4 rounded-2xl border border-slate-200 px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm font-semibold text-slate-500">{{ t('Foyda') }}</span>
            <strong :class="['text-xl font-black tracking-tight', item.profit.startsWith('-') ? 'text-rose-700' : 'text-slate-900']">
              {{ item.profit }}
            </strong>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
