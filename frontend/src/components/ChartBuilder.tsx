import { useState, useEffect } from "react"
import BarChartView from "./charts/BarChartView"
import { aggregateData } from "../lib/datasets"

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

function renderChart(
  type: string,
  data: { x: string; y: number }[],
  xLabel: string,
  yLabel: string
) {
  switch (type) {
    case "bar":
      return <BarChartView data={data} xLabel={xLabel} yLabel={yLabel} />
    default:
      return <p className="text-gray-400 text-sm">This chart type is coming soon.</p>
  }
}

export default function ChartBuilder({ columns, preview }: Props) {
  const categoricalColumns = columns.filter(c => c.type === "object")
  const numericColumns = columns.filter(c =>
    c.type.includes("int") || c.type.includes("float")
  )

  const [chartType, setChartType]     = useState("bar")
  const [groupBy, setGroupBy]         = useState(categoricalColumns[0]?.name ?? "")
  const [valueCol, setValueCol]       = useState(numericColumns[0]?.name ?? "")
  const [aggregation, setAggregation] = useState("mean")
  const [chartData, setChartData]     = useState<{ x: string; y: number }[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // re-aggregate whenever any selector changes
  useEffect(() => {
    if (!groupBy || !valueCol) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await aggregateData({
          data: preview,
          group_by: groupBy,
          value_col: valueCol,
          aggregation,
        })
        setChartData(result.data)
      } catch (e) {
        setError("Aggregation failed — check your backend is running.")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [groupBy, valueCol, aggregation, preview])

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold mb-4">Chart Builder</h2>

      {/* Chart type pills */}
      <div className="flex gap-2 mb-6">
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

      {/* Selectors */}
      <div className="flex gap-6 mb-6 flex-wrap">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Group By</label>
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {categoricalColumns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Value</label>
          <select
            value={valueCol}
            onChange={e => setValueCol(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {numericColumns.map(col => (
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

      {/* Chart */}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading
        ? <p className="text-gray-400 text-sm">Calculating...</p>
        : chartData.length > 0
          ? renderChart(chartType, chartData, groupBy, `${aggregation} of ${valueCol}`)
          : <p className="text-gray-400 text-sm">Select options above to render a chart.</p>
      }
    </div>
  )
}