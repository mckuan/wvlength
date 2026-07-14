// standalone summary stats block — shows min/max/mean/median/sd/count for the selected columns
import { useState, useEffect } from "react"
import { getSummary } from "../../lib/datasets"
import { FIELD_BORDER, TEXT_MUTED, TEXT_STRONG } from "../../lib/chartColors"

interface ColumnSummary {
  min: number
  max: number
  mean: number
  median: number
  sd: number
  count: number
}

interface Props {
  preview: Record<string, unknown>[]
  yColumns: string[]
  columns: { name: string; type: string }[]
}

export default function SummaryPanel({ preview, yColumns, columns }: Props) {
  const [summary, setSummary] = useState<Record<string, ColumnSummary> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numericYColumns = yColumns.filter(col =>
    columns.find(c => c.name === col && (c.type.includes("int") || c.type.includes("float")))
  )

  useEffect(() => {
    if (numericYColumns.length === 0) {
      setSummary(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getSummary(preview, numericYColumns)
      .then(result => { if (!cancelled) setSummary(result) })
      .catch(() => { if (!cancelled) setError("Couldn't load the summary.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [preview, yColumns])

  return (
    <div className="rounded-xl p-4" style={{ border: `1px solid ${FIELD_BORDER}` }}>
      <div className="text-xs mb-3" style={{ color: TEXT_MUTED }}>Summary</div>

      {loading && <p className="text-sm" style={{ color: TEXT_MUTED }}>Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && numericYColumns.length === 0 && (
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Pick a numeric column to see its summary.</p>
      )}

      {summary && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium" style={{ color: TEXT_MUTED }}>Column</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Count</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Min</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Max</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Mean</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Median</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: TEXT_MUTED }}>Std dev</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([col, stats], i) => (
                <tr key={col} style={{ background: i % 2 === 0 ? "#fff" : "#F7F4F3" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: TEXT_STRONG }}>{col}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.count}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.min}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.max}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.mean}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.median}</td>
                  <td className="px-3 py-2 text-right" style={{ color: TEXT_STRONG }}>{stats.sd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}