import { processScaleUpdatesSilently } from '~/server/utils/telegram-scale'

export default defineNitroPlugin(() => {
  if (!process.env.TELEGRAM_SCALE_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
    return
  }

  void processScaleUpdatesSilently()

  setInterval(() => {
    void processScaleUpdatesSilently()
  }, 300_000)
})
