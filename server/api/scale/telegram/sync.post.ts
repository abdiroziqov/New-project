import { requireAdminSession } from '~/server/utils/auth-session'
import { syncScaleEntriesFromTelegram } from '~/server/utils/telegram-scale'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const result = await syncScaleEntriesFromTelegram()

  return {
    ok: true,
    syncedCount: result.newEntries.length,
    scaleEntries: result.state.scaleEntries,
    scaleSyncMeta: result.state.scaleSyncMeta
  }
})
