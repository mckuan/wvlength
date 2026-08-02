import { useState } from "react"
import type { FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const PANEL_BG     = "#F7F4F3"
const FIELD_BORDER = "#E8EFF4"
const FIELD_BG     = "#FFFFFF"
const TEXT_MUTED   = "#5F7B94"
const TEXT_STRONG  = "#324E66"
const ACCENT       = "#5F7B94"

export default function SignUpPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setSubmitting(true)
    try {
      await register(email, password)
      navigate("/workspace")
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Sign up failed — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center" style={{ background: PANEL_BG }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "#fff", border: `1px solid ${FIELD_BORDER}` }}
      >
        <h1 className="text-lg font-semibold mb-1" style={{ color: TEXT_STRONG }}>Create an account</h1>
        <p className="text-xs mb-6" style={{ color: TEXT_MUTED }}>Save charts to your workspace.</p>

        <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm mb-4"
          style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
        />

        <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm mb-4"
          style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
        />

        {error && (
          <p className="text-xs mb-4" style={{ color: "#C24444" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-sm rounded-md py-2 mb-4"
          style={{ color: "#fff", background: ACCENT, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-xs text-center" style={{ color: TEXT_MUTED }}>
          Already have an account?{" "}
          <Link to="/sign-in" style={{ color: ACCENT }}>Sign in</Link>
        </p>
      </form>
    </div>
  )
}