// lib/exportPdf.ts
//exports a pdf by screenshotting what is currently rendered in Page View (each page is tagged with data-pdf-page)
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const LETTER_WIDTH_IN = 8.5
const LETTER_HEIGHT_IN = 11

// Should be called after Page View rendered, essentailly a giant screenshot of the page view
export async function exportPagedBlocksAsPdf(filename: string) {
  const container = document.getElementById("paged-blocks-export-root")
  if (!container) {
    throw new Error("Page View isn't mounted yet — switch to Page View before exporting.")
  }

  const pageEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-page]"))
  if (pageEls.length === 0) {
    throw new Error("No pages to export.")
  }

  const pdf = new jsPDF({ unit: "in", format: "letter" })

  for (let i = 0; i < pageEls.length; i++) {
    // scale: 2 for a crisper raster than 1:1 CSS pixels
    const canvas = await html2canvas(pageEls[i], { scale: 2, backgroundColor: "#ffffff" })
    const imgData = canvas.toDataURL("image/png")
    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, "PNG", 0, 0, LETTER_WIDTH_IN, LETTER_HEIGHT_IN)
  }

  pdf.save(`${filename}.pdf`)
}