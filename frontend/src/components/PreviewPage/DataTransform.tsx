import { useState, useEffect, useRef } from "react"
import axios from "axios"

interface Column {
  name: string
  type: string
}

interface Dataset {
  file_id: string
  columns: Column[]
  preview: Record<string, unknown>[]
  rows: number
}

interface Props {
  fileId: string
  columns: Column[]
  preview: Record<string, unknown>[]
  onTransform: (dataset: object) => void
  onContinue?: () => void
}

const AGGS = ["mean", "sum", "median", "min", "max", "count"]
const STRING_AGGS = ["first", "last", "majority"]

// ── Palette (Business Blue) ───────────────────────────────────────────────────
// bg cream:  #F7F4F3
// panel:     #E8EFF4
// accent lt: #9DB6C9
// accent:    #5F7B94
// ink/dark:  #324E66

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

type StepId = "nulls" | "split" | "aggregate" | "preview"

interface StepMeta {
  id: StepId
  index: number
  label: string
}

const STEP_ORDER: StepMeta[] = [
  { id: "nulls", index: 1, label: "Clean nulls" },
  { id: "split", index: 2, label: "Split coordinates" },
  { id: "aggregate", index: 3, label: "Group & aggregate" },
  { id: "preview", index: 4, label: "Preview & continue" },
]

// ── Step shell ────────────────────────────────────────────────────────────────

function Step({
  meta,
  status,
  summary,
  children,
}: {
  meta: StepMeta
  status: "done" | "active" | "upcoming" | "skipped"
  summary?: React.ReactNode
  children?: React.ReactNode
}) {
  const isActive = status === "active"
  const isDone = status === "done"
  const isSkipped = status === "skipped"

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors"
          style={{
            background: isDone ? "#5F7B94" : isActive ? "#324E66" : "transparent",
            color: isDone || isActive ? "#F7F4F3" : "#9DB6C9",
            border: isDone || isActive ? "none" : "1.5px solid #9DB6C9",
          }}
        >
          {isDone ? "✓" : meta.index}
        </div>
        <span
          className="font-semibold text-[15px]"
          style={{ color: isActive ? "#324E66" : isDone ? "#324E66" : "#9DB6C9" }}
        >
          {meta.label}
        </span>
        {isDone && !isSkipped && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
            style={{ background: "#E8EFF4", color: "#5F7B94" }}
          >
            applied
          </span>
        )}
        {isSkipped && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
            style={{ background: "#F7F4F3", color: "#9DB6C9" }}
          >
            skipped
          </span>
        )}
      </div>

      {isDone && summary && (
        <div className="ml-9 mt-1.5 text-xs" style={{ color: "#5F7B94" }}>
          {summary}
        </div>
      )}

      {isActive && children && (
        <div className="ml-9 mt-3 flex flex-col gap-3">{children}</div>
      )}

      {meta.index < 4 && (
        <div className="ml-3 my-3 h-6 w-px" style={{ background: "#E8EFF4" }} />
      )}
    </div>
  )
}

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({ label, active, activeStyle, onClick }: {
  label: string
  active: boolean
  activeStyle?: React.CSSProperties
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={
        active
          ? { background: "#5F7B94", color: "#F7F4F3", borderColor: "#5F7B94", ...activeStyle }
          : { borderColor: "#E8EFF4", color: "#5F7B94", background: "transparent" }
      }
    >
      {label}
    </button>
  )
}

// ── Action row ────────────────────────────────────────────────────────────────

function ActionRow({ onApply, onSkip, loading, error, applyLabel }: {
  onApply: () => void
  onSkip: () => void
  loading: boolean
  error: string | null
  applyLabel: string
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={onApply}
        disabled={loading}
        className="px-4 py-1.5 text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
        style={{ background: "#324E66", color: "#F7F4F3" }}
      >
        {loading ? "Running..." : applyLabel}
      </button>
      <button
        onClick={onSkip}
        className="text-xs underline underline-offset-2"
        style={{ color: "#9DB6C9" }}
      >
        skip
      </button>
      {error && <p className="text-xs" style={{ color: "#b45f5f" }}>{error}</p>}
    </div>
  )
}

function ColRow({ name, type, children }: { name: string; type: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: "#324E66" }}>{name}</span>
        <span className="text-xs font-mono" style={{ color: "#9DB6C9" }}>{type}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// ── Null cleaner types ───────────────────────────────────────────────────────

interface NullInfo {
  column: string
  null_count: number
  total: number
  is_numeric: boolean
}

interface FillSpec {
  strategy: "drop" | "mean" | "median" | "mode" | "ffill" | "bfill" | "interpolate" | "fill" | "ignore"
  value?: string
}

const NULL_STRATEGIES: FillSpec["strategy"][] = ["ignore", "drop", "ffill", "bfill", "mode", "mean", "median", "interpolate", "fill"]

// ── Main component ────────────────────────────────────────────────────────────

export default function DataTransforms({ fileId, columns, preview, onTransform, onContinue }: Props) {
  // Keep the ORIGINAL dataset around so "start over" can truly reset everything.
  const originalRef = useRef<Dataset>({ file_id: fileId, columns, preview, rows: preview.length })

  const [currentStep, setCurrentStep] = useState<StepId>("nulls")
  const [stepStatus, setStepStatus] = useState<Record<StepId, "done" | "active" | "upcoming" | "skipped">>({
    nulls: "active",
    split: "upcoming",
    aggregate: "upcoming",
    preview: "upcoming",
  })
  const [summaries, setSummaries] = useState<Record<StepId, React.ReactNode>>({
    nulls: null, split: null, aggregate: null, preview: null,
  })

  const goTo = (step: StepId, prevStatus: "done" | "skipped", summary?: React.ReactNode) => {
    setStepStatus(prev => ({ ...prev, [currentStep]: prevStatus }))
    if (summary !== undefined) {
      setSummaries(prev => ({ ...prev, [currentStep]: summary }))
    }
    const idx = STEP_ORDER.findIndex(s => s.id === step)
    setStepStatus(prev => {
      const next = { ...prev, [currentStep]: prevStatus }
      next[step] = "active"
      return next
    })
    setCurrentStep(step)
  }

  // ── Null cleaner state ──
  const [nulls, setNulls] = useState<NullInfo[]>([])
  const [nullsLoading, setNullsLoading] = useState(true)
  const [specs, setSpecs] = useState<Record<string, FillSpec>>({})
  const [nullApplying, setNullApplying] = useState(false)
  const [nullError, setNullError] = useState<string | null>(null)

  useEffect(() => {
    setNullsLoading(true)
    axios.post("http://localhost:8000/transforms/null_info", { file_id: originalRef.current.file_id })
      .then(res => {
        const info: NullInfo[] = res.data.nulls
        setNulls(info)
        setSpecs(Object.fromEntries(info.map(n => [n.column, { strategy: "ignore" as const }])))
        // Auto-skip step 1 if there are no nulls at all.
        if (info.length === 0) {
          setStepStatus(prev => ({ ...prev, nulls: "skipped", split: "active" }))
          setCurrentStep("split")
        }
      })
      .catch(() => setNullError("Could not load null info."))
      .finally(() => setNullsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOne = (col: string, strategy: FillSpec["strategy"]) => {
    setSpecs(prev => ({ ...prev, [col]: { ...prev[col], strategy } }))
  }
  const setValue = (col: string, value: string) => {
    setSpecs(prev => ({ ...prev, [col]: { ...prev[col], value } }))
  }

  const handleApplyNulls = async () => {
    setNullApplying(true)
    setNullError(null)
    try {
      const res = await axios.post("http://localhost:8000/transforms/clean_nulls", {
        file_id: originalRef.current.file_id,
        columns: specs,
      })
      onTransform({
        file_id: res.data.file_id,
        columns: res.data.columns,
        preview: res.data.preview,
        rows: res.data.rows,
      })
      const touched = Object.entries(specs).filter(([, s]) => s.strategy !== "ignore")
      const summary = touched.length
        ? touched.map(([col, s]) => `${col} — ${s.strategy}${s.strategy === "fill" && s.value ? ` "${s.value}"` : ""} applied`).join(", ")
        : "No changes made"
      goTo("split", "done", summary)
    } catch (err: unknown) {
      setNullError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Apply failed.") : "Apply failed.")
    } finally {
      setNullApplying(false)
    }
  }

  const handleSkipNulls = () => goTo("split", "skipped")

  // ── Split coordinates state ──
  const coordCols = detectCoordColumns(columns, preview)
  const [selectedCols, setSelectedCols] = useState<string[]>(coordCols)
  const [splitLoading, setSplitLoading] = useState(false)
  const [splitError, setSplitError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedCols(detectCoordColumns(columns, preview))
  }, [columns, preview])

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
      const summary = selectedCols.length
        ? selectedCols.map(c => `${c} → x y z`).join(", ")
        : "No columns split"
      goTo("aggregate", "done", summary)
    } catch (err: unknown) {
      setSplitError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Split failed.") : "Split failed.")
    } finally {
      setSplitLoading(false)
    }
  }

  const handleSkipSplit = () => goTo("aggregate", "skipped")

  // ── Group & aggregate state ──
  const numericCols = columns.filter(isNumeric)
  const [groupBy, setGroupBy] = useState(columns[0]?.name ?? "")
  const stringCols = columns.filter(c => !isNumeric(c) && c.name !== groupBy)

  const [aggPerCol, setAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(numericCols.map(c => [c.name, "mean"]))
  )
  const [strAggPerCol, setStrAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(stringCols.map(c => [c.name, "first"]))
  )
  const [aggLoading, setAggLoading] = useState(false)
  const [aggError, setAggError] = useState<string | null>(null)

  useEffect(() => {
    setAggPerCol(Object.fromEntries(columns.filter(isNumeric).map(c => [c.name, "mean"])))
    setStrAggPerCol(Object.fromEntries(
      columns.filter(c => !isNumeric(c) && c.name !== groupBy).map(c => [c.name, "first"])
    ))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, columns])

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
      const newColumns = Object.keys(newPreview[0]).map(name => {
        const sample = newPreview.map((r: Record<string, unknown>) => r[name]).find((v: unknown) => v != null)
        return { name, type: typeof sample === "number" ? "float64" : "object" }
      })
      onTransform({ file_id: fileId, columns: newColumns, preview: newPreview, rows: newPreview.length })
      goTo("preview", "done", `Grouped by ${groupBy}`)
    } catch (err: unknown) {
      setAggError(axios.isAxiosError(err) ? "Aggregation failed." : "Aggregation failed.")
    } finally {
      setAggLoading(false)
    }
  }

  const handleSkipAggregate = () => goTo("preview", "skipped")

  // ── Reset (back to the very original upload) ──
  const handleReset = () => {
    onTransform(originalRef.current)
    setStepStatus({ nulls: "active", split: "upcoming", aggregate: "upcoming", preview: "upcoming" })
    setSummaries({ nulls: null, split: null, aggregate: null, preview: null })
    setCurrentStep("nulls")
    setNullError(null)
    setSplitError(null)
    setAggError(null)
  }

  const stepMap: Record<StepId, StepMeta> = Object.fromEntries(STEP_ORDER.map(s => [s.id, s])) as Record<StepId, StepMeta>

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#F7F4F3" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span style={{ color: "#9DB6C9" }} className="text-sm">←</span>
        <p className="text-sm font-medium" style={{ color: "#9DB6C9" }}>back</p>
        <p className="ml-auto text-base font-semibold" style={{ color: "#324E66" }}>Before we go on...</p>
      </div>

      {/* Step 1: nulls */}
      <Step
        meta={stepMap.nulls}
        status={stepStatus.nulls}
        summary={summaries.nulls}
      >
        {nullsLoading ? (
          <p className="text-xs" style={{ color: "#9DB6C9" }}>Checking for missing values…</p>
        ) : nulls.length === 0 ? (
          <p className="text-xs" style={{ color: "#9DB6C9" }}>No missing values found.</p>
        ) : (
          <>
            {nulls.map(n => {
              const spec = specs[n.column] ?? { strategy: "ignore" }
              const pct = ((n.null_count / n.total) * 100).toFixed(1)
              return (
                <div key={n.column} className="flex flex-col gap-1.5 pb-2 border-b last:border-0 last:pb-0" style={{ borderColor: "#E8EFF4" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "#324E66" }}>{n.column}</span>
                    <span className="text-xs font-mono" style={{ color: "#9DB6C9" }}>{n.is_numeric ? "numeric" : "string"}</span>
                    <span className="text-xs ml-auto" style={{ color: "#5F7B94" }}>
                      {n.null_count} <span style={{ color: "#9DB6C9" }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NULL_STRATEGIES.map(s => {
                      if ((s === "mean" || s === "median" || s === "interpolate") && !n.is_numeric) return null
                      return <Pill key={s} label={s} active={spec.strategy === s} onClick={() => setOne(n.column, s)} />
                    })}
                    {spec.strategy === "fill" && (
                      <input
                        type="text"
                        placeholder="value"
                        value={spec.value ?? ""}
                        onChange={e => setValue(n.column, e.target.value)}
                        className="text-xs rounded-lg px-2 py-0.5 w-20 border"
                        style={{ borderColor: "#E8EFF4" }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
            <ActionRow onApply={handleApplyNulls} onSkip={handleSkipNulls} loading={nullApplying} error={nullError} applyLabel="Apply" />
          </>
        )}
      </Step>

      {/* Step 2: split coordinates */}
      <Step meta={stepMap.split} status={stepStatus.split} summary={summaries.split}>
        {coordCols.length === 0 ? (
          <p className="text-xs" style={{ color: "#9DB6C9" }}>No coordinate-like columns detected.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {coordCols.map(col => (
                <div key={col} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#324E66" }}>
                    {col} <span className="font-mono" style={{ color: "#9DB6C9" }}>object</span>
                  </span>
                  <Pill
                    label="split → x y z"
                    active={selectedCols.includes(col)}
                    onClick={() =>
                      setSelectedCols(prev =>
                        prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <ActionRow onApply={handleSplit} onSkip={handleSkipSplit} loading={splitLoading} error={splitError} applyLabel="Split" />
          </>
        )}
      </Step>

      {/* Step 3: group & aggregate */}
      <Step meta={stepMap.aggregate} status={stepStatus.aggregate} summary={summaries.aggregate}>
        <div className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: "#5F7B94" }}>Group by</span>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 flex-1 min-w-0 border"
            style={{ borderColor: "#E8EFF4", color: "#324E66" }}
          >
            {columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        {numericCols.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: "#E8EFF4" }}>
            {numericCols.map(col => (
              <ColRow key={col.name} name={col.name} type={col.type}>
                {AGGS.map(agg => (
                  <Pill
                    key={agg} label={agg}
                    active={aggPerCol[col.name] === agg}
                    onClick={() => setAggPerCol(prev => ({ ...prev, [col.name]: agg }))}
                  />
                ))}
              </ColRow>
            ))}
          </div>
        )}

        {stringCols.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: "#E8EFF4" }}>
            {stringCols.map(col => (
              <ColRow key={col.name} name={col.name} type="string">
                {STRING_AGGS.map(agg => (
                  <Pill
                    key={agg} label={agg}
                    active={strAggPerCol[col.name] === agg}
                    activeStyle={{ background: "#324E66", borderColor: "#324E66" }}
                    onClick={() => setStrAggPerCol(prev => ({ ...prev, [col.name]: agg }))}
                  />
                ))}
              </ColRow>
            ))}
          </div>
        )}

        <ActionRow onApply={handleAggregate} onSkip={handleSkipAggregate} loading={aggLoading} error={aggError} applyLabel="Preview" />
      </Step>

      {/* Step 4: preview & continue */}
      <Step meta={stepMap.preview} status={stepStatus.preview}>
        {stepStatus.preview === "active" && (
          <>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E8EFF4" }}>
              <div className="px-3 py-2 text-xs" style={{ background: "#E8EFF4", color: "#324E66" }}>
                {preview.length} rows shown · {columns.length} columns
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead style={{ background: "#F7F4F3" }}>
                    <tr>
                      {columns.map(col => (
                        <th key={col.name} className="px-3 py-1.5 text-left font-medium whitespace-nowrap" style={{ color: "#5F7B94" }}>
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 8).map((row, i) => (
                      <tr key={i}>
                        {columns.map(col => (
                          <td key={col.name} className="px-3 py-1.5 whitespace-nowrap" style={{ color: "#324E66" }}>
                            {String(row[col.name] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleReset}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={{ borderColor: "#9DB6C9", color: "#5F7B94", background: "transparent" }}
              >
                Start over
              </button>
              <button
                onClick={onContinue}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ background: "#324E66", color: "#F7F4F3" }}
              >
                Continue to Analysis →
              </button>
            </div>
          </>
        )}
      </Step>
    </div>
  )
}