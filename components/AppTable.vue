<script setup lang="ts">
import type { TableColumn } from '~/types/report'

interface Props {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey?: string
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  emptyText: 'No records found.'
})

const { formatDate } = useFormatting()
const { t } = useUiLocale()

const cellAlignmentClass = (align: TableColumn['align']) => {
  if (align === 'center') {
    return 'text-center'
  }

  if (align === 'right') {
    return 'text-right'
  }

  return 'text-left'
}

const isDateCell = (key: string, value: unknown): value is string =>
  typeof value === 'string' &&
  key.toLowerCase().includes('date') &&
  /^\d{4}-\d{2}-\d{2}/.test(value)

const getCellValue = (key: string, value: unknown) => {
  if (isDateCell(key, value)) {
    return formatDate(value)
  }

  return value
}
</script>

<template>
  <div class="w-full max-w-full overflow-x-auto">
    <table class="min-w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[
              'border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
              cellAlignmentClass(column.align),
              column.headerClass
            ]"
          >
            {{ t(column.label) }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-sm text-slate-500">
            {{ t(emptyText) }}
          </td>
        </tr>

        <tr
          v-for="(row, rowIndex) in rows"
          v-else
          :key="String(row[rowKey] ?? rowIndex)"
          class="transition hover:bg-slate-50"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            :class="[
              'border-b border-slate-100 px-4 py-3 align-middle text-slate-700',
              cellAlignmentClass(column.align),
              column.cellClass
            ]"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ getCellValue(column.key, row[column.key]) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
