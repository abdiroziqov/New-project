export const useFormatting = () => {
  const formatSom = (value: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} som`
  const formatTons = (value: number) => `${new Intl.NumberFormat('uz-UZ').format(Number(value.toFixed(2)))} t`
  const monthNames = [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentabr',
    'oktabr',
    'noyabr',
    'dekabr'
  ]

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) {
      return ''
    }

    if (value instanceof Date) {
      return `${value.getFullYear()} ${value.getDate()} ${monthNames[value.getMonth()]}`
    }

    const matchedDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)

    if (!matchedDate) {
      return value
    }

    const [, year, month, day] = matchedDate
    return `${Number(year)} ${Number(day)} ${monthNames[Number(month) - 1]}`
  }

  return {
    formatSom,
    formatTons,
    formatDate
  }
}
