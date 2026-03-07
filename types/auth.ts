export type UserRole = 'admin' | 'manager' | 'operator'

export interface AuthUser {
  id: string
  name: string
  username: string
  password: string
  role: UserRole
  email: string
  status: 'active' | 'inactive'
}

export interface SessionUser {
  id: string
  name: string
  username: string
  role: UserRole
  email: string
  status: 'active' | 'inactive'
}
