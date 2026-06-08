import { useState } from "react"

export interface AxisConfig {
  yMin: string
  yMax: string
  yTickInterval: string
  xTickInterval: string
}

export interface StyleConfig {
  mode: "none" | "threshold" | "category" | "textmatch"
  // threshold
  threshold: string
  aboveColor: string
  belowColor: string
  // category
  categoryCol: string
  // text match
  matchText: string
  matchColor: string
  defaultColor: string
}

interface Props {
  axisConfig: AxisConfig
  styleConfig: StyleConfig
  columns: { name: string; type: string }[]
  onAxisChange: (config: AxisConfig) => void
  onStyleChange: (config: StyleConfig) => void
}

const TABS = ["Axes", "Style"]

export default function ChartOptions({
  axisConfig,
  styleConfig,
  columns,
  onAxisChange,
  onStyleChange,
}: Props) {
  const [activeTab, setActiveTab] = useState("Axes")

  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-4">

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors
              ${activeTab === tab
                ? "bg-gray-900 text-white border-gray-900"
                : "text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Axes tab */}
      {activeTab === "Axes" && (
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Min</label>
            <input
              type="number"
              value={axisConfig.yMin}
              onChange={e => onAxisChange({ ...axisConfig, yMin: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Max</label>
            <input
              type="number"
              value={axisConfig.yMax}
              onChange={e => onAxisChange({ ...axisConfig, yMax: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y Tick Interval</label>
            <input
              type="number"
              value={axisConfig.yTickInterval}
              onChange={e => onAxisChange({ ...axisConfig, yTickInterval: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">X Tick Interval</label>
            <input
              type="number"
              value={axisConfig.xTickInterval}
              onChange={e => onAxisChange({ ...axisConfig, xTickInterval: e.target.value })}
              placeholder="auto"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            />
          </div>
        </div>
      )}

      {/* Style tab */}
      {activeTab === "Style" && (
        <div className="flex flex-col gap-4">

          {/* Mode selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Color Mode</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "none",       label: "None" },
                { value: "threshold",  label: "Value Threshold" },
                { value: "category",   label: "By Category" },
                { value: "textmatch",  label: "Text Match" },
              ].map(m => (
                <button
                  key={m.value}
                  onClick={() => onStyleChange({ ...styleConfig, mode: m.value as StyleConfig["mode"] })}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors
                    ${styleConfig.mode === m.value
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold options */}
          {styleConfig.mode === "threshold" && (
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Threshold</label>
                <input
                  type="number"
                  value={styleConfig.threshold}
                  onChange={e => onStyleChange({ ...styleConfig, threshold: e.target.value })}
                  placeholder="e.g. 85"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Above color</label>
                <input
                  type="color"
                  value={styleConfig.aboveColor}
                  onChange={e => onStyleChange({ ...styleConfig, aboveColor: e.target.value })}
                  className="h-9 w-16 rounded border border-gray-200 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Below color</label>
                <input
                  type="color"
                  value={styleConfig.belowColor}
                  onChange={e => onStyleChange({ ...styleConfig, belowColor: e.target.value })}
                  className="h-9 w-16 rounded border border-gray-200 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Category options */}
          {styleConfig.mode === "category" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color by column</label>
              <select
                value={styleConfig.categoryCol}
                onChange={e => onStyleChange({ ...styleConfig, categoryCol: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {columns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Text match options */}
          {styleConfig.mode === "textmatch" && (
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">If label contains</label>
                <input
                  type="text"
                  value={styleConfig.matchText}
                  onChange={e => onStyleChange({ ...styleConfig, matchText: e.target.value })}
                  placeholder='e.g. "Research"'
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Match color</label>
                <input
                  type="color"
                  value={styleConfig.matchColor}
                  onChange={e => onStyleChange({ ...styleConfig, matchColor: e.target.value })}
                  className="h-9 w-16 rounded border border-gray-200 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default color</label>
                <input
                  type="color"
                  value={styleConfig.defaultColor}
                  onChange={e => onStyleChange({ ...styleConfig, defaultColor: e.target.value })}
                  className="h-9 w-16 rounded border border-gray-200 cursor-pointer"
                />
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}