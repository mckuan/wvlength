// types/blocks.ts
// Shared shape for everything that can live inside a project doc.
// Mirrors the backend direction: a Project will hold an ordered `blocks[]`
// instead of a single file_id + chart_config.

import type { ChartConfigSnapshot } from "../components/ChartPage/ChartBuilder"

export type BlockType = "text" | "graph"

export interface TextBlockData {
  id: string
  type: "text"
  content: string
}

export interface GraphBlockData {
  id: string
  type: "graph"
  // set once the user finishes the "new graph" or "past graph" flow;
  // undefined means this block is still an empty placeholder
  file_id?: string
  filename?: string
  chart_config?: ChartConfigSnapshot
  // present only when this block reuses a graph saved on another project,
  // rather than defining its own chart_config
  source_project_id?: number
}

export type Block = TextBlockData | GraphBlockData

export function makeTextBlock(): TextBlockData {
  return { id: crypto.randomUUID(), type: "text", content: "" }
}

export function makeGraphBlock(): GraphBlockData {
  return { id: crypto.randomUUID(), type: "graph" }
}