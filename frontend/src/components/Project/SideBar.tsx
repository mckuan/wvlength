import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Pencil, Download, UserPlus, type LucideIcon } from "lucide-react"

// --- palette, copied directly from lib/chartColors.ts -------------------
const CHART_COLORS = ["#5F7B94", "#324E66", "#9DB6C9", "#3D5F78", "#7C97AC", "#243A4D"]
const PANEL_BG     = "#F7F4F3"
const FIELD_BORDER = "#E8EFF4"
const FIELD_BG     = "#FFFFFF"
const TEXT_MUTED   = "#5F7B94"
const TEXT_STRONG  = "#324E66"
const ACCENT       = "#5F7B94"
const ACCENT_TEXT  = "#F7F4F3"
// --------------------------------------------------------------------------

export type ViewMode = "page view" | "edit"

function Logo() {
  const navigate = useNavigate()
  // four bars pulled straight from the chart palette, standing in for a waveform
  const heights = [10, 18, 14, 8]
  return (
    <button
      onClick={() => navigate("/workspace")}
      className="flex items-center gap-2"
      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
    >
      <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              background: CHART_COLORS[i],
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19 }}>
        <span style={{ color: TEXT_STRONG, fontWeight: 700 }}>wv</span>
        <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>length</span>
      </span>
    </button>
  )
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const options: { key: ViewMode; label: string; icon: LucideIcon }[] = [
    { key: "page view", label: "Page View", icon: Eye },
    { key: "edit", label: "Edit", icon: Pencil },
  ]
  return (
    <div
      className="flex p-[3px] rounded-lg"
      style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}` }}
    >
      {options.map(({ key, label, icon: Icon }) => {
        const active = mode === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md transition-colors"
            style={{
              padding: "6px 0",
              fontSize: 13,
              fontWeight: 500,
              background: active ? ACCENT : "transparent",
              color: active ? ACCENT_TEXT : TEXT_MUTED,
            }}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function ExportMenu({
  onExportPdf,
  onExportWord,
}: {
  onExportPdf: () => void
  onExportWord: () => void
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="w-full flex items-center gap-2.5 rounded-lg transition-colors"
        style={{
          padding: "9px 10px",
          fontSize: 13.5,
          fontWeight: 500,
          color: TEXT_STRONG,
          background: hover || open ? FIELD_BG : "transparent",
          border: `1px solid ${hover || open ? FIELD_BORDER : "transparent"}`,
        }}
      >
        <Download size={15} strokeWidth={2} color={TEXT_MUTED} />
        Export
      </button>

      {open && (
        <div
          className="absolute z-10 rounded-xl overflow-hidden"
          style={{
            top: "calc(100% + 4px)",
            left: 0,
            width: 200,
            background: "#FFFFFF",
            border: `1px solid ${FIELD_BORDER}`,
            boxShadow: "0 8px 24px rgba(36, 59, 83, 0.12)",
          }}
        >
          {[
            { label: "Download as PDF", action: onExportPdf },
            { label: "Download as Word", action: onExportWord },
          ].map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.action()
                setOpen(false)
              }}
              className="w-full text-left transition-colors"
              style={{
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 500,
                color: TEXT_STRONG,
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : `1px solid ${FIELD_BORDER}`,
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = PANEL_BG)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full flex items-center gap-2.5 rounded-lg transition-colors"
      style={{
        padding: "9px 10px",
        fontSize: 13.5,
        fontWeight: 500,
        color: TEXT_STRONG,
        background: hover ? FIELD_BG : "transparent",
        border: `1px solid ${hover ? FIELD_BORDER : "transparent"}`,
      }}
    >
      <Icon size={15} strokeWidth={2} color={TEXT_MUTED} />
      {label}
    </button>
  )
}

interface SidebarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onExportPdf?: () => void
  onExportWord?: () => void
  onInviteCollaborators?: () => void
}

export default function Sidebar({
  viewMode,
  onViewModeChange,
  onExportPdf = () => {},
  onExportWord = () => {},
  onInviteCollaborators = () => {},
}: SidebarProps) {
  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: 232,
        background: PANEL_BG,
        borderRight: `1px solid ${FIELD_BORDER}`,
        padding: "20px 16px",
      }}
    >
      {/* logo */}
      <div style={{ padding: "4px 4px 24px" }}>
        <Logo />
      </div>

      {/* page view / edit */}
      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

      {/* divider */}
      <div style={{ height: 1, background: FIELD_BORDER, margin: "20px 4px" }} />

      {/* placeholders */}
      <div className="flex flex-col gap-1">
        <ExportMenu onExportPdf={onExportPdf} onExportWord={onExportWord} />
        <SidebarButton icon={UserPlus} label="Invite collaborators" onClick={onInviteCollaborators} />
      </div>
    </div>
  )
}