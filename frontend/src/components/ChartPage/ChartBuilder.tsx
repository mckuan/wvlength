//parent of ChartOptions and individual chart views, manages/renders state for both
import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import axios from "axios"
import BarChartView from "../charts/BarChartView"
import LineChartView from "../charts/LineChartView"
import BoxPlotChartView from "../charts/BoxPlotChartView"
import HeatmapChartView from "../charts/HeatmapChartView"
import HistogramChartView from "../charts/HistogramChartView"
import ScatterChartView from "../charts/ScatterChartView"
import ChartTypeIcon from "./ChartTypeIcon"
import ChartOptions from "./ChartOptions"
import SummaryPanel from "./SummaryPanel"
import ChartColor from "./ChartColor"
import type { AxisConfig } from "./ChartOptions"
import { aggregateMultiple } from "../../lib/datasets"
import {
  FIELD_BORDER, FIELD_BG, TEXT_MUTED, ACCENT, ACCENT_TEXT, CANVAS_BORDER,
  DEFAULT_COLOR_CONFIG,
} from "../../lib/chartColors"
import type { ColorConfig } from "../../lib/chartColors"

interface Column {
  name: string
  type: string
}

// shape of the chart_config record produced by (and saved to) the /projects
// backend — used to restore a saved project's exact chart settings
export interface ChartConfigSnapshot {
  chart_type: string
  group_by?: string
  heatmap_col_by?: string
  aggregation?: string
  y_columns: string[]
  axis_config: AxisConfig
  color_config: ColorConfig
}

interface Props {
  columns: Column[]
  preview: Record<string, unknown>[]
  fileId?: string
  // when opening a saved project, seeds initial state instead of the defaults below
  initialConfig?: ChartConfigSnapshot
}

// exposed to the parent page via ref, so header buttons living outside
// ChartBuilder (e.g. in ChartPage) can trigger export / add-to-project
// without ChartBuilder's internal state needing to be lifted up
export interface ChartBuilderHandle {
  exportChart: () => void
  addToProject: () => void
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
  { value: "mean",   label: "Mean" },
  { value: "sum",    label: "Sum" },
  { value: "count",  label: "Count" },
  { value: "median", label: "Median" },
  { value: "min",    label: "Min" },
  { value: "max",    label: "Max" },
]

const DEFAULT_AXIS: AxisConfig = {
  yMin: "", yMax: "", yTickInterval: "", binSize: "", scaleMin: "", scaleMax: "",
}

const RAW_ROW_CHARTS = new Set(["scatter", "histogram", "boxplot", "heatmap"])

// chart types where per-value or per-threshold coloring is meaningful
const COLORABLE_CHART_TYPES = new Set(["bar", "line", "scatter", "boxplot"])

const ChartBuilder = forwardRef<ChartBuilderHandle, Props>(function ChartBuilder(
  { columns, preview, fileId, initialConfig },
  ref
) {
  const [chartType, setChartType] = useState(initialConfig?.chart_type ?? "bar")
  const [groupBy, setGroupBy]     = useState(
    initialConfig?.group_by ?? columns[0]?.name ?? ""
  )
  const [heatmapColBy, setHeatmapColBy] = useState(
    initialConfig?.heatmap_col_by ?? columns[1]?.name ?? columns[0]?.name ?? ""
  )
  const [aggregation, setAggregation] = useState(initialConfig?.aggregation ?? "mean")
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([])
  const [lineData, setLineData]   = useState<Record<string, string | number>[]>([])
  const [yColumns, setYColumns]   = useState<string[]>(
    initialConfig?.y_columns ??
    [columns.find(c => c.type.includes("int") || c.type.includes("float"))?.name ?? ""]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [axisConfig, setAxisConfig] = useState<AxisConfig>(initialConfig?.axis_config ?? DEFAULT_AXIS)
  const [colorConfig, setColorConfig] = useState<ColorConfig>(
    initialConfig?.color_config ?? DEFAULT_COLOR_CONFIG
  )

  const numericColumns = columns.filter(c => c.type.includes("int") || c.type.includes("float"))
  const categoricalColumns = useMemo(
    () => columns.filter(c => !c.type.includes("int") && !c.type.includes("float")).map(c => c.name),
    [columns]
  )
  const isMultiValueChart = chartType === "bar" || chartType === "line" || chartType === "scatter"
  const isColorable = COLORABLE_CHART_TYPES.has(chartType)

  // pull distinct values for a categorical column, capped so the legend stays usable
  function getUniqueValues(column: string): string[] {
    const seen = new Set<string>()
    for (const row of preview) {
      const v = row[column]
      if (v === undefined || v === null) continue
      seen.add(String(v))
      if (seen.size >= 12) break
    }
    return Array.from(seen)
  }

  // reset chart config when the underlying dataset actually changes (e.g. user
  // switches files) — but not on first mount, so an initialConfig passed in
  // from a reopened project doesn't get immediately wiped back to defaults
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    setGroupBy(columns[0]?.name ?? "")
    setHeatmapColBy(columns[1]?.name ?? columns[0]?.name ?? "")
    setYColumns([columns.find(c => c.type.includes("int") || c.type.includes("float"))?.name ?? ""])
    setChartData([])
    setLineData([])
    setError(null)
    setColorConfig(DEFAULT_COLOR_CONFIG)
  }, [columns])

  // bar chart aggregation
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
          file_id: fileId,
          data: preview,
          group_by: groupBy,
          value_cols: yColumns,
          aggregation,
          bin_size: binSize,
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

  // line chart aggregation
  useEffect(() => {
    if (chartType !== "line") return
    if (!groupBy || yColumns.length === 0) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateMultiple({
          file_id: fileId,
          data: preview,
          group_by: groupBy,
          value_cols: yColumns,
          aggregation,
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

  // raw-row charts don't hit the backend
  useEffect(() => {
    if (RAW_ROW_CHARTS.has(chartType)) {
      setLoading(false)
      setError(null)
    }
  }, [chartType])

  // colorBy only makes sense for categorical columns, and only for colorable chart types;
  // clear it when it stops applying so stale state doesn't leak into a new chart type
  useEffect(() => {
    if (!isColorable && colorConfig.colorBy) {
      setColorConfig(prev => ({ ...prev, colorBy: "" }))
    }
  }, [isColorable, colorConfig.colorBy])

  function handleExportChart() {
    // TODO: wire up actual export — e.g. rendering the chart canvas to PNG/SVG,
    // or POSTing { chartType, groupBy, yColumns, axisConfig, colorConfig } to a
    // backend export endpoint and downloading the result
    console.log("export chart", { chartType, groupBy, yColumns, axisConfig, colorConfig })
  }

  async function handleAddToProject() {
    if (!fileId) {
      window.alert("This chart isn't attached to a file yet — can't save it.")
      return
    }
    // TODO: swap window.prompt for a real "save project" modal
    const name = window.prompt("Name this project:")
    if (!name) return

    try {
      await axios.post("http://localhost:8000/projects/", {
        name,
        file_id: fileId,
        chart_config: {
          chart_type: chartType,
          group_by: groupBy,
          heatmap_col_by: heatmapColBy,
          aggregation,
          y_columns: yColumns,
          axis_config: axisConfig,
          color_config: colorConfig,
        },
      })
      window.alert("Saved to workspace.")
    } catch {
      window.alert("Failed to save project — check your backend is running.")
    }
  }

  useImperativeHandle(ref, () => ({
    exportChart: handleExportChart,
    addToProject: handleAddToProject,
  }))

  function renderChart() {
    switch (chartType) {
      case "bar":
        if (chartData.length === 0) return <EmptyState text="Pick a group and at least one column to plot." />
        return (
          <BarChartView
            data={chartData}
            xLabel={groupBy}
            yLabels={yColumns}
            xIsNumeric={typeof chartData[0]?.x === "number"}
            axisConfig={axisConfig}
            allRows={preview}
            colorConfig={colorConfig}
          />
        )

      case "line":
        if (lineData.length === 0) return <EmptyState text="Pick a group and at least one column to plot." />
        {
          const C: any = LineChartView
          return (
            <C
              data={lineData}
              xLabel={groupBy}
              yLabels={yColumns}
              axisConfig={axisConfig}
              colorConfig={colorConfig}
            />
          )
        }

      case "scatter":
        if (yColumns.length === 0 || !groupBy) {
          return <EmptyState text="Pick an X axis and at least one Y column." />
        }
        {
          const C: any = ScatterChartView
          return (
            <C
              allRows={preview}
              xLabel={groupBy}
              yLabels={yColumns}
              axisConfig={axisConfig}
              colorConfig={colorConfig}
            />
          )
        }

      case "histogram":
        if (!yColumns[0]) {
          return <EmptyState text="Pick a numeric column to bucket." />
        }
        return (
          <HistogramChartView
            allRows={preview}
            column={yColumns[0]}
            axisConfig={axisConfig}
          />
        )

      case "boxplot":
        if (!yColumns[0] || !groupBy) {
          return <EmptyState text="Pick a group and a numeric column." />
        }
        {
          const C: any = BoxPlotChartView
          return (
            <C
              allRows={preview}
              groupBy={groupBy}
              valueCol={yColumns[0]}
              axisConfig={axisConfig}
              colorConfig={colorConfig}
            />
          )
        }

      case "heatmap":
        if (!yColumns[0] || !groupBy || !heatmapColBy) {
          return <EmptyState text="Pick a row axis, a column axis, and a value." />
        }
        return (
          <HeatmapChartView
            allRows={preview}
            rowCol={groupBy}
            colCol={heatmapColBy}
            valueCol={yColumns[0]}
            scaleMin={axisConfig.scaleMin !== "" ? parseFloat(axisConfig.scaleMin) : undefined}
            scaleMax={axisConfig.scaleMax !== "" ? parseFloat(axisConfig.scaleMax) : undefined}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="mt-6 max-w-7xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">Chart builder</h2>

      <div className="flex gap-5 items-start">
        {/* Left rail: chart type */}
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

        {/* Middle: config + chart + options */}
        <div className="flex-1 min-w-0">
          {/* Config bar — contextual per chart type */}
          <div className="flex flex-wrap items-end gap-4 pb-3.5 mb-3.5" style={{ borderBottom: `1px solid ${FIELD_BORDER}` }}>
            <Field label={chartType === "heatmap" ? "Row axis" : chartType === "boxplot" ? "Group by" : "X axis"}>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="rounded-md px-2.5 py-1.5 text-sm"
                style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
              >
                {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
              </select>
            </Field>

            {chartType === "heatmap" && (
              <Field label="Column axis">
                <select
                  value={heatmapColBy}
                  onChange={e => setHeatmapColBy(e.target.value)}
                  className="rounded-md px-2.5 py-1.5 text-sm"
                  style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
                >
                  {columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                </select>
              </Field>
            )}

            {(chartType === "bar" || chartType === "line") && (
              <Field label="Aggregation">
                <select
                  value={aggregation}
                  onChange={e => setAggregation(e.target.value)}
                  className="rounded-md px-2.5 py-1.5 text-sm"
                  style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
                >
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
                        setYColumns(prev =>
                          prev.includes(col.name) ? prev.filter(c => c !== col.name) : [...prev, col.name]
                        )
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

          {/* Chart canvas — sizes to content instead of a fixed centered box, avoids overlap */}
          <div
            className="rounded-lg mb-6"
            style={{ border: `1px dashed ${CANVAS_BORDER}`, background: "#fff" }}
          >
            {error && (
              <div className="flex items-center justify-center" style={{ minHeight: 260 }}>
                <p className="text-red-400 text-sm p-4">{error}</p>
              </div>
            )}
            {!error && loading && (
              <div className="flex items-center justify-center" style={{ minHeight: 260 }}>
                <p className="text-sm" style={{ color: TEXT_MUTED }}>Calculating…</p>
              </div>
            )}
            {!error && !loading && (
              <div className="w-full p-2">{renderChart()}</div>
            )}
          </div>

          {/* Axes and Summary — two separate blocks */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
              <ChartOptions
                chartType={chartType}
                axisConfig={axisConfig}
                onAxisChange={setAxisConfig}
              />
            </div>
            <div className="flex-1 min-w-[280px]">
              <SummaryPanel
                preview={preview}
                yColumns={yColumns}
                columns={columns}
              />
            </div>
          </div>
        </div>

        {/* Right rail: color-by panel */}
        <div className="shrink-0 w-40 pl-4" style={{ borderLeft: `1px solid ${FIELD_BORDER}` }}>
          <ChartColor
            colorable={isColorable}
            chartLabel={CHART_TYPES.find(ct => ct.value === chartType)?.label ?? ""}
            categoricalColumns={categoricalColumns}
            getUniqueValues={getUniqueValues}
            config={colorConfig}
            onChange={setColorConfig}
          />
        </div>
      </div>
    </div>
  )
})

export default ChartBuilder

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm p-4" style={{ color: TEXT_MUTED }}>{text}</p>
}