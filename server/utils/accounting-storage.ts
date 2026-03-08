import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type {
  AccountingStateSnapshot,
  ArchiveFactoryScope,
  BalanceType,
  ClientReminderSetting,
  ContactRecord,
  CostProfile,
  DailyFactoryRecord,
  ExpenseCategory,
  FactoryName,
  IncomingLoadRecord,
  ManualDebtRecord,
  MonthlyArchiveItem,
  MonthlyArchiveRecord,
  MonthlyArchiveSection,
  OperationalExpense,
  PaymentMethod,
  PaymentRecord,
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
  VehicleType
} from '~/types/accounting'
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
import { normalizeBulkOutputTons, normalizeShipmentTypeForProduct } from '~/composables/useProductRules'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const factories: FactoryName[] = ['Oybek', 'Jamshid']
const productTypes: ProductType[] = ['Qum', 'Mel']
const vehicleTypes: VehicleType[] = ['Howo', 'Kamaz']
const shipmentTypes: ShipmentType[] = ['qoplik', 'rasipnoy']
const expenseCategories: ExpenseCategory[] = [
  'Ishchi',
  'Ovqat',
  'Svet',
  'Bozorlik',
  'Yuklash',
  'Sementovoz kredit',
  'Panel kredit',
  'Kobalt kredit',
  'Boshqa'
]
const paymentMethods: PaymentMethod[] = ['Naqd', 'Click', 'Prichesleniya']
const reminderFrequencies: ReminderFrequency[] = ['daily', 'every_2_days']
const archiveFactoryScopes: ArchiveFactoryScope[] = ['Oybek', 'Jamshid', 'combined']
const monthlyArchiveSections: MonthlyArchiveSection[] = ['income', 'expense', 'note']
const scaleDirections: ScaleDirection[] = ['kirim', 'chiqim', 'unknown']
const scaleCashTypes: ScaleCashType[] = ['kirim', 'chiqim']

const defaultCostProfile: CostProfile = {
  sandPricePerTon: 240,
  chalkPricePerTon: 250,
  sandWorkerCostPerTon: 35,
  chalkWorkerCostPerTon: 40,
  loadingCostPerTon: 10,
  foodCostPerTon: 10,
  supervisorCostPerTon: 10,
  electricityCostPerTon: 30,
  stoneCostPerTon: 70,
  bagCostPerTon: 20
}

const KG_PER_TON = 1000
const BAGS_PER_TON = 25
const STONE_USAGE_PER_TON = 1
const jsonBackupFilePath = process.env.ACCOUNTING_STATE_FILE || join(process.cwd(), 'data', 'storage', 'accounting-state.json')
const sqliteStateFilePath = process.env.ACCOUNTING_DB_FILE || join(process.cwd(), 'data', 'storage', 'accounting-state.sqlite')

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
const todayIso = () => new Date().toISOString().slice(0, 10)
const isFactory = (value: unknown): value is FactoryName => typeof value === 'string' && factories.includes(value as FactoryName)
const isProductType = (value: unknown): value is ProductType => typeof value === 'string' && productTypes.includes(value as ProductType)
const isVehicleType = (value: unknown): value is VehicleType => typeof value === 'string' && vehicleTypes.includes(value as VehicleType)
const isShipmentType = (value: unknown): value is ShipmentType =>
  typeof value === 'string' && shipmentTypes.includes(value as ShipmentType)
const isExpenseCategory = (value: unknown): value is ExpenseCategory =>
  typeof value === 'string' && expenseCategories.includes(value as ExpenseCategory)
const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  typeof value === 'string' && paymentMethods.includes(value as PaymentMethod)
const isReminderFrequency = (value: unknown): value is ReminderFrequency =>
  typeof value === 'string' && reminderFrequencies.includes(value as ReminderFrequency)
const isArchiveFactoryScope = (value: unknown): value is ArchiveFactoryScope =>
  typeof value === 'string' && archiveFactoryScopes.includes(value as ArchiveFactoryScope)
const isMonthlyArchiveSection = (value: unknown): value is MonthlyArchiveSection =>
  typeof value === 'string' && monthlyArchiveSections.includes(value as MonthlyArchiveSection)
const isScaleDirection = (value: unknown): value is ScaleDirection =>
  typeof value === 'string' && scaleDirections.includes(value as ScaleDirection)
const isScaleCashType = (value: unknown): value is ScaleCashType =>
  typeof value === 'string' && scaleCashTypes.includes(value as ScaleCashType)
const asNumber = (value: unknown, fallback = 0) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}
const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const getOutputTons = (record: Pick<DailyFactoryRecord, 'baggedOutputTons' | 'bulkOutputTons'>) =>
  Number((record.baggedOutputTons + record.bulkOutputTons).toFixed(2))
const getUsedStoneTons = (record: Pick<DailyFactoryRecord, 'baggedOutputTons' | 'bulkOutputTons'>) =>
  Number((getOutputTons(record) * STONE_USAGE_PER_TON).toFixed(2))
const getBagCount = (baggedOutputTons: number) => Math.round(Math.max(baggedOutputTons, 0) * BAGS_PER_TON)
const getKilograms = (tons: number) => Number((Math.max(tons, 0) * KG_PER_TON).toFixed(2))
const getLoadTotal = (tons: number, pricePerTon: number) => Number((tons * pricePerTon).toFixed(2))
const getLoadPricePerTon = (tons: number, totalAmount: number) => (tons > 0 ? Number((totalAmount / tons).toFixed(2)) : 0)
const getSaleTotal = (tons: number, pricePerTon: number) => Number((getKilograms(tons) * pricePerTon).toFixed(2))
const getRemainingAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.max(totalAmount - paidAmount, 0).toFixed(2))
const getAdvanceAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.max(paidAmount - totalAmount, 0).toFixed(2))
const getBalanceType = (totalAmount: number, paidAmount: number): BalanceType => {
  if (paidAmount < totalAmount) {
    return 'bizga_qarz'
  }

  if (paidAmount > totalAmount) {
    return 'bizdan_qarz'
  }

  return 'yopilgan'
}
const getBalanceAmount = (totalAmount: number, paidAmount: number) =>
  Number(Math.abs(totalAmount - paidAmount).toFixed(2))
const getPaymentStatus = (totalAmount: number, paidAmount: number): PaymentStatus => {
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

const normalizeCostProfile = (value: unknown): CostProfile => {
  const profile = typeof value === 'object' && value ? (value as Partial<CostProfile>) : {}

  return {
    sandPricePerTon: asNumber(profile.sandPricePerTon, defaultCostProfile.sandPricePerTon),
    chalkPricePerTon: asNumber(profile.chalkPricePerTon, defaultCostProfile.chalkPricePerTon),
    sandWorkerCostPerTon: asNumber(profile.sandWorkerCostPerTon, defaultCostProfile.sandWorkerCostPerTon),
    chalkWorkerCostPerTon: asNumber(profile.chalkWorkerCostPerTon, defaultCostProfile.chalkWorkerCostPerTon),
    loadingCostPerTon: asNumber(profile.loadingCostPerTon, defaultCostProfile.loadingCostPerTon),
    foodCostPerTon: asNumber(profile.foodCostPerTon, defaultCostProfile.foodCostPerTon),
    supervisorCostPerTon: asNumber(profile.supervisorCostPerTon, defaultCostProfile.supervisorCostPerTon),
    electricityCostPerTon: asNumber(profile.electricityCostPerTon, defaultCostProfile.electricityCostPerTon),
    stoneCostPerTon: asNumber(profile.stoneCostPerTon, defaultCostProfile.stoneCostPerTon),
    bagCostPerTon: asNumber(profile.bagCostPerTon, defaultCostProfile.bagCostPerTon)
  }
}

const normalizeDailyRecord = (record: unknown, profile: CostProfile): DailyFactoryRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<DailyFactoryRecord>) : {}
  const productType = isProductType(source.productType) ? source.productType : 'Qum'
  const baggedOutputTons = asNumber(source.baggedOutputTons)
  const bulkOutputTons = normalizeBulkOutputTons(productType, asNumber(source.bulkOutputTons))
  const usedStoneTons = getUsedStoneTons({ baggedOutputTons, bulkOutputTons })

  return {
    ...profile,
    id: asString(source.id, createId('day')),
    date: asString(source.date, todayIso()),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    productType,
    incomingStoneTons: usedStoneTons,
    usedStoneTons,
    baggedOutputTons,
    bulkOutputTons,
    newBagCount: getBagCount(baggedOutputTons),
    oldBagCount: 0,
    notes: asString(source.notes)
  }
}

const normalizeIncomingLoad = (record: unknown): IncomingLoadRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<IncomingLoadRecord>) : {}
  const tons = asNumber(source.tons)
  const rawTotalAmount = asNumber(source.totalAmount)
  const fallbackPricePerTon = asNumber(source.pricePerTon)
  const totalAmount = rawTotalAmount > 0 ? rawTotalAmount : getLoadTotal(tons, fallbackPricePerTon)
  const pricePerTon = getLoadPricePerTon(tons, totalAmount)
  const paidAmount = asNumber(source.paidAmount, totalAmount)
  const remainingAmount = getRemainingAmount(totalAmount, paidAmount)

  return {
    id: asString(source.id, createId('load')),
    date: asString(source.date, todayIso()),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    vehicleType: isVehicleType(source.vehicleType) ? source.vehicleType : 'Howo',
    tons,
    supplier: asString(source.supplier),
    pricePerTon,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: getPaymentStatus(totalAmount, paidAmount),
    notes: asString(source.notes)
  }
}

const normalizeSaleRecord = (record: unknown): SaleRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<SaleRecord>) : {}
  const tons = asNumber(source.tons)
  const pricePerTon = asNumber(source.pricePerTon)
  const totalAmount = getSaleTotal(tons, pricePerTon)
  const paidAmount = asNumber(source.paidAmount)
  const remainingAmount = getRemainingAmount(totalAmount, paidAmount)
  const advanceAmount = getAdvanceAmount(totalAmount, paidAmount)
  const balanceType = getBalanceType(totalAmount, paidAmount)
  const balanceAmount = getBalanceAmount(totalAmount, paidAmount)
  const shipmentType = normalizeShipmentTypeForProduct(
    asString(source.productName, 'Qum'),
    isShipmentType(source.shipmentType) ? source.shipmentType : 'qoplik'
  )

  return {
    id: asString(source.id, createId('sale')),
    date: asString(source.date, todayIso()),
    time: asString(source.time),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    clientName: asString(source.clientName),
    productName: asString(source.productName, 'Qum'),
    shipmentType,
    tons,
    pricePerTon,
    totalAmount,
    paidAmount,
    remainingAmount,
    advanceAmount,
    balanceAmount,
    balanceType,
    paymentStatus: getPaymentStatus(totalAmount, paidAmount),
    paymentMethod: isPaymentMethod(source.paymentMethod) ? source.paymentMethod : 'Naqd',
    notes: asString(source.notes)
  }
}

const normalizeReminderRecord = (record: unknown): ClientReminderSetting => {
  const source = typeof record === 'object' && record ? (record as Partial<ClientReminderSetting>) : {}

  return {
    id: asString(source.id, createId('rem')),
    clientName: asString(source.clientName),
    enabled: Boolean(source.enabled),
    frequency: isReminderFrequency(source.frequency) ? source.frequency : 'daily',
    time: asString(source.time, '08:00'),
    notes: asString(source.notes),
    lastSentAt: asString(source.lastSentAt)
  }
}

const normalizePaymentRecord = (record: unknown): PaymentRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<PaymentRecord>) : {}

  return {
    id: asString(source.id, createId('pay')),
    date: asString(source.date, todayIso()),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    clientName: asString(source.clientName),
    amount: asNumber(source.amount),
    paymentMethod: isPaymentMethod(source.paymentMethod) ? source.paymentMethod : 'Naqd',
    saleId: asString(source.saleId),
    saleDate: asString(source.saleDate, asString(source.date, todayIso())),
    notes: asString(source.notes)
  }
}

const normalizeManualDebtRecord = (record: unknown): ManualDebtRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<ManualDebtRecord>) : {}
  const amount = asNumber(source.amount)
  const paidAmount = asNumber(source.paidAmount)

  return {
    id: asString(source.id, createId('debt')),
    date: asString(source.date, todayIso()),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    clientName: asString(source.clientName),
    amount,
    paidAmount,
    remainingAmount: getRemainingAmount(amount, paidAmount),
    notes: asString(source.notes)
  }
}

const normalizeContactRecord = (record: unknown): ContactRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<ContactRecord>) : {}

  return {
    id: asString(source.id, createId('contact')),
    type: source.type === 'supplier' ? 'supplier' : 'client',
    name: asString(source.name),
    phone: asString(source.phone),
    telegramChatId: asString(source.telegramChatId),
    telegramUsername: asString(source.telegramUsername),
    address: asString(source.address),
    notes: asString(source.notes),
    createdAt: asString(source.createdAt, new Date().toISOString())
  }
}

const normalizeExpenseRecord = (record: unknown): OperationalExpense => {
  const source = typeof record === 'object' && record ? (record as Partial<OperationalExpense>) : {}

  return {
    id: asString(source.id, createId('exp')),
    date: asString(source.date, todayIso()),
    factory: isFactory(source.factory) ? source.factory : 'Oybek',
    category: isExpenseCategory(source.category) ? source.category : 'Ishchi',
    description: asString(source.description),
    amount: asNumber(source.amount),
    paymentMethod: isPaymentMethod(source.paymentMethod) ? source.paymentMethod : 'Naqd',
    notes: asString(source.notes)
  }
}

const normalizeMonthlyArchiveItem = (record: unknown): MonthlyArchiveItem => {
  const source = typeof record === 'object' && record ? (record as Partial<MonthlyArchiveItem>) : {}

  return {
    label: asString(source.label),
    amount: asNumber(source.amount),
    section: isMonthlyArchiveSection(source.section) ? source.section : 'note',
    note: asString(source.note)
  }
}

const normalizeMonthlyArchiveRecord = (record: unknown): MonthlyArchiveRecord => {
  const source = typeof record === 'object' && record ? (record as Partial<MonthlyArchiveRecord>) : {}

  return {
    id: asString(source.id, createId('archive')),
    title: asString(source.title, 'Qo`lda kiritilgan arxiv'),
    startDate: asString(source.startDate, todayIso()),
    endDate: asString(source.endDate, asString(source.startDate, todayIso())),
    factoryScope: isArchiveFactoryScope(source.factoryScope) ? source.factoryScope : 'combined',
    producedTons: asNumber(source.producedTons),
    shippedTons: asNumber(source.shippedTons),
    stoneLoadSummary: asString(source.stoneLoadSummary),
    stonePaymentTotal: asNumber(source.stonePaymentTotal),
    incomingMoneyTotal: asNumber(source.incomingMoneyTotal),
    declaredExpenseTotal: asNumber(source.declaredExpenseTotal),
    declaredProfitTotal: asNumber(source.declaredProfitTotal),
    notes: asString(source.notes),
    items: Array.isArray(source.items) ? source.items.map((item) => normalizeMonthlyArchiveItem(item)) : []
  }
}

const normalizeScaleEntry = (record: unknown): ScaleEntry => {
  const source = typeof record === 'object' && record ? (record as Partial<ScaleEntry>) : {}

  return {
    id: asString(source.id, createId('scale')),
    telegramUpdateId: asNumber(source.telegramUpdateId),
    date: asString(source.date, todayIso()),
    time: asString(source.time),
    direction: isScaleDirection(source.direction) ? source.direction : 'unknown',
    tons: asNumber(source.tons),
    netKg: asNumber(source.netKg),
    grossKg: asNumber(source.grossKg),
    tareKg: asNumber(source.tareKg),
    vehicleNumber: asString(source.vehicleNumber),
    material: asString(source.material),
    partnerName: asString(source.partnerName),
    driverName: asString(source.driverName),
    rawText: asString(source.rawText),
    sourceChatId: asString(source.sourceChatId),
    notes: asString(source.notes),
    createdAt: asString(source.createdAt, new Date().toISOString())
  }
}

const normalizeScaleSyncMeta = (value: unknown): ScaleSyncMeta => {
  const source = typeof value === 'object' && value ? (value as Partial<ScaleSyncMeta>) : {}

  return {
    lastSyncAt: asString(source.lastSyncAt),
    lastSyncedCount: asNumber(source.lastSyncedCount),
    lastUpdateId: asNumber(source.lastUpdateId)
  }
}

const normalizeScaleCashEntry = (record: unknown): ScaleCashEntry => {
  const source = typeof record === 'object' && record ? (record as Partial<ScaleCashEntry>) : {}

  return {
    id: asString(source.id, createId('scale-cash')),
    date: asString(source.date, todayIso()),
    type: isScaleCashType(source.type) ? source.type : 'kirim',
    amount: asNumber(source.amount),
    paymentMethod: isPaymentMethod(source.paymentMethod) ? source.paymentMethod : 'Naqd',
    description: asString(source.description),
    notes: asString(source.notes),
    source: source.source === 'telegram' ? 'telegram' : 'manual',
    telegramUpdateId: asNumber(source.telegramUpdateId),
    createdAt: asString(source.createdAt, new Date().toISOString())
  }
}

const buildSeedState = (): AccountingStateSnapshot => ({
  defaultCosts: clone(defaultCostProfile),
  dailyRecords: (dailySource as unknown[]).map((record) => normalizeDailyRecord(record, defaultCostProfile)),
  incomingLoads: (loadsSource as unknown[]).map((record) => normalizeIncomingLoad(record)),
  scaleEntries: (scaleEntriesSource as unknown[]).map((record) => normalizeScaleEntry(record)),
  scaleSyncMeta: normalizeScaleSyncMeta({}),
  scaleCashEntries: (scaleCashEntriesSource as unknown[]).map((record) => normalizeScaleCashEntry(record)),
  sales: (salesSource as unknown[]).map((record) => normalizeSaleRecord(record)),
  manualDebts: (manualDebtsSource as unknown[]).map((record) => normalizeManualDebtRecord(record)),
  payments: (paymentsSource as unknown[]).map((record) => normalizePaymentRecord(record)),
  expenses: (expensesSource as unknown[]).map((record) => normalizeExpenseRecord(record)),
  contacts: (contactsSource as unknown[]).map((record) => normalizeContactRecord(record)),
  reminders: [],
  monthlyArchiveRecords: (monthlyArchiveSource as unknown[]).map((record) => normalizeMonthlyArchiveRecord(record)),
  updatedAt: new Date().toISOString()
})

export const normalizeAccountingState = (snapshot: unknown): AccountingStateSnapshot => {
  const source = typeof snapshot === 'object' && snapshot ? (snapshot as Partial<AccountingStateSnapshot>) : {}
  const defaultCosts = normalizeCostProfile(source.defaultCosts)

  return {
    defaultCosts,
    dailyRecords: Array.isArray(source.dailyRecords)
      ? source.dailyRecords.map((record) => normalizeDailyRecord(record, defaultCosts))
      : [],
    incomingLoads: Array.isArray(source.incomingLoads)
      ? source.incomingLoads.map((record) => normalizeIncomingLoad(record))
      : [],
    scaleEntries: Array.isArray(source.scaleEntries) ? source.scaleEntries.map((record) => normalizeScaleEntry(record)) : [],
    scaleSyncMeta: normalizeScaleSyncMeta(source.scaleSyncMeta),
    scaleCashEntries: Array.isArray(source.scaleCashEntries)
      ? source.scaleCashEntries.map((record) => normalizeScaleCashEntry(record))
      : [],
    sales: Array.isArray(source.sales) ? source.sales.map((record) => normalizeSaleRecord(record)) : [],
    manualDebts: Array.isArray(source.manualDebts) ? source.manualDebts.map((record) => normalizeManualDebtRecord(record)) : [],
    payments: Array.isArray(source.payments) ? source.payments.map((record) => normalizePaymentRecord(record)) : [],
    expenses: Array.isArray(source.expenses) ? source.expenses.map((record) => normalizeExpenseRecord(record)) : [],
    contacts: Array.isArray(source.contacts) ? source.contacts.map((record) => normalizeContactRecord(record)) : [],
    reminders: Array.isArray(source.reminders) ? source.reminders.map((record) => normalizeReminderRecord(record)) : [],
    monthlyArchiveRecords: Array.isArray(source.monthlyArchiveRecords)
      ? source.monthlyArchiveRecords.map((record) => normalizeMonthlyArchiveRecord(record))
      : (monthlyArchiveSource as unknown[]).map((record) => normalizeMonthlyArchiveRecord(record)),
    updatedAt: asString(source.updatedAt, new Date().toISOString())
  }
}

let writeChain = Promise.resolve()
let sqliteReady = false

const ensureStorageDir = async () => {
  await mkdir(dirname(sqliteStateFilePath), { recursive: true })
}

const escapeSqlLiteral = (value: string) => value.replace(/'/g, "''")

const runSqlite = async (sql: string) => {
  await ensureStorageDir()

  const result = spawnSync('sqlite3', [sqliteStateFilePath], {
    input: sql,
    encoding: 'utf8'
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || 'SQLite command failed')
  }

  return result.stdout
}

const ensureSqlite = async () => {
  if (sqliteReady) {
    return
  }

  await runSqlite(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS snapshot_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snapshot_history_created_at
      ON snapshot_history (created_at DESC);
  `)

  sqliteReady = true
}

const readJsonBackup = async () => {
  try {
    const rawState = await readFile(jsonBackupFilePath, 'utf8')
    return normalizeAccountingState(JSON.parse(rawState))
  } catch (error: unknown) {
    const fileMissing = typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'

    if (fileMissing) {
      return null
    }

    throw error
  }
}

const writeJsonBackup = async (snapshot: AccountingStateSnapshot) => {
  await ensureStorageDir()
  const tempPath = `${jsonBackupFilePath}.tmp`
  await writeFile(tempPath, JSON.stringify(snapshot, null, 2), 'utf8')
  await rename(tempPath, jsonBackupFilePath)
}

const readSqliteState = async () => {
  await ensureSqlite()
  const stdout = await runSqlite("SELECT value FROM app_state WHERE key = 'latest' LIMIT 1;")
  const serialized = stdout.trim()

  if (!serialized) {
    return null
  }

  return normalizeAccountingState(JSON.parse(serialized))
}

const writeSqliteState = async (snapshot: AccountingStateSnapshot) => {
  await ensureSqlite()

  const tempDir = await mkdtemp(join(tmpdir(), 'mbh-state-'))
  const payloadPath = join(tempDir, 'snapshot.json')
  const escapedPayloadPath = escapeSqlLiteral(payloadPath)
  const escapedUpdatedAt = escapeSqlLiteral(snapshot.updatedAt)

  try {
    await writeFile(payloadPath, JSON.stringify(snapshot, null, 2), 'utf8')

    await runSqlite(`
      BEGIN IMMEDIATE;
      INSERT INTO app_state (key, value, updated_at)
      VALUES ('latest', CAST(readfile('${escapedPayloadPath}') AS TEXT), '${escapedUpdatedAt}')
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at;
      INSERT INTO snapshot_history (value, created_at)
      VALUES (CAST(readfile('${escapedPayloadPath}') AS TEXT), '${escapedUpdatedAt}');
      DELETE FROM snapshot_history
      WHERE id NOT IN (
        SELECT id FROM snapshot_history
        ORDER BY id DESC
        LIMIT 180
      );
      COMMIT;
    `)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export const getAccountingStateFilePath = () => sqliteStateFilePath

export const readAccountingState = async () => {
  const sqliteState = await readSqliteState()

  if (sqliteState) {
    return sqliteState
  }

  const jsonBackupState = await readJsonBackup()

  if (jsonBackupState) {
    await writeSqliteState(jsonBackupState)
    return jsonBackupState
  }

  const seedState = buildSeedState()
  await writeAccountingState(seedState)
  return seedState
}

export const writeAccountingState = async (snapshot: unknown) => {
  const source = typeof snapshot === 'object' && snapshot ? (snapshot as Record<string, unknown>) : {}
  const normalizedState = normalizeAccountingState({
    ...source,
    updatedAt: new Date().toISOString()
  })

  writeChain = writeChain
    .catch(() => undefined)
    .then(async () => {
      await writeSqliteState(normalizedState)
      await writeJsonBackup(normalizedState)
    })

  await writeChain

  return normalizedState
}
