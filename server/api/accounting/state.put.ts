import { requireAdminSession } from '~/server/utils/auth-session'
import { writeAccountingState } from '~/server/utils/accounting-storage'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  const body = await readBody(event)
  const state = await writeAccountingState(body)

  return {
    ok: true,
    state
  }
})
