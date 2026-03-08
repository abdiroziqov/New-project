<script setup lang="ts">
definePageMeta({
  layout: false
})

const { isAuthenticated } = useAuth()
const { t } = useUiLocale()
const runtimeConfig = useRuntimeConfig()

const products = [
  {
    title: 'Qum',
    text: "Qoplik va rasipnoy ko'rinishida ishlab chiqariladi. Kunlik yuk chiqimi va balans nazorat qilinadi."
  },
  {
    title: 'Mel',
    text: "Mel mahsuloti qoplik formatda yuritiladi. Narx, klient va qarz bir joyda ko'rinadi."
  },
  {
    title: 'Tosh kirimi',
    text: "Howo va Kamaz orqali kelgan tosh tonna, jami narx va ta'minotchi bo'yicha yoziladi."
  },
  {
    title: 'Hisobot',
    text: "Kunlik, oylik va klient kesimidagi tushum, tannarx va qarzlar bo'yicha hisobot olinadi."
  }
]
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_48%,_#e2e8f0)] text-slate-900">
    <section class="mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-12">
      <div class="flex flex-col justify-center">
        <div class="inline-flex w-fit items-center rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-700 backdrop-blur">
          {{ t('Korxona') }}
        </div>

        <h1 class="mt-6 max-w-4xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
          {{ t(runtimeConfig.public.appName) }}
        </h1>
        <p class="mt-4 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
          {{ t("Qum, mel va tosh kirimini nazorat qiladigan ichki boshqaruv tizimi. Klient, qarzdorlik, ta'minotchi va oylik hisobotlar bitta joyda yuritiladi.") }}
        </p>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <article
            v-for="item in products"
            :key="item.title"
            class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur"
          >
            <p class="text-sm font-bold uppercase tracking-[0.18em] text-brand-700">{{ t(item.title) }}</p>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ t(item.text) }}</p>
          </article>
        </div>
      </div>

      <div class="flex items-center justify-center lg:justify-end">
        <section class="panel w-full max-w-md rounded-[2rem] p-8 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.45)]">
          <p class="text-xs font-semibold uppercase tracking-[0.34em] text-brand-600">{{ t('Tizim') }}</p>
          <h2 class="mt-4 text-3xl font-black tracking-tight text-slate-950">{{ t('Ichki boshqaruv paneli') }}</h2>
          <p class="mt-2 text-sm leading-7 text-slate-500">
            {{ t("Tizimga kirish alohida login sahifasi orqali amalga oshiriladi. Ichki ma'lumotlar public sahifada ko'rinmaydi.") }}
          </p>

          <div class="mt-8 space-y-3">
            <NuxtLink to="/login" class="btn-primary flex w-full items-center justify-center">
              {{ t('Login sahifasiga o\'tish') }}
            </NuxtLink>
            <NuxtLink
              v-if="isAuthenticated"
              to="/dashboard"
              class="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              {{ t("Dashboardga o'tish") }}
            </NuxtLink>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
