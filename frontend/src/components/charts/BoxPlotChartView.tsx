import type { AxisConfig } from "../ChartPage/ChartOptions"
import { CHART_COLORS, TEXT_MUTED } from "../../lib/chartColors"

interface Props {
  allRows: Record<string, unknown>[]
  groupBy: string
  valueCol: string
  axisConfig: AxisConfig
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

interface BoxStats {
  group: string
  min: number; q1: number; median: number; q3: number; max: number
}

function computeStats(allRows: Record<string, unknown>[], groupBy: string, valueCol: string): BoxStats[] {
  const groups = new Map<string, number[]>()
  for (const row of allRows) {
    const val = toNumber(row[valueCol])
    if (val === null) continue
    const key = String(row[groupBy])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(val)
  }
  return Array.from(groups.entries()).map(([group, values]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      group,
      min: sorted[0],
      q1: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      q3: quantile(sorted, 0.75),
      max: sorted[sorted.length - 1],
    }
  })
}

const BOX_WIDTH = 40
const CHART_HEIGHT = 350
const PADDING = { top: 20, bottom: 40, left: 50, right: 20 }
const BOX_COLOR = CHART_COLORS[0]

export default function BoxPlotChartView({ allRows, groupBy, valueCol, axisConfig }: Props) {
  const stats = computeStats(allRows, groupBy, valueCol)
  if (stats.length === 0) {
    return <p className="text-sm" style={{ color: TEXT_MUTED }}>No numeric data to show for "{valueCol}".</p>
  }

  const yMinConfig = axisConfig.yMin !== "" ? parseFloat(axisConfig.yMin) : undefined
  const yMaxConfig = axisConfig.yMax !== "" ? parseFloat(axisConfig.yMax) : undefined
  const dataMin = Math.min(...stats.map(s => s.min))
  const dataMax = Math.max(...stats.map(s => s.max))
  const yMin = yMinConfig ?? dataMin
  const yMax = yMaxConfig ?? dataMax
  const range = yMax - yMin || 1

  const chartWidth = Math.max(400, stats.length * (BOX_WIDTH + 40))
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const yToPixel = (v: number) => PADDING.top + plotHeight - ((v - yMin) / range) * plotHeight

  const tickCount = 5
  const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (range / tickCount) * i)

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={CHART_HEIGHT}>
        {tickValues.map((t, i) => (
          <g key={i}>
            <line x1={PADDING.left} x2={chartWidth - PADDING.right} y1={yToPixel(t)} y2={yToPixel(t)} stroke="#E8EFF4" />
            <text x={PADDING.left - 8} y={yToPixel(t) + 4} textAnchor="end" fontSize={11} fill="#5F7B94">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {stats.map((s, i) => {
          const cx = PADDING.left + 40 + i * (BOX_WIDTH + 40)
          return (
            <g key={s.group}>
              <line x1={cx} x2={cx} y1={yToPixel(s.min)} y2={yToPixel(s.q1)} stroke={BOX_COLOR} strokeWidth={1.5} />
              <line x1={cx} x2={cx} y1={yToPixel(s.q3)} y2={yToPixel(s.max)} stroke={BOX_COLOR} strokeWidth={1.5} />
              <line x1={cx - 8} x2={cx + 8} y1={yToPixel(s.min)} y2={yToPixel(s.min)} stroke={BOX_COLOR} strokeWidth={1.5} />
              <line x1={cx - 8} x2={cx + 8} y1={yToPixel(s.max)} y2={yToPixel(s.max)} stroke={BOX_COLOR} strokeWidth={1.5} />
              <rect
                x={cx - BOX_WIDTH / 2}
                y={yToPixel(s.q3)}
                width={BOX_WIDTH}
                height={Math.max(1, yToPixel(s.q1) - yToPixel(s.q3))}
                fill={BOX_COLOR} fillOpacity={0.25} stroke={BOX_COLOR} strokeWidth={1.5}
              />
              <line x1={cx - BOX_WIDTH / 2} x2={cx + BOX_WIDTH / 2} y1={yToPixel(s.median)} y2={yToPixel(s.median)} stroke={BOX_COLOR} strokeWidth={2} />
              <text x={cx} y={CHART_HEIGHT - PADDING.bottom + 20} textAnchor="middle" fontSize={12} fill="#5F7B94">
                {s.group.length > 10 ? s.group.slice(0, 10) + "…" : s.group}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}