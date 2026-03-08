import { watch } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const { locale } = useUiLocale()
    const storageKey = 'ming-bir-hazina:ui-locale'
    const savedLocale = window.localStorage.getItem(storageKey)

    if (savedLocale === 'latn' || savedLocale === 'cyrl') {
      locale.value = savedLocale
    }

    watch(
      locale,
      (nextLocale) => {
        window.localStorage.setItem(storageKey, nextLocale)
        document.documentElement.lang = nextLocale === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn'
      },
      { immediate: true }
    )
  })
})
