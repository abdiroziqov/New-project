import type { ProductType, ShipmentType } from '~/types/accounting'

const normalizeProductText = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

export const getProductTypeFromText = (value: unknown): ProductType | null => {
  const normalizedValue = normalizeProductText(value)

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.includes('mel')) {
    return 'Mel'
  }

  if (normalizedValue.includes('qum')) {
    return 'Qum'
  }

  return null
}

export const isBulkAllowedForProduct = (value: unknown) => getProductTypeFromText(value) !== 'Mel'

export const normalizeBulkOutputTons = (productType: unknown, bulkOutputTons: number) =>
  isBulkAllowedForProduct(productType) ? Number(bulkOutputTons) : 0

export const normalizeShipmentTypeForProduct = (productName: unknown, shipmentType: ShipmentType): ShipmentType =>
  isBulkAllowedForProduct(productName) ? shipmentType : 'qoplik'
