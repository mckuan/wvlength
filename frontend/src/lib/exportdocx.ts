// lib/exportDocx.ts
// Builds a Word document from the project name + blocks, then triggers download
import { Document, ImageRun, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"
import { api } from "./api"
import type { Block } from "../types/Block"

//docx needs everything spelled out bc no concept of inherit css
const NAVY       = "243B53"
const TEXT_MUTED = "5F7B94"

const TITLE_SIZE = 48 
const NAME_SIZE  = 22 
const BODY_SIZE  = 24 
const STATS_SIZE = 18 


//graph blocks store a snapshot of the chart (PNG) + summary stats, not the live chart config.
async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await api.get(url, { responseType: "arraybuffer" })
  return res.data
}

// docx needs explicit pixel dimensions for every embedded image 
const MAX_IMAGE_WIDTH = 500

//bc docx doesn't know the natural dimensions of an image, 
// we have to load it in memory and check its naturalWidth/naturalHeight
// then scale down if it's too wide.
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

// Builds a real Word document from going through blocks array, manually constructs word document primitives
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