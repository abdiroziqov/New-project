import { readAccountingState } from '~/server/utils/accounting-storage'

export default defineEventHandler(async () => {
  const state = await readAccountingState()

  return {
    state
  }
})
