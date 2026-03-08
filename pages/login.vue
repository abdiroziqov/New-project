<script setup lang="ts">
definePageMeta({
  layout: false
})

const { login, isAuthenticated } = useAuth()
const { t } = useUiLocale()

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  loading.value = true

  const result = await login(form.username, form.password)

  if (!result.ok) {
    errorMessage.value = result.error
    loading.value = false
    return
  }

  loading.value = false
  await navigateTo('/dashboard')
}

watch(
  isAuthenticated,
  async (value) => {
    if (value) {
      await navigateTo('/dashboard')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_48%,_#e2e8f0)] text-slate-900">
    <section class="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 lg:px-8 lg:py-12">
      <section class="panel w-full max-w-md rounded-[2rem] p-8 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.45)]">
        <p class="text-xs font-semibold uppercase tracking-[0.34em] text-brand-600">{{ t('Tizimga kirish') }}</p>
        <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950">{{ t('Boshqaruv paneli') }}</h1>
        <p class="mt-2 text-sm leading-7 text-slate-500">
          {{ t("Ichki CRM ma'lumotlari tashqi foydalanuvchilarga ko'rinmaydi. Tizimga faqat login orqali kiriladi.") }}
        </p>

        <form class="mt-8 space-y-4" @submit.prevent="handleSubmit">
          <AppInput v-model="form.username" label="Login" placeholder="Login kiriting" autocomplete="username" required />
          <AppInput
            v-model="form.password"
            label="Parol"
            type="password"
            placeholder="Parol kiriting"
            autocomplete="current-password"
            required
          />

          <p v-if="errorMessage" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {{ errorMessage }}
          </p>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? t('Kirilmoqda...') : t('Kirish') }}
          </button>
        </form>

        <NuxtLink to="/" class="mt-5 inline-flex text-sm font-semibold text-brand-700 transition hover:text-brand-800">
          {{ t("Orqaga qaytish") }}
        </NuxtLink>
      </section>
    </section>
  </div>
</template>
