import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts"
import type { AxisConfig, StyleConfig } from "../ChartOptions"

interface Props {
  data: { x: string; y: number }[]
  xLabel: string
  yLabel: string
  axisConfig: AxisConfig
  styleConfig: StyleConfig
  allRows?: Record<string, unknown>[]
}

// generates a color palette for category mode
const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"
]

function getBarColor(
  entry: { x: string; y: number },
  index: number,
  style: StyleConfig,
  allRows: Record<string, unknown>[],
  categoryMap: Map<string, string>
): string {
  switch (style.mode) {
    case "threshold": {
      const t = parseFloat(style.threshold)
      if (isNaN(t)) return "#6366f1"
      return entry.y >= t ? style.aboveColor : style.belowColor
    }
    case "category": {
      return categoryMap.get(entry.x) ?? "#6366f1"
    }
    case "textmatch": {
      return entry.x.toLowerCase().includes(style.matchText.toLowerCase())
        ? style.matchColor
        : style.defaultColor
    }
    default:
      return "#6366f1"
  }
}

export default function BarChartView({
  data, xLabel, yLabel, axisConfig, styleConfig, allRows = []
}: Props) {

  // build category color map once
  const categoryMap = new Map<string, string>()
  if (styleConfig.mode === "category" && styleConfig.categoryCol) {
    const uniqueVals = [...new Set(allRows.map(r => String(r[styleConfig.categoryCol])))]
    uniqueVals.forEach((val, i) => {
      categoryMap.set(val, CATEGORY_COLORS[i % CATEGORY_COLORS.length])
    })
    // map x values to their category color
    data.forEach(entry => {
      const match = allRows.find(r => String(r[xLabel]) === entry.x)
      if (match) {
        const cat = String(match[styleConfig.categoryCol])
        categoryMap.set(entry.x, categoryMap.get(cat) ?? "#6366f1")
      }
    })
  }

  const yMin = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMax = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const yTick = axisConfig.yTickInterval !== "" ? parseFloat(axisConfig.yTickInterval) : undefined
  const xTick = axisConfig.xTickInterval !== "" ? parseInt(axisConfig.xTickInterval) : 1

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          interval={xTick - 1}
          label={{ value: xLabel, position: "insideBottom", offset: -2, fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          domain={[yMin ?? "auto", yMax ?? "auto"]}
          tickCount={yTick ? Math.ceil((( yMax ?? 100) - (yMin ?? 0)) / yTick) : undefined}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px"
          }}
        />
        <Bar dataKey="y" radius={[4, 4, 0, 0]} name={yLabel}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry, index, styleConfig, allRows, categoryMap)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}