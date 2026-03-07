import usersSource from '~/data/mock/users.json'
import type { AuthUser, SessionUser, UserRole } from '~/types/auth'

const users = usersSource as AuthUser[]

const toSessionUser = (user: AuthUser): SessionUser => ({
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role,
  email: user.email,
  status: user.status
})

export const useAuth = () => {
  const cookie = useCookie<SessionUser | null>('fm_user', {
    default: () => null,
    sameSite: 'lax'
  })

  const user = useState<SessionUser | null>('auth:user', () => cookie.value ?? null)

  const role = computed<UserRole | null>(() => user.value?.role ?? null)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => role.value === 'admin')
  const canEditAccounting = computed(() => isAdmin.value)

  const login = async (username: string, password: string) => {
    const candidate = users.find(
      (entry) =>
        entry.username.toLowerCase() === username.trim().toLowerCase() &&
        entry.password === password &&
        entry.status === 'active'
    )

    if (!candidate) {
      return {
        ok: false as const,
        error: 'Invalid credentials or inactive account.'
      }
    }

    const sessionUser = toSessionUser(candidate)
    user.value = sessionUser
    cookie.value = sessionUser
    return { ok: true as const }
  }

  const logout = () => {
    user.value = null
    cookie.value = null
  }

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user.value) {
      return false
    }

    const roleList = Array.isArray(roles) ? roles : [roles]
    return roleList.includes(user.value.role)
  }

  return {
    user,
    role,
    isAuthenticated,
    isAdmin,
    canEditAccounting,
    login,
    logout,
    hasRole
  }
}
