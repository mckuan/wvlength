// ScatterChartView.tsx
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ZAxis
} from "recharts"
import type { AxisConfig } from "../ChartPage/ChartOptions"
import { CHART_COLORS, FIELD_BORDER, TEXT_MUTED } from "../../lib/chartColors"

interface Props {
  allRows: Record<string, unknown>[]
  xLabel: string
  yLabels: string[]
  axisConfig: AxisConfig
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

export default function ScatterChartView({ allRows, xLabel, yLabels, axisConfig }: Props) {
  const yMin = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMax = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const yTick = axisConfig.yTickInterval !== "" ? parseFloat(axisConfig.yTickInterval) : undefined

  const series = yLabels.map(label => ({
    label,
    points: allRows
      .map(row => ({ x: toNumber(row[xLabel]), y: toNumber(row[label]) }))
      .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null)
  }))

  const hasPoints = series.some(s => s.points.length > 0)
  if (!hasPoints) {
    return <p className="text-sm" style={{ color: TEXT_MUTED }}>No numeric pairs to plot for these columns.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={FIELD_BORDER} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fontSize: 12, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          label={{ value: xLabel, position: "insideBottom", offset: -2, fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabels.join(", ")}
          tick={{ fontSize: 12, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          domain={[yMin ?? "auto", yMax ?? "auto"]}
          tickCount={yTick ? Math.ceil(((yMax ?? 100) - (yMin ?? 0)) / yTick) : undefined}
        />
        <ZAxis range={[40, 40]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: "8px", border: `1px solid ${FIELD_BORDER}`, fontSize: "13px" }}
        />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => (
          <Scatter
            key={s.label}
            name={s.label}
            data={s.points}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}