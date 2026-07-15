// color-by panel: lets users color a chart either by a categorical column
// (with per-value custom swatches) or by a set of Y-value threshold rules.
// the ColorConfig type and color resolvers live in lib/chartColors.ts so every
// chart view can import them without depending on this UI component.
import {
  CHART_COLORS, FIELD_BORDER, FIELD_BG, TEXT_MUTED, TEXT_STRONG, ACCENT, ACCENT_TEXT,
  getCategoryColor,
} from "../../lib/chartColors"
import type { ColorConfig, ColorMode, ThresholdOp, ThresholdRule } from "../../lib/chartColors"

export type { ColorConfig, ColorMode, ThresholdOp, ThresholdRule }
export { DEFAULT_COLOR_CONFIG, getCategoryColor, getThresholdColor } from "../../lib/chartColors"

const OP_LABELS: Record<ThresholdOp, string> = {
  over: "Y over",
  under: "Y under",
  eq: "Y equal to",
}

interface Props {
  colorable: boolean
  chartLabel: string
  categoricalColumns: string[]
  getUniqueValues: (column: string) => string[]
  config: ColorConfig
  onChange: (config: ColorConfig) => void
}

export default function ChartColor({
  colorable,
  chartLabel,
  categoricalColumns,
  getUniqueValues,
  config,
  onChange,
}: Props) {
  if (!colorable) {
    return (
      <div>
        <p className="text-xs mb-2" style={{ color: TEXT_MUTED }}>Color</p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          Not used for {chartLabel.toLowerCase()} charts.
        </p>
      </div>
    )
  }

  const values = config.colorBy ? getUniqueValues(config.colorBy) : []

  function setMode(mode: ColorMode) {
    onChange({ ...config, mode })
  }

  function setColorBy(colorBy: string) {
    onChange({ ...config, colorBy })
  }

  function setCategoryColor(value: string, color: string) {
    const key = `${config.colorBy}:${value}`
    onChange({ ...config, customColors: { ...config.customColors, [key]: color } })
  }

  function resetCategoryColors() {
    const next = { ...config.customColors }
    Object.keys(next).forEach(k => {
      if (k.startsWith(`${config.colorBy}:`)) delete next[k]
    })
    onChange({ ...config, customColors: next })
  }

  function addRule() {
    const rule: ThresholdRule = {
      op: "over",
      value: 0,
      color: CHART_COLORS[config.thresholdRules.length % CHART_COLORS.length],
    }
    onChange({ ...config, thresholdRules: [...config.thresholdRules, rule] })
  }

  function updateRule(index: number, patch: Partial<ThresholdRule>) {
    const next = config.thresholdRules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    onChange({ ...config, thresholdRules: next })
  }

  function removeRule(index: number) {
    onChange({ ...config, thresholdRules: config.thresholdRules.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <p className="text-xs mb-2" style={{ color: TEXT_MUTED }}>Color by</p>

      <div
        className="flex p-0.5 rounded-md mb-3"
        style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
      >
        <button
          onClick={() => setMode("category")}
          className="flex-1 text-xs py-1 rounded"
          style={{
            background: config.mode === "category" ? ACCENT : "transparent",
            color: config.mode === "category" ? ACCENT_TEXT : TEXT_MUTED,
          }}
        >
          Category
        </button>
        <button
          onClick={() => setMode("threshold")}
          className="flex-1 text-xs py-1 rounded"
          style={{
            background: config.mode === "threshold" ? ACCENT : "transparent",
            color: config.mode === "threshold" ? ACCENT_TEXT : TEXT_MUTED,
          }}
        >
          Y value
        </button>
      </div>

      {config.mode === "category" ? (
        <>
          <select
            value={config.colorBy}
            onChange={e => setColorBy(e.target.value)}
            className="w-full rounded-md px-2.5 py-1.5 text-sm mb-3"
            style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG }}
          >
            <option value="">None</option>
            {categoricalColumns.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex flex-col gap-2">
            {values.map((v, i) => (
              <label key={v} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: TEXT_STRONG }}>
                <input
                  type="color"
                  value={getCategoryColor(config, v, i)}
                  onChange={e => setCategoryColor(v, e.target.value)}
                  className="w-4 h-4 rounded-full cursor-pointer p-0 border-0"
                />
                {v}
              </label>
            ))}
          </div>

          {config.colorBy && (
            <button
              onClick={resetCategoryColors}
              className="text-xs mt-2.5"
              style={{ color: TEXT_MUTED }}
            >
              Reset colors
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-2.5">
            {config.thresholdRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={rule.color}
                  onChange={e => updateRule(i, { color: e.target.value })}
                  className="w-3.5 h-3.5 rounded-full cursor-pointer p-0 border-0 shrink-0"
                />
                <select
                  value={rule.op}
                  onChange={e => updateRule(i, { op: e.target.value as ThresholdOp })}
                  className="text-xs rounded px-1.5 py-1"
                  style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG, width: 78 }}
                >
                  {(Object.keys(OP_LABELS) as ThresholdOp[]).map(op => (
                    <option key={op} value={op}>{OP_LABELS[op]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={rule.value}
                  onChange={e => updateRule(i, { value: parseFloat(e.target.value) || 0 })}
                  className="text-xs rounded px-1.5 py-1"
                  style={{ border: `1px solid ${FIELD_BORDER}`, background: FIELD_BG, width: 56 }}
                />
                <button
                  onClick={() => removeRule(i)}
                  aria-label="Remove rule"
                  className="text-xs px-1"
                  style={{ color: TEXT_MUTED }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addRule}
            className="w-full text-xs py-1.5 rounded-md"
            style={{ border: `1px solid ${FIELD_BORDER}`, color: TEXT_STRONG }}
          >
            + Add rule
          </button>
          <p className="text-xs leading-relaxed mt-2.5" style={{ color: TEXT_MUTED }}>
            Rules apply top to bottom; the first match wins.
          </p>
        </>
      )}
    </div>
  )
}