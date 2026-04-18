import { createError } from 'h3'
import { requireAdminSession } from '~/server/utils/auth-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  throw createError({
    statusCode: 410,
    statusMessage: 'Telegram yuborish o‘chirildi.'
  })
})
