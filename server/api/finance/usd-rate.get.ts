type CbuCurrencyRate = {
  Ccy?: string
  Rate?: string
  Diff?: string
  Date?: string
}

const CBU_USD_RATES_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/'
const CACHE_TTL_MS = 30 * 60 * 1000

let cachedUsdRate:
  | {
      rate: number
      diff: number | null
      date: string
      fetchedAt: string
    }
  | null = null
let cachedAt = 0

const parseDecimal = (value: string | undefined) => {
  if (!value) {
    return null
  }

  const parsed = Number.parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export default defineEventHandler(async () => {
  const now = Date.now()

  if (cachedUsdRate && now - cachedAt < CACHE_TTL_MS) {
    return {
      ok: true,
      stale: false,
      source: CBU_USD_RATES_URL,
      ...cachedUsdRate
    }
  }

  try {
    const response = await fetch(CBU_USD_RATES_URL, {
      headers: {
        accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`CBU kursi olinmadi: ${response.status}`)
    }

    const rates = (await response.json()) as CbuCurrencyRate[]
    const usdRate = rates.find((item) => item.Ccy === 'USD')
    const parsedRate = parseDecimal(usdRate?.Rate)

    if (!usdRate || parsedRate === null) {
      throw new Error('USD kursi topilmadi.')
    }

    cachedUsdRate = {
      rate: Number(parsedRate.toFixed(2)),
      diff: parseDecimal(usdRate.Diff),
      date: usdRate.Date ?? '',
      fetchedAt: new Date().toISOString()
    }
    cachedAt = now

    return {
      ok: true,
      stale: false,
      source: CBU_USD_RATES_URL,
      ...cachedUsdRate
    }
  } catch {
    if (cachedUsdRate) {
      return {
        ok: true,
        stale: true,
        source: CBU_USD_RATES_URL,
        ...cachedUsdRate
      }
    }

    return {
      ok: false,
      stale: true,
      source: CBU_USD_RATES_URL,
      rate: null,
      diff: null,
      date: '',
      fetchedAt: new Date().toISOString()
    }
  }
})
