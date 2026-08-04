// components/Project/PastGraphPicker.tsx
import { useEffect, useRef, useState } from "react"
import { api } from "../../lib/api"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"

export interface PastGraphEntry {
  project_id: number
  project_name: string
  block_id: string
  name?: string
  chart_type?: string
  image_url?: string
  stats?: Record<string, unknown>
  created_at?: number
}

interface PastGraphPickerProps {
  onSelect: (graph: PastGraphEntry) => void
  onClose: () => void
}

// A scrollable list of every configured graph across the user's projects,
// by name — clicking one reuses its stored image/stats via source_project_id
// + source_block_id rather than capturing a new snapshot.
export default function PastGraphPicker({ onSelect, onClose }: PastGraphPickerProps) {
  const [graphs, setGraphs] = useState<PastGraphEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api
      .get("/projects/graphs")
      .then(res => setGraphs(res.data.graphs ?? []))
      .catch(() => setError("Couldn't load past graphs."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-20 rounded-xl overflow-hidden flex flex-col"
      style={{
        top: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 320,
        maxHeight: 340,
        background: "#FFFFFF",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 8px 24px rgba(36, 59, 83, 0.12)",
      }}
    >
      <div
        className="text-xs font-medium"
        style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: NAVY, flexShrink: 0 }}
      >
        Choose a past graph
      </div>
      <div style={{ overflowY: "auto" }}>
        {loading && (
          <p className="text-xs" style={{ padding: 14, color: TEXT_MUTED }}>Loading…</p>
        )}
        {error && (
          <p className="text-xs" style={{ padding: 14, color: "#e24b4a" }}>{error}</p>
        )}
        {!loading && !error && graphs.length === 0 && (
          <p className="text-xs" style={{ padding: 14, color: TEXT_MUTED }}>
            No saved graphs yet — make one first.
          </p>
        )}
        {graphs.map((g, i) => (
          <button
            key={`${g.project_id}-${g.block_id}`}
            onClick={() => onSelect(g)}
            className="w-full text-left transition-colors"
            style={{
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              borderTop: i === 0 ? "none" : `1px solid ${BORDER}`,
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F7F4F3")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="block text-sm" style={{ color: NAVY }}>
              {g.name || "Untitled graph"}
            </span>
            <span className="block text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              {g.project_name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}