declare global {
  // eslint-disable-next-line no-var
  var __mingBirHazinaReminderInterval__: NodeJS.Timeout | undefined
}

export default defineNitroPlugin(() => {
  if (globalThis.__mingBirHazinaReminderInterval__) {
    clearInterval(globalThis.__mingBirHazinaReminderInterval__)
    globalThis.__mingBirHazinaReminderInterval__ = undefined
  }
})
