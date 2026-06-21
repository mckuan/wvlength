import { useState } from "react"
import axios from "axios"

interface Column {
  name: string
  type: string
}

interface Props {
  fileId: string
  columns: Column[]
  onTransform: (dataset: object) => void
}

const AGGS = ["mean", "sum", "median", "min", "max", "count"]

function isNumeric(col: Column) {
  return col.type.includes("int") || col.type.includes("float")
}

export default function DataTransforms({ fileId, columns, onTransform }: Props) {
  const numericCols = columns.filter(isNumeric)

  const [open, setOpen] = useState(false)
  const [groupBy, setGroupBy] = useState(columns[0]?.name ?? "")
  const [aggPerCol, setAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(numericCols.map(c => [c.name, "mean"]))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const setAll = (agg: string) => {
    setAggPerCol(Object.fromEntries(numericCols.map(c => [c.name, agg])))
    setApplied(false)
  }

  const setOne = (col: string, agg: string) => {
    setAggPerCol(prev => ({ ...prev, [col]: agg }))
    setApplied(false)
  }

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post("http://localhost:8000/transforms/aggregate_multi", {
        file_id: fileId,
        group_by: groupBy,
        aggregations: aggPerCol,
      })
      const newPreview = res.data.data
      const newColumns = [
        { name: groupBy, type: columns.find(c => c.name === groupBy)?.type ?? "object" },
        ...numericCols.map(c => ({ name: c.name, type: "float64" })),
      ]
      onTransform({
        file_id: fileId,
        columns: newColumns,
        preview: newPreview,
        rows: newPreview.length,
      })
      setApplied(true)
    } catch {
      setError("Aggregation failed — check the backend.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setApplied(false)
    setAggPerCol(Object.fromEntries(numericCols.map(c => [c.name, "mean"])))
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Data transforms
      </h3>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            Group & aggregate
            {applied && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                applied
              </span>
            )}
          </span>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 border-t border-gray-100">

            {/* Group by */}
            <div className="mt-4 mb-4">
              <label className="block text-xs text-gray-500 mb-1">Group by</label>
              <div className="flex items-center gap-3">
                <select
                  value={groupBy}
                  onChange={e => { setGroupBy(e.target.value); setApplied(false) }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                >
                  {columns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">→ one row per unique value</span>
              </div>
            </div>

            {/* Apply to all */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg flex-wrap">
              <span className="text-xs text-gray-500 mr-1">Apply to all:</span>
              {AGGS.map(agg => (
                <button
                  key={agg}
                  onClick={() => setAll(agg)}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                >
                  {agg}
                </button>
              ))}
            </div>

            {/* Per-column */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pl-1 w-36">Column</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2">Aggregation</th>
                </tr>
              </thead>
              <tbody>
                {numericCols.map(col => (
                  <tr key={col.name} className="border-t border-gray-100">
                    <td className="py-2 pl-1">
                      <span className="text-xs font-medium text-gray-700">{col.name}</span>
                      <span className="ml-2 text-xs text-gray-400 font-mono">{col.type}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {AGGS.map(agg => (
                          <button
                            key={agg}
                            onClick={() => setOne(col.name, agg)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors
                              ${aggPerCol[col.name] === agg
                                ? "bg-indigo-500 text-white border-indigo-500"
                                : "border-gray-200 text-gray-500 hover:border-gray-400"
                              }`}
                          >
                            {agg}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {loading ? "Running..." : applied ? "Re-run preview" : "Preview"}
              </button>
              {applied && (
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Reset
                </button>
              )}
              {error && <p className="text-red-400 text-xs">{error}</p>}
              {applied && !error && (
                <p className="text-xs text-indigo-500">✓ Preview updated above</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}