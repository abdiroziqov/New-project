export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/login']
  const { isAuthenticated } = useAuth()

  if (publicPaths.includes(to.path)) {
    if (isAuthenticated.value) {
      return navigateTo('/')
    }

    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
