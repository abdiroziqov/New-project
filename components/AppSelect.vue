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
const wrapperRef = ref<HTMLElement | null>(null)
const dropdownOpen = ref(false)
const displayOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    label: props.translateOptions ? t(option.label) : option.label
  }))
)
const normalizedModelValue = computed(() => String(props.modelValue ?? ''))
const filteredOptions = computed(() => {
  const query = normalizedModelValue.value.trim().toLowerCase()

  if (!query) {
    return displayOptions.value
  }

  return displayOptions.value.filter((option) => {
    const label = option.label.toLowerCase()
    const value = option.value.toLowerCase()
    return label.includes(query) || value.includes(query)
  })
})

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}

const onSearchInput = (event: Event) => {
  dropdownOpen.value = true
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const openDropdown = () => {
  if (props.disabled) {
    return
  }

  dropdownOpen.value = true
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const toggleDropdown = () => {
  if (props.disabled) {
    return
  }

  dropdownOpen.value = !dropdownOpen.value
}

const selectOption = (value: string) => {
  emit('update:modelValue', value)
  closeDropdown()
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!wrapperRef.value) {
    return
  }

  const target = event.target

  if (!(target instanceof Node)) {
    return
  }

  if (!wrapperRef.value.contains(target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const selectClasses = computed(() => [
  'w-full rounded-2xl border bg-white px-5 py-3.5 text-base text-slate-900 outline-none transition',
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

    <div v-if="searchable" ref="wrapperRef" class="relative">
      <div class="relative">
        <input
          :id="selectId"
          type="text"
          :value="modelValue ?? ''"
          :required="required"
          :disabled="disabled"
          :placeholder="t(placeholder)"
          autocomplete="off"
          :class="[...selectClasses, 'pr-14 placeholder:text-slate-400']"
          @focus="openDropdown"
          @input="onSearchInput"
        >
        <button
          type="button"
          class="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-slate-500 transition hover:text-slate-700"
          :disabled="disabled"
          @click="toggleDropdown"
        >
          <svg
            class="h-5 w-5 transition"
            :class="dropdownOpen ? 'rotate-180' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        v-if="dropdownOpen"
        class="absolute z-50 mt-3 max-h-72 w-full overflow-y-auto rounded-3xl border border-slate-300 bg-white py-2 shadow-xl"
      >
        <button
          v-for="option in filteredOptions"
          :key="option.value"
          type="button"
          class="flex w-full items-center justify-between px-6 py-4 text-left text-xl text-slate-700 transition hover:bg-slate-50"
          @mousedown.prevent="selectOption(option.value)"
        >
          <span>{{ option.label }}</span>
          <svg
            v-if="option.value === modelValue"
            class="h-5 w-5 text-brand-700"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.42l2.293 2.294 6.793-6.794a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <p v-if="!filteredOptions.length" class="px-6 py-4 text-base text-slate-400">
          {{ t('Natija topilmadi') }}
        </p>
      </div>
    </div>

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
