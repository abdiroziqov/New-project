<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { user, logout } = useAuth()
const { mainNavigation, manualNavigation, getPageTitle } = useAppNavigation()
const { formatDate } = useFormatting()
const { t, locale, setLocale, localeOptions } = useUiLocale()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const pageTitle = computed(() => getPageTitle(route.path) ?? runtimeConfig.public.appName)
const today = useState('layout:header-today', () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''

  return formatDate(`${year}-${month}-${day}`)
})

const isActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }

  return route.path.startsWith(path)
}

const handleLogout = async () => {
  logout()
  await navigateTo('/')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          class="inline-flex shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600"
          @click="emit('toggleSidebar')"
        >
          {{ t('Menu') }}
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold text-slate-900">{{ pageTitle }}</h1>
          <p class="max-w-[11rem] truncate text-xs text-slate-500 sm:max-w-none">
            <NuxtLink to="/dashboard" class="font-semibold text-slate-600 transition hover:text-brand-700">
              {{ t(runtimeConfig.public.appName) }}
            </NuxtLink>
            · {{ today }}
          </p>
        </div>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <div class="hidden items-center rounded-lg bg-slate-100 p-1 sm:flex">
          <button
            v-for="item in localeOptions"
            :key="item.value"
            type="button"
            :class="[
              'rounded-md px-3 py-1.5 text-xs font-semibold transition',
              locale === item.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            ]"
            @click="setLocale(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="hidden text-right sm:block">
          <p class="text-sm font-semibold text-slate-800">{{ user?.name }}</p>
          <p class="text-xs uppercase tracking-wide text-slate-500">{{ t(String(user?.role ?? '-')) }}</p>
        </div>
        <button type="button" class="btn-secondary px-3 sm:px-4" @click="handleLogout">{{ t('Chiqish') }}</button>
      </div>
    </div>

    <div class="border-t border-slate-200 px-4 py-3 lg:hidden">
      <div class="flex gap-2 overflow-x-auto pb-1">
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.to"
          :to="item.to"
          :class="[
            'whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition',
            isActive(item.to) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
          ]"
        >
          {{ item.label }}
        </NuxtLink>
      </div>

      <div v-if="manualNavigation.length" class="mt-3">
        <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t("Qo'lda kiritish") }}</p>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <NuxtLink
            v-for="item in manualNavigation"
            :key="item.to"
            :to="item.to"
            :class="[
              'whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition',
              isActive(item.to) ? 'bg-brand-600 text-white' : 'bg-amber-100 text-amber-900'
            ]"
          >
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>
