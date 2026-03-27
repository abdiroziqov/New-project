export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth()

  if (user.value?.role === 'admin' && user.value?.username === 'pro') {
    return
  }

  return navigateTo('/dashboard')
})
