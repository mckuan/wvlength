// pages/ProjectPage.tsx
// The page a user lands on after "New Project": starts blank, and lets
// them build up the doc one block at a time (text / new graph / past graph).
// Persistence to the backend isn't wired yet — this is the editor shell.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import BlockPicker from "../components/Project/BlockPicker"
import TextBlockView from "../components/Project/TextBlockView"
import GraphBlockView from "../components/Project/GraphBlockView"
import { type Block, makeTextBlock, makeGraphBlock } from "../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"

export default function ProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("Untitled project")
  const [blocks, setBlocks] = useState<Block[]>([])

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

  function handleAddNewGraph(index: number) {
    // TODO: route into the existing upload → chart flow, then write the
    // resulting file_id/chart_config back onto this block instead of
    // navigating away outright.
    insertAt(index, makeGraphBlock())
  }

  function handleAddPastGraph(index: number) {
    // TODO: open a picker over the user's saved projects/graphs and set
    // source_project_id on the resulting block once one is chosen.
    insertAt(index, makeGraphBlock())
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      {/* title */}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full outline-none bg-transparent mb-10"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 34,
          fontWeight: 500,
          color: NAVY,
          border: "none",
        }}
      />

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
                    onConfigure={() => navigate("/upload", { state: { returnToProject: true } })}
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