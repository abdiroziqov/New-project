interface TelegramMessageLike {
  date?: number
  text?: string
  chat?: {
    id: number
    username?: string
    first_name?: string
    last_name?: string
    type?: string
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

export default defineEventHandler(async () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? ''

  if (!botToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TELEGRAM_BOT_TOKEN o`rnatilmagan.'
    })
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50`)
  const payload = (await response.json()) as TelegramUpdatesResponse

  if (!response.ok || payload.ok === false) {
    throw createError({
      statusCode: 502,
      statusMessage: payload.description || 'Telegram update olishda xato.'
    })
  }

  const chats = new Map<
    string,
    {
      chatId: string
      username: string
      fullName: string
      lastText: string
      updatedAt: string
      updatedAtUnix: number
    }
  >()

  for (const update of payload.result ?? []) {
    const message = update.message ?? update.edited_message
    const chat = message?.chat

    if (!chat?.id) {
      continue
    }

    const chatId = String(chat.id)
    const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim() || chat.username || chatId
    const updatedAtUnix = Number(message?.date ?? 0)
    const updatedAt = updatedAtUnix ? new Date(updatedAtUnix * 1000).toISOString() : ''
    const current = chats.get(chatId)

    if (!current || updatedAtUnix >= current.updatedAtUnix) {
      chats.set(chatId, {
        chatId,
        username: chat.username ?? '',
        fullName,
        lastText: message?.text ?? '',
        updatedAt,
        updatedAtUnix
      })
    }
  }

  return {
    chats: Array.from(chats.values())
      .sort((left, right) => right.updatedAtUnix - left.updatedAtUnix)
      .map(({ updatedAtUnix, ...chat }) => chat)
  }
})
