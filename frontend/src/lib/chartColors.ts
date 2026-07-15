// shared palette derived from the Business Blue theme, used across all chart components
export const CHART_COLORS = [
  "#5F7B94", "#324E66", "#9DB6C9", "#3D5F78", "#7C97AC", "#243A4D",
]

export const PANEL_BG = "#F7F4F3"
export const FIELD_BORDER = "#E8EFF4"
export const FIELD_BG = "#FFFFFF"
export const TEXT_MUTED = "#5F7B94"
export const TEXT_STRONG = "#324E66"
export const ACCENT = "#5F7B94"
export const ACCENT_TEXT = "#F7F4F3"
export const CANVAS_BORDER = "#9DB6C9"

// --- color-by config, shared between the ChartColor panel and every chart view ---

export type ColorMode = "category" | "threshold"
export type ThresholdOp = "over" | "under" | "eq"

export interface ThresholdRule {
  op: ThresholdOp
  value: number
  color: string
}

export interface ColorConfig {
  mode: ColorMode
  colorBy: string
  customColors: Record<string, string>
  thresholdRules: ThresholdRule[]
}

export const DEFAULT_COLOR_CONFIG: ColorConfig = {
  mode: "category",
  colorBy: "",
  customColors: {},
  thresholdRules: [],
}

// resolve the color for one category value, honoring any user override
export function getCategoryColor(config: ColorConfig, value: string, index: number): string {
  const key = `${config.colorBy}:${value}`
  return config.customColors[key] ?? CHART_COLORS[index % CHART_COLORS.length]
}

// resolve the color for a numeric y value against the threshold rules,
// first match wins (rules are ordered top to bottom)
export function getThresholdColor(config: ColorConfig, y: number, fallback: string = CHART_COLORS[2]): string {
  for (const rule of config.thresholdRules) {
    if (rule.op === "over" && y > rule.value) return rule.color
    if (rule.op === "under" && y < rule.value) return rule.color
    if (rule.op === "eq" && y === rule.value) return rule.color
  }
  return fallback
}