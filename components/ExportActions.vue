<script setup lang="ts">
interface Props {
  label?: string
  excelLabel?: string
  pdfLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Yuklab olish',
  excelLabel: 'Excel',
  pdfLabel: 'PDF'
})

const emit = defineEmits<{
  excel: []
  pdf: []
}>()

const { t } = useUiLocale()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const closeMenu = () => {
  open.value = false
}

const toggleMenu = () => {
  open.value = !open.value
}

const onExcel = () => {
  emit('excel')
  closeMenu()
}

const onPdf = () => {
  emit('pdf')
  closeMenu()
}

const handleClickOutside = (event: MouseEvent) => {
  if (!rootRef.value) {
    return
  }

  if (!rootRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button type="button" class="btn-secondary" @click="toggleMenu">{{ t(props.label) }}</button>

    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 min-w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
    >
      <button type="button" class="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50" @click="onExcel">
        {{ t(props.excelLabel) }}
      </button>
      <button type="button" class="mt-1 flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50" @click="onPdf">
        {{ t(props.pdfLabel) }}
      </button>
    </div>
  </div>
</template>
