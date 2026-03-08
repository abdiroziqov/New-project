<script setup lang="ts">
import type { ScaleCashEntry, ScaleCashType } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { scaleCashEntries, addScaleCashEntry, updateScaleCashEntry, removeScaleCashEntry, canManageAccounting } =
  useFactoryAccounting()
const { formatSom } = useFormatting()
const { t } = useUiLocale()

const getTodayDate = () => new Date().toISOString().slice(0, 10)

const incomingForm = reactive({
  amount: 0
})

const outgoingForm = reactive({
  amount: 0
})

const editForm = reactive({
  amount: 0
})

const formError = ref('')
const selectedEntry = ref<ScaleCashEntry | null>(null)
const editingEntry = ref<ScaleCashEntry | null>(null)
const actionEntry = ref<ScaleCashEntry | null>(null)
const deleteDialogOpen = ref(false)
const editModalOpen = ref(false)
const actionModalOpen = ref(false)

const commonColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const filteredEntries = computed(() =>
  scaleCashEntries.value
    .slice()
    .sort((left, right) => {
      const rightKey = `${right.date} ${right.createdAt}`
      const leftKey = `${left.date} ${left.createdAt}`
      return rightKey.localeCompare(leftKey)
    })
)

const incomingEntries = computed(() => filteredEntries.value.filter((entry) => entry.type === 'kirim'))
const outgoingEntries = computed(() => filteredEntries.value.filter((entry) => entry.type === 'chiqim'))

const summary = computed(() => {
  const incoming = filteredEntries.value
    .filter((entry) => entry.type === 'kirim')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const outgoing = filteredEntries.value
    .filter((entry) => entry.type === 'chiqim')
    .reduce((sum, entry) => sum + entry.amount, 0)

  return {
    incoming: Number(incoming.toFixed(2)),
    outgoing: Number(outgoing.toFixed(2)),
    balance: Number((incoming - outgoing).toFixed(2))
  }
})

const incomingRows = computed<Record<string, unknown>[]>(() => [...incomingEntries.value])
const outgoingRows = computed<Record<string, unknown>[]>(() => [...outgoingEntries.value])

const resetIncomingForm = () => {
  incomingForm.amount = 0
  formError.value = ''
}

const resetOutgoingForm = () => {
  outgoingForm.amount = 0
  formError.value = ''
}

const resetEditState = () => {
  editingEntry.value = null
  editForm.amount = 0
  editModalOpen.value = false
  formError.value = ''
}

const closeActionModal = () => {
  actionEntry.value = null
  actionModalOpen.value = false
}

const saveEntry = (type: ScaleCashType) => {
  if (!canManageAccounting.value) {
    return
  }

  const target = type === 'kirim' ? incomingForm : outgoingForm

  if (Number(target.amount) <= 0) {
    formError.value = 'Summa 0 dan katta bo`lishi kerak.'
    return
  }

  addScaleCashEntry({
    date: getTodayDate(),
    type,
    amount: Number(target.amount),
    paymentMethod: 'Naqd',
    description: type === 'kirim' ? 'Kelgan pul' : 'Chiqqan pul',
    notes: '',
    source: 'manual',
    telegramUpdateId: 0
  })

  formError.value = ''

  if (type === 'kirim') {
    resetIncomingForm()
    return
  }

  resetOutgoingForm()
}

const openActionModal = (row: Record<string, unknown>) => {
  if (!canManageAccounting.value) {
    return
  }

  actionEntry.value = row as ScaleCashEntry
  actionModalOpen.value = true
}

const openEditModal = (row: Record<string, unknown>) => {
  if (!canManageAccounting.value) {
    return
  }

  editingEntry.value = row as ScaleCashEntry
  editForm.amount = Number(editingEntry.value.amount)
  editModalOpen.value = true
  closeActionModal()
}

const saveEdit = () => {
  if (!canManageAccounting.value || !editingEntry.value) {
    return
  }

  if (Number(editForm.amount) <= 0) {
    formError.value = 'Summa 0 dan katta bo`lishi kerak.'
    return
  }

  updateScaleCashEntry({
    ...editingEntry.value,
    amount: Number(editForm.amount)
  })

  formError.value = ''
  resetEditState()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!canManageAccounting.value) {
    return
  }

  selectedEntry.value = row as ScaleCashEntry
  deleteDialogOpen.value = true
  closeActionModal()
}

const confirmDelete = () => {
  if (!selectedEntry.value) {
    return
  }

  removeScaleCashEntry(selectedEntry.value.id)
  selectedEntry.value = null
  deleteDialogOpen.value = false
}

const clearDelete = () => {
  selectedEntry.value = null
  deleteDialogOpen.value = false
}
</script>

<template>
  <section class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Tarozi') }}</h2>
      <p class="page-subtitle">{{ t("Tarozi bo'yicha kelgan pul, chiqqan pul va joriy qoldiq.") }}</p>
    </div>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <StatCard title="Jami pul" :value="formatSom(summary.balance)" subtitle="joriy qoldiq" />
    <StatCard title="Kelgan pul" :value="formatSom(summary.incoming)" subtitle="hamma kirim" />
    <StatCard title="Chiqqan pul" :value="formatSom(summary.outgoing)" subtitle="hamma chiqim" />
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <article class="panel min-w-0 p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Kelgan pul') }}</h3>
        <p class="text-xs text-slate-500">{{ t("Taroziga kirgan pullar shu yerga yoziladi.") }}</p>
      </header>

      <div v-if="canManageAccounting" class="mb-4 grid gap-3 md:grid-cols-2">
        <AppInput v-model="incomingForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <div class="flex items-end justify-end md:justify-start">
          <button type="button" class="btn-primary w-full md:w-auto" @click="saveEntry('kirim')">{{ t("Qo'shish") }}</button>
        </div>
      </div>

      <AppTable :columns="commonColumns" :rows="incomingRows" empty-text="Kelgan pul yozuvlari topilmadi.">
        <template #cell-amount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-actions="{ row }">
          <div v-if="canManageAccounting" class="flex justify-end">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-600 transition hover:bg-slate-50"
              @click="openActionModal(row)"
            >
              ...
            </button>
          </div>
        </template>
      </AppTable>
    </article>

    <article class="panel min-w-0 p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Chiqqan pul') }}</h3>
        <p class="text-xs text-slate-500">{{ t("Tarozidan ishlatilgan yoki chiqqan pullar shu yerga yoziladi.") }}</p>
      </header>

      <div v-if="canManageAccounting" class="mb-4 grid gap-3 md:grid-cols-2">
        <AppInput v-model="outgoingForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <div class="flex items-end justify-end md:justify-start">
          <button type="button" class="btn-primary w-full md:w-auto" @click="saveEntry('chiqim')">{{ t("Qo'shish") }}</button>
        </div>
      </div>

      <AppTable :columns="commonColumns" :rows="outgoingRows" empty-text="Chiqqan pul yozuvlari topilmadi.">
        <template #cell-amount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-actions="{ row }">
          <div v-if="canManageAccounting" class="flex justify-end">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-600 transition hover:bg-slate-50"
              @click="openActionModal(row)"
            >
              ...
            </button>
          </div>
        </template>
      </AppTable>
    </article>
  </section>

  <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
    {{ formError }}
  </p>

  <AppModal :open="actionModalOpen" title="Amal tanlang" size="sm" @close="closeActionModal">
    <div class="grid gap-2">
      <button
        type="button"
        class="btn-secondary w-full justify-center"
        @click="actionEntry && openEditModal(actionEntry)"
      >
        {{ t('Tahrirlash') }}
      </button>
      <button
        type="button"
        class="btn-danger w-full justify-center"
        @click="actionEntry && askDelete(actionEntry)"
      >
        {{ t("O'chirish") }}
      </button>
    </div>
  </AppModal>

  <AppModal :open="editModalOpen" title="Tarozi yozuvini tahrirlash" size="sm" @close="resetEditState">
    <AppInput v-model="editForm.amount" type="number" min="0" step="0.01" label="Summa" />

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetEditState">{{ t('Bekor qilish') }}</button>
        <button type="button" class="btn-primary" @click="saveEdit">{{ t('Saqlash') }}</button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Yozuvni o'chirish"
    message="Tanlangan yozuvni o'chirasizmi?"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="clearDelete"
  />
</template>
