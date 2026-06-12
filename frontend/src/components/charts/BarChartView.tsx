//bar chart component, renders bar chart with rechart 
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts"
import type { AxisConfig} from "../ChartOptions"

interface Props {
  data: Record<string, string | number>[]
  xLabel: string
  yLabels: string[]
  xIsNumeric: boolean
  axisConfig: AxisConfig
  allRows?: Record<string, unknown>[]
}

const BAR_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"
]

function getBarColor(
  entry: Record<string, string | number>,
  colorIndex: number
): string {
    return BAR_COLORS[colorIndex % BAR_COLORS.length]
}

export default function BarChartView({
  data, xLabel, yLabels, axisConfig, allRows = []
}: Props) {

  const yMin = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMax = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const yTick = axisConfig.yTickInterval !== "" ? parseFloat(axisConfig.yTickInterval) : undefined

  const isGrouped = yLabels.length > 1

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px"
          }}
        />
        {isGrouped && <Legend />}
        {yLabels.map((label, colorIndex) => (
          <Bar
            key={label}
            dataKey={label}
            name={label}
            fill={BAR_COLORS[colorIndex % BAR_COLORS.length]}
            radius={[4, 4, 0, 0]}
          >
            {!isGrouped && data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={getBarColor(entry, colorIndex)}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}