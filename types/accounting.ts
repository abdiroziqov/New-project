import type { UserRole } from '~/types/auth'

export type FactoryName = 'Oybek' | 'Jamshid'
export type ProductType = 'Qum' | 'Mel'
export type VehicleType = 'Howo' | 'Kamaz'
export type ShipmentType = 'qoplik' | 'rasipnoy'
export type PaymentStatus = 'tolangan' | 'qisman' | 'qarzdor' | 'avans'
export type BalanceType = 'bizga_qarz' | 'bizdan_qarz' | 'yopilgan'
export type ContactType = 'client' | 'supplier'
export type ExpenseCategory =
  | 'Ishchi'
  | 'Ovqat'
  | 'Svet'
  | 'Bozorlik'
  | 'Yuklash'
  | 'Sementovoz kredit'
  | 'Panel kredit'
  | 'Kobalt kredit'
  | 'Boshqa'
export type PaymentMethod = 'Naqd' | 'Click' | 'Prichesleniya'
export type ReminderFrequency = 'daily' | 'every_2_days'
export type MonthlyArchiveSection = 'income' | 'expense' | 'note'
export type ArchiveFactoryScope = FactoryName | 'combined'
export type ScaleDirection = 'kirim' | 'chiqim' | 'unknown'
export type ScaleCashType = 'kirim' | 'chiqim'
export type AuditAction = 'add' | 'update' | 'delete'

export interface AuditLogRecord {
  id: string
  createdAt: string
  actorId: string
  actorName: string
  actorUsername: string
  actorRole: UserRole
  section: string
  entityType: string
  action: AuditAction
  recordId: string
  summary: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export interface CostProfile {
  sandPricePerTon: number
  chalkPricePerTon: number
  sandWorkerCostPerTon: number
  chalkWorkerCostPerTon: number
  marketCostPerTon: number
  loadingCostPerTon: number
  foodCostPerTon: number
  supervisorCostPerTon: number
  electricityCostPerTon: number
  stoneCostPerTon: number
  bagCostPerTon: number
}

export interface DailyFactoryRecord extends CostProfile {
  id: string
  date: string
  factory: FactoryName
  productType: ProductType
  incomingStoneTons: number
  usedStoneTons: number
  baggedOutputTons: number
  bulkOutputTons: number
  newBagCount: number
  oldBagCount: number
  notes: string
}

export interface IncomingLoadRecord {
  id: string
  date: string
  factory: FactoryName | ''
  vehicleType: VehicleType
  tons: number
  supplier: string
  pricePerTon: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: PaymentStatus
  notes: string
}

export interface SaleRecord {
  id: string
  date: string
  time: string
  factory: FactoryName
  clientName: string
  productName: string
  shipmentType: ShipmentType
  tons: number
  pricePerTon: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  advanceAmount: number
  balanceAmount: number
  balanceType: BalanceType
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  notes: string
}

export interface PaymentRecord {
  id: string
  date: string
  factory: FactoryName
  clientName: string
  amount: number
  paymentMethod: PaymentMethod
  saleId: string
  saleDate: string
  notes: string
}

export interface BarterRecord {
  id: string
  date: string
  supplierName: string
  clientName: string
  productName: ProductType
  tons: number
  pricePerTon: number
  amount: number
  notes: string
}

export interface ManualDebtRecord {
  id: string
  date: string
  factory: FactoryName
  clientName: string
  amount: number
  paidAmount: number
  remainingAmount: number
  notes: string
}

export interface ContactRecord {
  id: string
  type: ContactType
  name: string
  phone: string
  telegramChatId: string
  telegramUsername: string
  address: string
  notes: string
  createdAt: string
}

export interface ClientSummary {
  clientName: string
  totalTons: number
  totalRevenue: number
  averagePricePerTon: number
  totalDebt: number
  totalAdvance: number
  totalBarter: number
  balanceType: BalanceType
  balanceAmount: number
  lastPurchaseDate: string
  lastFactory: FactoryName
}

export interface OperationalExpense {
  id: string
  date: string
  factory: FactoryName | ''
  category: ExpenseCategory
  description: string
  amount: number
  paymentMethod: PaymentMethod
  notes: string
}

export interface DebtorSummary {
  clientName: string
  totalDebt: number
  totalPaid: number
  totalRevenue: number
  totalTons: number
  invoiceCount: number
  lastPurchaseDate: string
  lastFactory: FactoryName
}

export interface SupplierSummary {
  supplierName: string
  totalTons: number
  totalAmount: number
  totalPaid: number
  totalDebt: number
  totalAdvance: number
  totalBarter: number
  balanceType: BalanceType
  balanceAmount: number
  averagePricePerTon: number
  loadCount: number
  lastLoadDate: string
  lastFactory: FactoryName | ''
}

export interface ScaleEntry {
  id: string
  telegramUpdateId: number
  date: string
  time: string
  direction: ScaleDirection
  tons: number
  netKg: number
  grossKg: number
  tareKg: number
  vehicleNumber: string
  material: string
  partnerName: string
  driverName: string
  rawText: string
  sourceChatId: string
  notes: string
  createdAt: string
}

export interface ScaleSyncMeta {
  lastSyncAt: string
  lastSyncedCount: number
  lastUpdateId: number
}

export interface ScaleCashEntry {
  id: string
  date: string
  type: ScaleCashType
  amount: number
  paymentMethod: PaymentMethod
  description: string
  notes: string
  source: 'manual' | 'telegram'
  telegramUpdateId: number
  createdAt: string
}

export interface ClientReminderSetting {
  id: string
  clientName: string
  enabled: boolean
  frequency: ReminderFrequency
  time: string
  notes: string
  lastSentAt: string
}

export interface ClientDirectoryRecord extends ClientSummary {
  id: string
  phone: string
  telegramChatId: string
  telegramUsername: string
  address: string
  notes: string
  saleCount: number
  hasSales: boolean
}

export interface MonthlyArchiveItem {
  label: string
  amount: number
  section: MonthlyArchiveSection
  note: string
}

export interface MonthlyArchiveRecord {
  id: string
  title: string
  startDate: string
  endDate: string
  factoryScope: ArchiveFactoryScope
  producedTons: number
  shippedTons: number
  stoneLoadSummary: string
  stonePaymentTotal: number
  incomingMoneyTotal: number
  declaredExpenseTotal: number
  declaredProfitTotal: number
  notes: string
  items: MonthlyArchiveItem[]
}

export interface AccountingStateSnapshot {
  defaultCosts: CostProfile
  dailyRecords: DailyFactoryRecord[]
  incomingLoads: IncomingLoadRecord[]
  scaleEntries: ScaleEntry[]
  scaleSyncMeta: ScaleSyncMeta
  scaleCashEntries: ScaleCashEntry[]
  sales: SaleRecord[]
  manualDebts: ManualDebtRecord[]
  payments: PaymentRecord[]
  barterRecords: BarterRecord[]
  expenses: OperationalExpense[]
  contacts: ContactRecord[]
  reminders: ClientReminderSetting[]
  monthlyArchiveRecords: MonthlyArchiveRecord[]
  auditLogs: AuditLogRecord[]
  updatedAt: string
}
