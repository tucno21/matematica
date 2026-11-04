import React, { useState, useRef, useCallback, useEffect, useId, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  Sliders,
  ChevronRight,
  Move,
  Info,
  Wand2,
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'
import { useThemeStore } from '../store/useThemeStore'

// Casos predefinidos de estudio pedagógico
interface PresetCase {
  id: string
  title: string
  shortLabel: string
  desc: string
  a: number
  b: number
  c: number
}

const PRESET_CASES: PresetCase[] = [
  {
    id: 'caso-1',
    title: 'Caso 1',
    shortLabel: 'Caso 1',
    desc: 'Caso 1: segmentos de 11, 4 y 3 unidades',
    a: 11,
    b: 4,
    c: 3,
  },
  {
    id: 'caso-2',
    title: 'Caso 2',
    shortLabel: 'Caso 2',
    desc: 'Caso 2: segmentos de 8, 6 y 5 unidades',
    a: 8,
    b: 6,
    c: 5,
  },
  {
    id: 'caso-limite',
    title: 'Caso Límite: Línea Recta (10, 6, 4)',
    shortLabel: 'Límite',
    desc: 'La suma es igual al lado mayor (6 + 4 = 10). Colapsa en una línea plana.',
    a: 10,
    b: 6,
    c: 4,
  },
  {
    id: 'equilatero',
    title: 'Equilátero (7, 7, 7)',
    shortLabel: 'Equilátero',
    desc: 'Tres lados iguales (7 + 7 = 14 > 7). Forma un triángulo perfecto.',
    a: 7,
    b: 7,
    c: 7,
  },
  {
    id: 'pitagorico',
    title: 'Rectángulo Pitagórico (5, 4, 3)',
    shortLabel: '3-4-5',
    desc: 'Forma un triángulo rectángulo con ángulo de 90° (4 + 3 = 7 > 5).',
    a: 5,
    b: 4,
    c: 3,
  },
  {
    id: 'libre',
    title: 'Modo Libre (Personalizado)',
    shortLabel: 'Libre',
    desc: 'Ajusta los 3 lados libremente y descubre si cumplen el teorema.',
    a: 9,
    b: 7,
    c: 4,
  },
]

// Estructura de segmento arrastrable y rotativo
interface SegmentData {
  id: 'a' | 'b' | 'c'
  label: string
  units: number
  color: string
  accentColor: string
  p1: { x: number; y: number } // Extremo 1
  p2: { x: number; y: number } // Extremo 2
}

const SEGMENT_COLORS_DARK = {
  a: { main: '#38bdf8', accent: '#0284c7', glow: 'rgba(56, 189, 248, 0.4)' }, // Cian
  b: { main: '#fbbf24', accent: '#d97706', glow: 'rgba(251, 191, 36, 0.4)' }, // Ámbar
  c: { main: '#f472b6', accent: '#db2777', glow: 'rgba(244, 114, 182, 0.4)' }, // Rosa
}

const SEGMENT_COLORS_LIGHT = {
  a: { main: '#0284c7', accent: '#0369a1', glow: 'rgba(2, 132, 199, 0.3)' }, // Azul cian oscuro
  b: { main: '#d97706', accent: '#b45309', glow: 'rgba(217, 119, 6, 0.3)' }, // Ámbar intenso
  c: { main: '#db2777', accent: '#be185d', glow: 'rgba(219, 39, 119, 0.3)' }, // Rosa magenta profundo
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Cálculo geométrico exacto de la intersección de dos circunferencias para cierre magnético
function getCircleCircleIntersections(
  p1: { x: number; y: number },
  r1: number,
  p2: { x: number; y: number },
  r2: number
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const d = Math.hypot(dx, dy)

  // Tolerancia de 3px para asegurar toque en casos tangenciales límite
  if (d > r1 + r2 + 3 || d < Math.abs(r1 - r2) - 3 || d < 1e-4) {
    return null
  }

  const clampedD = Math.max(Math.abs(r1 - r2), Math.min(r1 + r2, d))
  const a = (r1 * r1 - r2 * r2 + clampedD * clampedD) / (2 * clampedD)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))

  const x2 = p1.x + (a * dx) / clampedD
  const y2 = p1.y + (a * dy) / clampedD

  const rx = -dy * (h / clampedD)
  const ry = dx * (h / clampedD)

  return [
    { x: Math.round(x2 + rx), y: Math.round(y2 + ry) },
    { x: Math.round(x2 - rx), y: Math.round(y2 - ry) },
  ]
}

// Detección de imán para el cierre perfecto de dos barras que comparten una base (solo a muy corta distancia)
function tryTriangleClosingSnap(
  draggedSegId: 'a' | 'b' | 'c',
  draggedEnd: 'p1' | 'p2',
  candidateP: { x: number; y: number },
  currentSegments: SegmentData[],
  pxPerUnit: number,
  snapRadius = 14
): {
  didSnap: boolean
  draggedP: { x: number; y: number }
  otherSegId?: 'a' | 'b' | 'c'
  otherEnd?: 'p1' | 'p2'
  otherP?: { x: number; y: number }
} {
  const sDrag = currentSegments.find(s => s.id === draggedSegId)
  if (!sDrag) return { didSnap: false, draggedP: candidateP }

  const others = currentSegments.filter(s => s.id !== draggedSegId)
  if (others.length < 2) return { didSnap: false, draggedP: candidateP }

  const pivotDrag = draggedEnd === 'p1' ? sDrag.p2 : sDrag.p1
  const rDrag = sDrag.units * pxPerUnit

  // Probar cuál de los otros dos segmentos actúa como base conectada al pivotDrag
  for (const sBase of others) {
    const sThird = others.find(s => s.id !== sBase.id)!

    const connToP1 = getDistance(pivotDrag, sBase.p1) <= 8
    const connToP2 = getDistance(pivotDrag, sBase.p2) <= 8
    if (!connToP1 && !connToP2) continue

    const baseOtherEnd = connToP1 ? sBase.p2 : sBase.p1

    // Verificar si sThird está conectado a baseOtherEnd
    const thirdConnToP1 = getDistance(baseOtherEnd, sThird.p1) <= 8
    const thirdConnToP2 = getDistance(baseOtherEnd, sThird.p2) <= 8
    if (!thirdConnToP1 && !thirdConnToP2) continue

    const thirdPivot = thirdConnToP1 ? sThird.p1 : sThird.p2
    const thirdFreeEnd: 'p1' | 'p2' = thirdConnToP1 ? 'p2' : 'p1'
    const thirdFreePt = sThird[thirdFreeEnd]
    const rThird = sThird.units * pxPerUnit

    // Requisito 1: Ambos extremos DEBEN estar ya muy cerca entre sí (círculos casi tocándose)
    const distBetweenTips = getDistance(candidateP, thirdFreePt)
    if (distBetweenTips > snapRadius) continue

    const intersections = getCircleCircleIntersections(pivotDrag, rDrag, thirdPivot, rThird)
    if (!intersections) continue

    const d0 = getDistance(candidateP, intersections[0])
    const d1 = getDistance(candidateP, intersections[1])
    const bestI = d0 <= d1 ? intersections[0] : intersections[1]

    // Requisito 2: Ambos extremos deben estar muy cerca del punto exacto de encuentro
    if (getDistance(candidateP, bestI) <= snapRadius && getDistance(thirdFreePt, bestI) <= snapRadius) {
      return {
        didSnap: true,
        draggedP: bestI,
        otherSegId: sThird.id,
        otherEnd: thirdFreeEnd,
        otherP: bestI,
      }
    }
  }

  return { didSnap: false, draggedP: candidateP }
}

export default function ExistenciaTrianguloView() {
  const nav = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')
  const segColors = isDark ? SEGMENT_COLORS_DARK : SEGMENT_COLORS_LIGHT
  const helpId = useId()
  const [showHelp, setShowHelp] = useState(false)

  // Caso actual (Por defecto Caso 1: Triángulo Imposible)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('caso-1')

  // Medidas de los 3 lados (en unidades)
  const [sideA, setSideA] = useState(11)
  const [sideB, setSideB] = useState(4)
  const [sideC, setSideC] = useState(3)

  // Opciones visuales
  const [showReachCircles, setShowReachCircles] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)

  // Desplazamiento y Zoom del lienzo
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  // Referencias para evitar stale closures
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  useEffect(() => {
    panRef.current = pan
    zoomRef.current = zoom
  }, [pan, zoom])

  // Detección de orientación vertical vs horizontal
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth
    }
    return false
  })

  // Dimensiones del canvas
  const [canvasDim, setCanvasDim] = useState({ w: 600, h: 420 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Factor de escala: píxeles de mundo por cada unidad de longitud
  const isLargeScreen = canvasDim.w >= 1024 && canvasDim.h >= 550
  const pxPerUnit = isLargeScreen ? 34 : 27

  // Segmentos en el plano
  const [segments, setSegments] = useState<SegmentData[]>([])

  // Generador de posición inicial de segmentos (verticales y espaciados)
  const initSegments = useCallback((aU: number, bU: number, cU: number, cw: number, ch: number) => {
    const cx = cw / 2
    const cy = ch / 2

    const lenA = aU * pxPerUnit
    const lenB = bU * pxPerUnit
    const lenC = cU * pxPerUnit

    // Espaciado horizontal inicial
    const spacing = Math.max(70, Math.min(cw * 0.18, 120))
    const startX = cx - spacing

    const segA: SegmentData = {
      id: 'a',
      label: `a = ${aU}`,
      units: aU,
      color: segColors.a.main,
      accentColor: segColors.a.accent,
      p1: { x: Math.round(startX), y: Math.round(cy - lenA / 2) },
      p2: { x: Math.round(startX), y: Math.round(cy + lenA / 2) },
    }

    const segB: SegmentData = {
      id: 'b',
      label: `b = ${bU}`,
      units: bU,
      color: segColors.b.main,
      accentColor: segColors.b.accent,
      p1: { x: Math.round(cx), y: Math.round(cy - lenB / 2) },
      p2: { x: Math.round(cx), y: Math.round(cy + lenB / 2) },
    }

    const segC: SegmentData = {
      id: 'c',
      label: `c = ${cU}`,
      units: cU,
      color: segColors.c.main,
      accentColor: segColors.c.accent,
      p1: { x: Math.round(startX + spacing * 2), y: Math.round(cy - lenC / 2) },
      p2: { x: Math.round(startX + spacing * 2), y: Math.round(cy + lenC / 2) },
    }

    return [segA, segB, segC]
  }, [pxPerUnit, segColors])

  // Montaje inicial y resize
  const isFirstMount = useRef(true)
  useEffect(() => {
    const updateSize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const w = Math.max(300, rect.width)
        const h = Math.max(220, rect.height)
        setCanvasDim({ w, h })
        if (isFirstMount.current && rect.width > 0 && rect.height > 0) {
          isFirstMount.current = false
          setSegments(initSegments(sideA, sideB, sideC, w, h))
        }
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [initSegments, sideA, sideB, sideC])

  // Selección de caso predefinido
  const handleSelectCase = (preset: PresetCase) => {
    setSelectedCaseId(preset.id)
    setSideA(preset.a)
    setSideB(preset.b)
    setSideC(preset.c)
    setPan({ x: 0, y: 0 })
    setZoom(1)
    setSegments(initSegments(preset.a, preset.b, preset.c, canvasDim.w, canvasDim.h))
  }

  // Comprobación matemática de la desigualdad triangular
  const inequalityCheck = useMemo(() => {
    const a = sideA
    const b = sideB
    const c = sideC

    const c1 = a + b > c
    const c2 = a + c > b
    const c3 = b + c > a

    const sumAB = a + b
    const sumAC = a + c
    const sumBC = b + c

    // Identificar lado mayor
    const maxVal = Math.max(a, b, c)
    const sumOthers = a + b + c - maxVal

    let status: 'valid' | 'impossible' | 'degenerate' = 'valid'
    let message = ''

    if (sumOthers > maxVal) {
      status = 'valid'
      message = `¡Cumple la propiedad! ${sumOthers} > ${maxVal}. Los 3 segmentos SÍ pueden formar un triángulo.`
    } else if (sumOthers === maxVal) {
      status = 'degenerate'
      message = `Caso límite: ${sumOthers} = ${maxVal}. Los dos lados menores colapsan en una línea recta.`
    } else {
      status = 'impossible'
      message = `Imposible: ${sumOthers} < ${maxVal}. Los lados menores son muy cortos para unirse.`
    }

    return {
      c1,
      c2,
      c3,
      sumAB,
      sumAC,
      sumBC,
      status,
      message,
    }
  }, [sideA, sideB, sideC])

  // Verificación geométrica en tiempo real: ¿Están los 3 pares de extremos unidos?
  const triangleStatus = useMemo(() => {
    if (segments.length < 3) return { isClosed: false, vertices: [] }

    const sA = segments[0]
    const sB = segments[1]
    const sC = segments[2]

    const ptsA = [sA.p1, sA.p2]
    const ptsB = [sB.p1, sB.p2]
    const ptsC = [sC.p1, sC.p2]

    const TOLERANCE = 6 // Tolerancia estricta: los extremos deben coincidir físicamente

    // Buscar si existe un emparejamiento cíclico entre A, B y C
    let closed = false
    let vAB: { x: number; y: number } | null = null
    let vBC: { x: number; y: number } | null = null
    let vCA: { x: number; y: number } | null = null

    for (let iA = 0; iA < 2; iA++) {
      for (let iB = 0; iB < 2; iB++) {
        if (getDistance(ptsA[iA], ptsB[iB]) <= TOLERANCE) {
          const remA = ptsA[1 - iA]
          const remB = ptsB[1 - iB]

          for (let iC = 0; iC < 2; iC++) {
            if (getDistance(remB, ptsC[iC]) <= TOLERANCE) {
              const remC = ptsC[1 - iC]
              if (getDistance(remC, remA) <= TOLERANCE) {
                closed = true
                vAB = { x: (ptsA[iA].x + ptsB[iB].x) / 2, y: (ptsA[iA].y + ptsB[iB].y) / 2 }
                vBC = { x: (remB.x + ptsC[iC].x) / 2, y: (remB.y + ptsC[iC].y) / 2 }
                vCA = { x: (remC.x + remA.x) / 2, y: (remC.y + remA.y) / 2 }
                break
              }
            }
          }
        }
        if (closed) break
      }
      if (closed) break
    }

    // Verificar que el triángulo no sea un punto o línea colapsada (área > 20)
    let area = 0
    if (closed && vAB && vBC && vCA) {
      area = Math.abs((vAB.x * (vBC.y - vCA.y) + vBC.x * (vCA.y - vAB.y) + vCA.x * (vAB.y - vBC.y)) / 2)
    }

    const isValidTriangle = closed && area > 25

    return {
      isClosed: isValidTriangle,
      vertices: vAB && vBC && vCA ? [vAB, vBC, vCA] : [],
      area,
    }
  }, [segments])

  // ── ZOOM CENTRADO EN EL PUNTERO O EN EL PUNTO MEDIO DE 2 DEDOS ──
  const applyZoomToPoint = useCallback((targetZoom: number, clientX: number, clientY: number) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const currentZoom = zoomRef.current
    const currentPan = panRef.current
    const nextZoom = Math.min(3.0, Math.max(0.5, Math.round(targetZoom * 100) / 100))
    if (Math.abs(nextZoom - currentZoom) < 0.001) return

    const worldX = (px - currentPan.x) / currentZoom
    const worldY = (py - currentPan.y) / currentZoom

    const newPanX = Math.round(px - worldX * nextZoom)
    const newPanY = Math.round(py - worldY * nextZoom)

    setZoom(nextZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [])

  // Zoom con rueda de ratón hacia el puntero
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.15 : 0.85
      applyZoomToPoint(zoomRef.current * factor, e.clientX, e.clientY)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyZoomToPoint])

  // ── GESTIÓN DE INTERACCIÓN: TRASLACIÓN DE SEGMENTOS, GIRO DE EXTREMOS Y PAN/ZOOM DE LIENZO ──
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isPanningCanvasRef = useRef(false)
  const isInteractingSegmentRef = useRef(false)

  // Estado del segmento interactuado
  const activeDragRef = useRef<{
    segmentId: 'a' | 'b' | 'c'
    type: 'body' | 'p1' | 'p2'
    startX: number
    startY: number
    initialP1: { x: number; y: number }
    initialP2: { x: number; y: number }
  } | null>(null)

  const panStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 })
  const pinchStartRef = useRef({ dist: 0, zoom: 1, midX: 0, midY: 0 })

  // Comprobar imán con otros extremos disponibles (solo a corta distancia <= 14px)
  const checkEndpointSnap = useCallback(
    (point: { x: number; y: number }, segId: 'a' | 'b' | 'c', snapRadius = 14) => {
      let snappedPoint = { ...point }
      let didSnap = false
      let minDist = snapRadius

      for (const s of segments) {
        if (s.id === segId) continue

        const d1 = getDistance(point, s.p1)
        if (d1 <= minDist) {
          snappedPoint = { ...s.p1 }
          didSnap = true
          minDist = d1
        }
        const d2 = getDistance(point, s.p2)
        if (d2 <= minDist) {
          snappedPoint = { ...s.p2 }
          didSnap = true
          minDist = d2
        }
      }

      return { point: snappedPoint, didSnap }
    },
    [segments]
  )

  // Pointer Down en el lienzo libre
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [data-segment-interactive]')) return
    if (e.button !== 0 && e.pointerType === 'mouse') return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      isInteractingSegmentRef.current = false
      activeDragRef.current = null
      isPanningCanvasRef.current = false

      const pts = Array.from(activePointersRef.current.values())
      pinchStartRef.current = {
        dist: getDistance(pts[0], pts[1]),
        zoom: zoomRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
    } else if (activePointersRef.current.size === 1) {
      isPanningCanvasRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y,
      }
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!activePointersRef.current.has(ev.pointerId)) return
      activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

      if (activePointersRef.current.size >= 2) {
        const pts = Array.from(activePointersRef.current.values())
        const curDist = getDistance(pts[0], pts[1])
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2

        if (pinchStartRef.current.dist > 5) {
          const ratio = curDist / pinchStartRef.current.dist
          applyZoomToPoint(pinchStartRef.current.zoom * ratio, midX, midY)
        }
      } else if (isPanningCanvasRef.current) {
        const dx = ev.clientX - panStartRef.current.x
        const dy = ev.clientY - panStartRef.current.y
        setPan({
          x: Math.round(panStartRef.current.initialPanX + dx),
          y: Math.round(panStartRef.current.initialPanY + dy),
        })
      }
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      if (activePointersRef.current.size === 0) {
        isPanningCanvasRef.current = false
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Pointer Down en el cuerpo de un segmento (Traslación total)
  const handleSegmentBodyPointerDown = (e: React.PointerEvent, seg: SegmentData) => {
    e.stopPropagation()
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      isInteractingSegmentRef.current = false
      activeDragRef.current = null
      return
    }

    isInteractingSegmentRef.current = true
    activeDragRef.current = {
      segmentId: seg.id,
      type: 'body',
      startX: e.clientX,
      startY: e.clientY,
      initialP1: { ...seg.p1 },
      initialP2: { ...seg.p2 },
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!activePointersRef.current.has(ev.pointerId)) return
      activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

      if (activePointersRef.current.size >= 2) {
        isInteractingSegmentRef.current = false
        activeDragRef.current = null
        const pts = Array.from(activePointersRef.current.values())
        applyZoomToPoint(
          pinchStartRef.current.zoom * (getDistance(pts[0], pts[1]) / (pinchStartRef.current.dist || 1)),
          (pts[0].x + pts[1].x) / 2,
          (pts[0].y + pts[1].y) / 2
        )
        return
      }

      const drag = activeDragRef.current
      if (!drag || drag.type !== 'body') return

      const dx = (ev.clientX - drag.startX) / zoomRef.current
      const dy = (ev.clientY - drag.startY) / zoomRef.current

      let candP1 = { x: Math.round(drag.initialP1.x + dx), y: Math.round(drag.initialP1.y + dy) }
      let candP2 = { x: Math.round(drag.initialP2.x + dx), y: Math.round(drag.initialP2.y + dy) }

      // Probar imán para p1
      const snap1 = checkEndpointSnap(candP1, drag.segmentId)
      if (snap1.didSnap) {
        const offsetDx = snap1.point.x - candP1.x
        const offsetDy = snap1.point.y - candP1.y
        candP1 = { ...snap1.point }
        candP2 = { x: candP2.x + offsetDx, y: candP2.y + offsetDy }

        // Si p1 se imantó, verificar si p2 también puede imantarse exactamente a otro extremo
        const snap2After = checkEndpointSnap(candP2, drag.segmentId)
        if (snap2After.didSnap && getDistance(candP2, snap2After.point) <= 14) {
          candP2 = { ...snap2After.point }
        }
      } else {
        // Si p1 no se imantó, probar si p2 se imanta
        const snap2 = checkEndpointSnap(candP2, drag.segmentId)
        if (snap2.didSnap) {
          const offsetDx = snap2.point.x - candP2.x
          const offsetDy = snap2.point.y - candP2.y
          candP2 = { ...snap2.point }
          candP1 = { x: candP1.x + offsetDx, y: candP1.y + offsetDy }

          const snap1After = checkEndpointSnap(candP1, drag.segmentId)
          if (snap1After.didSnap && getDistance(candP1, snap1After.point) <= 14) {
            candP1 = { ...snap1After.point }
          }
        }
      }

      setSegments(prev =>
        prev.map(s => (s.id === drag.segmentId ? { ...s, p1: candP1, p2: candP2 } : s))
      )
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      if (activePointersRef.current.size === 0) {
        isInteractingSegmentRef.current = false
        activeDragRef.current = null
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Pointer Down en un extremo del segmento (Rotación pura sin cambio de longitud)
  const handleEndpointPointerDown = (
    e: React.PointerEvent,
    seg: SegmentData,
    endType: 'p1' | 'p2'
  ) => {
    e.stopPropagation()
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      isInteractingSegmentRef.current = false
      activeDragRef.current = null
      return
    }

    isInteractingSegmentRef.current = true
    activeDragRef.current = {
      segmentId: seg.id,
      type: endType,
      startX: e.clientX,
      startY: e.clientY,
      initialP1: { ...seg.p1 },
      initialP2: { ...seg.p2 },
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!activePointersRef.current.has(ev.pointerId)) return
      activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

      if (activePointersRef.current.size >= 2) {
        isInteractingSegmentRef.current = false
        activeDragRef.current = null
        return
      }

      const drag = activeDragRef.current
      if (!drag || (drag.type !== 'p1' && drag.type !== 'p2')) return

      // Convertir coordenadas del cursor a coordenadas de mundo
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseWorldX = (ev.clientX - rect.left - panRef.current.x) / zoomRef.current
      const mouseWorldY = (ev.clientY - rect.top - panRef.current.y) / zoomRef.current

      const targetLen = seg.units * pxPerUnit

      if (drag.type === 'p1') {
        // Pivot fijo en p2; rotar p1
        const pivot = drag.initialP2
        let angleRad = Math.atan2(mouseWorldY - pivot.y, mouseWorldX - pivot.x)

        let candidateP1 = {
          x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
          y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
        }

        // 1. Probar imán de cierre de triángulo con los otros dos segmentos unidos (solo si están muy cerca)
        const triSnap = tryTriangleClosingSnap(
          drag.segmentId,
          'p1',
          candidateP1,
          segments,
          pxPerUnit,
          14
        )

        if (triSnap.didSnap && triSnap.otherSegId && triSnap.otherEnd && triSnap.otherP) {
          candidateP1 = triSnap.draggedP
          const otherId = triSnap.otherSegId
          const otherEnd = triSnap.otherEnd
          const otherPt = triSnap.otherP

          setSegments(prev =>
            prev.map(s => {
              if (s.id === drag.segmentId) {
                return { ...s, p1: candidateP1 }
              }
              if (s.id === otherId) {
                return { ...s, [otherEnd]: otherPt }
              }
              return s
            })
          )
          return
        }

        // 2. Si no es cierre de triángulo, probar si se imanta a un extremo libre
        const snap = checkEndpointSnap(candidateP1, drag.segmentId)
        if (snap.didSnap) {
          angleRad = Math.atan2(snap.point.y - pivot.y, snap.point.x - pivot.x)
          candidateP1 = {
            x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
            y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
          }
          if (getDistance(candidateP1, snap.point) <= 12) {
            candidateP1 = { ...snap.point }
          }
        }

        setSegments(prev =>
          prev.map(s => (s.id === drag.segmentId ? { ...s, p1: candidateP1 } : s))
        )
      } else {
        // Pivot fijo en p1; rotar p2
        const pivot = drag.initialP1
        let angleRad = Math.atan2(mouseWorldY - pivot.y, mouseWorldX - pivot.x)

        let candidateP2 = {
          x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
          y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
        }

        const triSnap = tryTriangleClosingSnap(
          drag.segmentId,
          'p2',
          candidateP2,
          segments,
          pxPerUnit,
          14
        )

        if (triSnap.didSnap && triSnap.otherSegId && triSnap.otherEnd && triSnap.otherP) {
          candidateP2 = triSnap.draggedP
          const otherId = triSnap.otherSegId
          const otherEnd = triSnap.otherEnd
          const otherPt = triSnap.otherP

          setSegments(prev =>
            prev.map(s => {
              if (s.id === drag.segmentId) {
                return { ...s, p2: candidateP2 }
              }
              if (s.id === otherId) {
                return { ...s, [otherEnd]: otherPt }
              }
              return s
            })
          )
          return
        }

        const snap = checkEndpointSnap(candidateP2, drag.segmentId)
        if (snap.didSnap) {
          angleRad = Math.atan2(snap.point.y - pivot.y, snap.point.x - pivot.x)
          candidateP2 = {
            x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
            y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
          }
          if (getDistance(candidateP2, snap.point) <= 12) {
            candidateP2 = { ...snap.point }
          }
        }

        setSegments(prev =>
          prev.map(s => (s.id === drag.segmentId ? { ...s, p2: candidateP2 } : s))
        )
      }
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      if (activePointersRef.current.size === 0) {
        isInteractingSegmentRef.current = false
        activeDragRef.current = null
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Acción pedagógica: "Auto-unir en la base" (coloca el lado más largo como base y une los dos menores en los extremos)
  const handleAutoAssembleBase = () => {
    const cw = canvasDim.w
    const ch = canvasDim.h
    const cx = cw / 2
    const cy = ch / 2 + 40

    // Ordenar lados de mayor a menor
    const sorted = [...segments].sort((s1, s2) => s2.units - s1.units)
    const baseSeg = sorted[0] // Mayor
    const leftSeg = sorted[1]
    const rightSeg = sorted[2]

    const baseLen = baseSeg.units * pxPerUnit
    const leftLen = leftSeg.units * pxPerUnit
    const rightLen = rightSeg.units * pxPerUnit

    // Base horizontal centrada
    const baseP1 = { x: Math.round(cx - baseLen / 2), y: Math.round(cy) }
    const baseP2 = { x: Math.round(cx + baseLen / 2), y: Math.round(cy) }

    // Segmento izquierdo unido en baseP1 apuntando hacia arriba-derecha (60°)
    const leftP1 = { ...baseP1 }
    const leftP2 = {
      x: Math.round(baseP1.x + leftLen * Math.cos((-55 * Math.PI) / 180)),
      y: Math.round(baseP1.y + leftLen * Math.sin((-55 * Math.PI) / 180)),
    }

    // Segmento derecho unido en baseP2 apuntando hacia arriba-izquierda (120°)
    const rightP1 = { ...baseP2 }
    const rightP2 = {
      x: Math.round(baseP2.x + rightLen * Math.cos((-125 * Math.PI) / 180)),
      y: Math.round(baseP2.y + rightLen * Math.sin((-125 * Math.PI) / 180)),
    }

    setSegments([
      { ...baseSeg, p1: baseP1, p2: baseP2 },
      { ...leftSeg, p1: leftP1, p2: leftP2 },
      { ...rightSeg, p1: rightP1, p2: rightP2 },
    ])
  }

  // Reiniciar posiciones verticales
  const handleResetPositions = () => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
    setSegments(initSegments(sideA, sideB, sideC, canvasDim.w, canvasDim.h))
  }

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden select-none transition-colors duration-150 ${
        isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-900'
      }`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera (34-44px) ── */}
      <header className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 transition-colors ${
        isDark ? 'border-white/10 bg-[#0a0f1d]' : 'border-slate-300 bg-white'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => nav(-1)}
            className={`flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border active:scale-95 transition-all cursor-pointer ${
              isDark
                ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className={`text-[12px] sm:text-[13px] lg:text-[15px] font-bold truncate ${
              isDark ? 'text-white/90' : 'text-slate-900'
            }`}>
              Existencia de un Triángulo
            </h1>
            <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono border ${
              isDark
                ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20'
                : 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold'
            }`}>
              Desigualdad Triangular
            </span>
          </div>
        </div>

        {/* Longitudes actuales */}
        <div className={`flex items-center gap-2 text-[10px] lg:text-xs font-mono font-bold px-3 py-1 rounded-full border shadow-xs transition-colors ${
          isDark
            ? 'bg-[#0d1627] border-white/10 text-white/90'
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <span style={{ color: segColors.a.main }}>a = {sideA}</span>
          <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>
          <span style={{ color: segColors.b.main }}>b = {sideB}</span>
          <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>
          <span style={{ color: segColors.c.main }}>c = {sideC}</span>
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className={`flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border active:scale-95 transition-all cursor-pointer ${
            isDark
              ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
          }`}
          aria-label="Ayuda"
          title="Ayuda"
        >
          <HelpCircle size={15} />
        </button>
      </header>

      {/* ── 2. Área de Trabajo: Barra Superior/Lateral de Casos + Canvas Deslizable ── */}
      <div
        className={`flex-1 min-h-0 flex ${
          isPortrait ? 'flex-col' : 'flex-row'
        } items-stretch overflow-hidden p-1 sm:p-1.5 lg:p-2 gap-1 sm:gap-2`}
      >
        {isPortrait ? (
          /* Barra Superior Horizontal de Casos (Portrait) */
          <nav
            className={`w-full shrink-0 border rounded-xl p-1 flex items-center justify-between gap-1 shadow-sm select-none transition-colors ${
              isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-300'
            }`}
            aria-label="Casos de estudio"
          >
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              {PRESET_CASES.map(c => {
                const active = selectedCaseId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    title={c.desc}
                    className={`flex-1 h-7 sm:h-8 min-w-[52px] rounded-lg transition-all flex items-center justify-center gap-1 px-1 active:scale-95 cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-cyan-500 text-black shadow font-black ring-1 ring-cyan-300'
                          : 'bg-cyan-600 text-white shadow font-black'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-bold truncate">
                      {c.shortLabel}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowCustomModal(true)}
              className={`h-7 sm:h-8 px-2 shrink-0 rounded-lg border flex items-center gap-1 text-[9px] font-bold active:scale-95 transition-all cursor-pointer ${
                isDark
                  ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-300'
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
              }`}
              title="Personalizar medidas"
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">Medidas</span>
            </button>
          </nav>
        ) : (
          /* Panel Lateral Izquierdo de Casos (Landscape / Laptop) */
          <aside
            className={`w-[60px] sm:w-[70px] lg:w-[142px] shrink-0 h-full border rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between shadow-md select-none transition-colors ${
              isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-300'
            }`}
            aria-label="Casos de estudio"
          >
            <div className="w-full flex flex-col items-center gap-1 sm:gap-1.5">
              <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-wider py-0.5 hidden lg:block text-center w-full border-b ${
                isDark ? 'text-white/40 border-white/5' : 'text-slate-500 border-slate-200'
              }`}>
                Casos
              </span>

              {PRESET_CASES.map(c => {
                const active = selectedCaseId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    title={c.desc}
                    className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-0.5 lg:gap-2 p-1 sm:p-1.5 lg:px-2.5 lg:py-2 active:scale-95 cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black ring-1 ring-cyan-300'
                          : 'bg-cyan-600 text-white shadow font-black'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span className="text-[8px] sm:text-[9px] lg:text-xs font-bold truncate max-w-full">
                      {c.shortLabel}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowCustomModal(true)}
              className={`w-full py-1.5 rounded-xl border text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all cursor-pointer ${
                isDark
                  ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-300'
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
              }`}
              title="Personalizar medidas con sliders"
            >
              <Sliders size={13} />
              <span className="hidden lg:inline text-[10px]">Personalizar</span>
            </button>
          </aside>
        )}

        {/* Espacio del Plano Geométrico / Canvas Deslizable (Pan y Zoom 1:1) */}
        <div
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className={`flex-1 min-w-0 min-h-0 h-full relative border rounded-2xl overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-colors ${
            isDark
              ? 'bg-gradient-to-b from-[#0a1122] via-[#070d1a] to-[#080c18] border-white/10'
              : 'bg-slate-50 border-slate-300'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Mundo Geométrico (Mueve los segmentos, figuras y la cuadrícula en sincronía exacta con Pan y Zoom) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              touchAction: 'none',
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                {/* Cuadrícula uniforme: 1 cuadradito = exactamente 1 unidad de longitud (pxPerUnit) */}
                <pattern
                  id="grid-unit-exact"
                  width={pxPerUnit}
                  height={pxPerUnit}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${pxPerUnit} 0 L 0 0 0 ${pxPerUnit}`}
                    fill="none"
                    stroke={isDark ? '#38bdf8' : '#0284c7'}
                    strokeWidth="0.8"
                    opacity={isDark ? '0.38' : '0.22'}
                  />
                </pattern>
              </defs>

              {/* Fondo de cuadrícula uniforme sincronizado 1:1 con zoom y traslación */}
              <rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#grid-unit-exact)" />

              {/* Si el triángulo está cerrado con éxito, rellenar su área interior con brillo */}
              {triangleStatus.isClosed && triangleStatus.vertices.length === 3 && (
                <polygon
                  points={`${triangleStatus.vertices[0].x},${triangleStatus.vertices[0].y} ${triangleStatus.vertices[1].x},${triangleStatus.vertices[1].y} ${triangleStatus.vertices[2].x},${triangleStatus.vertices[2].y}`}
                  fill={isDark ? "rgba(52, 211, 153, 0.22)" : "rgba(16, 185, 129, 0.25)"}
                  stroke={isDark ? "#34d399" : "#059669"}
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}

              {/* Círculos auxiliares de alcance pedagógico (visualizan si los radios se intersecan) */}
              {showReachCircles &&
                segments.map(s => {
                  const r = s.units * pxPerUnit
                  const currentColor = segColors[s.id].main
                  return (
                    <g key={`reach-${s.id}`} opacity={isDark ? "0.35" : "0.45"}>
                      <circle
                        cx={s.p1.x}
                        cy={s.p1.y}
                        r={r}
                        fill="none"
                        stroke={currentColor}
                        strokeWidth="1.2"
                        strokeDasharray="4,4"
                      />
                      <circle
                        cx={s.p2.x}
                        cy={s.p2.y}
                        r={r}
                        fill="none"
                        stroke={currentColor}
                        strokeWidth="1.2"
                        strokeDasharray="4,4"
                      />
                    </g>
                  )
                })}

              {/* RENDERIZADO DE CADA SEGMENTO */}
              {segments.map(seg => {
                const midX = (seg.p1.x + seg.p2.x) / 2
                const midY = (seg.p1.y + seg.p2.y) / 2
                const angleRad = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x)
                const normalAngle = angleRad - Math.PI / 2
                const labelDist = 16
                const currentColor = segColors[seg.id].main

                return (
                  <g key={seg.id}>
                    {/* Área táctil invisible ensanchada para traslación fácil del cuerpo */}
                    <line
                      x1={seg.p1.x}
                      y1={seg.p1.y}
                      x2={seg.p2.x}
                      y2={seg.p2.y}
                      stroke="transparent"
                      strokeWidth="24"
                      strokeLinecap="round"
                      className="cursor-move pointer-events-auto"
                      data-segment-interactive
                      onPointerDown={e => handleSegmentBodyPointerDown(e, seg)}
                    />

                    {/* Sombra proyectada del segmento */}
                    <line
                      x1={seg.p1.x}
                      y1={seg.p1.y + 2}
                      x2={seg.p2.x}
                      y2={seg.p2.y + 2}
                      stroke={isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.15)"}
                      strokeWidth="6"
                      strokeLinecap="round"
                    />

                    {/* Línea principal sólida del segmento */}
                    <line
                      x1={seg.p1.x}
                      y1={seg.p1.y}
                      x2={seg.p2.x}
                      y2={seg.p2.y}
                      stroke={currentColor}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      className="pointer-events-none drop-shadow"
                    />

                    {/* Marcas de unidades sobre la regla o segmento */}
                    {Array.from({ length: seg.units + 1 }).map((_, idx) => {
                      const t = idx / seg.units
                      const tx = seg.p1.x + t * (seg.p2.x - seg.p1.x)
                      const ty = seg.p1.y + t * (seg.p2.y - seg.p1.y)
                      return (
                        <circle
                          key={idx}
                          cx={tx}
                          cy={ty}
                          r={idx === 0 || idx === seg.units ? '1.5' : '1.2'}
                          fill="#ffffff"
                          opacity={idx === 0 || idx === seg.units ? '0' : '0.85'}
                        />
                      )
                    })}

                    {/* Etiqueta flotante con la longitud y nombre del segmento */}
                    {(() => {
                      const textStr = seg.label
                      const lx = midX + (labelDist + 4) * Math.cos(normalAngle)
                      const ly = midY + (labelDist + 4) * Math.sin(normalAngle)
                      const pillW = Math.max(52, textStr.length * 8.5 + 16)
                      const pillH = 22

                      return (
                        <g className="pointer-events-none select-none">
                          <rect
                            x={lx - pillW / 2}
                            y={ly - pillH / 2}
                            width={pillW}
                            height={pillH}
                            rx="6"
                            fill={isDark ? '#0b1324' : '#ffffff'}
                            stroke={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.18)'}
                            strokeWidth="1"
                            filter={isDark ? undefined : 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))'}
                          />
                          <text
                            x={lx}
                            y={ly + 4}
                            fill={currentColor}
                            fontSize="11"
                            fontWeight="800"
                            fontFamily="'JetBrains Mono', ui-monospace, monospace"
                            textAnchor="middle"
                          >
                            {textStr}
                          </text>
                        </g>
                      )
                    })()}

                    {/* Extremo 1 (p1): Manipulador táctil de rotación */}
                    <g
                      className="cursor-pointer pointer-events-auto"
                      data-segment-interactive
                      onPointerDown={e => handleEndpointPointerDown(e, seg, 'p1')}
                    >
                      {/* Área táctil amplia invisible para dedos */}
                      <circle cx={seg.p1.x} cy={seg.p1.y} r="22" fill="transparent" />
                      {/* Anillo exterior del vértice (centrado estrictamente en el extremo) */}
                      <circle
                        cx={seg.p1.x}
                        cy={seg.p1.y}
                        r="8.5"
                        fill={isDark ? "#080c18" : "#ffffff"}
                        stroke={currentColor}
                        strokeWidth="2.5"
                      />
                      {/* Punto central */}
                      <circle cx={seg.p1.x} cy={seg.p1.y} r="3" fill={isDark ? "#ffffff" : currentColor} />
                    </g>

                    {/* Extremo 2 (p2): Manipulador táctil de rotación */}
                    <g
                      className="cursor-pointer pointer-events-auto"
                      data-segment-interactive
                      onPointerDown={e => handleEndpointPointerDown(e, seg, 'p2')}
                    >
                      {/* Área táctil amplia invisible para dedos */}
                      <circle cx={seg.p2.x} cy={seg.p2.y} r="22" fill="transparent" />
                      {/* Anillo exterior del vértice (centrado estrictamente en el extremo) */}
                      <circle
                        cx={seg.p2.x}
                        cy={seg.p2.y}
                        r="8.5"
                        fill={isDark ? "#080c18" : "#ffffff"}
                        stroke={currentColor}
                        strokeWidth="2.5"
                      />
                      {/* Punto central */}
                      <circle cx={seg.p2.x} cy={seg.p2.y} r="3" fill={isDark ? "#ffffff" : currentColor} />
                    </g>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Micro-guía flotante en esquina superior izquierda */}
          <div className={`absolute top-2 left-2 rounded-xl px-2.5 py-1 text-[10px] flex items-center gap-2 pointer-events-none shadow-md z-20 transition-colors ${
            isDark
              ? 'bg-[#09101f]/90 backdrop-blur-md border border-white/10 text-white/70'
              : 'bg-white border-2 border-slate-300 text-slate-800'
          }`}>
            <span className={`flex items-center gap-1 font-black ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
              <Move size={12} /> Cuerpo: traslada
            </span>
            <span className={isDark ? 'text-white/30' : 'text-slate-400 font-bold'}>•</span>
            <span className={`flex items-center gap-1 font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              <RotateCw size={12} /> Extremos: gira
            </span>
            <span className={`hidden md:inline ${isDark ? 'text-white/30' : 'text-slate-400 font-bold'}`}>•</span>
            <span className={`hidden md:flex items-center gap-1 font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              <Sparkles size={12} /> Imán al unir
            </span>
          </div>

          {/* Distintivo de Éxito al cerrar el triángulo */}
          {triangleStatus.isClosed && (
            <div className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-2xl z-20 animate-bounce ${
              isDark
                ? 'bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-200'
                : 'bg-emerald-600 border-2 border-emerald-700 text-white shadow-emerald-700/30'
            }`}>
              <CheckCircle2 size={16} className={isDark ? "text-emerald-400" : "text-white"} />
              <span>🎉 ¡Triángulo cerrado exitosamente! Cumple el teorema de existencia.</span>
            </div>
          )}

          {/* Controles flotantes de Zoom y Recentrado en esquina superior derecha */}
          <div className={`absolute top-2 right-2 flex items-center gap-1 z-20 rounded-xl p-1 shadow-md transition-colors ${
            isDark
              ? 'bg-[#09101f]/90 backdrop-blur-md border border-white/10 text-white'
              : 'bg-white border-2 border-slate-300 text-slate-800'
          }`}>
            <button
              onClick={() => {
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect()
                  applyZoomToPoint(zoom - 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2)
                }
              }}
              className={`h-7 w-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
              title="Alejar (Zoom -)"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className={`h-7 px-2 rounded-lg font-mono text-[11px] font-bold flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/15 text-cyan-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-cyan-800 border border-slate-200 font-black'
              }`}
              title="Restablecer zoom a 100% y centrar"
            >
              <span>{Math.round(zoom * 100)}%</span>
            </button>

            <button
              onClick={() => {
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect()
                  applyZoomToPoint(zoom + 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2)
                }
              }}
              className={`h-7 w-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
              title="Acercar (Zoom +)"
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={() => setShowReachCircles(s => !s)}
              className={`h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                showReachCircles
                  ? isDark
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-cyan-100 border-cyan-400 text-cyan-900 font-black'
                  : isDark
                  ? 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Mostrar u ocultar círculos de alcance"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">Arcos</span>
            </button>

            {(pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
              <button
                onClick={() => {
                  setPan({ x: 0, y: 0 })
                  setZoom(1)
                }}
                className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300'
                }`}
                title="Centrar figura y restablecer zoom"
              >
                <Maximize2 size={12} />
                <span className="hidden sm:inline">Centrar</span>
              </button>
            )}
          </div>

          {/* Botones de acción rápida en esquina inferior izquierda */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-20">
            <button
              onClick={handleAutoAssembleBase}
              className={`h-7 lg:h-8 px-2.5 rounded-xl border text-[10px] lg:text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                isDark
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/40 text-cyan-200'
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
              }`}
              title="Colocar el lado mayor como base y unir los dos menores en los extremos"
            >
              <Wand2 size={13} className={isDark ? "text-cyan-300" : "text-cyan-700"} />
              <span>Montar base</span>
            </button>

            <button
              onClick={handleResetPositions}
              className={`h-7 lg:h-8 px-2.5 rounded-xl border text-[10px] lg:text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
              title="Restablecer posición vertical de los segmentos"
            >
              <RotateCw size={13} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Barra Inferior de Acción y Explicación Pedagógica (40-48px) ── */}
      <footer className={`h-10 lg:h-12 shrink-0 border-t px-2 sm:px-3 lg:px-4 flex items-center justify-between gap-2 transition-colors ${
        isDark ? 'border-white/10 bg-[#0a0f1d]' : 'border-slate-300 bg-white'
      }`}>
        {/* Mensaje pedagógico de exploración (sin spoilers) */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[10px] sm:text-[11px] truncate">
          {triangleStatus.isClosed ? (
            <div className={`flex items-center gap-1.5 font-bold truncate ${
              isDark ? 'text-emerald-300' : 'text-emerald-700'
            }`}>
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">
                ¡Triángulo cerrado! {sideA} + {sideB} &gt; {sideC}, {sideA} + {sideC} &gt; {sideB} y{' '}
                {sideB} + {sideC} &gt; {sideA}.
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 truncate ${
              isDark ? 'text-white/80' : 'text-slate-700'
            }`}>
              <Info size={14} className={`shrink-0 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} />
              <span className="truncate">
                Mueve los segmentos y gira sus extremos para intentar unirlos y comprobar si es posible formar un triángulo.
              </span>
            </div>
          )}
        </div>

        {/* Acciones del pie */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowCustomModal(true)}
            className="h-7 lg:h-8 px-2.5 sm:px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sliders size={13} />
            <span>Medidas ({sideA}, {sideB}, {sideC})</span>
          </button>

          <button
            onClick={() => {
              const currentIdx = PRESET_CASES.findIndex(c => c.id === selectedCaseId)
              const nextPreset = PRESET_CASES[(currentIdx + 1) % PRESET_CASES.length]
              handleSelectCase(nextPreset)
            }}
            className={`h-7 lg:h-8 px-2 sm:px-2.5 rounded-lg border font-bold text-[10px] sm:text-[11px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border-transparent'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Siguiente caso de estudio"
          >
            <ChevronRight size={14} />
            <span className="hidden sm:inline">Siguiente Caso</span>
          </button>
        </div>
      </footer>

      {/* ── Modal Popover: Personalizar Longitud de Lados con Sliders ── */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className={`w-full max-w-[340px] rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 border transition-colors ${
              isDark ? 'bg-[#0c1529] border-cyan-400/40 text-white' : 'bg-white border-2 border-slate-300 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                  isDark ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300' : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                }`}>
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Personalizar Lados</h3>
                  <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Elige la longitud de cada segmento</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
                aria-label="Cerrar modal"
              >
                <XCircle size={16} />
              </button>
            </div>

            {/* Sliders para lados a, b, c */}
            <div className="space-y-3">
              {/* Lado A */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? 'text-cyan-300' : 'text-cyan-700'}>Lado a (Cian):</span>
                  <span className={`font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-800 font-black'}`}>{sideA} u</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={sideA}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    setSideA(val)
                    setSelectedCaseId('libre')
                    setSegments(initSegments(val, sideB, sideC, canvasDim.w, canvasDim.h))
                  }}
                  className={`w-full accent-cyan-500 h-1.5 rounded-lg cursor-pointer ${
                    isDark ? 'bg-black/50' : 'bg-slate-200'
                  }`}
                />
              </div>

              {/* Lado B */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>Lado b (Ámbar):</span>
                  <span className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-800 font-black'}`}>{sideB} u</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={sideB}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    setSideB(val)
                    setSelectedCaseId('libre')
                    setSegments(initSegments(sideA, val, sideC, canvasDim.w, canvasDim.h))
                  }}
                  className={`w-full accent-amber-500 h-1.5 rounded-lg cursor-pointer ${
                    isDark ? 'bg-black/50' : 'bg-slate-200'
                  }`}
                />
              </div>

              {/* Lado C */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? 'text-pink-300' : 'text-pink-700'}>Lado c (Rosa):</span>
                  <span className={`font-mono ${isDark ? 'text-pink-300' : 'text-pink-800 font-black'}`}>{sideC} u</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={sideC}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    setSideC(val)
                    setSelectedCaseId('libre')
                    setSegments(initSegments(sideA, sideB, val, canvasDim.w, canvasDim.h))
                  }}
                  className={`w-full accent-pink-500 h-1.5 rounded-lg cursor-pointer ${
                    isDark ? 'bg-black/50' : 'bg-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Diagnóstico instantáneo */}
            <div
              className={`p-2.5 rounded-xl border text-[11px] leading-tight ${
                inequalityCheck.status === 'valid'
                  ? isDark
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                  : inequalityCheck.status === 'degenerate'
                  ? isDark
                    ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                    : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : isDark
                  ? 'bg-rose-500/15 border-rose-400/30 text-rose-200'
                  : 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
              }`}
            >
              <div className="font-bold flex items-center gap-1 mb-1">
                {inequalityCheck.status === 'valid' && <CheckCircle2 size={14} className={isDark ? "text-emerald-400" : "text-emerald-600"} />}
                {inequalityCheck.status === 'degenerate' && <AlertCircle size={14} className={isDark ? "text-amber-400" : "text-amber-600"} />}
                {inequalityCheck.status === 'impossible' && <XCircle size={14} className={isDark ? "text-rose-400" : "text-rose-600"} />}
                <span>
                  {inequalityCheck.status === 'valid'
                    ? '¿Se puede formar triángulo?: SÍ'
                    : inequalityCheck.status === 'degenerate'
                    ? '¿Se puede formar?: CASO LÍMITE'
                    : '¿Se puede formar?: NO'}
                </span>
              </div>
              <p className="text-[10px] opacity-90">{inequalityCheck.message}</p>
            </div>

            {/* Botón cerrar modal */}
            <button
              onClick={() => setShowCustomModal(false)}
              className="w-full h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow active:scale-95 transition-all cursor-pointer"
            >
              Aplicar y Experimentar en el Lienzo
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Ayuda: Teorema de la Desigualdad Triangular ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cuándo existe un triángulo? (Teorema de la Desigualdad Triangular)"
        bgColor={isDark ? "#080c18" : "#ffffff"}
        titleColor={isDark ? "#ffffff" : "#0f172a"}
        maxWidth="max-w-md"
        buttonColor="bg-cyan-500 text-black hover:bg-cyan-400"
      >
        <div key={helpId} className={`space-y-2.5 text-xs leading-relaxed pb-2 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
          <p>
            Para que tres segmentos puedan unirse por sus extremos y formar un triángulo cerrado,
            deben cumplir la <strong>Propiedad de la Desigualdad Triangular</strong>:
          </p>

          <div className={`p-2.5 rounded-xl border text-center font-mono font-bold text-sm ${
            isDark ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-200' : 'bg-cyan-50 border-cyan-300 text-cyan-900'
          }`}>
            a + b &gt; c &emsp;•&emsp; a + c &gt; b &emsp;•&emsp; b + c &gt; a
          </div>

          <p>
            En palabras sencillas: <em>"La suma de las longitudes de los dos lados menores debe ser estrictamente mayor que el lado más largo"</em>.
          </p>

          <div className={`space-y-1.5 p-2 rounded-xl border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start gap-1.5">
              <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>1. Caso Posible:</span>
              <span>Si la suma de los dos lados menores supera al mayor, los extremos se cruzan y forman un triángulo.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>2. Caso Imposible:</span>
              <span>Si los dos menores suman menos que el mayor, aunque los gires nunca se tocarán (queda una brecha abierta).</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>3. Caso Límite:</span>
              <span>Si la suma es exactamente igual, los lados menores caen planos encima del lado mayor formando una línea recta sin altura.</span>
            </div>
          </div>

          <div className={`p-2 rounded-xl border text-[11px] ${
            isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            💡 <strong>Cómo usar el simulador:</strong>
            <ul className={`list-disc list-inside mt-1 space-y-0.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              <li>Arrastra el <strong>cuerpo</strong> de un segmento para trasladarlo.</li>
              <li>Arrastra los <strong>puntos extremos</strong> para girar el segmento (su longitud se mantiene fija).</li>
              <li>Acerca un extremo a otro para que el <strong>imán</strong> los una automáticamente.</li>
              <li>Prueba el botón <strong>"Montar base"</strong> para alinear rápidamente la base.</li>
            </ul>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
