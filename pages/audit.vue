<script setup lang="ts">
import type { AuditAction, AuditLogRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard',
  middleware: ['pro-admin']
})

const { auditLogs } = useFactoryAccounting()
const { t } = useUiLocale()
const { formatDate } = useFormatting()

const filters = reactive({
  startDate: '',
  endDate: '',
  action: '',
  section: '',
  search: ''
})

const detailModalOpen = ref(false)
const selectedLog = ref<AuditLogRecord | null>(null)

const actionOptions = [
  { label: 'Hamma amal', value: '' },
  { label: "Qo'shildi", value: 'add' },
  { label: 'Tahrirlandi', value: 'update' },
  { label: "O'chirildi", value: 'delete' }
]

const sectionOptions = computed(() => [
  { label: "Hamma bo'lim", value: '' },
  ...Array.from(new Set(auditLogs.value.map((record) => record.section)))
    .sort((left, right) => left.localeCompare(right))
    .map((section) => ({
      label: section,
      value: section
    }))
])

const columns: TableColumn[] = [
  { key: 'createdAt', label: 'Vaqt' },
  { key: 'actorName', label: 'Kim' },
  { key: 'section', label: "Bo'lim" },
  { key: 'actionLabel', label: 'Amal' },
  { key: 'summary', label: 'O`zgarish' },
  { key: 'actions', label: 'Ko`rish', align: 'right' }
]

const actionLabelMap: Record<AuditAction, string> = {
  add: "Qo'shildi",
  update: 'Tahrirlandi',
  delete: "O'chirildi"
}

const actionToneClass = (action: AuditAction) => {
  if (action === 'add') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  if (action === 'delete') {
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  return 'bg-amber-50 text-amber-700 border-amber-200'
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))

const filteredLogs = computed(() => {
  const search = filters.search.trim().toLowerCase()

  return auditLogs.value.filter((record) => {
    const recordDate = record.createdAt.slice(0, 10)

    if (filters.startDate && recordDate < filters.startDate) {
      return false
    }

    if (filters.endDate && recordDate > filters.endDate) {
      return false
    }

    if (filters.action && record.action !== filters.action) {
      return false
    }

    if (filters.section && record.section !== filters.section) {
      return false
    }

    if (search) {
      const haystack = `${record.actorName} ${record.actorUsername} ${record.section} ${record.summary}`.toLowerCase()

      if (!haystack.includes(search)) {
        return false
      }
    }

    return true
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  filteredLogs.value.map((record) => ({
    id: record.id,
    createdAt: record.createdAt,
    actorName: record.actorName,
    actorRole: record.actorRole,
    section: record.section,
    action: record.action,
    actionLabel: actionLabelMap[record.action],
    summary: record.summary
  }))
)

const stats = computed(() => ({
  total: filteredLogs.value.length,
  added: filteredLogs.value.filter((record) => record.action === 'add').length,
  updated: filteredLogs.value.filter((record) => record.action === 'update').length,
  deleted: filteredLogs.value.filter((record) => record.action === 'delete').length
}))

const openDetails = (id: string) => {
  selectedLog.value = auditLogs.value.find((record) => record.id === id) ?? null
  detailModalOpen.value = Boolean(selectedLog.value)
}

const closeDetails = () => {
  detailModalOpen.value = false
  selectedLog.value = null
}

const stringifyPayload = (value: Record<string, unknown> | null) => {
  if (!value) {
    return '-'
  }

  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <div class="space-y-6">
    <section class="panel p-5 sm:p-6">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">{{ t('Audit Log') }}</p>
          <h2 class="mt-2 text-2xl font-black tracking-tight text-slate-900">{{ t('Kim nima o`zgartirganini ko`rish') }}</h2>
          <p class="mt-2 text-sm text-slate-500">{{ t("Qo'shish, tahrirlash va o'chirishlar shu yerda saqlanadi.") }}</p>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Jami log" :value="stats.total" subtitle="filtr bo'yicha yozuvlar" />
      <StatCard title="Qo'shilgan" :value="stats.added" subtitle="yangi yozuvlar" />
      <StatCard title="Tahrirlangan" :value="stats.updated" subtitle="o'zgargan yozuvlar" />
      <StatCard title="O'chirilgan" :value="stats.deleted" subtitle="o'chgan yozuvlar" />
    </section>

    <section class="panel p-5">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
        <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
        <AppSelect v-model="filters.section" label="Bo'lim" :options="sectionOptions" :translate-options="false" />
        <AppSelect v-model="filters.action" label="Amal" :options="actionOptions" :translate-options="false" />
        <AppInput v-model="filters.search" label="Qidiruv" placeholder="Kim yoki nima bo'yicha" />
      </div>
    </section>

    <section class="panel p-5">
      <AppTable :columns="columns" :rows="rows" empty-text="Audit yozuvlari topilmadi.">
        <template #cell-createdAt="{ value }">
          <div class="min-w-[9rem]">
            <p class="font-semibold text-slate-900">{{ formatDate(String(value).slice(0, 10)) }}</p>
            <p class="text-xs text-slate-500">{{ formatDateTime(String(value)) }}</p>
          </div>
        </template>

        <template #cell-actorName="{ row, value }">
          <div>
            <p class="font-semibold text-slate-900">{{ value }}</p>
            <p class="text-xs uppercase tracking-wide text-slate-500">{{ row.actorRole }}</p>
          </div>
        </template>

        <template #cell-actionLabel="{ row, value }">
          <span :class="['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', actionToneClass(row.action as AuditAction)]">
            {{ value }}
          </span>
        </template>

        <template #cell-summary="{ value }">
          <p class="max-w-md text-sm text-slate-700">{{ value }}</p>
        </template>

        <template #cell-actions="{ row }">
          <button type="button" class="btn-secondary px-3 py-2 text-xs" @click="openDetails(String(row.id))">
            {{ t("Ko'rish") }}
          </button>
        </template>
      </AppTable>
    </section>

    <AppModal :open="detailModalOpen" title="Audit tafsiloti" size="lg" @close="closeDetails">
      <div v-if="selectedLog" class="space-y-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Bo`lim') }}</p>
            <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedLog.section }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Kim') }}</p>
            <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedLog.actorName }}</p>
            <p class="text-xs text-slate-500">@{{ selectedLog.actorUsername }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t('Izoh') }}</p>
          <p class="mt-2 text-sm text-slate-700">{{ selectedLog.summary }}</p>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{{ t('Oldingi qiymat') }}</p>
            <pre class="mt-3 overflow-x-auto text-xs leading-6">{{ stringifyPayload(selectedLog.before) }}</pre>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{{ t('Yangi qiymat') }}</p>
            <pre class="mt-3 overflow-x-auto text-xs leading-6">{{ stringifyPayload(selectedLog.after) }}</pre>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <button type="button" class="btn-secondary" @click="closeDetails">{{ t('Yopish') }}</button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
