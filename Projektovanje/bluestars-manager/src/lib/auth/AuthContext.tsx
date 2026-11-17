import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSession, type Session } from './store'
import { login as apiLogin, logout as apiLogout } from './api'

interface AuthContextValue {
  session: Session | null
  ready: boolean
  isManager: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessionState(getSession())
    setReady(true)
  }, [])

  const login = async (email: string, password: string) => {
    const next = await apiLogin(email, password)
    setSessionState(next)
  }

  const logout = () => {
    apiLogout()
    setSessionState(null)
  }

  const value: AuthContextValue = {
    session,
    ready,
    isManager: session?.role === 'MANAGER',
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
