// components/Project/BlockPicker.tsx
import { useEffect, useRef, useState } from "react"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"
const ACCENT     = "#5F7B94"

interface BlockPickerProps {
  onAddText: () => void
  onAddNewGraph: () => void
  onAddPastGraph: () => void
}

// The "+" control a doc uses to insert the next block. Sits inline,
// opens a small menu above/below itself rather than a modal, since
// blocks are added at a specific point in the doc.
export default function BlockPicker({ onAddText, onAddNewGraph, onAddPastGraph }: BlockPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const options = [
    { label: "Text", desc: "Add a note or explanation", action: onAddText, icon: <TextIcon /> },
    { label: "New graph", desc: "Upload data and build a chart", action: onAddNewGraph, icon: <GraphIcon /> },
    { label: "Past graph", desc: "Reuse a chart from another project", action: onAddPastGraph, icon: <HistoryIcon /> },
  ]

  return (
    <div ref={ref} className="relative flex items-center justify-center" style={{ padding: "6px 0" }}>
      <div className="flex-1 h-px" style={{ background: open ? "transparent" : BORDER }} />
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Add block"
        className="flex items-center justify-center rounded-full transition-all"
        style={{
          width: 30,
          height: 30,
          border: `1.5px solid ${open ? NAVY : BORDER}`,
          background: open ? NAVY : "#FFFFFF",
          color: open ? "#FFFFFF" : TEXT_MUTED,
          cursor: "pointer",
          flexShrink: 0,
          margin: "0 10px",
        }}
      >
        <PlusIcon rotated={open} />
      </button>
      <div className="flex-1 h-px" style={{ background: open ? "transparent" : BORDER }} />

      {open && (
        <div
          className="absolute z-10 rounded-xl overflow-hidden"
          style={{
            top: "calc(100% + 8px)",
            width: 280,
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 8px 24px rgba(36, 59, 83, 0.12)",
          }}
        >
          {options.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.action()
                setOpen(false)
              }}
              className="w-full flex items-start gap-3 text-left transition-colors"
              style={{
                padding: "12px 14px",
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : `1px solid ${BORDER}`,
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F7F4F3")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: ACCENT, marginTop: 2 }}>{opt.icon}</span>
              <span>
                <span className="block text-sm font-medium" style={{ color: NAVY }}>{opt.label}</span>
                <span className="block text-xs" style={{ color: TEXT_MUTED }}>{opt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlusIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transform: rotated ? "rotate(45deg)" : "none", transition: "transform 0.15s ease" }}
    >
      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14M2 8H14M2 13H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14V2M2 14H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4" y="9" width="2" height="5" fill="currentColor" />
      <rect x="7.5" y="6" width="2" height="8" fill="currentColor" />
      <rect x="11" y="3" width="2" height="11" fill="currentColor" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.2V8.5L10.2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}