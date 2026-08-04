import { useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import ChartBuilder from "../components/ChartPage/ChartBuilder"
import type { ChartBuilderHandle } from "../components/ChartPage/ChartBuilder"
import type { Block } from "../types/Block"

export default function ChartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dataset = location.state?.dataset
  const initialConfig = location.state?.initialChartConfig
  // present only when we arrived here from ProjectPage's "set up this graph" flow
  const projectId: number | undefined = location.state?.projectId
  const blockId: string | undefined = location.state?.blockId
  const chartBuilderRef = useRef<ChartBuilderHandle>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!dataset) {
    navigate("/")
    return null
  }

  async function handleSaveToBlock() {
    if (!chartBuilderRef.current || !projectId || !blockId) return
    setSaving(true)
    setSaveError(null)
    try {
      // read-modify-write: fetch the project's current blocks, swap in the
      // updated graph block by id, PATCH the whole array back. Simpler than
      // a dedicated single-block endpoint and avoids the frontend needing
      // to track the rest of the doc while off on the chart page.
      const { data: project } = await api.get(`/projects/${projectId}`)
      const snapshot = chartBuilderRef.current.getSnapshot()
      const updatedBlock: Block = {
        id: blockId,
        type: "graph",
        file_id: dataset.file_id,
        filename: dataset.filename,
        chart_config: snapshot,
      }
      const existingBlocks: Block[] = project.blocks ?? []
      const found = existingBlocks.some((b: Block) => b.id === blockId)
      const nextBlocks = found
        ? existingBlocks.map((b: Block) => (b.id === blockId ? updatedBlock : b))
        : [...existingBlocks, updatedBlock]

      await api.patch(`/projects/${projectId}/blocks`, { blocks: nextBlocks })
      navigate(`/project/${projectId}`)
    } catch {
      setSaveError("Failed to save — check your backend is running.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddToProject() {
    if (!chartBuilderRef.current || !dataset?.file_id) {
      window.alert("This chart isn't attached to a file yet — can't save it.")
      return
    }
    // TODO: swap window.prompt for a real "save project" modal
    const name = window.prompt("Name this project:")
    if (!name) return

    setSaving(true)
    setSaveError(null)
    try {
      const snapshot = chartBuilderRef.current.getSnapshot()
      const block: Block = {
        id: crypto.randomUUID(),
        type: "graph",
        file_id: dataset.file_id,
        filename: dataset.filename,
        chart_config: snapshot,
      }
      const { data: project } = await api.post("/projects/", {
        name,
        blocks: [block],
      })
      navigate(`/project/${project.id}`)
    } catch {
      setSaveError("Failed to save project — check your backend is running.")
    } finally {
      setSaving(false)
    }
  }

  const isBlockMode = Boolean(projectId && blockId)

  return (
    <div className="w-full min-h-screen px-6 py-8" style={{ background: "#F7F4F3" }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigate("/preview", { state: { dataset, projectId, blockId } })}
          style={{ fontSize: 12, color: "#5F7B94", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Back to preview
        </button>

        <div className="flex items-center gap-2">
          {saveError && <span style={{ fontSize: 11, color: "#e24b4a" }}>{saveError}</span>}
          <button
            onClick={() => chartBuilderRef.current?.exportChart()}
            className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5"
            style={{ color: "#5F7B94", background: "#fff", border: "1px solid #E8EFF4", cursor: "pointer" }}
          >
            Export chart
          </button>
          <button
            onClick={isBlockMode ? handleSaveToBlock : handleAddToProject}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5"
            style={{
              color: "#F7F4F3", background: "#5F7B94", border: "none",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : isBlockMode ? "Save to project" : "Add to project"}
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