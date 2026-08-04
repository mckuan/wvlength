// types/blocks.ts
// Shared shape for everything that can live inside a project doc.
// Graph blocks are snapshots: a captured chart image + summary stats,
// not a live chart_config — there's no "reconfigure in place," a user who
// wants a different chart just makes a new block.

export type BlockType = "text" | "graph"

export interface TextBlockData {
  id: string
  type: "text"
  content: string
}

export interface ColumnStats {
  min: number
  max: number
  mean: number
  median: number
  sd: number
  count: number
}

export interface GraphBlockData {
  id: string
  type: "graph"
  // editable by the user; auto-generated at capture time from the source
  // file, axes, and date (see lib/graphNaming.ts), but not re-derived after
  name?: string
  // all set together once the "new graph" or "past graph" flow finishes;
  // undefined chart_type means this block is still an empty placeholder
  chart_type?: string
  image_url?: string
  stats?: Record<string, ColumnStats>
  created_at?: number
  // present only when this block reuses a snapshot saved on another
  // project's block, rather than capturing its own
  source_project_id?: number
  source_block_id?: string
}

export type Block = TextBlockData | GraphBlockData

export function makeTextBlock(): TextBlockData {
  return { id: crypto.randomUUID(), type: "text", content: "" }
}

export function makeGraphBlock(): GraphBlockData {
  return { id: crypto.randomUUID(), type: "graph" }
}