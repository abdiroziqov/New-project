<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  modelValue: string | number | null
  label?: string
  id?: string
  type?: string
  placeholder?: string
  list?: string
  autocomplete?: string
  inputClass?: string
  min?: string | number
  max?: string | number
  step?: string | number
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  id: '',
  type: 'text',
  placeholder: '',
  list: '',
  autocomplete: '',
  inputClass: '',
  min: undefined,
  max: undefined,
  step: undefined,
  required: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const generatedId = useId()
const inputId = computed(() => props.id || `input-${generatedId}`)
const isMaskedNumber = computed(() => props.type === 'number')
const inputType = computed(() => (isMaskedNumber.value ? 'text' : props.type))
const inputMode = computed(() => (isMaskedNumber.value ? 'decimal' : undefined))

const sanitizeNumberInput = (value: string) => {
  const normalizedValue = value.replace(/\s+/g, '').replace(/,/g, '.')
  let result = ''
  let hasDecimal = false
  let hasSign = false

  for (const character of normalizedValue) {
    if (/\d/.test(character)) {
      result += character
      continue
    }

    if (character === '.' && !hasDecimal) {
      result += character
      hasDecimal = true
      continue
    }

    if (character === '-' && !result.length && !hasSign) {
      result += character
      hasSign = true
    }
  }

  return result
}

const formatNumericMask = (value: string | number | null | undefined) => {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const normalizedValue = typeof value === 'number' ? String(value) : sanitizeNumberInput(value)

  if (!normalizedValue || normalizedValue === '-' || normalizedValue === '.' || normalizedValue === '-.') {
    return normalizedValue
  }

  const negative = normalizedValue.startsWith('-')
  const unsignedValue = negative ? normalizedValue.slice(1) : normalizedValue
  const [integerPartRaw = '', decimalPart = ''] = unsignedValue.split('.')
  const hasDecimal = unsignedValue.includes('.')
  const normalizedInteger = integerPartRaw.replace(/^0+(?=\d)/, '') || '0'
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  return `${negative ? '-' : ''}${groupedInteger}${hasDecimal ? `.${decimalPart}` : ''}`
}

const displayValue = computed(() => (isMaskedNumber.value ? formatNumericMask(props.modelValue) : (props.modelValue ?? '')))

const onInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value

  if (isMaskedNumber.value) {
    const sanitizedValue = sanitizeNumberInput(value)
    input.value = formatNumericMask(sanitizedValue)

    if (sanitizedValue === '' || sanitizedValue === '-' || sanitizedValue === '.' || sanitizedValue === '-.') {
      emit('update:modelValue', '')
      return
    }

    emit('update:modelValue', Number(sanitizedValue))
    return
  }

  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-slate-700">
      {{ label }}
    </label>

    <input
      :id="inputId"
      :type="inputType"
      :inputmode="inputMode"
      :value="displayValue"
      :placeholder="placeholder"
      :list="list || undefined"
      :autocomplete="autocomplete || undefined"
      :min="min"
      :max="max"
      :step="step"
      :required="required"
      :disabled="disabled"
      :class="[
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-300 transition placeholder:text-slate-400 focus:border-brand-500 focus:ring',
        inputClass
      ]"
      @input="onInput"
    >
  </div>
</template>
