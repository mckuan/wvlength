import { useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import ChartBuilder from "../components/ChartPage/ChartBuilder"
import type { ChartBuilderHandle, ChartConfigSnapshot } from "../components/ChartPage/ChartBuilder"

export default function ChartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dataset = location.state?.dataset
  const initialConfig: ChartConfigSnapshot | undefined = location.state?.initialChartConfig
  const chartBuilderRef = useRef<ChartBuilderHandle>(null)

  if (!dataset) {
    navigate("/")
    return null
  }

  return (
    <div className="w-full min-h-screen px-6 py-8" style={{ background: "#F7F4F3" }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigate("/preview", { state: { dataset } })}
          style={{ fontSize: 12, color: "#5F7B94", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Back to preview
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => chartBuilderRef.current?.exportChart()}
            className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5"
            style={{ color: "#5F7B94", background: "#fff", border: "1px solid #E8EFF4", cursor: "pointer" }}
          >
            Export chart
          </button>
          <button
            onClick={() => navigate("/workspace", { state: { dataset } })}
            className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5"
            style={{ color: "#F7F4F3", background: "#5F7B94", border: "none", cursor: "pointer" }}
          >
            Add to project
          </button>
        </div>
      </div>

      <ChartBuilder
        ref={chartBuilderRef}
        columns={dataset.columns}
        preview={dataset.preview}
        fileId={dataset.file_id}
        initialConfig={initialConfig}
      />
    </div>
  )
}