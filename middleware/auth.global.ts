export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/', '/login']
  const { isAuthenticated } = useAuth()

  if (publicPaths.includes(to.path)) {
    if (to.path === '/login') {
      if (isAuthenticated.value) {
        return navigateTo('/dashboard')
      }

      return
    }

    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
