<script setup lang="ts">
import type { ExpenseCategory, OperationalExpense, PaymentMethod, SaleRecord } from '~/types/accounting'

definePageMeta({
  layout: 'dashboard',
  middleware: 'role',
  roles: ['admin']
})

const {
  latestDate,
  factoryOptions,
  paymentMethods,
  expenseCategories,
  clientOptions,
  sales,
  overallSummary,
  addPayment,
  updateSale,
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

const clientOutstandingSales = computed(() =>
  sales.value
    .filter(
      (sale) =>
        sale.remainingAmount > 0 &&
        (!clientPaymentForm.clientName || sale.clientName === clientPaymentForm.clientName)
    )
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
)

const clientOutstandingSaleOptions = computed(() =>
  clientOutstandingSales.value.map((sale) => ({
    label: `${sale.clientName} · ${formatDate(sale.date)} · ${formatSom(sale.remainingAmount)}`,
    value: sale.id
  }))
)

const selectedClientSale = computed(() =>
  clientOutstandingSales.value.find((sale) => sale.id === clientPaymentForm.saleId) ?? null
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

  if (!selectedClientSale.value) {
    clientPaymentError.value = 'Tanlangan qarz yozuvi topilmadi.'
    return
  }

  const amount = Number(clientPaymentForm.amount)

  if (amount <= 0 || amount > selectedClientSale.value.remainingAmount) {
    clientPaymentError.value = 'Summa tanlangan qarzdan oshmasligi kerak.'
    return
  }

  updateSale({
    id: selectedClientSale.value.id,
    date: selectedClientSale.value.date,
    time: selectedClientSale.value.time,
    factory: selectedClientSale.value.factory,
    clientName: selectedClientSale.value.clientName,
    productName: selectedClientSale.value.productName,
    shipmentType: selectedClientSale.value.shipmentType,
    tons: selectedClientSale.value.tons,
    pricePerTon: selectedClientSale.value.pricePerTon,
    paidAmount: selectedClientSale.value.paidAmount + amount,
    paymentMethod: selectedClientSale.value.paymentMethod,
    notes: selectedClientSale.value.notes
  })

  addPayment({
    date: clientPaymentForm.date,
    factory: selectedClientSale.value.factory,
    clientName: selectedClientSale.value.clientName,
    amount,
    paymentMethod: clientPaymentForm.paymentMethod,
    saleId: selectedClientSale.value.id,
    saleDate: selectedClientSale.value.date,
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
    clientPaymentForm.saleId = clientOutstandingSales.value[0]?.id ?? ''
  }
)
</script>

<template>
  <section class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="page-title">Pul Kiritish</h2>
      <p class="page-subtitle">Klientdan tushgan pul va qo'lda chiqim shu yerda yuritiladi. Bu bo'lim faqat admin uchun.</p>
    </div>

    <NuxtLink to="/raw-materials" class="btn-secondary">Ta'minotchi to'lovi: Tosh Kirimi</NuxtLink>
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
        <p class="text-sm text-slate-500">Qaysi qarz yozuvi yopilayotganini tanlang. Shunda balans avtomatik kamayadi.</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="clientPaymentForm.date" type="date" label="To'lov sanasi" />
        <AppSelect v-model="clientPaymentForm.clientName" label="Klient" :options="clientOptions" placeholder="Klientni tanlang" />
        <AppSelect
          v-model="clientPaymentForm.saleId"
          label="Qarz yozuvi"
          :options="clientOutstandingSaleOptions"
          placeholder="Yuk yozuvini tanlang"
        />
        <AppSelect
          v-model="clientPaymentForm.paymentMethod"
          label="To'lov turi"
          :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="clientPaymentForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <AppInput v-model="clientPaymentForm.notes" label="Izoh" placeholder="Masalan, qisman to'lov" />
      </div>

      <div v-if="selectedClientSale" class="mt-4 grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Klient</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedClientSale.clientName }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Yuk sanasi</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatDate(selectedClientSale.date) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Qarz</p>
          <p class="mt-1 text-sm font-semibold text-rose-700">{{ formatSom(selectedClientSale.remainingAmount) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Yuk</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatTons(selectedClientSale.tons) }}</p>
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
