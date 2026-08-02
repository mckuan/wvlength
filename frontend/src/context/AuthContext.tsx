// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { api } from "../lib/api"

interface User {
  id: number
  email: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("wvlength_token")
    if (!token) {
      setLoading(false)
      return
    }
    api.get("/auth/me")
      .then(res => setUser(res.data))
      .catch(() => localStorage.removeItem("wvlength_token"))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password })
    localStorage.setItem("wvlength_token", res.data.access_token)
    const me = await api.get("/auth/me")
    setUser(me.data)
  }

  async function register(email: string, password: string) {
    const res = await api.post("/auth/register", { email, password })
    localStorage.setItem("wvlength_token", res.data.access_token)
    const me = await api.get("/auth/me")
    setUser(me.data)
  }

  function logout() {
    localStorage.removeItem("wvlength_token")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}