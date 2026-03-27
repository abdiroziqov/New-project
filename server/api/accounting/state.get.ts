import { getSessionUser } from '~/server/utils/auth-session'
import { readAccountingState } from '~/server/utils/accounting-storage'

export default defineEventHandler(async (event) => {
  const state = await readAccountingState()
  const sessionUser = getSessionUser(event)

  if (sessionUser?.username !== 'pro') {
    state.auditLogs = []
  }

  return {
    state
  }
})
