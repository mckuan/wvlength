// lib/graphNaming.ts
// Builds the default name for a captured graph block:
//   {filename} — {chart type} — {x axis} vs {y axis}[ vs {z axis}] — {date}
// with a trailing " (n)" if the exact same combination already exists,
// so two graphs made from the same file/type/axes/day stay distinguishable.

export interface GraphNameInput {
  filename: string
  chartType?: string
  xAxis?: string
  yColumns?: string[]
  zAxis?: string
  createdAt: number // unix seconds
  existingNames: string[]
}

export function buildDefaultGraphName(input: GraphNameInput): string {
  const { filename, chartType, xAxis, yColumns, zAxis, createdAt, existingNames } = input

  const dateLabel = new Date(createdAt * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  const yLabel = yColumns && yColumns.length > 0 ? yColumns.join(", ") : undefined
  const axisParts = [xAxis, yLabel, zAxis].filter(Boolean)
  const axisLabel = axisParts.join(" vs ")

  const nameParts = [filename, chartType, axisLabel].filter(Boolean)
  const base = `${nameParts.join(" — ")} — ${dateLabel}`

  // count exact matches or numbered variants of this same base name
  const collisions = existingNames.filter(n => n === base || n.startsWith(`${base} (`)).length

  return collisions === 0 ? base : `${base} (${collisions + 1})`
}