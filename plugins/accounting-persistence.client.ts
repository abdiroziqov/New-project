import { watch } from 'vue'
import type { AccountingStateSnapshot } from '~/types/accounting'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const { defaultCosts, dailyRecords, incomingLoads, payments, sales, expenses, contacts, reminders } = useFactoryAccounting()
    const { isAdmin } = useAuth()
    const storagePrefix = 'ming-bir-hazina:'
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let syncReady = false
    let lastSerializedSnapshot = ''

    const buildSnapshot = (): AccountingStateSnapshot => ({
      defaultCosts: defaultCosts.value,
      dailyRecords: dailyRecords.value,
      incomingLoads: incomingLoads.value,
      sales: sales.value,
      payments: payments.value,
      expenses: expenses.value,
      contacts: contacts.value,
      reminders: reminders.value,
      updatedAt: new Date().toISOString()
    })

    const applySnapshot = (snapshot: AccountingStateSnapshot) => {
      defaultCosts.value = snapshot.defaultCosts
      dailyRecords.value = snapshot.dailyRecords
      incomingLoads.value = snapshot.incomingLoads
      sales.value = snapshot.sales
      payments.value = snapshot.payments
      expenses.value = snapshot.expenses
      contacts.value = snapshot.contacts
      reminders.value = snapshot.reminders
      lastSerializedSnapshot = JSON.stringify(buildSnapshot())
    }

    const hasServerContent = (snapshot: AccountingStateSnapshot) =>
      Boolean(
        snapshot.dailyRecords.length ||
          snapshot.incomingLoads.length ||
          snapshot.sales.length ||
          snapshot.payments.length ||
          snapshot.expenses.length ||
          snapshot.contacts.length ||
          snapshot.reminders.length
      )

    const readLocalSnapshot = (): AccountingStateSnapshot | null => {
      try {
        const localSnapshot = {
          defaultCosts: JSON.parse(window.localStorage.getItem(`${storagePrefix}default-costs`) || 'null'),
          dailyRecords: JSON.parse(window.localStorage.getItem(`${storagePrefix}daily-records`) || '[]'),
          incomingLoads: JSON.parse(window.localStorage.getItem(`${storagePrefix}incoming-loads`) || '[]'),
          sales: JSON.parse(window.localStorage.getItem(`${storagePrefix}sales`) || '[]'),
          payments: JSON.parse(window.localStorage.getItem(`${storagePrefix}payments`) || '[]'),
          expenses: JSON.parse(window.localStorage.getItem(`${storagePrefix}expenses`) || '[]'),
          contacts: JSON.parse(window.localStorage.getItem(`${storagePrefix}contacts`) || '[]'),
          reminders: JSON.parse(window.localStorage.getItem(`${storagePrefix}reminders`) || '[]'),
          updatedAt: new Date().toISOString()
        } as AccountingStateSnapshot

        return hasServerContent(localSnapshot) ? localSnapshot : null
      } catch (error) {
        console.error('Local storage migration parse failed', error)
        return null
      }
    }

    const saveSnapshot = async () => {
      if (!isAdmin.value) {
        return
      }

      const snapshot = buildSnapshot()
      const serializedSnapshot = JSON.stringify(snapshot)

      if (serializedSnapshot === lastSerializedSnapshot) {
        return
      }

      try {
        await $fetch('/api/accounting/state', {
          method: 'PUT',
          body: snapshot
        })
        lastSerializedSnapshot = serializedSnapshot
      } catch (error) {
        console.error('Accounting state save failed', error)
      }
    }

    const scheduleSave = () => {
      if (!syncReady || !isAdmin.value) {
        return
      }

      if (saveTimer) {
        clearTimeout(saveTimer)
      }

      saveTimer = setTimeout(() => {
        void saveSnapshot()
      }, 500)
    }

    const bootSync = async () => {
      try {
        const response = await $fetch<{ state: AccountingStateSnapshot }>('/api/accounting/state')
        const localSnapshot = readLocalSnapshot()

        if (localSnapshot && !hasServerContent(response.state) && isAdmin.value) {
          const migratedResponse = await $fetch<{ state: AccountingStateSnapshot }>('/api/accounting/state', {
            method: 'PUT',
            body: localSnapshot
          })
          applySnapshot(migratedResponse.state)
        } else {
          applySnapshot(response.state)
        }
      } catch (error) {
        console.error('Accounting state load failed', error)
      } finally {
        syncReady = true

        watch([defaultCosts, dailyRecords, incomingLoads, sales, payments, expenses, contacts, reminders], scheduleSave, { deep: true })
      }
    }

    void bootSync()
  })
})
