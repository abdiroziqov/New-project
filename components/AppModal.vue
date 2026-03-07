<script setup lang="ts">
interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closeOnBackdrop: true
})

const emit = defineEmits<{
  close: []
}>()

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-md'
    case 'lg':
      return 'max-w-3xl'
    case 'xl':
      return 'max-w-5xl'
    default:
      return 'max-w-xl'
  }
})

const close = () => emit('close')

const onBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-3 sm:px-4 sm:py-6"
        @click.self="onBackdropClick"
      >
        <div :class="['panel flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden sm:max-h-[calc(100dvh-3rem)]', sizeClass]">
          <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
            <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
            <button
              type="button"
              class="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              @click="close"
            >
              X
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <slot />
          </div>

          <div v-if="$slots.footer" class="shrink-0 border-t border-slate-200 px-4 py-3 sm:px-5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
