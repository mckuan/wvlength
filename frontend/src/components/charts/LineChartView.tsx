import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import type { AxisConfig } from "../ChartPage/ChartOptions"

interface Props {
  data: Record<string, string | number>[]
  xLabel: string
  yLabels: string[]
  axisConfig: AxisConfig
}

const LINE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"
]

export default function LineChartView({ data, xLabel, yLabels, axisConfig }: Props) {
  const yMin = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMax = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const yTick = axisConfig.yTickInterval !== "" ? parseFloat(axisConfig.yTickInterval) : undefined

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          label={{ value: xLabel, position: "insideBottom", offset: -2, fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          domain={[yMin ?? "auto", yMax ?? "auto"]}
          tickCount={yTick ? Math.ceil(((yMax ?? 100) - (yMin ?? 0)) / yTick) : undefined}
          label={{ value: yLabels.join(", "), angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px"
          }}
        />
        <Legend />
        {yLabels.map((label, i) => (
          <Line
            key={label}
            type="monotone"
            dataKey={label}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}