<script setup lang="ts">
import type { BarterRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const {
  barterRecords,
  supplierSummaries,
  clientSummaries,
  supplierContacts,
  clientOptions,
  latestDate,
  canManageAccounting,
  addBarterRecord,
  updateBarterRecord,
  removeBarterRecord,
  getSupplierProfile,
  getClientProfile
} = useFactoryAccounting()
const { formatSom } = useFormatting()
const { t } = useUiLocale()

const normalizePartyName = (value: string) => value.trim().toLowerCase()

const createForm = reactive({
  date: latestDate.value,
  supplierName: '',
  clientName: '',
  amount: 0,
  notes: ''
})

const editForm = reactive({
  id: '',
  date: latestDate.value,
  supplierName: '',
  clientName: '',
  amount: 0,
  notes: ''
})

const formError = ref('')
const editError = ref('')
const selectedRecord = ref<BarterRecord | null>(null)
const editModalOpen = ref(false)
const deleteDialogOpen = ref(false)

const historyColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'supplierName', label: "Ta'minotchi", headerClass: 'font-bold text-brand-700', cellClass: 'font-bold text-brand-700' },
  { key: 'clientName', label: 'Klient', headerClass: 'font-bold text-brand-700', cellClass: 'font-bold text-brand-700' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'notes', label: 'Izoh' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const supplierOptions = computed(() => {
  const seen = new Set<string>()

  return [...supplierContacts.value.map((contact) => contact.name), ...supplierSummaries.value.map((item) => item.supplierName)]
    .filter((name) => {
      const normalized = normalizePartyName(name)

      if (!normalized || seen.has(normalized)) {
        return false
      }

      seen.add(normalized)
      return true
    })
    .map((name) => ({
      label: name,
      value: name
    }))
})

const historyRows = computed<Record<string, unknown>[]>(() =>
  barterRecords.value
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((record) => ({
      ...record,
      actions: record.id
    }))
)

const summaryTotals = computed(() => {
  const totalBarter = barterRecords.value.reduce((sum, record) => sum + record.amount, 0)
  const supplierDebt = supplierSummaries.value
    .filter((record) => record.balanceType === 'bizdan_qarz')
    .reduce((sum, record) => sum + record.balanceAmount, 0)
  const clientDebt = clientSummaries.value
    .filter((record) => record.balanceType === 'bizga_qarz')
    .reduce((sum, record) => sum + record.balanceAmount, 0)
  const counterpartyCount = new Set(
    barterRecords.value.flatMap((record) => [normalizePartyName(record.supplierName), normalizePartyName(record.clientName)])
  ).size

  return {
    totalBarter,
    supplierDebt,
    clientDebt,
    recordCount: barterRecords.value.length,
    counterpartyCount
  }
})

const sameNameCandidates = computed(() => {
  const clientMap = new Map(clientSummaries.value.map((item) => [normalizePartyName(item.clientName), item]))

  return supplierSummaries.value
    .map((supplier) => {
      const client = clientMap.get(normalizePartyName(supplier.supplierName))

      if (!client) {
        return null
      }

      return {
        name: supplier.supplierName,
        supplier,
        client,
        maxOffset: Math.min(
          supplier.balanceType === 'bizdan_qarz' ? supplier.balanceAmount : 0,
          client.balanceType === 'bizga_qarz' ? client.balanceAmount : 0
        )
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.maxOffset > 0)
    .sort((left, right) => right.maxOffset - left.maxOffset)
    .slice(0, 8)
})

const getAvailableSupplierDebt = (supplierName: string, currentRecord: BarterRecord | null = null) => {
  const summary = getSupplierProfile(supplierName).summary

  if (!summary || summary.balanceType !== 'bizdan_qarz') {
    return 0
  }

  const extra =
    currentRecord && normalizePartyName(currentRecord.supplierName) === normalizePartyName(supplierName) ? currentRecord.amount : 0

  return Number((summary.balanceAmount + extra).toFixed(2))
}

const getAvailableClientDebt = (clientName: string, currentRecord: BarterRecord | null = null) => {
  const summary = getClientProfile(clientName).summary

  if (!summary || summary.balanceType !== 'bizga_qarz') {
    return 0
  }

  const extra =
    currentRecord && normalizePartyName(currentRecord.clientName) === normalizePartyName(clientName) ? currentRecord.amount : 0

  return Number((summary.balanceAmount + extra).toFixed(2))
}

const createSupplierAvailable = computed(() => getAvailableSupplierDebt(createForm.supplierName))
const createClientAvailable = computed(() => getAvailableClientDebt(createForm.clientName))
const createMaxAmount = computed(() => Math.min(createSupplierAvailable.value, createClientAvailable.value))

const currentEditRecord = computed(() => barterRecords.value.find((record) => record.id === editForm.id) ?? null)
const editSupplierAvailable = computed(() => getAvailableSupplierDebt(editForm.supplierName, currentEditRecord.value))
const editClientAvailable = computed(() => getAvailableClientDebt(editForm.clientName, currentEditRecord.value))
const editMaxAmount = computed(() => Math.min(editSupplierAvailable.value, editClientAvailable.value))

const resetCreateForm = () => {
  createForm.date = latestDate.value
  createForm.supplierName = ''
  createForm.clientName = ''
  createForm.amount = 0
  createForm.notes = ''
  formError.value = ''
}

const closeEditModal = () => {
  editModalOpen.value = false
  editForm.id = ''
  editForm.date = latestDate.value
  editForm.supplierName = ''
  editForm.clientName = ''
  editForm.amount = 0
  editForm.notes = ''
  editError.value = ''
}

const saveCreate = () => {
  formError.value = ''

  if (!createForm.date || !createForm.supplierName || !createForm.clientName) {
    formError.value = "Ta'minotchi, klient va sanani tanlang."
    return
  }

  if (Number(createForm.amount) <= 0) {
    formError.value = 'Summa 0 dan katta bo`lishi kerak.'
    return
  }

  if (createMaxAmount.value <= 0) {
    formError.value = "Tanlangan tomonlarda yopiladigan qarz yo'q."
    return
  }

  if (Number(createForm.amount) > createMaxAmount.value) {
    formError.value = `Maksimal yopiladigan summa: ${formatSom(createMaxAmount.value)}`
    return
  }

  addBarterRecord({
    date: createForm.date,
    supplierName: createForm.supplierName,
    clientName: createForm.clientName,
    amount: Number(createForm.amount),
    notes: createForm.notes.trim()
  })

  resetCreateForm()
}

const openEditModal = (row: Record<string, unknown>) => {
  const record = row as BarterRecord

  editForm.id = record.id
  editForm.date = record.date
  editForm.supplierName = record.supplierName
  editForm.clientName = record.clientName
  editForm.amount = record.amount
  editForm.notes = record.notes
  editError.value = ''
  editModalOpen.value = true
}

const saveEdit = () => {
  editError.value = ''

  if (!editForm.id || !editForm.date || !editForm.supplierName || !editForm.clientName) {
    editError.value = "Ta'minotchi, klient va sanani tanlang."
    return
  }

  if (Number(editForm.amount) <= 0) {
    editError.value = 'Summa 0 dan katta bo`lishi kerak.'
    return
  }

  if (editMaxAmount.value <= 0) {
    editError.value = "Tanlangan tomonlarda yopiladigan qarz yo'q."
    return
  }

  if (Number(editForm.amount) > editMaxAmount.value) {
    editError.value = `Maksimal yopiladigan summa: ${formatSom(editMaxAmount.value)}`
    return
  }

  updateBarterRecord({
    id: editForm.id,
    date: editForm.date,
    supplierName: editForm.supplierName,
    clientName: editForm.clientName,
    amount: Number(editForm.amount),
    notes: editForm.notes.trim()
  })

  closeEditModal()
}

const askDelete = (row: Record<string, unknown>) => {
  selectedRecord.value = row as BarterRecord
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!selectedRecord.value) {
    return
  }

  removeBarterRecord(selectedRecord.value.id)
  selectedRecord.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedRecord.value = null
  deleteDialogOpen.value = false
}

const applySameNameCandidate = (name: string, maxOffset: number) => {
  createForm.supplierName = name
  createForm.clientName = name
  createForm.amount = Number(maxOffset.toFixed(2))
}
</script>

<template>
  <section class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Barter DB') }}</h2>
      <p class="page-subtitle">{{ t("Tosh bilan qum yoki mel o'zaro hisobdan yopiladigan yozuvlar shu yerda yuradi.") }}</p>
    </div>
  </section>

  <AdminReadOnlyBanner v-if="!canManageAccounting" />

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Barter yozuvlari" :value="summaryTotals.recordCount" subtitle="jami yozuvlar" />
    <StatCard title="Jami barter" :value="formatSom(summaryTotals.totalBarter)" subtitle="o'zaro yopilgan summa" />
    <StatCard title="Ta'minotchi qarzi" :value="formatSom(summaryTotals.supplierDebt)" subtitle="hali biz qarzmiz" />
    <StatCard title="Klient qarzi" :value="formatSom(summaryTotals.clientDebt)" subtitle="hali bizga qarz" />
    <StatCard title="Tomonlar" :value="summaryTotals.counterpartyCount" subtitle="ishtirok etgan nomlar" />
  </section>

  <section v-if="canManageAccounting" class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">{{ t('Barter yozuvi qo`shish') }}</h3>
      <p class="text-sm text-slate-500">{{ t("Pul bermasdan, tosh qarzini qum yoki mel bilan yopilgan summani shu yerga yozing.") }}</p>
    </header>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <AppInput v-model="createForm.date" type="date" label="Sana" />
      <AppSelect
        v-model="createForm.supplierName"
        label="Ta'minotchi"
        :options="supplierOptions"
        :translate-options="false"
        placeholder="Ta'minotchini tanlang"
      />
      <AppSelect
        v-model="createForm.clientName"
        label="Klient"
        :options="clientOptions"
        :translate-options="false"
        :searchable="true"
        placeholder="Klientni tanlang"
      />
      <AppInput v-model="createForm.amount" type="number" min="0" step="0.01" label="Summa" />
      <AppInput v-model="createForm.notes" label="Izoh" placeholder="Masalan, tosh o'rniga qum bilan yopildi" />
    </div>

    <div class="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
      <div>
        <p class="text-xs text-slate-500">Ta'minotchi bo'yicha ochiq qarz</p>
        <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(createSupplierAvailable) }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Klient bo'yicha ochiq qarz</p>
        <p class="mt-1 text-sm font-semibold text-sky-700">{{ formatSom(createClientAvailable) }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Maksimal barter</p>
        <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatSom(createMaxAmount) }}</p>
      </div>
    </div>

    <p v-if="formError" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ formError }}
    </p>

    <div class="mt-4 flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="resetCreateForm">{{ t('Tozalash') }}</button>
      <button type="button" class="btn-primary" @click="saveCreate">{{ t("Barter yozuvini qo'shish") }}</button>
    </div>
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
    <article class="panel min-w-0 p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t("Mos tomonlar") }}</h3>
        <p class="text-sm text-slate-500">{{ t("Bir xil nom bilan ham supplier, ham klient bo'lgan tomonlar.") }}</p>
      </header>

      <div v-if="sameNameCandidates.length" class="space-y-3">
        <button
          v-for="candidate in sameNameCandidates"
          :key="candidate.name"
          type="button"
          class="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
          @click="applySameNameCandidate(candidate.name, candidate.maxOffset)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-brand-700">{{ candidate.name }}</p>
              <p class="mt-1 text-xs text-slate-500">
                Ta'minotchi qarzi {{ formatSom(candidate.supplier.balanceAmount) }} · Klient qarzi {{ formatSom(candidate.client.balanceAmount) }}
              </p>
            </div>
            <span class="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              {{ formatSom(candidate.maxOffset) }}
            </span>
          </div>
        </button>
      </div>

      <p v-else class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        {{ t("Hozircha barterga mos ochiq juftlik topilmadi.") }}
      </p>
    </article>

    <article class="panel min-w-0 p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Barter tarixi') }}</h3>
        <p class="text-sm text-slate-500">{{ t("Qachon, kim bilan va qancha summa o'zaro yopilganini shu yerda ko'rasiz.") }}</p>
      </header>

      <AppTable :columns="historyColumns" :rows="historyRows" empty-text="Barter yozuvlari topilmadi.">
        <template #cell-amount="{ value }">
          {{ formatSom(Number(value ?? 0)) }}
        </template>

        <template #cell-actions="{ row }">
          <div v-if="canManageAccounting" class="flex justify-end gap-2">
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" @click="openEditModal(row)">{{ t('Tahrirlash') }}</button>
            <button type="button" class="btn-danger px-3 py-1.5 text-xs" @click="askDelete(row)">{{ t("O'chirish") }}</button>
          </div>
          <span v-else class="text-xs text-slate-400">-</span>
        </template>
      </AppTable>
    </article>
  </section>

  <AppModal :open="editModalOpen" title="Barter yozuvini tahrirlash" @close="closeEditModal">
    <div class="grid gap-4 md:grid-cols-2">
      <AppInput v-model="editForm.date" type="date" label="Sana" />
      <AppInput v-model="editForm.amount" type="number" min="0" step="0.01" label="Summa" />
      <AppSelect
        v-model="editForm.supplierName"
        label="Ta'minotchi"
        :options="supplierOptions"
        :translate-options="false"
        placeholder="Ta'minotchini tanlang"
      />
      <AppSelect
        v-model="editForm.clientName"
        label="Klient"
        :options="clientOptions"
        :translate-options="false"
        :searchable="true"
        placeholder="Klientni tanlang"
      />
      <div class="md:col-span-2">
        <AppInput v-model="editForm.notes" label="Izoh" placeholder="Masalan, mel bilan yopildi" />
      </div>
    </div>

    <div class="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
      <div>
        <p class="text-xs text-slate-500">Ta'minotchi bo'yicha ochiq qarz</p>
        <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(editSupplierAvailable) }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Klient bo'yicha ochiq qarz</p>
        <p class="mt-1 text-sm font-semibold text-sky-700">{{ formatSom(editClientAvailable) }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-500">Maksimal barter</p>
        <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatSom(editMaxAmount) }}</p>
      </div>
    </div>

    <p v-if="editError" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ editError }}
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="closeEditModal">{{ t('Bekor qilish') }}</button>
        <button type="button" class="btn-primary" @click="saveEdit">{{ t('Saqlash') }}</button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Barter yozuvini o'chirish"
    message="Tanlangan barter yozuvini o'chirasizmi?"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />
</template>
