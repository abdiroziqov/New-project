<script setup lang="ts">
import type { FactoryName, ManualDebtRecord, PaymentMethod, ReminderFrequency, SaleRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

type OutstandingEntry = {
  id: string
  entryType: 'sale' | 'manualDebt'
  date: string
  factory: FactoryName
  clientName: string
  tons: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  notes: string
  label: string
  saleRef: SaleRecord | null
  debtRef: ManualDebtRecord | null
}

const {
  sales,
  manualDebts,
  payments,
  paymentMethods,
  reminderFrequencies,
  latestDate,
  clientOptions,
  updateSale,
  addManualDebt,
  updateManualDebt,
  addPayment,
  reminderList,
  getClientReminder,
  upsertReminder,
  markReminderSent,
  buildDebtReminderMessage,
  buildTelegramLink,
  getClientProfile
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()

const manualDebtClientListId = 'manual-debt-client-list'

const filters = reactive({
  search: '',
  startDate: '',
  endDate: ''
})

const paymentModalOpen = ref(false)
const selectedEntry = ref<OutstandingEntry | null>(null)
const paymentError = ref('')
const paymentForm = reactive({
  date: latestDate.value,
  amount: 0,
  paymentMethod: 'Naqd' as PaymentMethod,
  notes: ''
})

const manualDebtModalOpen = ref(false)
const manualDebtError = ref('')
const manualDebtForm = reactive({
  date: latestDate.value,
  clientName: '',
  amount: 0,
  notes: ''
})

const reminderModalOpen = ref(false)
const reminderForm = reactive({
  id: '',
  clientName: '',
  enabled: true,
  frequency: 'daily' as ReminderFrequency,
  time: '08:00',
  notes: ''
})

const telegramModalOpen = ref(false)
const telegramClientName = ref('')
const copiedMessage = ref(false)
const telegramError = ref('')
const telegramSuccess = ref('')
const telegramSending = ref(false)

const debtorColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'phone', label: 'Telefon' },
  { key: 'totalTons', label: 'Tonna', align: 'right' },
  { key: 'totalRevenue', label: 'Jami yozuv', align: 'right' },
  { key: 'totalPaid', label: 'To`langan', align: 'right' },
  { key: 'totalDebt', label: 'Qarz', align: 'right' },
  { key: 'reminder', label: 'TG eslatma' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const invoiceColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'entryTypeLabel', label: 'Turi' },
  { key: 'clientName', label: 'Klient' },
  { key: 'factory', label: 'Zavod' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'totalAmount', label: 'Jami', align: 'right' },
  { key: 'paidAmount', label: 'To`langan', align: 'right' },
  { key: 'remainingAmount', label: 'Qarz', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const paymentColumns: TableColumn[] = [
  { key: 'date', label: 'To`lov sanasi' },
  { key: 'clientName', label: 'Klient' },
  { key: 'factory', label: 'Zavod' },
  { key: 'amount', label: 'Summa', align: 'right' },
  { key: 'paymentMethod', label: 'To`lov turi' },
  { key: 'saleDate', label: 'Asl sana' },
  { key: 'notes', label: 'Izoh' }
]

const reminderColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'phone', label: 'Telefon' },
  { key: 'debt', label: 'Qarz', align: 'right' },
  { key: 'frequencyLabel', label: 'Davriylik' },
  { key: 'time', label: 'Soat' },
  { key: 'lastSentLabel', label: 'Oxirgi TG' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const matchesDateRange = (value: string) => {
  if (filters.startDate && value < filters.startDate) {
    return false
  }

  if (filters.endDate && value > filters.endDate) {
    return false
  }

  return true
}

const normalizedSearch = computed(() => filters.search.trim().toLowerCase())

const filteredOutstandingEntries = computed<OutstandingEntry[]>(() => {
  const saleEntries = sales.value
    .filter((record) => {
      if (record.remainingAmount <= 0) {
        return false
      }

      const haystack = `${record.clientName} ${record.notes}`.toLowerCase()

      if (normalizedSearch.value && !haystack.includes(normalizedSearch.value)) {
        return false
      }

      return matchesDateRange(record.date)
    })
    .map<OutstandingEntry>((record) => ({
      id: record.id,
      entryType: 'sale',
      date: record.date,
      factory: record.factory,
      clientName: record.clientName,
      tons: record.tons,
      totalAmount: record.totalAmount,
      paidAmount: record.paidAmount,
      remainingAmount: record.remainingAmount,
      notes: record.notes,
      label: 'Sotuv',
      saleRef: record,
      debtRef: null
    }))

  const debtEntries = manualDebts.value
    .filter((record) => {
      if (record.remainingAmount <= 0) {
        return false
      }

      const haystack = `${record.clientName} ${record.notes}`.toLowerCase()

      if (normalizedSearch.value && !haystack.includes(normalizedSearch.value)) {
        return false
      }

      return matchesDateRange(record.date)
    })
    .map<OutstandingEntry>((record) => ({
      id: record.id,
      entryType: 'manualDebt',
      date: record.date,
      factory: record.factory,
      clientName: record.clientName,
      tons: 0,
      totalAmount: record.amount,
      paidAmount: record.paidAmount,
      remainingAmount: record.remainingAmount,
      notes: record.notes,
      label: 'Eski qarz',
      saleRef: null,
      debtRef: record
    }))

  return [...saleEntries, ...debtEntries].sort((left, right) => right.date.localeCompare(left.date))
})

const filteredDebtors = computed(() => {
  const summaryMap = new Map<
    string,
    {
      clientName: string
      phone: string
      totalDebt: number
      totalPaid: number
      totalRevenue: number
      totalTons: number
      invoiceCount: number
      lastPurchaseDate: string
      lastFactory: FactoryName
    }
  >()

  filteredOutstandingEntries.value.forEach((entry) => {
    const profile = getClientProfile(entry.clientName)
    const current = summaryMap.get(entry.clientName) ?? {
      clientName: entry.clientName,
      phone: profile.contact?.phone ?? '',
      totalDebt: 0,
      totalPaid: 0,
      totalRevenue: 0,
      totalTons: 0,
      invoiceCount: 0,
      lastPurchaseDate: entry.date,
      lastFactory: entry.factory
    }

    current.totalDebt += entry.remainingAmount
    current.totalPaid += entry.paidAmount
    current.totalRevenue += entry.totalAmount
    current.totalTons += entry.tons
    current.invoiceCount += 1
    current.phone = profile.contact?.phone ?? current.phone

    if (entry.date >= current.lastPurchaseDate) {
      current.lastPurchaseDate = entry.date
      current.lastFactory = entry.factory
    }

    summaryMap.set(entry.clientName, current)
  })

  return Array.from(summaryMap.values()).sort((left, right) => right.totalDebt - left.totalDebt)
})

const filteredPayments = computed(() =>
  payments.value
    .filter((record) => {
      if (normalizedSearch.value) {
        const haystack = `${record.clientName} ${record.notes}`.toLowerCase()

        if (!haystack.includes(normalizedSearch.value)) {
          return false
        }
      }

      return matchesDateRange(record.date)
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

const summary = computed(() => ({
  totalDebt: filteredDebtors.value.reduce((sum, record) => sum + record.totalDebt, 0),
  totalClients: filteredDebtors.value.length,
  totalInvoices: filteredDebtors.value.reduce((sum, record) => sum + record.invoiceCount, 0),
  totalPayments: filteredPayments.value.reduce((sum, record) => sum + record.amount, 0),
  activeReminders: reminderList.value.filter((record) => record.active).length
}))

const debtorRows = computed<Record<string, unknown>[]>(() =>
  filteredDebtors.value.map((record) => {
    const reminder = getClientReminder(record.clientName)

    return {
      ...record,
      reminder: reminder?.enabled ? `Yoqilgan · ${reminder.frequency === 'daily' ? 'Har kun' : '2 kunda bir'} · ${reminder.time}` : 'O`chiq'
    }
  })
)

const invoiceRows = computed<Record<string, unknown>[]>(() =>
  filteredOutstandingEntries.value.map((entry) => ({
    ...entry,
    entryTypeLabel: entry.label
  }))
)

const paymentRows = computed<Record<string, unknown>[]>(() => [...filteredPayments.value])

const reminderRows = computed<Record<string, unknown>[]>(() =>
  reminderList.value
    .filter((record) => record.active)
    .map((record) => ({
      ...record,
      frequencyLabel: record.frequency === 'daily' ? 'Har kun' : '2 kunda bir',
      lastSentLabel: record.lastSentAt ? formatDate(record.lastSentAt) : 'Yuborilmagan'
    }))
)

const telegramClientProfile = computed(() => getClientProfile(telegramClientName.value))
const telegramPhone = computed(() => telegramClientProfile.value.contact?.phone ?? '')
const telegramChatId = computed(() => telegramClientProfile.value.contact?.telegramChatId ?? '')
const telegramUsername = computed(() => telegramClientProfile.value.contact?.telegramUsername ?? '')
const telegramMessage = computed(() => buildDebtReminderMessage(telegramClientName.value))
const telegramProfileLink = computed(() => buildTelegramLink(telegramUsername.value))

const openPaymentModal = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedEntry.value = row as OutstandingEntry
  paymentForm.date = latestDate.value
  paymentForm.amount = selectedEntry.value.remainingAmount
  paymentForm.paymentMethod = 'Naqd'
  paymentForm.notes = ''
  paymentError.value = ''
  paymentModalOpen.value = true
}

const closePaymentModal = () => {
  paymentModalOpen.value = false
  selectedEntry.value = null
  paymentForm.date = latestDate.value
  paymentForm.amount = 0
  paymentForm.paymentMethod = 'Naqd'
  paymentForm.notes = ''
  paymentError.value = ''
}

const openManualDebtModal = () => {
  if (!isAdmin.value) {
    return
  }

  manualDebtForm.date = latestDate.value
  manualDebtForm.clientName = ''
  manualDebtForm.amount = 0
  manualDebtForm.notes = ''
  manualDebtError.value = ''
  manualDebtModalOpen.value = true
}

const closeManualDebtModal = () => {
  manualDebtModalOpen.value = false
  manualDebtForm.date = latestDate.value
  manualDebtForm.clientName = ''
  manualDebtForm.amount = 0
  manualDebtForm.notes = ''
  manualDebtError.value = ''
}

const saveManualDebt = () => {
  if (!isAdmin.value) {
    return
  }

  const clientName = manualDebtForm.clientName.trim()
  const amount = Number(manualDebtForm.amount)

  if (!manualDebtForm.date || !clientName) {
    manualDebtError.value = 'Sana va klient nomini kiriting.'
    return
  }

  if (amount <= 0) {
    manualDebtError.value = 'Qarz summasi 0 dan katta bo`lishi kerak.'
    return
  }

  addManualDebt({
    date: manualDebtForm.date,
    factory: (getClientProfile(clientName).summary?.lastFactory ?? 'Oybek') as FactoryName,
    clientName,
    amount,
    paidAmount: 0,
    notes: manualDebtForm.notes.trim()
  })

  closeManualDebtModal()
}

const openTelegramModal = (clientName: string) => {
  telegramClientName.value = clientName
  copiedMessage.value = false
  telegramError.value = ''
  telegramSuccess.value = ''
  telegramModalOpen.value = true
}

const openReminderModal = (clientName: string) => {
  if (!isAdmin.value) {
    return
  }

  const existingReminder = getClientReminder(clientName)

  reminderForm.id = existingReminder?.id ?? ''
  reminderForm.clientName = clientName
  reminderForm.enabled = existingReminder?.enabled ?? true
  reminderForm.frequency = existingReminder?.frequency ?? 'daily'
  reminderForm.time = existingReminder?.time ?? '08:00'
  reminderForm.notes = existingReminder?.notes ?? ''
  reminderModalOpen.value = true
}

const saveReminder = () => {
  if (!isAdmin.value) {
    return
  }

  if (!reminderForm.clientName.trim()) {
    return
  }

  upsertReminder({
    id: reminderForm.id || undefined,
    clientName: reminderForm.clientName.trim(),
    enabled: reminderForm.enabled,
    frequency: reminderForm.frequency,
    time: reminderForm.time,
    notes: reminderForm.notes.trim(),
    lastSentAt: getClientReminder(reminderForm.clientName)?.lastSentAt ?? ''
  })

  reminderModalOpen.value = false
}

const sendTelegramMessage = async () => {
  if (!isAdmin.value || !telegramClientName.value) {
    return
  }

  telegramSending.value = true
  telegramError.value = ''
  telegramSuccess.value = ''

  try {
    const response = await $fetch<{ ok: boolean; sentAt: string }>('/api/notifications/telegram/send', {
      method: 'POST',
      body: {
        clientName: telegramClientName.value
      }
    })

    markReminderSent(telegramClientName.value, response.sentAt)
    telegramSuccess.value = 'Telegram yuborildi.'
  } catch (error) {
    telegramError.value = error instanceof Error ? error.message : 'Telegram yuborishda xato.'
  } finally {
    telegramSending.value = false
  }
}

const copyTelegramMessage = async () => {
  if (!import.meta.client || !navigator.clipboard || !telegramMessage.value) {
    return
  }

  await navigator.clipboard.writeText(telegramMessage.value)
  copiedMessage.value = true
}

const savePayment = () => {
  if (!isAdmin.value) {
    return
  }

  if (!selectedEntry.value) {
    return
  }

  const amount = Number(paymentForm.amount)

  if (!paymentForm.date) {
    paymentError.value = 'To`lov sanasini kiriting.'
    return
  }

  if (amount <= 0 || amount > selectedEntry.value.remainingAmount) {
    paymentError.value = 'To`lov summasi qarzdan oshmasligi kerak.'
    return
  }

  if (selectedEntry.value.entryType === 'sale' && selectedEntry.value.saleRef) {
    updateSale({
      id: selectedEntry.value.saleRef.id,
      date: selectedEntry.value.saleRef.date,
      time: selectedEntry.value.saleRef.time,
      factory: selectedEntry.value.saleRef.factory,
      clientName: selectedEntry.value.saleRef.clientName,
      productName: selectedEntry.value.saleRef.productName,
      shipmentType: selectedEntry.value.saleRef.shipmentType,
      tons: selectedEntry.value.saleRef.tons,
      pricePerTon: selectedEntry.value.saleRef.pricePerTon,
      paidAmount: selectedEntry.value.saleRef.paidAmount + amount,
      paymentMethod: selectedEntry.value.saleRef.paymentMethod,
      notes: selectedEntry.value.saleRef.notes
    })
  }

  if (selectedEntry.value.entryType === 'manualDebt' && selectedEntry.value.debtRef) {
    updateManualDebt({
      ...selectedEntry.value.debtRef,
      paidAmount: selectedEntry.value.debtRef.paidAmount + amount
    })
  }

  addPayment({
    date: paymentForm.date,
    factory: selectedEntry.value.factory,
    clientName: selectedEntry.value.clientName,
    amount,
    paymentMethod: paymentForm.paymentMethod,
    saleId: selectedEntry.value.id,
    saleDate: selectedEntry.value.date,
    notes: paymentForm.notes.trim()
  })

  closePaymentModal()
}

const clearFilters = () => {
  filters.search = ''
  filters.startDate = ''
  filters.endDate = ''
}
</script>

<template>
  <section>
    <h2 class="page-title">Qarzdorlar</h2>
    <p class="page-subtitle">
      Eski qarzlarni ham qo'lda qo'shish, keyin to'lov bilan yopish va Telegram eslatmalar shu yerda.
    </p>
    <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Jami qarz" :value="formatSom(summary.totalDebt)" subtitle="filtr bo'yicha" />
    <StatCard title="Qarzdor klientlar" :value="summary.totalClients" subtitle="ochiq qarzi borlar" />
    <StatCard title="Ochiq yozuvlar" :value="summary.totalInvoices" subtitle="sotuv va eski qarz" />
    <StatCard title="To'lovlar" :value="formatSom(summary.totalPayments)" subtitle="filtrlangan to'lov tarixi" />
    <StatCard title="Aktiv TG" :value="summary.activeReminders" subtitle="yoqilgan eslatmalar" />
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
        <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
      </div>

      <button v-if="isAdmin" type="button" class="btn-primary" @click="openManualDebtModal">Qarz qo'shish</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
      <AppInput v-model="filters.search" label="Klient qidirish" placeholder="Masalan, Begzod" />
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <div class="flex items-end">
        <button type="button" class="btn-secondary" @click="clearFilters">Tozalash</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Klientlar bo'yicha qarz</h3>
      </header>

      <AppTable :columns="debtorColumns" :rows="debtorRows" empty-text="Qarzdor klient topilmadi.">
        <template #cell-totalTons="{ value }">
          <span v-if="Number(value) > 0">{{ formatTons(Number(value)) }}</span>
          <span v-else class="text-slate-400">-</span>
        </template>

        <template #cell-totalRevenue="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-totalPaid="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-totalDebt="{ value }">
          <span class="font-semibold text-rose-700">{{ formatSom(Number(value)) }}</span>
        </template>

        <template #cell-reminder="{ value }">
          <span class="text-xs text-slate-500">{{ value }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openTelegramModal(String(row.clientName))">TG</button>
            <button
              v-if="isAdmin"
              type="button"
              class="btn-secondary !px-3 !py-1.5 text-xs"
              @click="openReminderModal(String(row.clientName))"
            >
              Eslatma
            </button>
          </div>
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Yozuvlar bo'yicha qarz</h3>
      </header>

      <AppTable :columns="invoiceColumns" :rows="invoiceRows" empty-text="Ochiq qarz yozuvlari topilmadi.">
        <template #cell-entryTypeLabel="{ value }">
          <span
            :class="[
              'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
              value === 'Eski qarz' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
            ]"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-tons="{ row, value }">
          <span v-if="String(row.entryType) === 'sale'">{{ formatTons(Number(value)) }}</span>
          <span v-else class="text-slate-400">-</span>
        </template>

        <template #cell-totalAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-paidAmount="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-remainingAmount="{ value }">
          <span class="font-semibold text-rose-700">{{ formatSom(Number(value)) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-2">
            <button v-if="isAdmin" type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openPaymentModal(row)">
              To'lov
            </button>
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openTelegramModal(String(row.clientName))">
              TG
            </button>
          </div>
        </template>
      </AppTable>
    </article>
  </section>

  <section class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">Aktiv Telegram eslatmalar</h3>
      <p class="text-xs text-slate-500">Schedule saqlanadi. Bot token va klient chat id kiritilsa server o'zi yuboradi.</p>
    </header>

    <AppTable :columns="reminderColumns" :rows="reminderRows" empty-text="Aktiv eslatmalar yo'q.">
      <template #cell-debt="{ value }">
        <span class="font-semibold text-rose-700">{{ formatSom(Number(value)) }}</span>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openTelegramModal(String(row.clientName))">TG</button>
          <button
            v-if="isAdmin"
            type="button"
            class="btn-secondary !px-3 !py-1.5 text-xs"
            @click="openReminderModal(String(row.clientName))"
          >
            Tahrirlash
          </button>
        </div>
      </template>
    </AppTable>
  </section>

  <section class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">To'lovlar tarixi</h3>
      <p class="text-xs text-slate-500">Kim qachon pul berganini shu jadvaldan ko'rasiz.</p>
    </header>

    <AppTable :columns="paymentColumns" :rows="paymentRows" empty-text="To'lov tarixi topilmadi.">
      <template #cell-amount="{ value }">
        <span class="font-semibold text-emerald-700">{{ formatSom(Number(value)) }}</span>
      </template>
    </AppTable>
  </section>

  <AppModal :open="manualDebtModalOpen" title="Eski qarz qo'shish" size="sm" @close="closeManualDebtModal">
    <div class="space-y-4">
      <AppInput v-model="manualDebtForm.date" type="date" label="Sana" />
      <AppInput
        v-model="manualDebtForm.clientName"
        :list="manualDebtClientListId"
        label="Klient"
        placeholder="Masalan, Begzod"
        autocomplete="off"
      />
      <datalist :id="manualDebtClientListId">
        <option v-for="client in clientOptions" :key="client.value" :value="client.value">{{ client.label }}</option>
      </datalist>
      <AppInput v-model="manualDebtForm.amount" type="number" min="0" step="0.01" label="Qarz summasi" />
      <AppInput v-model="manualDebtForm.notes" label="Izoh" placeholder="Masalan, yozda beradi" />

      <p v-if="manualDebtError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ manualDebtError }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="closeManualDebtModal">Bekor qilish</button>
        <button v-if="isAdmin" type="button" class="btn-primary" @click="saveManualDebt">Saqlash</button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="paymentModalOpen" title="To'lov kiritish" size="sm" @close="closePaymentModal">
    <div class="space-y-4">
      <div class="rounded-2xl bg-slate-50 p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Klient</span>
          <strong class="text-slate-900">{{ selectedEntry?.clientName }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Yozuv turi</span>
          <strong class="text-slate-900">{{ selectedEntry?.label }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Asl sana</span>
          <strong class="text-slate-900">{{ formatDate(selectedEntry?.date) }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Jami qarz</span>
          <strong class="text-rose-700">{{ formatSom(selectedEntry?.remainingAmount ?? 0) }}</strong>
        </div>
      </div>

      <AppInput v-model="paymentForm.date" type="date" label="To'lov sanasi" />
      <AppInput v-model="paymentForm.amount" type="number" min="0" step="0.01" label="To'lov summasi" />
      <AppSelect
        v-model="paymentForm.paymentMethod"
        label="To`lov turi"
        :options="paymentMethods.map((item) => ({ label: item, value: item }))"
      />
      <AppInput v-model="paymentForm.notes" label="Izoh" placeholder="Masalan, qisman to'lov berdi" />

      <p v-if="paymentError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ paymentError }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="closePaymentModal">Bekor qilish</button>
        <button v-if="isAdmin" type="button" class="btn-primary" @click="savePayment">Saqlash</button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="reminderModalOpen" title="Telegram eslatma sozlamasi" size="sm" @close="reminderModalOpen = false">
    <div class="space-y-4">
      <div class="rounded-2xl bg-slate-50 p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Klient</span>
          <strong class="text-slate-900">{{ reminderForm.clientName }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Hozirgi qarz</span>
          <strong class="text-rose-700">{{ formatSom(getClientProfile(reminderForm.clientName).summary?.totalDebt ?? 0) }}</strong>
        </div>
      </div>

      <div class="space-y-1.5">
        <p class="text-sm font-medium text-slate-700">Holat</p>
        <div class="flex gap-2">
          <button
            type="button"
            :class="reminderForm.enabled ? 'btn-primary' : 'btn-secondary'"
            @click="reminderForm.enabled = true"
          >
            Yoqilgan
          </button>
          <button
            type="button"
            :class="!reminderForm.enabled ? 'btn-primary' : 'btn-secondary'"
            @click="reminderForm.enabled = false"
          >
            O`chiq
          </button>
        </div>
      </div>
      <AppSelect
        v-model="reminderForm.frequency"
        label="Davriylik"
        :options="reminderFrequencies.map((item) => ({ label: item === 'daily' ? 'Har kun' : '2 kunda bir', value: item }))"
      />
      <AppInput v-model="reminderForm.time" type="time" label="Yuborish vaqti" />
      <AppInput v-model="reminderForm.notes" label="Izoh" placeholder="Masalan, ertalab eslatma" />

      <p class="text-xs text-slate-500">Bu schedule saqlanadi. Ertalab yuborish uchun vaqt qo'ying yoki `O'chiq` qiling.</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="reminderModalOpen = false">Bekor qilish</button>
        <button v-if="isAdmin" type="button" class="btn-primary" @click="saveReminder">Saqlash</button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="telegramModalOpen" title="Telegram eslatma" size="lg" @close="telegramModalOpen = false">
    <div class="space-y-4">
      <div class="grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Klient</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ telegramClientName }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Telefon</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ telegramPhone || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Telegram chat ID</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ telegramChatId || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qarz</p>
          <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(telegramClientProfile.summary?.totalDebt ?? 0) }}</p>
        </div>
      </div>

      <div class="rounded-2xl bg-slate-950 p-4 text-sm text-white">
        <pre class="whitespace-pre-wrap font-mono">{{ telegramMessage }}</pre>
      </div>

      <div class="rounded-2xl bg-slate-50 p-4 text-sm">
        <p class="text-xs text-slate-500">Telegram username</p>
        <p class="mt-1 font-semibold text-slate-900">{{ telegramUsername ? `@${telegramUsername}` : '-' }}</p>
      </div>

      <p v-if="copiedMessage" class="text-sm text-emerald-700">Xabar matni copy qilindi.</p>
      <p v-if="telegramSuccess" class="text-sm text-emerald-700">{{ telegramSuccess }}</p>
      <p v-if="telegramError" class="text-sm text-rose-700">{{ telegramError }}</p>
      <p v-if="!telegramChatId" class="text-sm text-amber-700">Avtomatik yuborish uchun klient kartasiga Telegram chat ID kiriting.</p>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <NuxtLink v-if="telegramProfileLink" :to="telegramProfileLink" target="_blank" class="btn-secondary">TG profil</NuxtLink>
        <button type="button" class="btn-secondary" @click="copyTelegramMessage">Copy</button>
        <button type="button" class="btn-primary" :disabled="!telegramChatId || telegramSending || !isAdmin" @click="sendTelegramMessage">
          {{ telegramSending ? 'Yuborilmoqda...' : 'Telegram yuborish' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
