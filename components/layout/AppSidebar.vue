<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'

interface Props {
  open: boolean
  desktopOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { user } = useAuth()
const { mainNavigation, manualNavigation } = useAppNavigation()
const { t } = useUiLocale()

const isActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }

  return route.path.startsWith(path)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
    @click="emit('close')"
  />

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform lg:z-20',
      open ? 'translate-x-0' : '-translate-x-full',
      desktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
    ]"
  >
    <div class="border-b border-slate-200 px-4 py-4">
      <NuxtLink to="/dashboard" class="block rounded-xl transition hover:bg-slate-50" @click="emit('close')">
        <p class="text-[10px] font-semibold uppercase tracking-[0.34em] text-brand-600">{{ t('Korxona') }}</p>
        <h2 class="mt-1 text-lg font-black tracking-tight text-slate-900">{{ t(runtimeConfig.public.appName) }}</h2>
        <p class="mt-1 text-xs text-slate-500">{{ t(runtimeConfig.public.appSubtitle) }}</p>
      </NuxtLink>
    </div>

    <nav class="space-y-4 p-3">
      <div class="space-y-1">
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
            isActive(item.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
          ]"
          @click="emit('close')"
        >
          <AppIcon :name="item.icon" class="h-5 w-5 shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>

      <div v-if="manualNavigation.length" class="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {{ t("Qo'lda Kiritish") }}
        </p>

        <NuxtLink
          v-for="item in manualNavigation"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
            isActive(item.to) ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-white'
          ]"
          @click="emit('close')"
        >
          <AppIcon :name="item.icon" class="h-5 w-5 shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <div class="absolute inset-x-0 bottom-0 border-t border-slate-200 p-3 text-xs text-slate-500">
      {{ t('Login') }}: <span class="font-semibold text-slate-700">{{ t(String(user?.role ?? '-')) }}</span>
    </div>
  </aside>
</template>
