//parent of ChartOptions and individual chart views, manages/renders state for both
import { useState, useEffect } from "react"
import BarChartView from "../charts/BarChartView"
import LineChartView from "../charts/LineChartView"
import ChartOptions from "./ChartOptions"
import type { AxisConfig } from "./ChartOptions"
import { aggregateMultiple } from "../../lib/datasets"

interface Column {
  name: string
  type: string
}

interface Props {
  columns: Column[]
  preview: Record<string, unknown>[]
}

const CHART_TYPES = [
  { value: "bar",       label: "Bar" },
  { value: "line",      label: "Line" },
  { value: "scatter",   label: "Scatter" },
  { value: "histogram", label: "Histogram" },
  { value: "boxplot",   label: "Box Plot" },
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
  yMin: "", yMax: "", yTickInterval: "", binSize: ""
}

function renderChart(
  type: string,
  data: Record<string, string | number>[],
  xAxis: string,
  yLabels: string[],
  axisConfig: AxisConfig,
  preview: Record<string, unknown>[]
) {
  switch (type) {
    case "bar":
      return (
        <BarChartView
          data={data}
          xLabel={xAxis}
          yLabels={yLabels}
          xIsNumeric={typeof data[0]?.x === "number"}
          axisConfig={axisConfig}
          allRows={preview}
        />
      )
    default:
      return <p className="text-gray-400 text-sm">This chart type is coming soon.</p>
  }
}

export default function ChartBuilder({ columns, preview }: Props) {
  const [chartType, setChartType] = useState("bar")
  const [groupBy, setGroupBy]     = useState(columns[0]?.name ?? "")
  const [aggregation, setAggregation] = useState("mean")
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([])
  const [lineData, setLineData]   = useState<Record<string, string | number>[]>([])
  const [yColumns, setYColumns]   = useState<string[]>(
    [columns.find(c => c.type.includes("int") || c.type.includes("float"))?.name ?? ""]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [axisConfig, setAxisConfig] = useState<AxisConfig>(DEFAULT_AXIS)

  const xIsNumeric = columns.find(c => c.name === groupBy)?.type !== "object"

  // bar chart aggregation
  useEffect(() => {
    if (chartType === "line") return
    if (!groupBy || yColumns.length === 0) return

    const binSize = axisConfig.binSize !== "" ? parseFloat(axisConfig.binSize) : undefined
    if (axisConfig.binSize !== "" && (isNaN(binSize!) || binSize! <= 0)) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateMultiple({
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
  }, [chartType, groupBy, yColumns, aggregation, preview, axisConfig.binSize])

  // line chart aggregation
  useEffect(() => {
    if (chartType !== "line") return
    if (!groupBy || yColumns.length === 0) return
    

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateMultiple({
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
  }, [chartType, groupBy, yColumns, aggregation, preview])

  

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold mb-4">Chart Builder</h2>

      {/* Chart type pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.value}
            onClick={() => setChartType(ct.value)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors
              ${chartType === ct.value
                ? "bg-indigo-500 text-white border-indigo-500"
                : "text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Axis selectors */}
      <div className="flex gap-6 mb-4 flex-wrap">
        <div>
          <label className="block text-sm text-gray-500 mb-1">X Axis</label>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Aggregation</label>
          <select
            value={aggregation}
            onChange={e => setAggregation(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {AGGREGATIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Y columns multi-select */}
      <div className="mb-4">
        <label className="block text-sm text-gray-500 mb-2">
          {chartType === "bar" ? "Y Columns (grouped bars)" : "Y Columns (lines)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {columns
          .filter(col => col.type.includes("int") || col.type.includes("float"))
          .map(col => (
            <button
              key={col.name}
              onClick={() => {
                setYColumns(prev =>
                  prev.includes(col.name)
                    ? prev.filter(c => c !== col.name)
                    : [...prev, col.name]
                )
              }}
              className={`px-3 py-1 rounded-full text-xs border transition-colors
                ${yColumns.includes(col.name)
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
            >
              {col.name}
            </button>
          ))}
        </div>
      </div>

      {/* Options panel */}
      <ChartOptions
        axisConfig={axisConfig}
        xIsNumeric={xIsNumeric}
        columns={columns}
        preview={preview}
        yColumns={yColumns}
        onAxisChange={setAxisConfig}
      />

      {/* Chart */}
      <div className="mt-6">
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {loading
          ? <p className="text-gray-400 text-sm">Calculating...</p>
          : chartType === "line"
            ? lineData.length > 0
              ? <LineChartView
                  data={lineData}
                  xLabel={groupBy}
                  yLabels={yColumns}
                  axisConfig={axisConfig}
                />
              : <p className="text-gray-400 text-sm">Select options above to render a chart.</p>
            : chartData.length > 0
              ? renderChart(chartType, chartData, groupBy, yColumns, axisConfig, preview)
              : <p className="text-gray-400 text-sm">Select options above to render a chart.</p>
        }
      </div>
    </div>
  )
}