<script setup lang="ts">
import type { ContactRecord } from '~/types/accounting'
import type { TableColumn } from '~/types/report'

definePageMeta({
  layout: 'dashboard'
})

const { clientDirectory, sales, addContact, updateContact, removeContact } = useFactoryAccounting()
const { isAdmin } = useAuth()
const { formatSom, formatTons, formatDate } = useFormatting()
const { downloadWorkbook } = useExcelExport()
const { printWorkbook } = usePdfExport()
const { t } = useUiLocale()
const telegramEnabled = false

const filters = reactive({
  search: ''
})

const modalOpen = ref(false)
const editingClientId = ref<string | null>(null)
const formError = ref('')
const deleteDialogOpen = ref(false)
const selectedClient = ref<ContactRecord | null>(null)
const telegramLookupLoading = ref(false)
const telegramLookupError = ref('')
const telegramChats = ref<Array<{ chatId: string; username: string; fullName: string; lastText: string; updatedAt: string }>>([])

const form = reactive({
  name: '',
  phone: '',
  telegramChatId: '',
  telegramUsername: '',
  address: '',
  notes: ''
})

const columns = computed<TableColumn[]>(() => {
  const base: TableColumn[] = [
    { key: 'clientName', label: 'Klient', headerClass: 'font-bold text-brand-700' },
    { key: 'phone', label: 'Telefon' },
    { key: 'balanceType', label: 'Balans turi' },
    { key: 'balanceAmount', label: 'Balans', align: 'right' },
    { key: 'totalTons', label: 'Jami tonna', align: 'right' },
    { key: 'averagePricePerTon', label: "O'rtacha narx / kg", align: 'right' },
    { key: 'saleCount', label: 'Sotuv soni', align: 'right' },
    { key: 'lastPurchaseDate', label: 'Oxirgi sana' },
    { key: 'actions', label: 'Amal', align: 'right' }
  ]

  if (telegramEnabled) {
    base.splice(2, 0, { key: 'telegram', label: 'Telegram' })
  }

  return base
})

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

    return [client.clientName, client.phone, client.telegramChatId, client.telegramUsername, client.address, client.notes].some((value) =>
      value.toLowerCase().includes(normalizedSearch.value)
    )
  })
)

const salesMatchingSearch = computed(() =>
  sales.value
    .filter((record) => {
      if (!normalizedSearch.value) {
        return true
      }

      return record.clientName.toLowerCase().includes(normalizedSearch.value)
    })
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
)

const filteredSales = computed(() => salesMatchingSearch.value.slice(0, 8))

const topClient = computed(() => filteredClients.value[0] ?? null)
const totalReceivable = computed(() => filteredClients.value.reduce((sum, client) => sum + client.totalDebt, 0))
const totalAdvance = computed(() => filteredClients.value.reduce((sum, client) => sum + client.totalAdvance, 0))
const clientRows = computed<Record<string, unknown>[]>(() => [...filteredClients.value])
const saleRows = computed<Record<string, unknown>[]>(() => [...filteredSales.value])

const buildClientSheets = () => {
  return [
    {
      name: 'Klientlar',
      columns: [
        { key: 'clientName', label: 'Klient' },
        { key: 'phone', label: 'Telefon' },
        { key: 'address', label: 'Manzil' },
        { key: 'balanceLabel', label: 'Balans turi' },
        { key: 'balanceAmount', label: 'Balans' },
        { key: 'totalTons', label: 'Jami tonna' },
        { key: 'averagePricePerTon', label: "O'rtacha narx / kg" },
        { key: 'totalRevenue', label: 'Jami tushum' },
        { key: 'saleCount', label: 'Sotuv soni' },
        { key: 'lastPurchaseDate', label: 'Oxirgi sana' },
        { key: 'notes', label: 'Izoh' }
      ],
      rows: filteredClients.value.map((client) => ({
        clientName: client.clientName,
        phone: client.phone,
        address: client.address,
        balanceLabel: balanceLabel(client.balanceType),
        balanceAmount: Math.round(client.balanceAmount),
        totalTons: Number(client.totalTons.toFixed(2)),
        averagePricePerTon: Math.round(client.averagePricePerTon),
        totalRevenue: Math.round(client.totalRevenue),
        saleCount: client.saleCount,
        lastPurchaseDate: client.lastPurchaseDate ? formatDate(client.lastPurchaseDate) : '',
        notes: client.notes
      }))
    },
    {
      name: 'Sotuvlar',
      columns: [
        { key: 'date', label: 'Sana' },
        { key: 'factory', label: 'Zavod' },
        { key: 'clientName', label: 'Klient' },
        { key: 'productName', label: 'Mahsulot' },
        { key: 'shipmentType', label: 'Yuk turi' },
        { key: 'tons', label: 'Tonna' },
        { key: 'pricePerTon', label: 'Narx / kg' },
        { key: 'totalAmount', label: 'Jami summa' },
        { key: 'paidAmount', label: "To'langan" },
        { key: 'balanceLabel', label: 'Balans turi' },
        { key: 'balanceAmount', label: 'Balans' }
      ],
      rows: salesMatchingSearch.value.map((record) => ({
        date: formatDate(record.date),
        factory: record.factory,
        clientName: record.clientName,
        productName: record.productName,
        shipmentType: record.shipmentType,
        tons: Number(record.tons.toFixed(2)),
        pricePerTon: Math.round(record.pricePerTon),
        totalAmount: Math.round(record.totalAmount),
        paidAmount: Math.round(record.paidAmount),
        balanceLabel: balanceLabel(record.balanceType),
        balanceAmount: Math.round(record.balanceAmount)
      }))
    }
  ]
}

const exportClientsExcel = () => {
  downloadWorkbook('klientlar', buildClientSheets())
}

const exportClientsPdf = () => {
  printWorkbook('Klientlar', buildClientSheets())
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
  form.telegramChatId = ''
  form.telegramUsername = ''
  form.address = ''
  form.notes = ''
  editingClientId.value = null
  formError.value = ''
  telegramLookupLoading.value = false
  telegramLookupError.value = ''
  telegramChats.value = []
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
  form.telegramChatId = client.telegramChatId
  form.telegramUsername = client.telegramUsername
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
      telegramChatId: form.telegramChatId.trim(),
      telegramUsername: form.telegramUsername.trim().replace(/^@/, ''),
      address: form.address.trim(),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString()
    })
  } else {
    addContact({
      type: 'client',
      name: normalizedName,
      phone: form.phone.trim(),
      telegramChatId: form.telegramChatId.trim(),
      telegramUsername: form.telegramUsername.trim().replace(/^@/, ''),
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
    telegramChatId: client.telegramChatId,
    telegramUsername: client.telegramUsername,
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

const loadTelegramChats = async () => {
  telegramLookupLoading.value = true
  telegramLookupError.value = ''

  try {
    const response = await $fetch<{ chats: Array<{ chatId: string; username: string; fullName: string; lastText: string; updatedAt: string }> }>(
      '/api/notifications/telegram/chats'
    )
    telegramChats.value = response.chats
  } catch (error) {
    telegramLookupError.value = error instanceof Error ? error.message : 'Telegram chatlarni olishda xato.'
  } finally {
    telegramLookupLoading.value = false
  }
}

const applyTelegramChat = (chat: { chatId: string; username: string }) => {
  form.telegramChatId = chat.chatId

  if (chat.username && !form.telegramUsername.trim()) {
    form.telegramUsername = chat.username
  }
}
</script>

<template>
  <section class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="page-title">{{ t('Klientlar') }}</h2>
      <p class="page-subtitle">{{ t('Klientni shu yerda qo`shasiz. Keyin `Sotuvlar` sahifasida tanlaysiz va balansi ko`rinadi.') }}</p>
      <AdminReadOnlyBanner v-if="!isAdmin" class="mt-3" />
    </div>
    <div class="flex flex-wrap gap-2">
      <ExportActions @excel="exportClientsExcel" @pdf="exportClientsPdf" />
      <button v-if="isAdmin" type="button" class="btn-primary" @click="openCreateModal">{{ t("Klient qo'shish") }}</button>
    </div>
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
        <button type="button" class="btn-secondary" @click="filters.search = ''">{{ t('Tozalash') }}</button>
      </div>
    </div>
  </section>

  <section class="grid gap-4 ">
    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t("Klientlar ro'yxati") }}</h3>
      </header>

      <AppTable :columns="columns" :rows="clientRows" empty-text="Klientlar topilmadi.">
        <template #cell-clientName="{ value }">
          <span class="font-bold text-brand-700">{{ value }}</span>
        </template>

        <template #cell-balanceType="{ value }">
          <span :class="['font-semibold', balanceToneClass(value)]">{{ balanceLabel(value) }}</span>
        </template>

        <template v-if="telegramEnabled" #cell-telegram="{ row }">
          <span v-if="row.telegramChatId" class="text-xs font-semibold text-sky-700">
            {{ row.telegramUsername ? `@${row.telegramUsername}` : row.telegramChatId }}
          </span>
          <span v-else class="text-xs text-slate-400">{{ t('Ulanmagan') }}</span>
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
              <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="openEditModal(row)">{{ t('Tahrirlash') }}</button>
              <button type="button" class="btn-danger !px-3 !py-1.5 text-xs" @click="askDelete(row)">{{ t("O'chirish") }}</button>
            </template>
            <span v-else class="text-xs text-slate-400">Faqat admin</span>
          </div>
        </template>
      </AppTable>
    </article>

    <article class="panel p-5">
      <header class="mb-4">
        <h3 class="text-base font-semibold text-slate-900">{{ t('Oxirgi sotuvlar') }}</h3>
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
      <AppInput
        v-model="form.name"
        label="Klient nomi"
        placeholder="Masalan, Begzod"
        :invalid="Boolean(formError) && !form.name.trim()"
        required
      />
      <AppInput v-model="form.phone" mask="phone" label="Telefon" placeholder="Masalan, +998 90 123 45 67" autocomplete="tel" />
      <AppInput v-model="form.address" label="Manzil" placeholder="Masalan, Qumqo'rg'on" />
      <AppInput v-model="form.notes" label="Izoh" placeholder="Doimiy klient yoki maxsus eslatma" />

      <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="modalOpen = false">{{ t('Bekor qilish') }}</button>
        <button type="button" class="btn-primary" @click="saveClient">{{ t('Saqlash') }}</button>
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
