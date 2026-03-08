<script setup lang="ts">
import type { ChartPoint } from '~/types/report'

interface Props {
  title: string
  subtitle?: string
  type: 'line' | 'bar' | 'pie'
  points: ChartPoint[]
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: ''
})

const { t } = useUiLocale()

const palette = ['#1f88ff', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const normalizedPoints = computed(() =>
  props.points.map((point, index) => ({
    ...point,
    color: point.color ?? palette[index % palette.length]
  }))
)

const maxValue = computed(() => {
  const values = normalizedPoints.value.map((point) => point.value)
  return Math.max(...values, 1)
})

const linePoints = computed(() => {
  if (!normalizedPoints.value.length) {
    return ''
  }

  if (normalizedPoints.value.length === 1) {
    const point = normalizedPoints.value[0]
    const y = 50 - (point.value / maxValue.value) * 40
    return `50,${y}`
  }

  return normalizedPoints.value
    .map((point, index) => {
      const x = (index / (normalizedPoints.value.length - 1)) * 100
      const y = 50 - (point.value / maxValue.value) * 40
      return `${x},${y}`
    })
    .join(' ')
})

const pieBackground = computed(() => {
  const total = normalizedPoints.value.reduce((sum, point) => sum + point.value, 0)

  if (!total) {
    return 'conic-gradient(#e2e8f0 0% 100%)'
  }

  let current = 0
  const stops = normalizedPoints.value.map((point) => {
    const start = (current / total) * 100
    current += point.value
    const end = (current / total) * 100
    return `${point.color} ${start}% ${end}%`
  })

  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <article class="panel p-5">
    <header class="mb-4">
      <h3 class="text-base font-semibold text-slate-900">{{ t(title) }}</h3>
      <p v-if="subtitle" class="text-xs text-slate-500">{{ t(subtitle) }}</p>
    </header>

    <div v-if="type === 'line'" class="space-y-3">
      <svg viewBox="0 0 100 55" class="h-40 w-full rounded-lg bg-slate-50 p-2">
        <polyline
          fill="none"
          stroke="#1f88ff"
          stroke-width="2"
          stroke-linecap="round"
          :points="linePoints"
        />
      </svg>

      <div class="flex flex-wrap gap-2 text-xs text-slate-500">
        <span v-for="point in normalizedPoints" :key="point.label" class="rounded bg-slate-100 px-2 py-1">
          {{ t(point.label) }}: {{ point.value }}
        </span>
      </div>
    </div>

    <div v-else-if="type === 'bar'" class="space-y-4">
      <div class="flex h-40 items-end gap-2 rounded-lg bg-slate-50 p-3">
        <div v-for="point in normalizedPoints" :key="point.label" class="flex flex-1 flex-col items-center gap-2">
          <span class="text-xs font-semibold text-slate-700">{{ point.value }}</span>
          <div
            class="w-full rounded-t"
            :style="{
              height: `${Math.max((point.value / maxValue) * 100, 4)}%`,
              backgroundColor: point.color
            }"
          />
          <span class="text-[11px] text-slate-500">{{ t(point.label) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="mx-auto h-40 w-40 rounded-full" :style="{ background: pieBackground }" />
      <div class="grid gap-2 text-sm">
        <div
          v-for="point in normalizedPoints"
          :key="point.label"
          class="flex items-center justify-between rounded bg-slate-50 px-3 py-2"
        >
          <span class="inline-flex items-center gap-2 text-slate-700">
            <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: point.color }" />
            {{ t(point.label) }}
          </span>
          <span class="font-semibold text-slate-900">{{ point.value }}</span>
        </div>
      </div>
    </div>
  </article>
</template>
