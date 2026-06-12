// settings panel for chart options like axis limits, color modes, etc.
import { useState, useEffect } from "react"
import { getSummary } from "../lib/datasets"

export interface AxisConfig {
  yMin: string
  yMax: string
  yTickInterval: string
  binSize: string
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
  axisConfig: AxisConfig
  xIsNumeric: boolean
  columns: { name: string; type: string }[]
  preview: Record<string, unknown>[]
  yColumns: string[]
  onAxisChange: (config: AxisConfig) => void
}

const TABS = ["Axes", "Summary"]

export default function ChartOptions({
  axisConfig,
  xIsNumeric,
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

  // load summary when tab is opened
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
      setSummaryError("Failed to load summary.")
    } finally {
      setLoadingSummary(false)
    }
  }
  run()
}, [activeTab, yColumns])

  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-4">

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors
              ${activeTab === tab
                ? "bg-gray-900 text-white border-gray-900"
                : "text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Axes tab */}
      {activeTab === "Axes" && (
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Min</label>
            <input
              type="number"
              value={axisConfig.yMin}
              onChange={e => onAxisChange({ ...axisConfig, yMin: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Max</label>
            <input
              type="number"
              value={axisConfig.yMax}
              onChange={e => onAxisChange({ ...axisConfig, yMax: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Tick Interval</label>
            <input
              type="number"
              value={axisConfig.yTickInterval}
              onChange={e => onAxisChange({ ...axisConfig, yTickInterval: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          {xIsNumeric && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bin Size</label>
              <input
                type="number"
                value={axisConfig.binSize}
                onChange={e => onAxisChange({ ...axisConfig, binSize: e.target.value })}
                placeholder="auto"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
              />
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {activeTab === "Summary" && (
        <div>
          {loadingSummary && <p className="text-gray-400 text-sm">Loading summary...</p>}
          {summaryError && <p className="text-red-400 text-sm">{summaryError}</p>}
          {summary && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Column</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Count</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Min</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Max</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Mean</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Median</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary).map(([col, stats], i) => (
                    <tr key={col} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-gray-700">{col}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.count}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.min}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.max}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.mean}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.median}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{stats.sd}</td>
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