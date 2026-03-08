<script setup lang="ts">
import { useId } from 'vue'

interface SelectOption {
  label: string
  value: string
}

interface Props {
  modelValue: string | number | null
  label?: string
  id?: string
  options: SelectOption[]
  placeholder?: string
  translateOptions?: boolean
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  id: '',
  placeholder: 'Select an option',
  translateOptions: true,
  required: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedId = useId()
const { t } = useUiLocale()
const selectId = computed(() => props.id || `select-${generatedId}`)
const displayOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    label: props.translateOptions ? t(option.label) : option.label
  }))
)

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-slate-700">
      {{ t(label) }}
    </label>

    <select
      :id="selectId"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition focus:border-brand-500 focus:ring"
      @change="onChange"
    >
      <option value="">{{ t(placeholder) }}</option>
      <option v-for="option in displayOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
