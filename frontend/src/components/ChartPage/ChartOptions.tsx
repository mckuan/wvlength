// settings panel for chart options like axis limits, color modes, etc.
// settings panel for chart options like axis limits, color modes, etc.
import { useState, useEffect } from "react"
import { getSummary } from "../../lib/datasets"
import { FIELD_BORDER, FIELD_BG, TEXT_MUTED, TEXT_STRONG, ACCENT, ACCENT_TEXT } from "../../lib/chartColors"

export interface AxisConfig {
  yMin: string
  yMax: string
  yTickInterval: string
  binSize: string
  scaleMin: string
  scaleMax: string
}

interface ColumnSummary {
  min: number
  max: number
  mean: number
  median: number
  sd: number
  count: number
}

interface Props {
  chartType: string
  axisConfig: AxisConfig
  xIsNumeric: boolean
  columns: { name: string; type: string }[]
  preview: Record<string, unknown>[]
  yColumns: string[]
  onAxisChange: (config: AxisConfig) => void
}

const TABS = ["Axes", "Summary"]

// which axis fields apply per chart type, and what the Axes tab is called for that type
const AXIS_PANELS: Record<string, { label: string; fields: (keyof AxisConfig)[] }> = {
  bar:       { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval", "binSize"] },
  line:      { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  scatter:   { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  histogram: { label: "Bucket settings",  fields: ["binSize"] },
  boxplot:   { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  heatmap:   { label: "Color scale",      fields: ["scaleMin", "scaleMax"] },
}

const FIELD_LABELS: Record<keyof AxisConfig, string> = {
  yMin: "Y min",
  yMax: "Y max",
  yTickInterval: "Y tick interval",
  binSize: "Bin size",
  scaleMin: "Scale min",
  scaleMax: "Scale max",
}

export default function ChartOptions({
  chartType,
  axisConfig,
  columns,
  preview,
  yColumns,
  onAxisChange,
}: Props) {
  const [activeTab, setActiveTab] = useState("Axes")
  const [summary, setSummary] = useState<Record<string, ColumnSummary> | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const numericColumns = yColumns.filter(col =>
    columns.find(c => c.name === col && (c.type.includes("int") || c.type.includes("float")))
  )

  const panel = AXIS_PANELS[chartType] ?? AXIS_PANELS.bar

  // load summary when tab is opened, or when the underlying selection/data changes while it's open
  useEffect(() => {
    if (activeTab !== "Summary") return
    if (numericColumns.length === 0) {
      setSummary(null)
      return
    }

    const run = async () => {
      setLoadingSummary(true)
      setSummaryError(null)
      try {
        const result = await getSummary(preview, numericColumns)
        setSummary(result)
      } catch {
        setSummaryError("Couldn't load the summary. Check your backend is running.")
      } finally {
        setLoadingSummary(false)
      }
    }
    run()
  }, [activeTab, yColumns, preview])

  function update(field: keyof AxisConfig, value: string) {
    onAxisChange({ ...axisConfig, [field]: value })
  }

  return (
    <div className="rounded-xl p-4 mt-4" style={{ border: `1px solid ${FIELD_BORDER}` }}>
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-full text-sm transition-colors"
            style={
              activeTab === tab
                ? { background: ACCENT, color: ACCENT_TEXT, border: `1px solid ${ACCENT}` }
                : { color: TEXT_MUTED, border: `1px solid ${FIELD_BORDER}` }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Axes" && (
        <div>
          <div className="text-xs mb-2" style={{ color: TEXT_MUTED }}>{panel.label}</div>
          <div className="flex flex-wrap gap-4">
            {panel.fields.map(field => (
              <div key={field}>
                <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>{FIELD_LABELS[field]}</label>
                <input
                  type="number"
                  value={axisConfig[field]}
                  onChange={e => update(field, e.target.value)}
                  placeholder="auto"
                  className="rounded-lg px-3 py-1.5 text-sm w-24"
                  style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Summary" && (
        <div>
          {loadingSummary && <p className="text-sm" style={{ color: TEXT_MUTED }}>Loading summary…</p>}
          {summaryError && <p className="text-red-400 text-sm">{summaryError}</p>}
          {!loadingSummary && !summaryError && numericColumns.length === 0 && (
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
      )}
    </div>
  )
}