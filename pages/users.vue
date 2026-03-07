<script setup lang="ts">
import type { ContactRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { clientDirectory, sales, addContact, updateContact, removeContact } = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()

const filters = reactive({
  search: ''
})

const modalOpen = ref(false)
const editingClientId = ref<string | null>(null)
const formError = ref('')
const deleteDialogOpen = ref(false)
const selectedClient = ref<ContactRecord | null>(null)

const form = reactive({
  name: '',
  phone: '',
  address: '',
  notes: ''
})

const columns: TableColumn[] = [
  { key: 'clientName', label: 'Klient' },
  { key: 'phone', label: 'Telefon' },
  { key: 'balanceType', label: 'Balans turi' },
  { key: 'balanceAmount', label: 'Balans', align: 'right' },
  { key: 'totalTons', label: 'Jami tonna', align: 'right' },
  { key: 'averagePricePerTon', label: "O'rtacha narx / kg", align: 'right' },
  { key: 'saleCount', label: 'Sotuv soni', align: 'right' },
  { key: 'lastPurchaseDate', label: 'Oxirgi sana' },
  { key: 'actions', label: 'Amal', align: 'right' }
]

const salesColumns: TableColumn[] = [
  { key: 'date', label: 'Sana' },
  { key: 'factory', label: 'Zavod' },
  { key: 'clientName', label: 'Klient' },
  { key: 'productName', label: 'Mahsulot' },
  { key: 'shipmentType', label: 'Yuk turi' },
  { key: 'tons', label: 'Tonna', align: 'right' },
  { key: 'balanceAmount', label: 'Balans', align: 'right' }
]

const normalizedSearch = computed(() => filters.search.trim().toLowerCase())

const filteredClients = computed(() =>
  clientDirectory.value.filter((client) => {
    if (!normalizedSearch.value) {
      return true
    }

    return [client.clientName, client.phone, client.address, client.notes].some((value) =>
      value.toLowerCase().includes(normalizedSearch.value)
    )
  })
)

const filteredSales = computed(() =>
  sales.value
    .filter((record) => {
      if (!normalizedSearch.value) {
        return true
      }

      return record.clientName.toLowerCase().includes(normalizedSearch.value)
    })
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 8)
)

const topClient = computed(() => filteredClients.value[0] ?? null)
const totalReceivable = computed(() => filteredClients.value.reduce((sum, client) => sum + client.totalDebt, 0))
const totalAdvance = computed(() => filteredClients.value.reduce((sum, client) => sum + client.totalAdvance, 0))
const clientRows = computed<Record<string, unknown>[]>(() => [...filteredClients.value])
const saleRows = computed<Record<string, unknown>[]>(() => [...filteredSales.value])

const balanceToneClass = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'text-rose-700'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'text-sky-700'
  }

  return 'text-emerald-700'
}

const balanceLabel = (balanceType: unknown) => {
  if (balanceType === 'bizga_qarz') {
    return 'Bizga qarz'
  }

  if (balanceType === 'bizdan_qarz') {
    return 'Bizdan qarz'
  }

  return 'Yopilgan'
}

const resetForm = () => {
  form.name = ''
  form.phone = ''
  form.address = ''
  form.notes = ''
  editingClientId.value = null
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

  const client = filteredClients.value.find((item) => item.id === row.id)

  if (!client) {
    return
  }

  form.name = client.clientName
  form.phone = client.phone
  form.address = client.address
  form.notes = client.notes
  editingClientId.value = String(client.id)
  formError.value = ''
  modalOpen.value = true
}

const saveClient = () => {
  if (!isAdmin.value) {
    return
  }

  const normalizedName = form.name.trim()

  if (!normalizedName) {
    formError.value = 'Klient nomini kiriting.'
    return
  }

  const duplicateClient = clientDirectory.value.find(
    (client) => client.clientName.trim().toLowerCase() === normalizedName.toLowerCase() && client.id !== editingClientId.value
  )

  if (duplicateClient) {
    formError.value = 'Bu klient allaqachon mavjud.'
    return
  }

  if (editingClientId.value) {
    updateContact({
      id: editingClientId.value,
      type: 'client',
      name: normalizedName,
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString()
    })
  } else {
    addContact({
      type: 'client',
      name: normalizedName,
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim()
    })
  }

  modalOpen.value = false
  resetForm()
}

const askDelete = (row: Record<string, unknown>) => {
  if (!isAdmin.value) {
    return
  }

  const client = filteredClients.value.find((item) => item.id === row.id)

  if (!client) {
    return
  }

  selectedClient.value = {
    id: String(client.id),
    type: 'client',
    name: client.clientName,
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    createdAt: new Date().toISOString()
  }
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!isAdmin.value) {
    return
  }

  if (selectedClient.value) {
    removeContact(selectedClient.value.id)
  }

  selectedClient.value = null
  deleteDialogOpen.value = false
}

const closeDelete = () => {
  selectedClient.value = null
  deleteDialogOpen.value = false
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">Klientlar</h2>
      <p class="page-subtitle">Klientni shu yerda qo`shasiz. Keyin `Sotuvlar` sahifasida tanlaysiz va balansi ko`rinadi.</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">Klient qo'shish</button>
  </section>

  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard title="Jami klientlar" :value="filteredClients.length" subtitle="qo'lda qo'shilgan va savdoda ishlatilgan" />
    <StatCard title="Bizga qarz" :value="formatSom(totalReceivable)" subtitle="klientlardan olinadi" />
    <StatCard title="Bizdan qarz" :value="formatSom(totalAdvance)" subtitle="avans yoki ortiqcha to`lov" />
    <StatCard title="Top klient" :value="topClient?.clientName ?? '-'" subtitle="eng katta aylanma" />
    <StatCard title="Top klient tushumi" :value="formatSom(topClient?.totalRevenue ?? 0)" subtitle="joriy ro'yxat bo'yicha" />
  </section>

  <section class="panel p-4">
    <div class="grid gap-3 md:grid-cols-[1fr_auto]">
      <AppInput v-model="filters.search" label="Klient qidirish" placeholder="Masalan, Begzod" />
      <div class="flex items-end">
        <button type="button" class="btn-secondary" @click="filters.search = ''">Tozalash</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4 ">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Klientlar ro'yxati</h3>
      </header>

      <AppTable :columns="columns" :rows="clientRows" empty-text="Klientlar topilmadi.">
        <template #cell-balanceType="{ value }">
          <span :class="['font-semibold', balanceToneClass(value)]">{{ balanceLabel(value) }}</span>
        </template>

        <template #cell-balanceAmount="{ row, value }">
          <span :class="['font-semibold', balanceToneClass(row.balanceType)]">{{ formatSom(Number(value)) }}</span>
        </template>

        <template #cell-totalTons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-averagePricePerTon="{ value }">
          {{ formatSom(Number(value)) }}
        </template>

        <template #cell-lastPurchaseDate="{ row, value }">
          {{ row.saleCount ? formatDate(String(value)) : '-' }}
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
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">Oxirgi sotuvlar</h3>
      </header>

      <AppTable :columns="salesColumns" :rows="saleRows" empty-text="Bu klient bo'yicha sotuv topilmadi.">
        <template #cell-shipmentType="{ value }">
          <span class="data-chip capitalize">{{ value }}</span>
        </template>

        <template #cell-tons="{ value }">
          {{ formatTons(Number(value)) }}
        </template>

        <template #cell-balanceAmount="{ row, value }">
          <span :class="['font-semibold', balanceToneClass(row.balanceType)]">
            {{ balanceLabel(row.balanceType) }}: {{ formatSom(Number(value)) }}
          </span>
        </template>
      </AppTable>
    </article>
  </section>

  <AppModal :open="modalOpen" :title="editingClientId ? 'Klientni tahrirlash' : 'Klient qo`shish'" size="md" @close="modalOpen = false">
    <div class="grid gap-4">
      <AppInput v-model="form.name" label="Klient nomi" placeholder="Masalan, Begzod" required />
      <AppInput v-model="form.phone" label="Telefon" placeholder="Masalan, +998 90 123 45 67" />
      <AppInput v-model="form.address" label="Manzil" placeholder="Masalan, Qumqo'rg'on" />
      <AppInput v-model="form.notes" label="Izoh" placeholder="Doimiy klient yoki maxsus eslatma" />

      <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="modalOpen = false">Bekor qilish</button>
        <button type="button" class="btn-primary" @click="saveClient">Saqlash</button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="deleteDialogOpen"
    title="Klientni o'chirish"
    :message="`${selectedClient?.name ?? ''} klient kartasini o'chirasizmi? Sotuv yozuvlari o'chmaydi.`"
    confirm-text="O'chirish"
    cancel-text="Bekor qilish"
    @confirm="confirmDelete"
    @cancel="closeDelete"
  />
</template>
