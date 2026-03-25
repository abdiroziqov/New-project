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
  searchable?: boolean
  required?: boolean
  disabled?: boolean
  invalid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  id: '',
  placeholder: 'Select an option',
  translateOptions: true,
  searchable: false,
  required: false,
  disabled: false,
  invalid: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedId = useId()
const { t } = useUiLocale()
const selectId = computed(() => props.id || `select-${generatedId}`)
const datalistId = computed(() => `${selectId.value}-list`)
const displayOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    label: props.translateOptions ? t(option.label) : option.label
  }))
)

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}

const onSearchInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const selectClasses = computed(() => [
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition',
  props.invalid
    ? 'border-rose-400 bg-rose-50 ring-rose-200 focus:border-rose-500 focus:ring'
    : 'border-slate-300 ring-brand-300 focus:border-brand-500 focus:ring'
])
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-slate-700">
      {{ t(label) }}
    </label>

    <template v-if="searchable">
      <input
        :id="selectId"
        type="text"
        :value="modelValue ?? ''"
        :required="required"
        :disabled="disabled"
        :placeholder="t(placeholder)"
        :list="datalistId"
        autocomplete="off"
        :class="[...selectClasses, 'placeholder:text-slate-400']"
        @input="onSearchInput"
      >
      <datalist :id="datalistId">
        <option v-for="option in displayOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </datalist>
    </template>

    <select
      v-else
      :id="selectId"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      :class="selectClasses"
      @change="onChange"
    >
      <option value="">{{ t(placeholder) }}</option>
      <option v-for="option in displayOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
