import type { ExportSheet } from '~/composables/useExcelExport'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildTableHtml = (sheet: ExportSheet) => {
  const columns =
    sheet.columns?.map((column) => ({
      key: column.key,
      label: column.label
    })) ??
    Object.keys(sheet.rows[0] ?? {}).map((key) => ({
      key,
      label: key
    }))

  const headerHtml = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')
  const bodyHtml = sheet.rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeHtml(String(row[column.key] ?? ''))}</td>`)
          .join('')}</tr>`
    )
    .join('')

  return `
    <section class="sheet">
      <h2>${escapeHtml(sheet.name)}</h2>
      <table>
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </section>
  `
}

export const usePdfExport = () => {
  const printWorkbook = (title: string, sheets: ExportSheet[]) => {
    if (!import.meta.client || !sheets.length) {
      return
    }

    const html = `
      <!doctype html>
      <html lang="uz">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #0f172a;
            }

            @page {
              size: A4;
              margin: 12mm;
            }

            h1 {
              margin: 0 0 16px;
              font-size: 24px;
            }

            h2 {
              margin: 0 0 12px;
              font-size: 18px;
            }

            .sheet {
              margin-bottom: 28px;
              page-break-inside: avoid;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #e2e8f0;
              font-weight: 700;
            }

            @media print {
              html,
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${sheets.map((sheet) => buildTableHtml(sheet)).join('')}
        </body>
      </html>
    `

    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.setAttribute('aria-hidden', 'true')
    document.body.appendChild(frame)

    const cleanup = () => {
      window.setTimeout(() => {
        frame.remove()
      }, 300)
    }

    const frameWindow = frame.contentWindow
    const frameDocument = frameWindow?.document

    if (!frameWindow || !frameDocument) {
      cleanup()
      return
    }

    frameDocument.open()
    frameDocument.write(html)
    frameDocument.close()

    window.setTimeout(() => {
      const handleAfterPrint = () => {
        frameWindow.removeEventListener('afterprint', handleAfterPrint)
        cleanup()
      }

      frameWindow.addEventListener('afterprint', handleAfterPrint)
      frameWindow.focus()
      frameWindow.print()
    }, 250)
  }

  return {
    printWorkbook
  }
}
