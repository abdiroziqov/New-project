<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  trend: '',
  trendType: 'neutral'
})

const trendClass = computed(() => {
  if (props.trendType === 'up') {
    return 'text-emerald-600'
  }

  if (props.trendType === 'down') {
    return 'text-rose-600'
  }

  return 'text-slate-500'
})
</script>

<template>
  <article class="panel p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <h3 class="mt-1 text-2xl font-bold text-slate-900">{{ value }}</h3>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <div class="rounded-lg bg-brand-50 px-2 py-1 text-brand-700">
        <slot name="icon">*</slot>
      </div>
    </div>

    <p v-if="trend" :class="['mt-4 text-xs font-semibold', trendClass]">
      {{ trend }}
    </p>
  </article>
</template>
