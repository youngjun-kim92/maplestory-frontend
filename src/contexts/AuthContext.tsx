import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { ServerProfileResponse, UserResponse } from '../types'

interface AuthContextType {
  user: UserResponse | null
  token: string | null
  isLoading: boolean
  activeServerId: number | null
  activeServer: ServerProfileResponse | null
  serverKey: number
  setActiveServerId: (id: number) => void
  login: (token: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)
  const [activeServerId, setActiveServerIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('activeServerId')
    return saved ? Number(saved) : null
  })
  const [serverKey, setServerKey] = useState(0)

  const activeServer = useMemo<ServerProfileResponse | null>(() => {
    if (!user?.serverProfiles?.length) return null
    if (activeServerId) {
      const found = user.serverProfiles.find((p) => p.id === activeServerId)
      if (found) return found
    }
    return user.serverProfiles[0]
  }, [user, activeServerId])

  const setActiveServerId = (id: number) => {
    localStorage.setItem('activeServerId', String(id))
    setActiveServerIdState(id)
    setServerKey((k) => k + 1)
  }

  const fetchUser = async () => {
    try {
      const res = await authApi.getProfile()
      const userData = res.data
      setUser(userData)

      // activeServerId가 없거나 이 유저의 프로필에 없으면 첫 번째로 초기화
      const saved = localStorage.getItem('activeServerId')
      if (userData.serverProfiles?.length > 0) {
        const savedId = saved ? Number(saved) : null
        const isValid = savedId && userData.serverProfiles.some((p) => p.id === savedId)
        if (!isValid) {
          const firstId = userData.serverProfiles[0].id
          localStorage.setItem('activeServerId', String(firstId))
          setActiveServerIdState(firstId)
        }
      }
    } catch {
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
    }
  }

  useEffect(() => {
    const init = async () => {
      if (token) {
        await fetchUser()
      }
      setIsLoading(false)
    }
    init()
  }, [])

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    await fetchUser()
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('activeServerId')
    setToken(null)
    setUser(null)
    setActiveServerIdState(null)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      activeServerId, activeServer, serverKey, setActiveServerId,
      login, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
