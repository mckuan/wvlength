import { useState, useEffect } from "react"
import { getSummary } from "../../lib/datasets"
import { TEXT_MUTED, TEXT_STRONG, FIELD_BORDER } from "../../lib/chartColors"

interface Props {
  preview: Record<string, unknown>[]
  numericColumns: string[]
  selectedColumn?: string
}

const STAT_LABELS: [key: string, label: string][] = [
  ["mean", "Mean"], ["median", "Median"], ["min", "Min"],
  ["max", "Max"], ["sd", "SD"], ["count", "Count"],
]

export default function SummaryPanel({ preview, numericColumns, selectedColumn }: Props) {
  const [col, setCol] = useState(selectedColumn ?? numericColumns[0] ?? "")
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (numericColumns.length > 0 && !numericColumns.includes(col)) {
      setCol(numericColumns[0])
    }
  }, [numericColumns, col])

  useEffect(() => {
    if (!col) return
    let cancelled = false
    setLoading(true)
    getSummary(preview, [col])
      .then(summary => { if (!cancelled) setStats(summary[col] ?? null) })
      .catch(() => { if (!cancelled) setStats(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [col, preview])

  if (numericColumns.length === 0) {
    return <p className="text-xs" style={{ color: TEXT_MUTED }}>No numeric columns to summarize.</p>
  }

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={{ color: TEXT_MUTED }}>Summary</div>
        <select
          value={col}
          onChange={e => setCol(e.target.value)}
          className="text-xs rounded-md px-1.5 py-0.5"
          style={{ border: `1px solid ${FIELD_BORDER}`, color: TEXT_STRONG }}
        >
          {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STAT_LABELS.map(([key, label]) => (
          <div key={key} className="rounded-lg px-2.5 py-2" style={{ background: "#E8EFF4" }}>
            <div className="text-[10px]" style={{ color: TEXT_MUTED }}>{label}</div>
            <div className="text-sm font-medium" style={{ color: TEXT_STRONG }}>
              {loading ? "…" : stats?.[key] ?? "–"}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}