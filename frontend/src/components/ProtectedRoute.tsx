// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: "#F7F4F3" }}>
        <p className="text-sm" style={{ color: "#5F7B94" }}>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}