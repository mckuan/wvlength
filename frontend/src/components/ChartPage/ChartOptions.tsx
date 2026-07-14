// settings panel for axis limits, bin size, color scale — contextual per chart type
import { FIELD_BORDER, FIELD_BG, TEXT_MUTED } from "../../lib/chartColors"

export interface AxisConfig {
  yMin: string
  yMax: string
  yTickInterval: string
  binSize: string
  scaleMin: string
  scaleMax: string
}

interface Props {
  chartType: string
  axisConfig: AxisConfig
  onAxisChange: (config: AxisConfig) => void
}

const AXIS_PANELS: Record<string, { label: string; fields: (keyof AxisConfig)[] }> = {
  bar:       { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval", "binSize"] },
  line:      { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  scatter:   { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  histogram: { label: "Bucket settings",  fields: ["binSize"] },
  boxplot:   { label: "Axis adjustments", fields: ["yMin", "yMax", "yTickInterval"] },
  heatmap:   { label: "Color scale",      fields: ["scaleMin", "scaleMax"] },
}

const FIELD_LABELS: Record<keyof AxisConfig, string> = {
  yMin: "Y min",
  yMax: "Y max",
  yTickInterval: "Y tick interval",
  binSize: "Bin size",
  scaleMin: "Scale min",
  scaleMax: "Scale max",
}

export default function ChartOptions({ chartType, axisConfig, onAxisChange }: Props) {
  const panel = AXIS_PANELS[chartType] ?? AXIS_PANELS.bar

  function update(field: keyof AxisConfig, value: string) {
    onAxisChange({ ...axisConfig, [field]: value })
  }

  return (
    <div className="rounded-xl p-4" style={{ border: `1px solid ${FIELD_BORDER}` }}>
      <div className="text-xs mb-3" style={{ color: TEXT_MUTED }}>{panel.label}</div>
      <div className="flex flex-wrap gap-4">
        {panel.fields.map(field => (
          <div key={field}>
            <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>{FIELD_LABELS[field]}</label>
            <input
              type="number"
              value={axisConfig[field]}
              onChange={e => update(field, e.target.value)}
              placeholder="auto"
              className="rounded-lg px-3 py-1.5 text-sm w-24"
              style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}