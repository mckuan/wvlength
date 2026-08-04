import { useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toBlob } from "html-to-image"
import { api } from "../lib/api"
import ChartBuilder from "../components/ChartPage/ChartBuilder"
import type { ChartBuilderHandle } from "../components/ChartPage/ChartBuilder"
import type { Block, ColumnStats } from "../types/Block"

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

  // captures the rendered chart as a PNG blob and fetches summary stats for
  // whichever numeric columns are on the y-axis — the two pieces every
  // saved graph block needs, regardless of whether it's a new project or
  // an existing block being filled in
  async function captureSnapshot() {
    const node = chartBuilderRef.current?.getChartNode()
    const snapshot = chartBuilderRef.current?.getSnapshot()
    if (!node || !snapshot) throw new Error("Chart not ready")

    const blob = await toBlob(node, { backgroundColor: "#ffffff", pixelRatio: 2 })
    if (!blob) throw new Error("Could not capture chart image")

    let stats: Record<string, ColumnStats> = {}
    if (dataset.file_id && snapshot.y_columns.length > 0) {
      const { data } = await api.post("/graph/summary", {
        file_id: dataset.file_id,
        columns: snapshot.y_columns,
      })
      stats = data.summary
    }

    return { blob, chartType: snapshot.chart_type, stats }
  }

  async function handleSaveToBlock() {
    if (!projectId || !blockId) return
    setSaving(true)
    setSaveError(null)
    try {
      const { blob, chartType, stats } = await captureSnapshot()

      const formData = new FormData()
      formData.append("file", blob, "chart.png")
      const { data: uploaded } = await api.post(
        `/projects/${projectId}/blocks/${blockId}/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )

      const updatedBlock: Block = {
        id: blockId,
        type: "graph",
        chart_type: chartType,
        image_url: uploaded.image_url,
        stats,
      }

      // read-modify-write: fetch the project's current blocks, swap in the
      // updated graph block by id, PATCH the whole array back
      const { data: project } = await api.get(`/projects/${projectId}`)
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
    // TODO: swap window.prompt for a real "save project" modal
    const name = window.prompt("Name this project:")
    if (!name) return

    setSaving(true)
    setSaveError(null)
    try {
      const { blob, chartType, stats } = await captureSnapshot()
      const newBlockId = crypto.randomUUID()

      // project needs to exist first so there's a project_id to upload the
      // image against — create it with an empty-ish placeholder block, then
      // fill the block in once the image is uploaded
      const { data: project } = await api.post("/projects/", {
        name,
        blocks: [{ id: newBlockId, type: "graph" }],
      })

      const formData = new FormData()
      formData.append("file", blob, "chart.png")
      const { data: uploaded } = await api.post(
        `/projects/${project.id}/blocks/${newBlockId}/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )

      const finishedBlock: Block = {
        id: newBlockId,
        type: "graph",
        chart_type: chartType,
        image_url: uploaded.image_url,
        stats,
      }
      await api.patch(`/projects/${project.id}/blocks`, { blocks: [finishedBlock] })
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