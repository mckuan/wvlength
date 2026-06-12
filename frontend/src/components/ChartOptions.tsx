// settings panel for chart options like axis limits, color modes, etc.
import { useState } from "react"


//chart axis behavior config
export interface AxisConfig {
  yMin: string
  yMax: string
  yTickInterval: string
  binSize: string
}

//chart properties
interface Props {
  axisConfig: AxisConfig
  xIsNumeric: boolean  
  columns: { name: string; type: string }[]
  onAxisChange: (config: AxisConfig) => void
}

const TABS = ["Axes", "Summary"]

//settings componenet
export default function ChartOptions({
  axisConfig,
  xIsNumeric,
  columns,
  onAxisChange,
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
        {xIsNumeric && (
            <div>
                <label className="block text-xs text-gray-500 mb-1">Bin Size</label>
                <input
                type="number"
                value={axisConfig.binSize}
                onChange={e => onAxisChange({ ...axisConfig, binSize: e.target.value })}
                placeholder="auto"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
                />
            </div>
        )}
        </div>
      )}   
    </div>
  )
}