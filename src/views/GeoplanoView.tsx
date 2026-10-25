import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Eraser, HelpCircle, Sparkles, Target, Trash2, Undo2, X } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Point {
    x: number
    y: number
}

interface Band {
    id: number
    color: string
    points: Point[]
    closed: boolean
}

interface Challenge {
    id: string
    title: string
    hint: string
    check: (band: Band) => boolean
}

interface Layout {
    cell: number
    offsetX: number
    offsetY: number
    cols: number
    rows: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Puntos que caben en el lado corto de la pantalla; el lado largo se llena solo.
const DENSITIES = [13, 7, 5]
const COLORS = ['#2dd4bf', '#818cf8', '#fbbf24', '#fb7185']
const COLOR_NAMES = ['Turquesa', 'Violeta', 'Ámbar', 'Rosa']
const MAX_BANDS = 10
const EPS = 1e-6

// ─── Geometría ────────────────────────────────────────────────────────────────

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

const distSq = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

const cloneBands = (bands: Band[]): Band[] =>
    bands.map((band) => ({ ...band, points: band.points.map((point) => ({ ...point })) }))

function shoelace(points: Point[]): number {
    let sum = 0
    for (let i = 0; i < points.length; i++) {
        const current = points[i]
        const next = points[(i + 1) % points.length]
        sum += current.x * next.y - next.x * current.y
    }
    return sum
}

function shapeStats(band: Band) {
    const points = band.points
    let perimeter = 0
    for (let i = 1; i < points.length; i++) {
        perimeter += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    }
    if (band.closed && points.length > 2) {
        perimeter += Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y)
    }
    return {
        vertices: points.length,
        area: band.closed ? Math.abs(shoelace(points)) / 2 : 0,
        perimeter,
    }
}

const isClosed = (band: Band) => band.closed && band.points.length >= 3

const sideLengthsSq = (points: Point[]) =>
    points.map((point, index) => distSq(point, points[(index + 1) % points.length]))

function allRightAngles(points: Point[]): boolean {
    const n = points.length
    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n]
        const current = points[i]
        const next = points[(i + 1) % n]
        const ax = prev.x - current.x
        const ay = prev.y - current.y
        const bx = next.x - current.x
        const by = next.y - current.y
        if (ax * bx + ay * by !== 0) return false
    }
    return true
}

function hasAnyRightAngle(points: Point[]): boolean {
    const n = points.length
    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n]
        const current = points[i]
        const next = points[(i + 1) % n]
        const ax = prev.x - current.x
        const ay = prev.y - current.y
        const bx = next.x - current.x
        const by = next.y - current.y
        if (ax * bx + ay * by === 0) return true
    }
    return false
}

const isSquare = (band: Band) => {
    if (!isClosed(band) || band.points.length !== 4) return false
    const sides = sideLengthsSq(band.points)
    return sides.every((side) => side === sides[0]) && allRightAngles(band.points)
}

const isRectangle = (band: Band) => {
    if (!isClosed(band) || band.points.length !== 4) return false
    const sides = sideLengthsSq(band.points)
    return sides[0] === sides[2] && sides[1] === sides[3] && allRightAngles(band.points)
}

const isTriangle = (band: Band) => isClosed(band) && band.points.length === 3 && shapeStats(band).area > EPS

const isRightTriangle = (band: Band) =>
    isClosed(band) && band.points.length === 3 && hasAnyRightAngle(band.points)

const areaOf = (band: Band) => (isClosed(band) ? shapeStats(band).area : 0)

const CHALLENGES: Challenge[] = [
    { id: 'cuadrado', title: 'Dibuja un cuadrado', hint: '4 lados iguales y ángulos rectos', check: isSquare },
    { id: 'rectangulo', title: 'Dibuja un rectángulo', hint: 'No vale el cuadrado', check: (band) => isRectangle(band) && !isSquare(band) },
    { id: 'triangulo', title: 'Dibuja un triángulo', hint: '3 lados y área mayor que 0', check: isTriangle },
    { id: 'triangulo-rectangulo', title: 'Dibuja un triángulo rectángulo', hint: 'Uno de sus ángulos debe ser de 90°', check: isRightTriangle },
    { id: 'rectangulo-area-6', title: 'Rectángulo de área 6', hint: 'Por ejemplo 2 × 3', check: (band) => isRectangle(band) && Math.abs(areaOf(band) - 6) < EPS },
    { id: 'cuadrado-area-9', title: 'Cuadrado de área 9', hint: 'Por ejemplo 3 × 3', check: (band) => isSquare(band) && Math.abs(areaOf(band) - 9) < EPS },
    { id: 'pentagono', title: 'Dibuja un pentágono', hint: '5 lados cerrados', check: (band) => isClosed(band) && band.points.length === 5 },
    { id: 'area-12', title: 'Figura cerrada de área 12', hint: 'Cualquier forma sirve', check: (band) => Math.abs(areaOf(band) - 12) < EPS },
]

// ─── Utilidades de dibujo ─────────────────────────────────────────────────────

function computeLayout(width: number, height: number, shortSidePoints: number): Layout {
    const pad = Math.max(4, Math.min(width, height) * 0.02)
    const usableW = Math.max(1, width - pad * 2)
    const usableH = Math.max(1, height - pad * 2)
    const target = Math.min(usableW, usableH) / Math.max(2, shortSidePoints - 1)
    const cols = Math.max(2, Math.round(usableW / target) + 1)
    const rows = Math.max(2, Math.round(usableH / target) + 1)
    const cell = Math.min(usableW / (cols - 1), usableH / (rows - 1))
    return {
        cell,
        cols,
        rows,
        offsetX: (width - cell * (cols - 1)) / 2,
        offsetY: (height - cell * (rows - 1)) / 2,
    }
}

function distToSegment(px: number, py: number, a: Point, b: Point): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy
    if (lengthSq === 0) return Math.hypot(px - a.x, py - a.y)
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq))
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

function clampDelta(points: Point[], dx: number, dy: number, cols: number, rows: number) {
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    return {
        dx: Math.max(-Math.min(...xs), Math.min(dx, cols - 1 - Math.max(...xs))),
        dy: Math.max(-Math.min(...ys), Math.min(dy, rows - 1 - Math.max(...ys))),
    }
}

const formatNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

// ─── Vista ────────────────────────────────────────────────────────────────────

export default function GeoplanoView() {
    const navigate = useNavigate()

    const [shortSidePoints, setShortSidePoints] = useState(13)
    const [bands, setBands] = useState<Band[]>([])
    const [colorIdx, setColorIdx] = useState(0)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [draft, setDraft] = useState<{ from: Point; to: Point | null } | null>(null)
    const [history, setHistory] = useState<Band[][]>([])
    const [dims, setDims] = useState({ width: 0, height: 0 })

    const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null)
    const [completed, setCompleted] = useState<string[]>([])
    const [solved, setSolved] = useState<{ title: string; area: number; perimeter: number } | null>(null)
    const [showRetos, setShowRetos] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [confirmAction, setConfirmAction] = useState<{ kind: 'clear' } | { kind: 'size'; size: number } | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const boardRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gestureRef = useRef<
        | { kind: 'draw'; from: Point; bandId: number | null }
        | { kind: 'move'; bandId: number; grabbed: Point; original: Point[] }
        | null
    >(null)
    const draftRef = useRef<{ from: Point; to: Point | null } | null>(null)
    const lastDeltaRef = useRef({ dx: 0, dy: 0 })
    const nextIdRef = useRef(1)
    const solvedKeysRef = useRef<Set<string>>(new Set())
    const orientationRef = useRef<'portrait' | 'landscape' | null>(null)

    const layout = useMemo(
        () => computeLayout(dims.width, dims.height, shortSidePoints),
        [dims.width, dims.height, shortSidePoints],
    )

    const resetBoard = useCallback(() => {
        setBands([])
        setHistory([])
        setSelectedId(null)
        setSolved(null)
        setCompleted([])
        setActiveChallengeId(null)
        draftRef.current = null
        setDraft(null)
        solvedKeysRef.current.clear()
    }, [])

    // El tablero se recalcula con el tamaño real: en horizontal gana columnas,
    // en vertical gana filas. Al girar la pantalla se empieza de nuevo.
    useEffect(() => {
        const element = boardRef.current
        if (!element) return
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            const width = rect.width
            const height = rect.height
            setDims({ width, height })
            if (width < 10 || height < 10) return

            const nextOrientation = width >= height ? 'landscape' : 'portrait'
            const previousOrientation = orientationRef.current
            orientationRef.current = nextOrientation
            if (previousOrientation && previousOrientation !== nextOrientation) {
                resetBoard()
                setNotice('Pantalla girada: el tablero se reinició')
            }
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [resetBoard])

    useEffect(() => {
        if (!notice) return
        const timer = setTimeout(() => setNotice(null), 2400)
        return () => clearTimeout(timer)
    }, [notice])

    // ── Dibujo del tablero ───────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || dims.width < 10 || dims.height < 10) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.round(dims.width * dpr)
        canvas.height = Math.round(dims.height * dpr)

        const context = canvas.getContext('2d')
        if (!context) return
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.clearRect(0, 0, dims.width, dims.height)

        const { cell, offsetX, offsetY, cols, rows } = layout
        const toPixels = (point: Point) => ({
            x: offsetX + point.x * cell,
            y: offsetY + point.y * cell,
        })

        // Puntos de la cuadrícula
        const dotRadius = Math.min(4.5, Math.max(2.4, cell * 0.06))
        context.fillStyle = 'rgba(255,255,255,0.22)'
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px = offsetX + col * cell
                const py = offsetY + row * cell
                context.beginPath()
                context.arc(px, py, dotRadius, 0, Math.PI * 2)
                context.fill()
            }
        }

        // Ligas
        for (const band of bands) {
            if (band.points.length < 2) continue
            const selected = band.id === selectedId
            context.beginPath()
            const first = toPixels(band.points[0])
            context.moveTo(first.x, first.y)
            for (let i = 1; i < band.points.length; i++) {
                const px = toPixels(band.points[i])
                context.lineTo(px.x, px.y)
            }
            if (band.closed) context.closePath()
            context.lineCap = 'round'
            context.lineJoin = 'round'
            context.lineWidth = Math.min(8, Math.max(3.5, cell * 0.1))
            context.strokeStyle = band.color
            context.globalAlpha = band.closed ? 1 : 0.95
            if (selected) {
                context.shadowColor = band.color
                context.shadowBlur = 14
            }
            context.stroke()
            context.shadowBlur = 0
            context.globalAlpha = 1

            if (selected) {
                const radius = Math.min(6.5, Math.max(3.5, cell * 0.085))
                for (const point of band.points) {
                    const px = toPixels(point)
                    context.beginPath()
                    context.arc(px.x, px.y, radius, 0, Math.PI * 2)
                    context.fillStyle = '#0b1120'
                    context.fill()
                    context.lineWidth = 2
                    context.strokeStyle = band.color
                    context.stroke()
                }
            }
        }

        // Liga en borrador
        if (draft) {
            const from = toPixels(draft.from)
            context.beginPath()
            context.arc(from.x, from.y, Math.min(7, Math.max(4, cell * 0.09)), 0, Math.PI * 2)
            context.fillStyle = COLORS[colorIdx]
            context.globalAlpha = 0.35
            context.fill()
            context.globalAlpha = 1

            if (draft.to) {
                const to = toPixels(draft.to)
                context.beginPath()
                context.moveTo(from.x, from.y)
                context.lineTo(to.x, to.y)
                context.lineWidth = Math.min(8, Math.max(3.5, cell * 0.1))
                context.strokeStyle = COLORS[colorIdx]
                context.globalAlpha = 0.75
                context.lineCap = 'round'
                context.stroke()
                context.globalAlpha = 1

                context.beginPath()
                context.arc(to.x, to.y, Math.min(8, Math.max(5, cell * 0.11)), 0, Math.PI * 2)
                context.lineWidth = 2
                context.strokeStyle = '#ffffff'
                context.stroke()
            }
        }
    }, [bands, draft, selectedId, dims, layout, colorIdx])

    // ── Historial ────────────────────────────────────────────────────────────
    const pushHistory = useCallback((current: Band[]) => {
        setHistory((prev) => [...prev.slice(-39), cloneBands(current)])
    }, [])

    const undo = () => {
        if (history.length === 0) {
            setNotice('No hay acciones para deshacer')
            return
        }
        setBands(cloneBands(history[history.length - 1]))
        setHistory((prev) => prev.slice(0, -1))
        setSelectedId(null)
        setSolved(null)
        draftRef.current = null
        setDraft(null)
    }

    // ── Conversión de coordenadas ────────────────────────────────────────────
    const getPointerInfo = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        if (rect.width < 10 || rect.height < 10) return null
        const { cell, offsetX, offsetY, cols, rows } = computeLayout(rect.width, rect.height, shortSidePoints)
        const gx = (clientX - rect.left - offsetX) / cell
        const gy = (clientY - rect.top - offsetY) / cell
        const rx = Math.round(gx)
        const ry = Math.round(gy)
        const inside = rx >= 0 && ry >= 0 && rx < cols && ry < rows
        const snapped = inside && Math.hypot(gx - rx, gy - ry) <= 0.55 ? { x: rx, y: ry } : null
        return { gx, gy, cell, snapped }
    }

    const hitBandAt = (gx: number, gy: number, cell: number) => {
        const threshold = Math.max(0.18, 10 / cell)
        for (const band of [...bands].reverse()) {
            const points = band.closed ? [...band.points, band.points[0]] : band.points
            for (let i = 0; i < points.length - 1; i++) {
                if (distToSegment(gx, gy, points[i], points[i + 1]) <= threshold) return band
            }
        }
        return null
    }

    const updateDraft = (value: { from: Point; to: Point | null } | null) => {
        draftRef.current = value
        setDraft(value)
    }

    // ── Validación de retos ─────────────────────────────────────────────────
    const evaluateChallenge = (challenge: Challenge | null, nextBands: Band[], nextSelectedId: number | null) => {
        if (!challenge) return
        const target =
            nextBands.find((band) => band.id === nextSelectedId && band.closed) ??
            [...nextBands].reverse().find((band) => band.closed)
        if (!target || !challenge.check(target)) return
        const key = `${challenge.id}:${target.id}`
        if (solvedKeysRef.current.has(key)) return
        solvedKeysRef.current.add(key)
        const stats = shapeStats(target)
        setCompleted((prev) => (prev.includes(challenge.id) ? prev : [...prev, challenge.id]))
        setSolved({ title: challenge.title, area: stats.area, perimeter: stats.perimeter })
    }

    // ── Punteros ─────────────────────────────────────────────────────────────
    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const info = getPointerInfo(event.clientX, event.clientY)
        if (!info) return

        try {
            event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
            // Algunos navegadores no permiten capturar el puntero; no es crítico.
        }
        const selected = bands.find((band) => band.id === selectedId) ?? null

        // Continuar una liga abierta desde su último punto
        if (info.snapped && selected && !selected.closed) {
            const last = selected.points[selected.points.length - 1]
            if (samePoint(info.snapped, last)) {
                gestureRef.current = { kind: 'draw', from: last, bandId: selected.id }
                updateDraft({ from: last, to: null })
                return
            }
        }

        // Mover la liga seleccionada desde cualquiera de sus vértices
        if (info.snapped && selected && selected.points.some((point) => samePoint(point, info.snapped!))) {
            pushHistory(bands)
            lastDeltaRef.current = { dx: 0, dy: 0 }
            gestureRef.current = {
                kind: 'move',
                bandId: selected.id,
                grabbed: info.snapped,
                original: selected.points.map((point) => ({ ...point })),
            }
            return
        }

        // Empezar una liga nueva
        if (info.snapped) {
            gestureRef.current = { kind: 'draw', from: info.snapped, bandId: null }
            updateDraft({ from: info.snapped, to: null })
            return
        }

        // Seleccionar o deseleccionar tocando una liga
        const hit = hitBandAt(info.gx, info.gy, info.cell)
        setSelectedId(hit ? hit.id : null)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const gesture = gestureRef.current
        if (!gesture) return
        const info = getPointerInfo(event.clientX, event.clientY)
        if (!info) return

        if (gesture.kind === 'draw') {
            const current = draftRef.current
            const next = info.snapped
            if (current?.to && next && samePoint(current.to, next)) return
            if (!current?.to && !next) return
            updateDraft({ from: gesture.from, to: next })
            return
        }

        if (!info.snapped) return
        const dx = info.snapped.x - gesture.grabbed.x
        const dy = info.snapped.y - gesture.grabbed.y
        if (dx === lastDeltaRef.current.dx && dy === lastDeltaRef.current.dy) return
        lastDeltaRef.current = { dx, dy }
        const delta = clampDelta(gesture.original, dx, dy, layout.cols, layout.rows)
        setBands((prev) =>
            prev.map((band) =>
                band.id === gesture.bandId
                    ? {
                        ...band,
                        points: gesture.original.map((point) => ({
                            x: point.x + delta.dx,
                            y: point.y + delta.dy,
                        })),
                    }
                    : band,
            ),
        )
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const gesture = gestureRef.current
        if (!gesture) return
        gestureRef.current = null

        const info = getPointerInfo(event.clientX, event.clientY)
        const target = info?.snapped ?? draftRef.current?.to ?? null
        updateDraft(null)

        if (gesture.kind === 'move') {
            lastDeltaRef.current = { dx: 0, dy: 0 }
            evaluateChallenge(activeChallenge, bands, selectedId)
            return
        }

        if (!target || samePoint(gesture.from, target)) return

        // Extender o cerrar una liga existente
        if (gesture.bandId !== null) {
            const band = bands.find((item) => item.id === gesture.bandId)
            if (!band || band.closed) return
            const last = band.points[band.points.length - 1]
            if (samePoint(target, last)) return
            const closing = band.points.length >= 3 && samePoint(target, band.points[0])
            pushHistory(bands)
            const next = bands.map((item) =>
                item.id !== band.id
                    ? item
                    : {
                        ...item,
                        points: closing ? item.points : [...item.points, target],
                        closed: closing,
                    },
            )
            setBands(next)
            evaluateChallenge(activeChallenge, next, band.id)
            return
        }

        // Crear una liga nueva
        if (bands.length >= MAX_BANDS) {
            setNotice(`Máximo ${MAX_BANDS} ligas. Borra alguna para seguir.`)
            return
        }
        pushHistory(bands)
        const id = nextIdRef.current++
        const next = [...bands, { id, color: COLORS[colorIdx], points: [gesture.from, target], closed: false }]
        setBands(next)
        setSelectedId(id)
        evaluateChallenge(activeChallenge, next, id)
    }

    const handlePointerCancel = () => {
        const gesture = gestureRef.current
        gestureRef.current = null
        updateDraft(null)
        lastDeltaRef.current = { dx: 0, dy: 0 }
        if (gesture?.kind === 'move') {
            setBands((prev) =>
                prev.map((band) =>
                    band.id === gesture.bandId ? { ...band, points: gesture.original } : band,
                ),
            )
            setHistory((prev) => prev.slice(0, -1))
        }
    }

    // ── Acciones ─────────────────────────────────────────────────────────────
    const selectedBand = bands.find((band) => band.id === selectedId) ?? null
    const canClose = Boolean(selectedBand && !selectedBand.closed && selectedBand.points.length >= 3)

    const closeSelected = () => {
        if (!selectedBand || selectedBand.closed || selectedBand.points.length < 3) return
        pushHistory(bands)
        const next = bands.map((band) =>
            band.id === selectedBand.id ? { ...band, closed: true } : band,
        )
        setBands(next)
        evaluateChallenge(activeChallenge, next, selectedBand.id)
    }

    const deleteSelected = () => {
        if (!selectedBand) return
        pushHistory(bands)
        setBands((prev) => prev.filter((band) => band.id !== selectedBand.id))
        setSelectedId(null)
        setSolved(null)
    }

    // El color solo aplica a la liga que se creará después; no recolorea las existentes
    const pickColor = (index: number) => {
        setColorIdx(index)
    }

    const requestDensity = (size: number) => {
        if (size === shortSidePoints) return
        if (bands.length > 0) {
            setConfirmAction({ kind: 'size', size })
            return
        }
        setShortSidePoints(size)
    }

    const requestClear = () => {
        if (bands.length === 0) return
        setConfirmAction({ kind: 'clear' })
    }

    const runConfirmedAction = () => {
        if (!confirmAction) return
        if (confirmAction.kind === 'size') {
            setShortSidePoints(confirmAction.size)
            resetBoard()
        } else {
            pushHistory(bands)
            setBands([])
            setSelectedId(null)
            setSolved(null)
            updateDraft(null)
        }
        setConfirmAction(null)
    }

    // ── Retos ────────────────────────────────────────────────────────────────
    const activeChallenge = CHALLENGES.find((challenge) => challenge.id === activeChallengeId) ?? null

    const measureBand = selectedBand?.closed
        ? selectedBand
        : [...bands].reverse().find((band) => band.closed) ?? null

    const measure = measureBand ? shapeStats(measureBand) : null

    const goNextChallenge = () => {
        let next: Challenge | null = null
        if (activeChallenge) {
            const start = CHALLENGES.findIndex((challenge) => challenge.id === activeChallenge.id)
            for (let step = 1; step <= CHALLENGES.length; step++) {
                const candidate = CHALLENGES[(start + step) % CHALLENGES.length]
                if (!completed.includes(candidate.id)) {
                    next = candidate
                    break
                }
            }
        }
        setSolved(null)
        if (!next) {
            setActiveChallengeId(null)
            setNotice('¡Completaste todos los retos!')
            return
        }
        setActiveChallengeId(next.id)
        evaluateChallenge(next, bands, selectedId)
    }

    const startChallenge = (challenge: Challenge | null) => {
        setActiveChallengeId(challenge ? challenge.id : null)
        setSolved(null)
        setShowRetos(false)
        evaluateChallenge(challenge, bands, selectedId)
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none"
            style={{ fontFamily: "'Nunito', sans-serif" }}
        >
            {/* Barra superior compacta */}
            <header className="flex shrink-0 items-center gap-1.5 border-b border-white/5 px-2 py-1 lg:py-1.5">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Volver"
                >
                    <ArrowLeft size={16} />
                </button>

                <h1 className="shrink-0 text-[13px] font-black leading-none tracking-tight sm:text-sm">Geoplano</h1>

                <div className="min-w-0 flex-1" />

                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
                    {DENSITIES.map((size) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => requestDensity(size)}
                            title={`${size} puntos en el lado corto de la pantalla`}
                            aria-label={`${size} puntos en el lado corto`}
                            aria-pressed={shortSidePoints === size}
                            className={`h-7 w-7 rounded-md text-[11px] font-bold transition-colors lg:h-8 lg:w-8 ${shortSidePoints === size
                                ? 'bg-teal-400 text-[#06272a]'
                                : 'text-white/45 hover:bg-white/10'
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Ayuda"
                >
                    <HelpCircle size={16} />
                </button>
                <button
                    type="button"
                    onClick={undo}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Deshacer"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    type="button"
                    onClick={requestClear}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-rose-500/15 hover:text-rose-300 active:scale-95 lg:h-8 lg:w-8"
                    aria-label="Borrar todo"
                >
                    <Trash2 size={16} />
                </button>
            </header>

            {/* Reto activo: franja fina que no tapa el tablero */}
            {activeChallenge && (
                <div className="flex shrink-0 items-center gap-1.5 border-b border-white/5 bg-teal-400/[0.06] px-2 py-1">
                    <Target size={12} className="shrink-0 text-teal-300/80" />
                    <button
                        type="button"
                        onClick={() => setShowRetos(true)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-teal-300/70">
                            Reto {CHALLENGES.findIndex((challenge) => challenge.id === activeChallenge.id) + 1}
                        </span>
                        <span className="truncate text-[11px] font-bold leading-none">{activeChallenge.title}</span>
                    </button>
                    {completed.includes(activeChallenge.id) ? (
                        <Check size={12} className="shrink-0 text-teal-300" />
                    ) : (
                        <span className="hidden shrink-0 text-[9px] text-white/25 sm:inline">{activeChallenge.hint}</span>
                    )}
                    <button
                        type="button"
                        onClick={() => startChallenge(null)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white lg:h-7 lg:w-7"
                        aria-label="Quitar reto"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Tablero */}
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
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onContextMenu={(event) => event.preventDefault()}
                    />

                    {bands.length === 0 && !draft && (
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4">
                            <p className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] leading-tight text-white/40">
                                Arrastra de un punto a otro para empezar
                            </p>
                        </div>
                    )}

                    {/* Reto logrado */}
                    {solved && (
                        <div className="absolute inset-x-2 bottom-2 rounded-2xl border border-teal-400/30 bg-[#0a1b1e]/95 p-3 shadow-2xl backdrop-blur sm:left-1/2 sm:w-80 sm:-translate-x-1/2">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400/15">
                                    <Sparkles size={18} className="text-teal-300" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black leading-tight">¡Reto logrado!</p>
                                    <p className="truncate text-[10px] text-white/40">
                                        {solved.title} · área {formatNumber(solved.area)} · perímetro {formatNumber(solved.perimeter)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSolved(null)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white/60 hover:bg-white/10 active:scale-95"
                                >
                                    Seguir dibujando
                                </button>
                                <button
                                    type="button"
                                    onClick={goNextChallenge}
                                    className="flex-1 rounded-xl bg-teal-400 py-2 text-[11px] font-black text-[#06272a] hover:bg-teal-300 active:scale-95"
                                >
                                    Siguiente reto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Aviso */}
                    {notice && (
                        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                            <p className="rounded-full border border-white/10 bg-[#0b1120]/95 px-3 py-1.5 text-[11px] font-semibold text-white/70 shadow-lg">
                                {notice}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Barra inferior */}
            <footer className="shrink-0 border-t border-white/5 px-2 py-1 lg:py-1.5">
                <div className="mx-auto flex max-w-6xl items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1.5">
                        {COLORS.map((color, index) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => pickColor(index)}
                                title={COLOR_NAMES[index]}
                                aria-label={`Color ${COLOR_NAMES[index]}`}
                                aria-pressed={colorIdx === index}
                                className={`h-6 w-6 rounded-full transition-all lg:h-8 lg:w-8 ${colorIdx === index
                                    ? 'scale-110 ring-2 ring-white/80'
                                    : 'ring-1 ring-white/15 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    {measure ? (
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1 text-[10px] font-bold leading-none text-white/55 max-[460px]:hidden">
                            <span className="shrink-0 text-white/25">{measure.vertices} lados</span>
                            <span className="shrink-0">{formatNumber(measure.area)} u²</span>
                            <span className="shrink-0 text-white/15">·</span>
                            <span className="shrink-0">{formatNumber(measure.perimeter)} u</span>
                        </div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    {selectedBand && (
                        <button
                            type="button"
                            onClick={deleteSelected}
                            className="flex h-6 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-white/60 transition-colors hover:bg-rose-500/15 hover:text-rose-300 active:scale-95 lg:h-8"
                            aria-label="Eliminar liga seleccionada"
                        >
                            <Eraser size={14} />
                            <span className="hidden sm:inline">Eliminar</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={closeSelected}
                        disabled={!canClose}
                        className="flex h-6 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-white/60 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30 lg:h-8"
                        aria-label="Cerrar figura"
                    >
                        <Check size={14} />
                        <span className="hidden sm:inline">Cerrar</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowRetos(true)}
                        className="flex h-6 shrink-0 items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2 text-[11px] font-bold text-teal-300 transition-colors hover:bg-teal-400/20 active:scale-95 lg:h-8"
                        aria-label={`Retos: ${completed.length} de ${CHALLENGES.length}`}
                    >
                        <Target size={14} />
                        <span className="hidden sm:inline">Retos</span>
                        <span className="rounded-full bg-teal-400/20 px-1 text-[10px] leading-4">
                            {completed.length}/{CHALLENGES.length}
                        </span>
                    </button>
                </div>
            </footer>

            {/* Modal de retos */}
            {showRetos && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
                    <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-black">Retos</h2>
                                <p className="text-[11px] text-white/35">
                                    {completed.length} de {CHALLENGES.length} completados
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRetos(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                aria-label="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {CHALLENGES.map((challenge, index) => {
                                const done = completed.includes(challenge.id)
                                const active = challenge.id === activeChallengeId
                                return (
                                    <button
                                        key={challenge.id}
                                        type="button"
                                        onClick={() => startChallenge(challenge)}
                                        className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${active
                                            ? 'border-teal-400/40 bg-teal-400/10'
                                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                                            }`}
                                    >
                                        <span
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${done
                                                ? 'bg-teal-400 text-[#06272a]'
                                                : 'border border-white/10 bg-white/5 text-white/35'
                                                }`}
                                        >
                                            {done ? <Check size={12} /> : index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-bold leading-tight">{challenge.title}</span>
                                            <span className="block text-[10px] leading-tight text-white/30">{challenge.hint}</span>
                                        </span>
                                        {active && (
                                            <span className="shrink-0 rounded-full bg-teal-400/15 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                                                Activo
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => startChallenge(null)}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/50 hover:bg-white/10"
                        >
                            Explorar sin reto
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de ayuda */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-black">Cómo usar el geoplano</h2>
                            <button
                                type="button"
                                onClick={() => setShowHelp(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                aria-label="Cerrar ayuda"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <ol className="space-y-2 text-[11px] text-white/55">
                            <li className="flex gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/15 text-[9px] font-black text-teal-300">1</span>
                                <span>Toca un punto y <b className="text-white/80">arrastra</b> hasta otro para crear una liga.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/15 text-[9px] font-black text-teal-300">2</span>
                                <span>Desde el <b className="text-white/80">último punto</b> de la liga seleccionada puedes alargarla. Vuelve al primer punto para cerrarla.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/15 text-[9px] font-black text-teal-300">3</span>
                                <span>Toca una liga para seleccionarla: cambia su color, bórrala o arrastra sus vértices para moverla.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/15 text-[9px] font-black text-teal-300">4</span>
                                <span>Con la figura cerrada verás <b className="text-white/80">área</b> y <b className="text-white/80">perímetro</b>. Entra a <b className="text-white/80">Retos</b> para practicar.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-400/15 text-[9px] font-black text-teal-300">5</span>
                                <span>Los botones <b className="text-white/80">13 · 7 · 5</b> cambian el número de puntos del lado corto. El resto del tablero se llena solo: más columnas en horizontal y más filas en vertical.</span>
                            </li>
                        </ol>
                        <p className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-[9px] leading-relaxed text-white/30">
                            Si giras la tablet, el tablero se adapta y se reinicia. Al salir del geoplano la figura también se borra.
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

            {/* Confirmación */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1629] p-4 shadow-2xl">
                        <h2 className="text-base font-black">
                            {confirmAction.kind === 'clear' ? '¿Borrar toda la figura?' : `¿Cuadrícula de ${confirmAction.size} puntos?`}
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                            {confirmAction.kind === 'clear'
                                ? 'Se perderán las ligas y los retos en curso de esta figura.'
                                : `El lado corto tendrá ${confirmAction.size} puntos y el lado largo se llena solo. Se perderán las ligas y los retos en curso.`}
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={runConfirmedAction}
                                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-xs font-black text-white hover:bg-rose-400 active:scale-95"
                            >
                                {confirmAction.kind === 'clear' ? 'Borrar' : 'Cambiar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
