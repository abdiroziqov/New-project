import { requireAdminSession } from '~/server/utils/auth-session'
import { readAccountingState, writeAccountingState } from '~/server/utils/accounting-storage'

export default defineEventHandler(async (event) => {
  const sessionUser = requireAdminSession(event)
  const body = await readBody(event)

  if (sessionUser.username !== 'pro') {
    const currentState = await readAccountingState()
    body.auditLogs = currentState.auditLogs
  }

  const state = await writeAccountingState(body)

  return {
    ok: true,
    state
  }
})
