import type { AccountingStateSnapshot, ClientReminderSetting, ContactRecord, SaleRecord } from '~/types/accounting'
import { readAccountingState, writeAccountingState } from '~/server/utils/accounting-storage'

const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const reminderTimeZone = process.env.REMINDER_TIMEZONE || 'Asia/Tashkent'
const telegramDisabledMessage = 'Telegram yuborish o‘chirildi.'

const normalizeName = (value: string) => value.trim().toLowerCase()

const formatUzDate = (value: string) => {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!matched) {
    return value
  }

  const [, year, month, day] = matched
  return `${Number(year)} ${Number(day)} ${monthNames[Number(month) - 1]}`
}

const formatSom = (value: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} som`

const getTelegramBotToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim() ?? ''
const normalizeTelegramUsername = (value: string) => value.trim().replace(/^@/, '').toLowerCase()

const getZonedParts = (date: Date, timeZone = reminderTimeZone) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''

  return {
    year: Number(valueOf('year')),
    month: Number(valueOf('month')),
    day: Number(valueOf('day')),
    hour: valueOf('hour'),
    minute: valueOf('minute')
  }
}

const getDateKey = (date: Date, timeZone = reminderTimeZone) => {
  const parts = getZonedParts(date, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

const getDayDifference = (left: Date, right: Date, timeZone = reminderTimeZone) => {
  const leftParts = getZonedParts(left, timeZone)
  const rightParts = getZonedParts(right, timeZone)
  const leftUtc = Date.UTC(leftParts.year, leftParts.month - 1, leftParts.day)
  const rightUtc = Date.UTC(rightParts.year, rightParts.month - 1, rightParts.day)

  return Math.floor((leftUtc - rightUtc) / 86_400_000)
}

const findClientContact = (snapshot: AccountingStateSnapshot, clientName: string) =>
  snapshot.contacts.find(
    (contact) => contact.type === 'client' && normalizeName(contact.name) === normalizeName(clientName)
  ) ?? null

const getClientSales = (snapshot: AccountingStateSnapshot, clientName: string) =>
  snapshot.sales.filter((sale) => normalizeName(sale.clientName) === normalizeName(clientName))

const getClientManualDebts = (snapshot: AccountingStateSnapshot, clientName: string) =>
  snapshot.manualDebts.filter((record) => normalizeName(record.clientName) === normalizeName(clientName))

const getClientAdvancePayments = (snapshot: AccountingStateSnapshot, clientName: string) =>
  snapshot.payments.filter(
    (record) => normalizeName(record.clientName) === normalizeName(clientName) && !record.saleId.trim()
  )

const getClientBarterRecords = (snapshot: AccountingStateSnapshot, clientName: string) =>
  snapshot.barterRecords.filter((record) => normalizeName(record.clientName) === normalizeName(clientName))

const buildDebtSummary = (snapshot: AccountingStateSnapshot, clientName: string) => {
  const clientSales = getClientSales(snapshot, clientName)
  const clientManualDebts = getClientManualDebts(snapshot, clientName)
  const clientAdvancePayments = getClientAdvancePayments(snapshot, clientName)
  const clientBarterRecords = getClientBarterRecords(snapshot, clientName)

  if (!clientSales.length && !clientManualDebts.length && !clientAdvancePayments.length && !clientBarterRecords.length) {
    return null
  }

  const salesSummary = clientSales.reduce<{
    clientName: string
    totalDebt: number
    totalRevenue: number
    totalTons: number
    lastPurchaseDate: string
  }>(
    (current, sale) => {
      current.totalDebt += sale.remainingAmount
      current.totalRevenue += sale.totalAmount
      current.totalTons += sale.tons

      if (sale.date >= current.lastPurchaseDate) {
        current.lastPurchaseDate = sale.date
      }

      return current
    },
    {
      clientName,
      totalDebt: 0,
      totalRevenue: 0,
      totalTons: 0,
      lastPurchaseDate: clientSales[0]?.date ?? ''
    }
  )

  const summary = clientManualDebts.reduce(
    (current, debt) => {
      current.totalDebt += debt.remainingAmount
      current.totalRevenue += debt.amount

      if (!current.lastPurchaseDate || debt.date >= current.lastPurchaseDate) {
        current.lastPurchaseDate = debt.date
      }

      return current
    },
    salesSummary
  )

  const totalAdvance = clientAdvancePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalBarter = clientBarterRecords.reduce((sum, record) => sum + record.amount, 0)
  summary.totalDebt = Math.max(Number((summary.totalDebt - totalAdvance - totalBarter).toFixed(2)), 0)

  return summary
}

export const buildTelegramDebtReminderMessage = (
  snapshot: AccountingStateSnapshot,
  clientName: string,
  contact?: ContactRecord | null
) => {
  const summary = buildDebtSummary(snapshot, clientName)

  if (!summary || summary.totalDebt <= 0) {
    return ''
  }

  return [
    'Ming Bir Hazina',
    `${summary.clientName}, sizda qarz mavjud.`,
    summary.totalTons > 0 ? `Jami olingan yuk: ${summary.totalTons} tonna` : '',
    `Jami summa: ${formatSom(summary.totalRevenue)}`,
    `Qarz qoldiq: ${formatSom(summary.totalDebt)}`,
    `Oxirgi yuk sanasi: ${summary.lastPurchaseDate ? formatUzDate(summary.lastPurchaseDate) : '-'}`,
    contact?.phone ? `Tel: ${contact.phone}` : '',
    'Iltimos, to`lovni tasdiqlang.'
  ]
    .filter(Boolean)
    .join('\n')
}

const isReminderDue = (reminder: ClientReminderSetting, now = new Date(), timeZone = reminderTimeZone) => {
  if (!reminder.enabled) {
    return false
  }

  const currentParts = getZonedParts(now, timeZone)
  const currentTime = `${currentParts.hour}:${currentParts.minute}`

  if (currentTime < reminder.time) {
    return false
  }

  if (!reminder.lastSentAt) {
    return true
  }

  const lastSentDate = new Date(reminder.lastSentAt)

  if (Number.isNaN(lastSentDate.getTime())) {
    return true
  }

  if (getDateKey(now, timeZone) === getDateKey(lastSentDate, timeZone)) {
    return false
  }

  const dayDifference = getDayDifference(now, lastSentDate, timeZone)
  const minimumGap = reminder.frequency === 'every_2_days' ? 2 : 1

  return dayDifference >= minimumGap
}

export const sendTelegramMessage = async (chatId: string, message: string) => {
  void chatId
  void message
  throw new Error(telegramDisabledMessage)
}

export const getTelegramChats = async () => {
  return []
}

export const sendTelegramMessageToUsername = async (username: string, message: string) => {
  void username
  void message
  throw new Error(telegramDisabledMessage)
}

export const sendTelegramReminderToClient = async (clientName: string, customMessage?: string) => {
  void clientName
  void customMessage
  throw new Error(telegramDisabledMessage)
}

export const processDueTelegramReminders = async () => {
  return {
    sentCount: 0,
    skipped: 0
  }
}
