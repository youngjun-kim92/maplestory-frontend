import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { UserResponse } from '../types'

interface AuthContextType {
  user: UserResponse | null
  token: string | null
  isLoading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await authApi.getProfile()
      setUser(res.data)
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
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
