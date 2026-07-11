import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts"
import type { AxisConfig } from "../ChartPage/ChartOptions"
import { FIELD_BORDER, TEXT_MUTED, CHART_COLORS } from "../../lib/chartColors"

interface Props {
  allRows: Record<string, unknown>[]
  column: string
  axisConfig: AxisConfig
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

function buildBuckets(values: number[], binSize: number | undefined, bucketCount = 10) {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const size = binSize && binSize > 0 ? binSize : (max - min) / bucketCount || 1

  const bucketMap = new Map<number, number>()
  for (const v of values) {
    const bucketStart = Math.floor((v - min) / size) * size + min
    bucketMap.set(bucketStart, (bucketMap.get(bucketStart) ?? 0) + 1)
  }

  return Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([start, count]) => ({
      x: `${start.toFixed(1)}–${(start + size).toFixed(1)}`,
      count
    }))
}

export default function HistogramChartView({ allRows, column, axisConfig }: Props) {
  const binSize = axisConfig.binSize !== "" ? parseFloat(axisConfig.binSize) : undefined
  const values = allRows.map(row => toNumber(row[column])).filter((v): v is number => v !== null)
  const buckets = buildBuckets(values, binSize)

  if (buckets.length === 0) {
    return <p className="text-sm" style={{ color: TEXT_MUTED }}>No numeric data to show for "{column}".</p>
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={buckets} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={FIELD_BORDER} />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 11, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          label={{ value: column, position: "insideBottom", offset: -2, fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Count", angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: `1px solid ${FIELD_BORDER}`, fontSize: "13px" }}
        />
        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}