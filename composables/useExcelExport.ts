import type { TableColumn } from '~/types/report'

type ExcelRow = Record<string, unknown>

export interface ExportSheet {
  name: string
  columns?: TableColumn[] | Array<{ key: string; label: string }>
  rows: ExcelRow[]
}

const workbookMimeType = 'application/vnd.ms-excel;charset=utf-8'

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const sanitizeSheetName = (value: string) => value.replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet'

const getColumns = (sheet: ExportSheet) => {
  if (sheet.columns?.length) {
    return sheet.columns.map((column) => ({
      key: column.key,
      label: column.label
    }))
  }

  const firstRow = sheet.rows[0] ?? {}

  return Object.keys(firstRow).map((key) => ({
    key,
    label: key
  }))
}

const buildCellXml = (value: unknown, header = false) => {
  const normalizedValue = value ?? ''
  const isNumber = typeof normalizedValue === 'number' && Number.isFinite(normalizedValue)
  const cellType = isNumber ? 'Number' : 'String'
  const serializedValue = isNumber ? String(normalizedValue) : escapeXml(String(normalizedValue))
  const style = header ? ' ss:StyleID="header"' : ''

  return `<Cell${style}><Data ss:Type="${cellType}">${serializedValue}</Data></Cell>`
}

const buildWorksheetXml = (sheet: ExportSheet) => {
  const columns = getColumns(sheet)
  const headerRow = `<Row>${columns.map((column) => buildCellXml(column.label, true)).join('')}</Row>`
  const bodyRows = sheet.rows
    .map(
      (row) =>
        `<Row>${columns
          .map((column) => buildCellXml(row[column.key]))
          .join('')}</Row>`
    )
    .join('')

  return `<Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}"><Table>${headerRow}${bodyRows}</Table></Worksheet>`
}

export const useExcelExport = () => {
  const downloadWorkbook = (filename: string, sheets: ExportSheet[]) => {
    if (!import.meta.client || !sheets.length) {
      return
    }

    const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#E2E8F0" ss:Pattern="Solid" />
    </Style>
  </Styles>
  ${sheets.map((sheet) => buildWorksheetXml(sheet)).join('')}
</Workbook>`

    const blob = new Blob([workbookXml], { type: workbookMimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
    link.click()

    URL.revokeObjectURL(url)
  }

  return {
    downloadWorkbook
  }
}
