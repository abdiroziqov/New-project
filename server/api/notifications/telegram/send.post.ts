import { createError, readBody } from 'h3'
import { requireAdminSession } from '~/server/utils/auth-session'
import { sendTelegramReminderToClient } from '~/server/utils/telegram-reminders'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{ clientName?: string; message?: string }>(event)
  const clientName = body.clientName?.trim()

  if (!clientName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Klient nomi yuborilmadi.'
    })
  }

  try {
    const result = await sendTelegramReminderToClient(clientName, body.message)

    return {
      ok: true,
      sentAt: result.sentAt
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Telegram yuborishda xato.'
    })
  }
})
