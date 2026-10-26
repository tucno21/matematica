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

const SEGMENT_COLORS = {
  a: { main: '#38bdf8', accent: '#0284c7', glow: 'rgba(56, 189, 248, 0.4)' }, // Cian
  b: { main: '#fbbf24', accent: '#d97706', glow: 'rgba(251, 191, 36, 0.4)' }, // Ámbar
  c: { main: '#f472b6', accent: '#db2777', glow: 'rgba(244, 114, 182, 0.4)' }, // Rosa
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export default function ExistenciaTrianguloView() {
  const nav = useNavigate()
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
      color: SEGMENT_COLORS.a.main,
      accentColor: SEGMENT_COLORS.a.accent,
      p1: { x: Math.round(startX), y: Math.round(cy - lenA / 2) },
      p2: { x: Math.round(startX), y: Math.round(cy + lenA / 2) },
    }

    const segB: SegmentData = {
      id: 'b',
      label: `b = ${bU}`,
      units: bU,
      color: SEGMENT_COLORS.b.main,
      accentColor: SEGMENT_COLORS.b.accent,
      p1: { x: Math.round(cx), y: Math.round(cy - lenB / 2) },
      p2: { x: Math.round(cx), y: Math.round(cy + lenB / 2) },
    }

    const segC: SegmentData = {
      id: 'c',
      label: `c = ${cU}`,
      units: cU,
      color: SEGMENT_COLORS.c.main,
      accentColor: SEGMENT_COLORS.c.accent,
      p1: { x: Math.round(startX + spacing * 2), y: Math.round(cy - lenC / 2) },
      p2: { x: Math.round(startX + spacing * 2), y: Math.round(cy + lenC / 2) },
    }

    return [segA, segB, segC]
  }, [pxPerUnit])

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

    const TOLERANCE = 18 // Píxeles de tolerancia de cierre

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

  // Comprobar imán con otros extremos disponibles
  const checkEndpointSnap = useCallback(
    (point: { x: number; y: number }, segId: 'a' | 'b' | 'c') => {
      const SNAP_RADIUS = 22 // Radio magnético en píxeles de mundo
      let snappedPoint = { ...point }
      let didSnap = false

      for (const s of segments) {
        if (s.id === segId) continue

        // Probar p1 del otro segmento
        if (getDistance(point, s.p1) <= SNAP_RADIUS) {
          snappedPoint = { ...s.p1 }
          didSnap = true
          break
        }
        // Probar p2 del otro segmento
        if (getDistance(point, s.p2) <= SNAP_RADIUS) {
          snappedPoint = { ...s.p2 }
          didSnap = true
          break
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
        candP1 = snap1.point
        candP2 = { x: candP2.x + offsetDx, y: candP2.y + offsetDy }
      } else {
        // Si p1 no se imantó, probar si p2 se imanta
        const snap2 = checkEndpointSnap(candP2, drag.segmentId)
        if (snap2.didSnap) {
          const offsetDx = snap2.point.x - candP2.x
          const offsetDy = snap2.point.y - candP2.y
          candP2 = snap2.point
          candP1 = { x: candP1.x + offsetDx, y: candP1.y + offsetDy }
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

        // Probar si cerca del cursor hay un extremo de otro segmento para imantar el giro
        const snap = checkEndpointSnap(candidateP1, drag.segmentId)
        if (snap.didSnap) {
          // Alinear el giro exactamente hacia el punto imantado sin alterar la longitud
          angleRad = Math.atan2(snap.point.y - pivot.y, snap.point.x - pivot.x)
          candidateP1 = {
            x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
            y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
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

        const snap = checkEndpointSnap(candidateP2, drag.segmentId)
        if (snap.didSnap) {
          angleRad = Math.atan2(snap.point.y - pivot.y, snap.point.x - pivot.x)
          candidateP2 = {
            x: Math.round(pivot.x + targetLen * Math.cos(angleRad)),
            y: Math.round(pivot.y + targetLen * Math.sin(angleRad)),
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
      className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera (34-44px) ── */}
      <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => nav(-1)}
            className="flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[12px] sm:text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              Existencia de un Triángulo
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              Desigualdad Triangular
            </span>
          </div>
        </div>

        {/* Longitudes actuales sin spoilers pedagógicos */}
        <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300">
          <span>a = {sideA}</span>
          <span className="text-white/30">•</span>
          <span>b = {sideB}</span>
          <span className="text-white/30">•</span>
          <span>c = {sideC}</span>
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className="flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
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
            className="w-full shrink-0 bg-[#0a0f1d] border border-white/10 rounded-xl p-1 flex items-center justify-between gap-1 shadow-md select-none"
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
                    className={`flex-1 h-7 sm:h-8 min-w-[52px] rounded-lg transition-all flex items-center justify-center gap-1 px-1 active:scale-95 ${
                      active
                        ? 'bg-cyan-500 text-black shadow font-black ring-1 ring-cyan-300'
                        : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
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
              className="h-7 sm:h-8 px-2 shrink-0 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 flex items-center gap-1 text-[9px] font-bold active:scale-95 transition-all"
              title="Personalizar medidas"
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">Medidas</span>
            </button>
          </nav>
        ) : (
          /* Panel Lateral Izquierdo de Casos (Landscape / Laptop) */
          <aside
            className="w-[60px] sm:w-[70px] lg:w-[142px] shrink-0 h-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between shadow-xl select-none"
            aria-label="Casos de estudio"
          >
            <div className="w-full flex flex-col items-center gap-1 sm:gap-1.5">
              <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-wider py-0.5 hidden lg:block text-center w-full border-b border-white/5">
                Casos
              </span>

              {PRESET_CASES.map(c => {
                const active = selectedCaseId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    title={c.desc}
                    className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-0.5 lg:gap-2 p-1 sm:p-1.5 lg:px-2.5 lg:py-2 active:scale-95 ${
                      active
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black ring-1 ring-cyan-300'
                        : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
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
              className="w-full py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all"
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
          className="flex-1 min-w-0 min-h-0 h-full relative bg-gradient-to-b from-[#0a1122] via-[#070d1a] to-[#080c18] border border-white/10 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
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
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                    opacity="0.38"
                  />
                </pattern>
              </defs>

              {/* Fondo de cuadrícula uniforme sincronizado 1:1 con zoom y traslación */}
              <rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#grid-unit-exact)" />

              {/* Si el triángulo está cerrado con éxito, rellenar su área interior con brillo */}
              {triangleStatus.isClosed && triangleStatus.vertices.length === 3 && (
                <polygon
                  points={`${triangleStatus.vertices[0].x},${triangleStatus.vertices[0].y} ${triangleStatus.vertices[1].x},${triangleStatus.vertices[1].y} ${triangleStatus.vertices[2].x},${triangleStatus.vertices[2].y}`}
                  fill="rgba(52, 211, 153, 0.22)"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}

              {/* Círculos auxiliares de alcance pedagógico (visualizan si los radios se intersecan) */}
              {showReachCircles &&
                segments.map(s => {
                  const r = s.units * pxPerUnit
                  return (
                    <g key={`reach-${s.id}`} opacity="0.35">
                      <circle
                        cx={s.p1.x}
                        cy={s.p1.y}
                        r={r}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <circle
                        cx={s.p2.x}
                        cy={s.p2.y}
                        r={r}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="1"
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
                      stroke="rgba(0, 0, 0, 0.6)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />

                    {/* Línea principal sólida del segmento */}
                    <line
                      x1={seg.p1.x}
                      y1={seg.p1.y}
                      x2={seg.p2.x}
                      y2={seg.p2.y}
                      stroke={seg.color}
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
                          r={idx === 0 || idx === seg.units ? '1.5' : '1'}
                          fill="#ffffff"
                          opacity={idx === 0 || idx === seg.units ? '0' : '0.65'}
                        />
                      )
                    })}

                    {/* Etiqueta flotante con la longitud y nombre del segmento */}
                    <text
                      x={midX + labelDist * Math.cos(normalAngle)}
                      y={midY + labelDist * Math.sin(normalAngle) + 4}
                      fill={seg.color}
                      fontSize="12"
                      fontWeight="black"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow-md select-none"
                    >
                      {seg.label}
                    </text>

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
                        r="8"
                        fill="#080c18"
                        stroke={seg.color}
                        strokeWidth="2.5"
                      />
                      {/* Punto central blanco */}
                      <circle cx={seg.p1.x} cy={seg.p1.y} r="3" fill="#ffffff" />
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
                        r="8"
                        fill="#080c18"
                        stroke={seg.color}
                        strokeWidth="2.5"
                      />
                      {/* Punto central blanco */}
                      <circle cx={seg.p2.x} cy={seg.p2.y} r="3" fill="#ffffff" />
                    </g>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Micro-guía flotante en esquina superior izquierda */}
          <div className="absolute top-2 left-2 bg-[#09101f]/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 text-[10px] text-white/70 flex items-center gap-2 pointer-events-none shadow-md z-20">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <Move size={12} /> Cuerpo: traslada
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <RotateCw size={12} /> Extremos: gira
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1 text-emerald-300 font-bold">
              <Sparkles size={12} /> Imán al unir
            </span>
          </div>

          {/* Distintivo de Éxito al cerrar el triángulo */}
          {triangleStatus.isClosed && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 rounded-full px-4 py-1.5 text-xs text-emerald-200 font-bold flex items-center gap-2 shadow-2xl z-20 animate-bounce">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>🎉 ¡Triángulo cerrado exitosamente! Cumple el teorema de existencia.</span>
            </div>
          )}

          {/* Controles flotantes de Zoom y Recentrado en esquina superior derecha */}
          <div className="absolute top-2 right-2 flex items-center gap-1 z-20 bg-[#09101f]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-xl">
            <button
              onClick={() => {
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect()
                  applyZoomToPoint(zoom - 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2)
                }
              }}
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center active:scale-90 transition-transform"
              title="Alejar (Zoom -)"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-cyan-300 font-mono text-[11px] font-bold flex items-center gap-0.5 active:scale-95 transition-all"
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
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center active:scale-90 transition-transform"
              title="Acercar (Zoom +)"
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={() => setShowReachCircles(s => !s)}
              className={`h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all ${
                showReachCircles
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                  : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70 hover:text-white'
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
                className="h-7 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
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
              className="h-7 lg:h-8 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] lg:text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              title="Colocar el lado mayor como base y unir los dos menores en los extremos"
            >
              <Wand2 size={13} className="text-cyan-300" />
              <span>Montar base</span>
            </button>

            <button
              onClick={handleResetPositions}
              className="h-7 lg:h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] lg:text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              title="Restablecer posición vertical de los segmentos"
            >
              <RotateCw size={13} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Barra Inferior de Acción y Explicación Pedagógica (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        {/* Mensaje pedagógico de exploración (sin spoilers) */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[10px] sm:text-[11px] truncate">
          {triangleStatus.isClosed ? (
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold truncate">
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">
                ¡Triángulo cerrado! {sideA} + {sideB} &gt; {sideC}, {sideA} + {sideC} &gt; {sideB} y{' '}
                {sideB} + {sideC} &gt; {sideA}.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/80 truncate">
              <Info size={14} className="text-cyan-300 shrink-0" />
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
            className="h-7 lg:h-8 px-2.5 sm:px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
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
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 active:scale-95 transition-all"
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
            className="w-full max-w-[340px] bg-[#0c1529] border border-cyan-400/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Personalizar Lados</h3>
                  <p className="text-[10px] text-white/50">Elige la longitud de cada segmento</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors"
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
                  <span className="text-cyan-300">Lado a (Cian):</span>
                  <span className="font-mono text-cyan-300">{sideA} u</span>
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
                  className="w-full accent-cyan-400 h-1.5 bg-black/50 rounded-lg cursor-pointer"
                />
              </div>

              {/* Lado B */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300">Lado b (Ámbar):</span>
                  <span className="font-mono text-amber-300">{sideB} u</span>
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
                  className="w-full accent-amber-400 h-1.5 bg-black/50 rounded-lg cursor-pointer"
                />
              </div>

              {/* Lado C */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-pink-300">Lado c (Rosa):</span>
                  <span className="font-mono text-pink-300">{sideC} u</span>
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
                  className="w-full accent-pink-400 h-1.5 bg-black/50 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Diagnóstico instantáneo */}
            <div
              className={`p-2.5 rounded-xl border text-[11px] leading-tight ${
                inequalityCheck.status === 'valid'
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                  : inequalityCheck.status === 'degenerate'
                  ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                  : 'bg-rose-500/15 border-rose-400/30 text-rose-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1 mb-1">
                {inequalityCheck.status === 'valid' && <CheckCircle2 size={14} className="text-emerald-400" />}
                {inequalityCheck.status === 'degenerate' && <AlertCircle size={14} className="text-amber-400" />}
                {inequalityCheck.status === 'impossible' && <XCircle size={14} className="text-rose-400" />}
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
              className="w-full h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow active:scale-95 transition-all"
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
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-cyan-500 text-black hover:bg-cyan-400"
      >
        <div key={helpId} className="space-y-2.5 text-white/80 text-xs leading-relaxed pb-2">
          <p>
            Para que tres segmentos puedan unirse por sus extremos y formar un triángulo cerrado,
            deben cumplir la <strong>Propiedad de la Desigualdad Triangular</strong>:
          </p>

          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-center font-mono text-cyan-200 font-bold text-sm">
            a + b &gt; c &emsp;•&emsp; a + c &gt; b &emsp;•&emsp; b + c &gt; a
          </div>

          <p>
            En palabras sencillas: <em>"La suma de las longitudes de los dos lados menores debe ser estrictamente mayor que el lado más largo"</em>.
          </p>

          <div className="space-y-1.5 p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">1. Caso Posible:</span>
              <span>Si la suma de los dos lados menores supera al mayor, los extremos se cruzan y forman un triángulo.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-rose-400 font-bold">2. Caso Imposible:</span>
              <span>Si los dos menores suman menos que el mayor, aunque los gires nunca se tocarán (queda una brecha abierta).</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">3. Caso Límite:</span>
              <span>Si la suma es exactamente igual, los lados menores caen planos encima del lado mayor formando una línea recta sin altura.</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px]">
            💡 <strong>Cómo usar el simulador:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-white/70">
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
