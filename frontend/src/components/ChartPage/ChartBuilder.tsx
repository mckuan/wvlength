//parent of ChartOptions and individual chart views, manages/renders state for both
import { useState, useEffect } from "react"
import BarChartView from "../charts/BarChartView"
import LineChartView from "../charts/LineChartView"
import BoxPlotChartView from "../charts/BoxPlotChartView"
import HeatmapChartView from "../charts/HeatmapChartView"
import HistogramChartView from "../charts/HistogramChartView"
import ScatterChartView from "../charts/ScatterChartView"
import ChartTypeIcon from "./ChartTypeIcon"
import ChartOptions from "./ChartOptions"
import type { AxisConfig } from "./ChartOptions"
import SummaryPanel from "./SummaryPanel"
import { aggregateMultiple } from "../../lib/datasets"
import { PANEL_BG, FIELD_BORDER, FIELD_BG, TEXT_MUTED, ACCENT, ACCENT_TEXT, CANVAS_BORDER } from "../../lib/chartColors"

interface Column {
  name: string
  type: string
}

interface Props {
  columns: Column[]
  preview: Record<string, unknown>[]
  fileId?: string
}

const CHART_TYPES = [
  { value: "bar",       label: "Bar" },
  { value: "line",      label: "Line" },
  { value: "scatter",   label: "Scatter" },
  { value: "histogram", label: "Histogram" },
  { value: "boxplot",   label: "Box plot" },
  { value: "heatmap",   label: "Heatmap" },
]

const AGGREGATIONS = [
  { value: "mean", label: "Mean" }, { value: "sum", label: "Sum" },
  { value: "count", label: "Count" }, { value: "median", label: "Median" },
  { value: "min", label: "Min" }, { value: "max", label: "Max" },
]

const DEFAULT_AXIS: AxisConfig = {
  yMin: "", yMax: "", yTickInterval: "", binSize: "", scaleMin: "", scaleMax: "",
}

const RAW_ROW_CHARTS = new Set(["scatter", "histogram", "boxplot", "heatmap"])

export default function ChartBuilder({ columns, preview, fileId }: Props) {
  const [chartType, setChartType] = useState("bar")
  const [groupBy, setGroupBy]     = useState(columns[0]?.name ?? "")
  const [heatmapColBy, setHeatmapColBy] = useState(columns[1]?.name ?? columns[0]?.name ?? "")
  const [aggregation, setAggregation] = useState("mean")
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([])
  const [lineData, setLineData]   = useState<Record<string, string | number>[]>([])
  const [yColumns, setYColumns]   = useState<string[]>(
    [columns.find(c => c.type.includes("int") || c.type.includes("float"))?.name ?? ""]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [axisConfig, setAxisConfig] = useState<AxisConfig>(DEFAULT_AXIS)

  const numericColumns = columns.filter(c => c.type.includes("int") || c.type.includes("float"))
  const isMultiValueChart = chartType === "bar" || chartType === "line" || chartType === "scatter"

  useEffect(() => {
    setGroupBy(columns[0]?.name ?? "")
    setHeatmapColBy(columns[1]?.name ?? columns[0]?.name ?? "")
    setYColumns([columns.find(c => c.type.includes("int") || c.type.includes("float"))?.name ?? ""])
    setChartData([])
    setLineData([])
    setError(null)
  }, [columns])

  useEffect(() => {
    if (chartType !== "bar") return
    if (!groupBy || yColumns.length === 0) return

    const binSize = axisConfig.binSize !== "" ? parseFloat(axisConfig.binSize) : undefined
    if (axisConfig.binSize !== "" && (isNaN(binSize!) || binSize! <= 0)) {
      setChartData([])
      setError("Bin size must be a positive number.")
      return
    }

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateMultiple({
          file_id: fileId, data: preview, group_by: groupBy,
          value_cols: yColumns, aggregation, bin_size: binSize,
        })
        setChartData(result)
      } catch {
        setError("Aggregation failed — check your backend is running.")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [chartType, groupBy, yColumns, aggregation, preview, fileId, axisConfig.binSize])

  useEffect(() => {
    if (chartType !== "line") return
    if (!groupBy || yColumns.length === 0) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateMultiple({
          file_id: fileId, data: preview, group_by: groupBy,
          value_cols: yColumns, aggregation,
        })
        setLineData(result)
      } catch {
        setError("Aggregation failed — check your backend is running.")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [chartType, groupBy, yColumns, aggregation, preview, fileId])

  useEffect(() => {
    if (RAW_ROW_CHARTS.has(chartType)) {
      setLoading(false)
      setError(null)
    }
  }, [chartType])

  function renderChart() {
    switch (chartType) {
      case "bar":
        return chartData.length > 0
          ? <BarChartView data={chartData} xLabel={groupBy} yLabels={yColumns}
              xIsNumeric={typeof chartData[0]?.x === "number"} axisConfig={axisConfig} allRows={preview} />
          : <EmptyState text="Pick a group and at least one column to plot." />
      case "line":
        return lineData.length > 0
          ? <LineChartView data={lineData} xLabel={groupBy} yLabels={yColumns} axisConfig={axisConfig} />
          : <EmptyState text="Pick a group and at least one column to plot." />
      case "scatter":
        if (yColumns.length === 0 || !groupBy) return <EmptyState text="Pick an X axis and at least one Y column." />
        return <ScatterChartView allRows={preview} xLabel={groupBy} yLabels={yColumns} axisConfig={axisConfig} />
      case "histogram":
        if (!yColumns[0]) return <EmptyState text="Pick a numeric column to bucket." />
        return <HistogramChartView allRows={preview} column={yColumns[0]} axisConfig={axisConfig} />
      case "boxplot":
        if (!yColumns[0] || !groupBy) return <EmptyState text="Pick a group and a numeric column." />
        return <BoxPlotChartView allRows={preview} groupBy={groupBy} valueCol={yColumns[0]} axisConfig={axisConfig} />
      case "heatmap":
        if (!yColumns[0] || !groupBy || !heatmapColBy) return <EmptyState text="Pick a row axis, a column axis, and a value." />
        return <HeatmapChartView allRows={preview} rowCol={groupBy} colCol={heatmapColBy} valueCol={yColumns[0]}
                 scaleMin={axisConfig.scaleMin !== "" ? parseFloat(axisConfig.scaleMin) : undefined}
                 scaleMax={axisConfig.scaleMax !== "" ? parseFloat(axisConfig.scaleMax) : undefined} />
      default:
        return null
    }
  }

  return (
    <div className="mt-10 rounded-xl p-5" style={{ background: PANEL_BG }}>
      <h2 className="text-lg font-semibold mb-4">Chart builder</h2>

      <div className="flex gap-5 items-start">
        <div className="flex flex-col gap-0.5 shrink-0 w-32 pr-3.5" style={{ borderRight: `1px solid ${FIELD_BORDER}` }}>
          {CHART_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setChartType(ct.value)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors"
              style={{
                background: chartType === ct.value ? ACCENT : "transparent",
                color: chartType === ct.value ? ACCENT_TEXT : TEXT_MUTED,
              }}
            >
              <ChartTypeIcon type={ct.value} className="w-4 h-4 shrink-0" />
              {ct.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-end gap-4 pb-3.5 mb-3.5" style={{ borderBottom: `1px solid ${FIELD_BORDER}` }}>
            <Field label={chartType === "heatmap" ? "Row axis" : chartType === "boxplot" ? "Group by" : "X axis"}>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                className="rounded-md px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}>
                {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
              </select>
            </Field>

            {chartType === "heatmap" && (
              <Field label="Column axis">
                <select value={heatmapColBy} onChange={e => setHeatmapColBy(e.target.value)}
                  className="rounded-md px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}>
                  {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                </select>
              </Field>
            )}

            {(chartType === "bar" || chartType === "line") && (
              <Field label="Aggregation">
                <select value={aggregation} onChange={e => setAggregation(e.target.value)}
                  className="rounded-md px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}>
                  {AGGREGATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>
            )}

            <Field
              label={
                chartType === "histogram" ? "Column" :
                chartType === "boxplot" || chartType === "heatmap" ? "Value column" :
                "Y columns"
              }
              className="flex-1 min-w-[220px]"
            >
              <div className="flex flex-wrap gap-1.5">
                {numericColumns.map(col => (
                  <button
                    key={col.name}
                    onClick={() => {
                      if (isMultiValueChart) {
                        setYColumns(prev => prev.includes(col.name) ? prev.filter(c => c !== col.name) : [...prev, col.name])
                      } else {
                        setYColumns([col.name])
                      }
                    }}
                    className="px-2.5 py-1 rounded-full text-xs transition-colors"
                    style={
                      yColumns.includes(col.name)
                        ? { background: ACCENT, color: ACCENT_TEXT, border: `1px solid ${ACCENT}` }
                        : { color: TEXT_MUTED, border: `1px solid ${FIELD_BORDER}` }
                    }
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="rounded-lg mb-4 flex items-center justify-center" style={{ height: 260, border: `1px dashed ${CANVAS_BORDER}`, background: "#fff" }}>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!error && (loading ? <p className="text-sm" style={{ color: TEXT_MUTED }}>Calculating…</p> : renderChart())}
          </div>

          <div className="flex gap-4">
            <ChartOptions
              chartType={chartType}
              axisConfig={axisConfig}
              xIsNumeric={columns.find(c => c.name === groupBy)?.type !== "object"}
              columns={columns}
              preview={preview}
              yColumns={yColumns}
              onAxisChange={setAxisConfig}
            />
            <SummaryPanel preview={preview} numericColumns={numericColumns.map(c => c.name)} selectedColumn={yColumns[0]} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm" style={{ color: TEXT_MUTED }}>{text}</p>
}