// pages/WelcomePage.tsx
// static landing page for now — none of the buttons do anything yet,
// that gets wired up once sign-in/sign-up routes exist

const NAVY       = "#243B53"
const NAVY_DARK  = "#1E3149"
const TEXT_MUTED = "#5F7B94"
const ACCENT     = "#7C97AC"
const BORDER     = "#E3E9F0"
const BG_TOP     = "#FFFFFF"
const BG_HERO    = "#EEF2F8"

import { useLocation, useNavigate } from "react-router-dom"

export default function WelcomePage() {
    const navigate  = useNavigate()
  return (
    <div style={{ background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_HERO} 220px, ${BG_HERO} 100%)`, minHeight: "100vh" }}>
      {/* header */}
      <header className="flex items-center justify-between px-10 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <Wordmark />
        </div>
        <div className="flex items-center gap-3">
          <button

            className="text-sm px-4 py-2 rounded-lg"
            onClick={() => navigate("/sign-in")}
            style={{ color: NAVY, background: "transparent", border: `1px solid ${BORDER}`, cursor: "pointer" }}
          >
            Sign in
          </button>
          <button
            className="text-sm font-medium px-4 py-2 rounded-lg"
            onClick={() => navigate("/sign-up")}
            style={{ color: "#fff", background: NAVY_DARK, border: "none", cursor: "pointer" }}
          >
            Get started
          </button>
        </div>
      </header>

      {/* hero */}
      <main className="flex flex-col items-center text-center px-6 pt-20 pb-14">
        <div
          className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-2 rounded-full mb-8"
          style={{ color: TEXT_MUTED, background: "#DCE6F0" }}
        >
          <BarsIcon />
          Data that speaks clearly
        </div>

        <h1
          className="max-w-3xl leading-tight mb-6"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 56, color: NAVY, fontWeight: 500 }}
        >
          Read the signal<br />
          in your <em style={{ color: ACCENT, fontStyle: "italic" }}>data</em>
        </h1>

        <p className="max-w-lg text-lg mb-9" style={{ color: TEXT_MUTED }}>
          Upload a CSV, build charts in seconds, and share insights that actually land.
        </p>

        <div className="flex items-center gap-3 mb-16">
          <button
            onClick={() => navigate("/sign-up")}
            className="text-sm font-medium px-6 py-3 rounded-lg"
            style={{ color: "#fff", background: NAVY_DARK, border: "none", cursor: "pointer" }}
          >
            Try with your data
          </button>
        </div>

        {/* live preview card */}
        <div
          className="w-full max-w-5xl rounded-2xl p-8 text-left"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}
        >
          <PreviewChart />
        </div>
      </main>
    </div>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <BarsIcon large />
      <span className="text-lg" style={{ fontFamily: "Georgia, serif" }}>
        <span style={{ color: NAVY, fontWeight: 600 }}>wv</span>
        <span style={{ color: ACCENT, fontWeight: 600 }}>length</span>
      </span>
    </div>
  )
}

function BarsIcon({ large = false }: { large?: boolean }) {
  const heights = [6, 10, 14, 10, 6]
  const w = large ? 3 : 2.5
  const gap = large ? 2.5 : 2
  const scale = large ? 1.3 : 1
  return (
    <svg width={(w + gap) * 5 * scale} height={16 * scale} viewBox={`0 0 ${(w + gap) * 5} 16`}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * (w + gap)}
          y={(16 - h) / 2}
          width={w}
          height={h}
          rx={1}
          fill={i % 2 === 0 ? NAVY : ACCENT}
        />
      ))}
    </svg>
  )
}

// purely decorative chart — hand-drawn SVG path, not real data
function PreviewChart() {
  const width = 1000
  const height = 360
  const padLeft = 50
  const padBottom = 40
  const plotTop = 20
  const plotBottom = height - padBottom
  const plotWidth = width - padLeft - 20

  const yTicks = [100, 75, 50, 25]
  const yToPixel = (v: number) => plotTop + ((100 - v) / 75) * (plotBottom - plotTop)

  const months = ["Jan", "Mar", "Jun", "Sep", "Dec"]
  const monthX = months.map((_, i) => padLeft + (i / (months.length - 1)) * plotWidth)

  // solid line: Jan, Mar, Jun, peak (before Sep), Sep, Dec
  const solidPoints = [
    { x: monthX[0], y: yToPixel(50) },
    { x: monthX[1], y: yToPixel(75) },
    { x: monthX[2], y: yToPixel(55) },
    { x: monthX[2] + (monthX[3] - monthX[2]) * 0.7, y: yToPixel(94) },
    { x: monthX[3], y: yToPixel(88) },
    { x: monthX[4], y: yToPixel(78) },
  ]
  const dashedPoints = [
    { x: monthX[0], y: yToPixel(38) },
    { x: monthX[1], y: yToPixel(50) },
    { x: monthX[2], y: yToPixel(40) },
    { x: monthX[2] + (monthX[3] - monthX[2]) * 0.7, y: yToPixel(58) },
    { x: monthX[3], y: yToPixel(60) },
    { x: monthX[4], y: yToPixel(52) },
  ]

  function smoothPath(points: { x: number; y: number }[]): string {
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const cpx = p0.x + (p1.x - p0.x) * 0.5
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }

  const solidPath = smoothPath(solidPoints)
  const dashedPath = smoothPath(dashedPoints)
  const areaPath = `${solidPath} L ${solidPoints[solidPoints.length - 1].x} ${plotBottom} L ${solidPoints[0].x} ${plotBottom} Z`

  const peak = solidPoints[3]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ overflow: "visible" }}>
      {/* gridlines + y labels */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={padLeft} x2={width - 20} y1={yToPixel(v)} y2={yToPixel(v)} stroke={BORDER} strokeWidth={1} />
          <text x={padLeft - 12} y={yToPixel(v) + 4} textAnchor="end" fontSize={13} fill={TEXT_MUTED}>{v}</text>
        </g>
      ))}

      {/* area fill under solid line */}
      <path d={areaPath} fill="#EDF1F6" />

      {/* dashed secondary line */}
      <path d={dashedPath} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="6 5" opacity={0.6} />

      {/* solid line */}
      <path d={solidPath} fill="none" stroke={NAVY} strokeWidth={2.5} />

      {/* data point dots (skip the synthetic peak point) */}
      {[solidPoints[0], solidPoints[1], solidPoints[2], solidPoints[4], solidPoints[5]].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={NAVY} />
      ))}
      <circle cx={peak.x} cy={peak.y} r={5} fill={NAVY} stroke="#fff" strokeWidth={2} />

      {/* peak callout */}
      <g transform={`translate(${peak.x}, ${peak.y - 46})`}>
        <rect x={-46} y={-16} width={92} height={30} rx={8} fill={NAVY_DARK} />
        <text x={0} y={4} textAnchor="middle" fontSize={13} fontWeight={600} fill="#fff">Peak ↑ 94</text>
      </g>

      {/* month labels */}
      {months.map((m, i) => (
        <text key={m} x={monthX[i]} y={plotBottom + 28} textAnchor="middle" fontSize={13} fill={TEXT_MUTED}>{m}</text>
      ))}
    </svg>
  )
}