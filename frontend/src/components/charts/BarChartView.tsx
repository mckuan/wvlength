///bar chart component, renders bar chart with rechart
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts"
import type { AxisConfig } from "../ChartPage/ChartOptions"
import type { ColorConfig } from "../../lib/chartColors"
import { CHART_COLORS, FIELD_BORDER, getCategoryColor, getThresholdColor } from "../../lib/chartColors"

interface Props {
  data: Record<string, string | number>[]
  xLabel: string
  yLabels: string[]
  xIsNumeric: boolean
  axisConfig: AxisConfig
  allRows?: Record<string, unknown>[]
  colorConfig: ColorConfig
}

function getBarColor(colorIndex: number): string {
  return CHART_COLORS[colorIndex % CHART_COLORS.length]
}

// data is aggregated by xLabel only, so one bar can span multiple raw category
// values. this picks the most common colorBy value among the raw rows that fell
// into a given x-bucket, as an approximation for coloring that bar.
function dominantCategoryValue(
  allRows: Record<string, unknown>[],
  xLabel: string,
  xValue: string | number,
  colorBy: string
): string {
  const counts = new Map<string, number>()
  for (const row of allRows) {
    if (String(row[xLabel]) !== String(xValue)) continue
    const v = String(row[colorBy] ?? "")
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best = ""
  let bestCount = -1
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

export default function BarChartView({
  data, xLabel, yLabels, axisConfig, allRows = [], colorConfig
}: Props) {
  const yMin = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMax = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const yTick = axisConfig.yTickInterval !== "" ? parseFloat(axisConfig.yTickInterval) : undefined

  const isGrouped = yLabels.length > 1

  // custom coloring only applies to single-series bars — a grouped chart already
  // uses one color per series, and mixing that with per-bar coloring gets confusing
  const isColoring = !isGrouped && (
    (colorConfig.mode === "category" && colorConfig.colorBy) ||
    (colorConfig.mode === "threshold" && colorConfig.thresholdRules.length > 0)
  )

  // resolve each bar's category value once, so the Cell fill and color count agree
  const categoryValueByX = new Map<string, string>()
  if (colorConfig.mode === "category" && colorConfig.colorBy) {
    for (const row of data) {
      categoryValueByX.set(
        String(row.x),
        dominantCategoryValue(allRows, xLabel, row.x, colorConfig.colorBy)
      )
    }
  }
  const uniqueCategoryValues = Array.from(new Set(categoryValueByX.values()))

  function cellColor(row: Record<string, string | number>, fallbackIndex: number): string {
    if (colorConfig.mode === "category" && colorConfig.colorBy) {
      const catValue = categoryValueByX.get(String(row.x)) ?? ""
      const idx = uniqueCategoryValues.indexOf(catValue)
      return getCategoryColor(colorConfig, catValue, idx === -1 ? 0 : idx)
    }
    if (colorConfig.mode === "threshold") {
      const y = typeof row[yLabels[0]] === "number" ? (row[yLabels[0]] as number) : 0
      return getThresholdColor(colorConfig, y)
    }
    return getBarColor(fallbackIndex)
  }

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
            {!isGrouped && data.map((row, i) => (
              <Cell
                key={`cell-${i}`}
                fill={isColoring ? cellColor(row, colorIndex) : getBarColor(colorIndex)}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}