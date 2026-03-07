import usersSource from '~/data/mock/users.json'
import type { AuthUser } from '~/types/auth'
import type { UserRecord } from '~/types/user'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const baseUsers = (usersSource as AuthUser[]).map<UserRecord>((user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role,
  email: user.email,
  status: user.status
}))

const buildId = () => `u-${Math.random().toString(36).slice(2, 8)}`

export const useUsers = () => {
  const users = useState<UserRecord[]>('data:users', () => clone(baseUsers))

  const addUser = (payload: Omit<UserRecord, 'id'>) => {
    users.value.unshift({
      ...payload,
      id: buildId()
    })
  }

  const updateUser = (payload: UserRecord) => {
    const index = users.value.findIndex((user) => user.id === payload.id)

    if (index !== -1) {
      users.value[index] = { ...payload }
    }
  }

  const removeUser = (id: string) => {
    users.value = users.value.filter((user) => user.id !== id)
  }

  return {
    users,
    addUser,
    updateUser,
    removeUser
  }
}
