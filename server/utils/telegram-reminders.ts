import type { AccountingStateSnapshot, ClientReminderSetting, ContactRecord, SaleRecord } from '~/types/accounting'
import { readAccountingState, writeAccountingState } from '~/server/utils/accounting-storage'

const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const reminderTimeZone = process.env.REMINDER_TIMEZONE || 'Asia/Tashkent'

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

const buildDebtSummary = (snapshot: AccountingStateSnapshot, clientName: string) => {
  const clientSales = getClientSales(snapshot, clientName)
  const clientManualDebts = getClientManualDebts(snapshot, clientName)

  if (!clientSales.length && !clientManualDebts.length) {
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

  return clientManualDebts.reduce(
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
  const botToken = getTelegramBotToken()

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN o`rnatilmagan.')
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  })

  const payload = (await response.json()) as { ok?: boolean; description?: string }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.description || 'Telegram yuborishda xato.')
  }

  return payload
}

export const sendTelegramReminderToClient = async (clientName: string, customMessage?: string) => {
  const snapshot = await readAccountingState()
  const contact = findClientContact(snapshot, clientName)

  if (!contact?.telegramChatId) {
    throw new Error('Klient uchun Telegram chat ID kiritilmagan.')
  }

  const message = customMessage?.trim() || buildTelegramDebtReminderMessage(snapshot, clientName, contact)

  if (!message) {
    throw new Error('Yuborish uchun xabar topilmadi.')
  }

  await sendTelegramMessage(contact.telegramChatId, message)

  const reminderIndex = snapshot.reminders.findIndex(
    (record) => normalizeName(record.clientName) === normalizeName(clientName)
  )
  const sentAt = new Date().toISOString()

  if (reminderIndex !== -1) {
    snapshot.reminders[reminderIndex] = {
      ...snapshot.reminders[reminderIndex],
      lastSentAt: sentAt
    }
    await writeAccountingState(snapshot)
  }

  return {
    sentAt,
    message,
    contact
  }
}

export const processDueTelegramReminders = async () => {
  const snapshot = await readAccountingState()
  const dueReminders = snapshot.reminders.filter((reminder) => {
    const contact = findClientContact(snapshot, reminder.clientName)
    const debtSummary = buildDebtSummary(snapshot, reminder.clientName)

    return Boolean(contact?.telegramChatId) && Boolean(debtSummary?.totalDebt) && isReminderDue(reminder)
  })

  if (!dueReminders.length) {
    return {
      sentCount: 0,
      skipped: 0
    }
  }

  let changed = false
  let sentCount = 0
  let skipped = 0

  for (const reminder of dueReminders) {
    const contact = findClientContact(snapshot, reminder.clientName)
    const message = buildTelegramDebtReminderMessage(snapshot, reminder.clientName, contact)

    if (!contact?.telegramChatId || !message) {
      skipped += 1
      continue
    }

    try {
      await sendTelegramMessage(contact.telegramChatId, message)
      reminder.lastSentAt = new Date().toISOString()
      changed = true
      sentCount += 1
    } catch (error) {
      console.error(`Telegram yuborish xatosi: ${reminder.clientName}`, error)
    }
  }

  if (changed) {
    await writeAccountingState(snapshot)
  }

  return {
    sentCount,
    skipped
  }
}
