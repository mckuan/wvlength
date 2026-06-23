import { useState, useEffect } from "react"
import axios from "axios"

interface Column {
  name: string
  type: string
}

interface Props {
  fileId: string
  columns: Column[]
  preview: Record<string, unknown>[]
  onTransform: (dataset: object) => void
}

const AGGS = ["mean", "sum", "median", "min", "max", "count"]
const STRING_AGGS = ["first", "last", "majority"]

function isNumeric(col: Column) {
  return col.type.includes("int") || col.type.includes("float")
}

function detectCoordColumns(columns: Column[], preview: Record<string, unknown>[]): string[] {
  return columns
    .filter(col => col.type === "object")
    .filter(col => {
      const sample = preview.slice(0, 10).map(row => String(row[col.name] ?? ""))
      return sample.some(val => /^[\(\[]?-?\d+\.?\d*,\s*-?\d+\.?\d*/.test(val.trim()))
    })
    .map(col => col.name)
}

export default function DataTransforms({ fileId, columns, preview, onTransform }: Props) {
  const numericCols = columns.filter(isNumeric)
  const coordCols = detectCoordColumns(columns, preview)

  // string cols excludes the groupBy col — computed after groupBy state is defined
  const [groupBy, setGroupBy] = useState(columns[0]?.name ?? "")
  const stringCols = columns.filter(c => !isNumeric(c) && c.name !== groupBy)

  // group & aggregate
  const [aggOpen, setAggOpen] = useState(false)
  const [aggPerCol, setAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(numericCols.map(c => [c.name, "mean"]))
  )
  const [strAggPerCol, setStrAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(stringCols.map(c => [c.name, "first"]))
  )
  const [aggLoading, setAggLoading] = useState(false)
  const [aggError, setAggError] = useState<string | null>(null)
  const [aggApplied, setAggApplied] = useState(false)

  // split coordinates
  const [splitOpen, setSplitOpen] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(coordCols)
  const [splitLoading, setSplitLoading] = useState(false)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitApplied, setSplitApplied] = useState(false)

  // keep selectedCols in sync if columns prop changes
  useEffect(() => {
    setSelectedCols(detectCoordColumns(columns, preview))
  }, [columns])

  // when groupBy changes, remove it from strAggPerCol if present
  useEffect(() => {
    setStrAggPerCol(
      Object.fromEntries(
        columns.filter(c => !isNumeric(c) && c.name !== groupBy).map(c => [c.name, "first"])
      )
    )
  }, [groupBy, columns])

  const setAll = (agg: string) => {
    setAggPerCol(Object.fromEntries(numericCols.map(c => [c.name, agg])))
    setAggApplied(false)
  }

  const setOne = (col: string, agg: string) => {
    setAggPerCol(prev => ({ ...prev, [col]: agg }))
    setAggApplied(false)
  }

  const setOneStr = (col: string, agg: string) => {
    setStrAggPerCol(prev => ({ ...prev, [col]: agg }))
    setAggApplied(false)
  }

  const handleAggregate = async () => {
  setAggLoading(true)
  setAggError(null)
  try {
    const res = await axios.post("http://localhost:8000/transforms/aggregate_multi", {
      file_id: fileId,
      group_by: groupBy,
      aggregations: { ...aggPerCol, ...strAggPerCol },
    })
    const newPreview = res.data.data
    const newColumns = Object.keys(newPreview[0]).map(name => ({
      name,
      type: numericCols.find(c => c.name === name) ? "float64" : "object"
    }))
    onTransform({ file_id: fileId, columns: newColumns, preview: newPreview, rows: newPreview.length })
    setAggApplied(true)
  } catch (err: unknown) {         // ← change catch {} to this
    if (axios.isAxiosError(err)) {
      console.log("STATUS:", err.response?.status)
      console.log("DETAIL:", JSON.stringify(err.response?.data))
    }
    setAggError("Aggregation failed — check the backend.")
  } finally {
    setAggLoading(false)
  }
}
  const handleAggReset = () => {
    setAggApplied(false)
    setAggPerCol(Object.fromEntries(numericCols.map(c => [c.name, "mean"])))
    setStrAggPerCol(Object.fromEntries(stringCols.map(c => [c.name, "first"])))
  }

  const handleSplit = async () => {
    setSplitLoading(true)
    setSplitError(null)
    try {
      const res = await axios.post("http://localhost:8000/transforms/split_coordinates", {
        file_id: fileId,
        columns: selectedCols,
      })
      onTransform({
        file_id: res.data.file_id,
        columns: res.data.columns,
        preview: res.data.preview,
        rows: res.data.rows,
      })
      setSplitApplied(true)
    } catch {
      setSplitError("Split failed — check the backend.")
    } finally {
      setSplitLoading(false)
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Data transforms
      </h3>

      <div className="space-y-3">

        {/* ── Group & aggregate ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setAggOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              Group & aggregate
              {aggApplied && (
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">applied</span>
              )}
            </span>
            <span className="text-gray-400">{aggOpen ? "▲" : "▼"}</span>
          </button>

          {aggOpen && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="mt-4 mb-4">
                <label className="block text-xs text-gray-500 mb-1">Group by</label>
                <div className="flex items-center gap-3">
                  <select
                    value={groupBy}
                    onChange={e => { setGroupBy(e.target.value); setAggApplied(false) }}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    {columns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">→ one row per unique value</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg flex-wrap">
                <span className="text-xs text-gray-500 mr-1">Apply to all numeric:</span>
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
                  {stringCols.map(col => (
                    <tr key={col.name} className="border-t border-gray-100">
                      <td className="py-2 pl-1">
                        <span className="text-xs font-medium text-gray-700">{col.name}</span>
                        <span className="ml-2 text-xs text-gray-400 font-mono">string</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1.5 flex-wrap">
                          {STRING_AGGS.map(agg => (
                            <button
                              key={agg}
                              onClick={() => setOneStr(col.name, agg)}
                              className={`text-xs px-3 py-1 rounded-full border transition-colors
                                ${strAggPerCol[col.name] === agg
                                  ? "bg-violet-500 text-white border-violet-500"
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

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAggregate}
                  disabled={aggLoading}
                  className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {aggLoading ? "Running..." : aggApplied ? "Re-run" : "Preview"}
                </button>
                {aggApplied && (
                  <button
                    onClick={handleAggReset}
                    className="px-4 py-1.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    Reset
                  </button>
                )}
                {aggError && <p className="text-red-400 text-xs">{aggError}</p>}
                {aggApplied && !aggError && (
                  <p className="text-xs text-indigo-500">✓ Preview updated above</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Split coordinates ── */}
        {coordCols.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSplitOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                Split coordinates
                {splitApplied && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">applied</span>
                )}
              </span>
              <span className="text-gray-400">{splitOpen ? "▲" : "▼"}</span>
            </button>

            {splitOpen && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mt-3 mb-4">
                  Detected columns with coordinate values like (x, y, z).
                </p>
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2">Coordinate columns</label>
                  <div className="space-y-2">
                    {coordCols.map(col => (
                      <label key={col} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedCols.includes(col)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCols(prev => [...prev, col])
                            } else {
                              setSelectedCols(prev => prev.filter(c => c !== col))
                            }
                            setSplitApplied(false)
                          }}
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSplit}
                    disabled={splitLoading}
                    className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    {splitLoading ? "Splitting..." : splitApplied ? "Re-split" : "Split"}
                  </button>
                  {splitError && <p className="text-red-400 text-xs">{splitError}</p>}
                  {splitApplied && !splitError && (
                    <p className="text-xs text-indigo-500">✓ Preview updated above</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}