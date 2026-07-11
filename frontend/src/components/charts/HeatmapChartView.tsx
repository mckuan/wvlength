import { useEffect, useRef } from "react"
import * as THREE from "three"
// @ts-expect-error - no types shipped for examples/jsm in this three version
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface Props {
  allRows: Record<string, unknown>[]
  rowCol: string
  colCol: string
  valueCol: string
  scaleMin?: number
  scaleMax?: number
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

function colorFor(t: number): THREE.Color {
  const low  = new THREE.Color("#9DB6C9")
  const high = new THREE.Color("#324E66")
  return low.clone().lerp(high, Math.max(0, Math.min(1, t)))
}

const BAR_SIZE = 0.7
const GAP = 1.2
const MAX_HEIGHT = 4

export default function HeatmapChartView({ allRows, rowCol, colCol, valueCol, scaleMin, scaleMax }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  const rows = Array.from(new Set(allRows.map(r => String(r[rowCol])))).sort()
  const cols = Array.from(new Set(allRows.map(r => String(r[colCol])))).sort()

  const grid = new Map<string, number>()
  for (const row of allRows) {
    const val = toNumber(row[valueCol])
    if (val === null) continue
    grid.set(`${row[rowCol]}|${row[colCol]}`, val)
  }
  const values = Array.from(grid.values())
  const dataMin = values.length ? Math.min(...values) : 0
  const dataMax = values.length ? Math.max(...values) : 1
  // scaleMin/scaleMax from the Color scale tab override the auto-computed range
  const min = scaleMin ?? dataMin
  const max = scaleMax ?? dataMax
  const range = max - min || 1

  useEffect(() => {
    if (!mountRef.current || rows.length === 0 || cols.length === 0) return
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = 420

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#F7F4F3")

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    const gridWidth = cols.length * GAP
    const gridDepth = rows.length * GAP
    const dist = Math.max(gridWidth, gridDepth, 6)
    camera.position.set(dist * 0.9, dist * 0.9, dist * 0.9)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
    dirLight.position.set(5, 10, 7)
    scene.add(dirLight)

    const planeGeo = new THREE.PlaneGeometry(gridWidth + GAP, gridDepth + GAP)
    const planeMat = new THREE.MeshBasicMaterial({ color: "#E8EFF4", side: THREE.DoubleSide })
    const plane = new THREE.Mesh(planeGeo, planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.01
    scene.add(plane)

    const originX = -gridWidth / 2 + GAP / 2
    const originZ = -gridDepth / 2 + GAP / 2

    rows.forEach((r, ri) => {
      cols.forEach((c, ci) => {
        const val = grid.get(`${r}|${c}`)
        if (val === undefined) return

        const t = (val - min) / range
        const h = 0.15 + Math.max(0, Math.min(1, t)) * MAX_HEIGHT

        const geo = new THREE.BoxGeometry(BAR_SIZE, h, BAR_SIZE)
        const mat = new THREE.MeshStandardMaterial({ color: colorFor(t) })
        const bar = new THREE.Mesh(geo, mat)

        bar.position.set(originX + ci * GAP, h / 2, originZ + ri * GAP)
        scene.add(bar)

        const edges = new THREE.EdgesGeometry(geo)
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: "#324E66", transparent: true, opacity: 0.15 }))
        line.position.copy(bar.position)
        scene.add(line)
      })
    })

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const w = mount.clientWidth
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, rowCol, colCol, valueCol, scaleMin, scaleMax])

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-sm" style={{ color: "#5F7B94" }}>Not enough data to build a heatmap.</p>
  }

  return (
    <div>
      <div ref={mountRef} className="w-full rounded-lg" style={{ height: 420, border: "1px solid #E8EFF4" }} />
      <p className="text-xs mt-2" style={{ color: "#9DB6C9" }}>Drag to rotate · scroll to zoom · height and color both encode value</p>
    </div>
  )
}