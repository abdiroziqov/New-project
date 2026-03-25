<script setup lang="ts">
import type {
  ExpenseCategory,
  FactoryName,
  OperationalExpense,
  PaymentMethod,
  ProductType,
  SaleRecord,
  ShipmentType,
  VehicleType
} from '~/types/accounting'
import { isBulkAllowedForProduct, normalizeBulkOutputTons, normalizeShipmentTypeForProduct } from '~/composables/useProductRules'

definePageMeta({
  layout: 'dashboard',
  middleware: 'role',
  roles: ['admin']
})

const {
  defaultCosts,
  factoryOptions,
  productTypes,
  expenseCategories,
  paymentMethods,
  clientOptions,
  supplierContacts,
  latestDate,
  addDailyRecord,
  addIncomingLoad,
  addSale,
  addExpense,
  getClientSuggestions,
  getClientProfile
} = useFactoryAccounting()
const { formatSom, formatTons, formatDate } = useFormatting()
const { getSupplierInputClass } = useSupplierHighlight()
const { t } = useUiLocale()

const getVehicleDefaultTons = (vehicleType: VehicleType) => (vehicleType === 'Howo' ? 28 : 13)

type IncomingLoadQuickForm = {
  date: string
  factory: FactoryName | ''
  vehicleType: VehicleType
  vehicleCount: string
  tons: number
  supplier: string
  totalAmount: number
  paidAmount: number
  notes: string
}

const dailyForm = reactive({
  date: latestDate.value,
  factory: 'Oybek' as FactoryName,
  productType: 'Qum' as ProductType,
  baggedOutputTons: 0,
  bulkOutputTons: 0,
  notes: ''
})

const loadForm = reactive<IncomingLoadQuickForm>({
  date: latestDate.value,
  factory: '',
  vehicleType: 'Howo',
  vehicleCount: '1',
  tons: getVehicleDefaultTons('Howo'),
  supplier: '',
  totalAmount: 0,
  paidAmount: 0,
  notes: ''
})

const saleForm = reactive<
  Omit<SaleRecord, 'id' | 'totalAmount' | 'remainingAmount' | 'advanceAmount' | 'balanceAmount' | 'balanceType' | 'paymentStatus'>
>({
  date: latestDate.value,
  time: '',
  factory: 'Oybek',
  clientName: '',
  productName: 'Qum',
  shipmentType: 'qoplik',
  tons: 0,
  pricePerTon: 0,
  paidAmount: 0,
  paymentMethod: 'Naqd',
  notes: ''
})

const expenseForm = reactive<Omit<OperationalExpense, 'id'>>({
  date: latestDate.value,
  factory: 'Oybek',
  category: 'Ishchi',
  description: '',
  amount: 0,
  paymentMethod: 'Naqd',
  notes: ''
})

const infoMessage = ref('')
const quickSaleSuggestionsListId = 'quick-sale-client-suggestions'
const supplierOptions = computed(() =>
  supplierContacts.value.map((contact) => ({
    label: contact.name,
    value: contact.name
  }))
)

const showMessage = (message: string) => {
  infoMessage.value = message

  setTimeout(() => {
    infoMessage.value = ''
  }, 2500)
}

const getNormalizedDailyOutputTons = () =>
  getOutputTons({
    baggedOutputTons: Number(dailyForm.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(dailyForm.productType, Number(dailyForm.bulkOutputTons))
  })

const getNormalizedDailyUsedStoneTons = () =>
  getUsedStoneTons({
    baggedOutputTons: Number(dailyForm.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(dailyForm.productType, Number(dailyForm.bulkOutputTons))
  })

const saveDaily = () => {
  if (getNormalizedDailyOutputTons() <= 0) {
    showMessage('Kunlik hisob uchun chiqqan mahsulot tonnasini kiriting.')
    return
  }

  addDailyRecord({
    ...defaultCosts.value,
    date: dailyForm.date,
    factory: dailyForm.factory,
    productType: dailyForm.productType,
    incomingStoneTons: getNormalizedDailyUsedStoneTons(),
    usedStoneTons: getNormalizedDailyUsedStoneTons(),
    baggedOutputTons: Number(dailyForm.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(dailyForm.productType, Number(dailyForm.bulkOutputTons)),
    newBagCount: getBagCount(Number(dailyForm.baggedOutputTons)),
    oldBagCount: 0,
    notes: dailyForm.notes.trim()
  })

  Object.assign(dailyForm, {
    date: latestDate.value,
    factory: 'Oybek',
    productType: 'Qum',
    baggedOutputTons: 0,
    bulkOutputTons: 0,
    notes: ''
  })
  showMessage('Kunlik hisob qo`shildi.')
}

const saveLoad = () => {
  if (!loadForm.supplier.trim()) {
    showMessage('Tosh kirimi uchun ta`minotchini kiriting.')
    return
  }

  if (Number(loadForm.totalAmount) <= 0 || Number(loadForm.paidAmount) < 0) {
    showMessage('Jami narx 0 dan katta bo`lsin, to`langan summa esa manfiy bo`lmasin.')
    return
  }

  const totalAmount = Number(loadForm.totalAmount)
  const paidAmount = Number(loadForm.paidAmount)
  const pricePerTon = getLoadPricePerTon(Number(loadForm.tons), totalAmount)

  addIncomingLoad({
    date: loadForm.date,
    factory: loadForm.factory,
    vehicleType: loadForm.vehicleType as VehicleType,
    tons: Number(loadForm.tons),
    supplier: loadForm.supplier.trim(),
    pricePerTon,
    totalAmount,
    paidAmount,
    remainingAmount: getRemainingAmount(totalAmount, paidAmount),
    paymentStatus: getPaymentStatus(totalAmount, paidAmount),
    notes: loadForm.notes.trim()
  })

  Object.assign(loadForm, {
    date: latestDate.value,
    factory: '',
    vehicleType: 'Howo',
    vehicleCount: '1',
    tons: getVehicleDefaultTons('Howo'),
    supplier: '',
    totalAmount: 0,
    paidAmount: 0,
    notes: ''
  })
  showMessage('Tosh kirimi qo`shildi.')
}

const saveSale = () => {
  if (!saleForm.clientName.trim() || Number(saleForm.tons) <= 0 || Number(saleForm.pricePerTon) <= 0) {
    showMessage('Sotuv uchun klient, tonna va narxni kiriting.')
    return
  }

  if (Number(saleForm.paidAmount) > getSaleTotal(Number(saleForm.tons), Number(saleForm.pricePerTon))) {
    showMessage('To`langan summa jami summadan katta bo`lmasin.')
    return
  }

  addSale({
    date: saleForm.date,
    time: saleForm.time,
    factory: saleForm.factory,
    clientName: saleForm.clientName.trim(),
    productName: saleForm.productName.trim() || 'Qum',
    shipmentType: saleForm.shipmentType as ShipmentType,
    tons: Number(saleForm.tons),
    pricePerTon: Number(saleForm.pricePerTon),
    paidAmount: Number(saleForm.paidAmount),
    paymentMethod: saleForm.paymentMethod as PaymentMethod,
    notes: saleForm.notes.trim()
  })

  Object.assign(saleForm, {
    date: latestDate.value,
    time: '',
    factory: 'Oybek',
    clientName: '',
    productName: 'Qum',
    shipmentType: 'qoplik',
    tons: 0,
    pricePerTon: 0,
    paidAmount: 0,
    paymentMethod: 'Naqd',
    notes: ''
  })
  showMessage('Sotuv yozuvi qo`shildi.')
}

const saveExpense = () => {
  if (!expenseForm.description.trim() || Number(expenseForm.amount) <= 0) {
    showMessage('Chiqim uchun tavsif va summani kiriting.')
    return
  }

  addExpense({
    date: expenseForm.date,
    factory: expenseForm.factory,
    category: expenseForm.category as ExpenseCategory,
    description: expenseForm.description.trim(),
    amount: Number(expenseForm.amount),
    paymentMethod: expenseForm.paymentMethod as PaymentMethod,
    notes: expenseForm.notes.trim()
  })

  Object.assign(expenseForm, {
    date: latestDate.value,
    factory: 'Oybek',
    category: 'Ishchi',
    description: '',
    amount: 0,
    paymentMethod: 'Naqd',
    notes: ''
  })
  showMessage('Chiqim yozuvi qo`shildi.')
}

const salePreviewTotal = computed(() => getSaleTotal(Number(saleForm.tons), Number(saleForm.pricePerTon)))
const salePreviewDebt = computed(() => Math.max(salePreviewTotal.value - Number(saleForm.paidAmount || 0), 0))
const loadPreviewTotal = computed(() => Number(loadForm.totalAmount || 0))
const loadPreviewPricePerTon = computed(() => getLoadPricePerTon(Number(loadForm.tons), loadPreviewTotal.value))
const loadPreviewDebt = computed(() => getRemainingAmount(loadPreviewTotal.value, Number(loadForm.paidAmount || 0)))
const loadPreviewAdvance = computed(() => getLoadAdvanceAmount(loadPreviewTotal.value, Number(loadForm.paidAmount || 0)))

watch(
  () => [loadForm.vehicleType, loadForm.vehicleCount] as const,
  ([vehicleType, vehicleCount], previousValues) => {
    const previousVehicleType = previousValues?.[0]
    const previousVehicleCount = Number(previousValues?.[1] ?? '1')
    const previousDefault = previousVehicleType ? getVehicleDefaultTons(previousVehicleType) * previousVehicleCount : 0
    const nextDefault = getVehicleDefaultTons(vehicleType) * Number(vehicleCount || '1')

    if (Number(loadForm.tons) <= 0 || Number(loadForm.tons) === previousDefault) {
      loadForm.tons = nextDefault
    }
  }
)
const matchedSaleClients = computed(() => getClientSuggestions(saleForm.clientName, 6))
const activeSaleClientProfile = computed(() => getClientProfile(saleForm.clientName))
const activeSaleClientSummary = computed(() => activeSaleClientProfile.value.summary)
const activeSaleClientContact = computed(() => activeSaleClientProfile.value.contact)
const activeSaleClientSales = computed(() => activeSaleClientProfile.value.recentSales)
const activeSaleClientLastSale = computed(() => activeSaleClientProfile.value.lastSale)
const dailyBaggedCostPerTon = computed(() => getCostPerTon(defaultCosts.value, dailyForm.productType))
const dailyBulkCostPerTon = computed(() => getBulkCostPerTon(defaultCosts.value, dailyForm.productType))
const dailyBulkAllowed = computed(() => isBulkAllowedForProduct(dailyForm.productType))
const saleBulkAllowed = computed(() => isBulkAllowedForProduct(saleForm.productName))
const dailyUsedStoneTons = computed(() => getNormalizedDailyUsedStoneTons())
const dailyBagCount = computed(() => getBagCount(Number(dailyForm.baggedOutputTons)))
const dailyBaggedCost = computed(() => getSaleTotal(Number(dailyForm.baggedOutputTons), dailyBaggedCostPerTon.value))
const dailyBulkCost = computed(() =>
  getSaleTotal(normalizeBulkOutputTons(dailyForm.productType, Number(dailyForm.bulkOutputTons)), dailyBulkCostPerTon.value)
)
const dailyPreviewCost = computed(() => Number((dailyBaggedCost.value + dailyBulkCost.value).toFixed(2)))
const salePreviewReceivable = computed(() => getRemainingAmount(salePreviewTotal.value, Number(saleForm.paidAmount || 0)))
const salePreviewAdvance = computed(() => getAdvanceAmount(salePreviewTotal.value, Number(saleForm.paidAmount || 0)))
const salePreviewBalanceType = computed(() => getBalanceType(salePreviewTotal.value, Number(saleForm.paidAmount || 0)))

const balanceLabel = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'Bizga qarz'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'Bizdan qarz'
  }

  return 'Yopilgan'
}

const balanceToneClass = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'text-rose-700'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'text-sky-700'
  }

  return 'text-emerald-700'
}

const applySaleClientSuggestion = (clientName: string) => {
  saleForm.clientName = clientName
}

const applyQuickSaleDefaults = () => {
  if (!activeSaleClientLastSale.value) {
    return
  }

  saleForm.productName = activeSaleClientLastSale.value.productName
  saleForm.shipmentType = normalizeShipmentTypeForProduct(
    activeSaleClientLastSale.value.productName,
    activeSaleClientLastSale.value.shipmentType
  )
  saleForm.pricePerTon = activeSaleClientLastSale.value.pricePerTon
  saleForm.paymentMethod = activeSaleClientLastSale.value.paymentMethod

  const nextTotal = getSaleTotal(Number(saleForm.tons), Number(saleForm.pricePerTon))
  if (nextTotal === 0) {
    saleForm.paidAmount = 0
  }
}

watch(
  () => dailyForm.productType,
  (productType) => {
    if (!isBulkAllowedForProduct(productType)) {
      dailyForm.bulkOutputTons = 0
    }
  }
)

watch(
  () => saleForm.productName,
  (productName) => {
    saleForm.shipmentType = normalizeShipmentTypeForProduct(productName, saleForm.shipmentType as ShipmentType)
  }
)
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Tez Kiritish') }}</h2>
      <p class="page-subtitle">{{ t('Bugungi 20 tonna, kimga yuk ketgani yoki 1 Howo tosh kelganini shu yerda tez kiriting.') }}</p>
    </div>
    <span v-if="infoMessage" class="rounded-full bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700">
      {{ infoMessage }}
    </span>
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <article class="panel p-5">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t('1. Kunlik zavod hisobi') }}</h3>
          <p class="text-xs text-slate-500">Masalan, zavod bugun 20 tonna mahsulot chiqardi. 1 tonna qoplik = 25 qop, rasipnoyda qop yo'q.</p>
        </div>
        <span class="data-chip">Default tannarx ishlaydi</span>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="dailyForm.date" type="date" label="Sana" />
        <AppSelect v-model="dailyForm.factory" label="Zavod" :options="factoryOptions" />
        <AppSelect
          v-model="dailyForm.productType"
          label="Mahsulot turi"
          :options="productTypes.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="dailyForm.baggedOutputTons" type="number" min="0" step="0.01" label="Qoplik (t)" />
        <AppInput
          v-model="dailyForm.bulkOutputTons"
          type="number"
          min="0"
          step="0.01"
          label="Rasipnoy (t)"
          :disabled="!dailyBulkAllowed"
          :placeholder="dailyBulkAllowed ? '' : 'Mel faqat qoplik bo`ladi'"
        />
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Avtomatik tosh</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatTons(dailyUsedStoneTons) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Avtomatik qop</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ dailyBagCount }} dona</p>
        </div>
        <div class="md:col-span-2">
          <AppInput v-model="dailyForm.notes" label="Izoh" placeholder="Kunlik izoh" />
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-5">
        <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span class="text-slate-500">{{ dailyForm.productType }} qoplik 1 kg</span>
          <strong class="mt-1 block text-slate-900">{{ formatSom(dailyBaggedCostPerTon) }}</strong>
        </div>
        <div :class="dailyBulkAllowed ? 'rounded-2xl bg-sky-50 px-4 py-3 text-sm' : 'rounded-2xl bg-slate-100 px-4 py-3 text-sm'">
          <span :class="dailyBulkAllowed ? 'text-sky-700' : 'text-slate-500'">{{ dailyForm.productType }} rasipnoy 1 kg</span>
          <strong :class="dailyBulkAllowed ? 'mt-1 block text-sky-700' : 'mt-1 block text-slate-500'">
            {{ dailyBulkAllowed ? formatSom(dailyBulkCostPerTon) : 'Yo`q' }}
          </strong>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span class="text-slate-500">Tosh sarfi</span>
          <strong class="mt-1 block text-slate-900">{{ formatTons(dailyUsedStoneTons) }}</strong>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span class="text-slate-500">Qop soni</span>
          <strong class="mt-1 block text-slate-900">{{ dailyBagCount }} dona</strong>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span class="text-slate-500">Jami preview tannarx</span>
          <strong class="mt-1 block text-slate-900">{{ formatSom(dailyPreviewCost) }}</strong>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="saveDaily">{{ t("Kunlik yozuvni qo'shish") }}</button>
      </div>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('2. Tosh kirimi') }}</h3>
        <p class="text-xs text-slate-500">Masalan, 1 Howo tosh keldi va jami narxi 2 000 000 bo'ldi</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="loadForm.date" type="date" label="Sana" />
        <AppSelect v-model="loadForm.factory" label="Zavod" :options="factoryOptions" placeholder="Ixtiyoriy" />
        <AppSelect
          v-model="loadForm.vehicleType"
          label="Mashina turi"
          :options="[
            { label: 'Howo', value: 'Howo' },
            { label: 'Kamaz', value: 'Kamaz' }
          ]"
        />
        <AppSelect
          v-model="loadForm.vehicleCount"
          label="Soni"
          :options="[
            { label: '1 ta', value: '1' },
            { label: '2 ta', value: '2' },
            { label: '3 ta', value: '3' },
            { label: '4 ta', value: '4' },
            { label: '5 ta', value: '5' }
          ]"
        />
        <AppInput v-model="loadForm.tons" type="number" min="0" step="0.01" label="Tonna" placeholder="Ixtiyoriy" />
        <AppInput v-model="loadForm.totalAmount" type="number" min="0" step="0.01" label="Jami narx" />
        <AppInput v-model="loadForm.paidAmount" type="number" min="0" step="0.01" label="To'langan summa" />
        <AppSelect
          v-model="loadForm.supplier"
          label="Kimdan keldi?"
          :options="supplierOptions"
          :translate-options="false"
          :searchable="true"
          placeholder="Ta'minotchi"
        />
        <div class="md:col-span-2">
          <AppInput v-model="loadForm.notes" label="Izoh" placeholder="Masalan, 1 Howo ertalab keldi" />
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Jami summa</p>
          <p class="text-lg font-semibold text-slate-900">{{ formatSom(loadPreviewTotal) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Avtomatik narx / tonna</p>
          <p class="text-lg font-semibold text-slate-900">{{ formatSom(loadPreviewPricePerTon) }}</p>
        </div>
        <div class="rounded-2xl bg-rose-50 px-4 py-3">
          <p class="text-xs text-rose-700">Biz qarzmiz</p>
          <p class="text-lg font-semibold text-rose-700">{{ formatSom(loadPreviewDebt) }}</p>
        </div>
        <div class="rounded-2xl bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">U qarz</p>
          <p class="text-lg font-semibold text-sky-700">{{ formatSom(loadPreviewAdvance) }}</p>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="saveLoad">{{ t("Tosh kirimini qo'shish") }}</button>
      </div>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('3. Sotuv kiritish') }}</h3>
        <p class="text-xs text-slate-500">Masalan, Begzod 20 tonna qum oldi</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="saleForm.date" type="date" label="Sana" />
        <AppInput v-model="saleForm.time" type="time" label="Soat" />

        <div class="space-y-2 md:col-span-2">
          <AppSelect
            v-model="saleForm.clientName"
            label="Klient"
            :options="clientOptions"
            :translate-options="false"
            :searchable="true"
            placeholder="Klientni tanlang"
          />

          <div v-if="matchedSaleClients.length" class="flex flex-wrap gap-2">
            <button
              v-for="client in matchedSaleClients"
              :key="client.clientName"
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-700"
              @click="applySaleClientSuggestion(client.clientName)"
            >
              {{ client.clientName }}
            </button>
          </div>
        </div>

        <AppSelect
          v-model="saleForm.productName"
          label="Mahsulot"
          :options="productTypes.map((item) => ({ label: item, value: item }))"
        />
        <AppSelect
          v-model="saleForm.shipmentType"
          label="Yuk turi"
          :options="saleBulkAllowed
            ? [
                { label: 'Qoplik', value: 'qoplik' },
                { label: 'Rasipnoy', value: 'rasipnoy' }
              ]
            : [{ label: 'Qoplik', value: 'qoplik' }]"
        />
        <p v-if="!saleBulkAllowed" class="text-xs text-amber-700 md:col-span-2">Mel faqat qoplik sotiladi.</p>
        <AppInput v-model="saleForm.tons" type="number" min="0" step="0.01" label="Tonna" />
        <AppInput v-model="saleForm.pricePerTon" type="number" min="0" step="0.01" label="Narx / kg" />
        <AppInput v-model="saleForm.paidAmount" type="number" min="0" step="0.01" label="To'langan summa" />
        <AppSelect
          v-model="saleForm.paymentMethod"
          label="To`lov turi"
          :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        />

        <div
          v-if="activeSaleClientSummary"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ activeSaleClientSummary.clientName }} klient kartasi</p>
              <p class="text-xs text-slate-500">Oldingi yuklar, o'rtacha narx va qarz shu yerda ko'rinadi.</p>
            </div>

            <button
              v-if="activeSaleClientLastSale"
              type="button"
              class="btn-secondary !px-3 !py-1.5 text-xs"
              @click="applyQuickSaleDefaults"
            >
              Oxirgi narxni qo'yish
            </button>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Jami tonna</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ formatTons(activeSaleClientSummary.totalTons) }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Jami tushum</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(activeSaleClientSummary.totalRevenue) }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">O'rtacha narx / kg</p>
              <p class="mt-1 text-base font-semibold text-slate-900">
                {{ formatSom(activeSaleClientSummary.averagePricePerTon) }}
              </p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Balans</p>
              <p class="mt-1 text-base font-semibold" :class="balanceToneClass(activeSaleClientSummary.balanceType)">
                {{ balanceLabel(activeSaleClientSummary.balanceType) }}: {{ formatSom(activeSaleClientSummary.balanceAmount) }}
              </p>
            </div>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Oxirgi sana</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">
                {{ formatDate(activeSaleClientSummary.lastPurchaseDate) }}
              </p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Telefon</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeSaleClientContact?.phone || '-' }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Yozuvlar soni</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{{ activeSaleClientProfile.saleCount }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3">
              <p class="text-xs text-slate-500">Oxirgi narx / kg</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">
                {{ activeSaleClientLastSale ? formatSom(activeSaleClientLastSale.pricePerTon) : '-' }}
              </p>
            </div>
          </div>

          <div v-if="activeSaleClientSales.length" class="mt-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Oxirgi yuklar</p>

            <div
              v-for="sale in activeSaleClientSales"
              :key="sale.id"
              class="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:grid-cols-[1fr_0.9fr_0.9fr_0.7fr_0.9fr_0.9fr]"
            >
              <span class="font-medium text-slate-900">{{ formatDate(sale.date) }}</span>
              <span>{{ sale.factory }}</span>
              <span>{{ sale.productName }}</span>
              <span class="capitalize">{{ sale.shipmentType }}</span>
              <span>{{ formatTons(sale.tons) }}</span>
              <span :class="['font-semibold', balanceToneClass(sale.balanceType)]">
                {{ balanceLabel(sale.balanceType) }}: {{ formatSom(sale.balanceAmount) }}
              </span>
            </div>
          </div>
        </div>

        <div class="md:col-span-2">
          <AppInput v-model="saleForm.notes" label="Izoh" placeholder="Qoplik yoki rasipnoy" />
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">Jami</p>
          <p class="text-lg font-semibold text-slate-900">{{ formatSom(salePreviewTotal) }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-500">To'langan</p>
          <p class="text-lg font-semibold text-slate-900">{{ formatSom(Number(saleForm.paidAmount || 0)) }}</p>
        </div>
        <div class="rounded-2xl bg-rose-50 px-4 py-3">
          <p class="text-xs text-rose-700">Bizga qarz</p>
          <p class="text-lg font-semibold text-rose-700">{{ formatSom(salePreviewReceivable) }}</p>
        </div>
        <div class="rounded-2xl bg-sky-50 px-4 py-3">
          <p class="text-xs text-sky-700">{{ balanceLabel(salePreviewBalanceType) }}</p>
          <p class="text-lg font-semibold" :class="balanceToneClass(salePreviewBalanceType)">
            {{ formatSom(salePreviewBalanceType === 'bizdan_qarz' ? salePreviewAdvance : salePreviewDebt) }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="saveSale">{{ t("Sotuvni qo'shish") }}</button>
      </div>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('4. Chiqim kiritish') }}</h3>
        <p class="text-xs text-slate-500">Svet, ishchi, bozorlik yoki boshqa chiqimlar</p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="expenseForm.date" type="date" label="Sana" />
        <AppSelect
          v-model="expenseForm.category"
          label="Kategoriya"
          :options="expenseCategories.map((item) => ({ label: item, value: item }))"
        />
        <AppSelect
          v-model="expenseForm.paymentMethod"
          label="To'lov turi"
          :options="paymentMethods.map((item) => ({ label: item, value: item }))"
        />
        <AppInput v-model="expenseForm.description" label="Tavsif" placeholder="Masalan, ishchilarga ovqat" />
        <AppInput v-model="expenseForm.amount" type="number" min="0" step="0.01" label="Summa" />
        <div class="md:col-span-2">
          <AppInput v-model="expenseForm.notes" label="Izoh" placeholder="Qo'shimcha izoh" />
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="saveExpense">{{ t("Chiqimni qo'shish") }}</button>
      </div>
    </article>
  </section>
</template>
