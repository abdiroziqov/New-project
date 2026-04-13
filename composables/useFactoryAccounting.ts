import barterSource from '~/data/mock/barter-records.json'
import contactsSource from '~/data/mock/contacts.json'
import dailySource from '~/data/mock/daily-factory-records.json'
import expensesSource from '~/data/mock/operational-expenses.json'
import loadsSource from '~/data/mock/incoming-loads.json'
import manualDebtsSource from '~/data/mock/manual-debts.json'
import monthlyArchiveSource from '~/data/mock/monthly-archive-records.json'
import paymentsSource from '~/data/mock/client-payments.json'
import salesSource from '~/data/mock/customer-sales.json'
import scaleCashEntriesSource from '~/data/mock/scale-cash-entries.json'
import scaleEntriesSource from '~/data/mock/scale-entries.json'
import type {
  ArchiveFactoryScope,
  AuditAction,
  AuditLogRecord,
  BarterRecord,
  ClientReminderSetting,
  ClientDirectoryRecord,
  ClientSummary,
  ContactRecord,
  CostProfile,
  DailyFactoryRecord,
  DebtorSummary,
  ExpenseCategory,
  FactoryName,
  IncomingLoadRecord,
  ManualDebtRecord,
  MonthlyArchiveItem,
  MonthlyArchiveRecord,
  MonthlyArchiveSection,
  OperationalExpense,
  PaymentRecord,
  PaymentMethod,
  PaymentStatus,
  ProductType,
  ReminderFrequency,
  ScaleCashEntry,
  ScaleCashType,
  ScaleDirection,
  ScaleEntry,
  ScaleSyncMeta,
  SaleRecord,
  ShipmentType,
  SupplierSummary,
  VehicleType
} from '~/types/accounting'
import type { ChartPoint } from '~/types/report'
import { normalizeBulkOutputTons, normalizeShipmentTypeForProduct } from '~/composables/useProductRules'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const normalizeClientName = (value: string) => value.trim().toLowerCase()
const normalizeContactName = (value: string) => value.trim().toLowerCase()
const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const normalizeTime = (value: string | undefined) => {
  if (!value) {
    return ''
  }

  const matched = value.match(/^(\d{2}):(\d{2})/)
  return matched ? `${matched[1]}:${matched[2]}` : ''
}
const formatUzDate = (value: string) => {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!matched) {
    return value
  }

  const [, year, month, day] = matched
  return `${Number(year)} ${Number(day)} ${monthNames[Number(month) - 1]}`
}
const formatSomValue = (value: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} som`

const seedContacts = contactsSource as ContactRecord[]
const seedBarterRecords = barterSource as BarterRecord[]
const seedDailyRecords = dailySource as DailyFactoryRecord[]
const seedIncomingLoads = loadsSource as IncomingLoadRecord[]
const seedManualDebts = manualDebtsSource as ManualDebtRecord[]
const seedPayments = paymentsSource as PaymentRecord[]
const seedSales = salesSource as SaleRecord[]
const seedExpenses = expensesSource as OperationalExpense[]
const seedMonthlyArchiveRecords = monthlyArchiveSource as MonthlyArchiveRecord[]
const seedScaleCashEntries = scaleCashEntriesSource as ScaleCashEntry[]
const seedScaleEntries = scaleEntriesSource as ScaleEntry[]

export const factories: FactoryName[] = ['Oybek', 'Jamshid']
const workerPayoutModeByFactory: Record<FactoryName, 'daily' | 'monthly'> = {
  Oybek: 'monthly',
  Jamshid: 'daily'
}
export const productTypes: ProductType[] = ['Qum', 'Mel']
export const vehicleTypes: VehicleType[] = ['Howo', 'Kamaz']
export const shipmentTypes: ShipmentType[] = ['qoplik', 'rasipnoy']
export const expenseCategories: ExpenseCategory[] = [
  'Ishchi',
  'Ovqat',
  'Svet',
  'Bozorlik',
  'Yuklash',
  'Sementovoz kredit',
  'Panel kredit',
  'Kobalt kredit',
  'Soliq',
  'Boshqa'
]
export const paymentMethods: PaymentMethod[] = ['Naqd', 'Click', 'Prichesleniya']
export const reminderFrequencies: ReminderFrequency[] = ['daily', 'every_2_days']
export const archiveFactoryScopes: ArchiveFactoryScope[] = ['Oybek', 'Jamshid', 'combined']
export const monthlyArchiveSections: MonthlyArchiveSection[] = ['income', 'expense', 'note']
export const scaleDirections: ScaleDirection[] = ['kirim', 'chiqim', 'unknown']
export const scaleCashTypes: ScaleCashType[] = ['kirim', 'chiqim']

export const defaultCostProfile: CostProfile = {
  sandPricePerTon: 240,
  chalkPricePerTon: 250,
  sandWorkerCostPerTon: 35,
  chalkWorkerCostPerTon: 40,
  marketCostPerTon: 0,
  loadingCostPerTon: 10,
  foodCostPerTon: 10,
  supervisorCostPerTon: 10,
  electricityCostPerTon: 30,
  stoneCostPerTon: 70,
  bagCostPerTon: 20
}

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
const applyCostProfile = <T extends object>(payload: T, profile: CostProfile) => ({
  ...payload,
  ...profile
})
const KG_PER_TON = 1000
const BAGS_PER_TON = 25
const STONE_USAGE_PER_TON = 1

const sortByDateDesc = <T extends { date: string }>(left: T, right: T) => right.date.localeCompare(left.date)

const dateInRange = (value: string, startDate: string, endDate: string) => {
  if (startDate && value < startDate) {
    return false
  }

  if (endDate && value > endDate) {
    return false
  }

  return true
}

const buildTrend = <T extends { date: string }>(records: T[], getter: (record: T) => number, color?: string) => {
  const buckets = new Map<string, number>()

  records
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((record) => {
      const key = record.date.slice(5)
      buckets.set(key, Number(((buckets.get(key) ?? 0) + getter(record)).toFixed(2)))
    })

  return Array.from(buckets.entries()).map<ChartPoint>(([label, value]) => ({
    label,
    value,
    color
  }))
}

const roundAmount = (value: number) => Number(value.toFixed(2))
const getNextIsoDate = (value: string) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10)
  }

  const nextDate = new Date(Date.UTC(year, month - 1, day))
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toISOString().slice(0, 10)
}

export const getOutputTons = (record: Pick<DailyFactoryRecord, 'baggedOutputTons' | 'bulkOutputTons'>) =>
  Number((record.baggedOutputTons + record.bulkOutputTons).toFixed(2))

export const getUsedStoneTons = (record: Pick<DailyFactoryRecord, 'baggedOutputTons' | 'bulkOutputTons'>) =>
  Number((getOutputTons(record) * STONE_USAGE_PER_TON).toFixed(2))

export const getBagCount = (baggedOutputTons: number) => Math.round(Math.max(baggedOutputTons, 0) * BAGS_PER_TON)
export const getKilograms = (tons: number) => Number((Math.max(tons, 0) * KG_PER_TON).toFixed(2))

export const getDefaultSalePricePerTon = (profile: CostProfile, productType: ProductType) =>
  productType === 'Qum' ? profile.sandPricePerTon : profile.chalkPricePerTon

export const getWorkerCostPerTon = (profile: CostProfile, productType: ProductType) =>
  productType === 'Qum' ? profile.sandWorkerCostPerTon : profile.chalkWorkerCostPerTon

export const getProductionCostBreakdown = (
  profile: CostProfile,
  productType: ProductType,
  baggedOutputTons: number,
  bulkOutputTons: number
) => {
  const normalizedBaggedOutputTons = Number(Math.max(baggedOutputTons, 0).toFixed(2))
  const normalizedBulkOutputTons = normalizeBulkOutputTons(productType, Number(bulkOutputTons))
  const baggedKilograms = getKilograms(normalizedBaggedOutputTons)
  const bulkKilograms = getKilograms(normalizedBulkOutputTons)
  const totalKilograms = baggedKilograms + bulkKilograms

  return {
    worker: roundAmount(totalKilograms * getWorkerCostPerTon(profile, productType)),
    loading: roundAmount(baggedKilograms * profile.loadingCostPerTon),
    market: roundAmount(totalKilograms * profile.marketCostPerTon),
    food: roundAmount(totalKilograms * profile.foodCostPerTon),
    supervisor: roundAmount(totalKilograms * profile.supervisorCostPerTon),
    electricity: roundAmount(totalKilograms * profile.electricityCostPerTon),
    stone: roundAmount(totalKilograms * profile.stoneCostPerTon),
    bag: roundAmount(baggedKilograms * profile.bagCostPerTon)
  }
}

export const getCostPerTon = (profile: CostProfile, productType: ProductType) =>
  Number(
    (
      getWorkerCostPerTon(profile, productType) +
      profile.marketCostPerTon +
      profile.loadingCostPerTon +
      profile.foodCostPerTon +
      profile.supervisorCostPerTon +
      profile.electricityCostPerTon +
      profile.stoneCostPerTon +
      profile.bagCostPerTon
    ).toFixed(2)
  )

export const getBulkCostPerTon = (profile: CostProfile, productType: ProductType) =>
  Number(
    (
      getWorkerCostPerTon(profile, productType) +
      profile.marketCostPerTon +
      profile.foodCostPerTon +
      profile.supervisorCostPerTon +
      profile.electricityCostPerTon +
      profile.stoneCostPerTon
    )
      .toFixed(2)
  )

export const getProductionCostOnly = (record: DailyFactoryRecord) =>
  Number(
    (
      getKilograms(record.baggedOutputTons) * getCostPerTon(record, record.productType) +
      getKilograms(record.bulkOutputTons) * getBulkCostPerTon(record, record.productType)
    ).toFixed(2)
  )

export const getAverageProductionCostPerTon = (record: DailyFactoryRecord) => {
  const outputTons = getOutputTons(record)

  if (!outputTons) {
    return 0
  }

  return Number((getProductionCostOnly(record) / outputTons).toFixed(2))
}

const createComponentTotals = () => ({
  worker: 0,
  loading: 0,
  market: 0,
  food: 0,
  supervisor: 0,
  electricity: 0,
  stone: 0,
  bag: 0
})

const getDailyRecordCostBreakdown = (record: DailyFactoryRecord) => {
  return getProductionCostBreakdown(record, record.productType, record.baggedOutputTons, record.bulkOutputTons)
}

const normalizeDailyRecord = (
  record: Partial<DailyFactoryRecord> &
    Pick<DailyFactoryRecord, 'date' | 'factory' | 'productType' | 'baggedOutputTons' | 'bulkOutputTons' | 'notes'>,
  profile: CostProfile
): DailyFactoryRecord => {
  const baggedOutputTons = Number(record.baggedOutputTons)
  const productType = record.productType ?? 'Qum'
  const bulkOutputTons = normalizeBulkOutputTons(productType, Number(record.bulkOutputTons))
  const usedStoneTons = getUsedStoneTons({ baggedOutputTons, bulkOutputTons })

  return {
    ...record,
    ...profile,
    id: record.id ?? createId('day'),
    productType,
    baggedOutputTons,
    bulkOutputTons,
    incomingStoneTons: usedStoneTons,
    usedStoneTons,
    newBagCount: getBagCount(baggedOutputTons),
    oldBagCount: 0
  }
}

export const getLoadTotal = (tons: number, pricePerTon: number) => Number((tons * pricePerTon).toFixed(2))
export const getLoadPricePerTon = (tons: number, totalAmount: number) =>
  tons > 0 ? Number((totalAmount / tons).toFixed(2)) : 0
export const getSaleTotal = (tons: number, pricePerTon: number) =>
  Number((getKilograms(tons) * pricePerTon).toFixed(2))

export const getRemainingAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.max(totalAmount - paidAmount, 0).toFixed(2))

export const getAdvanceAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.max(paidAmount - totalAmount, 0).toFixed(2))

export const getLoadAdvanceAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.max(paidAmount - totalAmount, 0).toFixed(2))

export const getBalanceType = (totalAmount: number, paidAmount: number) => {
  if (paidAmount < totalAmount) {
    return 'bizga_qarz' as const
  }

  if (paidAmount > totalAmount) {
    return 'bizdan_qarz' as const
  }

  return 'yopilgan' as const
}

export const getBalanceAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.abs(totalAmount - paidAmount).toFixed(2))

export const getPaymentStatus = (totalAmount: number, paidAmount: number): PaymentStatus => {
  if (paidAmount <= 0) {
    return 'qarzdor'
  }

  if (paidAmount > totalAmount) {
    return 'avans'
  }

  if (paidAmount >= totalAmount) {
    return 'tolangan'
  }

  return 'qisman'
}

const normalizeSaleRecord = (
  record: Omit<SaleRecord, 'remainingAmount' | 'advanceAmount' | 'balanceAmount' | 'balanceType' | 'paymentStatus'>
): SaleRecord => {
  const shipmentType = normalizeShipmentTypeForProduct(record.productName, record.shipmentType)
  const totalAmount = getSaleTotal(record.tons, record.pricePerTon)
  const paidAmount = Number(Math.max(record.paidAmount, 0).toFixed(2))
  const remainingAmount = getRemainingAmount(totalAmount, paidAmount)
  const advanceAmount = getAdvanceAmount(totalAmount, paidAmount)
  const balanceType = getBalanceType(totalAmount, paidAmount)
  const balanceAmount = getBalanceAmount(totalAmount, paidAmount)
  const paymentStatus = getPaymentStatus(totalAmount, paidAmount)

  return {
    ...record,
    time: normalizeTime(record.time),
    shipmentType,
    totalAmount,
    paidAmount,
    remainingAmount,
    advanceAmount,
    balanceAmount,
    balanceType,
    paymentStatus,
    paymentMethod: record.paymentMethod ?? 'Naqd'
  }
}

const normalizeIncomingLoadRecord = (
  record: Partial<IncomingLoadRecord> &
    Pick<IncomingLoadRecord, 'date' | 'vehicleType' | 'tons' | 'supplier' | 'notes'> & { factory?: FactoryName | '' },
  fallbackPricePerTon = 0,
  fallbackPaidAmount?: number
): IncomingLoadRecord => {
  const tons = Number(record.tons)
  const fallbackUnitPrice = Number(record.pricePerTon ?? fallbackPricePerTon)
  const rawTotalAmount = Number(record.totalAmount)
  const totalAmount = Number.isFinite(rawTotalAmount) && rawTotalAmount > 0 ? rawTotalAmount : getLoadTotal(tons, fallbackUnitPrice)
  const pricePerTon = getLoadPricePerTon(tons, totalAmount)
  const rawPaidAmount = Number(record.paidAmount ?? fallbackPaidAmount ?? totalAmount)
  const paidAmount = Number.isFinite(rawPaidAmount) ? rawPaidAmount : totalAmount
  const remainingAmount = getRemainingAmount(totalAmount, paidAmount)

  return {
    ...record,
    id: record.id ?? createId('load'),
    factory: record.factory ?? '',
    tons,
    supplier: record.supplier.trim(),
    pricePerTon,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: getPaymentStatus(totalAmount, paidAmount)
  }
}

const normalizeContactRecord = (record: Partial<ContactRecord>): ContactRecord => ({
  id: record.id ?? createId('contact'),
  type: record.type ?? 'client',
  name: record.name?.trim() ?? '',
  phone: record.phone?.trim() ?? '',
  telegramChatId: record.telegramChatId?.trim() ?? '',
  telegramUsername: record.telegramUsername?.trim().replace(/^@/, '') ?? '',
  address: record.address?.trim() ?? '',
  notes: record.notes?.trim() ?? '',
  createdAt: record.createdAt ?? new Date().toISOString()
})

const normalizeReminderRecord = (record: Partial<ClientReminderSetting>): ClientReminderSetting => ({
  id: record.id ?? createId('rem'),
  clientName: record.clientName?.trim() ?? '',
  enabled: Boolean(record.enabled),
  frequency: record.frequency ?? 'daily',
  time: normalizeTime(record.time) || '08:00',
  notes: record.notes?.trim() ?? '',
  lastSentAt: record.lastSentAt ?? ''
})

const normalizeBarterRecord = (record: Partial<BarterRecord>): BarterRecord => ({
  id: record.id ?? createId('barter'),
  date: record.date ?? new Date().toISOString().slice(0, 10),
  supplierName: record.supplierName?.trim() ?? '',
  clientName: record.clientName?.trim() ?? '',
  productName: productTypes.includes(record.productName as ProductType) ? (record.productName as ProductType) : 'Qum',
  tons: Number(Math.max(record.tons ?? 0, 0).toFixed(2)),
  pricePerTon: Number(Math.max(record.pricePerTon ?? 0, 0).toFixed(2)),
  amount: Number(
    Math.max(
      record.amount ?? getSaleTotal(Number(record.tons ?? 0), Number(record.pricePerTon ?? 0)),
      0
    ).toFixed(2)
  ),
  notes: record.notes?.trim() ?? ''
})

const normalizeScaleEntryRecord = (record: Partial<ScaleEntry>): ScaleEntry => ({
  id: record.id ?? createId('scale'),
  telegramUpdateId: Number(record.telegramUpdateId ?? 0),
  date: record.date ?? new Date().toISOString().slice(0, 10),
  time: normalizeTime(record.time),
  direction: scaleDirections.includes(record.direction as ScaleDirection) ? (record.direction as ScaleDirection) : 'unknown',
  tons: Number(Math.max(record.tons ?? 0, 0).toFixed(2)),
  netKg: Number(Math.max(record.netKg ?? 0, 0).toFixed(2)),
  grossKg: Number(Math.max(record.grossKg ?? 0, 0).toFixed(2)),
  tareKg: Number(Math.max(record.tareKg ?? 0, 0).toFixed(2)),
  vehicleNumber: record.vehicleNumber?.trim() ?? '',
  material: record.material?.trim() ?? '',
  partnerName: record.partnerName?.trim() ?? '',
  driverName: record.driverName?.trim() ?? '',
  rawText: record.rawText?.trim() ?? '',
  sourceChatId: record.sourceChatId?.trim() ?? '',
  notes: record.notes?.trim() ?? '',
  createdAt: record.createdAt ?? new Date().toISOString()
})

const normalizeScaleSyncMeta = (value?: Partial<ScaleSyncMeta>): ScaleSyncMeta => ({
  lastSyncAt: value?.lastSyncAt ?? '',
  lastSyncedCount: Number(value?.lastSyncedCount ?? 0),
  lastUpdateId: Number(value?.lastUpdateId ?? 0)
})

const normalizeScaleCashEntryRecord = (record: Partial<ScaleCashEntry>): ScaleCashEntry => ({
  id: record.id ?? createId('scale-cash'),
  date: record.date ?? new Date().toISOString().slice(0, 10),
  type: scaleCashTypes.includes(record.type as ScaleCashType) ? (record.type as ScaleCashType) : 'kirim',
  amount: Number(Math.max(record.amount ?? 0, 0).toFixed(2)),
  paymentMethod: record.paymentMethod ?? 'Naqd',
  description: record.description?.trim() ?? '',
  notes: record.notes?.trim() ?? '',
  source: record.source === 'telegram' ? 'telegram' : 'manual',
  telegramUpdateId: Number(record.telegramUpdateId ?? 0),
  createdAt: record.createdAt ?? new Date().toISOString()
})

const normalizeManualDebtRecord = (record: Partial<ManualDebtRecord>): ManualDebtRecord => {
  const amount = Number(record.amount ?? 0)
  const paidAmount = Number(record.paidAmount ?? 0)

  return {
    id: record.id ?? createId('debt'),
    date: record.date ?? new Date().toISOString().slice(0, 10),
    factory: record.factory ?? 'Oybek',
    clientName: record.clientName?.trim() ?? '',
    amount,
    paidAmount,
    remainingAmount: getRemainingAmount(amount, paidAmount),
    notes: record.notes?.trim() ?? ''
  }
}

const normalizeMonthlyArchiveItem = (record: Partial<MonthlyArchiveItem>): MonthlyArchiveItem => ({
  label: record.label?.trim() ?? '',
  amount: Number(record.amount ?? 0),
  section: monthlyArchiveSections.includes(record.section as MonthlyArchiveSection) ? (record.section as MonthlyArchiveSection) : 'note',
  note: record.note?.trim() ?? ''
})

const normalizeMonthlyArchiveRecord = (record: Partial<MonthlyArchiveRecord>): MonthlyArchiveRecord => ({
  id: record.id ?? createId('archive'),
  title: record.title?.trim() || 'Qo`lda kiritilgan arxiv',
  startDate: record.startDate ?? new Date().toISOString().slice(0, 10),
  endDate: record.endDate ?? record.startDate ?? new Date().toISOString().slice(0, 10),
  factoryScope: archiveFactoryScopes.includes(record.factoryScope as ArchiveFactoryScope)
    ? (record.factoryScope as ArchiveFactoryScope)
    : 'combined',
  producedTons: Number(record.producedTons ?? 0),
  shippedTons: Number(record.shippedTons ?? 0),
  stoneLoadSummary: record.stoneLoadSummary?.trim() ?? '',
  stonePaymentTotal: Number(record.stonePaymentTotal ?? 0),
  incomingMoneyTotal: Number(record.incomingMoneyTotal ?? 0),
  declaredExpenseTotal: Number(record.declaredExpenseTotal ?? 0),
  declaredProfitTotal: Number(record.declaredProfitTotal ?? 0),
  notes: record.notes?.trim() ?? '',
  items: Array.isArray(record.items) ? record.items.map((item) => normalizeMonthlyArchiveItem(item)) : []
})

const buildCostBreakdown = (profile: CostProfile) => {
  return [
    { label: 'Qum ishchi', value: profile.sandWorkerCostPerTon, color: '#16a34a' },
    { label: 'Mel ishchi', value: profile.chalkWorkerCostPerTon, color: '#15803d' },
    { label: 'Bozorliq', value: profile.marketCostPerTon, color: '#7c2d12' },
    { label: 'Yuklash', value: profile.loadingCostPerTon, color: '#0f766e' },
    { label: 'Ovqat', value: profile.foodCostPerTon, color: '#f59e0b' },
    { label: 'Boshqaruv', value: profile.supervisorCostPerTon, color: '#f97316' },
    { label: 'Svet', value: profile.electricityCostPerTon, color: '#dc2626' },
    { label: 'Tosh', value: profile.stoneCostPerTon, color: '#7c3aed' },
    { label: 'Qop', value: profile.bagCostPerTon, color: '#475569' }
  ]
}

export const useFactoryAccounting = () => {
  const { hasRole, isAdmin, user } = useAuth()
  const defaultCosts = useState<CostProfile>('accounting:default-costs', () => clone(defaultCostProfile))
  const contacts = useState<ContactRecord[]>(
    'accounting:contacts',
    () => clone(seedContacts).map((record) => normalizeContactRecord(record))
  )
  const dailyRecords = useState<DailyFactoryRecord[]>(
    'accounting:daily-records',
    () => clone(seedDailyRecords).map((record) => normalizeDailyRecord(record, defaultCostProfile))
  )
  const barterRecords = useState<BarterRecord[]>(
    'accounting:barter-records',
    () => clone(seedBarterRecords).map((record) => normalizeBarterRecord(record))
  )
  const incomingLoads = useState<IncomingLoadRecord[]>(
    'accounting:incoming-loads',
    () => clone(seedIncomingLoads).map((record) => normalizeIncomingLoadRecord(record, Number(record.pricePerTon ?? 0), record.paidAmount))
  )
  const scaleEntries = useState<ScaleEntry[]>(
    'accounting:scale-entries',
    () => clone(seedScaleEntries).map((record) => normalizeScaleEntryRecord(record))
  )
  const scaleSyncMeta = useState<ScaleSyncMeta>(
    'accounting:scale-sync-meta',
    () => normalizeScaleSyncMeta()
  )
  const scaleCashEntries = useState<ScaleCashEntry[]>(
    'accounting:scale-cash-entries',
    () => clone(seedScaleCashEntries).map((record) => normalizeScaleCashEntryRecord(record))
  )
  const sales = useState<SaleRecord[]>(
    'accounting:sales',
    () => seedSales.map((record) => normalizeSaleRecord(record))
  )
  const manualDebts = useState<ManualDebtRecord[]>(
    'accounting:manual-debts',
    () => clone(seedManualDebts).map((record) => normalizeManualDebtRecord(record))
  )
  const payments = useState<PaymentRecord[]>(
    'accounting:payments',
    () =>
      clone(seedPayments).map((record) => ({
        ...record,
        paymentMethod: record.paymentMethod ?? 'Naqd'
      }))
  )
  const expenses = useState<OperationalExpense[]>(
    'accounting:expenses',
    () => clone(seedExpenses)
  )
  const reminders = useState<ClientReminderSetting[]>(
    'accounting:reminders',
    () => []
  )
  const monthlyArchiveRecords = useState<MonthlyArchiveRecord[]>(
    'accounting:monthly-archive-records',
    () => clone(seedMonthlyArchiveRecords).map((record) => normalizeMonthlyArchiveRecord(record))
  )
  const auditLogs = useState<AuditLogRecord[]>(
    'accounting:audit-logs',
    () => []
  )

  const latestDate = computed(() => {
    const dates = [
      ...dailyRecords.value.map((record) => record.date),
      ...incomingLoads.value.map((record) => record.date),
      ...manualDebts.value.map((record) => record.date),
      ...payments.value.map((record) => record.date),
      ...barterRecords.value.map((record) => record.date),
      ...sales.value.map((record) => record.date),
      ...expenses.value.map((record) => record.date)
    ].sort()

    return dates.at(-1) ?? new Date().toISOString().slice(0, 10)
  })

  const sectionDateGuide = computed(() => {
    const buildGuide = (dates: string[]) => {
      const sortedDates = dates.filter(Boolean).slice().sort()
      const lastRecordedDate = sortedDates.at(-1) ?? ''
      const suggestedDate = getNextIsoDate(lastRecordedDate || latestDate.value)

      return {
        lastRecordedDate,
        suggestedDate,
        hasData: Boolean(lastRecordedDate)
      }
    }

    return {
      overall: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...manualDebts.value.map((record) => record.date),
        ...payments.value.map((record) => record.date),
        ...barterRecords.value.map((record) => record.date),
        ...sales.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date),
        ...scaleCashEntries.value.map((record) => record.date)
      ]),
      dashboard: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...sales.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date),
        ...manualDebts.value.map((record) => record.date),
        ...payments.value.map((record) => record.date),
        ...barterRecords.value.map((record) => record.date)
      ]),
      analysis: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...sales.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date),
        ...manualDebts.value.map((record) => record.date),
        ...payments.value.map((record) => record.date),
        ...barterRecords.value.map((record) => record.date)
      ]),
      production: buildGuide(dailyRecords.value.map((record) => record.date)),
      rawMaterials: buildGuide(incomingLoads.value.map((record) => record.date)),
      suppliers: buildGuide(incomingLoads.value.map((record) => record.date)),
      inventory: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...sales.value.map((record) => record.date)
      ]),
      sales: buildGuide(sales.value.map((record) => record.date)),
      debtors: buildGuide([
        ...manualDebts.value.map((record) => record.date),
        ...payments.value.map((record) => record.date)
      ]),
      expenses: buildGuide(expenses.value.map((record) => record.date)),
      reports: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...sales.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date),
        ...manualDebts.value.map((record) => record.date),
        ...payments.value.map((record) => record.date),
        ...barterRecords.value.map((record) => record.date)
      ]),
      users: buildGuide(
        contacts.value
          .map((contact) => contact.createdAt?.slice(0, 10) ?? '')
          .filter(Boolean)
      ),
      manualEntry: buildGuide([
        ...payments.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date)
      ]),
      quickEntry: buildGuide([
        ...dailyRecords.value.map((record) => record.date),
        ...incomingLoads.value.map((record) => record.date),
        ...sales.value.map((record) => record.date),
        ...expenses.value.map((record) => record.date),
        ...payments.value.map((record) => record.date)
      ]),
      barter: buildGuide(barterRecords.value.map((record) => record.date)),
      scale: buildGuide(scaleCashEntries.value.map((record) => record.date))
    }
  })

  const factoryOptions = computed(() =>
    factories.map((factory) => ({
      label: factory,
      value: factory
    }))
  )

  const clientContacts = computed(() =>
    contacts.value
      .filter((contact) => contact.type === 'client')
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
  )

  const supplierContacts = computed(() =>
    contacts.value
      .filter((contact) => contact.type === 'supplier')
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
  )

  const clientSummaries = computed<ClientSummary[]>(() => {
    const summaryMap = new Map<string, ClientSummary>()
    const applyClientBalance = (current: ClientSummary) => {
      const debtAfterAdvance = Math.max(current.totalDebt - current.totalAdvance, 0)
      const appliedBarter = Math.min(current.totalBarter, debtAfterAdvance)
      const netBalance = Number((current.totalDebt - current.totalAdvance - appliedBarter).toFixed(2))

      if (netBalance > 0) {
        current.balanceType = 'bizga_qarz'
        current.balanceAmount = netBalance
      } else if (netBalance < 0) {
        current.balanceType = 'bizdan_qarz'
        current.balanceAmount = Math.abs(netBalance)
      } else {
        current.balanceType = 'yopilgan'
        current.balanceAmount = 0
      }
    }
    const clientNames = new Set([
      ...clientContacts.value.map((contact) => contact.name),
      ...sales.value.map((sale) => sale.clientName),
      ...manualDebts.value.map((record) => record.clientName),
      ...payments.value.filter((record) => !record.saleId.trim()).map((record) => record.clientName),
      ...barterRecords.value.map((record) => record.clientName)
    ])

    Array.from(clientNames).forEach((clientName) => {
      summaryMap.set(clientName, {
        clientName,
        totalTons: 0,
        totalRevenue: 0,
        averagePricePerTon: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan',
        balanceAmount: 0,
        lastPurchaseDate: '',
        lastFactory: 'Oybek'
      })
    })

    sales.value.forEach((sale) => {
      const current = summaryMap.get(sale.clientName) ?? {
        clientName: sale.clientName,
        totalTons: 0,
        totalRevenue: 0,
        averagePricePerTon: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan' as const,
        balanceAmount: 0,
        lastPurchaseDate: sale.date,
        lastFactory: sale.factory
      }

      current.totalTons += sale.tons
      current.totalRevenue += sale.totalAmount
      current.totalDebt += sale.remainingAmount
      current.totalAdvance += sale.advanceAmount

      if (!current.lastPurchaseDate || sale.date >= current.lastPurchaseDate) {
        current.lastPurchaseDate = sale.date
        current.lastFactory = sale.factory
      }

      current.averagePricePerTon = current.totalTons
        ? Number((current.totalRevenue / getKilograms(current.totalTons)).toFixed(2))
        : 0

      applyClientBalance(current)

      summaryMap.set(sale.clientName, current)
    })

    manualDebts.value.forEach((debt) => {
      const current = summaryMap.get(debt.clientName) ?? {
        clientName: debt.clientName,
        totalTons: 0,
        totalRevenue: 0,
        averagePricePerTon: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan' as const,
        balanceAmount: 0,
        lastPurchaseDate: debt.date,
        lastFactory: debt.factory
      }

      current.totalRevenue += debt.amount
      current.totalDebt += debt.remainingAmount

      if (!current.lastPurchaseDate || debt.date >= current.lastPurchaseDate) {
        current.lastPurchaseDate = debt.date
        current.lastFactory = debt.factory
      }

      applyClientBalance(current)

      summaryMap.set(debt.clientName, current)
    })

    payments.value
      .filter((record) => !record.saleId.trim())
      .forEach((payment) => {
        const current = summaryMap.get(payment.clientName) ?? {
          clientName: payment.clientName,
          totalTons: 0,
          totalRevenue: 0,
          averagePricePerTon: 0,
          totalDebt: 0,
          totalAdvance: 0,
          totalBarter: 0,
          balanceType: 'yopilgan' as const,
          balanceAmount: 0,
          lastPurchaseDate: payment.date,
          lastFactory: payment.factory
        }

        current.totalAdvance += payment.amount

        if (!current.lastPurchaseDate || payment.date >= current.lastPurchaseDate) {
          current.lastPurchaseDate = payment.date
          current.lastFactory = payment.factory
        }

        applyClientBalance(current)

        summaryMap.set(payment.clientName, current)
      })

    barterRecords.value.forEach((barter) => {
      const current = summaryMap.get(barter.clientName) ?? {
        clientName: barter.clientName,
        totalTons: 0,
        totalRevenue: 0,
        averagePricePerTon: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan' as const,
        balanceAmount: 0,
        lastPurchaseDate: barter.date,
        lastFactory: 'Oybek' as const
      }

      current.totalBarter += barter.amount
      applyClientBalance(current)
      summaryMap.set(barter.clientName, current)
    })

    return Array.from(summaryMap.values()).sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue
      }

      return left.clientName.localeCompare(right.clientName)
    })
  })

  const debtorSummaries = computed<DebtorSummary[]>(() => {
    const paidMap = new Map<string, number>()
    const invoiceCountMap = new Map<string, number>()

    sales.value.forEach((sale) => {
      const key = normalizeClientName(sale.clientName)
      paidMap.set(key, roundAmount((paidMap.get(key) ?? 0) + sale.paidAmount))

      if (sale.remainingAmount > 0) {
        invoiceCountMap.set(key, (invoiceCountMap.get(key) ?? 0) + 1)
      }
    })

    manualDebts.value.forEach((debt) => {
      const key = normalizeClientName(debt.clientName)
      paidMap.set(key, roundAmount((paidMap.get(key) ?? 0) + debt.paidAmount))

      if (debt.remainingAmount > 0) {
        invoiceCountMap.set(key, (invoiceCountMap.get(key) ?? 0) + 1)
      }
    })

    payments.value
      .filter((record) => !record.saleId.trim())
      .forEach((payment) => {
        const key = normalizeClientName(payment.clientName)
        paidMap.set(key, roundAmount((paidMap.get(key) ?? 0) + payment.amount))
      })

    barterRecords.value.forEach((barter) => {
      const key = normalizeClientName(barter.clientName)
      paidMap.set(key, roundAmount((paidMap.get(key) ?? 0) + barter.amount))
    })

    return clientSummaries.value
      .filter((summary) => summary.balanceType === 'bizga_qarz' && summary.balanceAmount > 0)
      .map((summary) => {
        const clientKey = normalizeClientName(summary.clientName)

        return {
          clientName: summary.clientName,
          totalDebt: summary.balanceAmount,
          totalPaid: paidMap.get(clientKey) ?? 0,
          totalRevenue: summary.totalRevenue,
          totalTons: summary.totalTons,
          invoiceCount: invoiceCountMap.get(clientKey) ?? 0,
          lastPurchaseDate: summary.lastPurchaseDate,
          lastFactory: summary.lastFactory
        }
      })
      .sort((left, right) => right.totalDebt - left.totalDebt)
  })

  const clientDirectory = computed<ClientDirectoryRecord[]>(() =>
    clientSummaries.value.map((summary) => {
      const contact = clientContacts.value.find(
        (client) => normalizeContactName(client.name) === normalizeClientName(summary.clientName)
      )
      const saleCount =
        sales.value.filter((sale) => normalizeClientName(sale.clientName) === normalizeClientName(summary.clientName)).length +
        manualDebts.value.filter((record) => normalizeClientName(record.clientName) === normalizeClientName(summary.clientName)).length

      return {
        id: contact?.id ?? `client-${normalizeClientName(summary.clientName)}`,
        phone: contact?.phone ?? '',
        telegramChatId: contact?.telegramChatId ?? '',
        telegramUsername: contact?.telegramUsername ?? '',
        address: contact?.address ?? '',
        notes: contact?.notes ?? '',
        saleCount,
        hasSales: saleCount > 0,
        ...summary
      }
    })
  )

  const clientOptions = computed(() =>
    clientDirectory.value.map((client) => ({
      label: client.clientName,
      value: client.clientName
    }))
  )

  const getClientReminder = (clientName: string) =>
    reminders.value.find((record) => normalizeClientName(record.clientName) === normalizeClientName(clientName)) ?? null

  const buildSmsHref = (phone: string, message: string) => {
    const normalizedPhone = phone.replace(/[^\d+]/g, '')
    const separator = normalizedPhone.includes('?') ? '&' : '?'
    return `sms:${normalizedPhone}${separator}body=${encodeURIComponent(message)}`
  }

  const supplierSummaries = computed(() => {
    const summaryMap = new Map<string, SupplierSummary>()
    const supplierNames = new Set([
      ...supplierContacts.value.map((contact) => contact.name),
      ...incomingLoads.value.map((load) => load.supplier),
      ...barterRecords.value.map((record) => record.supplierName)
    ])

    Array.from(supplierNames).forEach((supplierName) => {
      summaryMap.set(supplierName, {
        supplierName,
        totalTons: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan',
        balanceAmount: 0,
        averagePricePerTon: 0,
        loadCount: 0,
        lastLoadDate: '',
        lastFactory: ''
      })
    })

    incomingLoads.value.forEach((load) => {
      const current = summaryMap.get(load.supplier) ?? {
        supplierName: load.supplier,
        totalTons: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan' as const,
        balanceAmount: 0,
        averagePricePerTon: 0,
        loadCount: 0,
        lastLoadDate: load.date,
        lastFactory: load.factory
      }

      const advanceAmount = getLoadAdvanceAmount(load.totalAmount, load.paidAmount)

      current.totalTons += load.tons
      current.totalAmount += load.totalAmount
      current.totalPaid += load.paidAmount
      current.totalDebt += load.remainingAmount
      current.totalAdvance += advanceAmount
      current.loadCount += 1

      if (!current.lastLoadDate || load.date >= current.lastLoadDate) {
        current.lastLoadDate = load.date
        current.lastFactory = load.factory
      }

      current.averagePricePerTon = current.totalTons ? Number((current.totalAmount / current.totalTons).toFixed(2)) : 0

      const netBalance = Number((current.totalAdvance + current.totalBarter - current.totalDebt).toFixed(2))

      if (netBalance > 0) {
        current.balanceType = 'bizga_qarz'
        current.balanceAmount = netBalance
      } else if (netBalance < 0) {
        current.balanceType = 'bizdan_qarz'
        current.balanceAmount = Math.abs(netBalance)
      } else {
        current.balanceType = 'yopilgan'
        current.balanceAmount = 0
      }

      summaryMap.set(load.supplier, current)
    })

    barterRecords.value.forEach((barter) => {
      const current = summaryMap.get(barter.supplierName) ?? {
        supplierName: barter.supplierName,
        totalTons: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDebt: 0,
        totalAdvance: 0,
        totalBarter: 0,
        balanceType: 'yopilgan' as const,
        balanceAmount: 0,
        averagePricePerTon: 0,
        loadCount: 0,
        lastLoadDate: barter.date,
        lastFactory: ''
      }

      current.totalBarter += barter.amount

      const netBalance = Number((current.totalAdvance + current.totalBarter - current.totalDebt).toFixed(2))

      if (netBalance > 0) {
        current.balanceType = 'bizga_qarz'
        current.balanceAmount = netBalance
      } else if (netBalance < 0) {
        current.balanceType = 'bizdan_qarz'
        current.balanceAmount = Math.abs(netBalance)
      } else {
        current.balanceType = 'yopilgan'
        current.balanceAmount = 0
      }

      summaryMap.set(barter.supplierName, current)
    })

    return Array.from(summaryMap.values()).sort((left, right) => {
      if (right.totalAmount !== left.totalAmount) {
        return right.totalAmount - left.totalAmount
      }

      return left.supplierName.localeCompare(right.supplierName)
    })
  })

  const getClientSuggestions = (query: string, limit = 8) => {
    const normalizedQuery = normalizeClientName(query)

    if (!normalizedQuery) {
      return clientDirectory.value.slice(0, limit)
    }

    return clientDirectory.value
      .filter((client) => normalizeClientName(client.clientName).includes(normalizedQuery))
      .sort((left, right) => {
        const leftStartsWith = normalizeClientName(left.clientName).startsWith(normalizedQuery)
        const rightStartsWith = normalizeClientName(right.clientName).startsWith(normalizedQuery)

        if (leftStartsWith !== rightStartsWith) {
          return Number(rightStartsWith) - Number(leftStartsWith)
        }

        return right.totalRevenue - left.totalRevenue
      })
      .slice(0, limit)
  }

  const getClientProfile = (query: string) => {
    const normalizedQuery = normalizeClientName(query)

    if (!normalizedQuery) {
      return {
        summary: null,
        debtor: null,
        contact: null,
        recentSales: [] as SaleRecord[],
        lastSale: null as SaleRecord | null,
        saleCount: 0
      }
    }

    const summary =
      clientSummaries.value.find((client) => normalizeClientName(client.clientName) === normalizedQuery) ??
      getClientSuggestions(query, 1)[0] ??
      null

    if (!summary) {
      return {
        summary: null,
        debtor: null,
        contact: null,
        recentSales: [] as SaleRecord[],
        lastSale: null as SaleRecord | null,
        saleCount: 0
      }
    }

    const clientKey = normalizeClientName(summary.clientName)
    const clientSales = sales.value
      .filter((sale) => normalizeClientName(sale.clientName) === clientKey)
      .slice()
      .sort(sortByDateDesc)

    return {
      summary,
      contact:
        clientContacts.value.find((record) => normalizeContactName(record.name) === clientKey) ?? null,
      debtor:
        debtorSummaries.value.find((record) => normalizeClientName(record.clientName) === clientKey) ?? null,
      recentSales: clientSales.slice(0, 5),
      lastSale: clientSales[0] ?? null,
      saleCount: clientSales.length + manualDebts.value.filter((record) => normalizeClientName(record.clientName) === clientKey).length
    }
  }

  const getSupplierProfile = (query: string) => {
    const normalizedQuery = normalizeContactName(query)

    if (!normalizedQuery) {
      return {
        summary: null,
        contact: null,
        recentLoads: [] as IncomingLoadRecord[],
        loadCount: 0
      }
    }

    const summary =
      supplierSummaries.value.find((supplier) => normalizeContactName(supplier.supplierName) === normalizedQuery) ?? null

    if (!summary) {
      return {
        summary: null,
        contact: null,
        recentLoads: [] as IncomingLoadRecord[],
        loadCount: 0
      }
    }

    const supplierKey = normalizeContactName(summary.supplierName)
    const supplierLoads = incomingLoads.value
      .filter((load) => normalizeContactName(load.supplier) === supplierKey)
      .slice()
      .sort(sortByDateDesc)

    return {
      summary,
      contact:
        supplierContacts.value.find((record) => normalizeContactName(record.name) === supplierKey) ?? null,
      recentLoads: supplierLoads,
      loadCount: supplierLoads.length
    }
  }

  const buildSaleReceiptMessage = (sale: SaleRecord) => {
    const contact =
      clientContacts.value.find((record) => normalizeContactName(record.name) === normalizeClientName(sale.clientName)) ?? null

    return [
      'Ming Bir Hazina',
      `Klient: ${sale.clientName}`,
      `Sana: ${formatUzDate(sale.date)}`,
      `Soat: ${sale.time || '-'}`,
      `Zavod: ${sale.factory}`,
      `Mahsulot: ${sale.productName}`,
      `Yuk turi: ${sale.shipmentType}`,
      `Miqdor: ${sale.tons} tonna`,
      `Narx: ${formatSomValue(sale.pricePerTon)}/kg`,
      `Jami: ${formatSomValue(sale.totalAmount)}`,
      `To'langan: ${formatSomValue(sale.paidAmount)}`,
      `Qarz: ${formatSomValue(sale.remainingAmount)}`,
      contact?.phone ? `Tel: ${contact.phone}` : '',
      sale.notes ? `Izoh: ${sale.notes}` : ''
    ]
      .filter(Boolean)
      .join('\n')
  }

  const buildDebtReminderMessage = (clientName: string) => {
    const profile = getClientProfile(clientName)
    const summary = profile.summary
    const debtor = profile.debtor
    const contact = profile.contact

    if (!summary || !debtor || debtor.totalDebt <= 0) {
      return ''
    }

    return [
      'Ming Bir Hazina',
      `${summary.clientName}, sizda qarz mavjud.`,
      summary.totalTons > 0 ? `Jami olingan yuk: ${summary.totalTons} tonna` : '',
      `Jami summa: ${formatSomValue(summary.totalRevenue)}`,
      `Qarz qoldiq: ${formatSomValue(debtor.totalDebt)}`,
      `Oxirgi yuk sanasi: ${summary.lastPurchaseDate ? formatUzDate(summary.lastPurchaseDate) : '-'}`,
      `Tel: ${contact?.phone || '-'}`,
      'Iltimos, to`lovni tasdiqlang.'
    ].join('\n')
  }

  const buildTelegramLink = (username: string) => {
    const normalizedUsername = username.trim().replace(/^@/, '')

    if (!normalizedUsername) {
      return ''
    }

    return `https://t.me/${normalizedUsername}`
  }

  const upsertReminder = (payload: Omit<ClientReminderSetting, 'id'> & { id?: string }, options?: { silent?: boolean }) => {
    if (!guardAdminMutation()) {
      return
    }

    const normalizedPayload = normalizeReminderRecord(payload)
    const existingIndex = reminders.value.findIndex(
      (record) =>
        record.id === payload.id ||
        normalizeClientName(record.clientName) === normalizeClientName(normalizedPayload.clientName)
    )

    if (existingIndex === -1) {
      reminders.value.unshift(normalizedPayload)
      if (!options?.silent) {
        appendAuditLog({
          action: 'add',
          section: 'Qarzdorlar',
          entityType: 'telegram-reminder',
          recordId: normalizedPayload.id,
          summary: `${normalizedPayload.clientName} uchun TG eslatma qo'shildi`,
          after: normalizedPayload
        })
      }
      return
    }

    const previous = reminders.value[existingIndex]
    reminders.value[existingIndex] = {
      ...reminders.value[existingIndex],
      ...normalizedPayload
    }
    if (!options?.silent) {
      appendAuditLog({
        action: 'update',
        section: 'Qarzdorlar',
        entityType: 'telegram-reminder',
        recordId: reminders.value[existingIndex].id,
        summary: `${normalizedPayload.clientName} uchun TG eslatma tahrirlandi`,
        before: previous,
        after: reminders.value[existingIndex]
      })
    }
  }

  const removeReminder = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = reminders.value.find((record) => record.id === id)
    reminders.value = reminders.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Qarzdorlar',
        entityType: 'telegram-reminder',
        recordId: existing.id,
        summary: `${existing.clientName} uchun TG eslatma o'chirildi`,
        before: existing
      })
    }
  }

  const markReminderSent = (clientName: string, sentAt = new Date().toISOString()) => {
    if (!guardAdminMutation()) {
      return
    }

    const reminder = getClientReminder(clientName)

    if (!reminder) {
      return
    }

    upsertReminder({
      ...reminder,
      lastSentAt: sentAt
    }, { silent: true })
  }

  const reminderList = computed(() =>
    reminders.value
      .map((record) => {
        const profile = getClientProfile(record.clientName)

        return {
          ...record,
          phone: profile.contact?.phone ?? '',
          telegramChatId: profile.contact?.telegramChatId ?? '',
          telegramUsername: profile.contact?.telegramUsername ?? '',
          debt: profile.summary?.totalDebt ?? 0,
          active: record.enabled && (profile.summary?.totalDebt ?? 0) > 0,
          readyForTelegram: Boolean(profile.contact?.telegramChatId)
        }
      })
      .sort((left, right) => Number(right.active) - Number(left.active))
  )

  const recentSales = computed(() => sales.value.slice().sort(sortByDateDesc).slice(0, 6))
  const recentLoads = computed(() => incomingLoads.value.slice().sort(sortByDateDesc).slice(0, 6))
  const recentPayments = computed(() => payments.value.slice().sort(sortByDateDesc).slice(0, 6))
  const recentExpenses = computed(() => expenses.value.slice().sort(sortByDateDesc).slice(0, 6))

  const canManageAccounting = computed(() => isAdmin.value)

  const toAuditPayload = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') {
      return null
    }

    return clone(value as Record<string, unknown>)
  }

  const appendAuditLog = (payload: {
    action: AuditAction
    section: string
    entityType: string
    recordId: string
    summary: string
    before?: unknown
    after?: unknown
  }) => {
    if (!user.value) {
      return
    }

    auditLogs.value.unshift({
      id: createId('audit'),
      createdAt: new Date().toISOString(),
      actorId: user.value.id,
      actorName: user.value.name,
      actorUsername: user.value.username,
      actorRole: user.value.role,
      section: payload.section,
      entityType: payload.entityType,
      action: payload.action,
      recordId: payload.recordId,
      summary: payload.summary,
      before: toAuditPayload(payload.before),
      after: toAuditPayload(payload.after)
    })

    if (auditLogs.value.length > 500) {
      auditLogs.value = auditLogs.value.slice(0, 500)
    }
  }

  const guardAdminMutation = () => {
    if (hasRole('admin')) {
      return true
    }

    console.warn('Faqat admin yozuvlarni o‘zgartira oladi.')
    return false
  }

  const addContact = (payload: Omit<ContactRecord, 'id' | 'createdAt'>, options?: { silent?: boolean }) => {
    if (!guardAdminMutation()) {
      return
    }

    const record = normalizeContactRecord({
      id: createId('contact'),
      createdAt: new Date().toISOString(),
      ...payload
    })

    contacts.value.unshift(record)

    if (!options?.silent) {
      appendAuditLog({
        action: 'add',
        section: payload.type === 'supplier' ? "Ta'minotchilar" : 'Klientlar',
        entityType: payload.type,
        recordId: record.id,
        summary: `${record.name} qo'shildi`,
        after: record
      })
    }
  }

  const updateContact = (payload: ContactRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = contacts.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      const previous = contacts.value[index]
      const record = normalizeContactRecord(payload)
      contacts.value[index] = record
      appendAuditLog({
        action: 'update',
        section: record.type === 'supplier' ? "Ta'minotchilar" : 'Klientlar',
        entityType: record.type,
        recordId: record.id,
        summary: `${record.name} tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeContact = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = contacts.value.find((record) => record.id === id)
    contacts.value = contacts.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: existing.type === 'supplier' ? "Ta'minotchilar" : 'Klientlar',
        entityType: existing.type,
        recordId: existing.id,
        summary: `${existing.name} o'chirildi`,
        before: existing
      })
    }
  }

  const ensureClientContact = (clientName: string) => {
    const normalizedName = normalizeClientName(clientName)

    if (!normalizedName) {
      return
    }

    const existingContact = clientContacts.value.find((contact) => normalizeContactName(contact.name) === normalizedName)

    if (!existingContact) {
      addContact({
        type: 'client',
        name: clientName,
        phone: '',
        telegramChatId: '',
        telegramUsername: '',
        address: '',
        notes: ''
      }, { silent: true })
    }
  }

  const ensureSupplierContact = (supplierName: string) => {
    const normalizedName = normalizeContactName(supplierName)

    if (!normalizedName) {
      return
    }

    const existingContact = supplierContacts.value.find((contact) => normalizeContactName(contact.name) === normalizedName)

    if (!existingContact) {
      addContact({
        type: 'supplier',
        name: supplierName,
        phone: '',
        telegramChatId: '',
        telegramUsername: '',
        address: '',
        notes: ''
      }, { silent: true })
    }
  }

  const updateDefaultCosts = (payload: CostProfile) => {
    if (!guardAdminMutation()) {
      return
    }

    const previous = clone(defaultCosts.value)

    defaultCosts.value = {
      ...payload
    }
    dailyRecords.value = dailyRecords.value.map((record) => normalizeDailyRecord(record, defaultCosts.value))
    appendAuditLog({
      action: 'update',
      section: 'Chiqimlar',
      entityType: 'default-costs',
      recordId: 'default-costs',
      summary: 'Avtomatik tannarx sozlamalari tahrirlandi',
      before: previous,
      after: payload
    })
  }

  const addDailyRecord = (payload: Omit<DailyFactoryRecord, 'id'>) => {
    if (!guardAdminMutation()) {
      return
    }

    const record = normalizeDailyRecord({ id: createId('day'), ...payload }, defaultCosts.value)
    dailyRecords.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Kunlik Hisob',
      entityType: 'daily-record',
      recordId: record.id,
      summary: `${record.factory} uchun ${record.date} kunlik yozuv qo'shildi`,
      after: record
    })
  }

  const updateDailyRecord = (payload: DailyFactoryRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = dailyRecords.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      const previous = dailyRecords.value[index]
      const record = normalizeDailyRecord(payload, defaultCosts.value)
      dailyRecords.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Kunlik Hisob',
        entityType: 'daily-record',
        recordId: record.id,
        summary: `${record.factory} uchun ${record.date} kunlik yozuv tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeDailyRecord = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = dailyRecords.value.find((record) => record.id === id)
    dailyRecords.value = dailyRecords.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Kunlik Hisob',
        entityType: 'daily-record',
        recordId: existing.id,
        summary: `${existing.factory} uchun ${existing.date} kunlik yozuv o'chirildi`,
        before: existing
      })
    }
  }

  const addIncomingLoad = (payload: Omit<IncomingLoadRecord, 'id'>) => {
    if (!guardAdminMutation()) {
      return
    }

    ensureSupplierContact(payload.supplier)
    const record = normalizeIncomingLoadRecord(
      {
        id: createId('load'),
        ...payload
      },
      Number(payload.pricePerTon ?? 0),
      Number(payload.paidAmount)
    )
    incomingLoads.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Tosh Kirimi',
      entityType: 'incoming-load',
      recordId: record.id,
      summary: `${record.supplier || 'Taʼminotchi'} uchun tosh kirimi qo'shildi`,
      after: record
    })
  }

  const updateIncomingLoad = (payload: IncomingLoadRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = incomingLoads.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      ensureSupplierContact(payload.supplier)
      const previous = incomingLoads.value[index]
      const record = normalizeIncomingLoadRecord(payload, Number(payload.pricePerTon), Number(payload.paidAmount))
      incomingLoads.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Tosh Kirimi',
        entityType: 'incoming-load',
        recordId: record.id,
        summary: `${record.supplier || 'Taʼminotchi'} tosh kirimi tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeIncomingLoad = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = incomingLoads.value.find((record) => record.id === id)
    incomingLoads.value = incomingLoads.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Tosh Kirimi',
        entityType: 'incoming-load',
        recordId: existing.id,
        summary: `${existing.supplier || 'Taʼminotchi'} tosh kirimi o'chirildi`,
        before: existing
      })
    }
  }

  const replaceScaleState = (entries: ScaleEntry[], syncMeta: ScaleSyncMeta) => {
    scaleEntries.value = entries.map((record) => normalizeScaleEntryRecord(record)).sort((left, right) => {
      const rightKey = `${right.date} ${right.time}`
      const leftKey = `${left.date} ${left.time}`
      return rightKey.localeCompare(leftKey)
    })
    scaleSyncMeta.value = normalizeScaleSyncMeta(syncMeta)
  }

  const addScaleCashEntry = (payload: Omit<ScaleCashEntry, 'id' | 'createdAt'>) => {
    if (!guardAdminMutation()) {
      return
    }

    const record = normalizeScaleCashEntryRecord({
      id: createId('scale-cash'),
      ...payload,
      createdAt: new Date().toISOString()
    })
    scaleCashEntries.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Tarozi',
      entityType: 'scale-cash',
      recordId: record.id,
      summary: `Tarozi ${record.type} puli qo'shildi`,
      after: record
    })
  }

  const updateScaleCashEntry = (payload: ScaleCashEntry) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = scaleCashEntries.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      const previous = scaleCashEntries.value[index]
      const record = normalizeScaleCashEntryRecord(payload)
      scaleCashEntries.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Tarozi',
        entityType: 'scale-cash',
        recordId: record.id,
        summary: `Tarozi ${record.type} puli tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeScaleCashEntry = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = scaleCashEntries.value.find((record) => record.id === id)
    scaleCashEntries.value = scaleCashEntries.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Tarozi',
        entityType: 'scale-cash',
        recordId: existing.id,
        summary: `Tarozi ${existing.type} puli o'chirildi`,
        before: existing
      })
    }
  }

  const addSale = (
    payload: Omit<SaleRecord, 'id' | 'totalAmount' | 'remainingAmount' | 'advanceAmount' | 'balanceAmount' | 'balanceType' | 'paymentStatus'>
  ) => {
    if (!guardAdminMutation()) {
      return
    }

    const saleId = createId('sale')
    ensureClientContact(payload.clientName)

    const record = normalizeSaleRecord({
      id: saleId,
      totalAmount: getSaleTotal(payload.tons, payload.pricePerTon),
      ...payload
    })
    sales.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Sotuvlar',
      entityType: 'sale',
      recordId: record.id,
      summary: `${record.clientName} uchun sotuv qo'shildi`,
      after: record
    })

    if (payload.paidAmount > 0) {
      payments.value.unshift({
        id: createId('pay'),
        date: payload.date,
        factory: payload.factory,
        clientName: payload.clientName,
        amount: payload.paidAmount,
        paymentMethod: payload.paymentMethod,
        saleId,
        saleDate: payload.date,
        notes: "Sotuv bilan birga to'langan"
      })
    }
  }

  const updateSale = (
    payload: Omit<SaleRecord, 'totalAmount' | 'remainingAmount' | 'advanceAmount' | 'balanceAmount' | 'balanceType' | 'paymentStatus'>
  ) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = sales.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      ensureClientContact(payload.clientName)
      const previous = sales.value[index]
      const record = normalizeSaleRecord({
        ...payload,
        totalAmount: getSaleTotal(payload.tons, payload.pricePerTon)
      })
      sales.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Sotuvlar',
        entityType: 'sale',
        recordId: record.id,
        summary: `${record.clientName} uchun sotuv tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeSale = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = sales.value.find((record) => record.id === id)
    sales.value = sales.value.filter((record) => record.id !== id)
    payments.value = payments.value.filter((record) => record.saleId !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Sotuvlar',
        entityType: 'sale',
        recordId: existing.id,
        summary: `${existing.clientName} uchun sotuv o'chirildi`,
        before: existing
      })
    }
  }

  const addManualDebt = (payload: Omit<ManualDebtRecord, 'id' | 'remainingAmount'>) => {
    if (!guardAdminMutation()) {
      return
    }

    ensureClientContact(payload.clientName)
    const record = normalizeManualDebtRecord({
      id: createId('debt'),
      ...payload
    })
    manualDebts.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Qarzdorlar',
      entityType: 'manual-debt',
      recordId: record.id,
      summary: `${record.clientName} uchun eski qarz qo'shildi`,
      after: record
    })
  }

  const updateManualDebt = (payload: ManualDebtRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = manualDebts.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      ensureClientContact(payload.clientName)
      const previous = manualDebts.value[index]
      const record = normalizeManualDebtRecord(payload)
      manualDebts.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Qarzdorlar',
        entityType: 'manual-debt',
        recordId: record.id,
        summary: `${record.clientName} uchun eski qarz tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeManualDebt = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = manualDebts.value.find((record) => record.id === id)
    manualDebts.value = manualDebts.value.filter((record) => record.id !== id)
    payments.value = payments.value.filter((record) => record.saleId !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Qarzdorlar',
        entityType: 'manual-debt',
        recordId: existing.id,
        summary: `${existing.clientName} uchun eski qarz o'chirildi`,
        before: existing
      })
    }
  }

  const addPayment = (payload: Omit<PaymentRecord, 'id'>) => {
    if (!guardAdminMutation()) {
      return
    }

    const record = {
      id: createId('pay'),
      ...payload
    }
    payments.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Pul Kiritish',
      entityType: 'payment',
      recordId: record.id,
      summary: `${record.clientName} uchun to'lov qo'shildi`,
      after: record
    })
  }

  const updatePayment = (payload: PaymentRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = payments.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      const previous = payments.value[index]
      const record = {
        ...payload
      }
      payments.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Pul Kiritish',
        entityType: 'payment',
        recordId: record.id,
        summary: `${record.clientName} uchun to'lov tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removePayment = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = payments.value.find((record) => record.id === id)
    payments.value = payments.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Pul Kiritish',
        entityType: 'payment',
        recordId: existing.id,
        summary: `${existing.clientName} uchun to'lov o'chirildi`,
        before: existing
      })
    }
  }

  const addBarterRecord = (payload: Omit<BarterRecord, 'id'>) => {
    if (!guardAdminMutation()) {
      return
    }

    ensureSupplierContact(payload.supplierName)
    ensureClientContact(payload.clientName)
    const record = normalizeBarterRecord({
      id: createId('barter'),
      ...payload
    })
    barterRecords.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Barter DB',
      entityType: 'barter',
      recordId: record.id,
      summary: `${record.supplierName} bilan barter qo'shildi`,
      after: record
    })
  }

  const updateBarterRecord = (payload: BarterRecord) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = barterRecords.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      ensureSupplierContact(payload.supplierName)
      ensureClientContact(payload.clientName)
      const previous = barterRecords.value[index]
      const record = normalizeBarterRecord(payload)
      barterRecords.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Barter DB',
        entityType: 'barter',
        recordId: record.id,
        summary: `${record.supplierName} bilan barter tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeBarterRecord = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = barterRecords.value.find((record) => record.id === id)
    barterRecords.value = barterRecords.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Barter DB',
        entityType: 'barter',
        recordId: existing.id,
        summary: `${existing.supplierName} bilan barter o'chirildi`,
        before: existing
      })
    }
  }

  const addExpense = (payload: Omit<OperationalExpense, 'id'>) => {
    if (!guardAdminMutation()) {
      return
    }

    const record = {
      id: createId('exp'),
      ...payload
    }
    expenses.value.unshift(record)
    appendAuditLog({
      action: 'add',
      section: 'Chiqimlar',
      entityType: 'expense',
      recordId: record.id,
      summary: `${record.category} chiqimi qo'shildi`,
      after: record
    })
  }

  const updateExpense = (payload: OperationalExpense) => {
    if (!guardAdminMutation()) {
      return
    }

    const index = expenses.value.findIndex((record) => record.id === payload.id)

    if (index !== -1) {
      const previous = expenses.value[index]
      const record = {
        ...payload
      }
      expenses.value[index] = record
      appendAuditLog({
        action: 'update',
        section: 'Chiqimlar',
        entityType: 'expense',
        recordId: record.id,
        summary: `${record.category} chiqimi tahrirlandi`,
        before: previous,
        after: record
      })
    }
  }

  const removeExpense = (id: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const existing = expenses.value.find((record) => record.id === id)
    expenses.value = expenses.value.filter((record) => record.id !== id)

    if (existing) {
      appendAuditLog({
        action: 'delete',
        section: 'Chiqimlar',
        entityType: 'expense',
        recordId: existing.id,
        summary: `${existing.category} chiqimi o'chirildi`,
        before: existing
      })
    }
  }

  const resetOperationalDataKeepDebtors = (startDate: string) => {
    if (!guardAdminMutation()) {
      return
    }

    const effectiveStartDate = startDate || new Date().toISOString().slice(0, 10)
    const preservedDebtSummaries = debtorSummaries.value.filter((record) => record.totalDebt > 0)
    const preservedClientKeys = new Set(
      preservedDebtSummaries.map((record) => normalizeClientName(record.clientName))
    )
    const before = {
      dailyRecords: dailyRecords.value.length,
      incomingLoads: incomingLoads.value.length,
      sales: sales.value.length,
      payments: payments.value.length,
      manualDebts: manualDebts.value.length,
      barterRecords: barterRecords.value.length,
      expenses: expenses.value.length,
      scaleEntries: scaleEntries.value.length,
      scaleCashEntries: scaleCashEntries.value.length,
      monthlyArchiveRecords: monthlyArchiveRecords.value.length,
      reminders: reminders.value.length,
      totalDebtors: preservedDebtSummaries.length,
      totalDebtAmount: Number(
        preservedDebtSummaries.reduce((sum, record) => sum + record.totalDebt, 0).toFixed(2)
      )
    }

    const preservedManualDebts = preservedDebtSummaries.map((record) =>
      normalizeManualDebtRecord({
        id: createId('debt'),
        date: effectiveStartDate,
        factory: record.lastFactory ?? 'Oybek',
        clientName: record.clientName,
        amount: record.totalDebt,
        paidAmount: 0,
        notes: `${effectiveStartDate} uchun opening balance`
      })
    )

    dailyRecords.value = []
    incomingLoads.value = []
    scaleEntries.value = []
    scaleSyncMeta.value = normalizeScaleSyncMeta()
    scaleCashEntries.value = []
    sales.value = []
    payments.value = []
    barterRecords.value = []
    expenses.value = []
    monthlyArchiveRecords.value = []
    manualDebts.value = preservedManualDebts
    reminders.value = reminders.value.filter((record) => preservedClientKeys.has(normalizeClientName(record.clientName)))
    auditLogs.value = []

    appendAuditLog({
      action: 'update',
      section: 'System',
      entityType: 'operational-reset',
      recordId: `operational-reset-${effectiveStartDate}`,
      summary: `${effectiveStartDate} dan yangi davr boshlandi, qarzdorlar saqlandi`,
      before,
      after: {
        startDate: effectiveStartDate,
        preservedDebtors: preservedManualDebts.length,
        preservedDebtAmount: Number(
          preservedManualDebts.reduce((sum, record) => sum + record.amount, 0).toFixed(2)
        )
      }
    })
  }

  const buildSummary = (startDate = '', endDate = '', factory: FactoryName | '' = '') => {
    const daily = dailyRecords.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )
    const loads = incomingLoads.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )
    const salesRecords = sales.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )
    const manualDebtRecords = manualDebts.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )
    const paymentRecords = payments.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )
    const expenseRecords = expenses.value.filter(
      (record) => dateInRange(record.date, startDate, endDate) && (!factory || record.factory === factory)
    )

    const recordedPaidBySaleId = paymentRecords.reduce((map, record) => {
      if (record.saleId) {
        map.set(record.saleId, roundAmount((map.get(record.saleId) ?? 0) + record.amount))
      }

      return map
    }, new Map<string, number>())

    const paymentMethodFallbacks = salesRecords.reduce<Array<{ paymentMethod: PaymentMethod; amount: number }>>(
      (rows, sale) => {
        const recordedAmount = recordedPaidBySaleId.get(sale.id) ?? 0
        const missingAmount = roundAmount(sale.paidAmount - recordedAmount)

        if (missingAmount > 0) {
          rows.push({
            paymentMethod: sale.paymentMethod,
            amount: missingAmount
          })
        }

        return rows
      },
      []
    )

    const totalIncomingTons = Number(loads.reduce((sum, record) => sum + record.tons, 0).toFixed(2))
    const totalUsedStoneTons = Number(daily.reduce((sum, record) => sum + record.usedStoneTons, 0).toFixed(2))
    const totalOutputTons = Number(daily.reduce((sum, record) => sum + getOutputTons(record), 0).toFixed(2))
    const totalBaggedTons = Number(daily.reduce((sum, record) => sum + record.baggedOutputTons, 0).toFixed(2))
    const totalBulkTons = Number(daily.reduce((sum, record) => sum + record.bulkOutputTons, 0).toFixed(2))
    const totalSoldBaggedTons = Number(
      salesRecords
        .filter((record) => record.shipmentType === 'qoplik')
        .reduce((sum, record) => sum + record.tons, 0)
        .toFixed(2)
    )
    const totalSoldBulkTons = Number(
      salesRecords
        .filter((record) => record.shipmentType === 'rasipnoy')
        .reduce((sum, record) => sum + record.tons, 0)
        .toFixed(2)
    )
    const totalNewBags = daily.reduce((sum, record) => sum + record.newBagCount, 0)
    const totalOldBags = daily.reduce((sum, record) => sum + record.oldBagCount, 0)
    const remainingStoneTons = Number((totalIncomingTons - totalUsedStoneTons).toFixed(2))
    const remainingBaggedTons = Number((totalBaggedTons - totalSoldBaggedTons).toFixed(2))
    const remainingBulkTons = Number((totalBulkTons - totalSoldBulkTons).toFixed(2))
    const productionCost = Number(daily.reduce((sum, record) => sum + getProductionCostOnly(record), 0).toFixed(2))
    const extraExpensesTotal = Number(expenseRecords.reduce((sum, record) => sum + record.amount, 0).toFixed(2))
    const totalCost = Number((productionCost + extraExpensesTotal).toFixed(2))
    const totalSoldTons = Number(salesRecords.reduce((sum, record) => sum + record.tons, 0).toFixed(2))
    const remainingProductTons = Number((totalOutputTons - totalSoldTons).toFixed(2))
    const totalRevenue = Number(salesRecords.reduce((sum, record) => sum + record.totalAmount, 0).toFixed(2))
    const totalPaid = Number(salesRecords.reduce((sum, record) => sum + record.paidAmount, 0).toFixed(2))
    const totalDebt = Number(
      (salesRecords.reduce((sum, record) => sum + record.remainingAmount, 0) +
        manualDebtRecords.reduce((sum, record) => sum + record.remainingAmount, 0)).toFixed(2)
    )
    const totalProfit = Number((totalRevenue - totalCost).toFixed(2))
    const averageSalePrice = totalSoldTons ? Number((totalRevenue / getKilograms(totalSoldTons)).toFixed(2)) : 0
    const averageCostPerTon = totalOutputTons ? Number((totalCost / totalOutputTons).toFixed(2)) : 0
    const productionComponentTotals = daily.reduce((totals, record) => {
      const breakdown = getDailyRecordCostBreakdown(record)

      totals.worker += breakdown.worker
      totals.loading += breakdown.loading
      totals.market += breakdown.market
      totals.food += breakdown.food
      totals.supervisor += breakdown.supervisor
      totals.electricity += breakdown.electricity
      totals.stone += breakdown.stone
      totals.bag += breakdown.bag

      return totals
    }, createComponentTotals())
    const workerPaymentByFactory = factories.map((factoryName) => {
      const workerAmount = roundAmount(
        daily
          .filter((record) => record.factory === factoryName)
          .reduce((sum, record) => sum + getDailyRecordCostBreakdown(record).worker, 0)
      )
      const payoutMode = workerPayoutModeByFactory[factoryName]

      return {
        factory: factoryName,
        payoutMode,
        amount: workerAmount,
        paidNow: payoutMode === 'daily' ? workerAmount : 0,
        accrued: payoutMode === 'monthly' ? workerAmount : 0
      }
    })
    const totalOperationalExpenses = roundAmount(expenseRecords.reduce((sum, record) => sum + record.amount, 0))
    const soldTonsByFactory = factories.reduce<Record<FactoryName, number>>((map, factoryName) => {
      map[factoryName] = roundAmount(
        salesRecords.filter((record) => record.factory === factoryName).reduce((sum, record) => sum + record.tons, 0)
      )
      return map
    }, { Oybek: 0, Jamshid: 0 })
    const expensePerTonByFactory = factories.reduce<Record<FactoryName, number>>((map, factoryName) => {
      const soldTonsForFactory = soldTonsByFactory[factoryName]
      const expenseTotalForFactory = roundAmount(
        expenseRecords.filter((record) => record.factory === factoryName).reduce((sum, record) => sum + record.amount, 0)
      )

      map[factoryName] = soldTonsForFactory ? roundAmount(expenseTotalForFactory / soldTonsForFactory) : 0
      return map
    }, { Oybek: 0, Jamshid: 0 })

    const clientProfitRows = salesRecords
      .reduce<
        Array<{
          clientName: string
          tons: number
          revenue: number
          estimatedCost: number
          allocatedExpenses: number
          estimatedProfit: number
          debt: number
          orderCount: number
        }>
      >((rows, sale) => {
        const profileRecord =
          dailyRecords.value
            .filter(
              (record) =>
                record.factory === sale.factory &&
                record.productType === sale.productName &&
                record.date <= sale.date
            )
            .slice()
            .sort(sortByDateDesc)[0] ?? defaultCosts.value
        const baseCostPerKg =
          sale.shipmentType === 'qoplik'
            ? getCostPerTon(profileRecord, sale.productName as ProductType)
            : getBulkCostPerTon(profileRecord, sale.productName as ProductType)
        const estimatedCost = getSaleTotal(sale.tons, baseCostPerKg)
        const allocatedExpenses = roundAmount(sale.tons * expensePerTonByFactory[sale.factory])
        const estimatedProfit = roundAmount(sale.totalAmount - estimatedCost - allocatedExpenses)
        const current = rows.find((row) => row.clientName === sale.clientName)

        if (current) {
          current.tons += sale.tons
          current.revenue += sale.totalAmount
          current.estimatedCost += estimatedCost
          current.allocatedExpenses += allocatedExpenses
          current.estimatedProfit += estimatedProfit
          current.debt += sale.remainingAmount
          current.orderCount += 1
          return rows
        }

        rows.push({
          clientName: sale.clientName,
          tons: sale.tons,
          revenue: sale.totalAmount,
          estimatedCost,
          allocatedExpenses,
          estimatedProfit,
          debt: sale.remainingAmount,
          orderCount: 1
        })

        return rows
      }, [])
      .sort((left, right) => right.estimatedProfit - left.estimatedProfit)

    const paymentMethodBreakdown = paymentMethods.map((method) => {
      const incomingFromPayments = paymentRecords
        .filter((record) => record.paymentMethod === method)
        .reduce((sum, record) => sum + record.amount, 0)
      const incomingFromFallbacks = paymentMethodFallbacks
        .filter((record) => record.paymentMethod === method)
        .reduce((sum, record) => sum + record.amount, 0)
      const incoming = roundAmount(incomingFromPayments + incomingFromFallbacks)
      const outgoing = roundAmount(
        expenseRecords
          .filter((record) => record.paymentMethod === method)
          .reduce((sum, record) => sum + record.amount, 0)
      )
      const balance = roundAmount(incoming - outgoing)

      return {
        method,
        incoming,
        outgoing,
        balance
      }
    })
    const moneyInTotal = roundAmount(paymentMethodBreakdown.reduce((sum, item) => sum + item.incoming, 0))
    const moneyOutTotal = roundAmount(paymentMethodBreakdown.reduce((sum, item) => sum + item.outgoing, 0))
    const moneyBalanceTotal = roundAmount(paymentMethodBreakdown.reduce((sum, item) => sum + item.balance, 0))

    const factoryBreakdown = factories
      .map((factoryName) => {
        const factoryDaily = daily.filter((record) => record.factory === factoryName)
        const factoryLoads = loads.filter((record) => record.factory === factoryName)
        const factorySales = salesRecords.filter((record) => record.factory === factoryName)
        const factoryExpenses = expenseRecords.filter((record) => record.factory === factoryName)
        const incomingTons = Number(factoryLoads.reduce((sum, record) => sum + record.tons, 0).toFixed(2))
        const usedStoneTons = Number(factoryDaily.reduce((sum, record) => sum + record.usedStoneTons, 0).toFixed(2))
        const outputTons = Number(factoryDaily.reduce((sum, record) => sum + getOutputTons(record), 0).toFixed(2))
        const baggedOutputTons = Number(factoryDaily.reduce((sum, record) => sum + record.baggedOutputTons, 0).toFixed(2))
        const bulkOutputTons = Number(factoryDaily.reduce((sum, record) => sum + record.bulkOutputTons, 0).toFixed(2))
        const soldTons = Number(factorySales.reduce((sum, record) => sum + record.tons, 0).toFixed(2))
        const soldBaggedTons = Number(
          factorySales
            .filter((record) => record.shipmentType === 'qoplik')
            .reduce((sum, record) => sum + record.tons, 0)
            .toFixed(2)
        )
        const soldBulkTons = Number(
          factorySales
            .filter((record) => record.shipmentType === 'rasipnoy')
            .reduce((sum, record) => sum + record.tons, 0)
            .toFixed(2)
        )
        const revenue = Number(factorySales.reduce((sum, record) => sum + record.totalAmount, 0).toFixed(2))
        const cost = Number(
          (
            factoryDaily.reduce((sum, record) => sum + getProductionCostOnly(record), 0) +
            factoryExpenses.reduce((sum, record) => sum + record.amount, 0)
          ).toFixed(2)
        )
        const debt = Number(factorySales.reduce((sum, record) => sum + record.remainingAmount, 0).toFixed(2))
        const profit = Number((revenue - cost).toFixed(2))
        const stoneBalance = Number((incomingTons - usedStoneTons).toFixed(2))
        const remainingBaggedTons = Number((baggedOutputTons - soldBaggedTons).toFixed(2))
        const remainingBulkTons = Number((bulkOutputTons - soldBulkTons).toFixed(2))
        const productBalance = Number((outputTons - soldTons).toFixed(2))

        return {
          factory: factoryName,
          incomingTons,
          usedStoneTons,
          stoneBalance,
          outputTons,
          baggedOutputTons,
          bulkOutputTons,
          soldTons,
          soldBaggedTons,
          soldBulkTons,
          remainingBaggedTons,
          remainingBulkTons,
          productBalance,
          revenue,
          cost,
          debt,
          profit
        }
      })
      .filter((row) => row.incomingTons || row.outputTons || row.soldTons || row.revenue || row.cost)

    const topClients = salesRecords
      .reduce<Array<{ clientName: string; tons: number; revenue: number; debt: number }>>((rows, sale) => {
        const current = rows.find((row) => row.clientName === sale.clientName)

        if (current) {
          current.tons += sale.tons
          current.revenue += sale.totalAmount
          current.debt += sale.remainingAmount
          return rows
        }

        rows.push({
          clientName: sale.clientName,
          tons: sale.tons,
          revenue: sale.totalAmount,
          debt: sale.remainingAmount
        })

        return rows
      }, [])
      .sort((left, right) => right.revenue - left.revenue)

    const shipmentSplit: ChartPoint[] = shipmentTypes.map((type, index) => ({
      label: type,
      value: Number(
        salesRecords
          .filter((record) => record.shipmentType === type)
          .reduce((sum, record) => sum + record.tons, 0)
          .toFixed(2)
      ),
      color: index === 0 ? '#1d4ed8' : '#f97316'
    }))

    const vehicleSplit: ChartPoint[] = vehicleTypes.map((type, index) => ({
      label: type,
      value: Number(
        loads
          .filter((record) => record.vehicleType === type)
          .reduce((sum, record) => sum + record.tons, 0)
          .toFixed(2)
      ),
      color: index === 0 ? '#0f766e' : '#7c3aed'
    }))

    const expenseByCategory: ChartPoint[] = expenseCategories.map((category, index) => ({
      label: category,
      value: Number(
        expenseRecords
          .filter((record) => record.category === category)
          .reduce((sum, record) => sum + record.amount, 0)
          .toFixed(2)
      ),
      color: ['#16a34a', '#f59e0b', '#dc2626', '#0f766e', '#2563eb', '#7c3aed'][index]
    }))

    return {
      daily,
      loads,
      salesRecords,
      expenseRecords,
      totalIncomingTons,
      totalUsedStoneTons,
      totalOutputTons,
      totalBaggedTons,
      totalBulkTons,
      totalSoldBaggedTons,
      totalSoldBulkTons,
      totalNewBags,
      totalOldBags,
      remainingStoneTons,
      remainingBaggedTons,
      remainingBulkTons,
      productionCost,
      extraExpensesTotal,
      totalCost,
      totalSoldTons,
      remainingProductTons,
      totalRevenue,
      totalPaid,
      totalDebt,
      totalProfit,
      averageSalePrice,
      averageCostPerTon,
      productionComponentTotals: {
        worker: roundAmount(productionComponentTotals.worker),
        loading: roundAmount(productionComponentTotals.loading),
        market: roundAmount(productionComponentTotals.market),
        food: roundAmount(productionComponentTotals.food),
        supervisor: roundAmount(productionComponentTotals.supervisor),
        electricity: roundAmount(productionComponentTotals.electricity),
        stone: roundAmount(productionComponentTotals.stone),
        bag: roundAmount(productionComponentTotals.bag)
      },
      workerPaymentByFactory,
      totalOperationalExpenses,
      clientProfitRows,
      paymentMethodBreakdown,
      moneyInTotal,
      moneyOutTotal,
      moneyBalanceTotal,
      factoryBreakdown,
      topClients,
      revenueTrend: buildTrend(salesRecords, (record) => record.totalAmount, '#1d4ed8'),
      tonsTrend: buildTrend(salesRecords, (record) => record.tons, '#f97316'),
      incomingTrend: buildTrend(loads, (record) => record.tons, '#0f766e'),
      expenseTrend: buildTrend(expenseRecords, (record) => record.amount, '#dc2626'),
      shipmentSplit,
      vehicleSplit,
      expenseByCategory,
      costBreakdown: buildCostBreakdown(defaultCosts.value)
    }
  }

  const todaySummary = computed(() => buildSummary(latestDate.value, latestDate.value))
  const overallSummary = computed(() => buildSummary())
  const todayFactoryBreakdown = computed(() =>
    factories.map((factory) => buildSummary(latestDate.value, latestDate.value, factory))
  )

  return {
    factories,
    productTypes,
    vehicleTypes,
    shipmentTypes,
    expenseCategories,
    paymentMethods,
    reminderFrequencies,
    contacts,
    defaultCosts,
    dailyRecords,
    barterRecords,
    incomingLoads,
    scaleEntries,
    scaleSyncMeta,
    scaleCashEntries,
    payments,
    sales,
    manualDebts,
    expenses,
    reminders,
    monthlyArchiveRecords,
    auditLogs,
    factoryOptions,
    clientContacts,
    supplierContacts,
    clientDirectory,
    clientOptions,
    clientSummaries,
    supplierSummaries,
    debtorSummaries,
    reminderList,
    getDefaultSalePricePerTon,
    getClientSuggestions,
    getClientProfile,
    getSupplierProfile,
    getClientReminder,
    buildSmsHref,
    buildTelegramLink,
    buildSaleReceiptMessage,
    buildDebtReminderMessage,
    recentSales,
    recentLoads,
    recentPayments,
    recentExpenses,
    canManageAccounting,
    latestDate,
    sectionDateGuide,
    todaySummary,
    overallSummary,
    todayFactoryBreakdown,
    addContact,
    updateContact,
    removeContact,
    updateDefaultCosts,
    addDailyRecord,
    updateDailyRecord,
    removeDailyRecord,
    addIncomingLoad,
    updateIncomingLoad,
    removeIncomingLoad,
    replaceScaleState,
    addScaleCashEntry,
    updateScaleCashEntry,
    removeScaleCashEntry,
    addSale,
    updateSale,
    removeSale,
    addManualDebt,
    updateManualDebt,
    removeManualDebt,
    addPayment,
    updatePayment,
    removePayment,
    addBarterRecord,
    updateBarterRecord,
    removeBarterRecord,
    upsertReminder,
    removeReminder,
    markReminderSent,
    addExpense,
    updateExpense,
    removeExpense,
    resetOperationalDataKeepDebtors,
    buildSummary
  }
}
