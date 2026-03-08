<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  modelValue: string | number | null
  label?: string
  id?: string
  type?: string
  mask?: '' | 'phone'
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
  mask: '',
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
const { t } = useUiLocale()
const inputId = computed(() => props.id || `input-${generatedId}`)
const isMaskedNumber = computed(() => props.type === 'number')
const isPhoneMask = computed(() => props.mask === 'phone')
const inputType = computed(() => {
  if (isMaskedNumber.value) {
    return 'text'
  }

  if (isPhoneMask.value) {
    return 'tel'
  }

  return props.type
})
const inputMode = computed(() => {
  if (isMaskedNumber.value) {
    return 'decimal'
  }

  if (isPhoneMask.value) {
    return 'tel'
  }

  return undefined
})

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

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '')

const formatPhoneMask = (value: string | number | null | undefined) => {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const digitsOnly = sanitizePhoneInput(String(value))

  if (!digitsOnly) {
    return ''
  }

  let localDigits = digitsOnly

  if (localDigits.startsWith('998')) {
    localDigits = localDigits.slice(3)
  } else if (localDigits.startsWith('0')) {
    localDigits = localDigits.slice(1)
  }

  localDigits = localDigits.slice(0, 9)

  const parts = []

  if (localDigits.length > 0) {
    parts.push(localDigits.slice(0, 2))
  }

  if (localDigits.length > 2) {
    parts.push(localDigits.slice(2, 5))
  }

  if (localDigits.length > 5) {
    parts.push(localDigits.slice(5, 7))
  }

  if (localDigits.length > 7) {
    parts.push(localDigits.slice(7, 9))
  }

  return `+998 ${parts.join(' ')}`.trim()
}

const displayValue = computed(() => {
  if (isMaskedNumber.value) {
    return formatNumericMask(props.modelValue)
  }

  if (isPhoneMask.value) {
    return formatPhoneMask(props.modelValue)
  }

  return props.modelValue ?? ''
})

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

  if (isPhoneMask.value) {
    const formattedValue = formatPhoneMask(value)
    input.value = formattedValue
    emit('update:modelValue', formattedValue)
    return
  }

  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-slate-700">
      {{ t(label) }}
    </label>

    <input
      :id="inputId"
      :type="inputType"
      :inputmode="inputMode"
      :value="displayValue"
      :placeholder="t(placeholder)"
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
