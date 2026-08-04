// pages/ProjectPage.tsx
// The page a user lands on after "New Project". Route is either
// /project/new (creates a project immediately, then redirects to its id)
// or /project/:id (loads an existing one). Blocks autosave on change.
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../lib/api"
import BlockPicker from "../components/Project/BlockPicker"
import TextBlockView from "../components/Project/TextBlockView"
import GraphBlockView from "../components/Project/GraphBlockView"
import { type Block, makeTextBlock, makeGraphBlock } from "../types/Block"

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
    // TODO: open a picker over GET /projects/graphs and set source_project_id
    // + source_block_id on the resulting block once one is chosen, pointing
    // at the same stored image/stats instead of capturing a new one.
    insertAt(index, makeGraphBlock())
  }

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Loading…</p>
      </div>
    )
  }

  return (
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
        />
      ) : (
        <div>
          <BlockPicker
            onAddText={() => insertAt(0, makeTextBlock())}
            onAddNewGraph={() => handleAddNewGraph(0)}
            onAddPastGraph={() => handleAddPastGraph(0)}
          />
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
                  />
                )}
              </div>
              <BlockPicker
                onAddText={() => insertAt(i + 1, makeTextBlock())}
                onAddNewGraph={() => handleAddNewGraph(i + 1)}
                onAddPastGraph={() => handleAddPastGraph(i + 1)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  onAddText,
  onAddNewGraph,
  onAddPastGraph,
}: {
  onAddText: () => void
  onAddNewGraph: () => void
  onAddPastGraph: () => void
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
      <div style={{ width: 240 }}>
        <BlockPicker
          onAddText={onAddText}
          onAddNewGraph={onAddNewGraph}
          onAddPastGraph={onAddPastGraph}
        />
      </div>
    </div>
  )
}