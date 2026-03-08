<script setup lang="ts">
definePageMeta({
  layout: false
})

const { login } = useAuth()
const { t } = useUiLocale()
const runtimeConfig = useRuntimeConfig()

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
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_45%,_#e2e8f0)] px-4 py-10">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
      <section class="panel w-full max-w-md p-8 shadow-[0_25px_70px_-30px_rgba(15,23,42,0.35)]">
        <p class="text-xs font-semibold uppercase tracking-[0.34em] text-brand-600">{{ t('Korxona') }}</p>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-900">{{ t(runtimeConfig.public.appName) }}</h1>
        <p class="mt-2 text-sm text-slate-500">{{ t('Hisob paneliga kirish uchun login ma`lumotlaringizni kiriting.') }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ t("Faqat ruxsat berilgan foydalanuvchilar uchun.") }}</p>

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
      </section>
    </div>
  </div>
</template>
