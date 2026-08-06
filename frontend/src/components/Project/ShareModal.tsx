// components/Project/ShareModal.tsx
import { useState } from "react"
import { X, Copy, Check } from "lucide-react"
import { api } from "../../lib/api"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"
const ACCENT     = "#5F7B94"

type Permission = "view" | "edit"

interface ShareModalProps {
  projectId: number
  initialToken: string | null
  initialPermission: Permission | null
  onClose: () => void
}

export default function ShareModal({
  projectId,
  initialToken,
  initialPermission,
  onClose,
}: ShareModalProps) {
  const [token, setToken] = useState(initialToken)
  const [permission, setPermission] = useState<Permission>(initialPermission ?? "view")
  const [enabled, setEnabled] = useState(!!initialToken)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const link = token ? `${window.location.origin}/shared/${token}` : ""

  async function enableSharing(perm: Permission) {
    setBusy(true)
    try {
      const { data } = await api.post(`/projects/${projectId}/share`, { permission: perm })
      setToken(data.share_token)
      setPermission(data.share_permission)
      setEnabled(true)
    } finally {
      setBusy(false)
    }
  }

  async function changePermission(perm: Permission) {
    setPermission(perm)
    if (enabled) await enableSharing(perm)
  }

  async function disableSharing() {
    setBusy(true)
    try {
      await api.delete(`/projects/${projectId}/share`)
      setEnabled(false)
      setToken(null)
    } finally {
      setBusy(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(36, 59, 83, 0.35)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl"
        style={{ width: 420, background: "#fff", border: `1px solid ${BORDER}`, padding: 24 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: NAVY, fontWeight: 600, fontSize: 16 }}>Share project</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={18} color={TEXT_MUTED} />
          </button>
        </div>

        {!enabled ? (
          <div>
            <p className="text-sm mb-4" style={{ color: TEXT_MUTED }}>
              Anyone with the link will be able to {permission === "edit" ? "view and edit" : "view"} this
              project — no account required.
            </p>
            <div className="flex gap-2 mb-4">
              {(["view", "edit"] as Permission[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPermission(p)}
                  className="flex-1 rounded-lg text-sm"
                  style={{
                    padding: "8px 0",
                    fontWeight: 500,
                    border: `1px solid ${BORDER}`,
                    background: permission === p ? ACCENT : "transparent",
                    color: permission === p ? "#fff" : NAVY,
                  }}
                >
                  {p === "view" ? "Can view" : "Can edit (text only)"}
                </button>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={() => enableSharing(permission)}
              className="w-full rounded-lg text-sm"
              style={{ padding: "9px 0", fontWeight: 500, background: ACCENT, color: "#fff", border: "none" }}
            >
              Create link
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-3">
              {(["view", "edit"] as Permission[]).map(p => (
                <button
                  key={p}
                  disabled={busy}
                  onClick={() => changePermission(p)}
                  className="flex-1 rounded-lg text-sm"
                  style={{
                    padding: "8px 0",
                    fontWeight: 500,
                    border: `1px solid ${BORDER}`,
                    background: permission === p ? ACCENT : "transparent",
                    color: permission === p ? "#fff" : NAVY,
                  }}
                >
                  {p === "view" ? "Can view" : "Can edit (text only)"}
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-2 rounded-lg mb-3"
              style={{ border: `1px solid ${BORDER}`, padding: "8px 10px" }}
            >
              <span className="text-xs flex-1 truncate" style={{ color: TEXT_MUTED }}>
                {link}
              </span>
              <button onClick={copyLink} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                {copied ? <Check size={15} color={ACCENT} /> : <Copy size={15} color={TEXT_MUTED} />}
              </button>
            </div>

            <button
              disabled={busy}
              onClick={disableSharing}
              className="w-full rounded-lg text-sm"
              style={{
                padding: "9px 0",
                fontWeight: 500,
                background: "transparent",
                color: "#B33",
                border: `1px solid ${BORDER}`,
              }}
            >
              Turn off link sharing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}