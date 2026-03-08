<script setup lang="ts">
import type { ExpenseCategory, FactoryName, ManualDebtRecord, OperationalExpense, PaymentMethod, SaleRecord } from '~/types/accounting'

definePageMeta({
  layout: 'dashboard',
  middleware: 'role',
  roles: ['admin']
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
  latestDate,
  factoryOptions,
  paymentMethods,
  expenseCategories,
  clientOptions,
  sales,
  manualDebts,
  overallSummary,
  addPayment,
  updateSale,
  updateManualDebt,
  addExpense,
  getClientProfile
} = useFactoryAccounting()
const { formatSom, formatDate, formatTons } = useFormatting()

const clientPaymentForm = reactive({
  date: latestDate.value,
  clientName: '',
  saleId: '',
  amount: 0,
  paymentMethod: 'Naqd' as PaymentMethod,
  notes: ''
})

const expenseForm = reactive<Omit<OperationalExpense, 'id'>>({
  date: latestDate.value,
  factory: 'Oybek',
  category: 'Boshqa' as ExpenseCategory,
  description: '',
  amount: 0,
  paymentMethod: 'Naqd',
  notes: ''
})

const infoMessage = ref('')
const clientPaymentError = ref('')
const expenseError = ref('')

const showMessage = (message: string) => {
  infoMessage.value = message

  setTimeout(() => {
    infoMessage.value = ''
  }, 2500)
}

const clientOutstandingEntries = computed<OutstandingEntry[]>(() => {
  const saleEntries = sales.value
    .filter((sale) => sale.remainingAmount > 0 && (!clientPaymentForm.clientName || sale.clientName === clientPaymentForm.clientName))
    .map<OutstandingEntry>((sale) => ({
      id: sale.id,
      entryType: 'sale',
      date: sale.date,
      factory: sale.factory,
      clientName: sale.clientName,
      tons: sale.tons,
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
      remainingAmount: sale.remainingAmount,
      notes: sale.notes,
      label: 'Sotuv',
      saleRef: sale,
      debtRef: null
    }))

  const debtEntries = manualDebts.value
    .filter((record) => record.remainingAmount > 0 && (!clientPaymentForm.clientName || record.clientName === clientPaymentForm.clientName))
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

const clientOutstandingSaleOptions = computed(() =>
  clientOutstandingEntries.value.map((entry) => ({
    label: `${entry.clientName} · ${entry.label} · ${formatDate(entry.date)} · ${formatSom(entry.remainingAmount)}`,
    value: entry.id
  }))
)

const selectedClientEntry = computed(() =>
  clientOutstandingEntries.value.find((entry) => entry.id === clientPaymentForm.saleId) ?? null
)

const activeClientProfile = computed(() => getClientProfile(clientPaymentForm.clientName))

const paymentMethodCards = computed(() =>
  overallSummary.value.paymentMethodBreakdown.map((item) => ({
    title: item.method,
    value: formatSom(item.balance),
    subtitle: `Kirim ${formatSom(item.incoming)} · Chiqim ${formatSom(item.outgoing)}`
  }))
)

const resetClientPaymentForm = () => {
  clientPaymentForm.date = latestDate.value
  clientPaymentForm.clientName = ''
  clientPaymentForm.saleId = ''
  clientPaymentForm.amount = 0
  clientPaymentForm.paymentMethod = 'Naqd'
  clientPaymentForm.notes = ''
  clientPaymentError.value = ''
}

const resetExpenseForm = () => {
  expenseForm.date = latestDate.value
  expenseForm.factory = 'Oybek'
  expenseForm.category = 'Boshqa'
  expenseForm.description = ''
  expenseForm.amount = 0
  expenseForm.paymentMethod = 'Naqd'
  expenseForm.notes = ''
  expenseError.value = ''
}

const saveClientPayment = () => {
  clientPaymentError.value = ''

  if (!clientPaymentForm.date || !clientPaymentForm.clientName || !clientPaymentForm.saleId) {
    clientPaymentError.value = 'Klient, qarz yozuvi va sanani tanlang.'
    return
  }

  if (!selectedClientEntry.value) {
    clientPaymentError.value = 'Tanlangan qarz yozuvi topilmadi.'
    return
  }

  const amount = Number(clientPaymentForm.amount)

  if (amount <= 0 || amount > selectedClientEntry.value.remainingAmount) {
    clientPaymentError.value = 'Summa tanlangan qarzdan oshmasligi kerak.'
    return
  }

  if (selectedClientEntry.value.entryType === 'sale' && selectedClientEntry.value.saleRef) {
    updateSale({
      id: selectedClientEntry.value.saleRef.id,
      date: selectedClientEntry.value.saleRef.date,
      time: selectedClientEntry.value.saleRef.time,
      factory: selectedClientEntry.value.saleRef.factory,
      clientName: selectedClientEntry.value.saleRef.clientName,
      productName: selectedClientEntry.value.saleRef.productName,
      shipmentType: selectedClientEntry.value.saleRef.shipmentType,
      tons: selectedClientEntry.value.saleRef.tons,
      pricePerTon: selectedClientEntry.value.saleRef.pricePerTon,
      paidAmount: selectedClientEntry.value.saleRef.paidAmount + amount,
      paymentMethod: selectedClientEntry.value.saleRef.paymentMethod,
      notes: selectedClientEntry.value.saleRef.notes
    })
  }

  if (selectedClientEntry.value.entryType === 'manualDebt' && selectedClientEntry.value.debtRef) {
    updateManualDebt({
      ...selectedClientEntry.value.debtRef,
      paidAmount: selectedClientEntry.value.debtRef.paidAmount + amount
    })
  }

  addPayment({
    date: clientPaymentForm.date,
    factory: selectedClientEntry.value.factory,
    clientName: selectedClientEntry.value.clientName,
    amount,
    paymentMethod: clientPaymentForm.paymentMethod,
    saleId: selectedClientEntry.value.id,
    saleDate: selectedClientEntry.value.date,
    notes: clientPaymentForm.notes.trim()
  })

  resetClientPaymentForm()
  showMessage('Klient to`lovi qo`shildi.')
}

const saveExpense = () => {
  expenseError.value = ''

  if (!expenseForm.date || !expenseForm.factory || !expenseForm.description.trim()) {
    expenseError.value = 'Sana, zavod va tavsifni kiriting.'
    return
  }

  if (Number(expenseForm.amount) <= 0) {
    expenseError.value = 'Summa 0 dan katta bo`lishi kerak.'
    return
  }

  addExpense({
    date: expenseForm.date,
    factory: expenseForm.factory,
    category: expenseForm.category,
    description: expenseForm.description.trim(),
    amount: Number(expenseForm.amount),
    paymentMethod: expenseForm.paymentMethod,
    notes: expenseForm.notes.trim()
  })

  resetExpenseForm()
  showMessage('Qo`lda chiqim qo`shildi.')
}

watch(
  () => clientPaymentForm.clientName,
  () => {
    clientPaymentForm.saleId = clientOutstandingEntries.value[0]?.id ?? ''
  }
)
</script>

<template>
  <section class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="page-title">Pul Kiritish</h2>
      <p class="page-subtitle">Klientdan tushgan pul va qo'lda chiqim shu yerda yuritiladi. Bu bo'lim faqat admin uchun.</p>
    </div>

    <NuxtLink to="/debtors" class="btn-secondary">Eski qarz qo'shish: Qarzdorlar</NuxtLink>
  </section>

  <p v-if="infoMessage" class="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
    {{ infoMessage }}
  </p>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
  </section>

  <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Klientdan pul tushdi</h3>
        <p class="text-sm text-slate-500">Qaysi qarz yozuvi yopilayotganini tanlang. Sotuv ham, eski qarz ham shu yerdan yopiladi.</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="clientPaymentForm.date" type="date" label="To'lov sanasi" />
        <AppSelect v-model="clientPaymentForm.clientName" label="Klient" :options="clientOptions" placeholder="Klientni tanlang" />
        <AppSelect
          v-model="clientPaymentForm.saleId"
          label="Qarz yozuvi"
          :options="clientOutstandingSaleOptions"
          placeholder="Qarz yozuvini tanlang"
        />
        <AppSelect
          v-model="clientPaymentForm.paymentMethod"
          label="To'lov turi"
          :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="clientPaymentForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <AppInput v-model="clientPaymentForm.notes" label="Izoh" placeholder="Masalan, qisman to'lov" />
      </div>

      <div v-if="selectedClientEntry" class="mt-4 grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Klient</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedClientEntry.clientName }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Yozuv turi</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedClientEntry.label }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Asl sana</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatDate(selectedClientEntry.date) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qarz</p>
          <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(selectedClientEntry.remainingAmount) }}</p>
        </div>
      </div>

      <div v-if="selectedClientEntry" class="mt-3 grid gap-3 md:grid-cols-2">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Tonna</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">
            {{ selectedClientEntry.entryType === 'sale' ? formatTons(selectedClientEntry.tons) : '-' }}
          </p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Jami yozuv</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatSom(selectedClientEntry.totalAmount) }}</p>
        </div>
      </div>

      <div v-if="activeClientProfile.summary" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="grid gap-3 md:grid-cols-4">
          <div>
            <p class="text-xs text-slate-500">Jami tonna</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatTons(activeClientProfile.summary.totalTons) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Jami tushum</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatSom(activeClientProfile.summary.totalRevenue) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Balans</p>
            <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(activeClientProfile.summary.balanceAmount) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Telefon</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeClientProfile.contact?.phone || '-' }}</p>
          </div>
        </div>
      </div>

      <p v-if="clientPaymentError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ clientPaymentError }}
      </p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetClientPaymentForm">Tozalash</button>
        <button type="button" class="btn-primary" @click="saveClientPayment">Pulni kiritish</button>
      </div>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Qo'lda chiqim</h3>
        <p class="text-sm text-slate-500">Naqd, Click yoki Prichesleniya bo'yicha chiqimni shu yerda kiritasiz.</p>
      </header>

      <div class="space-y-4">
        <AppInput v-model="expenseForm.date" type="date" label="Sana" />
        <AppSelect v-model="expenseForm.factory" label="Zavod" :options="factoryOptions" />
        <AppSelect
          v-model="expenseForm.category"
          label="Kategoriya"
          :options="expenseCategories.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="expenseForm.description" label="Tavsif" placeholder="Masalan, servis yoki qarz to'lovi" />
        <AppInput v-model="expenseForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <AppSelect
          v-model="expenseForm.paymentMethod"
          label="To'lov turi"
          :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="expenseForm.notes" label="Izoh" placeholder="Qo'shimcha ma'lumot" />
      </div>

      <p v-if="expenseError" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ expenseError }}
      </p>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="resetExpenseForm">Tozalash</button>
        <button type="button" class="btn-primary" @click="saveExpense">Chiqimni kiritish</button>
      </div>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Ta'minotchiga pul berilganda `Tosh Kirimi` sahifasidagi yozuvni tahrirlang. U yerda supplier qarzi va qoldiq avtomatik yangilanadi.
      </div>
    </article>
  </section>
</template>
