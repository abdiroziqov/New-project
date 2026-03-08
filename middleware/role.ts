import type { UserRole } from '~/types/auth'

export default defineNuxtRouteMiddleware((to) => {
  const requiredRoles = (to.meta.roles as UserRole[] | undefined) ?? []

  if (!requiredRoles.length) {
    return
  }

  const { user } = useAuth()

  if (!user.value || !requiredRoles.includes(user.value.role)) {
    return navigateTo('/dashboard')
  }
})
