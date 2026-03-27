<script setup lang="ts">
import type { ExpenseCategory, FactoryName } from '~/types/accounting'

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
const normalizeText = (value: string) => value.trim().toLowerCase()

const getExpenseTotal = (category: ExpenseCategory) =>
  Number(
    summary.value.expenseRecords
      .filter((record) => record.category === category)
      .reduce((sum, record) => sum + record.amount, 0)
      .toFixed(2)
  )

const shortageTons = computed(() => Math.max(0, Number((-summary.value.remainingProductTons).toFixed(2))))
const profitAmount = computed(() => Math.max(summary.value.totalProfit, 0))
const lossAmount = computed(() => Math.max(-summary.value.totalProfit, 0))
const marketExpense = computed(() => getExpenseTotal('Bozorlik'))
const loadingExpense = computed(() => getExpenseTotal('Yuklash'))
const taxExpense = computed(() => getExpenseTotal('Soliq'))
const otherExpense = computed(() => getExpenseTotal('Boshqa'))
const foodExpense = computed(() => getExpenseTotal('Ovqat'))
const electricityExpense = computed(() => getExpenseTotal('Svet'))
const creditExpense = computed(
  () =>
    getExpenseTotal('Sementovoz kredit') +
    getExpenseTotal('Panel kredit') +
    getExpenseTotal('Kobalt kredit')
)
const oybekWorkerSummary = computed(
  () => summary.value.workerPaymentByFactory.find((item) => item.factory === 'Oybek') ?? null
)
const jamshidWorkerSummary = computed(
  () => summary.value.workerPaymentByFactory.find((item) => item.factory === 'Jamshid') ?? null
)
const oybekAdvanceExpense = computed(() =>
  Number(
    summary.value.expenseRecords
      .filter((record) => {
        const haystack = normalizeText(`${record.description} ${record.notes}`)
        return haystack.includes('oybek') && haystack.includes('avans')
      })
      .reduce((sum, record) => sum + record.amount, 0)
      .toFixed(2)
  )
)
const oybekRemainingSalary = computed(() =>
  Math.max(0, Number(((oybekWorkerSummary.value?.accrued ?? 0) - oybekAdvanceExpense.value).toFixed(2)))
)

const productionCards = computed(() => [
  {
    title: 'Kelgan tosh',
    value: formatTons(summary.value.totalIncomingTons),
    subtitle: 'oy davomida kirgan tosh'
  },
  {
    title: 'Ishlab chiqarilgan',
    value: formatTons(summary.value.totalOutputTons),
    subtitle: 'jami mahsulot chiqdi'
  },
  {
    title: 'Sotilgan yuk',
    value: formatTons(summary.value.totalSoldTons),
    subtitle: 'oy davomida sotildi'
  },
  {
    title: 'Kamomat',
    value: formatTons(shortageTons.value),
    subtitle: 'davr farqi bo`yicha'
  },
  {
    title: 'Tosh sarfi',
    value: formatTons(summary.value.totalUsedStoneTons),
    subtitle: 'ishlatilgan tosh'
  },
  {
    title: 'Qop ishlatilgan',
    value: `${summary.value.totalNewBags} dona`,
    subtitle: 'yangi qop'
  }
])

const financeCards = computed(() => [
  {
    title: 'Oy tushumi',
    value: formatSom(summary.value.totalRevenue),
    tone: 'text-emerald-700'
  },
  {
    title: 'Umumiy harajat',
    value: formatSom(summary.value.totalCost),
    tone: 'text-rose-700'
  },
  {
    title: 'Qo`shimcha harajat',
    value: formatSom(summary.value.extraExpensesTotal),
    tone: 'text-slate-900'
  },
  {
    title: 'Foyda',
    value: formatSom(profitAmount.value),
    tone: 'text-emerald-700'
  },
  {
    title: 'Zarar',
    value: formatSom(lossAmount.value),
    tone: 'text-rose-700'
  },
  {
    title: 'Ochiq qarz',
    value: formatSom(summary.value.totalDebt),
    tone: 'text-amber-700'
  }
])

const expenseCards = computed(() => [
  {
    title: 'Jamshid ishchi jami',
    value: formatSom(jamshidWorkerSummary.value?.amount ?? 0),
    subtitle: 'kunlik hisob bo`yicha'
  },
  {
    title: 'Oybek yig`ilgan oylik',
    value: formatSom(oybekWorkerSummary.value?.accrued ?? 0),
    subtitle: 'oy yakuniga yig`iladi'
  },
  {
    title: 'Oybek avans',
    value: formatSom(oybekAdvanceExpense.value),
    subtitle: '`oybek` + `avans` yozuvlari'
  },
  {
    title: 'Oybek qolgan oylik',
    value: formatSom(oybekRemainingSalary.value),
    subtitle: 'oylikdan avans ayirilgan'
  },
  {
    title: 'Bozorliq',
    value: formatSom(marketExpense.value),
    subtitle: 'oy davomida'
  },
  {
    title: 'Pagruzka',
    value: formatSom(loadingExpense.value),
    subtitle: 'yuklash uchun'
  },
  {
    title: 'Kreditga to`langan',
    value: formatSom(creditExpense.value),
    subtitle: 'sementovoz + panel + kobalt'
  },
  {
    title: 'Soliq',
    value: formatSom(taxExpense.value),
    subtitle: 'oy davomida'
  },
  {
    title: 'Svet',
    value: formatSom(electricityExpense.value),
    subtitle: 'elektr energiya'
  },
  {
    title: 'Ovqat',
    value: formatSom(foodExpense.value),
    subtitle: 'pitaniya'
  },
  {
    title: 'Boshqa harajatlar',
    value: formatSom(otherExpense.value),
    subtitle: 'boshqa kategoriyalar'
  }
])

const factoryCards = computed(() =>
  summary.value.factoryBreakdown.map((item) => ({
    factory: item.factory as FactoryName,
    incomingTons: formatTons(item.incomingTons),
    outputTons: formatTons(item.outputTons),
    soldTons: formatTons(item.soldTons),
    revenue: formatSom(item.revenue),
    cost: formatSom(item.cost),
    profit: formatSom(item.profit)
  }))
)
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

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-bold text-slate-900">{{ t('Ishlab chiqarish') }}</h3>
        <span class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{{ t('Oy yakuni') }}</span>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in productionCards"
          :key="card.title"
          class="panel rounded-[24px] p-5"
        >
          <p class="text-sm font-semibold text-slate-500">{{ t(card.title) }}</p>
          <p class="mt-3 text-3xl font-black tracking-tight text-slate-900">{{ card.value }}</p>
          <p class="mt-2 text-xs text-slate-500">{{ t(card.subtitle) }}</p>
        </article>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-bold text-slate-900">{{ t('Pul natijasi') }}</h3>
        <span class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{{ t('Tushum va harajat') }}</span>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in financeCards"
          :key="card.title"
          class="panel rounded-[24px] p-5"
        >
          <p class="text-sm font-semibold text-slate-500">{{ t(card.title) }}</p>
          <p class="mt-3 text-3xl font-black tracking-tight" :class="card.tone">{{ card.value }}</p>
        </article>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-bold text-slate-900">{{ t('Harajatlar kesimi') }}</h3>
        <span class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{{ t('Kategoriya bo`yicha') }}</span>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in expenseCards"
          :key="card.title"
          class="panel rounded-[24px] p-5"
        >
          <p class="text-sm font-semibold text-slate-500">{{ t(card.title) }}</p>
          <p class="mt-3 text-2xl font-black tracking-tight text-slate-900">{{ card.value }}</p>
          <p class="mt-2 text-xs text-slate-500">{{ t(card.subtitle) }}</p>
        </article>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-bold text-slate-900">{{ t('Zavodlar kesimi') }}</h3>
        <span class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{{ t('Oy bo`yicha') }}</span>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <article
          v-for="item in factoryCards"
          :key="item.factory"
          class="panel rounded-[28px] p-6"
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
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Ishlab chiqarilgan') }}</dt>
              <dd class="mt-2 text-xl font-bold text-slate-900">{{ item.outputTons }}</dd>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Sotilgan yuk') }}</dt>
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
            <div class="rounded-2xl bg-slate-50 p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Foyda') }}</dt>
              <dd class="mt-2 text-xl font-bold text-slate-900">{{ item.profit }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </div>
</template>
