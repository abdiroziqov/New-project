import type { UserRole } from './auth'

export interface UserRecord {
  id: string
  name: string
  username: string
  role: UserRole
  email: string
  status: 'active' | 'inactive'
}
