import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Check,
  ChevronRight,
  TrendingUp,
  Sliders,
  Table,
  Compass,
  CheckCircle2,
  Lightbulb
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'
import { useThemeStore } from '../store/useThemeStore'

// ── Tipos y Modelos ──────────────────────────────────────────────────────────

export interface CoordinatePoint {
  id: number
  x: number
  y: number
  isMystery: boolean
  isPlaced: boolean
  label: string
}

const INITIAL_POINTS: CoordinatePoint[] = [
  { id: 1, x: 0, y: 1, isMystery: false, isPlaced: false, label: '(0, 1)' },
  { id: 2, x: 1, y: 3, isMystery: false, isPlaced: false, label: '(1, 3)' },
  { id: 3, x: 2, y: 5, isMystery: false, isPlaced: false, label: '(2, 5)' },
  { id: 4, x: 3, y: 7, isMystery: false, isPlaced: false, label: '(3, 7)' },
  { id: 5, x: 4, y: 9, isMystery: true, isPlaced: false, label: '(4, 9)' },
  { id: 6, x: 5, y: 11, isMystery: true, isPlaced: false, label: '(5, 11)' }
]

// ── Geometría del Plano Cartesiano SVG ────────────────────────────────────────
const SVG_W = 520
const SVG_H = 460
const PAD_LEFT = 42
const PAD_RIGHT = 20
const PAD_TOP = 20
const PAD_BOTTOM = 34

const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT // 458
const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM // 406

export interface PlaneBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// Cálculo dinámico del encuadre del plano cartesiano según la fase y los valores de m y b
function computeBounds(
  phase: 'table' | 'plane' | 'sliders',
  slopeM: number,
  interceptB: number
): PlaneBounds {
  // En Fase 1 (tabla) y Fase 2 (ubicar puntos en el plano), vista enfocada en el 1er cuadrante
  if (phase !== 'sliders') {
    return { minX: -1, maxX: 6, minY: -1, maxY: 12 }
  }

  // Si estamos exactamente en los valores de la función original
  if (slopeM === 2 && interceptB === 1) {
    return { minX: -1, maxX: 6, minY: -1, maxY: 12 }
  }

  // En Fase 3: la recta se explora dinámicamente con deslizadores.
  // Cuando m < 0 o b < 0, adaptamos los límites automáticamente para que la recta,
  // el punto de corte (0, b) y el cruce con el eje X queden siempre visibles.
  let minX: number
  let maxX: number
  let minY: number
  let maxY: number

  // Rango para X
  if (slopeM < 0) {
    // Pendiente decreciente: abarca de manera armónica los 4 cuadrantes
    minX = -5
    maxX = 5
  } else if (interceptB < 0) {
    // Pendiente positiva con intercepto negativo: cruza el eje X en x > 0
    minX = -3
    maxX = 6
  } else {
    minX = -2
    maxX = 6
  }

  // Rango para Y
  if (interceptB < 0) {
    // Si el intercepto en Y es negativo (b < 0)
    minY = Math.min(-6, interceptB - 3)
    maxY = Math.max(3, minY + 12)
  } else if (interceptB >= 6) {
    // Si el corte en Y es muy alto
    maxY = interceptB + 3
    minY = Math.min(-2, maxY - 13)
  } else if (slopeM < 0) {
    // Pendiente negativa: valores positivos a la izquierda y negativos a la derecha
    minY = Math.min(-5, interceptB - 6)
    maxY = Math.max(5, interceptB + 5)
  } else {
    // Pendiente positiva general
    minY = Math.min(-2, interceptB - 2)
    maxY = Math.max(10, interceptB + 8)
  }

  // Garantizar un rango vertical armónico de 12 a 13 unidades
  if (maxY - minY < 12) {
    maxY = minY + 12
  }

  return { minX, maxX, minY, maxY }
}

// Conversión precisa e inmune al aspect ratio / letterbox del SVG
function getSvgCoordinates(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM()
  if (ctm) {
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * svg.viewBox.baseVal.width,
    y: ((clientY - rect.top) / rect.height) * svg.viewBox.baseVal.height
  }
}

// Función para mezclar aleatoriamente las opciones (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

interface ChoiceOption {
  id: string
  formula: React.ReactNode
  isRight: boolean
}

// Opciones aleatorias para el Bloque 2
const createLogicOptions = (): ChoiceOption[] => [
  {
    id: 'opt1',
    formula: (
      <span>
        2(<span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">2</span>) + 1 ={' '}
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">5</span>
      </span>
    ),
    isRight: true
  },
  {
    id: 'opt2',
    formula: (
      <span>
        2 + 1(<span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">3</span>) ={' '}
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">5</span>
      </span>
    ),
    isRight: false
  },
  {
    id: 'opt3',
    formula: (
      <span>
        (<span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">2</span>) + 3 ={' '}
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">5</span>
      </span>
    ),
    isRight: false
  },
  {
    id: 'opt4',
    formula: (
      <span>
        3(<span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">2</span>) - 1 ={' '}
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">5</span>
      </span>
    ),
    isRight: false
  }
]

// Opciones aleatorias para el Bloque 3
const createFunctionOptions = (): ChoiceOption[] => [
  {
    id: 'fn1',
    formula: (
      <span>
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">y</span>
        {' = 2'}
        <span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">x</span>
        {' + 1'}
      </span>
    ),
    isRight: true
  },
  {
    id: 'fn2',
    formula: (
      <span>
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">y</span>
        {' = '}
        <span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">x</span>
        {' + 2'}
      </span>
    ),
    isRight: false
  },
  {
    id: 'fn3',
    formula: (
      <span>
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">y</span>
        {' = 2'}
        <span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">x</span>
      </span>
    ),
    isRight: false
  },
  {
    id: 'fn4',
    formula: (
      <span>
        <span className="text-amber-500 dark:text-amber-400 font-black text-sm sm:text-base">y</span>
        {' = 3'}
        <span className="text-sky-500 dark:text-cyan-300 font-black text-sm sm:text-base">x</span>
        {' - 1'}
      </span>
    ),
    isRight: false
  }
]

export default function FuncionLinealAfinView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Fases de aprendizaje:
  // 1: 'table' -> Encontrar la función y completar las incógnitas (6, ?) y (10, ?)
  // 2: 'plane' -> Ubicar las coordenadas en el plano cartesiano y trazar la recta
  // 3: 'sliders' -> Exploración dinámica con deslizadores m y b (y = mx + b)
  const [phase, setPhase] = useState<'table' | 'plane' | 'sliders'>('table')

  // Modal de Ayuda
  const [showHelp, setShowHelp] = useState(false)

  // ── Fase 1: Descubrimiento en 3 Bloques ────────────────────────────────────
  // Bloque 1: Tabla (con x = 4, 5 y 19)
  const [mysteryInput4, setMysteryInput4] = useState('')
  const [mysteryInput5, setMysteryInput5] = useState('')
  const [mysteryInput19, setMysteryInput19] = useState('')
  const [mysteryError, setMysteryError] = useState(false)
  const [tableCompleted, setTableCompleted] = useState(false)

  // Bloque 2: Identifica la lógica (orden aleatorio de opciones)
  const [logicOptions, setLogicOptions] = useState<ChoiceOption[]>(() => shuffleArray(createLogicOptions()))
  const [selectedLogicRule, setSelectedLogicRule] = useState<string | null>(null)
  const [logicConfirmed, setLogicConfirmed] = useState(false)
  const [logicError, setLogicError] = useState(false)

  // Bloque 3: Selecciona la función (orden aleatorio de opciones)
  const [functionOptions, setFunctionOptions] = useState<ChoiceOption[]>(() => shuffleArray(createFunctionOptions()))
  const [selectedFunctionOption, setSelectedFunctionOption] = useState<string | null>(null)
  const [functionError, setFunctionError] = useState(false)
  const [functionConfirmed, setFunctionConfirmed] = useState(false)

  // Teclado virtual flotante para la tabla
  type ActiveKbField = 'table4' | 'table5' | 'table19' | null
  const [activeKb, setActiveKb] = useState<ActiveKbField>(null)

  // ── Fase 2: Puntos en el Plano ─────────────────────────────────────────────
  const [points, setPoints] = useState<CoordinatePoint[]>(INITIAL_POINTS)
  const [activePointIdx, setActivePointIdx] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [isLineDrawn, setIsLineDrawn] = useState(false)
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null)
  const [celebrationPulse, setCelebrationPulse] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // ── Fase 3: Deslizadores y Laboratorio Dinámico ─────────────────────────────
  const [slopeM, setSlopeM] = useState<number>(2) // Pendiente m
  const [interceptB, setInterceptB] = useState<number>(1) // Intercepto b (inicia en +1)
  const [showSlopeTriangle, setShowSlopeTriangle] = useState(true)
  const [showBaseLine, setShowBaseLine] = useState(false)
  const [showOriginalPoints, setShowOriginalPoints] = useState(true)

  // Verifica si todos los puntos fueron colocados
  const allPointsPlaced = useMemo(() => points.every((p) => p.isPlaced), [points])

  // Límites dinámicos del plano cartesiano según fase y parámetros m y b
  const bounds = useMemo(() => computeBounds(phase, slopeM, interceptB), [phase, slopeM, interceptB])
  const { minX, maxX, minY, maxY } = bounds

  // Conversión de coordenadas matemáticas a SVG
  const toSvgX = useCallback(
    (x: number) => PAD_LEFT + ((x - minX) / (maxX - minX)) * PLOT_W,
    [minX, maxX]
  )

  const toSvgY = useCallback(
    (y: number) => PAD_TOP + ((maxY - y) / (maxY - minY)) * PLOT_H,
    [minY, maxY]
  )

  const fromSvgCoords = useCallback(
    (svgX: number, svgY: number) => {
      const normX = (svgX - PAD_LEFT) / PLOT_W
      const normY = (svgY - PAD_TOP) / PLOT_H
      const mathX = minX + normX * (maxX - minX)
      const mathY = maxY - normY * (maxY - minY)
      return {
        rawX: mathX,
        rawY: mathY,
        x: Math.round(mathX),
        y: Math.round(mathY)
      }
    },
    [minX, maxX, minY, maxY]
  )

  // ── Fase 3: Puntos enteros de la recta actual (siguen la recta al mover m y b) ──
  const dynamicPoints = useMemo(() => {
    if (phase !== 'sliders') return []
    const pts: { x: number; y: number }[] = []
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const y = slopeM * x + interceptB
      if (y >= bounds.minY && y <= bounds.maxY) {
        if (Number.isInteger(y) || pts.length < 5) {
          pts.push({ x, y })
        }
      }
    }
    return pts
  }, [phase, bounds, slopeM, interceptB])

  // Validación Bloque 1: Tabla (4 -> 9, 5 -> 11, 19 -> 39)
  const handleCheckTable = (in4 = mysteryInput4, in5 = mysteryInput5, in19 = mysteryInput19) => {
    const val4 = parseInt(in4.trim(), 10)
    const val5 = parseInt(in5.trim(), 10)
    const val19 = parseInt(in19.trim(), 10)

    if (val4 === 9 && val5 === 11 && val19 === 39) {
      setMysteryError(false)
      setTableCompleted(true)
      setActiveKb(null)
    } else {
      setMysteryError(true)
    }
  }

  // Validación Bloque 2: Selección de regla lógica
  const handleSelectLogicRule = (ruleId: string, isRight: boolean) => {
    setSelectedLogicRule(ruleId)
    if (isRight) {
      setLogicConfirmed(true)
      setLogicError(false)
    } else {
      setLogicConfirmed(false)
      setLogicError(true)
    }
  }

  // Validación Bloque 3: Selección de función
  const handleSelectFunctionOption = (optId: string, isRight: boolean) => {
    setSelectedFunctionOption(optId)
    if (isRight) {
      setFunctionConfirmed(true)
      setFunctionError(false)
    } else {
      setFunctionConfirmed(false)
      setFunctionError(true)
    }
  }

  // Manejo de teclas del teclado virtual numérico (Tabla)
  const handleVirtualKeyPress = (key: string) => {
    if (!activeKb) return

    if (activeKb === 'table4') {
      if (key === 'CLEAR') setMysteryInput4('')
      else if (key === 'BACKSPACE') setMysteryInput4((prev) => prev.slice(0, -1))
      else if (key === 'NEXT') setActiveKb('table5')
      else if (/^\d$/.test(key)) {
        setMysteryInput4((prev) => (prev.length < 3 ? prev + key : prev))
      }
    } else if (activeKb === 'table5') {
      if (key === 'CLEAR') setMysteryInput5('')
      else if (key === 'BACKSPACE') setMysteryInput5((prev) => prev.slice(0, -1))
      else if (key === 'NEXT') setActiveKb('table19')
      else if (/^\d$/.test(key)) {
        setMysteryInput5((prev) => (prev.length < 3 ? prev + key : prev))
      }
    } else if (activeKb === 'table19') {
      if (key === 'CLEAR') setMysteryInput19('')
      else if (key === 'BACKSPACE') setMysteryInput19((prev) => prev.slice(0, -1))
      else if (key === 'NEXT') {
        handleCheckTable()
      } else if (/^\d$/.test(key)) {
        setMysteryInput19((prev) => (prev.length < 3 ? prev + key : prev))
      }
    }
  }

  // Transición a la Fase 2 (Plano Cartesiano)
  const goToPhase2 = () => {
    setPhase('plane')
    setLastFeedback('Haz clic en el plano para ubicar la primera coordenada: (0, 1).')
  }

  // Lógica de clic / tap en el plano cartesiano (Fase 2)
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== 'plane' || allPointsPlaced) return
    if (!svgRef.current) return

    const coords = getSvgCoordinates(svgRef.current, e.clientX, e.clientY)
    const { rawX, rawY, x, y } = fromSvgCoords(coords.x, coords.y)

    // Coordenada objetivo actual
    const targetPoint = points[activePointIdx]
    if (!targetPoint) return

    // Tolerancia magnética de 0.7 unidades alrededor de la intersección entera
    const isTargetHit =
      Math.abs(rawX - targetPoint.x) <= 0.7 && Math.abs(rawY - targetPoint.y) <= 0.7

    if (isTargetHit) {
      // Punto correcto colocado
      setPoints((prev) =>
        prev.map((pt, idx) => (idx === activePointIdx ? { ...pt, isPlaced: true } : pt))
      )
      setCelebrationPulse(true)
      setTimeout(() => setCelebrationPulse(false), 700)

      if (activePointIdx + 1 < points.length) {
        const nextPt = points[activePointIdx + 1]
        setActivePointIdx((prev) => prev + 1)
        setLastFeedback(`¡Genial! Punto (${targetPoint.x}, ${targetPoint.y}) ubicado. Ahora busca (${nextPt.x}, ${nextPt.y}).`)
      } else {
        // Se colocaron todos los puntos
        setLastFeedback('¡Excelente! Has ubicado todos los puntos. Observa cómo se traza la recta.')
        setIsLineDrawn(true)

        // Luego de 1.8 segundos, avanza automáticamente a la Fase 3 de exploración
        setTimeout(() => {
          setPhase('sliders')
        }, 1800)
      }
    } else {
      // Feedback constructivo
      setLastFeedback(`Marcaste cerca de (${x}, ${y}). Busca con atención (${targetPoint.x}, ${targetPoint.y}).`)
    }
  }

  // Movimiento de cursor sobre el SVG para mostrar coordenadas
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const coords = getSvgCoordinates(svgRef.current, e.clientX, e.clientY)
    const { x, y } = fromSvgCoords(coords.x, coords.y)
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      setHoverCoord({ x, y })
    } else {
      setHoverCoord(null)
    }
  }

  const handleSvgPointerLeave = () => {
    setHoverCoord(null)
  }

  // Si se completan todos los puntos en Fase 2, asegurar que la recta se active
  useEffect(() => {
    if (allPointsPlaced && !isLineDrawn) {
      setIsLineDrawn(true)
    }
  }, [allPointsPlaced, isLineDrawn])

  // Reiniciar actividad
  const handleReset = () => {
    setPhase('table')
    setMysteryInput4('')
    setMysteryInput5('')
    setMysteryInput19('')
    setMysteryError(false)
    setTableCompleted(false)
    setSelectedLogicRule(null)
    setLogicError(false)
    setLogicConfirmed(false)
    setLogicOptions(shuffleArray(createLogicOptions()))
    setSelectedFunctionOption(null)
    setFunctionError(false)
    setFunctionConfirmed(false)
    setFunctionOptions(shuffleArray(createFunctionOptions()))
    setActiveKb(null)
    setPoints(INITIAL_POINTS)
    setActivePointIdx(0)
    setLastFeedback(null)
    setIsLineDrawn(false)
    setSlopeM(2)
    setInterceptB(1)
  }

  // Colores dinámicos del tema
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    subBarBg: isDark ? 'bg-[#0d1424]' : 'bg-slate-100',
    cardBg: isDark ? 'bg-[#11192e]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-800',
    textMuted: isDark ? 'text-white/60' : 'text-slate-500',
    gridLine: isDark ? '#64748b' : '#94a3b8', // Alta visibilidad y nitidez en modo oscuro (#64748b) y claro (#94a3b8)
    gridSubLine: isDark ? '#1e293b' : '#f1f5f9',
    axisLine: isDark ? '#38bdf8' : '#0284c7', // Ejes principales destacados
    axisNumColor: isDark ? '#f8fafc' : '#0f172a', // Números de alta legibilidad
    axisOriginColor: isDark ? '#38bdf8' : '#0369a1',
    svgBg: isDark ? '#080e1e' : '#ffffff',
    pointPlaced: '#38bdf8', // Cyan brillante
    pointPending: isDark ? '#334155' : '#cbd5e1',
    lineColor: '#06b6d4', // Cyan
    sliderLine: '#a855f7' // Morado dinámico
  }

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${c.bg} ${c.text}`}>
      {/* ── 1. Header (36-44px) ────────────────────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${c.headerBg} ${c.cardBorder}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-all active:scale-95 ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <h1 className="text-xs lg:text-sm font-bold tracking-tight truncate flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Función Lineal y Afín</span>
          </h1>
        </div>

        {/* Indicador de Fases / Steps */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setPhase('table')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] lg:text-[11px] font-semibold transition-all ${
              phase === 'table'
                ? 'bg-cyan-500 text-white shadow-sm'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Table className="h-3 w-3" />
            <span>1. Tabla</span>
            {functionConfirmed && <Check className="h-2.5 w-2.5 text-emerald-400" />}
          </button>

          <ChevronRight className={`h-3 w-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />

          <button
            onClick={() => functionConfirmed && setPhase('plane')}
            disabled={!functionConfirmed}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] lg:text-[11px] font-semibold transition-all ${
              phase === 'plane'
                ? 'bg-cyan-500 text-white shadow-sm'
                : !functionConfirmed
                ? isDark
                  ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/40'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Compass className="h-3 w-3" />
            <span>2. Plano</span>
            {allPointsPlaced && <Check className="h-2.5 w-2.5 text-emerald-400" />}
          </button>

          <ChevronRight className={`h-3 w-3 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />

          <button
            onClick={() => allPointsPlaced && setPhase('sliders')}
            disabled={!allPointsPlaced}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] lg:text-[11px] font-semibold transition-all ${
              phase === 'sliders'
                ? 'bg-purple-500 text-white shadow-sm'
                : !allPointsPlaced
                ? isDark
                  ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/40'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Sliders className="h-3 w-3" />
            <span>3. y = mx + b</span>
          </button>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all active:scale-95 ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Reiniciar actividad"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all"
            title="Guía y Ayuda Pedagógica"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── 2. Área de Trabajo Principal (flex-1 min-h-0) ───────────────────────── */}
      {phase === 'table' ? (
        /* ══════════════════════════════════════════════════════════════════════════
           FASE 1: Situación y Actividades de Descubrimiento (Dos Columnas)
        ══════════════════════════════════════════════════════════════════════════ */
        <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch overflow-hidden p-2 sm:p-3 lg:p-4 gap-2.5 sm:gap-3.5">
          {/* ── Columna Izquierda: Situación ───────────────────────────────────── */}
          <div
            className={`w-full md:w-[42%] lg:w-[40%] shrink-0 flex flex-col justify-between rounded-xl border p-3.5 sm:p-4 lg:p-5 overflow-y-auto ${c.cardBg} ${c.cardBorder} shadow-sm`}
          >
            <div className="flex flex-col gap-3 sm:gap-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Situación
                </span>
                <h2 className={`text-sm sm:text-base font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Alquiler de bicicletas en un parque
                </h2>
                <p className={`text-xs mt-1 leading-relaxed ${c.textMuted}`}>
                  En un parque de la ciudad se ofrece el servicio de alquiler de bicicletas para recreación y transporte.
                </p>
              </div>

              {/* Tarifas */}
              <div className={`rounded-lg border p-3 flex flex-col gap-1.5 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                  Tarifas del servicio:
                </span>
                <ul className="text-xs space-y-1">
                  <li className="flex items-center justify-between">
                    <span className={c.textMuted}>Costo inicial:</span>
                    <strong className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>S/ 1,00</strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className={c.textMuted}>Costo por cada hora:</span>
                    <strong className={`font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>S/ 2,00</strong>
                  </li>
                </ul>
              </div>

              {/* Pregunta Central */}
              <div className={`rounded-lg border p-3 ${isDark ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-cyan-400/50 bg-cyan-50 text-cyan-900'}`}>
                <p className="text-xs sm:text-[13px] font-bold leading-snug">
                  «¿Cómo varía el costo del alquiler según las horas de uso?»
                </p>
              </div>

              {/* Variables */}
              <div className={`rounded-lg border p-3 flex flex-col gap-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                  Variables:
                </span>
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-500 dark:text-cyan-300">
                      x
                    </span>
                    <span className={`font-sans ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                      : horas de uso
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500 dark:text-amber-400">
                      y
                    </span>
                    <span className={`font-sans ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                      : costo total en soles
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Columna Derecha: Actividades de descubrimiento ─────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5 sm:gap-3 overflow-y-auto pr-0.5">
            {/* ══ Bloque 1. Completa la tabla ═══════════════════════════════════ */}
            <div
              className={`rounded-xl border p-3 sm:p-3.5 ${c.cardBg} ${c.cardBorder} shadow-sm transition-all`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <span className="text-xs sm:text-sm font-bold text-cyan-400 flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5" />
                  Bloque 1. Completa la tabla
                </span>
                {tableCompleted && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    <Check className="h-3 w-3" />
                    Completado
                  </span>
                )}
              </div>

              {/* Tabla horizontal */}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-center text-xs border-collapse">
                  <tbody>
                    {/* Fila Horas (x) */}
                    <tr className={isDark ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                      <td className="py-2 px-2.5 font-bold text-left text-xs whitespace-nowrap">
                        <span className="font-bold text-sky-500 dark:text-cyan-300">Horas (x)</span>
                      </td>
                      {[0, 1, 2, 3, 4, 5].map((num) => (
                        <td key={num} className="py-2 px-1.5 sm:px-2 font-mono font-bold text-xs text-sky-500 dark:text-cyan-300">
                          {num}
                        </td>
                      ))}
                      <td className="py-2 px-2 sm:px-2.5 font-mono font-bold text-xs text-sky-500 dark:text-cyan-300 border-l border-white/10">
                        19
                      </td>
                    </tr>

                    {/* Fila Costo (y) */}
                    <tr className={isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}>
                      <td className="py-2 px-2.5 font-bold text-left text-xs whitespace-nowrap">
                        <span className="font-bold text-amber-500 dark:text-amber-400">Costo (y)</span>
                      </td>
                      {[1, 3, 5, 7].map((num) => (
                        <td key={num} className="py-2 px-1.5 sm:px-2 font-mono font-bold text-xs text-amber-500 dark:text-amber-400">
                          {num}
                        </td>
                      ))}

                      {/* Campo interactivo para x = 4 con Teclado Virtual */}
                      <td className="py-1.5 px-1">
                        <input
                          type="text"
                          inputMode="none"
                          readOnly
                          placeholder="?"
                          value={mysteryInput4}
                          onClick={() => !tableCompleted && setActiveKb('table4')}
                          className={`w-9 sm:w-11 h-7 text-center rounded-md font-mono font-bold text-xs border cursor-pointer transition-all ${
                            tableCompleted
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : activeKb === 'table4'
                              ? 'border-cyan-400 bg-cyan-500/30 text-white ring-2 ring-cyan-400/50'
                              : mysteryError
                              ? 'border-red-500 bg-red-500/20 text-red-300'
                              : isDark
                              ? 'border-amber-400/40 bg-black/40 text-amber-300 hover:border-amber-400'
                              : 'border-slate-300 bg-white text-slate-800 hover:border-cyan-500'
                          }`}
                        />
                      </td>

                      {/* Campo interactivo para x = 5 con Teclado Virtual */}
                      <td className="py-1.5 px-1">
                        <input
                          type="text"
                          inputMode="none"
                          readOnly
                          placeholder="?"
                          value={mysteryInput5}
                          onClick={() => !tableCompleted && setActiveKb('table5')}
                          className={`w-9 sm:w-11 h-7 text-center rounded-md font-mono font-bold text-xs border cursor-pointer transition-all ${
                            tableCompleted
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : activeKb === 'table5'
                              ? 'border-cyan-400 bg-cyan-500/30 text-white ring-2 ring-cyan-400/50'
                              : mysteryError
                              ? 'border-red-500 bg-red-500/20 text-red-300'
                              : isDark
                              ? 'border-amber-400/40 bg-black/40 text-amber-300 hover:border-amber-400'
                              : 'border-slate-300 bg-white text-slate-800 hover:border-cyan-500'
                          }`}
                        />
                      </td>

                      {/* Campo interactivo para x = 19 con Teclado Virtual */}
                      <td className="py-1.5 px-1 border-l border-white/10">
                        <input
                          type="text"
                          inputMode="none"
                          readOnly
                          placeholder="?"
                          value={mysteryInput19}
                          onClick={() => !tableCompleted && setActiveKb('table19')}
                          className={`w-10 sm:w-12 h-7 text-center rounded-md font-mono font-bold text-xs border cursor-pointer transition-all ${
                            tableCompleted
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : activeKb === 'table19'
                              ? 'border-cyan-400 bg-cyan-500/30 text-white ring-2 ring-cyan-400/50'
                              : mysteryError
                              ? 'border-red-500 bg-red-500/20 text-red-300'
                              : isDark
                              ? 'border-amber-400/40 bg-black/40 text-amber-300 hover:border-amber-400'
                              : 'border-slate-300 bg-white text-slate-800 hover:border-cyan-500'
                          }`}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!tableCompleted ? (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCheckTable()}
                      className="h-7 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition-all active:scale-95 shadow-sm"
                    >
                      Comprobar tabla
                    </button>
                    <span className={`text-[10px] ${c.textMuted}`}>
                      (Toca una casilla para abrir el teclado virtual)
                    </span>
                  </div>
                  {mysteryError && (
                    <span className="text-[11px] text-red-400 font-medium">
                      Revisa los valores: para 4, 5 y 19 horas.
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 text-[10px] text-cyan-300/80 font-mono">
                  * El valor de x = 19 (y = 39) demuestra la regla general; no se grafica en el plano cartesiano.
                </div>
              )}
            </div>

            {/* ══ Bloque 2. Identifica la lógica (sin x ni y, con color para los números) ══ */}
            <div
              className={`rounded-xl border p-3 sm:p-3.5 ${c.cardBg} ${c.cardBorder} shadow-sm transition-all ${
                !tableCompleted ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <span className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Bloque 2. Identifica la lógica
                </span>
                {logicConfirmed && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    <Check className="h-3 w-3" />
                    Identificada
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                Observa cómo se transforma cada valor de{' '}
                <span className="font-bold text-sky-500 dark:text-cyan-300">
                  Horas
                </span>{' '}
                en su respectivo valor de{' '}
                <span className="font-bold text-amber-500 dark:text-amber-400">
                  Costo
                </span>{' '}
                en la tabla. ¿Cuál de las siguientes relaciones describe la regla correcta?
              </p>

              {/* Opciones con color para los números (sin texto descriptivo, orden aleatorio) */}
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {logicOptions.map((opt) => {
                  const isSelected = selectedLogicRule === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={logicConfirmed}
                      onClick={() => handleSelectLogicRule(opt.id, opt.isRight)}
                      className={`h-10 sm:h-11 px-3 rounded-lg border text-center flex items-center justify-center gap-2 font-mono transition-all active:scale-95 ${
                        isSelected
                          ? opt.isRight
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40'
                            : 'border-red-500 bg-red-500/20 text-red-300 ring-2 ring-red-500/40'
                          : isDark
                          ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{opt.formula}</div>
                      {isSelected && opt.isRight && (
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {logicError && (
                <p className="mt-2 text-[11px] text-red-400">
                  Esa regla no coincide con los demás pares de la tabla. ¡Revisa cómo se obtiene 3, 5, 7 y 39!
                </p>
              )}

              {logicConfirmed && (
                <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    ¡Excelente! La lógica es: <strong>multiplicar las horas por 2 y sumarle 1</strong> para obtener el costo.
                  </span>
                </div>
              )}
            </div>

            {/* ══ Bloque 3. Descubre la función (con opciones: x entrada, y salida) ══ */}
            <div
              className={`rounded-xl border p-3 sm:p-3.5 ${c.cardBg} ${c.cardBorder} shadow-sm transition-all ${
                !logicConfirmed ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <span className="text-xs sm:text-sm font-bold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Bloque 3. Descubre la función
                </span>
                {functionConfirmed && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    <Check className="h-3 w-3" />
                    Función descubierta
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                Con la lógica encontrada, ¿cuál de las siguientes funciones relaciona el costo (<span className="font-bold text-amber-500 dark:text-amber-400">y</span>) con las horas de uso (<span className="font-bold text-sky-500 dark:text-cyan-300">x</span>)?
              </p>

              {/* Opciones con color para x e y (sin texto descriptivo, orden aleatorio) */}
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {functionOptions.map((opt) => {
                  const isSelected = selectedFunctionOption === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={functionConfirmed}
                      onClick={() => handleSelectFunctionOption(opt.id, opt.isRight)}
                      className={`h-10 sm:h-11 px-3 rounded-lg border text-center flex items-center justify-center gap-2 font-mono transition-all active:scale-95 ${
                        isSelected
                          ? opt.isRight
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40'
                            : 'border-red-500 bg-red-500/20 text-red-300 ring-2 ring-red-500/40'
                          : isDark
                          ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{opt.formula}</div>
                      {isSelected && opt.isRight && (
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {functionError && (
                <p className="mt-2 text-[11px] text-red-400">
                  Esa función no corresponde con la regla identificada. Recuerda: multiplicar las horas (x) por 2 y sumarle 1 de costo inicial.
                </p>
              )}

              {functionConfirmed && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>¡Excelente! Has encontrado la función: <strong>y = 2x + 1</strong></span>
                  </div>
                  <button
                    onClick={goToPhase2}
                    className="h-8 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                  >
                    <span>Continuar al Plano Cartesiano</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════
           FASE 2 Y 3: Panel de Control a la Izquierda y Plano a la Derecha
        ══════════════════════════════════════════════════════════════════════════ */
        <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch overflow-hidden p-1.5 sm:p-2 lg:p-3 gap-2">
          {/* PANEL IZQUIERDO: Depende de la Fase (Coordenadas en Fase 2 o Deslizadores en Fase 3) */}
          <aside
            className={`w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col justify-between rounded-xl border p-2 lg:p-3 overflow-y-auto ${c.cardBg} ${c.cardBorder}`}
          >
            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* FASE 2: Lista de Coordenadas para Ubicar en el Plano                  */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {phase === 'plane' && (
              <div className="flex flex-col gap-2 flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5" />
                      Paso 2: Ubica las Coordenadas
                    </span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
                      Fase 2 de 3
                    </span>
                  </div>

                  <p className={`mt-1.5 text-[11px] ${c.textMuted}`}>
                    Toca la intersección correcta en el plano para cada punto de la tabla:
                  </p>

                  {lastFeedback && (
                    <div className="mt-1.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 p-1.5 rounded font-medium text-center">
                      {lastFeedback}
                    </div>
                  )}

                  {/* Tarjetas de Coordenadas */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {points.map((pt, idx) => {
                      const isCurrent = idx === activePointIdx && !pt.isPlaced
                      return (
                        <div
                          key={pt.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            pt.isPlaced
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : isCurrent
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-2 ring-cyan-500/40 animate-pulse'
                              : 'border-white/10 bg-white/5 text-white/50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold">{pt.label}</span>
                            <span className="text-[9px] text-white/50">
                              x={pt.x}, y={pt.y}
                            </span>
                          </div>
                          {pt.isPlaced ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <span className="text-[9px] bg-cyan-400 text-black px-1.5 py-0.5 rounded font-bold">
                              Tocar
                            </span>
                          ) : (
                            <span className="text-[9px] text-white/30">Pendiente</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Banner de Trazado de Recta */}
                  {isLineDrawn && (
                    <div className="mt-3 rounded-lg bg-cyan-950/60 border border-cyan-500/30 p-2 text-[11px] text-cyan-200">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span>¡Puntos alineados en una sola recta!</span>
                      </div>
                      <p className={`text-[10px] ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                        Como la razón de cambio es constante (aumenta 2 en Y por cada 1 en X: Δy/Δx = 2), todos los puntos quedan alineados en una sola <strong>recta</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Botón para pasar a Fase 3 */}
                <div className="pt-2 border-t border-white/10">
                  {allPointsPlaced ? (
                    <button
                      onClick={() => setPhase('sliders')}
                      className="w-full h-8 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                    >
                      <span>Explorar y = mx + b con Deslizadores</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="text-[10px] text-cyan-300 bg-cyan-950/30 border border-cyan-500/20 p-1.5 rounded text-center">
                      Ubica todos los puntos en el plano cartesiano.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* FASE 3: Laboratorio Dinámico con Deslizadores m y b                   */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {phase === 'sliders' && (
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-0.5">
                {/* Ecuación General destacada */}
                <div className={`rounded-lg border p-2.5 text-center ${
                  isDark ? 'bg-purple-950/40 border-purple-500/30' : 'bg-purple-50 border-purple-200'
                }`}>
                  <span className={`text-[10px] block uppercase font-bold tracking-wider ${
                    isDark ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    Ecuación de la Función
                  </span>

                  {/* Modelo general y = mx + b */}
                  <div className={`font-mono text-base font-bold tracking-wider mt-0.5 ${
                    isDark ? 'text-purple-200' : 'text-purple-900'
                  }`}>
                    y = <span className="text-cyan-500">m</span>x + <span className="text-amber-500">b</span>
                  </div>

                  {/* Ecuación evaluada con valores actuales */}
                  <div className="mt-1 pt-1 border-t border-purple-500/20 font-mono text-base sm:text-lg font-bold tracking-wide">
                    {slopeM === 0 ? (
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>
                        y = <span className="text-amber-500">{interceptB}</span>
                        <span className="text-[11px] text-amber-500/90 ml-2 font-normal font-sans">(Constante)</span>
                      </span>
                    ) : (
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>
                        y = <span className="text-cyan-500">{slopeM === 1 ? '' : slopeM === -1 ? '-' : slopeM}</span>x{' '}
                        <span className="text-amber-500">
                          {interceptB > 0 ? `+ ${interceptB}` : interceptB < 0 ? `- ${Math.abs(interceptB)}` : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className={`mt-1 flex items-center justify-center gap-2 text-[10px] ${
                    isDark ? 'text-white/70' : 'text-slate-600'
                  }`}>
                    <span className="text-cyan-500 font-semibold font-mono">
                      m = {slopeM} {slopeM === 0 ? '(horizontal)' : '(pendiente)'}
                    </span>
                    <span className="text-purple-400/40">•</span>
                    <span className="text-amber-500 font-semibold font-mono">
                      b = {interceptB} (corte Y)
                    </span>
                  </div>
                </div>

                  {/* Control 1: Deslizador de Pendiente (m) - Solo deslizador */}
                  <div className={`mt-2.5 rounded-lg border p-2.5 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-500">Pendiente (m):</span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-white' : 'bg-cyan-100 text-cyan-900 border border-cyan-200'}`}>
                        {slopeM}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="range"
                        min="-4"
                        max="4"
                        step="0.5"
                        value={slopeM}
                        onChange={(e) => setSlopeM(parseFloat(e.target.value))}
                        className={`w-full accent-cyan-400 cursor-pointer h-2 rounded-lg ${
                          isDark ? 'bg-white/20' : 'bg-slate-200'
                        }`}
                      />
                    </div>
                    <div className={`mt-1.5 text-[9px] flex justify-between ${isDark ? 'text-white/50' : 'text-slate-500 font-medium'}`}>
                      <span>-4 (Muy decreciente)</span>
                      <span>0 (Horizontal)</span>
                      <span>+4 (Muy creciente)</span>
                    </div>
                  </div>

                  {/* Control 2: Deslizador de Intercepto (b) - Solo deslizador */}
                  <div className={`mt-2 rounded-lg border p-2.5 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-500">Intercepto (b):</span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-200'}`}>
                        {interceptB}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="1"
                        value={interceptB}
                        onChange={(e) => setInterceptB(parseInt(e.target.value, 10))}
                        className={`w-full accent-amber-400 cursor-pointer h-2 rounded-lg ${
                          isDark ? 'bg-white/20' : 'bg-slate-200'
                        }`}
                      />
                    </div>
                    <div className={`mt-1.5 text-[9px] flex justify-between ${isDark ? 'text-white/50' : 'text-slate-500 font-medium'}`}>
                      <span>-5 (Baja 5 unidades)</span>
                      <span>b=0 (Pasa por el origen)</span>
                      <span>+5 (Sube 5 unidades)</span>
                    </div>
                  </div>

                  {/* Comparaciones Rápidas (Pedagógicas) */}
                  <div className="mt-2">
                    <span className="text-[10px] font-semibold text-white/60 block mb-1">
                      Prueba estos casos clave:
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <button
                        onClick={() => {
                          setSlopeM(2)
                          setInterceptB(1)
                        }}
                        className="p-1 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-mono text-left truncate"
                      >
                        📌 y = 2x + 1 (Nuestra función)
                      </button>
                      <button
                        onClick={() => {
                          setSlopeM(0)
                          setInterceptB(1)
                        }}
                        className="p-1 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-mono text-left truncate"
                      >
                        ➖ y = 1 (Constante, m=0)
                      </button>
                      <button
                        onClick={() => {
                          setSlopeM(2)
                          setInterceptB(0)
                        }}
                        className="p-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-mono text-left truncate"
                      >
                        ⚡ y = 2x (Lineal pura, b=0)
                      </button>
                      <button
                        onClick={() => {
                          setSlopeM(-2)
                          setInterceptB(4)
                        }}
                        className="p-1 rounded border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 font-mono text-left truncate"
                      >
                        📉 y = -2x + 4 (Decreciente)
                      </button>
                    </div>
                  </div>

                  {/* Opciones visuales auxiliares */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <label className="flex items-center gap-1 cursor-pointer text-white/70">
                      <input
                        type="checkbox"
                        checked={showSlopeTriangle}
                        onChange={(e) => setShowSlopeTriangle(e.target.checked)}
                        className="accent-cyan-400 rounded"
                      />
                      <span>Triángulo m (Δx/Δy)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-white/70">
                      <input
                        type="checkbox"
                        checked={showBaseLine}
                        onChange={(e) => setShowBaseLine(e.target.checked)}
                        className="accent-emerald-400 rounded"
                      />
                      <span>Ver recta y = mx</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-white/70">
                      <input
                        type="checkbox"
                        checked={showOriginalPoints}
                        onChange={(e) => setShowOriginalPoints(e.target.checked)}
                        className="accent-cyan-400 rounded"
                      />
                      <span>Ver puntos (x, y) de la recta</span>
                    </label>
                  </div>
              </div>
            )}
          </aside>

          {/* PANEL DERECHO: Plano Cartesiano Interactivo (flex-1) */}
          <div
            className={`flex-1 min-w-0 flex flex-col items-center justify-between rounded-xl border p-2 relative ${c.cardBg} ${c.cardBorder}`}
          >
            {/* Header del Plano con altura fija para evitar saltos de layout */}
            <div className="w-full h-8 shrink-0 flex items-center justify-between px-2.5 border-b border-white/5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>Plano Cartesiano</span>
                <span className={`font-mono text-[10px] ${c.textMuted}`}>
                  X: [{minX} a {maxX}] │ Y: [{minY} a {maxY}]
                </span>
              </div>

              {/* Contenedor de ancho y alto fijos para evitar que el plano o el contenedor salte */}
              <div className="h-6 min-w-[125px] flex items-center justify-end">
                <div
                  className={`flex items-center gap-1 font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded transition-opacity duration-150 ${
                    hoverCoord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <span>Puntero:</span>
                  <span className="font-bold text-white">
                    ({hoverCoord?.x ?? 0}, {hoverCoord?.y ?? 0})
                  </span>
                </div>
              </div>
            </div>

            {/* Contenedor del SVG del Plano */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-1">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className={`w-full h-full max-h-[min(65vh,520px)] lg:max-h-[min(72vh,580px)] touch-none cursor-crosshair drop-shadow-md rounded-lg transition-all duration-300 ${
                  celebrationPulse ? 'ring-2 ring-cyan-400' : ''
                }`}
                style={{ backgroundColor: c.svgBg }}
                onPointerDown={handleSvgPointerDown}
                onPointerMove={handleSvgPointerMove}
                onPointerLeave={handleSvgPointerLeave}
              >
                <defs>
                  <pattern id="gridSub" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M 10 0 L 0 0 0 10"
                      fill="none"
                      stroke={c.gridSubLine}
                      strokeWidth="0.6"
                    />
                  </pattern>
                  <clipPath id="plotArea">
                    <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
                  </clipPath>
                  <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Fondo con rejilla suave */}
                <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#gridSub)" />

                {/* Cuadrícula Principal - Líneas Verticales (Eje X) */}
                {Array.from({ length: maxX - minX + 1 }).map((_, i) => {
                  const xVal = minX + i
                  const svgX = toSvgX(xVal)
                  const isOrigin = xVal === 0
                  return (
                    <g key={`x-line-${xVal}`}>
                      <line
                        x1={svgX}
                        y1={PAD_TOP}
                        x2={svgX}
                        y2={PAD_TOP + PLOT_H}
                        stroke={isOrigin ? c.axisLine : c.gridLine}
                        strokeWidth={isOrigin ? 2.5 : 1.2}
                        strokeDasharray={isOrigin ? undefined : '3,3'}
                      />
                      {/* Etiquetas eje X con números grandes y nítidos para tablets */}
                      <text
                        x={svgX}
                        y={PAD_TOP + PLOT_H + 20}
                        textAnchor="middle"
                        fontSize="12"
                        fontFamily="JetBrains Mono, monospace"
                        fill={isOrigin ? c.axisOriginColor : c.axisNumColor}
                        fontWeight="bold"
                      >
                        {xVal}
                      </text>
                    </g>
                  )
                })}

                {/* Cuadrícula Principal - Líneas Horizontales (Eje Y) */}
                {Array.from({ length: maxY - minY + 1 }).map((_, i) => {
                  const yVal = minY + i
                  const svgY = toSvgY(yVal)
                  const isOrigin = yVal === 0
                  return (
                    <g key={`y-line-${yVal}`}>
                      <line
                        x1={PAD_LEFT}
                        y1={svgY}
                        x2={PAD_LEFT + PLOT_W}
                        y2={svgY}
                        stroke={isOrigin ? c.axisLine : c.gridLine}
                        strokeWidth={isOrigin ? 2.5 : 1.2}
                        strokeDasharray={isOrigin ? undefined : '3,3'}
                      />
                      {/* Etiquetas eje Y con números grandes y nítidos para tablets */}
                      <text
                        x={PAD_LEFT - 8}
                        y={svgY + 4}
                        textAnchor="end"
                        fontSize="12"
                        fontFamily="JetBrains Mono, monospace"
                        fill={isOrigin ? c.axisOriginColor : c.axisNumColor}
                        fontWeight="bold"
                      >
                        {yVal}
                      </text>
                    </g>
                  )
                })}

                {/* Título de los ejes */}
                <text
                  x={PAD_LEFT + PLOT_W + 8}
                  y={toSvgY(0) + 5}
                  fontSize="13"
                  fontWeight="bold"
                  fill={c.axisLine}
                  fontFamily="Nunito, sans-serif"
                >
                  X
                </text>
                <text
                  x={toSvgX(0)}
                  y={PAD_TOP - 8}
                  fontSize="13"
                  fontWeight="bold"
                  fill={c.axisLine}
                  textAnchor="middle"
                  fontFamily="Nunito, sans-serif"
                >
                  Y
                </text>

                {/* ── Fase 3: Recta Base Lineal de Referencia y = mx (pasa por el origen) ── */}
                {phase === 'sliders' && showBaseLine && interceptB !== 0 && (
                  <g opacity="0.6" clipPath="url(#plotArea)">
                    <line
                      x1={toSvgX(minX - 2)}
                      y1={toSvgY(slopeM * (minX - 2))}
                      x2={toSvgX(maxX + 2)}
                      y2={toSvgY(slopeM * (maxX + 2))}
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                    />
                    <text
                      x={toSvgX(Math.max(minX + 1, Math.min(maxX - 1, 2)))}
                      y={toSvgY(slopeM * Math.max(minX + 1, Math.min(maxX - 1, 2))) - 6}
                      fill="#10b981"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      y = {slopeM === 1 ? '' : slopeM === -1 ? '-' : slopeM}x (Lineal base)
                    </text>
                  </g>
                )}

                {/* ── Fase 3: Triángulo de Pendiente (Δx, Δy) ── */}
                {phase === 'sliders' && showSlopeTriangle && (
                  <g clipPath="url(#plotArea)">
                    {(() => {
                      let triX = 0
                      if (slopeM < 0 && interceptB < 0) {
                        triX = Math.max(minX + 1, -2)
                      } else if (slopeM < 0) {
                        triX = Math.max(minX + 1, 0)
                      } else if (interceptB < 0) {
                        triX = Math.min(maxX - 2, 1)
                      } else {
                        triX = Math.max(minX + 1, Math.min(maxX - 2, 1))
                      }

                      const triY = slopeM * triX + interceptB
                      const nextX = triX + 1
                      const nextY = slopeM * nextX + interceptB

                      const x1 = toSvgX(triX)
                      const y1 = toSvgY(triY)
                      const x2 = toSvgX(nextX)
                      const y2 = toSvgY(nextY)

                      // Triángulo: (x1, y1) -> (x2, y1) [Δx=1] -> (x2, y2) [Δy=m]
                      return (
                        <g>
                          {/* Relleno translúcido del triángulo */}
                          <polygon
                            points={`${x1},${y1} ${x2},${y1} ${x2},${y2}`}
                            fill={slopeM >= 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                            stroke="none"
                          />
                          {/* Base horizontal Δx = 1 */}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y1}
                            stroke="#38bdf8"
                            strokeWidth="2"
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={y1 + (slopeM >= 0 ? 14 : -6)}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#38bdf8"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            Δx = 1
                          </text>

                          {/* Altura vertical Δy = m */}
                          <line
                            x1={x2}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#a855f7"
                            strokeWidth="2"
                          />
                          <text
                            x={x2 + 8}
                            y={(y1 + y2) / 2 + 3}
                            textAnchor="start"
                            fontSize="9"
                            fill="#a855f7"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            Δy = {slopeM}
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                )}

                {/* ── Fase 2: Recta trazada por los puntos una vez completados ── */}
                {isLineDrawn && phase === 'plane' && (
                  <g clipPath="url(#plotArea)">
                    {/* Brillo de fondo */}
                    <line
                      x1={toSvgX(-0.8)}
                      y1={toSvgY(2 * -0.8 + 1)}
                      x2={toSvgX(5.4)}
                      y2={toSvgY(2 * 5.4 + 1)}
                      stroke="#06b6d4"
                      strokeWidth="8"
                      strokeLinecap="round"
                      opacity="0.3"
                    />
                    {/* Recta continua que se extiende un poco más allá de los extremos */}
                    <line
                      x1={toSvgX(-0.8)}
                      y1={toSvgY(2 * -0.8 + 1)}
                      x2={toSvgX(5.4)}
                      y2={toSvgY(2 * 5.4 + 1)}
                      stroke="#22d3ee"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Etiqueta de la recta */}
                    <text
                      x={toSvgX(2.2)}
                      y={toSvgY(2 * 2.2 + 1) - 10}
                      fill="#22d3ee"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      y = 2x + 1
                    </text>
                  </g>
                )}

                {/* ── Fase 3: Recta Dinámica según Deslizadores m y b ── */}
                {phase === 'sliders' && (
                  <g clipPath="url(#plotArea)">
                    {/* Brillo de fondo seguro (no desaparece cuando m = 0) */}
                    <line
                      x1={toSvgX(minX - 2)}
                      y1={toSvgY(slopeM * (minX - 2) + interceptB)}
                      x2={toSvgX(maxX + 2)}
                      y2={toSvgY(slopeM * (maxX + 2) + interceptB)}
                      stroke="#a855f7"
                      strokeWidth="8"
                      strokeLinecap="round"
                      opacity="0.3"
                    />

                    {/* Recta calculada con slopeM e interceptB */}
                    <line
                      x1={toSvgX(minX - 2)}
                      y1={toSvgY(slopeM * (minX - 2) + interceptB)}
                      x2={toSvgX(maxX + 2)}
                      y2={toSvgY(slopeM * (maxX + 2) + interceptB)}
                      stroke="#c084fc"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Etiqueta flotante sobre la recta */}
                    {(() => {
                      let labelX = slopeM === 0 ? Math.round((minX + maxX) / 2) : 1
                      let labelY = slopeM * labelX + interceptB
                      if (labelY < minY + 1 || labelY > maxY - 1) {
                        labelX = slopeM < 0 ? Math.round(minX / 2) : Math.round(maxX / 2)
                        labelY = slopeM * labelX + interceptB
                      }
                      const clampedX = Math.max(minX + 1, Math.min(maxX - 1, labelX))
                      const clampedY = slopeM * clampedX + interceptB

                      return (
                        <text
                          x={toSvgX(clampedX)}
                          y={toSvgY(clampedY) - 10}
                          fill="#e9d5ff"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                          textAnchor="middle"
                        >
                          {slopeM === 0
                            ? `y = ${interceptB} (constante)`
                            : `y = ${slopeM === 1 ? '' : slopeM === -1 ? '-' : slopeM}x ${
                                interceptB > 0 ? `+ ${interceptB}` : interceptB < 0 ? `- ${Math.abs(interceptB)}` : ''
                              }`}
                        </text>
                      )
                    })()}

                    {/* Punto Intercepto (0, b) destacado */}
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(interceptB)}
                      r="6"
                      fill="#fbbf24"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={toSvgX(0) - 10}
                      y={toSvgY(interceptB) - 8}
                      textAnchor="end"
                      fill="#fbbf24"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      (0, {interceptB}) corte Y
                    </text>
                  </g>
                )}

                {/* ── Fase 3: Puntos de la Recta Actual (dinámicos según m y b) ── */}
                {phase === 'sliders' && showOriginalPoints && (
                  <g>
                    {dynamicPoints.map((pt) => {
                      // El punto (0, b) ya se destaca en oro arriba
                      if (pt.x === 0) return null
                      const ptSvgX = toSvgX(pt.x)
                      const ptSvgY = toSvgY(pt.y)

                      return (
                        <g key={`dyn-pt-${pt.x}-${pt.y}`}>
                          <circle
                            cx={ptSvgX}
                            cy={ptSvgY}
                            r="5"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            filter="url(#glowCyan)"
                          />
                          <text
                            x={ptSvgX + 7}
                            y={ptSvgY - 6}
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono, monospace"
                            fill={isDark ? '#e2e8f0' : '#1e293b'}
                          >
                            ({pt.x}, {pt.y})
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )}

                {/* ── Fase 2: Puntos de la tabla ubicados por el usuario (sin puntos guía previos) ── */}
                {phase === 'plane' &&
                  points
                    .filter((pt) => pt.isPlaced)
                    .map((pt) => {
                      const svgPtX = toSvgX(pt.x)
                      const svgPtY = toSvgY(pt.y)

                      return (
                        <g key={pt.id}>
                          <circle
                            cx={svgPtX}
                            cy={svgPtY}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="2"
                            filter="url(#glowCyan)"
                          />
                          <text
                            x={svgPtX + 8}
                            y={svgPtY - 6}
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono, monospace"
                            fill={isDark ? '#e2e8f0' : '#1e293b'}
                          >
                            ({pt.x}, {pt.y})
                          </text>
                        </g>
                      )
                    })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Teclado Virtual Flotante (Popover Global) ── */}
      {activeKb && (
        <>
          {/* Backdrop invisible para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setActiveKb(null)}
          />

          <div
            className={`fixed z-50 left-1/2 bottom-2 sm:bottom-4 -translate-x-1/2 w-[310px] sm:w-[350px] rounded-2xl border shadow-2xl p-3 select-none transition-all ${
              isDark
                ? 'bg-[#0f172a] border-cyan-500/40 text-white'
                : 'bg-white border-slate-300 text-slate-800 shadow-2xl'
            }`}
          >
            {/* Header del Teclado Virtual con Selector de Campo y Botón Cerrar */}
            <div className={`flex items-center justify-between pb-2 border-b mb-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-cyan-400 font-bold mr-1">Completar:</span>
                <button
                  type="button"
                  onClick={() => setActiveKb('table4')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    activeKb === 'table4'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  x = 4
                </button>
                <button
                  type="button"
                  onClick={() => setActiveKb('table5')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    activeKb === 'table5'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  x = 5
                </button>
                <button
                  type="button"
                  onClick={() => setActiveKb('table19')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    activeKb === 'table19'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  x = 19
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveKb(null)}
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Cerrar teclado"
              >
                ✕
              </button>
            </div>

            {/* Display de Vista Previa */}
            <div
              className={`mb-2 py-1.5 px-3 rounded-lg border font-mono text-center font-bold text-sm sm:text-base flex items-center justify-center min-h-[36px] ${
                isDark ? 'bg-black/50 border-white/10 text-cyan-300' : 'bg-slate-50 border-slate-200 text-cyan-700'
              }`}
            >
              {activeKb === 'table4' ? (
                <span>
                  Para x = 4 &rarr; Costo y = <span className="text-amber-400 font-extrabold">{mysteryInput4 || '?'}</span>
                </span>
              ) : activeKb === 'table5' ? (
                <span>
                  Para x = 5 &rarr; Costo y = <span className="text-amber-400 font-extrabold">{mysteryInput5 || '?'}</span>
                </span>
              ) : (
                <span>
                  Para x = 19 &rarr; Costo y = <span className="text-amber-400 font-extrabold">{mysteryInput19 || '?'}</span>
                </span>
              )}
            </div>

            {/* Teclado Numérico para Tabla */}
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleVirtualKeyPress(k)}
                    className={`h-10 rounded-lg font-mono font-bold text-base shadow-xs active:scale-95 transition-all ${
                      isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['4', '5', '6'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleVirtualKeyPress(k)}
                    className={`h-10 rounded-lg font-mono font-bold text-base shadow-xs active:scale-95 transition-all ${
                      isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['7', '8', '9'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleVirtualKeyPress(k)}
                    className={`h-10 rounded-lg font-mono font-bold text-base shadow-xs active:scale-95 transition-all ${
                      isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleVirtualKeyPress('CLEAR')}
                  className="h-10 rounded-lg font-mono font-bold text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 active:scale-95 transition-all"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleVirtualKeyPress('0')}
                  className={`h-10 rounded-lg font-mono font-bold text-base shadow-xs active:scale-95 transition-all ${
                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleVirtualKeyPress('BACKSPACE')}
                  className={`h-10 rounded-lg font-mono font-bold text-sm shadow-xs active:scale-95 transition-all ${
                    isDark ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  ⌫
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleVirtualKeyPress('NEXT')}
                className="w-full h-9 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-0.5"
              >
                <span>
                  {activeKb === 'table19' ? '✓ Comprobar Tabla' : 'Siguiente Campo →'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal de Ayuda Pedagógica ────────────────────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Qué es una Función Lineal y una Función Afín?"
      >
        <div className="space-y-4 text-xs lg:text-sm text-slate-300 leading-relaxed">
          <section className="rounded-lg bg-white/5 p-3 border border-white/10">
            <h3 className="font-bold text-cyan-400 text-sm mb-1">
              1. Diferencia Fundamental (Currículo Nacional MINEDU)
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-white/80">
              <li>
                <strong className="text-emerald-300">Función Lineal (y = mx):</strong> Pasa
                obligatoriamente por el origen <code>(0, 0)</code>. Si la entrada es 0, la salida es
                0. Es una relación de proporcionalidad directa pura.
              </li>
              <li>
                <strong className="text-purple-300">Función Afín (y = mx + b):</strong> Tiene un
                término independiente <code>b ≠ 0</code>. No pasa por el origen; corta al eje Y en{' '}
                <code>(0, b)</code>. Representa situaciones con un costo fijo o valor inicial.
              </li>
            </ul>
          </section>

          <section className="rounded-lg bg-white/5 p-3 border border-white/10">
            <h3 className="font-bold text-amber-400 text-sm mb-1">
              2. ¿Qué significa la Pendiente (m)?
            </h3>
            <p>
              La pendiente <code>m</code> es el <strong>paso de escalera</strong> o razón de cambio:
              por cada 1 unidad que avanzas en el eje X (<code>Δx = 1</code>), cuántas unidades subes
              o bajas en el eje Y (<code>Δy = m</code>).
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <strong>m &gt; 0</strong>
                <p>Creciente (sube)</p>
              </div>
              <div className="p-1.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-300">
                <strong>m = 0</strong>
                <p>Constante (horizontal)</p>
              </div>
              <div className="p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300">
                <strong>m &lt; 0</strong>
                <p>Decreciente (baja)</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-white/5 p-3 border border-white/10">
            <h3 className="font-bold text-purple-400 text-sm mb-1">
              3. ¿Qué representa el Intercepto (b)?
            </h3>
            <p>
              El valor <code>b</code> es la altura donde la recta corta al eje Y en <code>(0, b)</code>.
              Geométricamente, una función afín es una función lineal <strong>trasladada verticalmente</strong>{' '}
              <code>b</code> unidades hacia arriba o abajo.
            </p>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
