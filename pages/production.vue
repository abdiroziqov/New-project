<script setup lang="ts">
import type { DailyFactoryRecord, FactoryName, ProductType } from '~/types/accounting'
import type { TableColumn } from '~/types/report'
import { isBulkAllowedForProduct, normalizeBulkOutputTons } from '~/composables/useProductRules'

definePageMeta({
  layout: 'dashboard'
})

const {
  dailyRecords,
  defaultCosts,
  factoryOptions,
  productTypes,
  latestDate,
  addDailyRecord,
  updateDailyRecord,
  removeDailyRecord
} = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons } = useFormatting()
const { setRecentDays, setCurrentMonth } = useDateRangePresets()

const createFormState = (): Omit<DailyFactoryRecord, 'id'> => ({
  date: latestDate.value,
  factory: 'Oybek',
  productType: 'Qum',
  incomingStoneTons: 0,
  usedStoneTons: 0,
  baggedOutputTons: 0,
  bulkOutputTons: 0,
  newBagCount: 0,
  oldBagCount: 0,
  notes: '',
  ...defaultCosts.value
})

const filters = reactive({
  startDate: '',
  endDate: '',
  factory: ''
})

const form = reactive<Omit<DailyFactoryRecord, 'id'>>(createFormState())
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const deleteDialogOpen = ref(false)
const selectedRecord = ref<DailyFactoryRecord | null>(null)

const columns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'productType', label: 'Mahsulot' },
  { key: 'usedStoneTons', label: 'Tosh', align: 'right' },
  { key: 'outputTons', label: 'Mahsulot', align: 'right' },
  { key: 'bagCount', label: 'Qop', align: 'right' },
  { key: 'costPerTon', label: "O'rtacha tannarx", align: 'right' },
  { key: 'totalCost', label: 'Jami tannarx', align: 'right' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const filteredRecords = computed(() =>
  dailyRecords.value
    .filter((record) => {
      if (filters.startDate && record.date < filters.startDate) {
        return false
      }

      if (filters.endDate && record.date > filters.endDate) {
        return false
      }

      if (filters.factory && record.factory !== filters.factory) {
        return false
      }

      return true
    })
    .sort((left, right) => right.date.localeCompare(left.date))
)

const filteredSummary = computed(() => ({
  totalOutputTons: filteredRecords.value.reduce((sum, record) => sum + getOutputTons(record), 0),
  totalUsedStoneTons: filteredRecords.value.reduce((sum, record) => sum + record.usedStoneTons, 0),
  totalCost: filteredRecords.value.reduce((sum, record) => sum + getProductionCostOnly(record), 0),
  totalBagCount: filteredRecords.value.reduce((sum, record) => sum + record.newBagCount + record.oldBagCount, 0)
}))

const averageCostPerTon = computed(() =>
  filteredSummary.value.totalOutputTons
    ? filteredSummary.value.totalCost / filteredSummary.value.totalOutputTons
    : 0
)

const tableRows = computed<Record<string, unknown>[]>(() =>
  filteredRecords.value.map((record) => ({
    ...record,
    outputTons: getOutputTons(record),
    bagCount: record.newBagCount + record.oldBagCount,
    costPerTon: getAverageProductionCostPerTon(record),
    totalCost: getProductionCostOnly(record)
  }))
)

const costItems = computed(() => [
  { label: 'Qum ishchi', value: defaultCosts.value.sandWorkerCostPerTon },
  { label: 'Mel ishchi', value: defaultCosts.value.chalkWorkerCostPerTon },
  { label: 'Ortib berish', value: defaultCosts.value.loadingCostPerTon },
  { label: 'Ovqat', value: defaultCosts.value.foodCostPerTon },
  { label: 'Boshqaruvchi', value: defaultCosts.value.supervisorCostPerTon },
  { label: 'Svet', value: defaultCosts.value.electricityCostPerTon },
  { label: 'Tosh', value: defaultCosts.value.stoneCostPerTon },
  { label: 'Qop', value: defaultCosts.value.bagCostPerTon }
])

const formBaggedCostPerTon = computed(() => getCostPerTon(defaultCosts.value, form.productType))
const formBulkCostPerTon = computed(() => getBulkCostPerTon(defaultCosts.value, form.productType))
const formBulkAllowed = computed(() => isBulkAllowedForProduct(form.productType))
const formOutputTons = computed(() =>
  getOutputTons({
    baggedOutputTons: Number(form.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(form.productType, Number(form.bulkOutputTons))
  })
)
const formBaggedTotalCost = computed(() => getSaleTotal(Number(form.baggedOutputTons), formBaggedCostPerTon.value))
const formBulkTotalCost = computed(() =>
  getSaleTotal(normalizeBulkOutputTons(form.productType, Number(form.bulkOutputTons)), formBulkCostPerTon.value)
)
const formTotalCost = computed(() => Number((formBaggedTotalCost.value + formBulkTotalCost.value).toFixed(2)))
const formUsedStoneTons = computed(() =>
  getUsedStoneTons({
    baggedOutputTons: Number(form.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(form.productType, Number(form.bulkOutputTons))
  })
)
const formBagCount = computed(() => getBagCount(Number(form.baggedOutputTons)))

const resetForm = () => {
  Object.assign(form, createFormState())
  editingId.value = null
  formError.value = ''
}

const openCreateModal = () => {
  if (!isAdmin.value) {
    return
  }

  resetForm()
  modalOpen.value = true
}

const openEditModal = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  const record = row as DailyFactoryRecord

  Object.assign(form, {
    date: record.date,
    factory: record.factory,
    productType: record.productType,
    baggedOutputTons: record.baggedOutputTons,
    bulkOutputTons: normalizeBulkOutputTons(record.productType, record.bulkOutputTons),
    incomingStoneTons: 0,
    usedStoneTons: 0,
    newBagCount: 0,
    oldBagCount: 0,
    notes: record.notes,
    ...defaultCosts.value
  })

  editingId.value = record.id
  formError.value = ''
  modalOpen.value = true
}

const saveRecord = () => {
  if (!isAdmin.value) {
    return
  }

  const payload: Omit<DailyFactoryRecord, 'id'> = {
    date: form.date,
    factory: form.factory as FactoryName,
    productType: form.productType as ProductType,
    incomingStoneTons: formUsedStoneTons.value,
    usedStoneTons: formUsedStoneTons.value,
    baggedOutputTons: Number(form.baggedOutputTons),
    bulkOutputTons: normalizeBulkOutputTons(form.productType, Number(form.bulkOutputTons)),
    newBagCount: formBagCount.value,
    oldBagCount: 0,
    notes: form.notes.trim(),
    ...defaultCosts.value
  }

  if (!payload.date || !payload.factory) {
    formError.value = 'Sana va zavodni tanlang.'
    return
  }

  if (formOutputTons.value <= 0) {
    formError.value = 'Mahsulot miqdori 0 dan katta bo`lishi kerak.'
    return
  }

  if (editingId.value) {
    updateDailyRecord({
      id: editingId.value,
      ...payload
    })
  } else {
    addDailyRecord(payload)
  }

  modalOpen.value = false
  resetForm()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  selectedRecord.value = row as DailyFactoryRecord
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value) {
    return
  }

  if (selectedRecord.value) {
    removeDailyRecord(selectedRecord.value.id)
  }

  selectedRecord.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedRecord.value = null
  deleteDialogOpen.value = false
}

const clearFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.factory = ''
}

watch(
  defaultCosts,
  (profile) => {
    Object.assign(form, profile)
  },
  { deep: true }
)

watch(
  () => form.productType,
  (productType) => {
    if (!isBulkAllowedForProduct(productType)) {
      form.bulkOutputTons = 0
    }
  }
)
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">Kunlik hisob</h2>
      <p class="page-subtitle">Har bir zavod bo'yicha kunlik kirim va sarfni kiriting, tannarx esa default narxlardan avtomatik hisoblanadi.</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">Kunlik yozuv qo'shish</button>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Mahsulot" :value="formatTons(filteredSummary.totalOutputTons)" subtitle="filtrlangan yozuvlar" />
    <StatCard title="Tosh sarfi" :value="formatTons(filteredSummary.totalUsedStoneTons)" subtitle="avtomatik hisob" />
    <StatCard title="Jami tannarx" :value="formatSom(filteredSummary.totalCost)" subtitle="kunlik sarf yig'indisi" />
    <StatCard title="O'rtacha tannarx" :value="formatSom(averageCostPerTon)" subtitle="1 tonna uchun" />
    <StatCard title="Qoplar" :value="filteredSummary.totalBagCount" subtitle="faqat qoplik uchun" />
  </section>

  <section class="panel p-4">
    <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setCurrentMonth(filters)">Joriy oy</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 30)">Oxirgi 30 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="setRecentDays(filters, 7)">Oxirgi 7 kun</button>
      <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="clearFilters">Hammasi</button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-4">
      <AppInput v-model="filters.startDate" type="date" label="Boshlanish sanasi" />
      <AppInput v-model="filters.endDate" type="date" label="Tugash sanasi" />
      <AppSelect v-model="filters.factory" label="Zavod" :options="factoryOptions" placeholder="Hamma zavod" />
      <div class="flex items-end">
        <button type="button" class="btn-secondary w-full" @click="clearFilters">Filtrni tozalash</button>
      </div>
    </div>
  </section>

  <section class="panel p-5">
    <AppTable :columns="columns" :rows="tableRows" empty-text="Kunlik hisob yozuvlari topilmadi.">
      <template #cell-usedStoneTons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-outputTons="{ value }">
        {{ formatTons(Number(value)) }}
      </template>

      <template #cell-costPerTon="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-totalCost="{ value }">
        {{ formatSom(Number(value)) }}
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <template v-if="isAdmin">
            <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openEditModal(row)">Tahrirlash</button>
            <button type="button" class="btn-danger !px-3 !py-1.5 text-xs" @click="askDelete(row)">O'chirish</button>
          </template>
          <span v-else class="text-xs text-slate-400">Faqat admin</span>
        </div>
      </template>
    </AppTable>
  </section>

  <AppModal :open="modalOpen" :title="editingId ? 'Kunlik yozuvni tahrirlash' : 'Kunlik yozuv qo`shish'" size="xl" @close="modalOpen = false">
    <div class="space-y-6">
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">Asosiy ma'lumot</h3>
          <NuxtLink to="/expenses" class="btn-secondary !px-3 !py-1.5 text-xs">
            Narxlarni o'zgartirish
          </NuxtLink>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <AppInput v-model="form.date" type="date" label="Sana" required />
          <AppSelect v-model="form.factory" label="Zavod" :options="factoryOptions" required />
          <AppSelect
            v-model="form.productType"
            label="Mahsulot turi"
            :options="productTypes.map((item) => ({ label: item, value: item }))"
            required
          />
          <AppInput v-model="form.baggedOutputTons" type="number" min="0" step="0.01" label="Qoplik mahsulot (t)" />
          <AppInput
            v-model="form.bulkOutputTons"
            type="number"
            min="0"
            step="0.01"
            label="Rasipnoy mahsulot (t)"
            :disabled="!formBulkAllowed"
            :placeholder="formBulkAllowed ? '' : 'Mel faqat qoplik bo`ladi'"
          />
          <div class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Avtomatik tosh</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatTons(formUsedStoneTons) }}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Avtomatik qop</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formBagCount }} dona</p>
          </div>
        </div>
      </section>

      <section>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">Avtomatik tannarx</h3>
          <span class="data-chip">{{ formBulkAllowed ? "Rasipnoyda ortib berish va qop yo'q" : 'Mel faqat qoplik bo`ladi' }}</span>
        </div>
        <p class="mb-4 text-xs text-slate-500">
          Bu narxlar `Chiqimlar` sahifasidagi default sozlamalardan olinadi. Narx o'zgarsa kunlik hisob avtomatik qayta hisoblanadi.
        </p>
        <p class="mb-4 text-xs text-slate-500">Quyidagi narxlar `1 kg` uchun. Jami tannarx esa tonnaga qarab avtomatik ko'payadi.</p>
        <p class="mb-4 text-xs text-slate-500">
          Norma: `1 tonna qoplik = 25 qop`, `1 tonna mahsulot = 1 tonna tosh`. Rasipnoyda qop ishlatilmaydi.
        </p>
        <div class="grid gap-3 md:grid-cols-3">
          <div v-for="item in costItems" :key="item.label" class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">{{ item.label }}</p>
            <p class="mt-1 text-base font-semibold text-slate-900">{{ formatSom(item.value) }}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">{{ form.productType }} qoplik 1 kg</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatSom(formBaggedCostPerTon) }}</p>
          </div>
          <div :class="formBulkAllowed ? 'rounded-2xl bg-sky-50 px-4 py-3' : 'rounded-2xl bg-slate-100 px-4 py-3'">
            <p :class="formBulkAllowed ? 'text-xs text-sky-700' : 'text-xs text-slate-500'">
              {{ form.productType }} rasipnoy 1 kg
            </p>
            <p :class="formBulkAllowed ? 'mt-1 text-lg font-semibold text-sky-700' : 'mt-1 text-lg font-semibold text-slate-500'">
              {{ formBulkAllowed ? formatSom(formBulkCostPerTon) : 'Yo`q' }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <AppInput v-model="form.notes" label="Izoh" placeholder="Kunlik eslatma yoki izoh" />
        <div class="rounded-2xl bg-slate-50 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-500">Hisob preview</p>
          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Mahsulot</span>
              <strong class="text-slate-900">{{ formatTons(formOutputTons) }}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Tosh sarfi</span>
              <strong class="text-slate-900">{{ formatTons(formUsedStoneTons) }}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Qop soni</span>
              <strong class="text-slate-900">{{ formBagCount }} dona</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Qoplik jami tannarx</span>
              <strong class="text-slate-900">{{ formatSom(formBaggedTotalCost) }}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Rasipnoy jami tannarx</span>
              <strong class="text-slate-900">{{ formBulkAllowed ? formatSom(formBulkTotalCost) : 'Yo`q' }}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Jami tannarx</span>
              <strong class="text-slate-900">{{ formatSom(formTotalCost) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="modalOpen = false">Bekor qilish</button>
        <button type="button" class="btn-primary" @click="saveRecord">
          {{ editingId ? 'Saqlash' : 'Qo`shish' }}
        </button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Kunlik yozuvni o'chirish"
    :message="`Tanlangan ${selectedRecord?.factory ?? ''} yozuvini o'chirasizmi?`"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />
</template>
