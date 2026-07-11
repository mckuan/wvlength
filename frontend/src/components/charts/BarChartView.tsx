//bar chart component, renders bar chart with rechart 
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts"
import type { AxisConfig } from "../ChartPage/ChartOptions"
import { CHART_COLORS, FIELD_BORDER } from "../../lib/chartColors"

interface Props {
  data: Record<string, string | number>[]
  xLabel: string
  yLabels: string[]
  xIsNumeric: boolean
  axisConfig: AxisConfig
  allRows?: Record<string, unknown>[]
}

function getBarColor(colorIndex: number): string {
  return CHART_COLORS[colorIndex % CHART_COLORS.length]
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
        <CartesianGrid strokeDasharray="3 3" stroke={FIELD_BORDER} />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 12, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          label={{ value: xLabel, position: "insideBottom", offset: -2, fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#5F7B94" }}
          axisLine={false}
          tickLine={false}
          domain={[yMin ?? "auto", yMax ?? "auto"]}
          tickCount={yTick ? Math.ceil(((yMax ?? 100) - (yMin ?? 0)) / yTick) : undefined}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${FIELD_BORDER}`,
            fontSize: "13px"
          }}
        />
        {isGrouped && <Legend />}
        {yLabels.map((label, colorIndex) => (
          <Bar
            key={label}
            dataKey={label}
            name={label}
            fill={CHART_COLORS[colorIndex % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          >
            {!isGrouped && data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={getBarColor(colorIndex)} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}