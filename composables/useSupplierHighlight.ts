const highlightedSuppliers = ['jorabek']

export const useSupplierHighlight = () => {
  const normalizeSupplier = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

  const isHighlightedSupplier = (value: unknown) => {
    const normalizedSupplier = normalizeSupplier(value)

    return highlightedSuppliers.some((supplier) => normalizedSupplier.includes(supplier))
  }

  const getSupplierChipClass = (value: unknown) =>
    isHighlightedSupplier(value) ? 'supplier-highlight-chip' : 'data-chip'

  const getSupplierInputClass = (value: unknown) =>
    isHighlightedSupplier(value)
      ? 'border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-amber-200'
      : ''

  return {
    isHighlightedSupplier,
    getSupplierChipClass,
    getSupplierInputClass
  }
}
