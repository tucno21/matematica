import React, { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crosshair,
  Sliders,
  ChevronRight,
  X,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Award,
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

// Tipos de retos de ángulos
type ChallengeMode = 'simple' | 'secantes' | 'llano' | 'triangulo' | 'cuadrilatero' | 'libre'

interface AngleItem {
  id: string
  label: string // e.g. '∠A', '∠B', '∠1', etc.
  vertex: { x: number; y: number }
  ray1Angle: number // Grados 0 a 360
  ray2Angle: number // Grados 0 a 360
  targetSpan: number // Medida real en grados
  userAnswer?: string
  isValidated?: boolean
  isCorrect?: boolean
  color: string // Color identificador del arco
}

interface ChallengeData {
  id: string
  mode: ChallengeMode
  title: string
  hint: string
  expectedSum?: number // e.g. 180 o 360
  theoremName?: string // e.g. "Suma de ángulos interiores = 180°"
  shapeLines: Array<{ x1: number; y1: number; x2: number; y2: number }>
  allVertices: Array<{ x: number; y: number; label: string }>
  angles: AngleItem[]
}

const MODES: Array<{
  id: ChallengeMode
  label: string
  shortLabel: string
  desc: string
}> = [
  { id: 'simple', label: 'Ángulo', shortLabel: 'Ángulo', desc: 'Ángulos agudos, rectos y obtusos' },
  { id: 'secantes', label: 'Secantes', shortLabel: 'Secant.', desc: 'Dos rectas que se cruzan (4 ángulos suman 360°)' },
  { id: 'llano', label: 'Suplementario', shortLabel: 'Suplem.', desc: 'Ángulo llano dividido en dos (suman 180°)' },
  { id: 'triangulo', label: 'Triángulo', shortLabel: 'Triáng.', desc: 'Mide los 3 ángulos interiores (suman 180°)' },
  { id: 'cuadrilatero', label: 'Cuadrilátero', shortLabel: 'Cuadril.', desc: 'Mide los 4 ángulos interiores (suman 360°)' },
  { id: 'libre', label: 'Libre', shortLabel: 'Libre', desc: 'Experimenta y mide libremente' },
]

function ModeIcon({ id, size = 18 }: { id: ChallengeMode; size?: number }) {
  if (id === 'simple') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="20" />
        <line x1="4" y1="20" x2="16" y2="6" />
        <path d="M 10 20 A 6 6 0 0 0 8 15" strokeWidth="2" stroke="#38bdf8" />
      </svg>
    )
  }
  if (id === 'secantes') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="4" y1="4" x2="20" y2="20" />
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    )
  }
  if (id === 'llano') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="3" y1="18" x2="21" y2="18" />
        <line x1="12" y1="18" x2="17" y2="6" stroke="#38bdf8" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    )
  }
  if (id === 'triangulo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 4 4 20 20 20" />
      </svg>
    )
  }
  if (id === 'cuadrilatero') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 7 19 5 20 19 6 18" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" strokeDasharray="3,3" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Normaliza un ángulo a [0, 360)
function normDeg(deg: number): number {
  let d = deg % 360
  if (d < 0) d += 360
  return d
}

// Ángulo polar en grados de (p2 - p1)
function getVectorAngleDeg(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const deg = (rad * 180) / Math.PI
  return normDeg(deg)
}

// Paleta de colores distintivos para arcos múltiples
const ANGLE_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa']

export default function MedirAngulosView() {
  const nav = useNavigate()
  const helpId = useId()
  const [showHelp, setShowHelp] = useState(false)
  const [mode, setMode] = useState<ChallengeMode>('simple')

  // Estado del transportador
  const [protX, setProtX] = useState(250)
  const [protY, setProtY] = useState(220)
  const [protAngle, setProtAngle] = useState(0)

  // Desplazamiento y Zoom del lienzo
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  // Referencias para evitar stale closures en listeners de gestos
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)

  useEffect(() => {
    panRef.current = pan
    zoomRef.current = zoom
  }, [pan, zoom])

  // Vértice imantado actual (para feedback visual del imán)
  const [snappedVertex, setSnappedVertex] = useState<{ x: number; y: number; label: string } | null>(null)

  // Dimensiones del canvas
  const [canvasDim, setCanvasDim] = useState({ w: 600, h: 420 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const protRef = useRef<HTMLDivElement>(null)

  // Escala responsiva del transportador
  const isLargeScreen = canvasDim.w >= 1024 && canvasDim.h >= 550
  const protSize = isLargeScreen ? Math.min(500, Math.max(420, Math.round(canvasDim.h * 0.58))) : 320
  const protScale = protSize / 320

  // Estado de retos y ángulos activos
  const [activeAngleIndex, setActiveAngleIndex] = useState(0)
  const [inputVal, setInputVal] = useState('')
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'success' | 'close' | 'error'
    msg: string
  }>({
    status: 'idle',
    msg: 'Coloca el centro del transportador en el vértice y gira la línea de 0° sobre uno de los lados.',
  })

  // Generador de retos multi-ángulo geométricamente exactos
  const generateChallenge = useCallback((m: ChallengeMode, cw: number, ch: number): ChallengeData => {
    const cx = cw / 2
    const cy = ch / 2

    if (m === 'simple') {
      const span = Math.floor(Math.random() * 26) * 5 + 25 // 25° a 150°
      const baseAngle = Math.floor(Math.random() * 24) * 15
      const ray1Angle = baseAngle % 360
      const ray2Angle = (baseAngle + span) % 360

      const len = Math.max(190, Math.min(cw * 0.44, ch * 0.44, 340))
      const rad1 = (ray1Angle * Math.PI) / 180
      const rad2 = (ray2Angle * Math.PI) / 180

      const p1_0 = { x: len * Math.cos(rad1), y: len * Math.sin(rad1) }
      const p2_0 = { x: len * Math.cos(rad2), y: len * Math.sin(rad2) }

      const minX = Math.min(0, p1_0.x, p2_0.x)
      const maxX = Math.max(0, p1_0.x, p2_0.x)
      const minY = Math.min(0, p1_0.y, p2_0.y)
      const maxY = Math.max(0, p1_0.y, p2_0.y)

      const v = { x: Math.round(cx - (minX + maxX) / 2), y: Math.round(cy - (minY + maxY) / 2) }
      const p1 = { x: Math.round(v.x + p1_0.x), y: Math.round(v.y + p1_0.y) }
      const p2 = { x: Math.round(v.x + p2_0.x), y: Math.round(v.y + p2_0.y) }

      const angleName = span < 90 ? 'Ángulo Agudo' : span === 90 ? 'Ángulo Recto' : 'Ángulo Obtuso'

      return {
        id: `simple-${Date.now()}`,
        mode: 'simple',
        title: angleName,
        hint: `Este ángulo mide aproximadamente ${span < 90 ? 'menos de 90°' : span === 90 ? '90° exactos' : 'más de 90°'}.`,
        shapeLines: [
          { x1: v.x, y1: v.y, x2: p1.x, y2: p1.y },
          { x1: v.x, y1: v.y, x2: p2.x, y2: p2.y },
        ],
        allVertices: [{ ...v, label: 'V' }],
        angles: [
          {
            id: 'A',
            label: '∠A',
            vertex: v,
            ray1Angle,
            ray2Angle,
            targetSpan: span,
            color: ANGLE_COLORS[0],
          },
        ],
      }
    }

    if (m === 'llano') {
      // Ángulo llano (180°) dividido en dos adyacentes ∠1 y ∠2
      const span1 = Math.floor(Math.random() * 22) * 5 + 35 // 35° a 140°
      const span2 = 180 - span1
      const baseRot = Math.floor(Math.random() * 12) * 15 // Rotación de la recta horizontal base
      const ray1Angle = baseRot % 360
      const ray2Angle = (baseRot + span1) % 360
      const ray3Angle = (baseRot + 180) % 360

      const len = Math.max(190, Math.min(cw * 0.42, ch * 0.42, 330))
      const v = { x: Math.round(cx), y: Math.round(cy) }

      const rad1 = (ray1Angle * Math.PI) / 180
      const rad2 = (ray2Angle * Math.PI) / 180
      const rad3 = (ray3Angle * Math.PI) / 180

      const p1 = { x: Math.round(v.x + len * Math.cos(rad1)), y: Math.round(v.y + len * Math.sin(rad1)) }
      const p2 = { x: Math.round(v.x + len * Math.cos(rad2)), y: Math.round(v.y + len * Math.sin(rad2)) }
      const p3 = { x: Math.round(v.x + len * Math.cos(rad3)), y: Math.round(v.y + len * Math.sin(rad3)) }

      return {
        id: `llano-${Date.now()}`,
        mode: 'llano',
        title: 'Ángulos Suplementarios',
        hint: 'Mide ambos ángulos ∠1 y ∠2 adyacentes sobre la recta. ¡Su suma debe dar exactamente 180°!',
        expectedSum: 180,
        theoremName: '∠1 + ∠2 = 180° (Ángulo Llano)',
        shapeLines: [
          // Recta base continua de p3 a p1 pasando por v
          { x1: p3.x, y1: p3.y, x2: p1.x, y2: p1.y },
          // Rayo divisor v -> p2
          { x1: v.x, y1: v.y, x2: p2.x, y2: p2.y },
        ],
        allVertices: [{ ...v, label: 'V' }],
        angles: [
          {
            id: '1',
            label: '∠1',
            vertex: v,
            ray1Angle,
            ray2Angle,
            targetSpan: span1,
            color: ANGLE_COLORS[0],
          },
          {
            id: '2',
            label: '∠2',
            vertex: v,
            ray1Angle: ray2Angle,
            ray2Angle: ray3Angle,
            targetSpan: span2,
            color: ANGLE_COLORS[1],
          },
        ],
      }
    }

    if (m === 'secantes') {
      // Dos rectas secantes que se cortan formando 4 ángulos alrededor del vértice
      const spanA = Math.floor(Math.random() * 16) * 5 + 40 // 40° a 115°
      const spanB = 180 - spanA
      const baseRot = Math.floor(Math.random() * 12) * 15

      const a1 = baseRot % 360
      const a2 = (baseRot + spanA) % 360
      const a3 = (baseRot + 180) % 360
      const a4 = (baseRot + 180 + spanA) % 360

      const len = Math.max(190, Math.min(cw * 0.42, ch * 0.42, 330))
      const v = { x: Math.round(cx), y: Math.round(cy) }

      const rad1 = (a1 * Math.PI) / 180
      const rad2 = (a2 * Math.PI) / 180
      const rad3 = (a3 * Math.PI) / 180
      const rad4 = (a4 * Math.PI) / 180

      const p1 = { x: Math.round(v.x + len * Math.cos(rad1)), y: Math.round(v.y + len * Math.sin(rad1)) }
      const p2 = { x: Math.round(v.x + len * Math.cos(rad2)), y: Math.round(v.y + len * Math.sin(rad2)) }
      const p3 = { x: Math.round(v.x + len * Math.cos(rad3)), y: Math.round(v.y + len * Math.sin(rad3)) }
      const p4 = { x: Math.round(v.x + len * Math.cos(rad4)), y: Math.round(v.y + len * Math.sin(rad4)) }

      return {
        id: `secantes-${Date.now()}`,
        mode: 'secantes',
        title: 'Rectas Secantes',
        hint: 'Mide los 4 ángulos formados al cortarse dos rectas. Los opuestos por el vértice son iguales y los 4 suman 360°.',
        expectedSum: 360,
        theoremName: '∠1 + ∠2 + ∠3 + ∠4 = 360°',
        shapeLines: [
          { x1: p3.x, y1: p3.y, x2: p1.x, y2: p1.y },
          { x1: p4.x, y1: p4.y, x2: p2.x, y2: p2.y },
        ],
        allVertices: [{ ...v, label: 'O' }],
        angles: [
          { id: '1', label: '∠1', vertex: v, ray1Angle: a1, ray2Angle: a2, targetSpan: spanA, color: ANGLE_COLORS[0] },
          { id: '2', label: '∠2', vertex: v, ray1Angle: a2, ray2Angle: a3, targetSpan: spanB, color: ANGLE_COLORS[1] },
          { id: '3', label: '∠3', vertex: v, ray1Angle: a3, ray2Angle: a4, targetSpan: spanA, color: ANGLE_COLORS[2] },
          { id: '4', label: '∠4', vertex: v, ray1Angle: a4, ray2Angle: a1, targetSpan: spanB, color: ANGLE_COLORS[3] },
        ],
      }
    }

    if (m === 'triangulo') {
      // Triángulo con 3 ángulos interiores múltiplos de 5° que suman exactamente 180°
      const choicesA = [35, 40, 45, 50, 55, 60, 65, 70, 75]
      const spanA = choicesA[Math.floor(Math.random() * choicesA.length)]
      const maxB = 180 - spanA - 30
      const possibleB = []
      for (let b = 30; b <= maxB; b += 5) possibleB.push(b)
      const spanB = possibleB[Math.floor(Math.random() * possibleB.length)]
      const spanC = 180 - spanA - spanB

      // Construcción geométrica precisa
      const L = Math.max(200, Math.min(cw * 0.48, ch * 0.48, 380))
      const radA = (spanA * Math.PI) / 180
      const radB = (spanB * Math.PI) / 180
      const radC = (spanC * Math.PI) / 180

      // Ley de senos: b / sin(B) = c / sin(C) => b = L * sin(B) / sin(C)
      const bSide = (L * Math.sin(radB)) / Math.sin(radC)

      // Coordenadas con A en (0,0), B en (L, 0), C en (b*cos(A), b*sin(A))
      const pA_raw = { x: 0, y: 0 }
      const pB_raw = { x: L, y: 0 }
      const pC_raw = { x: bSide * Math.cos(radA), y: bSide * Math.sin(radA) }

      // Rotación aleatoria del triángulo completo
      const rot = (Math.floor(Math.random() * 24) * 15 * Math.PI) / 180
      const rotate = (p: { x: number; y: number }) => ({
        x: p.x * Math.cos(rot) - p.y * Math.sin(rot),
        y: p.x * Math.sin(rot) + p.y * Math.cos(rot),
      })

      const pA_rot = rotate(pA_raw)
      const pB_rot = rotate(pB_raw)
      const pC_rot = rotate(pC_raw)

      // Bounding box para centrado absoluto
      const minX = Math.min(pA_rot.x, pB_rot.x, pC_rot.x)
      const maxX = Math.max(pA_rot.x, pB_rot.x, pC_rot.x)
      const minY = Math.min(pA_rot.y, pB_rot.y, pC_rot.y)
      const maxY = Math.max(pA_rot.y, pB_rot.y, pC_rot.y)

      const offX = Math.round(cx - (minX + maxX) / 2)
      const offY = Math.round(cy - (minY + maxY) / 2)

      const A = { x: Math.round(pA_rot.x + offX), y: Math.round(pA_rot.y + offY) }
      const B = { x: Math.round(pB_rot.x + offX), y: Math.round(pB_rot.y + offY) }
      const C = { x: Math.round(pC_rot.x + offX), y: Math.round(pC_rot.y + offY) }

      // Ángulos de los rayos para cada vértice
      const angA_AB = getVectorAngleDeg(A, B)
      const angA_AC = getVectorAngleDeg(A, C)
      const diffA = normDeg(angA_AC - angA_AB)
      const rayA1 = diffA <= 180 ? angA_AB : angA_AC
      const rayA2 = diffA <= 180 ? angA_AC : angA_AB

      const angB_BC = getVectorAngleDeg(B, C)
      const angB_BA = getVectorAngleDeg(B, A)
      const diffB = normDeg(angB_BA - angB_BC)
      const rayB1 = diffB <= 180 ? angB_BC : angB_BA
      const rayB2 = diffB <= 180 ? angB_BA : angB_BC

      const angC_CA = getVectorAngleDeg(C, A)
      const angC_CB = getVectorAngleDeg(C, B)
      const diffC = normDeg(angC_CB - angC_CA)
      const rayC1 = diffC <= 180 ? angC_CA : angC_CB
      const rayC2 = diffC <= 180 ? angC_CB : angC_CA

      return {
        id: `triangulo-${Date.now()}`,
        mode: 'triangulo',
        title: 'Triángulo (3 Ángulos)',
        hint: 'Mide los 3 ángulos interiores ∠A, ∠B y ∠C. ¡Comprueba que su suma siempre es exactamente 180°!',
        expectedSum: 180,
        theoremName: '∠A + ∠B + ∠C = 180° (Teorema Fundamental)',
        shapeLines: [
          { x1: A.x, y1: A.y, x2: B.x, y2: B.y },
          { x1: B.x, y1: B.y, x2: C.x, y2: C.y },
          { x1: C.x, y1: C.y, x2: A.x, y2: A.y },
        ],
        allVertices: [
          { ...A, label: 'A' },
          { ...B, label: 'B' },
          { ...C, label: 'C' },
        ],
        angles: [
          { id: 'A', label: '∠A', vertex: A, ray1Angle: rayA1, ray2Angle: rayA2, targetSpan: spanA, color: ANGLE_COLORS[0] },
          { id: 'B', label: '∠B', vertex: B, ray1Angle: rayB1, ray2Angle: rayB2, targetSpan: spanB, color: ANGLE_COLORS[1] },
          { id: 'C', label: '∠C', vertex: C, ray1Angle: rayC1, ray2Angle: rayC2, targetSpan: spanC, color: ANGLE_COLORS[2] },
        ],
      }
    }

    if (m === 'cuadrilatero') {
      // Cuadrilátero convexo con 4 ángulos que suman 360°
      // Usamos un trapecio isósceles o cuadrilátero convexo bien definido
      const spanA = Math.floor(Math.random() * 8) * 5 + 65 // 65° a 100°
      const spanB = spanA // Ángulos base iguales
      const spanC = 180 - spanA
      const spanD = 180 - spanA

      const baseL = Math.max(190, Math.min(cw * 0.46, ch * 0.46, 360))
      const topL = baseL * 0.55
      const h = (baseL - topL) / (2 * Math.tan(((180 - spanC) * Math.PI) / 360 || 1))

      const pA_raw = { x: -baseL / 2, y: h / 2 }
      const pB_raw = { x: baseL / 2, y: h / 2 }
      const pC_raw = { x: topL / 2, y: -h / 2 }
      const pD_raw = { x: -topL / 2, y: -h / 2 }

      const rot = (Math.floor(Math.random() * 24) * 15 * Math.PI) / 180
      const rotate = (p: { x: number; y: number }) => ({
        x: p.x * Math.cos(rot) - p.y * Math.sin(rot),
        y: p.x * Math.sin(rot) + p.y * Math.cos(rot),
      })

      const A = { x: Math.round(rotate(pA_raw).x + cx), y: Math.round(rotate(pA_raw).y + cy) }
      const B = { x: Math.round(rotate(pB_raw).x + cx), y: Math.round(rotate(pB_raw).y + cy) }
      const C = { x: Math.round(rotate(pC_raw).x + cx), y: Math.round(rotate(pC_raw).y + cy) }
      const D = { x: Math.round(rotate(pD_raw).x + cx), y: Math.round(rotate(pD_raw).y + cy) }

      const getAngleRays = (v: { x: number; y: number }, pPrev: { x: number; y: number }, pNext: { x: number; y: number }) => {
        const a1 = getVectorAngleDeg(v, pNext)
        const a2 = getVectorAngleDeg(v, pPrev)
        const diff = normDeg(a2 - a1)
        return diff <= 180 ? { ray1: a1, ray2: a2 } : { ray1: a2, ray2: a1 }
      }

      const rA = getAngleRays(A, D, B)
      const rB = getAngleRays(B, A, C)
      const rC = getAngleRays(C, B, D)
      const rD = getAngleRays(D, C, A)

      return {
        id: `cuadrilatero-${Date.now()}`,
        mode: 'cuadrilatero',
        title: 'Cuadrilátero (4 Ángulos)',
        hint: 'Mide los 4 ángulos interiores ∠A, ∠B, ∠C y ∠D. ¡Comprueba que suman exactamente 360°!',
        expectedSum: 360,
        theoremName: '∠A + ∠B + ∠C + ∠D = 360°',
        shapeLines: [
          { x1: A.x, y1: A.y, x2: B.x, y2: B.y },
          { x1: B.x, y1: B.y, x2: C.x, y2: C.y },
          { x1: C.x, y1: C.y, x2: D.x, y2: D.y },
          { x1: D.x, y1: D.y, x2: A.x, y2: A.y },
        ],
        allVertices: [
          { ...A, label: 'A' },
          { ...B, label: 'B' },
          { ...C, label: 'C' },
          { ...D, label: 'D' },
        ],
        angles: [
          { id: 'A', label: '∠A', vertex: A, ray1Angle: rA.ray1, ray2Angle: rA.ray2, targetSpan: spanA, color: ANGLE_COLORS[0] },
          { id: 'B', label: '∠B', vertex: B, ray1Angle: rB.ray1, ray2Angle: rB.ray2, targetSpan: spanB, color: ANGLE_COLORS[1] },
          { id: 'C', label: '∠C', vertex: C, ray1Angle: rC.ray1, ray2Angle: rC.ray2, targetSpan: spanC, color: ANGLE_COLORS[2] },
          { id: 'D', label: '∠D', vertex: D, ray1Angle: rD.ray1, ray2Angle: rD.ray2, targetSpan: spanD, color: ANGLE_COLORS[3] },
        ],
      }
    }

    // Libre
    return {
      id: `libre-${Date.now()}`,
      mode: 'libre',
      title: 'Modo Libre',
      hint: 'Arrastra y gira el transportador libremente para explorar y practicar la medición.',
      shapeLines: [
        { x1: Math.round(cx), y1: Math.round(cy), x2: Math.round(cx + 200), y2: Math.round(cy) },
        { x1: Math.round(cx), y1: Math.round(cy), x2: Math.round(cx + 200 * Math.cos((60 * Math.PI) / 180)), y2: Math.round(cy + 200 * Math.sin((60 * Math.PI) / 180)) },
      ],
      allVertices: [{ x: Math.round(cx), y: Math.round(cy), label: 'V' }],
      angles: [
        {
          id: 'A',
          label: '∠A',
          vertex: { x: Math.round(cx), y: Math.round(cy) },
          ray1Angle: 0,
          ray2Angle: 60,
          targetSpan: 60,
          color: ANGLE_COLORS[0],
        },
      ],
    }
  }, [])

  // Estado del reto actual
  const [challenge, setChallenge] = useState<ChallengeData>(() => generateChallenge('simple', 600, 420))
  const activeAngle = challenge.angles[activeAngleIndex] || challenge.angles[0]

  // Respuestas del estudiante por cada ángulo
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})

  // Montaje inicial y resize
  const isFirstMount = useRef(true)
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const w = Math.max(300, rect.width)
        const h = Math.max(220, rect.height)
        setCanvasDim({ w, h })
        if (isFirstMount.current && rect.width > 0 && rect.height > 0) {
          isFirstMount.current = false
          const ch = generateChallenge('simple', w, h)
          setChallenge(ch)
          setProtX(w * 0.22)
          setProtY(h * 0.32)
        }
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [generateChallenge])

  // Cargar nuevo reto
  const loadNewChallenge = useCallback((m: ChallengeMode) => {
    setMode(m)
    setInputVal('')
    setUserAnswers({})
    setShowSolution(false)
    setActiveAngleIndex(0)
    setSnappedVertex(null)
    setPan({ x: 0, y: 0 })
    setZoom(1)

    const newCh = generateChallenge(m, canvasDim.w, canvasDim.h)
    setChallenge(newCh)

    // Colocar el transportador cerca pero no alineado para que el alumno lo mueva
    setProtX(canvasDim.w * 0.22)
    setProtY(canvasDim.h * 0.32)
    setProtAngle(0)

    setFeedback({
      status: 'idle',
      msg: `Nuevo reto: ${newCh.title}. Mueve el transportador sobre el vértice para medir.`,
    })
  }, [canvasDim.w, canvasDim.h, generateChallenge])

  const handleSelectMode = (m: ChallengeMode) => {
    loadNewChallenge(m)
  }

  // ── ZOOM CENTRADO EN EL CURSOR O EN EL PUNTO MEDIO DE LOS DEDOS ──
  const applyZoomToPoint = useCallback((targetZoom: number, clientX: number, clientY: number) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top

    const currentZoom = zoomRef.current
    const currentPan = panRef.current
    const nextZoom = Math.min(3.0, Math.max(0.5, Math.round(targetZoom * 100) / 100))
    if (Math.abs(nextZoom - currentZoom) < 0.001) return

    // Punto en coordenadas del mundo bajo el cursor/dedos
    const worldX = (px - currentPan.x) / currentZoom
    const worldY = (py - currentPan.y) / currentZoom

    // Nuevo pan para que dicho punto quede exactamente en (px, py)
    const newPanX = Math.round(px - worldX * nextZoom)
    const newPanY = Math.round(py - worldY * nextZoom)

    setZoom(nextZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [])

  // Zoom con rueda del ratón hacia el puntero
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.15 : 0.85
      const targetZ = zoomRef.current * factor
      applyZoomToPoint(targetZ, e.clientX, e.clientY)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [applyZoomToPoint])

  // ── GESTIÓN INTEGRAL DE GESTOS (1 DEDO: PAN / ARRASTRE; 2 DEDOS: PINCH-TO-ZOOM INMEDIATO) ──
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isDraggingProtRef = useRef(false)
  const isRotatingProtRef = useRef(false)
  const isPanningCanvasRef = useRef(false)

  const dragStartRef = useRef({
    x: 0,
    y: 0,
    initialProtX: 0,
    initialProtY: 0,
    initialPanX: 0,
    initialPanY: 0,
    initialAngle: 0,
  })

  const pinchStartRef = useRef({
    dist: 0,
    zoom: 1,
    midX: 0,
    midY: 0,
  })

  // Verificar efecto imán con todos los vértices del reto
  const checkMagneticSnap = useCallback((candidateX: number, candidateY: number) => {
    const SNAP_RADIUS = 26 // Radio de atracción en coordenadas de mundo
    let bestV: { x: number; y: number; label: string } | null = null
    let bestDist = Infinity

    for (const v of challenge.allVertices) {
      const d = Math.hypot(candidateX - v.x, candidateY - v.y)
      if (d <= SNAP_RADIUS && d < bestDist) {
        bestDist = d
        bestV = v
      }
    }

    if (bestV) {
      setSnappedVertex(bestV)
      // Si el vértice imantado coincide con algún ángulo, enfocarlo
      const foundIdx = challenge.angles.findIndex(
        a => Math.hypot(a.vertex.x - bestV!.x, a.vertex.y - bestV!.y) < 5
      )
      if (foundIdx !== -1 && foundIdx !== activeAngleIndex) {
        setActiveAngleIndex(foundIdx)
      }
      return { x: bestV.x, y: bestV.y, snapped: true }
    } else {
      setSnappedVertex(null)
      return { x: candidateX, y: candidateY, snapped: false }
    }
  }, [challenge, activeAngleIndex])

  // Pointer Down en el lienzo de trabajo
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [data-protractor-rotator]')) return
    if (e.button !== 0 && e.pointerType === 'mouse') return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      // 2 dedos detectados: cancelar cualquier arrastre y arrancar pinch-to-zoom
      isDraggingProtRef.current = false
      isPanningCanvasRef.current = false
      isRotatingProtRef.current = false

      const pts = Array.from(activePointersRef.current.values())
      pinchStartRef.current = {
        dist: getDistance(pts[0], pts[1]),
        zoom: zoomRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
    } else if (activePointersRef.current.size === 1) {
      isPanningCanvasRef.current = true
      dragStartRef.current.x = e.clientX
      dragStartRef.current.y = e.clientY
      dragStartRef.current.initialPanX = panRef.current.x
      dragStartRef.current.initialPanY = panRef.current.y
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!activePointersRef.current.has(ev.pointerId)) return
      activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

      // Prioridad absoluta: Pinch-to-zoom con 2 dedos
      if (activePointersRef.current.size >= 2) {
        const pts = Array.from(activePointersRef.current.values())
        const curDist = getDistance(pts[0], pts[1])
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2

        if (pinchStartRef.current.dist > 5) {
          const ratio = curDist / pinchStartRef.current.dist
          const newZ = pinchStartRef.current.zoom * ratio
          applyZoomToPoint(newZ, midX, midY)
        }
      } else if (isPanningCanvasRef.current) {
        const dx = ev.clientX - dragStartRef.current.x
        const dy = ev.clientY - dragStartRef.current.y
        setPan({
          x: Math.round(dragStartRef.current.initialPanX + dx),
          y: Math.round(dragStartRef.current.initialPanY + dy),
        })
      }
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      if (activePointersRef.current.size < 2) {
        pinchStartRef.current.dist = 0
      }
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

  // Pointer Down en el cuerpo del Transportador (Arrastrar con Imán)
  const handleProtractorPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      // 2 dedos sobre el transportador: cambiar a pinch-to-zoom sin mover el instrumento
      isDraggingProtRef.current = false
      isRotatingProtRef.current = false
      const pts = Array.from(activePointersRef.current.values())
      pinchStartRef.current = {
        dist: getDistance(pts[0], pts[1]),
        zoom: zoomRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
      return
    }

    isDraggingProtRef.current = true
    isRotatingProtRef.current = false
    dragStartRef.current.x = e.clientX
    dragStartRef.current.y = e.clientY
    dragStartRef.current.initialProtX = protX
    dragStartRef.current.initialProtY = protY

    const onPointerMove = (ev: PointerEvent) => {
      if (!activePointersRef.current.has(ev.pointerId)) return
      activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })

      if (activePointersRef.current.size >= 2) {
        // Interrumpir arrastre si un segundo dedo entra
        isDraggingProtRef.current = false
        const pts = Array.from(activePointersRef.current.values())
        const curDist = getDistance(pts[0], pts[1])
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2
        if (pinchStartRef.current.dist > 5) {
          const ratio = curDist / pinchStartRef.current.dist
          applyZoomToPoint(pinchStartRef.current.zoom * ratio, midX, midY)
        }
        return
      }

      if (isDraggingProtRef.current) {
        const dx = ev.clientX - dragStartRef.current.x
        const dy = ev.clientY - dragStartRef.current.y
        const candX = Math.round(dragStartRef.current.initialProtX + dx / zoomRef.current)
        const candY = Math.round(dragStartRef.current.initialProtY + dy / zoomRef.current)

        // Efecto Imán con los vértices
        const res = checkMagneticSnap(candX, candY)
        setProtX(res.x)
        setProtY(res.y)
      }
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      if (activePointersRef.current.size === 0) {
        isDraggingProtRef.current = false
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Pointer Down en el manillar de rotación
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      isRotatingProtRef.current = false
      return
    }

    isRotatingProtRef.current = true
    isDraggingProtRef.current = false

    if (!protRef.current) return
    const rect = protRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const initialAngleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    dragStartRef.current.initialAngle = protAngle

    const onPointerMove = (ev: PointerEvent) => {
      if (!isRotatingProtRef.current) return
      const currentAngleRad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX)
      const diffDeg = ((currentAngleRad - initialAngleRad) * 180) / Math.PI
      let newAngle = (dragStartRef.current.initialAngle + diffDeg) % 360
      if (newAngle < 0) newAngle += 360
      setProtAngle(Math.round(newAngle))
    }

    const onPointerUp = (ev: PointerEvent) => {
      activePointersRef.current.delete(ev.pointerId)
      isRotatingProtRef.current = false
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Botón "Alinear": Ubica el punto central en el vértice SIN alterar el giro
  const handleAutoAlign = () => {
    if (!activeAngle) return
    setProtX(activeAngle.vertex.x)
    setProtY(activeAngle.vertex.y)
    setSnappedVertex({ ...activeAngle.vertex, label: activeAngle.label })
    setFeedback({
      status: 'idle',
      msg: `Centro colocado exactamente en el vértice de ${activeAngle.label}. Ahora gira la manija superior para alinear con el 0°.`,
    })
  }

  // Validación de la medida del ángulo activo
  const handleValidateActive = () => {
    const val = parseFloat(inputVal.trim())
    if (isNaN(val)) {
      setFeedback({
        status: 'error',
        msg: 'Por favor ingresa un número en grados (ej: 45, 60, 90).',
      })
      return
    }

    const exact = activeAngle.targetSpan
    const diff = Math.abs(val - exact)

    // Guardar respuesta del estudiante
    const updatedAnswers = { ...userAnswers, [activeAngle.id]: String(val) }
    setUserAnswers(updatedAnswers)

    if (diff === 0) {
      setFeedback({
        status: 'success',
        msg: `🎉 ¡Exacto al 100%! ${activeAngle.label} mide exactamente ${exact}°.`,
      })
    } else if (diff <= 2) {
      setFeedback({
        status: 'success',
        msg: `✨ ¡Muy bien! Mediste ${val}° y la medida real es ${exact}° (margen de solo ${diff}°). ¡Aprobado!`,
      })
    } else {
      setFeedback({
        status: 'error',
        msg: `Mediste ${val}°, pero la abertura de ${activeAngle.label} es de ${exact}°. Revisa la escala (interior o exterior) y que el centro esté en el vértice.`,
      })
      return
    }

    // Comprobar si todos los ángulos del reto han sido medidos
    const allAnswered = challenge.angles.every(a => {
      const ans = a.id === activeAngle.id ? val : parseFloat(updatedAnswers[a.id] || '')
      return !isNaN(ans) && Math.abs(ans - a.targetSpan) <= 2
    })

    if (allAnswered && challenge.angles.length > 1) {
      const sum = challenge.angles.reduce((acc, a) => {
        const ans = a.id === activeAngle.id ? val : parseFloat(updatedAnswers[a.id] || '')
        return acc + ans
      }, 0)
      setFeedback({
        status: 'success',
        msg: `🏆 ¡Reto completado! Mediste todos los ángulos correctamente. Suma total = ${Math.round(sum)}° (${challenge.theoremName || ''}).`,
      })
      setShowSolution(true)
    }
  }

  // Teclado virtual numérico
  const handleKeyPad = (k: string) => {
    if (k === 'DEL') {
      setInputVal(prev => prev.slice(0, -1))
    } else if (k === 'CLR') {
      setInputVal('')
    } else {
      if (inputVal.length < 3) {
        setInputVal(prev => prev + k)
      }
    }
  }

  // Abrir modal de respuesta para un ángulo específico
  const handleOpenAnswerModal = (idx: number) => {
    setActiveAngleIndex(idx)
    setInputVal(userAnswers[challenge.angles[idx]?.id] || '')
    setShowAnswerModal(true)
  }

  // Generador de caminos SVG para los arcos de ángulos
  const getAngleArcPath = (angle: AngleItem) => {
    const v = angle.vertex
    const r = Math.max(28, Math.round(36 * protScale))
    const a1 = (angle.ray1Angle * Math.PI) / 180
    const a2 = (angle.ray2Angle * Math.PI) / 180

    const x1 = v.x + r * Math.cos(a1)
    const y1 = v.y + r * Math.sin(a1)
    const x2 = v.x + r * Math.cos(a2)
    const y2 = v.y + r * Math.sin(a2)

    const largeArc = angle.targetSpan > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Longitud visual de los rayos auxiliares
  const rayLen = Math.round(150 * protScale + 40)

  // Resumen del teorema para retos con múltiples ángulos
  const allCompleted = challenge.angles.every(
    a => userAnswers[a.id] && Math.abs(parseFloat(userAnswers[a.id]) - a.targetSpan) <= 2
  )

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
              Medición con Transportador
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              Goniómetro
            </span>
          </div>
        </div>

        {/* Título del reto y teorema */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] lg:text-xs text-cyan-300 font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20 truncate">
            {challenge.title}
          </span>
          {challenge.expectedSum && (
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] lg:text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
              Σ = {challenge.expectedSum}°
            </span>
          )}
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

      {/* ── 2. Área de Trabajo: Barra Lateral + Canvas Deslizable (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden p-1 sm:p-1.5 lg:p-2 gap-1 sm:gap-2">
        {/* Panel Lateral Izquierdo de Selección de Modo */}
        <aside className="w-[50px] sm:w-[58px] lg:w-[136px] shrink-0 bg-[#0a0f1d] border border-white/10 rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between shadow-xl select-none">
          <div className="w-full flex flex-col items-center gap-1 sm:gap-1.5">
            <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-wider py-0.5 hidden lg:block text-center w-full border-b border-white/5">
              Modos
            </span>

            {MODES.map(m => {
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMode(m.id)}
                  title={m.desc}
                  className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-0.5 lg:gap-2 p-1 sm:p-1.5 lg:px-2.5 lg:py-2 active:scale-95 ${
                    active
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black ring-1 ring-cyan-300'
                      : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5'
                  }`}
                >
                  <div className="shrink-0">
                    <ModeIcon id={m.id} size={17} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] lg:text-xs font-bold truncate max-w-full">
                    <span className="lg:hidden">{m.shortLabel}</span>
                    <span className="hidden lg:inline">{m.label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Resetear posición de vista al 100% */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 })
              setZoom(1)
            }}
            className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-cyan-300 text-[9px] font-mono flex flex-col items-center justify-center gap-0.5 border border-white/5 active:scale-95 transition-all"
            title="Centrar figura y restablecer zoom a 100%"
          >
            <Maximize2 size={13} />
            <span className="hidden lg:inline text-[10px] font-bold">100% Centro</span>
          </button>
        </aside>

        {/* Espacio del Plano Geométrico / Canvas deslizable (Pan y Zoom) */}
        <div
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className="flex-1 min-w-0 h-full relative bg-gradient-to-b from-[#0a1122] via-[#070d1a] to-[#080c18] border border-white/10 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          {/* Cuadrícula milimétrica tenue de fondo sincronizada con el pan */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <defs>
              <pattern
                id="grid"
                width={isLargeScreen ? 30 : 20}
                height={isLargeScreen ? 30 : 20}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x % (isLargeScreen ? 30 : 20)}, ${pan.y % (isLargeScreen ? 30 : 20)})`}
              >
                <path d={isLargeScreen ? 'M 30 0 L 0 0 0 30' : 'M 20 0 L 0 0 0 20'} fill="none" stroke="#38bdf8" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Mundo deslizable (Mueve figuras y transportador con Pan y Zoom 1:1) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              touchAction: 'none',
            }}
          >
            {/* SVG con las figuras geométricas (trazos finos y nítidos de 1.1px) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {/* Líneas de las figuras (grosor fino 1.1px) */}
              {challenge.shapeLines?.map((l, idx) => (
                <line
                  key={idx}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="#f1f5f9"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              ))}

              {/* Rayos y arcos de cada ángulo del reto */}
              {challenge.angles.map((ang, idx) => {
                const isActive = idx === activeAngleIndex
                const isMeasured = Boolean(userAnswers[ang.id])
                const rad1 = (ang.ray1Angle * Math.PI) / 180
                const rad2 = (ang.ray2Angle * Math.PI) / 180
                const midRad = (((ang.ray1Angle + ang.targetSpan / 2) * Math.PI) / 180)

                return (
                  <g key={ang.id}>
                    {/* Rayos del ángulo activo destacados con grosor fino de 1.2px */}
                    {isActive && (
                      <>
                        <line
                          x1={ang.vertex.x}
                          y1={ang.vertex.y}
                          x2={ang.vertex.x + rayLen * Math.cos(rad1)}
                          y2={ang.vertex.y + rayLen * Math.sin(rad1)}
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle
                          cx={ang.vertex.x + rayLen * Math.cos(rad1)}
                          cy={ang.vertex.y + rayLen * Math.sin(rad1)}
                          r="2.2"
                          fill="#38bdf8"
                        />
                        <line
                          x1={ang.vertex.x}
                          y1={ang.vertex.y}
                          x2={ang.vertex.x + rayLen * Math.cos(rad2)}
                          y2={ang.vertex.y + rayLen * Math.sin(rad2)}
                          stroke="#fbbf24"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle
                          cx={ang.vertex.x + rayLen * Math.cos(rad2)}
                          cy={ang.vertex.y + rayLen * Math.sin(rad2)}
                          r="2.2"
                          fill="#fbbf24"
                        />
                      </>
                    )}

                    {/* Arco del ángulo */}
                    <path
                      d={getAngleArcPath(ang)}
                      fill={isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)'}
                      stroke={isActive ? '#38bdf8' : ang.color}
                      strokeWidth={isActive ? '1.5' : '1.1'}
                      strokeDasharray={isActive ? 'none' : '3,2'}
                    />

                    {/* Etiqueta del ángulo en el arco */}
                    <text
                      x={ang.vertex.x + 48 * Math.cos(midRad)}
                      y={ang.vertex.y + 48 * Math.sin(midRad) + 4}
                      fill={isActive ? '#38bdf8' : ang.color}
                      fontSize={isActive ? '13' : '11'}
                      fontWeight="black"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="cursor-pointer pointer-events-auto"
                      onClick={() => handleOpenAnswerModal(idx)}
                    >
                      {isMeasured ? `${userAnswers[ang.id]}°` : ang.label}
                    </text>

                    {/* Medida real visible si se pulsa "Ver real" */}
                    {showSolution && (
                      <text
                        x={ang.vertex.x + 64 * Math.cos(midRad)}
                        y={ang.vertex.y + 64 * Math.sin(midRad) + 4}
                        fill="#34d399"
                        fontSize="13"
                        fontWeight="black"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {ang.targetSpan}°
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Vértices del reto con micro-mira y etiquetas */}
              {challenge.allVertices.map(v => {
                const isSnapped =
                  snappedVertex && Math.hypot(snappedVertex.x - v.x, snappedVertex.y - v.y) < 2

                return (
                  <g key={v.label}>
                    {/* Efecto Imán: Halo pulsante cuando el transportador se acopla al vértice */}
                    {isSnapped && (
                      <>
                        <circle
                          cx={v.x}
                          cy={v.y}
                          r="22"
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                          strokeDasharray="4,3"
                          opacity="0.8"
                        />
                        <circle
                          cx={v.x}
                          cy={v.y}
                          r="12"
                          fill="rgba(52, 211, 153, 0.25)"
                        />
                      </>
                    )}

                    <circle
                      cx={v.x}
                      cy={v.y}
                      r="4"
                      fill="#080c18"
                      stroke={isSnapped ? '#34d399' : '#38bdf8'}
                      strokeWidth="1.4"
                    />
                    <circle cx={v.x} cy={v.y} r="1.3" fill="#ffffff" />
                    <text
                      x={v.x - 12}
                      y={v.y - 8}
                      fill={isSnapped ? '#34d399' : '#38bdf8'}
                      fontSize="11"
                      fontWeight="black"
                    >
                      {v.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* ── EL INSTRUMENTO: TRANSPORTADOR TRANSLÚCIDO ESCALABLE ── */}
            <div
              ref={protRef}
              data-protractor
              className="absolute cursor-move select-none pointer-events-auto"
              style={{
                left: `${protX}px`,
                top: `${protY}px`,
                width: `${protSize}px`,
                height: `${protSize}px`,
                transform: `translate(-50%, -50%) rotate(${protAngle}deg)`,
                transformOrigin: '50% 50%',
                touchAction: 'none',
                filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.65))',
              }}
              onPointerDown={handleProtractorPointerDown}
            >
              {/* SVG del Transportador Graduado Escolar */}
              <svg
                width={protSize}
                height={protSize}
                viewBox="-160 -160 320 320"
                className="drop-shadow-2xl overflow-visible pointer-events-auto"
              >
                <defs>
                  <radialGradient id="protractorGlass" cx="0%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                    <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.22" />
                  </radialGradient>
                </defs>

                {/* Semicírculo de acrílico transparente */}
                <path
                  d="M -150 0 A 150 150 0 0 1 150 0 L 150 16 L -150 16 Z"
                  fill="url(#protractorGlass)"
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1.4"
                  className="backdrop-blur-sm"
                />

                {/* Zona central recortada para visión clara */}
                <path
                  d="M -65 0 A 65 65 0 0 1 65 0 L 65 14 L -65 14 Z"
                  fill="rgba(8, 12, 24, 0.25)"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="1"
                />

                {/* Línea de base 0° - 180° */}
                <line x1="-148" y1="0" x2="148" y2="0" stroke="#f8fafc" strokeWidth="1.3" opacity="0.85" />
                <line x1="0" y1="-148" x2="0" y2="10" stroke="#38bdf8" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />

                {/* Centro de mira reticular */}
                <circle cx="0" cy="0" r="4.2" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="1.3" fill="#f8fafc" />

                {/* Marcas de graduación cada 1°, 5° y 10° */}
                {Array.from({ length: 181 }).map((_, deg) => {
                  const rad = (deg * Math.PI) / 180
                  const cos = Math.cos(rad)
                  const sin = -Math.sin(rad)

                  const is10 = deg % 10 === 0
                  const is5 = deg % 5 === 0 && !is10
                  const len = is10 ? 14 : is5 ? 9 : 5

                  const rOuter = 150
                  const rInner = rOuter - len

                  const x1 = rOuter * cos
                  const y1 = rOuter * sin
                  const x2 = rInner * cos
                  const y2 = rInner * sin

                  const textROuter = 126
                  const textRInner = 78

                  return (
                    <g key={deg}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={is10 ? '#ffffff' : is5 ? '#7dd3fc' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={is10 ? 1.2 : 0.7}
                      />

                      {is10 && (
                        <>
                          {/* Escala exterior (0° a 180°) */}
                          <text
                            x={textROuter * cos}
                            y={textROuter * sin + 3}
                            fontSize="8"
                            fill="#ffffff"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {deg}
                          </text>

                          {/* Escala interior (180° a 0°) */}
                          <text
                            x={textRInner * cos}
                            y={textRInner * sin + 3}
                            fontSize="7"
                            fill="#38bdf8"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {180 - deg}
                          </text>
                        </>
                      )}
                    </g>
                  )
                })}

                {/* Indicadores de 0° y 180° */}
                <text x="142" y="-4" fontSize="8" fill="#34d399" fontWeight="black" textAnchor="end">0°</text>
                <text x="-142" y="-4" fontSize="8" fill="#34d399" fontWeight="black" textAnchor="start">180°</text>
              </svg>

              {/* Manija táctil de Rotación */}
              <div
                data-protractor-rotator
                className="absolute -top-7 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing ring-2 ring-white/50 active:scale-110 transition-transform pointer-events-auto"
                onPointerDown={handleRotatePointerDown}
                title="Arrastra para girar el transportador"
              >
                <RotateCw size={18} className="animate-spin-slow" />
              </div>
            </div>
          </div>

          {/* Micro-guía flotante en esquina superior izquierda */}
          <div className="absolute top-2 left-2 bg-[#09101f]/85 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 text-[10px] text-white/70 flex items-center gap-2 pointer-events-none shadow-md z-20">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <Crosshair size={12} /> Centro → V
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <Magnet size={12} /> Imán activo
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1 text-white/50">
              <Move size={12} /> 1 dedo: mover • 2 dedos: zoom al punto
            </span>
          </div>

          {/* Selector flotante de ángulo si hay varios en el reto */}
          {challenge.angles.length > 1 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#09101f]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 z-20 shadow-lg">
              <span className="text-[9px] text-white/40 font-bold px-1">Ángulo:</span>
              {challenge.angles.map((ang, idx) => {
                const isCurrent = idx === activeAngleIndex
                const ans = userAnswers[ang.id]
                return (
                  <button
                    key={ang.id}
                    onClick={() => {
                      setActiveAngleIndex(idx)
                      setProtX(ang.vertex.x)
                      setProtY(ang.vertex.y)
                      setSnappedVertex({ ...ang.vertex, label: ang.label })
                    }}
                    className={`h-6 px-2 rounded font-bold text-[10px] flex items-center gap-1 transition-all ${
                      isCurrent
                        ? 'bg-cyan-500 text-black shadow'
                        : ans
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-white/5 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    <span>{ang.label}</span>
                    {ans && <span>({ans}°)</span>}
                  </button>
                )
              })}
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

          {/* Ajuste fino de rotación para precisión milimétrica */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#09101f]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 z-20 shadow-lg">
            <span className="text-[9px] text-white/40 font-bold px-1 hidden sm:inline">Giro fino:</span>
            <button
              onClick={() => setProtAngle(prev => (prev - 1 + 360) % 360)}
              className="h-6 px-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono font-bold"
              title="Girar 1° a la izquierda"
            >
              -1°
            </button>
            <button
              onClick={() => setProtAngle(prev => (prev + 1) % 360)}
              className="h-6 px-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono font-bold"
              title="Girar 1° a la derecha"
            >
              +1°
            </button>
            <button
              onClick={() => setProtAngle(prev => (prev - 5 + 360) % 360)}
              className="h-6 px-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono font-bold"
              title="Girar 5° a la izquierda"
            >
              -5°
            </button>
            <button
              onClick={() => setProtAngle(prev => (prev + 5) % 360)}
              className="h-6 px-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono font-bold"
              title="Girar 5° a la derecha"
            >
              +5°
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        {/* Mensaje de feedback o pista */}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[10px] sm:text-[11px] truncate">
          {feedback.status === 'success' ? (
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold truncate">
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : feedback.status === 'close' ? (
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold truncate">
              <Sparkles size={14} className="shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : feedback.status === 'error' ? (
            <div className="flex items-center gap-1.5 text-rose-300 font-bold truncate">
              <AlertCircle size={14} className="shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/70 truncate">
              <span className="font-bold text-cyan-300">Pista:</span>
              <span className="truncate">{challenge.hint}</span>
            </div>
          )}
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleAutoAlign}
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
            title="Ubicar centro del transportador en el vértice activo"
          >
            <Crosshair size={12} className="text-cyan-300" />
            <span className="hidden sm:inline">Alinear en V</span>
          </button>

          <button
            onClick={() => setShowSolution(s => !s)}
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] sm:text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1 active:scale-95 transition-all"
            title="Mostrar u ocultar medidas exactas"
          >
            <Eye size={12} />
            <span className="hidden sm:inline">{showSolution ? 'Ocultar real' : 'Ver real'}</span>
          </button>

          <button
            onClick={() => handleOpenAnswerModal(activeAngleIndex)}
            className="h-7 lg:h-8 px-3 sm:px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[11px] sm:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Sliders size={13} />
            <span>
              {userAnswers[activeAngle.id]
                ? `${activeAngle.label}: ${userAnswers[activeAngle.id]}°`
                : `✍ Responder ${activeAngle.label}`}
            </span>
          </button>

          <button
            onClick={() => loadNewChallenge(mode)}
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 active:scale-95 transition-all"
            title="Generar nuevo reto"
          >
            <ChevronRight size={14} />
            <span className="hidden sm:inline">Siguiente</span>
          </button>
        </div>
      </footer>

      {/* ── Modal Popover Flotante: Ingreso de Medida para Todos los Ángulos ── */}
      {showAnswerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAnswerModal(false)}
        >
          <div
            className="w-full max-w-[340px] bg-[#0c1529] border border-cyan-400/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">¿Cuánto mide el ángulo?</h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono">
                    {challenge.title} — {activeAngle.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnswerModal(false)}
                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Selector de pestañas para retos con varios ángulos (Triángulo, Secantes, Llano) */}
            {challenge.angles.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                {challenge.angles.map((ang, idx) => {
                  const isCurrent = idx === activeAngleIndex
                  const ans = userAnswers[ang.id]
                  return (
                    <button
                      key={ang.id}
                      onClick={() => {
                        setActiveAngleIndex(idx)
                        setInputVal(userAnswers[ang.id] || '')
                      }}
                      className={`flex-1 py-1 px-1 rounded-lg font-bold text-xs flex flex-col items-center transition-all ${
                        isCurrent
                          ? 'bg-cyan-500 text-black shadow'
                          : ans
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      <span>{ang.label}</span>
                      <span className="text-[9px] font-mono">{ans ? `${ans}°` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input de Medida en Grados y Botón Validar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleValidateActive()
                  }}
                  placeholder="0"
                  className="w-full h-11 px-3 pr-8 rounded-xl bg-black/50 border border-cyan-400/40 text-cyan-300 font-mono font-black text-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-center"
                  autoFocus
                />
                <span className="absolute right-3 top-2.5 font-mono text-cyan-400/60 text-xl font-bold">
                  °
                </span>
              </div>

              <button
                onClick={handleValidateActive}
                className="h-11 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1"
              >
                <span>Validar</span>
              </button>
            </div>

            {/* Teclado numérico táctil para tablet */}
            <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-black/30 border border-white/5 rounded-xl">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'DEL', 'CLR'].map(k => (
                <button
                  key={k}
                  onClick={() => handleKeyPad(k)}
                  className={`h-9 rounded-lg font-mono font-bold text-sm active:scale-90 transition-all ${
                    k === 'DEL' || k === 'CLR'
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-white/5 hover:bg-white/15 text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Ecuación del teorema en tiempo real si hay múltiples ángulos */}
            {challenge.expectedSum && (
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px] font-mono text-white/80">
                <span className="text-white/40">Teorema:</span>
                <span className={allCompleted ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
                  {challenge.angles.map(a => userAnswers[a.id] ? `${userAnswers[a.id]}°` : a.label).join(' + ')}
                  {' = '}
                  {challenge.angles.reduce((acc, a) => acc + (parseFloat(userAnswers[a.id] || '0') || 0), 0)}°
                  {' / '}{challenge.expectedSum}°
                </span>
              </div>
            )}

            {/* Mensaje de feedback pedagógico */}
            {feedback.status !== 'idle' && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                  feedback.status === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                    : feedback.status === 'close'
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200'
                    : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
                }`}
              >
                {feedback.status === 'success' && <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />}
                {feedback.status === 'close' && <Sparkles size={16} className="text-cyan-300 shrink-0" />}
                {feedback.status === 'error' && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
                <span className="leading-tight">{feedback.msg}</span>
              </div>
            )}

            {/* Acciones al pie del modal */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => setShowSolution(s => !s)}
                className="flex-1 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/60 hover:text-white flex items-center justify-center gap-1"
              >
                <Eye size={12} />
                <span>{showSolution ? 'Ocultar real' : 'Ver real'}</span>
              </button>

              {allCompleted ? (
                <button
                  onClick={() => {
                    loadNewChallenge(mode)
                    setShowAnswerModal(false)
                  }}
                  className="flex-1 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-1 shadow active:scale-95 transition-all"
                >
                  <Award size={14} />
                  <span>Siguiente Reto</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAnswerModal(false)}
                  className="flex-1 h-8 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <span>Volver al Lienzo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Ayuda: Cómo usar el transportador ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo medir ángulos con el transportador?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-cyan-500 text-black hover:bg-cyan-400"
      >
        <div key={helpId} className="space-y-2.5 text-white/80 text-xs leading-relaxed pb-2">
          <p>
            El <strong>transportador o goniómetro</strong> mide la abertura entre dos rayos en <strong>grados sexagesimales (°)</strong>.
          </p>

          <ol className="space-y-2 list-decimal list-inside p-2 rounded-xl bg-white/5 border border-white/10">
            <li>
              <strong className="text-emerald-300">Efecto Imán en el Vértice</strong>: Arrastra el centro del transportador cerca del vértice <strong>V</strong>. Sentirás cómo se acopla magnéticamente con un halo verde.
            </li>
            <li>
              <strong className="text-amber-300">Girar sobre el 0°</strong>: Arrastra la manija circular superior hasta que la línea de base de <strong>0°</strong> quede sobre el primer rayo o lado.
            </li>
            <li>
              <strong className="text-cyan-300">Leer la Medida</strong>: Sigue la escala graduada (interior o exterior) que comenzó en 0° y lee el valor donde cruza el segundo rayo.
            </li>
            <li>
              <strong className="text-violet-300">Medir Polígonos Completos</strong>: En triángulos y cuadriláteros, mide todos los ángulos interiores para verificar que suman <strong>180°</strong> o <strong>360°</strong>.
            </li>
          </ol>

          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-[11px] text-cyan-200">
            💡 <em>Consejo de Zoom:</em> Usa 2 dedos en la pantalla táctil o la rueda del ratón. El zoom se acercará con precisión milimétrica al punto donde apuntes.
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
