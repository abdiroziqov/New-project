interface DateRangeState {
  startDate: string
  endDate: string
}

const toDateInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export const useDateRangePresets = () => {
  const setRecentDays = (filters: DateRangeState, days: number) => {
    const endDate = new Date()
    const startDate = new Date()

    startDate.setDate(endDate.getDate() - days)
    filters.startDate = toDateInputValue(startDate)
    filters.endDate = toDateInputValue(endDate)
  }

  const setCurrentMonth = (filters: DateRangeState) => {
    const endDate = new Date()
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

    filters.startDate = toDateInputValue(startDate)
    filters.endDate = toDateInputValue(endDate)
  }

  return {
    setRecentDays,
    setCurrentMonth
  }
}
