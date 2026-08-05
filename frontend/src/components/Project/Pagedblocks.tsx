// components/Project/PagedBlocks.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import TextBlockView from "./TextBlockView"
import GraphBlockView from "./GraphBlockView"
import type { Block } from "../../types/Block"

const NAVY       = "#243B53"
const TEXT_MUTED = "#5F7B94"
const BORDER     = "#E8EFF4"

// Roughly a US Letter aspect ratio, scaled down to fit comfortably in the
// content column. This is a JS approximation of pagination (not a real print
// engine) — it measures each block's rendered height and greedily packs
// blocks onto pages, leaving a gap between pages to read as separate sheets.
const PAGE_WIDTH    = 680
const PAGE_HEIGHT   = 880
const PAGE_PADDING  = 56
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2
const BLOCK_GAP     = 16
const TITLE_RESERVED_HEIGHT = 64 // space reserved for the project title on page 1

interface PagedBlocksProps {
  name: string
  blocks: Block[]
}

function renderBlock(block: Block) {
  return block.type === "text" ? (
    <TextBlockView block={block} onChange={() => {}} onRemove={() => {}} readOnly />
  ) : (
    <GraphBlockView block={block} onConfigure={() => {}} onRemove={() => {}} onRename={() => {}} readOnly />
  )
}

// Measures each block's rendered height using a hidden layer that always
// renders every block flatly (same parent, stable key order), so blocks are
// never unmounted/remounted as pagination reshuffles them into pages. That
// decoupling is what lets ResizeObserver keep tracking a block's real height
// even after its async content (e.g. a graph image) finishes loading in.
function useBlockHeights(blocks: Block[]) {
  const [heights, setHeights] = useState<Record<string, number>>({})
  const elsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const observersRef = useRef<Record<string, ResizeObserver>>({})

  useEffect(() => {
    const currentIds = new Set(blocks.map(b => b.id))

    // stop observing blocks that no longer exist
    Object.keys(observersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        observersRef.current[id].disconnect()
        delete observersRef.current[id]
      }
    })

    // start observing any new blocks we haven't attached yet
    blocks.forEach(block => {
      if (observersRef.current[block.id]) return
      const el = elsRef.current[block.id]
      if (!el) return
      const ro = new ResizeObserver(entries => {
        const h = entries[0].contentRect.height
        setHeights(prev => (prev[block.id] === h ? prev : { ...prev, [block.id]: h }))
      })
      ro.observe(el)
      observersRef.current[block.id] = ro
    })

    return () => {
      Object.values(observersRef.current).forEach(ro => ro.disconnect())
      observersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  function setRef(id: string) {
    return (el: HTMLDivElement | null) => {
      elsRef.current[id] = el
    }
  }

  return { heights, setRef }
}

function packPages(blocks: Block[], heights: Record<string, number>): Block[][] {
  const maxContentHeight = PAGE_HEIGHT - PAGE_PADDING * 2
  const pages: Block[][] = [[]]
  let currentHeight = TITLE_RESERVED_HEIGHT

  for (const block of blocks) {
    // unmeasured blocks (before the hidden layer reports in) count as 0
    // height — they'll reflow onto the correct page once real sizes arrive
    const h = heights[block.id] ?? 0
    const projected = currentHeight === 0 ? h : currentHeight + BLOCK_GAP + h

    if (projected > maxContentHeight && pages[pages.length - 1].length > 0) {
      pages.push([block])
      currentHeight = h
    } else {
      pages[pages.length - 1].push(block)
      currentHeight = projected
    }
  }

  return pages
}

export default function PagedBlocks({ name, blocks }: PagedBlocksProps) {
  const { heights, setRef } = useBlockHeights(blocks)
  const pages = useMemo(() => packPages(blocks, heights), [blocks, heights])

  return (
    <>
      {/* hidden measurement layer — always flat, always mounted, never reshuffled */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          visibility: "hidden",
          pointerEvents: "none",
          width: CONTENT_WIDTH,
          zIndex: -1,
        }}
      >
        {blocks.map(block => (
          <div key={block.id} ref={setRef(block.id)} style={{ paddingBottom: BLOCK_GAP }}>
            {renderBlock(block)}
          </div>
        ))}
      </div>

      {/* visible, paginated layer — purely presentational, no refs needed */}
      <div className="flex flex-col items-center gap-10 py-4">
        {pages.map((pageBlocks, pageIndex) => (
          <div
            key={pageIndex}
            className="relative bg-white overflow-hidden"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              padding: PAGE_PADDING,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 1px 3px rgba(36, 59, 83, 0.08), 0 16px 32px rgba(36, 59, 83, 0.10)",
            }}
          >
            {pageIndex === 0 && (
              <h1
                className="mb-6"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 28,
                  fontWeight: 500,
                  color: NAVY,
                }}
              >
                {name}
              </h1>
            )}

            {pageBlocks.map(block => (
              <div key={block.id} style={{ paddingBottom: BLOCK_GAP }}>
                {renderBlock(block)}
              </div>
            ))}

            {blocks.length === 0 && pageIndex === 0 && (
              <p className="text-sm" style={{ color: TEXT_MUTED }}>This project is empty.</p>
            )}

            <span
              className="absolute text-xs"
              style={{ bottom: 18, right: PAGE_PADDING, color: TEXT_MUTED }}
            >
              {pageIndex + 1} / {pages.length}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}