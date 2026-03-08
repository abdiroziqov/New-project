import { processDueTelegramReminders } from '~/server/utils/telegram-reminders'

declare global {
  // eslint-disable-next-line no-var
  var __mingBirHazinaReminderInterval__: NodeJS.Timeout | undefined
}

export default defineNitroPlugin(() => {
  if (globalThis.__mingBirHazinaReminderInterval__) {
    return
  }

  const run = async () => {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return
    }

    try {
      await processDueTelegramReminders()
    } catch (error) {
      console.error('Telegram reminder scheduler xatosi', error)
    }
  }

  setTimeout(() => {
    void run()
  }, 15_000)

  globalThis.__mingBirHazinaReminderInterval__ = setInterval(() => {
    void run()
  }, 60_000)
})
