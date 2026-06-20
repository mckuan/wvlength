import { useState } from "react"
import axios from "axios"

interface Column {
  name: string
  type: string
}

interface AggregatedRow {
  x: string | number
  y: number
}

interface Props {
  fileId: string
  columns: Column[]
  onTransform: (dataset: object) => void
}

const AGGREGATIONS = ["mean", "sum", "count", "median", "min", "max"]

function isNumeric(col: Column) {
  return col.type.includes("int") || col.type.includes("float")
}

export default function DataTransforms({ fileId, columns, onTransform }: Props) {
  const [groupBy, setGroupBy] = useState(columns[0]?.name ?? "")
  const [valueCol, setValueCol] = useState(columns.find(isNumeric)?.name ?? "")
  const [aggregation, setAggregation] = useState("mean")
  const [aggPreview, setAggPreview] = useState<AggregatedRow[] | null>(null)
  const [aggLoading, setAggLoading] = useState(false)
  const [aggError, setAggError] = useState<string | null>(null)
  const [aggApplied, setAggApplied] = useState(false)
  const [open, setOpen] = useState(false)

  const numericColumns = columns.filter(isNumeric)

  const handlePreview = async () => {
    setAggLoading(true)
    setAggError(null)
    setAggPreview(null)
    try {
      const res = await axios.post("http://localhost:8000/transforms/aggregate", {
        file_id: fileId,
        group_by: groupBy,
        value_col: valueCol,
        aggregation,
      })
      setAggPreview(res.data.data)
    } catch {
      setAggError("Aggregation failed — check the backend.")
    } finally {
      setAggLoading(false)
    }
  }

  const handleApply = () => {
    if (!aggPreview) return
    const newColumns = [
      { name: groupBy, type: columns.find(c => c.name === groupBy)?.type ?? "object" },
      { name: valueCol, type: "float64" },
    ]
    const newPreview = aggPreview.map(row => ({
      [groupBy]: row.x,
      [valueCol]: row.y,
    }))
    onTransform({
      file_id: fileId,
      columns: newColumns,
      preview: newPreview,
      rows: newPreview.length,
    })
    setAggApplied(true)
  }

  const handleReset = () => {
    setAggPreview(null)
    setAggApplied(false)
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
            {aggApplied && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                applied
              </span>
            )}
          </span>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mt-3 mb-4">
              Aggregate rows within each group — e.g. mean per trial.
            </p>

            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Group by</label>
                <select
                  value={groupBy}
                  onChange={e => { setGroupBy(e.target.value); setAggPreview(null); setAggApplied(false) }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                >
                  {columns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Value column</label>
                <select
                  value={valueCol}
                  onChange={e => { setValueCol(e.target.value); setAggPreview(null); setAggApplied(false) }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                >
                  {numericColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Aggregation</label>
                <select
                  value={aggregation}
                  onChange={e => { setAggregation(e.target.value); setAggPreview(null); setAggApplied(false) }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                >
                  {AGGREGATIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handlePreview}
                disabled={aggLoading || !valueCol}
                className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {aggLoading ? "Running..." : "Preview"}
              </button>
              {aggApplied && (
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {aggError && <p className="text-red-400 text-xs mb-3">{aggError}</p>}

            {aggPreview && (
              <>
                <div
                  className="overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 mb-3"
                  style={{ maxHeight: "200px" }}
                >
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">{groupBy}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                          {aggregation}({valueCol})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggPreview.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 text-gray-700">{String(row.x)}</td>
                          <td className="px-3 py-1.5 text-gray-700">{String(row.y)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!aggApplied ? (
                  <button
                    onClick={handleApply}
                    className="px-4 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Apply to chart →
                  </button>
                ) : (
                  <p className="text-xs text-indigo-500">✓ Aggregated data will be used in the chart</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}