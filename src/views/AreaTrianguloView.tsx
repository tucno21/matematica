import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  Maximize2,
  Award,
  Layers,
  Sparkles,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  Sliders,
  Triangle,
  Play
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ── Modos de la vista ──
type ViewMode = 'descubrimiento' | 'cavalieri' | 'tipos' | 'retos'

// ── Tipos de Triángulos para Modo 3 ──
type TriangleType = 'acutangulo' | 'rectangulo' | 'obtusangulo'

// ── Fases didácticas del botón «Área» en Descubrimiento ──
type AreaWhyStep =
  | 'idle'
  | 'rect'
  | 'h_lines'
  | 'v_lines'
  | 'paused_grid'
  | 'revealing_animation'
  | 'revealed'

// ── Retos Pedagógicos ──
interface Challenge {
  id: number
  title: string
  instruction: string
  targetArea: number
  targetBase?: number
  targetHeight?: number
  requiredType?: TriangleType
  hint: string
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: 'Reto 1: Triángulo Básico',
    instruction: 'Construye un triángulo con Base = 6 u y Altura = 4 u para obtener Área = 12 u²',
    targetArea: 12,
    targetBase: 6,
    targetHeight: 4,
    hint: 'Aplica la fórmula: Área = (base × altura) ÷ 2 = (6 × 4) ÷ 2 = 24 ÷ 2 = 12 u².'
  },
  {
    id: 2,
    title: 'Reto 2: Triángulo Rectángulo',
    instruction: 'Construye un triángulo rectángulo con Base = 8 u y Altura = 5 u (Área = 20 u²)',
    targetArea: 20,
    targetBase: 8,
    targetHeight: 5,
    requiredType: 'rectangulo',
    hint: 'En un triángulo rectángulo, la altura es uno de los catetos perpendiculares a la base.'
  },
  {
    id: 3,
    title: 'Reto 3: Triángulo Obtusángulo',
    instruction: 'Construye un triángulo obtusángulo con Base = 4 u y Altura = 6 u (Área = 12 u²)',
    targetArea: 12,
    targetBase: 4,
    targetHeight: 6,
    requiredType: 'obtusangulo',
    hint: 'En un triángulo obtusángulo, el vértice superior se inclina hacia afuera y la altura cae sobre la prolongación de la base.'
  },
  {
    id: 4,
    title: 'Reto 4: Deduce la Altura',
    instruction: 'Si la Base es 10 u y queremos un Área = 25 u², ¿cuánto debe medir la Altura?',
    targetArea: 25,
    targetBase: 10,
    targetHeight: 5,
    hint: 'Si Área = (b × h) ÷ 2, entonces b × h = 50. Como b = 10, la altura debe ser 50 ÷ 10 = 5 u.'
  },
  {
    id: 5,
    title: 'Reto 5: Gran Superficie',
    instruction: 'Construye un triángulo con Base = 8 u y Altura = 7 u para lograr Área = 28 u²',
    targetArea: 28,
    targetBase: 8,
    targetHeight: 7,
    hint: 'Área = (8 × 7) ÷ 2 = 56 ÷ 2 = 28 u².'
  }
]

export default function AreaTrianguloView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // ── Modo Activo ──
  const [mode, setMode] = useState<ViewMode>('descubrimiento')
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // ── MODO 1: Descubrimiento & Deducción ──
  const [base, setBase] = useState<number>(6)
  const [height, setHeight] = useState<number>(4)
  const [apexOffset, setApexOffset] = useState<number>(3)

  // Botón 1: Perímetro
  const [isPerimeterActive, setIsPerimeterActive] = useState<boolean>(false)
  const [isPerimeterAnimating, setIsPerimeterAnimating] = useState<boolean>(false)
  const [perimeterProgress, setPerimeterProgress] = useState<number>(0) // 0 a 100

  // Botón 2: Superficie (solo colorea el triángulo, sin cotas)
  const [isSuperficieActive, setIsSuperficieActive] = useState<boolean>(false)

  // Botón 3: Área (proceso deductivo en fases)
  const [whyStep, setWhyStep] = useState<AreaWhyStep>('idle')
  const [whyRectProgress, setWhyRectProgress] = useState<number>(0) // 0 a 1
  const [whyHProgress, setWhyHProgress] = useState<number>(0)       // 0 a 1
  const [whyVProgress, setWhyVProgress] = useState<number>(0)       // 0 a 1

  // Animación al pulsar «Continuar»: Base -> Altura -> Coloreado -> Desplazamiento -> Deducción
  const [baseDrawProgress, setBaseDrawProgress] = useState<number>(0)       // 0 a 1
  const [heightDrawProgress, setHeightDrawProgress] = useState<number>(0)   // 0 a 1
  const [triangleFillOpacity, setTriangleFillOpacity] = useState<number>(0) // 0 a 0.55
  const [shiftProgress, setShiftProgress] = useState<number>(0)             // 0 a 1
  const [cardOpacity, setCardOpacity] = useState<number>(0)                 // 0 a 1
  const [showDeductionCard, setShowDeductionCard] = useState<boolean>(false)
  const [revealPhase, setRevealPhase] = useState<'none' | 'base' | 'height' | 'fill' | 'shift' | 'card'>('none')

  // ── MODO 2: Principio de Cavalieri (Misma área, diferente forma) ──
  const [cavalieriX, setCavalieriX] = useState<number>(3)

  // ── MODO 3: Tipos de Triángulos ──
  const [triangleTypePreset, setTriangleTypePreset] = useState<TriangleType>('acutangulo')

  // ── MODO 4: Retos Interactivos ──
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState<number>(0)
  const [retoBase, setRetoBase] = useState<number>(6)
  const [retoHeight, setRetoHeight] = useState<number>(3)
  const [retoApexOffset, setRetoApexOffset] = useState<number>(3)
  const [showHint, setShowHint] = useState<boolean>(false)
  const [completedChallenges, setCompletedChallenges] = useState<Set<number>>(() => new Set())

  // Referencias para animaciones fluidas
  const perimAnimRef = useRef<number | null>(null)
  const whyAnimRef = useRef<number | null>(null)
  const continueAnimRef = useRef<number | null>(null)

  // ── Dimensiones del Contenedor SVG ──
  const svgContainerRef = useRef<HTMLDivElement | null>(null)
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 640, height: 420 })

  useEffect(() => {
    const el = svgContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 50 && rect.height > 50) {
        setCanvasDims({ width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Cálculos Geométricos para Modo 1 ──
  const area1 = (base * height) / 2
  const rectArea1 = base * height

  const sideA = useMemo(() => {
    const dx = apexOffset - base
    const dy = height
    return Math.sqrt(dx * dx + dy * dy)
  }, [base, apexOffset, height])

  const sideB = useMemo(() => base, [base])

  const sideC = useMemo(() => {
    return Math.sqrt(apexOffset * apexOffset + height * height)
  }, [apexOffset, height])

  const perimeter1 = sideA + sideB + sideC

  // ── Reset total de Modo 1 (vuelve al triángulo limpio inicial) ──
  const handleResetMode1 = useCallback(() => {
    if (perimAnimRef.current) cancelAnimationFrame(perimAnimRef.current)
    if (whyAnimRef.current) cancelAnimationFrame(whyAnimRef.current)
    if (continueAnimRef.current) cancelAnimationFrame(continueAnimRef.current)
    setIsPerimeterActive(false)
    setIsPerimeterAnimating(false)
    setPerimeterProgress(0)
    setIsSuperficieActive(false)
    setWhyStep('idle')
    setWhyRectProgress(0)
    setWhyHProgress(0)
    setWhyVProgress(0)
    setBaseDrawProgress(0)
    setHeightDrawProgress(0)
    setTriangleFillOpacity(0)
    setShiftProgress(0)
    setCardOpacity(0)
    setShowDeductionCard(false)
    setRevealPhase('none')
  }, [])

  // ── 1. Acción: PERÍMETRO (recorrido pausado de 4.8s) ──
  const handleStartPerimeter = useCallback(() => {
    handleResetMode1()
    setIsPerimeterActive(true)
    setIsPerimeterAnimating(true)
    setPerimeterProgress(0)

    const startTime = performance.now()
    const duration = 4800

    const step = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(100, (elapsed / duration) * 100)
      setPerimeterProgress(p)
      if (p < 100) {
        perimAnimRef.current = requestAnimationFrame(step)
      } else {
        setIsPerimeterAnimating(false)
        perimAnimRef.current = null
      }
    }
    perimAnimRef.current = requestAnimationFrame(step)
  }, [handleResetMode1])

  // ── 2. Acción: SUPERFICIE (solo colorea el triángulo, sin cotas) ──
  const handleStartSuperficie = useCallback(() => {
    handleResetMode1()
    setIsSuperficieActive(true)
  }, [handleResetMode1])

  // ── 3. Acción: ÁREA (deducción animada: rectángulo -> líneas H -> líneas V -> pausa) ──
  const handleStartArea = useCallback(() => {
    handleResetMode1()
    setWhyStep('rect')
    setWhyRectProgress(0)
    setWhyHProgress(0)
    setWhyVProgress(0)

    const RECT_DURATION = 1400    // 1. Dibuja el marco del rectángulo (más lento)
    const H_DURATION = 1200       // 2. Traza líneas horizontales (más lento)
    const V_DURATION = 1200       // 3. Traza líneas verticales formando la cuadrícula (más lento)
    const totalPhase1 = RECT_DURATION + H_DURATION + V_DURATION

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime

      if (elapsed < RECT_DURATION) {
        setWhyStep('rect')
        setWhyRectProgress(Math.min(1, elapsed / RECT_DURATION))
        setWhyHProgress(0)
        setWhyVProgress(0)
        whyAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < RECT_DURATION + H_DURATION) {
        setWhyStep('h_lines')
        setWhyRectProgress(1)
        const hElapsed = elapsed - RECT_DURATION
        setWhyHProgress(Math.min(1, hElapsed / H_DURATION))
        setWhyVProgress(0)
        whyAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < totalPhase1) {
        setWhyStep('v_lines')
        setWhyRectProgress(1)
        setWhyHProgress(1)
        const vElapsed = elapsed - (RECT_DURATION + H_DURATION)
        setWhyVProgress(Math.min(1, vElapsed / V_DURATION))
        whyAnimRef.current = requestAnimationFrame(step)
      } else {
        // Pausa pedagógica con cuadrícula limpia y botón Continuar
        setWhyStep('paused_grid')
        setWhyRectProgress(1)
        setWhyHProgress(1)
        setWhyVProgress(1)
        whyAnimRef.current = null
      }
    }

    whyAnimRef.current = requestAnimationFrame(step)
  }, [handleResetMode1])

  // ── 4. Acción: CONTINUAR (Base -> Altura -> Coloreado suave -> Desplazamiento suave -> Deducción) ──
  const handleContinueWhy = useCallback(() => {
    if (continueAnimRef.current) cancelAnimationFrame(continueAnimRef.current)
    setWhyStep('revealing_animation')
    setBaseDrawProgress(0)
    setHeightDrawProgress(0)
    setTriangleFillOpacity(0)
    setShiftProgress(0)
    setCardOpacity(0)
    setShowDeductionCard(false)
    setRevealPhase('base')

    const BASE_TIME = 1300     // 1. Trazo dinámico de la base (pausado)
    const HEIGHT_TIME = 1300   // 2. Trazo dinámico de la altura (pausado)
    const FILL_TIME = 1100     // 3. Primero se pinta de forma suave el triángulo
    const SHIFT_TIME = 1200    // 4. Luego toda la gráfica se mueve hacia un lado de forma suave
    const CARD_TIME = 900      // 5. Luego de terminar de moverse, sale ese recuadro de la fórmula

    const t1 = BASE_TIME
    const t2 = t1 + HEIGHT_TIME
    const t3 = t2 + FILL_TIME
    const t4 = t3 + SHIFT_TIME
    const totalTime = t4 + CARD_TIME

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime

      if (elapsed < t1) {
        // 1. Trazo de la Base de izquierda a derecha
        setRevealPhase('base')
        const p = Math.min(1, elapsed / BASE_TIME)
        setBaseDrawProgress(easeOutCubic(p))
        setHeightDrawProgress(0)
        setTriangleFillOpacity(0)
        setShiftProgress(0)
        setCardOpacity(0)
        setShowDeductionCard(false)
        continueAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < t2) {
        // 2. Trazo de la Altura de arriba hacia abajo
        setRevealPhase('height')
        setBaseDrawProgress(1)
        const p = Math.min(1, (elapsed - t1) / HEIGHT_TIME)
        setHeightDrawProgress(easeOutCubic(p))
        setTriangleFillOpacity(0)
        setShiftProgress(0)
        setCardOpacity(0)
        setShowDeductionCard(false)
        continueAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < t3) {
        // 3. Primero se pinta de forma suave el triángulo
        setRevealPhase('fill')
        setBaseDrawProgress(1)
        setHeightDrawProgress(1)
        const p = Math.min(1, (elapsed - t2) / FILL_TIME)
        setTriangleFillOpacity(0.55 * easeOutCubic(p))
        setShiftProgress(0)
        setCardOpacity(0)
        setShowDeductionCard(false)
        continueAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < t4) {
        // 4. Luego toda la gráfica se mueve hacia un lado de forma suave
        setRevealPhase('shift')
        setBaseDrawProgress(1)
        setHeightDrawProgress(1)
        setTriangleFillOpacity(0.55)
        const p = Math.min(1, (elapsed - t3) / SHIFT_TIME)
        setShiftProgress(easeInOutCubic(p))
        setCardOpacity(0)
        setShowDeductionCard(false)
        continueAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < totalTime) {
        // 5. Luego de terminar de moverse, sale ese recuadro de la fórmula
        setRevealPhase('card')
        setBaseDrawProgress(1)
        setHeightDrawProgress(1)
        setTriangleFillOpacity(0.55)
        setShiftProgress(1)
        setShowDeductionCard(true)
        const p = Math.min(1, (elapsed - t4) / CARD_TIME)
        setCardOpacity(easeOutCubic(p))
        continueAnimRef.current = requestAnimationFrame(step)
      } else {
        setRevealPhase('none')
        setBaseDrawProgress(1)
        setHeightDrawProgress(1)
        setTriangleFillOpacity(0.55)
        setShiftProgress(1)
        setShowDeductionCard(true)
        setCardOpacity(1)
        setWhyStep('revealed')
        continueAnimRef.current = null
      }
    }

    continueAnimRef.current = requestAnimationFrame(step)
  }, [])

  // ── Cálculos de Modo Retos ──
  const currentChallenge = CHALLENGES[currentChallengeIdx]
  const retoArea = (retoBase * retoHeight) / 2

  const currentRetoType: TriangleType = useMemo(() => {
    if (retoApexOffset === 0 || retoApexOffset === retoBase) return 'rectangulo'
    if (retoApexOffset < 0 || retoApexOffset > retoBase) return 'obtusangulo'
    return 'acutangulo'
  }, [retoApexOffset, retoBase])

  const isAreaMatch = retoArea === currentChallenge.targetArea
  const isBaseMatch = currentChallenge.targetBase ? retoBase === currentChallenge.targetBase : true
  const isHeightMatch = currentChallenge.targetHeight ? retoHeight === currentChallenge.targetHeight : true
  const isTypeMatch = currentChallenge.requiredType ? currentRetoType === currentChallenge.requiredType : true

  const isCurrentChallengeSolved = isAreaMatch && isBaseMatch && isHeightMatch && isTypeMatch

  useEffect(() => {
    if (isCurrentChallengeSolved) {
      setCompletedChallenges(prev => {
        if (prev.has(currentChallenge.id)) return prev
        const next = new Set(prev)
        next.add(currentChallenge.id)
        return next
      })
    }
  }, [isCurrentChallengeSolved, currentChallenge.id])

  // ── Paleta de Colores Adaptativa ──
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    cardBg: isDark ? 'bg-[#10172b]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-300',
    toolbarBg: isDark ? 'bg-[#0d1424] border-white/5' : 'bg-slate-100 border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-800',
    svgTextColor: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? 'text-white/60' : 'text-slate-500',
    subBarBg: isDark ? 'bg-[#0d1424] border-white/10' : 'bg-slate-100 border-slate-200',
    btnGhost: isDark
      ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs',
    btnPreset: isDark
      ? 'bg-white/10 hover:bg-white/20 text-white'
      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs',
    svgBg: isDark ? '#090e1f' : '#f8fafc',
    gridLine: isDark ? '#1a2640' : '#e2e8f0',
    baseColor: isDark ? '#38bdf8' : '#0284c7',
    heightColor: isDark ? '#fb7185' : '#e11d48',
    triangleFill: '#3b82f6',
    triangleStroke: '#1d4ed8',
    perimeterColor: '#f59e0b',
  }

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${c.bg} ${c.text}`}>
      {/* ── 1. Header Principal (36-44px) ──────────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${c.headerBg} ${c.cardBorder}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer active:scale-95 transition-all ${c.btnGhost}`}
            title="Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Volver</span>
          </button>

          <div className={`h-4 w-px hidden sm:block ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />

          <h1 className="text-xs sm:text-sm lg:text-base font-bold tracking-tight truncate flex items-center gap-1.5">
            <Triangle className="h-4 w-4 text-cyan-500 shrink-0" />
            <span>Área del Triángulo</span>
          </h1>
        </div>

        {/* Pestañas de Modos con alto contraste */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-lg border text-[11px] lg:text-xs ${
            isDark ? 'bg-black/30 border-white/10' : 'bg-slate-200/80 border-slate-300'
          }`}
        >
          <button
            onClick={() => setMode('descubrimiento')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'descubrimiento'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">Descubrimiento</span>
            <span className="sm:hidden">1</span>
          </button>

          <button
            onClick={() => setMode('cavalieri')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'cavalieri'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
            title="Misma base y altura = misma área aunque cambie de forma"
          >
            <Sliders className="h-3 w-3" />
            <span className="hidden sm:inline">Misma Área</span>
            <span className="sm:hidden">2</span>
          </button>

          <button
            onClick={() => setMode('tipos')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'tipos'
                ? 'bg-purple-600 text-white shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span className="hidden sm:inline">Tipos y Alturas</span>
            <span className="sm:hidden">3</span>
          </button>

          <button
            onClick={() => {
              setMode('retos')
              setShowHint(false)
            }}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 relative ${
              mode === 'retos'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Award className="h-3 w-3" />
            <span className="hidden sm:inline">Retos</span>
            <span className="sm:hidden">4</span>
            {completedChallenges.size > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Botón Ayuda */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(true)}
            className={`h-7 w-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
              isDark
                ? 'border-white/10 hover:bg-white/10 text-white/80'
                : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
            title="Ayuda y Conceptos"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Barra de Herramientas y Parámetros (34-40px) ─────────────────── */}
      <div
        className={`shrink-0 flex items-center justify-between gap-2 border-b px-2 lg:px-4 py-1 text-[11px] lg:text-xs overflow-x-auto ${c.toolbarBg}`}
      >
        {/* ── MODO 1: DESCUBRIMIENTO ── */}
        {mode === 'descubrimiento' && (
          <div className="flex items-center justify-between w-full gap-2">
            {/* Controles de Base y Altura */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Base */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Base (b):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nb = Math.max(2, base - 1)
                      setBase(nb)
                      setApexOffset(prev => Math.min(nb, prev))
                      handleResetMode1()
                    }}
                    disabled={base <= 2}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                        : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'
                    }`}
                  >
                    -
                  </button>
                  <span
                    className={`font-mono font-black text-xs px-1.5 py-0.5 rounded min-w-[26px] text-center ${
                      isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                    }`}
                  >
                    {base} u
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nb = Math.min(10, base + 1)
                      setBase(nb)
                      handleResetMode1()
                    }}
                    disabled={base >= 10}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                        : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Altura */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>Altura (h):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHeight(prev => Math.max(2, prev - 1))
                      handleResetMode1()
                    }}
                    disabled={height <= 2}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 border border-rose-500/40'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                    }`}
                  >
                    -
                  </button>
                  <span
                    className={`font-mono font-black text-xs px-1.5 py-0.5 rounded min-w-[26px] text-center ${
                      isDark ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {height} u
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHeight(prev => Math.min(8, prev + 1))
                      handleResetMode1()
                    }}
                    disabled={height >= 8}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 border border-rose-500/40'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* BOTONES EN ORDEN: 1. Perímetro, 2. Superficie, 3. Área */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 1. Botón Perímetro */}
              <button
                type="button"
                onClick={handleStartPerimeter}
                disabled={isPerimeterAnimating}
                className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all ${
                  isPerimeterActive
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title="Trazar y medir el contorno del triángulo"
              >
                <span>Perímetro</span>
              </button>

              {/* 2. Botón Superficie (solo colorea el triángulo, sin cotas) */}
              <button
                type="button"
                onClick={handleStartSuperficie}
                className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all ${
                  isSuperficieActive
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title="Colorear la superficie interna del triángulo sin cotas"
              >
                <Triangle className="h-3.5 w-3.5 fill-current" />
                <span>Superficie</span>
              </button>

              {/* 3. Botón Área (Deducción animada con cuadrícula) */}
              <button
                type="button"
                onClick={handleStartArea}
                className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all ${
                  whyStep !== 'idle'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                    : isDark
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                    : 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                }`}
                title="Deducción visual del área del triángulo con cuadrícula"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Área</span>
              </button>

              {/* Botón «Continuar» con suave animación de desvanecer y aparecer (sin saltar) */}
              {whyStep === 'paused_grid' && (
                <button
                  type="button"
                  onClick={handleContinueWhy}
                  className="px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md animate-pulse ring-2 ring-emerald-300 transition-all active:scale-95"
                  title="Continuar para trazar base, altura y ver la deducción"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Continuar</span>
                </button>
              )}

              {(isPerimeterActive || isSuperficieActive || whyStep !== 'idle') && (
                <button
                  type="button"
                  onClick={handleResetMode1}
                  className={`px-2 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white/80'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                  }`}
                  title="Limpiar y volver al triángulo inicial limpio"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── MODO 2: CAVALIERI (MISMA ÁREA) ── */}
        {mode === 'cavalieri' && (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                Desliza el vértice superior:
              </span>
              <span className={`text-[10px] hidden sm:inline ${c.textMuted}`}>
                (¡La altura y la base no cambian, por lo tanto el área siempre es la misma!)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-500">
                Posición X = {cavalieriX} u
              </span>
              <input
                type="range"
                min="-2"
                max="8"
                step="0.5"
                value={cavalieriX}
                onChange={e => setCavalieriX(parseFloat(e.target.value))}
                className="w-28 sm:w-44 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setCavalieriX(3)}
                className={`px-2 py-0.5 rounded text-xs font-bold ${c.btnPreset}`}
              >
                Centrar
              </button>
            </div>
          </div>
        )}

        {/* ── MODO 3: TIPOS Y ALTURAS ── */}
        {mode === 'tipos' && (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                Observa dónde cae la Altura (h):
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTriangleTypePreset('acutangulo')}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all ${
                  triangleTypePreset === 'acutangulo'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-white/10 text-white/70'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Acutángulo (Interior)
              </button>
              <button
                type="button"
                onClick={() => setTriangleTypePreset('rectangulo')}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all ${
                  triangleTypePreset === 'rectangulo'
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-white/10 text-white/70'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Rectángulo (Cateto)
              </button>
              <button
                type="button"
                onClick={() => setTriangleTypePreset('obtusangulo')}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all ${
                  triangleTypePreset === 'obtusangulo'
                    ? 'bg-rose-600 text-white'
                    : isDark
                    ? 'bg-white/10 text-white/70'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Obtusángulo (Exterior)
              </button>
            </div>
          </div>
        )}

        {/* ── MODO 4: RETOS ── */}
        {mode === 'retos' && (
          <div className="flex items-center justify-between w-full gap-2">
            {/* Selector de Retos */}
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Retos:</span>
              <div className="flex items-center gap-1">
                {CHALLENGES.map((ch, idx) => {
                  const isDone = completedChallenges.has(ch.id)
                  const isSelected = idx === currentChallengeIdx
                  return (
                    <button
                      key={`ch-${ch.id}`}
                      type="button"
                      onClick={() => {
                        setCurrentChallengeIdx(idx)
                        setShowHint(false)
                      }}
                      className={`h-6 px-1.5 rounded font-bold text-xs flex items-center gap-0.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 font-black'
                          : isDone
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isDark
                          ? 'bg-white/10 text-white/70 hover:bg-white/20'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                      title={ch.title}
                    >
                      <span>#{ch.id}</span>
                      {isDone && <span className="text-[10px]">⭐</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Controles para el Reto */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Base */}
              <div className="flex items-center gap-1">
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>b:</span>
                <button
                  type="button"
                  onClick={() => setRetoBase(prev => Math.max(2, prev - 1))}
                  disabled={retoBase <= 2}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                      : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'
                  }`}
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs min-w-[20px] text-center">
                  {retoBase}
                </span>
                <button
                  type="button"
                  onClick={() => setRetoBase(prev => Math.min(10, prev + 1))}
                  disabled={retoBase >= 10}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                      : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'
                  }`}
                >
                  +
                </button>
              </div>

              {/* Altura */}
              <div className="flex items-center gap-1">
                <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>h:</span>
                <button
                  type="button"
                  onClick={() => setRetoHeight(prev => Math.max(2, prev - 1))}
                  disabled={retoHeight <= 2}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 border border-rose-500/40'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                  }`}
                >
                  -
                </button>
                <span className={`font-mono font-bold text-xs min-w-[20px] text-center ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
                  {retoHeight}
                </span>
                <button
                  type="button"
                  onClick={() => setRetoHeight(prev => Math.min(8, prev + 1))}
                  disabled={retoHeight >= 8}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 border border-rose-500/40'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                  }`}
                >
                  +
                </button>
              </div>

              {/* Forma */}
              <div className="flex items-center gap-1">
                <span className={c.textMuted}>Vértice:</span>
                <button
                  type="button"
                  onClick={() => setRetoApexOffset(prev => prev - 1)}
                  className={`h-6 w-6 rounded font-bold cursor-pointer ${
                    isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                  title="Inclinar a la izquierda"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setRetoApexOffset(prev => prev + 1)}
                  className={`h-6 w-6 rounded font-bold cursor-pointer ${
                    isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                  title="Inclinar a la derecha"
                >
                  →
                </button>
              </div>

              {/* Botón Pista */}
              <button
                type="button"
                onClick={() => setShowHint(prev => !prev)}
                className={`h-6 px-2 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  showHint
                    ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                    : isDark
                    ? 'bg-white/10 hover:bg-white/20 text-amber-300'
                    : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-300'
                }`}
              >
                <Lightbulb className="h-3 w-3" />
                <span className="hidden xs:inline">Pista</span>
              </button>

              {/* Botón Siguiente */}
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (currentChallengeIdx + 1) % CHALLENGES.length
                  setCurrentChallengeIdx(nextIdx)
                  setShowHint(false)
                }}
                className={`h-6 px-2.5 rounded font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                  isCurrentChallengeSolved
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-bounce shadow-md'
                    : isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white/90'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                }`}
              >
                <span>Siguiente</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Área de Trabajo Principal (CERO SCROLL) ──────────────────────── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1 sm:gap-2">
        <main
          ref={svgContainerRef}
          className={`flex-1 min-w-0 min-h-0 flex flex-col rounded-xl border relative overflow-hidden ${c.cardBg} ${c.cardBorder}`}
          style={{ isolation: 'isolate' }}
        >
          {/* Sub-barra superior del lienzo */}
          <div className={`flex h-7 shrink-0 items-center justify-between px-2 sm:px-3 border-b text-xs ${c.subBarBg}`}>
            {mode === 'retos' ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className={`font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Objetivo:
                  </span>
                  <span className={`font-bold truncate text-[11px] sm:text-xs ${c.text}`}>
                    {currentChallenge.instruction}
                  </span>
                </div>
                <div>
                  {isCurrentChallengeSolved ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-xs animate-pulse">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>¡Excelente! ¡Completado!</span>
                    </span>
                  ) : (
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-white/60' : 'bg-slate-200 text-slate-700'}`}>
                      Ajusta base y altura
                    </span>
                  )}
                </div>
              </div>
            ) : mode === 'cavalieri' ? (
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-amber-500">
                  Principio de Cavalieri: Triángulos con igual base y altura tienen la MISMA área
                </span>
                <span className="font-mono font-black text-blue-500 text-sm">
                  Área fija = {((6 * 4) / 2).toFixed(1)} u²
                </span>
              </div>
            ) : mode === 'tipos' ? (
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-purple-400">
                  {triangleTypePreset === 'acutangulo' && 'Triángulo Acutángulo: La altura cae en el interior de la base'}
                  {triangleTypePreset === 'rectangulo' && 'Triángulo Rectángulo: La altura es perpendicular y coincide con un cateto'}
                  {triangleTypePreset === 'obtusangulo' && 'Triángulo Obtusángulo: La altura cae en el exterior sobre la prolongación'}
                </span>
              </div>
            ) : (
              /* En Modo Descubrimiento */
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  {/* Badge Área */}
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
                    <span className={c.textMuted}>Área:</span>
                    {showDeductionCard ? (
                      <span className="font-mono font-black text-blue-500 text-sm animate-pulse">
                        {area1} u²
                      </span>
                    ) : (
                      <span className={`font-mono font-bold text-xs px-1 rounded ${isDark ? 'text-white/40 bg-white/5' : 'text-slate-400 bg-slate-200'}`}>
                        ?
                      </span>
                    )}
                  </div>

                  {/* Badge Perímetro */}
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-500 shrink-0" />
                    <span className={c.textMuted}>Perímetro:</span>
                    {isPerimeterActive ? (
                      <span className="font-mono font-black text-amber-500 text-sm animate-pulse">
                        {isPerimeterAnimating ? `${((perimeterProgress / 100) * perimeter1).toFixed(1)} u` : `${perimeter1.toFixed(1)} u`}
                      </span>
                    ) : (
                      <span className={`font-mono font-bold text-xs px-1 rounded ${isDark ? 'text-white/40 bg-white/5' : 'text-slate-400 bg-slate-200'}`}>
                        ?
                      </span>
                    )}
                  </div>
                </div>

                {/* Mensaje de estado dinámico */}
                {isSuperficieActive && (
                  <span className="text-[11px] font-bold text-blue-400">
                    Superficie = Espacio bidimensional interno del triángulo
                  </span>
                )}
                {whyStep === 'rect' && (
                  <span className="text-[11px] font-bold text-purple-400 animate-pulse">
                    1. Encerrando el triángulo en un rectángulo...
                  </span>
                )}
                {whyStep === 'h_lines' && (
                  <span className="text-[11px] font-bold text-purple-400 animate-pulse">
                    2. Trazando líneas horizontales...
                  </span>
                )}
                {whyStep === 'v_lines' && (
                  <span className="text-[11px] font-bold text-purple-400 animate-pulse">
                    3. Trazando líneas verticales formando la cuadrícula...
                  </span>
                )}
                {whyStep === 'paused_grid' && (
                  <span className="text-[11px] font-bold text-emerald-400 animate-pulse">
                    💡 Rectángulo de {rectArea1} u². ¿Cuánto ocupará el triángulo? Pulsa «Continuar»
                  </span>
                )}
                {whyStep === 'revealing_animation' && (
                  <span className="text-[11px] font-bold text-cyan-400 animate-pulse">
                    {revealPhase === 'base' && '1. Trazando la base (b)...'}
                    {revealPhase === 'height' && '2. Trazando la altura (h)...'}
                    {revealPhase === 'fill' && '3. Coloreando la superficie interna del triángulo...'}
                    {revealPhase === 'shift' && '4. Desplazando suavemente la gráfica...'}
                    {revealPhase === 'card' && '5. Revelando la fórmula de deducción matemática...'}
                  </span>
                )}
                {whyStep === 'revealed' && (
                  <span className="text-[11px] font-bold text-cyan-400">
                    ¡Deducción completa! Área del triángulo = Mitad del rectángulo = {area1} u²
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Banner de Pista en Retos */}
          {mode === 'retos' && showHint && (
            <div
              className={`shrink-0 px-3 py-1.5 border-b text-xs flex items-center justify-between gap-2 ${
                isDark ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Pista:</strong> {currentChallenge.hint}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="text-[10px] underline font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* SVG Canvas Adaptativo */}
          <div className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden p-0">
            <svg
              viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
              className="w-full h-full block"
              style={{ touchAction: 'none' }}
            >
              {/* Fondo del lienzo */}
              <rect x="0" y="0" width={canvasDims.width} height={canvasDims.height} fill={c.svgBg} />

              {/* ══════════════════════════════════════════════════════════════
                  RENDERIZADO GEOMÉTRICO
              ══════════════════════════════════════════════════════════════ */}
              {(() => {
                let activeBase = base
                let activeHeight = height
                let activeApexX = apexOffset

                if (mode === 'cavalieri') {
                  activeBase = 6
                  activeHeight = 4
                  activeApexX = cavalieriX
                } else if (mode === 'tipos') {
                  activeBase = 6
                  activeHeight = 4
                  if (triangleTypePreset === 'acutangulo') activeApexX = 3
                  else if (triangleTypePreset === 'rectangulo') activeApexX = 0
                  else activeApexX = 8
                } else if (mode === 'retos') {
                  activeBase = retoBase
                  activeHeight = retoHeight
                  activeApexX = retoApexOffset
                }

                // En modo descubrimiento, para que el tamaño de celda sea perfectamente estable,
                // reservamos el ancho del panel derecho de forma fija si hay espacio (>= 620px)
                const cardReservedW = 320
                const availableWidth = mode === 'descubrimiento' && canvasDims.width >= 620
                  ? canvasDims.width - cardReservedW - 36
                  : canvasDims.width - 50

                // Escala de celdas optimizada y mucho más grande para tablets y laptops
                const spanUnitsX = Math.max(activeBase, activeApexX, 6) - Math.min(0, activeApexX) + 1.4
                const spanUnitsY = activeHeight + 1.2
                const fitX = availableWidth / spanUnitsX
                const fitY = (canvasDims.height - 76) / spanUnitsY
                const cellSize = Math.max(
                  24,
                  Math.min(58, Math.floor(Math.min(fitX, fitY)))
                )

                const minX = Math.min(0, activeApexX)
                const maxX = Math.max(activeBase, activeApexX)
                const totalSpanW = (maxX - minX) * cellSize

                // Posición inicial centrada y posición desplazada suave hacia la izquierda
                const centeredOriginX = (canvasDims.width - totalSpanW) / 2 - minX * cellSize
                const shiftedOriginX = 36 - minX * cellSize

                // Desplazamiento fluido y suave (shiftProgress va de 0 a 1 de forma continua)
                const originX = mode === 'descubrimiento' && canvasDims.width >= 620
                  ? centeredOriginX + (shiftedOriginX - centeredOriginX) * shiftProgress
                  : centeredOriginX
                const originY = Math.min(
                  canvasDims.height - 48,
                  Math.round(canvasDims.height / 2 + (activeHeight * cellSize) / 2 + 8)
                )

                // Cuadrícula unitaria completa (1u × 1u = cellSize × cellSize) alineada con el triángulo
                const minCol = Math.floor(-originX / cellSize) - 1
                const maxCol = Math.ceil((canvasDims.width - originX) / cellSize) + 1
                const minRow = Math.floor((originY - canvasDims.height) / cellSize) - 1
                const maxRow = Math.ceil(originY / cellSize) + 1

                const gridCols: number[] = []
                for (let col = minCol; col <= maxCol; col++) {
                  gridCols.push(col)
                }

                const gridRows: number[] = []
                for (let r = minRow; r <= maxRow; r++) {
                  gridRows.push(r)
                }

                const shouldFillTriangle =
                  mode === 'cavalieri' ||
                  mode === 'tipos' ||
                  mode === 'retos' ||
                  isSuperficieActive ||
                  triangleFillOpacity > 0

                const activeFillOpacity =
                  mode === 'retos' && isCurrentChallengeSolved
                    ? 0.55
                    : isSuperficieActive
                    ? 0.65
                    : triangleFillOpacity > 0
                    ? triangleFillOpacity
                    : 0.42

                // Coordenadas de vértices en píxeles
                const pAx = originX
                const pAy = originY
                const pBx = originX + activeBase * cellSize
                const pBy = originY
                const pCx = originX + activeApexX * cellSize
                const pCy = originY - activeHeight * cellSize

                const rectW = activeBase * cellSize
                const rectH = activeHeight * cellSize

                const pFootX = pCx
                const pFootY = originY
                const isHeightOutside = activeApexX < 0 || activeApexX > activeBase

                // Perímetro animado
                const lenAB = activeBase
                const lenBC = Math.sqrt(Math.pow(activeApexX - activeBase, 2) + Math.pow(activeHeight, 2))
                const lenCA = Math.sqrt(Math.pow(activeApexX, 2) + Math.pow(activeHeight, 2))
                const totalPerim = lenAB + lenBC + lenCA
                const currentDist = (perimeterProgress / 100) * totalPerim

                let tipX = pAx
                let tipY = pAy
                if (currentDist <= lenAB) {
                  const f = lenAB > 0 ? currentDist / lenAB : 0
                  tipX = pAx + f * (pBx - pAx)
                  tipY = pBy
                } else if (currentDist <= lenAB + lenBC) {
                  const f = lenBC > 0 ? (currentDist - lenAB) / lenBC : 0
                  tipX = pBx + f * (pCx - pBx)
                  tipY = pBy + f * (pCy - pBy)
                } else {
                  const f = lenCA > 0 ? (currentDist - lenAB - lenBC) / lenCA : 0
                  tipX = pCx + f * (pAx - pCx)
                  tipY = pCy + f * (pAy - pCy)
                }

                // Visibilidad de cotas de Base y Altura:
                // En Descubrimiento, NUNCA se muestran al inicio ni en "Superficie",
                // SOLO se muestran cuando la animación de Continuar las traza o en 'revealed'
                const showBaseLine =
                  mode !== 'descubrimiento' ||
                  baseDrawProgress > 0 ||
                  whyStep === 'revealed'

                const showHeightLine =
                  mode !== 'descubrimiento' ||
                  heightDrawProgress > 0 ||
                  whyStep === 'revealed'

                return (
                  <g>
                    {/* Sombra del triángulo */}
                    <polygon
                      points={`${pAx + 5},${pAy + 5} ${pBx + 5},${pBy + 5} ${pCx + 5},${pCy + 5}`}
                      fill={isDark ? '#040711' : '#e2e8f0'}
                      opacity="0.8"
                    />

                    {/* ══════════════════════════════════════════════════════════
                        1. RECTÁNGULO ENVOLVENTE Y CUADRÍCULA
                        (Pasa completamente a través del triángulo sin ser tapada)
                    ══════════════════════════════════════════════════════════ */}
                    {mode === 'descubrimiento' && whyStep !== 'idle' && (
                      <g>
                        {/* Marco del rectángulo */}
                        <rect
                          x={pAx}
                          y={pCy}
                          width={rectW}
                          height={rectH}
                          fill={isDark ? '#0b1329' : '#f8fafc'}
                          fillOpacity={0.5}
                          stroke="#8b5cf6"
                          strokeWidth="2.5"
                          strokeDasharray={
                            whyStep === 'rect'
                              ? `${2 * (rectW + rectH)}`
                              : undefined
                          }
                          strokeDashoffset={
                            whyStep === 'rect'
                              ? `${2 * (rectW + rectH) * (1 - whyRectProgress)}`
                              : undefined
                          }
                          rx={3}
                        />

                        {/* Líneas Horizontales que dividen la cuadrícula */}
                        {(whyStep === 'h_lines' ||
                          whyStep === 'v_lines' ||
                          whyStep === 'paused_grid' ||
                          whyStep === 'revealing_animation' ||
                          whyStep === 'revealed') && (
                          <g>
                            {Array.from({ length: activeHeight - 1 }, (_, i) => i + 1).map(r => {
                              const lineY = pCy + r * cellSize
                              const lineProgress = whyStep === 'h_lines' ? whyHProgress : 1
                              return (
                                <line
                                  key={`why-h-${r}`}
                                  x1={pAx}
                                  y1={lineY}
                                  x2={pAx + lineProgress * rectW}
                                  y2={lineY}
                                  stroke={isDark ? '#a78bfa' : '#8b5cf6'}
                                  strokeWidth="1.8"
                                  strokeOpacity="0.85"
                                />
                              )
                            })}
                          </g>
                        )}

                        {/* Líneas Verticales que forman las cuadrículas completas */}
                        {(whyStep === 'v_lines' ||
                          whyStep === 'paused_grid' ||
                          whyStep === 'revealing_animation' ||
                          whyStep === 'revealed') && (
                          <g>
                            {Array.from({ length: activeBase - 1 }, (_, i) => i + 1).map(col => {
                              const lineX = pAx + col * cellSize
                              const lineProgress = whyStep === 'v_lines' ? whyVProgress : 1
                              return (
                                <line
                                  key={`why-v-${col}`}
                                  x1={lineX}
                                  y1={pCy}
                                  x2={lineX}
                                  y2={pCy + lineProgress * rectH}
                                  stroke={isDark ? '#a78bfa' : '#8b5cf6'}
                                  strokeWidth="1.8"
                                  strokeOpacity="0.85"
                                />
                              )
                            })}
                          </g>
                        )}

                        {/* Etiqueta del Rectángulo por encima sin colisionar con el vértice C */}
                        <g>
                          <rect
                            x={pAx + rectW / 2 - 110}
                            y={pCy - 38}
                            width="220"
                            height="20"
                            rx="5"
                            fill={isDark ? '#0a0f1d' : '#ffffff'}
                            stroke="#8b5cf6"
                            strokeWidth="1.2"
                          />
                          <text
                            x={pAx + rectW / 2}
                            y={pCy - 24}
                            textAnchor="middle"
                            fill={isDark ? '#c084fc' : '#7c3aed'}
                            fontSize="11"
                            fontWeight="black"
                          >
                            Rectángulo: {activeBase} × {activeHeight} = {rectArea1} baldosas (u²)
                          </text>
                        </g>
                      </g>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        2. RELLENO DEL TRIÁNGULO
                        - Translúcido en Cavalieri, Tipos y Retos
                        - En Descubrimiento: activo en Superficie o tras Continuar
                        - Al resolver retos: verde brillante
                    ══════════════════════════════════════════════════════════ */}
                    {shouldFillTriangle && (
                      <polygon
                        points={`${pAx},${pAy} ${pBx},${pBy} ${pCx},${pCy}`}
                        fill={mode === 'retos' && isCurrentChallengeSolved ? '#10b981' : c.triangleFill}
                        fillOpacity={activeFillOpacity}
                      />
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        3. CUADRÍCULA UNITARIA (1u × 1u) DELGADA Y VISIBLE
                        (Alineada con el triángulo y pasando por encima de la superficie)
                    ══════════════════════════════════════════════════════════ */}
                    <g>
                      {/* Líneas horizontales de cuadrícula unitaria */}
                      {gridRows.map(r => {
                        const y = originY - r * cellSize
                        if (y < 4 || y > canvasDims.height - 4) return null
                        const isBaseLine = r === 0
                        return (
                          <line
                            key={`unit-h-${r}`}
                            x1={0}
                            y1={y}
                            x2={canvasDims.width}
                            y2={y}
                            stroke={isBaseLine ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#2e4268' : '#cbd5e1')}
                            strokeWidth={isBaseLine ? 1.5 : 1}
                            strokeOpacity={isDark ? 0.75 : 0.85}
                          />
                        )
                      })}

                      {/* Líneas verticales de cuadrícula unitaria */}
                      {gridCols.map(col => {
                        const x = originX + col * cellSize
                        if (x < 4 || x > canvasDims.width - 4) return null
                        return (
                          <line
                            key={`unit-v-${col}`}
                            x1={x}
                            y1={0}
                            x2={x}
                            y2={canvasDims.height}
                            stroke={isDark ? '#2e4268' : '#cbd5e1'}
                            strokeWidth={1}
                            strokeOpacity={isDark ? 0.75 : 0.85}
                          />
                        )
                      })}
                    </g>

                    {/* Borde exterior del Triángulo Principal */}
                    <polygon
                      points={`${pAx},${pAy} ${pBx},${pBy} ${pCx},${pCy}`}
                      fill="none"
                      stroke={mode === 'retos' && isCurrentChallengeSolved ? '#059669' : c.triangleStroke}
                      strokeWidth="3.5"
                    />

                    {/* ══════════════════════════════════════════════════════════
                        3. COTAS DINÁMICAS DE BASE Y ALTURA
                        (Con animación secuencial: primero Base, luego Altura)
                    ══════════════════════════════════════════════════════════ */}
                    {showBaseLine && (
                      <g>
                        {/* Línea de Base dinámica de izquierda a derecha */}
                        <line
                          x1={pAx}
                          y1={pAy + 14}
                          x2={pAx + (mode === 'descubrimiento' ? baseDrawProgress : 1) * (pBx - pAx)}
                          y2={pBy + 14}
                          stroke={c.baseColor}
                          strokeWidth="2"
                        />
                        <line x1={pAx} y1={pAy + 9} x2={pAx} y2={pAy + 19} stroke={c.baseColor} strokeWidth="1.5" />
                        {(mode !== 'descubrimiento' || baseDrawProgress >= 1) && (
                          <line x1={pBx} y1={pBy + 9} x2={pBx} y2={pBy + 19} stroke={c.baseColor} strokeWidth="1.5" />
                        )}
                        {(mode !== 'descubrimiento' || baseDrawProgress > 0.4) && (
                          <g>
                            <rect
                              x={pAx + (activeBase * cellSize) / 2 - 32}
                              y={pAy + 22}
                              width={64}
                              height={20}
                              rx={4}
                              fill={isDark ? '#081726' : '#ffffff'}
                              stroke={c.baseColor}
                              strokeWidth="1.5"
                            />
                            <text
                              x={pAx + (activeBase * cellSize) / 2}
                              y={pAy + 36}
                              textAnchor="middle"
                              fill={c.baseColor}
                              fontSize="11"
                              fontWeight="black"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              b = {activeBase} u
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {showHeightLine && (
                      <g>
                        {/* Prolongación punteada si es obtusángulo */}
                        {isHeightOutside && (
                          <line
                            x1={activeApexX < 0 ? pCx : pBx}
                            y1={originY}
                            x2={activeApexX < 0 ? pAx : pCx}
                            y2={originY}
                            stroke={isDark ? '#94a3b8' : '#64748b'}
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                          />
                        )}

                        {/* Línea de Altura dinámica de arriba a abajo */}
                        <line
                          x1={pCx}
                          y1={pCy}
                          x2={pFootX}
                          y2={pCy + (mode === 'descubrimiento' ? heightDrawProgress : 1) * (pFootY - pCy)}
                          stroke={c.heightColor}
                          strokeWidth="3"
                          strokeDasharray={isHeightOutside ? '5 3' : undefined}
                        />

                        {/* Símbolo de 90° */}
                        {(mode !== 'descubrimiento' || heightDrawProgress >= 1) && (
                          <path
                            d={`M ${pFootX + (activeApexX < activeBase / 2 ? 10 : -10)} ${pFootY} L ${pFootX + (activeApexX < activeBase / 2 ? 10 : -10)} ${pFootY - 10} L ${pFootX} ${pFootY - 10}`}
                            fill="none"
                            stroke={c.heightColor}
                            strokeWidth="2"
                          />
                        )}

                        {/* Badge de Altura con alto contraste */}
                        {(mode !== 'descubrimiento' || heightDrawProgress > 0.4) && (
                          <g>
                            <rect
                              x={pCx + (activeApexX < activeBase / 2 ? 14 : -64)}
                              y={pCy + (activeHeight * cellSize) / 2 - 10}
                              width={52}
                              height={20}
                              rx={4}
                              fill={isDark ? '#1a0d18' : '#ffffff'}
                              stroke={c.heightColor}
                              strokeWidth="1.5"
                            />
                            <text
                              x={pCx + (activeApexX < activeBase / 2 ? 40 : -38)}
                              y={pCy + (activeHeight * cellSize) / 2 + 4}
                              textAnchor="middle"
                              fill={c.heightColor}
                              fontSize="11"
                              fontWeight="black"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              h = {activeHeight} u
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* Línea guía en Modo Cavalieri */}
                    {mode === 'cavalieri' && (
                      <g>
                        <line
                          x1={0}
                          y1={pCy}
                          x2={canvasDims.width}
                          y2={pCy}
                          stroke="#f59e0b"
                          strokeWidth="1.8"
                          strokeDasharray="6 4"
                        />
                        <text
                          x={canvasDims.width - 15}
                          y={pCy - 8}
                          textAnchor="end"
                          fill="#f59e0b"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          h = {activeHeight} u constante
                        </text>
                      </g>
                    )}

                    {/* Recorrido de Perímetro */}
                    {isPerimeterActive && (
                      <g>
                        {currentDist > 0 && (
                          <line
                            x1={pAx}
                            y1={pAy}
                            x2={currentDist <= lenAB ? tipX : pBx}
                            y2={currentDist <= lenAB ? tipY : pBy}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {currentDist > lenAB && (
                          <line
                            x1={pBx}
                            y1={pBy}
                            x2={currentDist <= lenAB + lenBC ? tipX : pCx}
                            y2={currentDist <= lenAB + lenBC ? tipY : pCy}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {currentDist > lenAB + lenBC && (
                          <line
                            x1={pCx}
                            y1={pCy}
                            x2={tipX}
                            y2={tipY}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {isPerimeterAnimating && (
                          <g>
                            <circle cx={tipX} cy={tipY} r="7" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                            <text
                              x={tipX}
                              y={tipY - 12}
                              textAnchor="middle"
                              fill="#f59e0b"
                              fontSize="11"
                              fontWeight="black"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {currentDist.toFixed(1)} u
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* Vértices A, B, C */}
                    <g>
                      <circle cx={pAx} cy={pAy} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                      <text x={pAx - 12} y={pAy + 4} fill={isDark ? '#93c5fd' : '#1d4ed8'} fontSize="11" fontWeight="bold">
                        A
                      </text>

                      <circle cx={pBx} cy={pBy} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                      <text x={pBx + 10} y={pBy + 4} fill={isDark ? '#93c5fd' : '#1d4ed8'} fontSize="11" fontWeight="bold">
                        B
                      </text>

                      <circle cx={pCx} cy={pCy} r="6" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={whyStep !== 'idle' ? pCx + 11 : pCx}
                        y={whyStep !== 'idle' ? pCy - 4 : pCy - 10}
                        textAnchor={whyStep !== 'idle' ? 'start' : 'middle'}
                        fill="#ec4899"
                        fontSize="12"
                        fontWeight="black"
                      >
                        C
                      </text>
                    </g>

                    {/* ══════════════════════════════════════════════════════════
                        4. PANEL DEDUCTIVO DEL ÁREA CON TILDES
                        Área triángulo = (área rectángulo)/2 = (b × h)/2
                        Solución
                        Área triángulo = (6 × 4)/2 = 24/2 = 12 u²
                    ══════════════════════════════════════════════════════════ */}
                    {mode === 'descubrimiento' && showDeductionCard && (
                      <g
                        opacity={cardOpacity}
                        transform={`translate(${
                          canvasDims.width >= 620
                            ? Math.max(pBx + 24, canvasDims.width - 325)
                            : Math.max(10, (canvasDims.width - 310) / 2)
                        }, ${
                          canvasDims.width >= 620
                            ? Math.max(16, pCy - 15)
                            : 16
                        })`}
                      >
                        {/* Tarjeta con sombra */}
                        <rect
                          x="0"
                          y="0"
                          width="306"
                          height="146"
                          rx="8"
                          fill={isDark ? '#0f172a' : '#ffffff'}
                          stroke={isDark ? '#38bdf8' : '#0284c7'}
                          strokeWidth="2"
                        />

                        {/* Fila 1: Área triángulo = (área rectángulo)/2 = (b × h)/2 */}
                        <g transform="translate(14, 34)">
                          <text x="0" y="0" fill={c.svgTextColor} fontSize="12" fontWeight="bold" fontFamily="serif, Times New Roman">
                            Área triángulo =
                          </text>

                          {/* Fracción 1: área rectángulo / 2 */}
                          <g transform="translate(144, 0)">
                            <text x="0" y="-8" textAnchor="middle" fill={c.svgTextColor} fontSize="11" fontStyle="italic" fontFamily="serif, Times New Roman">
                              área rectángulo
                            </text>
                            <line x1="-50" y1="-4" x2="50" y2="-4" stroke={c.svgTextColor} strokeWidth="1.5" />
                            <text x="0" y="10" textAnchor="middle" fill={c.svgTextColor} fontSize="11" fontFamily="serif, Times New Roman">
                              2
                            </text>
                          </g>

                          <text x="204" y="0" fill={c.svgTextColor} fontSize="12" fontWeight="bold" fontFamily="serif, Times New Roman">
                            =
                          </text>

                          {/* Fracción 2: b × h / 2 */}
                          <g transform="translate(238, 0)">
                            <text x="0" y="-8" textAnchor="middle" fill={c.svgTextColor} fontSize="11" fontStyle="italic" fontFamily="serif, Times New Roman">
                              b × h
                            </text>
                            <line x1="-20" y1="-4" x2="20" y2="-4" stroke={c.svgTextColor} strokeWidth="1.5" />
                            <text x="0" y="10" textAnchor="middle" fill={c.svgTextColor} fontSize="11" fontFamily="serif, Times New Roman">
                              2
                            </text>
                          </g>
                        </g>

                        {/* Fila 2: Solución */}
                        <text
                          x="14"
                          y="76"
                          fill={c.svgTextColor}
                          fontSize="13"
                          fontWeight="bold"
                          fontFamily="serif, Times New Roman"
                        >
                          Solución
                        </text>

                        {/* Fila 3: Área triángulo = (6 × 4)/2 = 24/2 = 12 u² */}
                        <g transform="translate(14, 114)">
                          <text x="0" y="0" fill={c.svgTextColor} fontSize="12" fontWeight="bold" fontFamily="serif, Times New Roman">
                            Área triángulo =
                          </text>

                          {/* Fracción (base × height) / 2 */}
                          <g transform="translate(122, 0)">
                            <text x="0" y="-8" textAnchor="middle" fill={c.svgTextColor} fontSize="12" fontFamily="serif, Times New Roman">
                              {base} × {height}
                            </text>
                            <line x1="-20" y1="-4" x2="20" y2="-4" stroke={c.svgTextColor} strokeWidth="1.5" />
                            <text x="0" y="10" textAnchor="middle" fill={c.svgTextColor} fontSize="12" fontFamily="serif, Times New Roman">
                              2
                            </text>
                          </g>

                          <text x="150" y="0" fill={c.svgTextColor} fontSize="12" fontWeight="bold" fontFamily="serif, Times New Roman">
                            =
                          </text>

                          {/* Fracción (base*height) / 2 */}
                          <g transform="translate(178, 0)">
                            <text x="0" y="-8" textAnchor="middle" fill={c.svgTextColor} fontSize="12" fontFamily="serif, Times New Roman">
                              {rectArea1}
                            </text>
                            <line x1="-16" y1="-4" x2="16" y2="-4" stroke={c.svgTextColor} strokeWidth="1.5" />
                            <text x="0" y="10" textAnchor="middle" fill={c.svgTextColor} fontSize="12" fontFamily="serif, Times New Roman">
                              2
                            </text>
                          </g>

                          {/* = 12 u² */}
                          <text
                            x="202"
                            y="0"
                            fill={isDark ? '#38bdf8' : '#0284c7'}
                            fontSize="13"
                            fontWeight="bold"
                            fontFamily="serif, Times New Roman"
                          >
                            = {area1} u²
                          </text>
                        </g>
                      </g>
                    )}

                    {/* HUD EN MODO RETOS */}
                    {mode === 'retos' && (
                      <g transform="translate(14, 18)">
                        <rect
                          x="0"
                          y="0"
                          width="170"
                          height="74"
                          rx="6"
                          fill={isDark ? '#0f172a' : '#ffffff'}
                          stroke={isDark ? '#334155' : '#cbd5e1'}
                          strokeWidth="1"
                        />
                        <text x="10" y="16" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" fontWeight="bold">
                          Tu Triángulo actual:
                        </text>
                        <text
                          x="10"
                          y="34"
                          fill={isAreaMatch ? '#10b981' : isDark ? '#60a5fa' : '#2563eb'}
                          fontSize="11"
                          fontWeight="black"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Área: {retoArea} u² {isAreaMatch ? '✓' : `(meta: ${currentChallenge.targetArea})`}
                        </text>
                        <text
                          x="10"
                          y="50"
                          fill={isBaseMatch && isHeightMatch ? '#10b981' : c.textMuted}
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Base: {retoBase} u | Altura: {retoHeight} u
                        </text>
                        <text
                          x="10"
                          y="66"
                          fill={isTypeMatch ? '#10b981' : '#f59e0b'}
                          fontSize="10"
                          fontWeight="bold"
                        >
                          Tipo: {currentRetoType} {isTypeMatch ? '✓' : ''}
                        </text>
                      </g>
                    )}

                    {/* CELEBRACIÓN DE RETO CUMPLIDO */}
                    {mode === 'retos' && isCurrentChallengeSolved && (
                      <g transform={`translate(${canvasDims.width / 2}, ${canvasDims.height - 30})`}>
                        <rect
                          x="-140"
                          y="-14"
                          width="280"
                          height="28"
                          rx="6"
                          fill="#065f46"
                          stroke="#34d399"
                          strokeWidth="1.5"
                        />
                        <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">
                          🎉 ¡RETO #{currentChallenge.id} SUPERADO CON ÉXITO!
                        </text>
                      </g>
                    )}
                  </g>
                )
              })()}
            </svg>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Fórmulas Pedagógicas (40-48px) ────── */}
      <footer
        className={`h-10 lg:h-12 shrink-0 border-t px-2 sm:px-3 lg:px-4 flex items-center justify-between gap-2 text-xs lg:text-sm ${c.headerBg} ${c.cardBorder}`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap">
          {mode === 'descubrimiento' ? (
            <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm">
              {/* Área / Superficie */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Área:</span>
                {showDeductionCard ? (
                  <>
                    <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                      (b × h) ÷ 2 = ({base} × {height}) ÷ 2 =
                    </span>
                    <span
                      className={`font-black px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {area1} u²
                    </span>
                  </>
                ) : isSuperficieActive ? (
                  <span className="font-sans text-xs text-blue-400 font-bold">
                    Superficie interna resaltada (pulsa «Área» para ver el cálculo deductivo)
                  </span>
                ) : whyStep === 'paused_grid' ? (
                  <span className="font-sans text-xs text-emerald-400 font-bold">
                    Rectángulo = {rectArea1} u² • Pulsa «Continuar» para trazar base, altura y resolver
                  </span>
                ) : (
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded border ${
                      isDark ? 'text-white/40 bg-white/5 border-white/10' : 'text-slate-400 bg-slate-100 border-slate-300'
                    }`}
                  >
                    ? u²
                  </span>
                )}
              </div>

              <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>

              {/* Perímetro */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Perímetro:</span>
                {isPerimeterActive ? (
                  <>
                    <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                      a + b + c = {sideA.toFixed(1)} + {sideB} + {sideC.toFixed(1)} =
                    </span>
                    <span
                      className={`font-black px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isPerimeterAnimating ? `${((perimeterProgress / 100) * perimeter1).toFixed(1)} u` : `${perimeter1.toFixed(1)} u`}
                    </span>
                  </>
                ) : (
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded border ${
                      isDark ? 'text-white/40 bg-white/5 border-white/10' : 'text-slate-400 bg-slate-100 border-slate-300'
                    }`}
                  >
                    ? u
                  </span>
                )}
              </div>
            </div>
          ) : mode === 'cavalieri' ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Principio de Cavalieri:
              </span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                Área = (6 × 4) ÷ 2 = <strong>12 u²</strong> fija. Al mover el vértice, los lados cambian pero el área NO.
              </span>
            </div>
          ) : mode === 'tipos' ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className={`font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                Regla de la Altura:
              </span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                La altura (h) SIEMPRE forma un ángulo de 90° con la recta base, esté dentro o fuera de la figura.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Área actual:</span>
                <span>({retoBase} × {retoHeight}) ÷ 2 = {retoArea} u²</span>
                <span
                  className={`font-bold text-xs px-1.5 py-0.2 rounded ${
                    isAreaMatch ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                  }`}
                >
                  {isAreaMatch ? '¡Coincide!' : `Meta: ${currentChallenge.targetArea} u²`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botón de reinicio */}
        <button
          type="button"
          onClick={() => {
            if (mode === 'descubrimiento') handleResetMode1()
            else if (mode === 'cavalieri') setCavalieriX(3)
            else if (mode === 'retos') {
              setRetoBase(6)
              setRetoHeight(3)
              setRetoApexOffset(3)
            }
          }}
          className={`h-7 w-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all shrink-0 ${c.btnGhost}`}
          title="Reiniciar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </footer>

      {/* Modal Pedagógico de Ayuda */}
      <ModalHelp
        open={showHelp}
        title="¿Cómo se calcula el Área de un Triángulo?"
        onClose={() => setShowHelp(false)}
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed">
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2.5">
            <h4 className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
              <span>📐 1. ¿Por qué la fórmula es (Base × Altura) ÷ 2?</span>
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              Cualquier triángulo es exactamente la <strong>mitad de un rectángulo</strong>
              con su misma base y su misma altura.
            </p>
            <p className="mt-1 font-mono text-[11px] text-purple-600 dark:text-purple-300">
              Usa el botón <strong>«Área»</strong> para ver cómo se encierra el triángulo en una cuadrícula completa de b × h, y cómo el triángulo ocupa la mitad de esa cuadrícula.
            </p>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
            <h4 className="font-bold text-rose-500 mb-1 flex items-center gap-1.5">
              <span>📏 2. ¿Qué es la Altura (h)?</span>
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              La <strong>altura no es un lado inclinado</strong>. Es el segmento perpendicular (que forma un ángulo de 90°)
              trazado desde la base hasta el vértice más alto opuesto.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-1.5">
              <span>🔄 3. Principio de Cavalieri</span>
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              Si deslizas el vértice superior horizontalmente sin cambiar la altura ni la base,
              el triángulo cambia de forma (acutángulo, rectángulo u obtusángulo), ¡pero su <strong>área se mantiene idéntica</strong>!
            </p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
