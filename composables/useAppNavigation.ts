import type { UserRole } from '~/types/auth'

export type NavigationIcon =
  | 'dashboard'
  | 'quick-entry'
  | 'manual-entry'
  | 'production'
  | 'raw-materials'
  | 'inventory'
  | 'sales'
  | 'debtors'
  | 'expenses'
  | 'reports'
  | 'clients'

export interface NavigationItem {
  label: string
  to: string
  icon: NavigationIcon
  roles: UserRole[]
  group: 'main' | 'manual'
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/', icon: 'dashboard', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Kunlik Hisob', to: '/production', icon: 'production', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Tosh Kirimi', to: '/raw-materials', icon: 'raw-materials', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Ostatka', to: '/inventory', icon: 'inventory', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Sotuvlar', to: '/sales', icon: 'sales', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Qarzdorlar', to: '/debtors', icon: 'debtors', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Chiqimlar', to: '/expenses', icon: 'expenses', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Hisobotlar', to: '/reports', icon: 'reports', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Klientlar', to: '/users', icon: 'clients', roles: ['admin', 'manager', 'operator'], group: 'main' },
  { label: 'Tez Kiritish', to: '/quick-entry', icon: 'quick-entry', roles: ['admin'], group: 'manual' },
  { label: 'Pul Kiritish', to: '/manual-entry', icon: 'manual-entry', roles: ['admin'], group: 'manual' }
]

const titleMap = navigationItems.reduce<Record<string, string>>((map, item) => {
  map[item.to] = item.label
  return map
}, {})

export const useAppNavigation = () => {
  const { user } = useAuth()
  const { t } = useUiLocale()

  const filteredNavigation = computed(() => {
    const currentRole = user.value?.role

    if (!currentRole) {
      return []
    }

    return navigationItems
      .filter((item) => item.roles.includes(currentRole))
      .map((item) => ({
        ...item,
        label: t(item.label)
      }))
  })

  const mainNavigation = computed(() => filteredNavigation.value.filter((item) => item.group === 'main'))
  const manualNavigation = computed(() => filteredNavigation.value.filter((item) => item.group === 'manual'))

  const getPageTitle = (path: string) => t(titleMap[path] ?? 'Ming Bir Hazina')

  return {
    filteredNavigation,
    mainNavigation,
    manualNavigation,
    getPageTitle
  }
}
