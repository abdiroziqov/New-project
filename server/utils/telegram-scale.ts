import type { AccountingStateSnapshot, ScaleDirection, ScaleEntry, ScaleSyncMeta } from '~/types/accounting'
import { readAccountingState, writeAccountingState } from '~/server/utils/accounting-storage'

interface TelegramMessageLike {
  date?: number
  text?: string
  chat?: {
    id?: number
  }
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessageLike
  edited_message?: TelegramMessageLike
}

interface TelegramUpdatesResponse {
  ok?: boolean
  description?: string
  result?: TelegramUpdate[]
}

const tashkentFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

const getScaleBotToken = () => process.env.TELEGRAM_SCALE_BOT_TOKEN?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim() || ''

const getDateTimeParts = (unixSeconds: number) => {
  const parts = tashkentFormatter.formatToParts(new Date(unixSeconds * 1000))
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''

  return {
    date: `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`,
    time: `${valueOf('hour')}:${valueOf('minute')}`
  }
}

const normalizeNumericText = (value: string) => value.replace(/\s+/g, '').replace(/,/g, '.')

const parseNumber = (value: string) => {
  const normalized = Number(normalizeNumericText(value))
  return Number.isFinite(normalized) ? normalized : 0
}

const findLineValue = (lines: string[], matchers: RegExp[]) => {
  for (const line of lines) {
    for (const matcher of matchers) {
      if (matcher.test(line)) {
        const numberMatch = line.match(/-?\d[\d\s.,]*/)
        if (numberMatch) {
          return {
            value: parseNumber(numberMatch[0]),
            line
          }
        }
      }
    }
  }

  return null
}

const extractTons = (text: string) => {
  const match = text.match(/(\d[\d\s.,]*)\s*(?:t|tn|tonna|тонна)\b/i)
  return match ? parseNumber(match[1]) : 0
}

const extractNetKg = (lines: string[]) => {
  const match = findLineValue(lines, [/\bnet\b/i, /нетто/i, /\bsof\b/i, /чист/i])

  if (!match) {
    return 0
  }

  if (/\b(?:t|tn|tonna|тонна)\b/i.test(match.line)) {
    return Number((match.value * 1000).toFixed(2))
  }

  return match.value
}

const extractGrossKg = (lines: string[]) => {
  const match = findLineValue(lines, [/\bgross\b/i, /брутто/i, /brutto/i])
  return match ? match.value : 0
}

const extractTareKg = (lines: string[]) => {
  const match = findLineValue(lines, [/\btare\b/i, /тара/i])
  return match ? match.value : 0
}

const extractLabeledText = (lines: string[], matchers: RegExp[]) => {
  for (const line of lines) {
    if (matchers.some((matcher) => matcher.test(line))) {
      const [, value = ''] = line.split(/[:|-]/, 2)
      if (value.trim()) {
        return value.trim()
      }
    }
  }

  return ''
}

const extractVehicleNumber = (text: string, lines: string[]) => {
  const labeled = extractLabeledText(lines, [/\bavto\b/i, /\bgos\b/i, /mashina/i, /номер/i, /raqam/i])

  if (labeled) {
    return labeled
  }

  const match = text.match(/\b\d{2,3}\s?[A-ZА-Я]{1,3}\s?\d{2,4}\b|\b[A-ZА-Я]{1,3}\s?\d{1,4}\s?[A-ZА-Я]{1,3}\b/i)
  return match?.[0]?.trim() ?? ''
}

const detectMaterial = (text: string, lines: string[]) => {
  const labeled = extractLabeledText(lines, [/\bmaterial\b/i, /mahsulot/i, /юк/i, /материал/i])

  if (labeled) {
    return labeled
  }

  const lower = text.toLowerCase()

  if (lower.includes('qum') || lower.includes('қум')) {
    return 'Qum'
  }

  if (lower.includes('mel') || lower.includes('мел')) {
    return 'Mel'
  }

  if (lower.includes('tosh') || lower.includes('тош') || lower.includes('камень')) {
    return 'Tosh'
  }

  return ''
}

const detectDirection = (text: string): ScaleDirection => {
  const lower = text.toLowerCase()

  if (
    lower.includes('kirim') ||
    lower.includes('кир') ||
    lower.includes('приход') ||
    lower.includes('inbound') ||
    lower.includes('entry')
  ) {
    return 'kirim'
  }

  if (
    lower.includes('chiqim') ||
    lower.includes('отгруз') ||
    lower.includes('выход') ||
    lower.includes('outbound') ||
    lower.includes('exit')
  ) {
    return 'chiqim'
  }

  return 'unknown'
}

const parseScaleUpdate = (update: TelegramUpdate): ScaleEntry | null => {
  const message = update.message ?? update.edited_message
  const rawText = message?.text?.trim() ?? ''

  if (!rawText) {
    return null
  }

  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const tonsFromText = extractTons(rawText)
  const netKg = extractNetKg(lines)
  const grossKg = extractGrossKg(lines)
  const tareKg = extractTareKg(lines)
  const tons = tonsFromText || (netKg ? Number((netKg / 1000).toFixed(2)) : 0)

  if (!tons && !netKg && !grossKg && !tareKg) {
    return null
  }

  const partnerName = extractLabeledText(lines, [
    /\bpartner\b/i,
    /\bklient\b/i,
    /\bmijoz\b/i,
    /ta'minotchi/i,
    /\bkimga\b/i,
    /\bkimdan\b/i,
    /supplier/i,
    /client/i
  ])

  const driverName = extractLabeledText(lines, [/\bhaydovchi\b/i, /\bdriver\b/i, /водитель/i])
  const direction = detectDirection(rawText)
  const { date, time } = getDateTimeParts(Number(message?.date ?? Math.floor(Date.now() / 1000)))

  return {
    id: `scale-${update.update_id}`,
    telegramUpdateId: update.update_id,
    date,
    time,
    direction,
    tons,
    netKg,
    grossKg,
    tareKg,
    vehicleNumber: extractVehicleNumber(rawText, lines),
    material: detectMaterial(rawText, lines),
    partnerName,
    driverName,
    rawText,
    sourceChatId: String(message?.chat?.id ?? ''),
    notes: '',
    createdAt: new Date().toISOString()
  }
}

const fetchTelegramScaleUpdates = async () => {
  const botToken = getScaleBotToken()

  if (!botToken) {
    throw new Error('TELEGRAM_SCALE_BOT_TOKEN yoki TELEGRAM_BOT_TOKEN o`rnatilmagan.')
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`)
  const payload = (await response.json()) as TelegramUpdatesResponse

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.description || 'Telegram tarozi update olishda xato.')
  }

  return payload.result ?? []
}

const mergeScaleEntries = (snapshot: AccountingStateSnapshot, parsedEntries: ScaleEntry[]) => {
  const knownUpdateIds = new Set(snapshot.scaleEntries.map((entry) => entry.telegramUpdateId))
  const newEntries = parsedEntries.filter((entry) => !knownUpdateIds.has(entry.telegramUpdateId))

  if (newEntries.length) {
    snapshot.scaleEntries = [...newEntries, ...snapshot.scaleEntries].sort((left, right) => {
      const rightKey = `${right.date} ${right.time}`
      const leftKey = `${left.date} ${left.time}`
      return rightKey.localeCompare(leftKey)
    })
  }

  const lastUpdateId = parsedEntries.reduce((max, entry) => Math.max(max, entry.telegramUpdateId), snapshot.scaleSyncMeta.lastUpdateId)
  snapshot.scaleSyncMeta = {
    lastSyncAt: new Date().toISOString(),
    lastSyncedCount: newEntries.length,
    lastUpdateId
  }

  return {
    newEntries,
    syncMeta: snapshot.scaleSyncMeta
  }
}

export const syncScaleEntriesFromTelegram = async () => {
  const updates = await fetchTelegramScaleUpdates()
  const parsedEntries = updates.map((update) => parseScaleUpdate(update)).filter(Boolean) as ScaleEntry[]
  const snapshot = await readAccountingState()
  const { newEntries, syncMeta } = mergeScaleEntries(snapshot, parsedEntries)
  const state = await writeAccountingState(snapshot)

  return {
    state,
    newEntries,
    syncMeta
  }
}

export const processScaleUpdatesSilently = async () => {
  try {
    return await syncScaleEntriesFromTelegram()
  } catch (error) {
    console.error('Scale Telegram sync failed', error)
    return null
  }
}
