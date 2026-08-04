import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import ChartTypeIcon from "../components/ChartPage/ChartTypeIcon"
import type { Block, GraphBlockData } from "../types/Block"

interface Project {
  id: number
  name: string
  blocks: Block[]
  created_at: number
  updated_at: number
}

const PANEL_BG     = "#F7F4F3"
const FIELD_BORDER = "#E8EFF4"
const TEXT_MUTED   = "#5F7B94"
const TEXT_STRONG  = "#324E66"
const ACCENT       = "#5F7B94"

// the card thumbnail shows the first configured graph block, since a
// project can now hold several — this is just a representative preview,
// not "the" chart for the project
function firstConfiguredGraph(project: Project): GraphBlockData | undefined {
  return project.blocks.find(
    (b): b is GraphBlockData => b.type === "graph" && Boolean(b.chart_config)
  )
}

function graphBlockCount(project: Project): number {
  return project.blocks.filter(b => b.type === "graph").length
}

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get("/projects/")
      setProjects(res.data.projects)
    } catch {
      setError("Couldn't load projects — check your backend is running.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, projectId: number) {
    e.stopPropagation()
    if (!window.confirm("Delete this project?")) return
    try {
      await api.delete(`/projects/${projectId}`)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch {
      window.alert("Failed to delete project.")
    }
  }

  function handleOpen(project: Project) {
    // a project is a multi-block doc now, not a single chart — open the
    // doc editor and let the user click into whichever block they want
    navigate(`/project/${project.id}`)
  }

  function handleLogout() {
    logout()
    navigate("/")
  }

  function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    })
  }

  return (
    <div className="w-full min-h-screen px-8 py-8" style={{ background: PANEL_BG }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: TEXT_STRONG }}>Workspace</h1>
          {user && (
            <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>
              Welcome, {user.first_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/project/new")}
            className="text-xs rounded-lg px-3 py-1.5"
            style={{ color: "#fff", background: ACCENT, border: "none", cursor: "pointer" }}
          >
            + New project
          </button>
          <button
            onClick={handleLogout}
            className="text-xs rounded-lg px-3 py-1.5"
            style={{ color: TEXT_MUTED, background: "#fff", border: `1px solid ${FIELD_BORDER}`, cursor: "pointer" }}
          >
            Log out
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Loading projects…</p>
      )}

      {error && (
        <p className="text-sm" style={{ color: "#C24444" }}>{error}</p>
      )}

      {!loading && !error && projects.length === 0 && (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: "#fff", border: `1px dashed ${FIELD_BORDER}` }}
        >
          <p className="text-sm mb-1" style={{ color: TEXT_STRONG }}>No saved projects yet</p>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            Click "+ New project" to start a doc and add your first graph.
          </p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {projects.map(project => {
            const previewGraph = firstConfiguredGraph(project)
            const graphCount = graphBlockCount(project)
            return (
              <div
                key={project.id}
                onClick={() => handleOpen(project)}
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{ background: "#fff", border: `1px solid ${FIELD_BORDER}` }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ height: 120, background: PANEL_BG, borderBottom: `1px solid ${FIELD_BORDER}` }}
                >
                  {previewGraph?.chart_config ? (
                    <ChartTypeIcon type={previewGraph.chart_config.chart_type} className="w-10 h-10" />
                  ) : (
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>
                      {project.blocks.length === 0 ? "Empty" : "No graphs yet"}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: TEXT_STRONG }}
                      title={project.name}
                    >
                      {project.name}
                    </p>
                    <button
                      onClick={e => handleDelete(e, project.id)}
                      aria-label="Delete project"
                      className="text-xs shrink-0"
                      style={{ color: TEXT_MUTED, background: "none", border: "none", cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: TEXT_MUTED }}>
                    {graphCount === 0 ? "No graphs" : `${graphCount} graph${graphCount !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                    Updated {formatDate(project.updated_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}