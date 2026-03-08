<script setup lang="ts">
definePageMeta({
  layout: false
})

const { login } = useAuth()
const { t } = useUiLocale()
const runtimeConfig = useRuntimeConfig()

const form = reactive({
  username: 'admin',
  password: 'admin123'
})

const loading = ref(false)
const errorMessage = ref('')

const demoUsers = [
  { role: 'Admin', username: 'admin', password: 'admin123' },
  { role: 'Manager', username: 'manager', password: 'manager123' },
  { role: 'Operator', username: 'operator1', password: 'operator123' }
]

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
  <div class="min-h-screen bg-gradient-to-br from-sky-100 via-slate-50 to-amber-100 px-4 py-10">
    <div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <section class="panel p-8">
        <p class="text-xs font-semibold uppercase tracking-[0.34em] text-brand-600">{{ t('Korxona') }}</p>
        <h2 class="mt-2 text-3xl font-black tracking-tight text-slate-900">{{ t(runtimeConfig.public.appName) }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t(runtimeConfig.public.appSubtitle) }}</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900">{{ t('Kunlik kirim va sotuv nazorati') }}</h1>
        <p class="mt-3 text-sm text-slate-600">
          {{ t('Ming Bir Hazina korxonasi uchun Oybek va Jamshid zavodlarining kunlik tosh kirimi, chiqimi, sotuvi va foydasini boshqaring.') }}
        </p>

        <div class="mt-8 space-y-3">
          <div v-for="entry in demoUsers" :key="entry.role" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p class="text-sm font-semibold text-slate-800">{{ t(entry.role) }}</p>
            <p class="text-xs text-slate-500">
              {{ entry.username }} / {{ entry.password }}
            </p>
          </div>
        </div>
      </section>

      <section class="panel p-8">
        <h2 class="text-xl font-semibold text-slate-900">{{ t('Tizimga kirish') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('Davom etish uchun test akkauntlardan birini ishlating.') }}</p>

        <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <AppInput v-model="form.username" label="Login" placeholder="Login kiriting" required />
          <AppInput
            v-model="form.password"
            label="Parol"
            type="password"
            placeholder="Parol kiriting"
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
