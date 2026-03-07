<script setup lang="ts">
interface Props {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Confirm action',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  loading: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <AppModal :open="open" :title="title" size="sm" @close="emit('cancel')">
    <p class="text-sm text-slate-600">{{ message }}</p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="emit('cancel')">
          {{ cancelText }}
        </button>
        <button type="button" class="btn-danger" :disabled="loading" @click="emit('confirm')">
          {{ confirmText }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
