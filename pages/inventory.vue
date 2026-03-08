<script setup lang="ts">
import type { FactoryName } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { factoryOptions, buildSummary } = useFactoryAccounting()
const { formatTons } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()
const { t } = useUiLocale()

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: ''
})

const summary = computed(() => buildSummary(filters.startDate, filters.endDate, filters.factory as FactoryName | ''))

const balanceColumns: TableColumn[] = [
  { key: 'factory', label: 'Zavod' },
  { key: 'stoneBalance', label: 'Tosh qoldiq', align: 'right' },
  { key: 'productBalance', label: 'Tayyor yuk', align: 'right' },
  { key: 'remainingBaggedTons', label: 'Qoplik qoldiq', align: 'right' },
  { key: 'remainingBulkTons', label: 'Rasipnoy qoldiq', align: 'right' }
]

const balanceRows = computed<Record<string, unknown>[]>(() => [...summary.value.factoryBreakdown])

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.factory = ''
}

const balanceClass = (value: number) => (value < 0 ? 'text-rose-700' : 'text-emerald-700')
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Ostatka') }}</h2>
      <p class="page-subtitle">
        {{ t("Qancha tosh, qoplik va rasipnoy qolganini shu yerda ko'rasiz. Manfiy chiqsa kamomad bor.") }}
      </p>
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

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Tosh qoldiq" :value="formatTons(summary.remainingStoneTons)" subtitle="kirim - sarf">
      <template #icon>TS</template>
    </StatCard>
    <StatCard title="Tayyor yuk" :value="formatTons(summary.remainingProductTons)" subtitle="ishlab chiqdi - sotildi">
      <template #icon>TY</template>
    </StatCard>
    <StatCard title="Qoplik qoldiq" :value="formatTons(summary.remainingBaggedTons)" subtitle="ombordagi qoplik">
      <template #icon>QP</template>
    </StatCard>
    <StatCard title="Rasipnoy qoldiq" :value="formatTons(summary.remainingBulkTons)" subtitle="ombordagi rasipnoy">
      <template #icon>RS</template>
    </StatCard>
    <StatCard title="Ishlatilgan qop" :value="summary.totalNewBags" subtitle="jami sarflangan qop">
      <template #icon>QB</template>
    </StatCard>
  </section>

  <section class="grid gap-4 lg:grid-cols-3">
    <article class="panel p-5 lg:col-span-2">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t("Zavodlar bo'yicha ostatka") }}</h3>
        <p class="text-xs text-slate-500">{{ t("Har bir zavodda qolgan tosh va tayyor yuk ko'rinadi.") }}</p>
      </header>

      <AppTable :columns="balanceColumns" :rows="balanceRows" empty-text="Tanlangan davrda ostatka ma'lumoti topilmadi.">
        <template #cell-stoneBalance="{ value }">
          <span :class="['font-semibold', balanceClass(Number(value))]">
            {{ formatTons(Number(value)) }}
          </span>
        </template>

        <template #cell-productBalance="{ value }">
          <span :class="['font-semibold', balanceClass(Number(value))]">
            {{ formatTons(Number(value)) }}
          </span>
        </template>

        <template #cell-remainingBaggedTons="{ value }">
          <span :class="['font-semibold', balanceClass(Number(value))]">
            {{ formatTons(Number(value)) }}
          </span>
        </template>

        <template #cell-remainingBulkTons="{ value }">
          <span :class="['font-semibold', balanceClass(Number(value))]">
            {{ formatTons(Number(value)) }}
          </span>
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Qanday hisoblanadi') }}</h3>
      </header>

      <div class="space-y-3 text-sm text-slate-600">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="font-semibold text-slate-900">Tosh qoldiq</p>
          <p class="mt-1">Kirim tosh - ishlab chiqarishda ketgan tosh</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="font-semibold text-slate-900">Tayyor yuk</p>
          <p class="mt-1">Ishlab chiqarilgan mahsulot - klientga sotilgan yuk</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="font-semibold text-slate-900">Qoplik qoldiq</p>
          <p class="mt-1">Qoplik ishlab chiqdi - qoplik sotildi</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="font-semibold text-slate-900">Rasipnoy qoldiq</p>
          <p class="mt-1">Rasipnoy ishlab chiqdi - rasipnoy sotildi</p>
        </div>
      </div>
    </article>
  </section>
</template>
