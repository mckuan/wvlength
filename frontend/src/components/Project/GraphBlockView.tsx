// components/Project/GraphBlockView.tsx
import type { GraphBlockData } from "../../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"
const PANEL_BG   = "#F7F4F3"

interface GraphBlockViewProps {
  block: GraphBlockData
  onConfigure: () => void
  onRemove: () => void
}

// Until wired to the real upload/chart flow, an unconfigured graph block
// renders as an empty-state card inviting the user to set it up.
// Once block.chart_config exists, swap this for the real chart renderer.
export default function GraphBlockView({ block, onConfigure, onRemove }: GraphBlockViewProps) {
  const isConfigured = Boolean(block.chart_config)

  return (
    <div className="group relative">
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
        {isConfigured ? (
          <>
            <span className="text-sm font-medium" style={{ color: NAVY }}>{block.filename}</span>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Chart configured — click to edit</span>
          </>
        ) : (
          <>
            <ChartGlyph />
            <span className="text-sm font-medium" style={{ color: NAVY }}>Set up this graph</span>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Choose a dataset and chart type</span>
          </>
        )}
      </button>
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