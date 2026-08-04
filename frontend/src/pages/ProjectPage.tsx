// pages/ProjectPage.tsx
// The page a user lands on after "New Project". Route is either
// /project/new (creates a project immediately, then redirects to its id)
// or /project/:id (loads an existing one). Blocks autosave on change.
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../lib/api"
import Sidebar from "../components/Project/sidebar"
import BlockPicker from "../components/Project/BlockPicker"
import PastGraphPicker, { type PastGraphEntry } from "../components/Project/PastGraphPicker"
import TextBlockView from "../components/Project/TextBlockView"
import GraphBlockView from "../components/Project/GraphBlockView"
import { type Block, type GraphBlockData, makeTextBlock, makeGraphBlock } from "../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"

type SaveStatus = "idle" | "saving" | "saved" | "error"

export default function ProjectPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [projectId, setProjectId] = useState<number | null>(null)
  const [name, setName] = useState("Untitled project")
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [pastGraphPickerIndex, setPastGraphPickerIndex] = useState<number | null>(null)

  // load or create the project on mount / when the route id changes
  useEffect(() => {
    let cancelled = false
    setLoaded(false)

    async function init() {
      if (!id || id === "new") {
        const { data } = await api.post("/projects/", {
          name: "Untitled project",
          blocks: [],
        })
        if (cancelled) return
        navigate(`/project/${data.id}`, { replace: true })
        return // the redirect re-triggers this effect with the real id
      }
      const { data } = await api.get(`/projects/${id}`)
      if (cancelled) return
      setProjectId(data.id)
      setName(data.name)
      setBlocks(data.blocks ?? [])
      setLoaded(true)
    }

    init().catch(() => {
      if (!cancelled) setSaveStatus("error")
    })

    return () => {
      cancelled = true
    }
  }, [id, navigate])

  // debounced autosave — fires on any name/blocks change after the initial load
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!loaded || !projectId) return
    setSaveStatus("saving")
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      api
        .put(`/projects/${projectId}`, { name, blocks })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"))
    }, 800)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, blocks, loaded, projectId])

  function insertAt(index: number, block: Block) {
    setBlocks(prev => {
      const next = [...prev]
      next.splice(index, 0, block)
      return next
    })
  }

  function updateBlock(id: string, updater: (b: Block) => Block) {
    setBlocks(prev => prev.map(b => (b.id === id ? updater(b) : b)))
  }

  function removeBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  function goConfigureGraph(blockId: string) {
    navigate("/upload", { state: { projectId, blockId } })
  }

  function handleAddNewGraph(index: number) {
    const block = makeGraphBlock()
    insertAt(index, block)
    goConfigureGraph(block.id)
  }

  function handleAddPastGraph(index: number) {
    setPastGraphPickerIndex(index)
  }

  function handleSelectPastGraph(index: number, graph: PastGraphEntry) {
    const block: Block = {
      id: crypto.randomUUID(),
      type: "graph",
      name: graph.name,
      chart_type: graph.chart_type,
      image_url: graph.image_url,
      stats: graph.stats as GraphBlockData["stats"],
      created_at: graph.created_at,
      source_project_id: graph.project_id,
      source_block_id: graph.block_id,
    }
    insertAt(index, block)
    setPastGraphPickerIndex(null)
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {
          // TODO: wire up export
        }}
        onInviteCollaborators={() => {
          // TODO: wire up invite flow
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="max-w-3xl mx-auto px-6 py-14">
            <p className="text-sm" style={{ color: TEXT_MUTED }}>Loading…</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-14">
            {/* title + save status */}
            <div className="flex items-center justify-between mb-10">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full outline-none bg-transparent"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 34,
                  fontWeight: 500,
                  color: NAVY,
                  border: "none",
                }}
              />
              <span className="text-xs shrink-0 ml-4" style={{ color: TEXT_MUTED }}>
                {saveStatus === "saving" && "Saving…"}
                {saveStatus === "saved" && "Saved"}
                {saveStatus === "error" && "Failed to save"}
              </span>
            </div>

            {blocks.length === 0 ? (
              <EmptyState
                onAddText={() => insertAt(0, makeTextBlock())}
                onAddNewGraph={() => handleAddNewGraph(0)}
                onAddPastGraph={() => handleAddPastGraph(0)}
                pickerOpen={pastGraphPickerIndex === 0}
                onSelectPastGraph={g => handleSelectPastGraph(0, g)}
                onClosePastGraphPicker={() => setPastGraphPickerIndex(null)}
              />
            ) : (
              <div>
                <div className="relative">
                  <BlockPicker
                    onAddText={() => insertAt(0, makeTextBlock())}
                    onAddNewGraph={() => handleAddNewGraph(0)}
                    onAddPastGraph={() => handleAddPastGraph(0)}
                  />
                  {pastGraphPickerIndex === 0 && (
                    <PastGraphPicker
                      onSelect={g => handleSelectPastGraph(0, g)}
                      onClose={() => setPastGraphPickerIndex(null)}
                    />
                  )}
                </div>
                {blocks.map((block, i) => (
                  <div key={block.id}>
                    <div className="py-2">
                      {block.type === "text" ? (
                        <TextBlockView
                          block={block}
                          onChange={content => updateBlock(block.id, b => ({ ...b, content } as Block))}
                          onRemove={() => removeBlock(block.id)}
                        />
                      ) : (
                        <GraphBlockView
                          block={block}
                          onConfigure={() => goConfigureGraph(block.id)}
                          onRemove={() => removeBlock(block.id)}
                          onRename={newName => updateBlock(block.id, b => ({ ...b, name: newName } as Block))}
                        />
                      )}
                    </div>
                    <div className="relative">
                      <BlockPicker
                        onAddText={() => insertAt(i + 1, makeTextBlock())}
                        onAddNewGraph={() => handleAddNewGraph(i + 1)}
                        onAddPastGraph={() => handleAddPastGraph(i + 1)}
                      />
                      {pastGraphPickerIndex === i + 1 && (
                        <PastGraphPicker
                          onSelect={g => handleSelectPastGraph(i + 1, g)}
                          onClose={() => setPastGraphPickerIndex(null)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  onAddText,
  onAddNewGraph,
  onAddPastGraph,
  pickerOpen,
  onSelectPastGraph,
  onClosePastGraphPicker,
}: {
  onAddText: () => void
  onAddNewGraph: () => void
  onAddPastGraph: () => void
  pickerOpen: boolean
  onSelectPastGraph: (graph: PastGraphEntry) => void
  onClosePastGraphPicker: () => void
}) {
  return (
    <div
      className="flex flex-col items-center text-center rounded-2xl"
      style={{ padding: "64px 24px", border: `1px dashed ${BORDER}` }}
    >
      <p className="text-sm mb-1" style={{ color: NAVY, fontWeight: 500 }}>
        This project is empty
      </p>
      <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>
        Add a graph, some notes, or pull in a chart you've already made.
      </p>
      <div className="relative" style={{ width: 240 }}>
        <BlockPicker
          onAddText={onAddText}
          onAddNewGraph={onAddNewGraph}
          onAddPastGraph={onAddPastGraph}
        />
        {pickerOpen && (
          <PastGraphPicker onSelect={onSelectPastGraph} onClose={onClosePastGraphPicker} />
        )}
      </div>
    </div>
  )
}