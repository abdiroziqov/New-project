import { createError, readBody } from 'h3'
import { requireAdminSession } from '~/server/utils/auth-session'
import { sendTelegramMessageToUsername, sendTelegramReminderToClient } from '~/server/utils/telegram-reminders'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{ clientName?: string; username?: string; message?: string }>(event)
  const clientName = body.clientName?.trim()
  const username = body.username?.trim()

  if (!clientName && !username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Klient nomi yoki Telegram user yuborilmadi.'
    })
  }

  if (username) {
    if (!body.message?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Telegram user uchun xabar yuborilmadi.'
      })
    }

    try {
      const result = await sendTelegramMessageToUsername(username, body.message)

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
  }

  try {
    const result = await sendTelegramReminderToClient(clientName as string, body.message)

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
