// lib/exportDocx.ts
import { Document, ImageRun, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"
import { api } from "./api"
import type { Block } from "../types/Block"

// mirrors the site's palette/type scale (see lib/chartColors.ts) — docx has
// no concept of "inherit the page's CSS," every run needs its size/color
// spelled out explicitly or it falls back to Word's built-in Normal/Title
// styles, which is what was making everything render oversized
const NAVY       = "243B53"
const TEXT_MUTED = "5F7B94"

// sizes are in half-points (docx's unit) — roughly px / 1.33
const TITLE_SIZE = 48 // ~24pt, matches the site's 34px doc title reasonably
const NAME_SIZE  = 22 // ~11pt, matches graph block names
const BODY_SIZE  = 24 // ~12pt, matches the site's 16px body text
const STATS_SIZE = 18 // ~9pt, small caption text

async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await api.get(url, { responseType: "arraybuffer" })
  return res.data
}

// docx needs explicit pixel dimensions for every embedded image — there's
// no "auto" sizing. Load the buffer into an <img> just to read its natural
// width/height, then scale proportionally so charts keep their real aspect
// ratio instead of being stretched into a fixed box.
const MAX_IMAGE_WIDTH = 500

async function getScaledDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number }> {
  const blob = new Blob([buffer], { type: "image/png" })
  const objectUrl = URL.createObjectURL(blob)
  try {
    const { naturalWidth, naturalHeight } = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = objectUrl
    })
    const scale = Math.min(1, MAX_IMAGE_WIDTH / naturalWidth)
    return {
      width: Math.round(naturalWidth * scale),
      height: Math.round(naturalHeight * scale),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// Builds a real Word document from the block data (not a screenshot) —
// text blocks become paragraphs, graph blocks embed the chart image plus a
// short line per column of stats.
export async function exportProjectAsDocx(name: string, blocks: Block[]) {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: name, bold: true, size: TITLE_SIZE, font: "Georgia", color: NAVY }),
      ],
      spacing: { after: 300 },
    }),
  ]

  for (const block of blocks) {
    if (block.type === "text") {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: block.content || "", size: BODY_SIZE, color: NAVY })],
          spacing: { after: 200 },
        })
      )
      continue
    }

    // graph block
    if (block.name) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: block.name, bold: true, size: NAME_SIZE, color: NAVY })],
          spacing: { after: 100 },
        })
      )
    }

    if (block.image_url) {
      try {
        const buffer = await fetchImageBuffer(block.image_url)
        const { width, height } = await getScaledDimensions(buffer)
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width, height },
                // captured chart snapshots are always PNG (see ChartPage's
                // "chart.png" upload) — the image URL itself has no file
                // extension to sniff, since it's served by route, not path
                type: "png",
              }),
            ],
            spacing: { after: 150 },
          })
        )
      } catch {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "[Could not load chart image]", size: BODY_SIZE, color: TEXT_MUTED })],
            spacing: { after: 200 },
          })
        )
      }
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "(Graph not configured)", italics: true, size: BODY_SIZE, color: TEXT_MUTED })],
          spacing: { after: 200 },
        })
      )
    }

    if (block.stats) {
      for (const [col, s] of Object.entries(block.stats)) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${col} — mean ${s.mean}, median ${s.median}, sd ${s.sd}, min ${s.min}, max ${s.max}`,
                size: STATS_SIZE,
                color: TEXT_MUTED,
              }),
            ],
            spacing: { after: 100 },
          })
        )
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${name}.docx`)
}