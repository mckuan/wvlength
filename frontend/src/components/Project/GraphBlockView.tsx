// components/Project/GraphBlockView.tsx
import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import type { GraphBlockData } from "../../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"
const PANEL_BG   = "#F7F4F3"

interface GraphBlockViewProps {
  block: GraphBlockData
  onConfigure: () => void
  onRemove: () => void
  onRename: (name: string) => void
}

// Graph blocks are snapshots — a captured PNG + stats, not a live editable
// chart. An unconfigured block (no image_url yet) shows the setup prompt;
// once captured, it's a static image plus a small stats table. There's no
// "edit in place" for the chart itself — removing and adding a new graph
// block is the intended way to change one — but the name stays editable.
export default function GraphBlockView({ block, onConfigure, onRemove, onRename }: GraphBlockViewProps) {
  const isConfigured = Boolean(block.image_url)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  // the image endpoint requires auth, and a plain <img src> can't attach a
  // bearer token — so fetch it through the api instance as a blob and point
  // the <img> at an object URL instead
  useEffect(() => {
    if (!block.image_url) return
    let objectUrl: string | null = null
    let cancelled = false

    api
      .get(block.image_url, { responseType: "blob" })
      .then(res => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data)
        setImgSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setImgError(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [block.image_url])

  return (
    <div className="group relative">
      {isConfigured && (
        <input
          value={block.name ?? ""}
          onChange={e => onRename(e.target.value)}
          placeholder="Untitled graph"
          className="w-full outline-none bg-transparent mb-1.5 text-sm font-medium"
          style={{ color: NAVY, border: "none" }}
        />
      )}
      {isConfigured ? (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {imgError ? (
            <div
              className="flex items-center justify-center"
              style={{ minHeight: 160, background: PANEL_BG, color: TEXT_MUTED, fontSize: 12 }}
            >
              Couldn't load this chart image.
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={block.chart_type ? `${block.chart_type} chart` : "Saved chart"}
              className="w-full block"
              style={{ background: "#fff" }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ minHeight: 160, background: PANEL_BG, color: TEXT_MUTED, fontSize: 12 }}
            >
              Loading…
            </div>
          )}
          {block.stats && Object.keys(block.stats).length > 0 && (
            <div className="p-3" style={{ background: PANEL_BG, borderTop: `1px solid ${BORDER}` }}>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {Object.entries(block.stats).map(([col, s]) => (
                  <div key={col}>
                    <p className="text-xs font-medium mb-0.5" style={{ color: NAVY }}>{col}</p>
                    <p className="text-xs" style={{ color: TEXT_MUTED }}>
                      mean {s.mean} · median {s.median} · sd {s.sd} · min {s.min} · max {s.max}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onConfigure}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl transition-colors"
          style={{
            minHeight: 160,
            border: `1.5px dashed ${BORDER}`,
            background: PANEL_BG,
            cursor: "pointer",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#9DB6C9")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <ChartGlyph />
          <span className="text-sm font-medium" style={{ color: NAVY }}>Set up this graph</span>
          <span className="text-xs" style={{ color: TEXT_MUTED }}>Choose a dataset and chart type</span>
        </button>
      )}
      <button
        onClick={onRemove}
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          top: 8, right: -28, color: TEXT_MUTED, background: "none", border: "none",
          cursor: "pointer", fontSize: 12,
        }}
        aria-label="Remove block"
      >
        ✕
      </button>
    </div>
  )
}

function ChartGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
      <path d="M2 14V2M2 14H14" stroke="#9DB6C9" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4" y="9" width="2" height="5" fill="#9DB6C9" />
      <rect x="7.5" y="6" width="2" height="8" fill="#9DB6C9" />
      <rect x="11" y="3" width="2" height="11" fill="#9DB6C9" />
    </svg>
  )
}