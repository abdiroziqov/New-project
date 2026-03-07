import { createError, getCookie, type H3Event } from 'h3'
import type { SessionUser } from '~/types/auth'

const isSessionUser = (value: unknown): value is SessionUser => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<SessionUser>

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.username === 'string' &&
    typeof record.role === 'string'
  )
}

export const getSessionUser = (event: H3Event): SessionUser | null => {
  const rawCookie = getCookie(event, 'fm_user')

  if (!rawCookie) {
    return null
  }

  try {
    const decoded = decodeURIComponent(rawCookie)
    const normalized = decoded.startsWith('j:') ? decoded.slice(2) : decoded
    const parsed = JSON.parse(normalized) as unknown

    return isSessionUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const requireAdminSession = (event: H3Event) => {
  const sessionUser = getSessionUser(event)

  if (sessionUser?.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Faqat admin yozuvlarni o‘zgartira oladi.'
    })
  }

  return sessionUser
}
