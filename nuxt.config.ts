export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  devtools: { enabled: true },
  typescript: {
    strict: true
  },
  runtimeConfig: {
    public: {
      appName: 'Ming Bir Hazina',
      appSubtitle: 'Oybek va Jamshid zavodlari hisobi'
    }
  },
  app: {
    head: {
      title: 'Ming Bir Hazina',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1'
        },
        {
          name: 'description',
          content: 'Ming Bir Hazina korxonasi uchun Oybek va Jamshid zavodlarining kunlik hisob-kitob tizimi.'
        }
      ]
    }
  }
})
