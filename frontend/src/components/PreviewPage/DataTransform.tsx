import { useState, useEffect } from "react"
import { api } from "../../lib/api"
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
  onContinue: () => void
  onReset: () => void
}

const AGGS = ["mean", "sum", "median", "min", "max", "count"]
const STRING_AGGS = ["first", "last", "majority"]
const NULL_STRATEGIES = ["ignore", "drop", "ffill", "bfill", "mode", "mean", "median", "interpolate", "fill"] as const
type NullStrategy = typeof NULL_STRATEGIES[number]

const BLUE = {
  lightest: "#F7F4F3",
  light:    "#E8EFF4",
  mid:      "#9DB6C9",
  dark:     "#5F7B94",
  darkest:  "#324E66",
}

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

// ── Shared pill ───────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "2px 10px",
        borderRadius: 99,
        border: active ? `1.5px solid ${BLUE.darkest}` : `0.5px solid #c5d5e0`,
        background: active ? BLUE.darkest : "transparent",
        color: active ? "#fff" : BLUE.dark,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  )
}

// ── Step shell ────────────────────────────────────────────────────────────────

function StepShell({
  num, title, state, badge, children, onSkip,
}: {
  num: number
  title: string
  state: "done" | "active" | "pending"
  badge?: React.ReactNode
  children?: React.ReactNode
  onSkip?: () => void
}) {
  const numStyle: React.CSSProperties = {
    width: 22, height: 22, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 500, flexShrink: 0,
    background: state === "active" ? BLUE.darkest : state === "done" ? BLUE.light : "#f0f0f0",
    color: state === "active" ? "#fff" : state === "done" ? BLUE.darkest : "#aaa",
    border: state === "pending" ? "0.5px solid #ddd" : "none",
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={numStyle}>{state === "done" ? "✓" : num}</div>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: state === "pending" ? "#aaa" : BLUE.darkest,
        }}>{title}</span>
        {badge && <span style={{ marginLeft: "auto" }}>{badge}</span>}
        {state === "active" && onSkip && (
          <button
            onClick={onSkip}
            style={{ marginLeft: "auto", fontSize: 10, color: BLUE.mid, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            skip
          </button>
        )}
      </div>
      {children && (
        <div style={{ marginLeft: 30, display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Connector() {
  return <div style={{ width: 1, height: 12, background: "#dce8f0", marginLeft: 10 }} />
}

function ApplyBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        fontSize: 11, padding: "5px 14px", borderRadius: 8,
        background: BLUE.darkest, color: "#fff", border: "none",
        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
        alignSelf: "flex-start",
      }}
    >
      {loading ? "..." : label}
    </button>
  )
}

function ColRow({ name, type, children }: { name: string; type: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "0.5px solid #dce8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: BLUE.darkest }}>{name}</span>
        <span style={{ fontSize: 10, color: BLUE.mid, fontFamily: "monospace" }}>{type}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>{children}</div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NullInfo {
  column: string
  null_count: number
  total: number
  is_numeric: boolean
}

interface FillSpec {
  strategy: NullStrategy
  value?: string
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "nulls" | "split" | "aggregate" | "preview"

export default function DataTransforms({ fileId, columns, preview, onTransform, onContinue, onReset }: Props) {
  const numericCols = columns.filter(isNumeric)
  const coordCols   = detectCoordColumns(columns, preview)
  const stringCols  = columns.filter(c => !isNumeric(c))

  // step tracking
  const [step, setStep] = useState<Step>("nulls")

  // null state
  const [nulls, setNulls]       = useState<NullInfo[]>([])
  const [nullSpecs, setNullSpecs] = useState<Record<string, FillSpec>>({})
  const [nullLoading, setNullLoading] = useState(false)
  const [nullApplying, setNullApplying] = useState(false)
  const [nullError, setNullError] = useState<string | null>(null)

  // split state
  const [selectedCols, setSelectedCols] = useState<string[]>(coordCols)
  const [splitLoading, setSplitLoading] = useState(false)
  const [splitError, setSplitError]     = useState<string | null>(null)

  // aggregate state
  const [groupBy, setGroupBy] = useState(columns[0]?.name ?? "")
  const [aggPerCol, setAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(numericCols.map(c => [c.name, "mean"]))
  )
  const [strAggPerCol, setStrAggPerCol] = useState<Record<string, string>>(
    Object.fromEntries(stringCols.filter(c => c.name !== groupBy).map(c => [c.name, "first"]))
  )
  const [aggLoading, setAggLoading] = useState(false)
  const [aggError, setAggError]     = useState<string | null>(null)

  // sync coord cols when columns change
  useEffect(() => {
    setSelectedCols(detectCoordColumns(columns, preview))
  }, [columns, preview])

  // sync agg state when columns change
  useEffect(() => {
    setAggPerCol(Object.fromEntries(columns.filter(isNumeric).map(c => [c.name, "mean"])))
    setStrAggPerCol(Object.fromEntries(
      columns.filter(c => !isNumeric(c) && c.name !== groupBy).map(c => [c.name, "first"])
    ))
  }, [columns, groupBy])

  // fetch null info on mount
  useEffect(() => {
    if (!fileId) return
    setNullLoading(true)
    api.post("/transforms/null_info", { file_id: fileId })
      .then(res => {
        const info: NullInfo[] = res.data.nulls
        setNulls(info)
        setNullSpecs(Object.fromEntries(info.map(n => [n.column, { strategy: "ignore" as NullStrategy }])))
        if (info.length === 0) setStep("split")
      })
      .catch(() => setNullError("Could not load null info."))
      .finally(() => setNullLoading(false))
  }, [fileId])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApplyNulls = async () => {
    setNullApplying(true)
    setNullError(null)
    try {
      const res = await api.post("/transforms/clean_nulls", {
        file_id: fileId, columns: nullSpecs,
      })
      onTransform({ file_id: res.data.file_id, columns: res.data.columns, preview: res.data.preview, rows: res.data.rows })
      setStep("split")
    } catch {
      setNullError("Failed to apply.")
    } finally {
      setNullApplying(false)
    }
  }

  const handleSplit = async () => {
    setSplitLoading(true)
    setSplitError(null)
    try {
      const res = await api.post("/transforms/split_coordinates", {
        file_id: fileId, columns: selectedCols,
      })
      onTransform({ file_id: res.data.file_id, columns: res.data.columns, preview: res.data.preview, rows: res.data.rows })
      setStep("aggregate")
    } catch {
      setSplitError("Split failed.")
    } finally {
      setSplitLoading(false)
    }
  }

  const handleAggregate = async () => {
    setAggLoading(true)
    setAggError(null)
    try {
      const currentNumericCols = columns.filter(isNumeric)
      const currentStringCols  = columns.filter(c => !isNumeric(c) && c.name !== groupBy)
      const res = await api.post("/transforms/aggregate_multi", {
        file_id: fileId,
        group_by: groupBy,
        aggregations: {
          ...Object.fromEntries(currentNumericCols.map(c => [c.name, aggPerCol[c.name] ?? "mean"])),
          ...Object.fromEntries(currentStringCols.map(c => [c.name, strAggPerCol[c.name] ?? "first"])),
        },
      })
      const newPreview = res.data.data
      const newColumns = Object.keys(newPreview[0]).map((name: string) => {
        const sample = newPreview.map((r: Record<string, unknown>) => r[name]).find((v: unknown) => v != null)
        return { name, type: typeof sample === "number" ? "float64" : "object" }
      })
      onTransform({ file_id: fileId, columns: newColumns, preview: newPreview, rows: newPreview.length })
      setStep("preview")
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setAggError(err.response?.data?.detail ?? "Aggregation failed.")
      else setAggError("Aggregation failed.")
    } finally {
      setAggLoading(false)
    }
  }

  const stepOrder: Step[] = ["nulls", "split", "aggregate", "preview"]
  const stepIndex = stepOrder.indexOf(step)

  function stepState(s: Step): "done" | "active" | "pending" {
    const i = stepOrder.indexOf(s)
    if (i < stepIndex) return "done"
    if (i === stepIndex) return "active"
    return "pending"
  }

  // skip nulls step if no nulls
  const showNulls = nulls.length > 0 || step === "nulls"

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* header */}
      <div style={{ padding: "10px 14px", borderBottom: `0.5px solid #dce8f0` }}>
        <p style={{ fontSize: 11, color: BLUE.mid, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Before we go on...
        </p>
      </div>

      {/* steps */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 4 }}>

        {/* ── Step 1: nulls ── */}
        {showNulls && (
          <>
            <StepShell
              num={1} title="Clean null values"
              state={stepState("nulls")}
              onSkip={() => setStep("split")}
              badge={nulls.length > 0 && stepState("nulls") !== "done" ? (
                <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, background: "#faeeda", color: "#854f0b" }}>
                  {nulls.length} column{nulls.length !== 1 ? "s" : ""}
                </span>
              ) : undefined}
            >
              {stepState("nulls") === "active" && nulls.length > 0 && (
                <>
                  {nulls.map(n => {
                    const spec = nullSpecs[n.column] ?? { strategy: "ignore" as NullStrategy }
                    const pct  = ((n.null_count / n.total) * 100).toFixed(1)
                    return (
                      <ColRow key={n.column} name={n.column} type={n.is_numeric ? "numeric" : "string"}>
                        <span style={{ fontSize: 10, color: "#b45309", marginBottom: 2 }}>
                          {n.null_count} nulls ({pct}%)
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, width: "100%" }}>
                          {NULL_STRATEGIES.map(s => {
                            if ((s === "mean" || s === "median" || s === "interpolate") && !n.is_numeric) return null
                            return (
                              <Pill key={s} label={s} active={spec.strategy === s}
                                onClick={() => setNullSpecs(prev => ({ ...prev, [n.column]: { ...prev[n.column], strategy: s } }))} />
                            )
                          })}
                          {spec.strategy === "fill" && (
                            <input
                              type="text" placeholder="value"
                              value={spec.value ?? ""}
                              onChange={e => setNullSpecs(prev => ({ ...prev, [n.column]: { ...prev[n.column], value: e.target.value } }))}
                              style={{ fontSize: 11, border: "0.5px solid #c5d5e0", borderRadius: 6, padding: "2px 8px", width: 80 }}
                            />
                          )}
                        </div>
                      </ColRow>
                    )
                  })}
                  {nullError && <p style={{ fontSize: 10, color: "#e24b4a" }}>{nullError}</p>}
                  <ApplyBtn onClick={handleApplyNulls} loading={nullApplying} label="Apply" />
                </>
              )}
              {stepState("nulls") === "done" && (
                <p style={{ fontSize: 10, color: BLUE.dark }}>
                  {Object.entries(nullSpecs).filter(([, s]) => s.strategy !== "ignore").map(([col, s]) => `${col} → ${s.strategy}`).join(", ") || "skipped"}
                </p>
              )}
            </StepShell>
            <Connector />
          </>
        )}

        {/* ── Step 2: split ── */}
        <StepShell
          num={showNulls ? 2 : 1} title="Split coordinates"
          state={stepState("split")}
          onSkip={() => setStep("aggregate")}
        >
          {stepState("split") === "active" && (
            <>
              {coordCols.length === 0 ? (
                <p style={{ fontSize: 10, color: BLUE.mid }}>No coordinate columns detected.</p>
              ) : (
                coordCols.map(col => (
                  <label key={col} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: BLUE.darkest, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedCols.includes(col)}
                      onChange={e => setSelectedCols(prev => e.target.checked ? [...prev, col] : prev.filter(c => c !== col))}
                    />
                    {col}
                  </label>
                ))
              )}
              {splitError && <p style={{ fontSize: 10, color: "#e24b4a" }}>{splitError}</p>}
              <ApplyBtn onClick={handleSplit} loading={splitLoading} label="Split" />
            </>
          )}
          {stepState("split") === "done" && (
            <p style={{ fontSize: 10, color: BLUE.dark }}>
              {selectedCols.length > 0 ? selectedCols.join(", ") + " → split" : "skipped"}
            </p>
          )}
        </StepShell>

        <Connector />

        {/* ── Step 3: aggregate ── */}
        <StepShell
          num={showNulls ? 3 : 2} title="Group & aggregate"
          state={stepState("aggregate")}
          onSkip={() => setStep("preview")}
        >
          {stepState("aggregate") === "active" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: BLUE.dark, flexShrink: 0 }}>Group by</span>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value)}
                  style={{ fontSize: 11, border: "0.5px solid #c5d5e0", borderRadius: 6, padding: "3px 6px", color: BLUE.darkest, background: "white", flex: 1 }}
                >
                  {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                </select>
              </div>

              {columns.filter(isNumeric).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "0.5px solid #dce8f0" }}>
                  {columns.filter(isNumeric).map(col => (
                    <ColRow key={col.name} name={col.name} type={col.type}>
                      {AGGS.map(agg => (
                        <Pill key={agg} label={agg} active={aggPerCol[col.name] === agg}
                          onClick={() => setAggPerCol(prev => ({ ...prev, [col.name]: agg }))} />
                      ))}
                    </ColRow>
                  ))}
                </div>
              )}

              {columns.filter(c => !isNumeric(c) && c.name !== groupBy).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "0.5px solid #dce8f0" }}>
                  {columns.filter(c => !isNumeric(c) && c.name !== groupBy).map(col => (
                    <ColRow key={col.name} name={col.name} type="string">
                      {STRING_AGGS.map(agg => (
                        <Pill key={agg} label={agg} active={strAggPerCol[col.name] === agg}
                          onClick={() => setStrAggPerCol(prev => ({ ...prev, [col.name]: agg }))} />
                      ))}
                    </ColRow>
                  ))}
                </div>
              )}

              {aggError && <p style={{ fontSize: 10, color: "#e24b4a" }}>{aggError}</p>}
              <ApplyBtn onClick={handleAggregate} loading={aggLoading} label="Preview result" />
            </>
          )}
          {stepState("aggregate") === "done" && (
            <p style={{ fontSize: 10, color: BLUE.dark }}>grouped by {groupBy}</p>
          )}
        </StepShell>

        <Connector />

        {/* ── Step 4: preview ── */}
        <StepShell
          num={showNulls ? 4 : 3} title="Preview & continue"
          state={stepState("preview")}
        >
          {stepState("preview") === "active" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, color: BLUE.dark }}>
                Looking good? Continue to the chart builder or start fresh.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onContinue}
                  style={{ fontSize: 11, padding: "6px 16px", borderRadius: 8, background: BLUE.darkest, color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Continue →
                </button>
                <button
                  onClick={onReset}
                  style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, background: "transparent", color: BLUE.dark, border: `0.5px solid #c5d5e0`, cursor: "pointer" }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </StepShell>

      </div>
    </div>
  )
}