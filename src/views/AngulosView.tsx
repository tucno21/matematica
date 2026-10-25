import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Plus, RotateCcw, Undo2, X } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type WedgeKind = 'llano' | 'recto'
type PolyKind = 'triangulo' | 'cuadrilatero'
type Mode = WedgeKind | 'secantes' | 'paralelas' | PolyKind
type Drag =
    | { kind: 'ray'; index: number }
    | { kind: 'line'; index: 0 | 1 }
    | { kind: 'transversal' }
    | { kind: 'vertex'; index: number }

interface P {
    x: number
    y: number
}

type Frac = [number, number]

interface WedgeState {
    rays: number[]
    history: number[][]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RAD = Math.PI / 180
const COLORS = ['#2dd4bf', '#818cf8', '#fbbf24', '#fb7185']
const LINE_COLORS = ['#2dd4bf', '#fbbf24']
const VERTEX_NAMES = ['A', 'B', 'C', 'D']
const WEDGE_MAX: Record<WedgeKind, number> = { llano: 3, recto: 2 }
const WEDGE_TOTAL: Record<WedgeKind, number> = { llano: 180, recto: 90 }
const INITIAL_SEC: [number, number] = [28, 118]
const INITIAL_TRANS = 62
const INITIAL_POLY: Record<PolyKind, Frac[]> = {
    triangulo: [
        [0.5, 0.16],
        [0.16, 0.8],
        [0.84, 0.8],
    ],
    cuadrilatero: [
        [0.26, 0.22],
        [0.74, 0.18],
        [0.82, 0.78],
        [0.18, 0.8],
    ],
}

const MODES: { id: Mode; label: string }[] = [
    { id: 'llano', label: 'Llano 180°' },
    { id: 'recto', label: 'Recto 90°' },
    { id: 'secantes', label: 'Secantes' },
    { id: 'paralelas', label: 'Paralelas' },
    { id: 'triangulo', label: 'Triángulo' },
    { id: 'cuadrilatero', label: 'Cuadrilátero' },
]

const RELATIONS = [
    { id: 1, short: 'F', label: 'Correspondientes' },
    { id: 2, short: 'Z', label: 'Alternos internos' },
    { id: 3, short: 'C', label: 'Internos = 180°' },
]

const HINTS: Record<Mode, string> = {
    llano: 'Arrastra el punto de una línea para girarla · el vértice no se mueve',
    recto: 'Arrastra el punto de una línea para girarla · el vértice no se mueve',
    secantes: 'Arrastra cualquier punto para girar cada recta',
    paralelas: 'Gira la secante y toca F, Z o C para ver las relaciones',
    triangulo: 'Arrastra los vértices · o conviértelo en isósceles, equilátero o rectángulo',
    cuadrilatero: 'Arrastra los vértices · o conviértelo en cuadrado, rombo o trapecio',
}

const HELP_ITEMS: { title: string; text: string }[] = [
    { title: 'Llano 180°', text: 'Agrega hasta 3 líneas desde el vértice: forma hasta 4 ángulos que siempre suman 180°. Gira cada línea desde su punto (el vértice está fijo).' },
    { title: 'Recto 90°', text: 'Hasta 2 líneas dentro del ángulo recto: 3 ángulos que siempre suman 90°.' },
    { title: 'Secantes', text: 'Dos rectas cruzadas forman 4 ángulos: los opuestos son iguales (α = α, β = β) y los adyacentes suman 180°.' },
    { title: 'Paralelas', text: 'Una secante corta dos paralelas y forma 8 ángulos. Toca F (correspondientes), Z (alternos internos) o C (internos del mismo lado) para colorear las parejas.' },
    { title: 'Triángulo', text: 'Arrastra los vértices: los 3 ángulos interiores se miden solos y siempre suman 180°. Los botones Isósceles, Equilátero y Rectángulo convierten la figura al instante.' },
    { title: 'Cuadrilátero', text: 'Arrastra los vértices: los 4 ángulos interiores se miden solos y siempre suman 360°. Los botones Cuadrado, Rectángulo, Rombo y Trapecio cambian la figura.' },
]

// ─── Geometría ────────────────────────────────────────────────────────────────

const pt = (c: P, deg: number, r: number): P => ({
    x: c.x + Math.cos(deg * RAD) * r,
    y: c.y - Math.sin(deg * RAD) * r,
})

const norm360 = (deg: number) => ((deg % 360) + 360) % 360

const norm180 = (deg: number) => {
    const a = norm360(deg)
    return a > 180 ? a - 360 : a
}

const angleFrom = (c: P, x: number, y: number) => norm360(Math.atan2(c.y - y, x - c.x) / RAD)

// Geometría del ángulo llano / recto: ocupa ~85% del área de trabajo
const wedgeLayout = (kind: WedgeKind, w: number, h: number) => {
    if (kind === 'llano') {
        const v = { x: w / 2, y: h * 0.62 }
        return {
            v,
            edges: [pt(v, 0, w * 0.425), pt(v, 180, w * 0.425)],
            grab: Math.min(w * 0.36, v.y - 24),
        }
    }
    const v = { x: w * 0.1, y: h * 0.88 }
    return {
        v,
        edges: [
            { x: w * 0.95, y: v.y },
            { x: v.x, y: h * 0.1 },
        ],
        grab: Math.min(w * 0.72, h * 0.72),
    }
}

const secCenter = (w: number, h: number): P => ({ x: w / 2, y: h * 0.52 })

function wedgeAngles(kind: WedgeKind, rays: number[]) {
    const bounds = [0, ...[...rays].sort((a, b) => a - b), WEDGE_TOTAL[kind]]
    const values: number[] = []
    for (let i = 0; i < bounds.length - 1; i++) values.push(bounds[i + 1] - bounds[i])
    return { bounds, values }
}

function secSectors(lines: [number, number]) {
    const dirs = [norm360(lines[0]), norm360(lines[1]), norm360(lines[0] + 180), norm360(lines[1] + 180)].sort(
        (a, b) => a - b,
    )
    const sectors: { lo: number; hi: number; val: number }[] = []
    for (let i = 0; i < 4; i++) {
        const lo = dirs[i]
        const hi = i < 3 ? dirs[i + 1] : dirs[0] + 360
        sectors.push({ lo, hi, val: hi - lo })
    }
    return sectors
}

// Ángulos interiores de un polígono (soporta vértices reflejos como el del cuadrilátero cóncavo)
function polygonAngles(points: P[]): number[] {
    const n = points.length
    let area2 = 0
    for (let i = 0; i < n; i++) {
        const c = points[i]
        const nx = points[(i + 1) % n]
        area2 += c.x * nx.y - nx.x * c.y
    }
    const sign = area2 >= 0 ? 1 : -1
    return points.map((v, i) => {
        const prev = points[(i - 1 + n) % n]
        const next = points[(i + 1) % n]
        const ux = prev.x - v.x
        const uy = prev.y - v.y
        const wx = next.x - v.x
        const wy = next.y - v.y
        const cross = ux * wy - uy * wx
        const theta = Math.atan2(Math.abs(cross), ux * wx + uy * wy) / RAD
        return cross * sign < 0 ? theta : 360 - theta
    })
}

const clonePoly = (poly: Frac[]): Frac[] => poly.map((f) => [...f] as Frac)

// ─── Figuras prearmadas (triángulos y cuadriláteros) ─────────────────────────

const POLY_PRESETS: Record<PolyKind, string[]> = {
    triangulo: ['isosceles', 'equilatero', 'rectangulo'],
    cuadrilatero: ['cuadrado', 'rectangulo', 'rombo', 'trapecio'],
}

const PRESET_LABELS: Record<string, string> = {
    isosceles: 'Isósceles',
    equilatero: 'Equilátero',
    rectangulo: 'Rectángulo',
    cuadrado: 'Cuadrado',
    rombo: 'Rombo',
    trapecio: 'Trapecio',
}

const clampFrac = (f: Frac): Frac => [
    Math.min(Math.max(f[0], 0.05), 0.95),
    Math.min(Math.max(f[1], 0.05), 0.95),
]

// Devuelve las fracciones de la figura prearmada usando el tamaño real del lienzo,
// para que el cuadrado salga cuadrado y el equilátero equilátero en pantalla.
function presetPoly(kind: PolyKind, preset: string, w: number, h: number): Frac[] {
    const cx = w / 2
    const cy = h / 2
    const f = (x: number, y: number): Frac => clampFrac([x / w, y / h])
    if (kind === 'triangulo') {
        if (preset === 'equilatero') {
            const s = Math.min(w * 0.62, h * 0.78)
            const height = (s * Math.sqrt(3)) / 2
            return [f(cx, cy - (height * 2) / 3), f(cx - s / 2, cy + height / 3), f(cx + s / 2, cy + height / 3)]
        }
        if (preset === 'rectangulo') {
            const legX = Math.min(w * 0.58, h)
            const legY = Math.min(h * 0.58, w)
            return [f(cx - legX / 2, cy + legY / 2), f(cx + legX / 2, cy + legY / 2), f(cx - legX / 2, cy - legY / 2)]
        }
        // isósceles
        const base = Math.min(w * 0.55, h)
        const height = Math.min(h * 0.62, w * 0.6)
        return [f(cx, cy - height * 0.6), f(cx - base / 2, cy + height * 0.4), f(cx + base / 2, cy + height * 0.4)]
    }
    if (preset === 'cuadrado') {
        const s = Math.min(w, h) * 0.55
        return [
            f(cx - s / 2, cy - s / 2),
            f(cx + s / 2, cy - s / 2),
            f(cx + s / 2, cy + s / 2),
            f(cx - s / 2, cy + s / 2),
        ]
    }
    if (preset === 'rectangulo') {
        const rw = Math.min(w * 0.62, h * 1.6)
        const rh = Math.min(h * 0.52, w)
        return [
            f(cx - rw / 2, cy - rh / 2),
            f(cx + rw / 2, cy - rh / 2),
            f(cx + rw / 2, cy + rh / 2),
            f(cx - rw / 2, cy + rh / 2),
        ]
    }
    if (preset === 'rombo') {
        const d1 = Math.min(w * 0.55, h)
        const d2 = Math.min(h * 0.64, w)
        return [f(cx, cy - d2 / 2), f(cx + d1 / 2, cy), f(cx, cy + d2 / 2), f(cx - d1 / 2, cy)]
    }
    if (preset === 'paralelogramo') {
        const base = Math.min(w * 0.45, h)
        const height = Math.min(h * 0.46, w)
        const shift = Math.min(base * 0.3, w * 0.12)
        return [
            f(cx - base / 2 + shift, cy - height / 2),
            f(cx + base / 2 + shift, cy - height / 2),
            f(cx + base / 2 - shift, cy + height / 2),
            f(cx - base / 2 - shift, cy + height / 2),
        ]
    }
    // trapecio
    const base1 = Math.min(w * 0.58, h)
    const base2 = base1 * 0.55
    const height = Math.min(h * 0.5, w * 0.6)
    return [
        f(cx - base2 / 2, cy - height / 2),
        f(cx + base2 / 2, cy - height / 2),
        f(cx + base1 / 2, cy + height / 2),
        f(cx - base1 / 2, cy + height / 2),
    ]
}

// Referencia estable para cuando el modo activo no tiene rayos (evita renders inestables)
const NO_RAYS: number[] = []

// ─── Vista ────────────────────────────────────────────────────────────────────

export default function AngulosView() {
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('llano')
    const [wedges, setWedges] = useState<Record<WedgeKind, WedgeState>>({
        llano: { rays: [], history: [] },
        recto: { rays: [], history: [] },
    })
    const [secLines, setSecLines] = useState<[number, number]>(INITIAL_SEC)
    const [trans, setTrans] = useState(INITIAL_TRANS)
    const [rel, setRel] = useState(0) // 0 ninguna · 1 correspondientes · 2 alternos · 3 internos
    const [polys, setPolys] = useState<Record<PolyKind, Frac[]>>({
        triangulo: clonePoly(INITIAL_POLY.triangulo),
        cuadrilatero: clonePoly(INITIAL_POLY.cuadrilatero),
    })
    const [dims, setDims] = useState({ width: 0, height: 0 })
    const [drag, setDrag] = useState<Drag | null>(null)
    const [showHelp, setShowHelp] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)

    const boardRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const wedgeKind: WedgeKind | null = mode === 'llano' || mode === 'recto' ? mode : null
    const polyKind: PolyKind | null = mode === 'triangulo' || mode === 'cuadrilatero' ? mode : null
    const rays = wedgeKind ? wedges[wedgeKind].rays : NO_RAYS

    // ── Tamaño real del tablero ─────────────────────────────────────────────
    useEffect(() => {
        const element = boardRef.current
        if (!element) return
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            setDims({ width: rect.width, height: rect.height })
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!notice) return
        const timer = setTimeout(() => setNotice(null), 2400)
        return () => clearTimeout(timer)
    }, [notice])

    // ── Dibujo ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || dims.width < 10 || dims.height < 10) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.round(dims.width * dpr)
        canvas.height = Math.round(dims.height * dpr)

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, dims.width, dims.height)

        const w = dims.width
        const h = dims.height
        const min = Math.min(w, h)

        const label = (x: number, y: number, text: string, color: string, px = 10) => {
            ctx.font = `700 ${px}px "JetBrains Mono", ui-monospace, monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.lineWidth = 3
            ctx.strokeStyle = 'rgba(8, 12, 24, 0.85)'
            ctx.strokeText(text, x, y)
            ctx.fillStyle = color
            ctx.fillText(text, x, y)
        }

        const dot = (p: P, r: number, fill: string, ring?: string) => {
            ctx.beginPath()
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
            ctx.fillStyle = fill
            ctx.fill()
            if (ring) {
                ctx.lineWidth = 2
                ctx.strokeStyle = ring
                ctx.stroke()
            }
        }

        const handleDot = (p: P, color: string, active: boolean) => {
            if (active) {
                ctx.beginPath()
                ctx.arc(p.x, p.y, 15, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255,255,255,0.16)'
                ctx.fill()
            }
            dot(p, 10, 'rgba(8,12,24,0.55)')
            dot(p, 7.5, color)
            dot(p, 2.6, '#ffffff')
        }

        const arcMath = (c: P, loDeg: number, hiDeg: number, r: number, color: string, alpha: number, width = 3) => {
            ctx.beginPath()
            ctx.arc(c.x, c.y, r, -loDeg * RAD, -hiDeg * RAD, true)
            ctx.lineWidth = width
            ctx.lineCap = 'round'
            ctx.strokeStyle = color
            ctx.globalAlpha = alpha
            ctx.stroke()
            ctx.globalAlpha = 1
        }

        const seg = (a: P, b: P, color: string, width = 2.5, alpha = 1) => {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.lineWidth = width
            ctx.lineCap = 'round'
            ctx.strokeStyle = color
            ctx.globalAlpha = alpha
            ctx.stroke()
            ctx.globalAlpha = 1
        }

        if (wedgeKind) {
            const layout = wedgeLayout(wedgeKind, w, h)
            const v = layout.v
            const { bounds, values } = wedgeAngles(wedgeKind, rays)

            // Arcos y medida de cada ángulo
            for (let i = 0; i < values.length; i++) {
                const lo = bounds[i]
                const hi = bounds[i + 1]
                const val = values[i]
                const rArc = val < 24 ? min * 0.22 : min * 0.15
                arcMath(v, lo, hi, rArc, COLORS[i % 4], 0.95, 3.5)
                const lp = pt(v, (lo + hi) / 2, rArc + 22)
                label(lp.x, lp.y, `${Math.round(val)}°`, '#f1f5f9', 13)
            }

            // Lados fijos del ángulo (85% del área de trabajo)
            const [edgeA, edgeB] = layout.edges
            seg(v, edgeA, 'rgba(255,255,255,0.5)')
            seg(v, edgeB, 'rgba(255,255,255,0.5)')
            dot(edgeA, 4, 'rgba(255,255,255,0.4)')
            dot(edgeB, 4, 'rgba(255,255,255,0.4)')

            // Líneas móviles (nunca desde el vértice: se giran desde su punto)
            rays.forEach((angle, index) => {
                const tip = pt(v, angle, layout.grab)
                seg(v, tip, COLORS[index % 4], 3)
                handleDot(tip, COLORS[index % 4], drag?.kind === 'ray' && drag.index === index)
            })

            dot(v, 5.5, '#ffffff', 'rgba(8,12,24,0.9)')
        }

        if (mode === 'secantes') {
            const c = secCenter(w, h)
            const R = Math.hypot(w, h) / 2 + 10
            secLines.forEach((angle, index) => {
                seg(pt(c, angle + 180, R), pt(c, angle, R), LINE_COLORS[index], 2.5, 0.85)
            })

            secSectors(secLines).forEach((s, i) => {
                const color = i % 2 === 0 ? COLORS[0] : COLORS[3]
                const rArc = s.val < 26 ? min * 0.21 : min * 0.15
                arcMath(c, s.lo, s.hi, rArc, color, 0.9, 3.5)
                const lp = pt(c, (s.lo + s.hi) / 2, rArc + 22)
                label(lp.x, lp.y, `${i % 2 === 0 ? 'α' : 'β'} ${Math.round(s.val)}°`, '#f1f5f9', 13)
            })

            dot(c, 5, '#ffffff', 'rgba(8,12,24,0.9)')
            secLines.forEach((angle, index) => {
                for (const sign of [1, -1] as const) {
                    const p = pt(c, angle, sign * min * 0.3)
                    handleDot(p, LINE_COLORS[index], drag?.kind === 'line' && drag.index === index)
                }
            })
        }

        if (mode === 'paralelas') {
            const yT = h * 0.3
            const yB = h * 0.7
            const c = { x: w / 2, y: (yT + yB) / 2 }
            const t = trans

            seg({ x: 6, y: yT }, { x: w - 6, y: yT }, 'rgba(255,255,255,0.45)')
            seg({ x: 6, y: yB }, { x: w - 6, y: yB }, 'rgba(255,255,255,0.45)')

            const R = Math.hypot(w, h) / 2 + 10
            seg(pt(c, t + 180, R), pt(c, t, R), COLORS[3], 2.5, 0.9)

            const sinT = Math.sin(t * RAD)
            const cosT = Math.cos(t * RAD)
            const intersections: P[] = [yT, yB].map((y) => ({
                x: c.x + ((c.y - y) / sinT) * cosT,
                y,
            }))

            // Sectores por intersección: si 0 [0,t] · si 1 [t,180] · si 2 [180,180+t] · si 3 [180+t,360]
            const ranges = [
                { lo: 0, hi: t },
                { lo: t, hi: 180 },
                { lo: 180, hi: 180 + t },
                { lo: 180 + t, hi: 360 },
            ]
            const all: { p: P; si: number; lo: number; hi: number; val: number; bis: number }[] = []
            intersections.forEach((p) => {
                ranges.forEach((s, si) => {
                    all.push({ p, si, lo: s.lo, hi: s.hi, val: s.hi - s.lo, bis: (s.lo + s.hi) / 2 })
                })
            })

            // Parejas destacadas (índice = pi*4 + si): F mismas posiciones · Z alternas internas · C internas de un lado
            const pairs: [number, number][] =
                rel === 1
                    ? [
                          [0, 4],
                          [1, 5],
                          [2, 6],
                          [3, 7],
                      ]
                    : rel === 2
                      ? [
                            [2, 4],
                            [3, 5],
                        ]
                      : rel === 3
                        ? [
                              [2, 5],
                              [3, 4],
                          ]
                        : []

            all.forEach((s, idx) => {
                const inPair = pairs.some(([a, b]) => a === idx || b === idx)
                const color = rel === 3 && inPair ? COLORS[1] : s.si % 2 === 0 ? COLORS[0] : COLORS[2]
                const alpha = rel === 0 ? 0.5 : inPair ? 0.95 : 0.12
                arcMath(s.p, s.lo, s.hi, 24, color, alpha, rel > 0 && inPair ? 4.5 : 3.5)
                const lp = pt(s.p, s.bis, 42)
                label(lp.x, lp.y, `${Math.round(s.val)}°`, rel === 0 || inPair ? '#f1f5f9' : 'rgba(241,245,249,0.35)', 12)
            })

            if (rel === 3) {
                label(c.x, (yT + yB) / 2, `internos: ${Math.round(t)}° + ${Math.round(180 - t)}° = 180°`, '#f1f5f9', 10)
            }

            const handleRadius = min * 0.42
            for (const sign of [1, -1] as const) {
                handleDot(pt(c, t, sign * handleRadius), COLORS[3], drag?.kind === 'transversal')
            }
        }

        if (polyKind) {
            const pts = polys[polyKind].map(([fx, fy]) => ({ x: fx * w, y: fy * h }))
            const angles = polygonAngles(pts)

            // Lados
            ctx.beginPath()
            ctx.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
            ctx.closePath()
            ctx.lineWidth = 2.5
            ctx.lineJoin = 'round'
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'
            ctx.stroke()

            // Arcos y medidas por vértice
            pts.forEach((v, i) => {
                const prev = pts[(i - 1 + pts.length) % pts.length]
                const next = pts[(i + 1) % pts.length]
                const ux = prev.x - v.x
                const uy = prev.y - v.y
                const wx = next.x - v.x
                const wy = next.y - v.y
                const lu = Math.hypot(ux, uy)
                const lw = Math.hypot(wx, wy)
                let bx = ux / lu + wx / lw
                let by = uy / lu + wy / lw
                const bl = Math.hypot(bx, by) || 1
                bx /= bl
                by /= bl
                if (angles[i] > 180) {
                    bx = -bx
                    by = -by
                }
                const cross = ux * wy - uy * wx
                const anticlockwise = (cross < 0) === (angles[i] < 180)
                ctx.beginPath()
                ctx.arc(v.x, v.y, 30, Math.atan2(uy, ux), Math.atan2(wy, wx), anticlockwise)
                ctx.lineWidth = 3.5
                ctx.lineCap = 'round'
                ctx.strokeStyle = COLORS[i]
                ctx.globalAlpha = 0.95
                ctx.stroke()
                ctx.globalAlpha = 1
                label(v.x + bx * 52, v.y + by * 52, `${Math.round(angles[i])}°`, '#f1f5f9', 13)
            })

            pts.forEach((p, i) => handleDot(p, COLORS[i], drag?.kind === 'vertex' && drag.index === i))
        }
    }, [mode, wedgeKind, polyKind, wedges, polys, secLines, trans, rel, rays, dims, drag])

    // ── Historial del ángulo llano / recto (todo dentro de un solo estado) ───
    const undoRay = () => {
        if (!wedgeKind) return
        if (wedges[wedgeKind].history.length === 0) {
            setNotice('No hay acciones para deshacer')
            return
        }
        const kind = wedgeKind
        setWedges((prev) => {
            const state = prev[kind]
            if (state.history.length === 0) return prev
            return {
                ...prev,
                [kind]: { rays: state.history[state.history.length - 1], history: state.history.slice(0, -1) },
            }
        })
    }

    const addRay = () => {
        if (!wedgeKind) return
        if (wedges[wedgeKind].rays.length >= WEDGE_MAX[wedgeKind]) {
            setNotice(`Máximo ${WEDGE_MAX[wedgeKind]} líneas: ya hay ${WEDGE_MAX[wedgeKind] + 1} ángulos`)
            return
        }
        const kind = wedgeKind
        // Se calcula dentro del updater para que dos toques rápidos nunca usen estado viejo
        setWedges((prev) => {
            const state = prev[kind]
            if (state.rays.length >= WEDGE_MAX[kind]) return prev
            const { bounds } = wedgeAngles(kind, state.rays)
            let best = 0
            let bestGap = -1
            for (let i = 0; i < bounds.length - 1; i++) {
                const gap = bounds[i + 1] - bounds[i]
                if (gap > bestGap) {
                    bestGap = gap
                    best = i
                }
            }
            return {
                ...prev,
                [kind]: {
                    rays: [...state.rays, (bounds[best] + bounds[best + 1]) / 2],
                    history: [...state.history.slice(-29), state.rays],
                },
            }
        })
    }

    const resetMode = () => {
        if (wedgeKind) {
            const kind = wedgeKind
            setWedges((prev) => ({ ...prev, [kind]: { rays: [], history: [] } }))
            return
        }
        if (mode === 'secantes') {
            setSecLines(INITIAL_SEC)
            return
        }
        if (mode === 'paralelas') {
            setTrans(INITIAL_TRANS)
            setRel(0)
            return
        }
        if (polyKind) setPolys((prev) => ({ ...prev, [polyKind]: clonePoly(INITIAL_POLY[polyKind]) }))
    }

    const applyPreset = (preset: string) => {
        if (!polyKind || dims.width < 10 || dims.height < 10) return
        const kind = polyKind
        setPolys((prev) => ({ ...prev, [kind]: presetPoly(kind, preset, dims.width, dims.height) }))
    }

    // ── Punteros ─────────────────────────────────────────────────────────────
    const handlePoints = (w: number, h: number): { p: P; drag: Drag }[] => {
        const min = Math.min(w, h)
        if (wedgeKind) {
            const layout = wedgeLayout(wedgeKind, w, h)
            return rays.map((angle, index) => ({ p: pt(layout.v, angle, layout.grab), drag: { kind: 'ray', index } }))
        }
        if (mode === 'secantes') {
            const c = secCenter(w, h)
            const out: { p: P; drag: Drag }[] = []
            secLines.forEach((angle, index) => {
                for (const sign of [1, -1] as const) {
                    out.push({ p: pt(c, angle, sign * min * 0.3), drag: { kind: 'line', index: index as 0 | 1 } })
                }
            })
            return out
        }
        if (mode === 'paralelas') {
            const c = { x: w / 2, y: (h * 0.3 + h * 0.7) / 2 }
            const out: { p: P; drag: Drag }[] = []
            for (const sign of [1, -1] as const) {
                out.push({ p: pt(c, trans, sign * min * 0.42), drag: { kind: 'transversal' } })
            }
            return out
        }
        if (polyKind) {
            return polys[polyKind].map((f, index) => ({
                p: { x: f[0] * w, y: f[1] * h },
                drag: { kind: 'vertex', index },
            }))
        }
        return []
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const canvas = canvasRef.current
        if (!canvas || dims.width < 10 || dims.height < 10) return
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        let best: { d: number; drag: Drag } | null = null
        for (const candidate of handlePoints(dims.width, dims.height)) {
            const d = Math.hypot(candidate.p.x - x, candidate.p.y - y)
            if (d <= 26 && (!best || d < best.d)) best = { d, drag: candidate.drag }
        }
        if (!best) return

        try {
            event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
            // Algunos navegadores no permiten capturar el puntero; no es crítico.
        }
        setDrag(best.drag)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drag) return
        const canvas = canvasRef.current
        if (!canvas || dims.width < 10 || dims.height < 10) return
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const { width, height } = dims

        if (drag.kind === 'ray' && wedgeKind) {
            const v = wedgeLayout(wedgeKind, width, height).v
            let angle = angleFrom(v, x, y)
            if (angle > 180) angle = 360 - angle // si bajan del lado de abajo, se refleja hacia arriba
            const kind = wedgeKind
            const index = drag.index
            setWedges((prev) => {
                const current = prev[kind].rays
                const limits = [0, ...current.filter((_, i) => i !== index).sort((a, b) => a - b), WEDGE_TOTAL[kind]]
                const lower = limits.filter((limit) => limit < angle)
                const upper = limits.filter((limit) => limit > angle)
                const lo = lower.length ? Math.max(...lower) : 0
                const hi = upper.length ? Math.min(...upper) : WEDGE_TOTAL[kind]
                const next = Math.min(Math.max(angle, lo + 4), hi - 4)
                return { ...prev, [kind]: { ...prev[kind], rays: current.map((a, i) => (i === index ? next : a)) } }
            })
            return
        }

        if (drag.kind === 'line') {
            const c = secCenter(width, height)
            const other = secLines[1 - drag.index]
            const d = norm180(angleFrom(c, x, y) - other)
            let clamped = d
            if (Math.abs(d) < 10) clamped = d < 0 ? -10 : 10
            else if (Math.abs(d) > 170) clamped = d < 0 ? -170 : 170
            const next = norm360(other + clamped)
            setSecLines((prev) => {
                const copy: [number, number] = [...prev]
                copy[drag.index] = next
                return copy
            })
            return
        }

        if (drag.kind === 'transversal') {
            const c = { x: width / 2, y: height / 2 }
            let angle = angleFrom(c, x, y)
            if (angle > 180) angle = 360 - angle
            setTrans(Math.min(Math.max(angle, 30), 150))
            return
        }

        if (drag.kind === 'vertex' && polyKind) {
            const fx = Math.min(Math.max(x / width, 0.05), 0.95)
            const fy = Math.min(Math.max(y / height, 0.05), 0.95)
            setPolys((prev) => ({
                ...prev,
                [polyKind]: prev[polyKind].map((f, i) => (i === drag.index ? [fx, fy] : f)),
            }))
        }
    }

    const endDrag = () => setDrag(null)

    // ── Valores para el pie ──────────────────────────────────────────────────
    const wedgeInfo = wedgeKind ? wedgeAngles(wedgeKind, rays) : null
    const secInfo = mode === 'secantes' ? secSectors(secLines) : null
    const polyAngles =
        polyKind && dims.width > 10
            ? polygonAngles(polys[polyKind].map(([fx, fy]) => ({ x: fx * dims.width, y: fy * dims.height })))
            : []

    const chipClass =
        'flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold leading-none text-white/70'
    const buttonClass =
        'flex h-6 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-white/60 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30 lg:h-8'

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white">
            {/* Cabecera */}
            <header className="flex shrink-0 items-center gap-1.5 border-b border-white/5 px-2 py-1 lg:py-1.5">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Volver"
                >
                    <ArrowLeft size={16} />
                </button>
                <h1 className="shrink-0 text-[13px] font-black leading-none tracking-tight sm:text-sm">Ángulos</h1>
                <span className="hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:inline">
                    {MODES.find((m) => m.id === mode)?.label}
                </span>
                <div className="min-w-0 flex-1" />
                <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Ayuda"
                >
                    <HelpCircle size={16} />
                </button>
            </header>

            {/* Modos */}
            <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-1">
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        aria-pressed={mode === m.id}
                        className={`h-6 shrink-0 rounded-md border px-2 text-[9px] font-bold leading-none transition-colors sm:text-[10px] ${
                            mode === m.id
                                ? 'border-teal-400/40 bg-teal-400/10 text-teal-300'
                                : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.07] hover:text-white/75'
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </nav>

            {/* Lienzo */}
            <div className="relative min-h-0 flex-1 p-1 sm:p-1.5">
                <div
                    ref={boardRef}
                    className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02]"
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 h-full w-full touch-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onContextMenu={(event) => event.preventDefault()}
                    />

                    <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
                        <p className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-center text-[9px] leading-tight text-white/40 sm:text-[10px]">
                            {HINTS[mode]}
                        </p>
                    </div>

                    {notice && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                            <p className="rounded-full border border-white/10 bg-[#0b1120]/95 px-3 py-1.5 text-[11px] font-semibold text-white/70 shadow-lg">
                                {notice}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pie: medidas en vivo + acciones */}
            <footer className="shrink-0 border-t border-white/5 px-2 py-1 lg:py-1.5">
                <div className="mx-auto flex max-w-6xl items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                        {wedgeKind &&
                            wedgeInfo &&
                            wedgeInfo.values.map((val, i) => (
                                <span key={i} className={chipClass}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[i % 4] }} />
                                    {Math.round(val)}°
                                </span>
                            ))}
                        {wedgeKind && (
                            <span className="shrink-0 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[10px] font-black leading-none text-teal-300">
                                Σ = {WEDGE_TOTAL[wedgeKind]}°
                            </span>
                        )}

                        {mode === 'secantes' && secInfo && (
                            <>
                                <span className={chipClass}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                                    α = {Math.round(secInfo[0].val)}°
                                </span>
                                <span className={chipClass}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[3] }} />
                                    β = {Math.round(secInfo[1].val)}°
                                </span>
                                <span className={chipClass}>α + β = 180°</span>
                            </>
                        )}

                        {mode === 'paralelas' && (
                            <>
                                <span className={chipClass}>
                                    θ = {trans}° · {180 - trans}°
                                </span>
                                <div className="flex shrink-0 items-center gap-1">
                                    {RELATIONS.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setRel(rel === r.id ? 0 : r.id)}
                                            aria-pressed={rel === r.id}
                                            className={`flex h-6 shrink-0 items-center gap-1 rounded-lg border px-2 text-[9px] font-bold transition-colors active:scale-95 sm:text-[10px] ${
                                                rel === r.id
                                                    ? 'border-teal-400/40 bg-teal-400/10 text-teal-300'
                                                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75'
                                            }`}
                                        >
                                            <b className="text-[11px] font-black">{r.short}</b>
                                            <span className="hidden sm:inline">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {polyKind &&
                            polyAngles.map((val, i) => (
                                <span key={i} className={chipClass}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    {VERTEX_NAMES[i]} = {Math.round(val)}°
                                </span>
                            ))}
                        {polyKind && (
                            <span className="shrink-0 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[10px] font-black leading-none text-teal-300">
                                Σ = {polyKind === 'triangulo' ? 180 : 360}°
                            </span>
                        )}
                    </div>

                    {wedgeKind && (
                        <>
                            <button
                                type="button"
                                onClick={addRay}
                                disabled={rays.length >= WEDGE_MAX[wedgeKind]}
                                className={`${buttonClass} border-teal-400/30 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20`}
                                aria-label="Agregar línea"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Línea</span>
                            </button>
                            <button
                                type="button"
                                onClick={undoRay}
                                disabled={wedges[wedgeKind].history.length === 0}
                                className={buttonClass}
                                aria-label="Deshacer"
                            >
                                <Undo2 size={14} />
                                <span className="hidden sm:inline">Deshacer</span>
                            </button>
                        </>
                    )}

                    {polyKind &&
                        POLY_PRESETS[polyKind].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="flex h-6 shrink-0 items-center rounded-lg border border-teal-400/25 bg-teal-400/[0.07] px-2 text-[9px] font-bold leading-none text-teal-200/90 transition-colors hover:bg-teal-400/15 active:scale-95 sm:text-[10px] lg:h-8"
                                aria-label={`Convertir en ${PRESET_LABELS[preset]}`}
                            >
                                {PRESET_LABELS[preset]}
                            </button>
                        ))}

                    <button type="button" onClick={resetMode} className={buttonClass} aria-label="Reiniciar">
                        <RotateCcw size={14} />
                        <span className="hidden sm:inline">Reiniciar</span>
                    </button>
                </div>
            </footer>

            {/* Modal de ayuda */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
                    <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-black">Cómo usar los ángulos</h2>
                            <button
                                type="button"
                                onClick={() => setShowHelp(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                aria-label="Cerrar ayuda"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <ul className="space-y-2 text-[11px] leading-snug text-white/55">
                            {HELP_ITEMS.map((item) => (
                                <li key={item.title} className="rounded-xl border border-white/5 bg-white/[0.03] p-2">
                                    <b className="text-white/85">{item.title}:</b> {item.text}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-[9px] leading-relaxed text-white/30">
                            Las medidas se calculan solas al mover. Al salir de la vista todo se reinicia.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowHelp(false)}
                            className="mt-3 w-full rounded-xl bg-teal-400 py-2.5 text-xs font-black text-[#06272a] hover:bg-teal-300 active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
