// components/Project/TextBlockView.tsx
import { useRef } from "react"
import type { TextBlockData } from "../../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"

interface TextBlockViewProps {
  block: TextBlockData
  onChange: (content: string) => void
  onRemove: () => void
  readOnly?: boolean
}

export default function TextBlockView({ block, onChange, onRemove, readOnly = false }: TextBlockViewProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="group relative">
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onBlur={readOnly ? undefined : e => onChange(e.currentTarget.textContent ?? "")}
        data-placeholder={readOnly ? "" : "Write something…"}
        className="outline-none text-base leading-relaxed empty-placeholder"
        style={{ color: NAVY, minHeight: 28, whiteSpace: "pre-wrap", cursor: readOnly ? "default" : "text" }}
      >
        {block.content}
      </div>
      {!readOnly && (
        <button
          onClick={onRemove}
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            top: 2, right: -28, color: TEXT_MUTED, background: "none", border: "none",
            cursor: "pointer", fontSize: 12,
          }}
          aria-label="Remove block"
        >
          ✕
        </button>
      )}
      <style>{`
        .empty-placeholder:empty:before {
          content: attr(data-placeholder);
          color: ${TEXT_MUTED};
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}