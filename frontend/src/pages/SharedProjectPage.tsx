// pages/SharedProjectPage.tsx
// Rendered at /shared/:token — this route must NOT be behind your auth
// guard, since the whole point is that no login is required.
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../lib/api"
import TextBlockView from "../components/Project/TextBlockView"
import GraphBlockView from "../components/Project/GraphBlockView"
import { type Block } from "../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"

export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [name, setName] = useState("")
  const [blocks, setBlocks] = useState<Block[]>([])
  const [permission, setPermission] = useState<"view" | "edit" | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    api
      .get(`/shared/${token}`)
      .then(({ data }) => {
        setName(data.name)
        setBlocks(data.blocks ?? [])
        setPermission(data.permission)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [token])

  // autosave, only when the link grants edit access
  useEffect(() => {
    if (status !== "ready" || permission !== "edit") return
    const t = setTimeout(() => {
      api.patch(`/shared/${token}/blocks`, { blocks }).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [blocks, status, permission, token])

  if (status === "loading") return <Centered text="Loading…" />
  if (status === "error") return <Centered text="This link isn't active anymore." />

  const editable = permission === "edit"

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, color: NAVY }}>{name}</h1>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>
          {editable ? "You can edit this" : "View only"}
        </span>
      </div>
      {blocks.map(block => (
        <div key={block.id} className="py-2">
          {block.type === "text" ? (
            <TextBlockView
              block={block}
              onChange={content =>
                editable &&
                setBlocks(prev => prev.map(b => (b.id === block.id ? ({ ...b, content } as Block) : b)))
              }
              onRemove={() => {}}
              readOnly={!editable}
            />
          ) : (
            <GraphBlockView
              block={block}
              onConfigure={() => {}}
              onRemove={() => {}}
              onRename={() => {}}
              readOnly={!editable}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Centered({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm" style={{ color: TEXT_MUTED }}>{text}</p>
    </div>
  )
}