<script setup lang="ts">
import type { ReminderFrequency, SaleRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const {
  sales,
  payments,
  paymentMethods,
  reminderFrequencies,
  latestDate,
  updateSale,
  addPayment,
  reminderList,
  getClientReminder,
  upsertReminder,
  markReminderSent,
  buildDebtReminderMessage,
  buildSmsHref,
  getClientProfile
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()

const filters = reactive({
  search: '',
  startDate: '',
  endDate: ''
})

const paymentModalOpen = ref(false)
const selectedSale = ref<SaleRecord | null>(null)
const paymentError = ref('')
const paymentForm = reactive({
  date: latestDate.value,
  amount: 0,
  paymentMethod: 'Naqd',
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

const smsModalOpen = ref(false)
const smsClientName = ref('')
const copiedMessage = ref(false)

const debtorColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'phone', label: 'Telefon' },
  { key: 'totalTons', label: 'Tonna', align: 'right' },
  { key: 'totalRevenue', label: 'Jami sotuv', align: 'right' },
  { key: 'totalPaid', label: 'To`langan', align: 'right' },
  { key: 'totalDebt', label: 'Qarz', align: 'right' },
  { key: 'reminder', label: 'SMS eslatma' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const invoiceColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
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
  { key: 'saleDate', label: 'Yuk sanasi' },
  { key: 'notes', label: 'Izoh' }
]

const reminderColumns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'phone', label: 'Telefon' },
  { key: 'debt', label: 'Qarz', align: 'right' },
  { key: 'frequencyLabel', label: 'Davriylik' },
  { key: 'time', label: 'Soat' },
  { key: 'lastSentLabel', label: 'Oxirgi SMS' },
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

const filteredOutstandingSales = computed(() =>
  sales.value
    .filter((record) => {
      if (record.remainingAmount <= 0) {
        return false
      }

      if (normalizedSearch.value && !record.clientName.toLowerCase().includes(normalizedSearch.value)) {
        return false
      }

      return matchesDateRange(record.date)
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

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
      lastFactory: SaleRecord['factory']
    }
  >()

  filteredOutstandingSales.value.forEach((sale) => {
    const profile = getClientProfile(sale.clientName)
    const current = summaryMap.get(sale.clientName) ?? {
      clientName: sale.clientName,
      phone: profile.contact?.phone ?? '',
      totalDebt: 0,
      totalPaid: 0,
      totalRevenue: 0,
      totalTons: 0,
      invoiceCount: 0,
      lastPurchaseDate: sale.date,
      lastFactory: sale.factory
    }

    current.totalDebt += sale.remainingAmount
    current.totalPaid += sale.paidAmount
    current.totalRevenue += sale.totalAmount
    current.totalTons += sale.tons
    current.invoiceCount += 1
    current.phone = profile.contact?.phone ?? current.phone

    if (sale.date >= current.lastPurchaseDate) {
      current.lastPurchaseDate = sale.date
      current.lastFactory = sale.factory
    }

    summaryMap.set(sale.clientName, current)
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
const invoiceRows = computed<Record<string, unknown>[]>(() => [...filteredOutstandingSales.value])
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

const smsClientProfile = computed(() => getClientProfile(smsClientName.value))
const smsPhone = computed(() => smsClientProfile.value.contact?.phone ?? '')
const smsMessage = computed(() => buildDebtReminderMessage(smsClientName.value))
const smsLink = computed(() => (smsPhone.value ? buildSmsHref(smsPhone.value, smsMessage.value) : ''))

const openPaymentModal = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedSale.value = row as SaleRecord
  paymentForm.date = latestDate.value
  paymentForm.amount = selectedSale.value.remainingAmount
  paymentForm.paymentMethod = 'Naqd'
  paymentForm.notes = ''
  paymentError.value = ''
  paymentModalOpen.value = true
}

const openSmsModal = (clientName: string) => {
  smsClientName.value = clientName
  copiedMessage.value = false
  smsModalOpen.value = true
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

const openSmsApp = () => {
  if (!import.meta.client || !smsLink.value) {
    return
  }

  markReminderSent(smsClientName.value)
  window.location.href = smsLink.value
}

const copySmsMessage = async () => {
  if (!import.meta.client || !navigator.clipboard || !smsMessage.value) {
    return
  }

  await navigator.clipboard.writeText(smsMessage.value)
  copiedMessage.value = true
}

const savePayment = () => {
  if (!isAdmin.value) {
    return
  }

  if (!selectedSale.value) {
    return
  }

  const amount = Number(paymentForm.amount)

  if (!paymentForm.date) {
    paymentError.value = 'To`lov sanasini kiriting.'
    return
  }

  if (amount <= 0 || amount > selectedSale.value.remainingAmount) {
    paymentError.value = 'To`lov summasi qarzdan oshmasligi kerak.'
    return
  }

  updateSale({
    id: selectedSale.value.id,
    date: selectedSale.value.date,
    time: selectedSale.value.time,
    factory: selectedSale.value.factory,
    clientName: selectedSale.value.clientName,
    productName: selectedSale.value.productName,
    shipmentType: selectedSale.value.shipmentType,
    tons: selectedSale.value.tons,
    pricePerTon: selectedSale.value.pricePerTon,
    paidAmount: selectedSale.value.paidAmount + amount,
    paymentMethod: selectedSale.value.paymentMethod,
    notes: selectedSale.value.notes
  })

  addPayment({
    date: paymentForm.date,
    factory: selectedSale.value.factory,
    clientName: selectedSale.value.clientName,
    amount,
    paymentMethod: paymentForm.paymentMethod as 'Naqd' | 'Click' | 'Prichesleniya',
    saleId: selectedSale.value.id,
    saleDate: selectedSale.value.date,
    notes: paymentForm.notes.trim()
  })

  closePaymentModal()
}

const closePaymentModal = () => {
  paymentModalOpen.value = false
  selectedSale.value = null
  paymentForm.date = latestDate.value
  paymentForm.amount = 0
  paymentForm.paymentMethod = 'Naqd'
  paymentForm.notes = ''
  paymentError.value = ''
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
      Kim qancha qarz bo'lib qolgani, qachon pul bergani va SMS eslatmalar shu yerda.
    </p>
    <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Jami qarz" :value="formatSom(summary.totalDebt)" subtitle="filtr bo'yicha" />
    <StatCard title="Qarzdor klientlar" :value="summary.totalClients" subtitle="ochiq qarzi borlar" />
    <StatCard title="Ochiq yuklar" :value="summary.totalInvoices" subtitle="to'lovi yopilmagan" />
    <StatCard title="To'lovlar" :value="formatSom(summary.totalPayments)" subtitle="filtrlangan to'lov tarixi" />
    <StatCard title="Aktiv SMS" :value="summary.activeReminders" subtitle="yoqilgan eslatmalar" />
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
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

  <section class="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Klientlar bo'yicha qarz</h3>
      </header>

      <AppTable :columns="debtorColumns" :rows="debtorRows" empty-text="Qarzdor klient topilmadi.">
        <template #cell-totalTons="{ value }">
          {{ formatTons(Number(value)) }}
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
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openSmsModal(String(row.clientName))">SMS</button>
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
        <h3 class="text-base font-semibold text-slate-900">Yuklar bo'yicha qarz</h3>
      </header>

      <AppTable :columns="invoiceColumns" :rows="invoiceRows" empty-text="Ochiq qarz yozuvlari topilmadi.">
        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
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
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openSmsModal(String(row.clientName))">
              SMS
            </button>
          </div>
        </template>
      </AppTable>
    </article>
  </section>

  <section class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">Aktiv SMS eslatmalar</h3>
      <p class="text-xs text-slate-500">Schedule saqlanadi. Real avtomatik yuborish uchun SMS provider ulanishi kerak.</p>
    </header>

    <AppTable :columns="reminderColumns" :rows="reminderRows" empty-text="Aktiv eslatmalar yo'q.">
      <template #cell-debt="{ value }">
        <span class="font-semibold text-rose-700">{{ formatSom(Number(value)) }}</span>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openSmsModal(String(row.clientName))">SMS</button>
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

  <AppModal :open="paymentModalOpen" title="To'lov kiritish" size="sm" @close="closePaymentModal">
    <div class="space-y-4">
      <div class="rounded-2xl bg-slate-50 p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Klient</span>
          <strong class="text-slate-900">{{ selectedSale?.clientName }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Yuk sanasi</span>
          <strong class="text-slate-900">{{ formatDate(selectedSale?.date) }}</strong>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-slate-500">Jami qarz</span>
          <strong class="text-rose-700">{{ formatSom(selectedSale?.remainingAmount ?? 0) }}</strong>
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

  <AppModal :open="reminderModalOpen" title="SMS eslatma sozlamasi" size="sm" @close="reminderModalOpen = false">
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

      <p class="text-xs text-slate-500">Bu schedule saqlanadi. Real avtomatik SMS yuborish uchun provider ulanishi kerak.</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="reminderModalOpen = false">Bekor qilish</button>
        <button v-if="isAdmin" type="button" class="btn-primary" @click="saveReminder">Saqlash</button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="smsModalOpen" title="SMS eslatma" size="lg" @close="smsModalOpen = false">
    <div class="space-y-4">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Klient</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ smsClientName }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Telefon</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ smsPhone || '-' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qarz</p>
          <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(smsClientProfile.summary?.totalDebt ?? 0) }}</p>
        </div>
      </div>

      <div class="rounded-2xl bg-slate-950 p-4 text-sm text-white">
        <pre class="whitespace-pre-wrap font-mono">{{ smsMessage }}</pre>
      </div>

      <p v-if="copiedMessage" class="text-sm text-emerald-700">SMS matni copy qilindi.</p>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" @click="copySmsMessage">Copy</button>
        <button type="button" class="btn-primary" :disabled="!smsPhone" @click="openSmsApp">SMS ochish</button>
      </div>
    </template>
  </AppModal>
</template>
