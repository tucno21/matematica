import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  Maximize2,
  Eraser,
  Grid,
  Award,
  Layers,
  Square,
  Sparkles,
  Lightbulb,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ── Modos de la vista ──
type ViewMode = 'explorador' | 'dibujo' | 'comparador' | 'retos'

// ── Retos Prediseñados ──
interface Challenge {
  id: number
  title: string
  instruction: string
  targetArea?: number
  targetPerimeter?: number
  isSquare?: boolean
  hint: string
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: 'Reto 1: Rectángulo Básico',
    instruction: 'Construye un rectángulo con Área = 12 u² y Perímetro = 14 u',
    targetArea: 12,
    targetPerimeter: 14,
    hint: 'Busca dos números que multiplicados den 12 y sumados den 7 (la mitad de 14). ¡Prueba 4 × 3 o 3 × 4!'
  },
  {
    id: 2,
    title: 'Reto 2: Cuadrado Perfecto',
    instruction: 'Construye un cuadrado con Perímetro = 16 u',
    targetArea: 16,
    targetPerimeter: 16,
    isSquare: true,
    hint: 'Un cuadrado tiene 4 lados iguales. Si el perímetro total es 16, cada lado mide 16 ÷ 4 = 4 u.'
  },
  {
    id: 3,
    title: 'Reto 3: Mismo Número',
    instruction: 'Construye un rectángulo cuyo Área sea 18 u² y Perímetro sea 18 u',
    targetArea: 18,
    targetPerimeter: 18,
    hint: 'Prueba con base 6 y altura 3: Área = 6×3 = 18 u², y Perímetro = 2×(6+3) = 18 u.'
  },
  {
    id: 4,
    title: 'Reto 4: Máxima Área',
    instruction: 'Con un Perímetro = 20 u, construye la figura con la MAYOR área posible',
    targetArea: 25,
    targetPerimeter: 20,
    isSquare: true,
    hint: 'El rectángulo que encierra la mayor área con un perímetro fijo es un CUADRADO. Base y altura deben ser 5 u (5 × 5 = 25 u²).'
  },
  {
    id: 5,
    title: 'Reto 5: Rectángulo Fino',
    instruction: 'Construye un rectángulo con Área = 8 u² pero con un Perímetro grande de 18 u',
    targetArea: 8,
    targetPerimeter: 18,
    hint: 'Las figuras largas y delgadas tienen gran perímetro y poca área. Prueba base 8 y altura 1 (o al revés).'
  }
]

export default function AreaPerimetroView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // ── Modo Activo ──
  const [mode, setMode] = useState<ViewMode>('explorador')
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // ── MODO 1: Explorador de Rectángulo ──
  const [base, setBase] = useState<number>(5)
  const [height, setHeight] = useState<number>(3)

  // Estados interactivos: al inicio NO hay divisiones ni resultados numéricos
  const [isPerimeterActive, setIsPerimeterActive] = useState<boolean>(false)
  const [isPerimeterAnimating, setIsPerimeterAnimating] = useState<boolean>(false)
  const [perimeterProgress, setPerimeterProgress] = useState<number>(0) // 0 a 100

  // Animación didáctica del Área en 3 fases:
  // 1. 'horizontal': se trazan las líneas horizontales
  // 2. 'vertical': se trazan las líneas verticales formando la cuadrícula
  // 3. 'coloring': se colorea y numera cada baldosa una a una con calma
  // 4. 'done': cuadrícula completamente coloreada y calculada
  type AreaPhase = 'idle' | 'horizontal' | 'vertical' | 'coloring' | 'done'
  const [areaPhase, setAreaPhase] = useState<AreaPhase>('idle')
  const [isAreaActive, setIsAreaActive] = useState<boolean>(false)
  const [isAreaAnimating, setIsAreaAnimating] = useState<boolean>(false)
  const [horizLineProgress, setHorizLineProgress] = useState<number>(0) // 0 a 1
  const [vertLineProgress, setVertLineProgress] = useState<number>(0)   // 0 a 1
  const [visibleTilesCount, setVisibleTilesCount] = useState<number>(0)

  const [isUnrolled, setIsUnrolled] = useState<boolean>(false)

  // Referencias para animaciones fluidas
  const perimeterAnimRef = useRef<number | null>(null)
  const areaAnimRef = useRef<number | null>(null)

  // Iniciar animación secuencial del Perímetro (recorrido pausado para poder seguirlo)
  const handleStartPerimeter = useCallback(() => {
    if (perimeterAnimRef.current) cancelAnimationFrame(perimeterAnimRef.current)
    setIsPerimeterActive(true)
    setIsPerimeterAnimating(true)
    setPerimeterProgress(0)

    const startTime = performance.now()
    // 5 segundos completos para recorrer con tranquilidad los 4 lados
    const duration = 5000

    const step = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(100, (elapsed / duration) * 100)
      setPerimeterProgress(p)
      if (p < 100) {
        perimeterAnimRef.current = requestAnimationFrame(step)
      } else {
        setIsPerimeterAnimating(false)
        perimeterAnimRef.current = null
      }
    }
    perimeterAnimRef.current = requestAnimationFrame(step)
  }, [])

  // Iniciar animación pedagógica del Área en 3 fases continuas
  const handleStartArea = useCallback(() => {
    if (areaAnimRef.current) cancelAnimationFrame(areaAnimRef.current)
    setIsAreaActive(true)
    setIsAreaAnimating(true)
    setAreaPhase('horizontal')
    setHorizLineProgress(0)
    setVertLineProgress(0)
    setVisibleTilesCount(0)

    const totalTiles = base * height
    // Fase 1: Líneas horizontales (1.3s)
    const HORIZ_DURATION = height > 1 ? 1300 : 200
    // Fase 2: Líneas verticales (1.3s) -> con esto queda armada la cuadrícula
    const VERT_DURATION = base > 1 ? 1300 : 200
    // Fase 3: Coloreado cuadrado por cuadrado (ritmo pausado para contar uno a uno)
    const TILE_DURATION = Math.max(160, Math.min(260, 4200 / totalTiles))
    const COLORING_DURATION = totalTiles * TILE_DURATION
    const totalDuration = HORIZ_DURATION + VERT_DURATION + COLORING_DURATION

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime

      if (elapsed < HORIZ_DURATION) {
        // ── Fase 1: Trazado de líneas horizontales ──
        setAreaPhase('horizontal')
        setHorizLineProgress(Math.min(1, elapsed / HORIZ_DURATION))
        setVertLineProgress(0)
        setVisibleTilesCount(0)
        areaAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < HORIZ_DURATION + VERT_DURATION) {
        // ── Fase 2: Trazado de líneas verticales (forma las cuadrículas) ──
        setAreaPhase('vertical')
        setHorizLineProgress(1)
        const vertElapsed = elapsed - HORIZ_DURATION
        setVertLineProgress(Math.min(1, vertElapsed / VERT_DURATION))
        setVisibleTilesCount(0)
        areaAnimRef.current = requestAnimationFrame(step)
      } else if (elapsed < totalDuration) {
        // ── Fase 3: Coloreado cuadrado por cuadrado con su número ──
        setAreaPhase('coloring')
        setHorizLineProgress(1)
        setVertLineProgress(1)
        const colorElapsed = elapsed - (HORIZ_DURATION + VERT_DURATION)
        const currentCount = Math.min(
          totalTiles,
          Math.max(1, Math.floor(colorElapsed / TILE_DURATION) + 1)
        )
        setVisibleTilesCount(currentCount)
        areaAnimRef.current = requestAnimationFrame(step)
      } else {
        // ── Finalizado: Toda la cuadrícula coloreada y numerada ──
        setAreaPhase('done')
        setHorizLineProgress(1)
        setVertLineProgress(1)
        setVisibleTilesCount(totalTiles)
        setIsAreaAnimating(false)
        areaAnimRef.current = null
      }
    }

    areaAnimRef.current = requestAnimationFrame(step)
  }, [base, height])

  // Reset al modificar dimensiones para obligar a redescubrir
  const handleBaseChange = useCallback((newBase: number) => {
    const val = Math.max(1, Math.min(10, newBase))
    setBase(val)
    if (perimeterAnimRef.current) cancelAnimationFrame(perimeterAnimRef.current)
    if (areaAnimRef.current) cancelAnimationFrame(areaAnimRef.current)
    setIsPerimeterActive(false)
    setIsPerimeterAnimating(false)
    setPerimeterProgress(0)
    setIsAreaActive(false)
    setIsAreaAnimating(false)
    setAreaPhase('idle')
    setHorizLineProgress(0)
    setVertLineProgress(0)
    setVisibleTilesCount(0)
    setIsUnrolled(false)
  }, [])

  const handleHeightChange = useCallback((newHeight: number) => {
    const val = Math.max(1, Math.min(8, newHeight))
    setHeight(val)
    if (perimeterAnimRef.current) cancelAnimationFrame(perimeterAnimRef.current)
    if (areaAnimRef.current) cancelAnimationFrame(areaAnimRef.current)
    setIsPerimeterActive(false)
    setIsPerimeterAnimating(false)
    setPerimeterProgress(0)
    setIsAreaActive(false)
    setIsAreaAnimating(false)
    setAreaPhase('idle')
    setHorizLineProgress(0)
    setVertLineProgress(0)
    setVisibleTilesCount(0)
    setIsUnrolled(false)
  }, [])

  const handleResetExplorer = useCallback(() => {
    if (perimeterAnimRef.current) cancelAnimationFrame(perimeterAnimRef.current)
    if (areaAnimRef.current) cancelAnimationFrame(areaAnimRef.current)
    setIsPerimeterActive(false)
    setIsPerimeterAnimating(false)
    setPerimeterProgress(0)
    setIsAreaActive(false)
    setIsAreaAnimating(false)
    setAreaPhase('idle')
    setHorizLineProgress(0)
    setVertLineProgress(0)
    setVisibleTilesCount(0)
    setIsUnrolled(false)
  }, [])

  // ── MODO 2: Dibujo Libre en Cuadrícula ──
  const GRID_COLS = 12
  const GRID_ROWS = 8
  const [paintedCells, setPaintedCells] = useState<Set<string>>(() => {
    // Figura inicial en forma de L
    const initial = new Set<string>()
    for (let r = 2; r <= 5; r++) initial.add(`3,${r}`)
    for (let c = 3; c <= 6; c++) initial.add(`${c},5`)
    return initial
  })
  const [isPainting, setIsPainting] = useState<boolean>(false)
  const [paintTool, setPaintTool] = useState<'add' | 'erase'>('add')

  // ── MODO 3: Comparador (Mismo P o Misma A) ──
  const [compareCriteria, setCompareCriteria] = useState<'fixedP' | 'fixedA'>('fixedP')
  const [fixedPerimeterValue, setFixedPerimeterValue] = useState<number>(16)
  const [fixedAreaValue, setFixedAreaValue] = useState<number>(12)
  const [compareIndex, setCompareIndex] = useState<number>(0)

  // ── MODO 4: Retos Interactivos ──
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState<number>(0)
  const [retoBase, setRetoBase] = useState<number>(3)
  const [retoHeight, setRetoHeight] = useState<number>(2)
  const [showHint, setShowHint] = useState<boolean>(false)
  const [completedChallenges, setCompletedChallenges] = useState<Set<number>>(() => new Set())

  // ── Dimensiones del Contenedor SVG ──
  const svgContainerRef = useRef<HTMLDivElement | null>(null)
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 600, height: 400 })

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

  // ── Cálculos de Modo 1: Rectángulo ──
  const area1 = base * height
  const perim1 = 2 * (base + height)

  // ── Cálculos de Modo 2: Cuadrícula Libre ──
  const freeShapeStats = useMemo(() => {
    const cells = Array.from(paintedCells).map(k => {
      const [c, r] = k.split(',').map(Number)
      return { c, r }
    })
    const area = cells.length

    // El perímetro es la suma de aristas expuestas
    let perimeter = 0
    const edgeSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    for (const { c, r } of cells) {
      if (!paintedCells.has(`${c},${r - 1}`)) {
        perimeter++
        edgeSegments.push({ x1: c, y1: r, x2: c + 1, y2: r })
      }
      if (!paintedCells.has(`${c + 1},${r}`)) {
        perimeter++
        edgeSegments.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 })
      }
      if (!paintedCells.has(`${c},${r + 1}`)) {
        perimeter++
        edgeSegments.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 })
      }
      if (!paintedCells.has(`${c - 1},${r}`)) {
        perimeter++
        edgeSegments.push({ x1: c, y1: r, x2: c, y2: r + 1 })
      }
    }

    return { area, perimeter, edgeSegments, cells }
  }, [paintedCells])

  // ── Opciones de Comparador ──
  const compareOptions = useMemo(() => {
    if (compareCriteria === 'fixedP') {
      const sum = Math.floor(fixedPerimeterValue / 2)
      const list: Array<{ b: number; h: number; a: number; p: number }> = []
      for (let b = 1; b < sum; b++) {
        const h = sum - b
        if (b <= h) {
          list.push({ b, h, a: b * h, p: fixedPerimeterValue })
        }
      }
      return list
    } else {
      const list: Array<{ b: number; h: number; a: number; p: number }> = []
      for (let b = 1; b <= fixedAreaValue; b++) {
        if (fixedAreaValue % b === 0) {
          const h = fixedAreaValue / b
          if (b <= h) {
            list.push({ b, h, a: fixedAreaValue, p: 2 * (b + h) })
          }
        }
      }
      return list
    }
  }, [compareCriteria, fixedPerimeterValue, fixedAreaValue])

  // ── Comprobación de Retos en Tiempo Real ──
  const currentChallenge = CHALLENGES[currentChallengeIdx]
  const retoArea = retoBase * retoHeight
  const retoPerim = 2 * (retoBase + retoHeight)

  const isAreaMatch = currentChallenge.targetArea ? retoArea === currentChallenge.targetArea : true
  const isPerimMatch = currentChallenge.targetPerimeter ? retoPerim === currentChallenge.targetPerimeter : true
  const isSquareMatch = currentChallenge.isSquare ? retoBase === retoHeight : true

  const isCurrentChallengeSolved = isAreaMatch && isPerimMatch && isSquareMatch

  // Registrar éxito automáticamente al resolverlo
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

  // Manejo de dimensiones en Retos
  const handleRetoBaseChange = (delta: number) => {
    setRetoBase(prev => Math.max(1, Math.min(10, prev + delta)))
  }
  const handleRetoHeightChange = (delta: number) => {
    setRetoHeight(prev => Math.max(1, Math.min(8, prev + delta)))
  }

  // ── Manejo de Celdas en Modo Dibujo ──
  const toggleCell = (c: number, r: number) => {
    const key = `${c},${r}`
    setPaintedCells(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handlePointerDownCell = (c: number, r: number) => {
    setIsPainting(true)
    const key = `${c},${r}`
    const willAdd = !paintedCells.has(key)
    setPaintTool(willAdd ? 'add' : 'erase')
    toggleCell(c, r)
  }

  const handlePointerEnterCell = (c: number, r: number) => {
    if (!isPainting) return
    const key = `${c},${r}`
    setPaintedCells(prev => {
      const next = new Set(prev)
      if (paintTool === 'add') next.add(key)
      else next.delete(key)
      return next
    })
  }

  const clearDrawing = () => {
    setPaintedCells(new Set())
  }

  const loadPresetShape = (type: 'cuadrado' | 'cruz' | 'escalera' | 'hueco') => {
    const s = new Set<string>()
    if (type === 'cuadrado') {
      for (let c = 4; c <= 7; c++) {
        for (let r = 2; r <= 5; r++) s.add(`${c},${r}`)
      }
    } else if (type === 'cruz') {
      for (let r = 2; r <= 6; r++) s.add(`5,${r}`)
      for (let c = 3; c <= 7; c++) s.add(`${c},4`)
    } else if (type === 'escalera') {
      for (let c = 3; c <= 7; c++) {
        for (let r = 7 - (c - 3); r <= 6; r++) s.add(`${c},${r}`)
      }
    } else if (type === 'hueco') {
      for (let c = 4; c <= 7; c++) {
        for (let r = 2; r <= 5; r++) {
          if (!(c >= 5 && c <= 6 && r >= 3 && r <= 4)) {
            s.add(`${c},${r}`)
          }
        }
      }
    }
    setPaintedCells(s)
  }

  // ── Paleta de Colores Adaptativa (Alto Contraste Claro / Oscuro) ──
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    cardBg: isDark ? 'bg-[#10172b]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-300',
    toolbarBg: isDark ? 'bg-[#0d1424] border-white/5' : 'bg-slate-100 border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-800',
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
    gridDot: isDark ? '#26385a' : '#94a3b8',
    // Colores pedagógicos sólidos
    areaColor: '#3b82f6',
    areaTileBorder: '#1d4ed8',
    perimeterColor: '#f59e0b',
    perimeterFence: '#d97706',
  }

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden select-none ${c.bg} ${c.text}`}
      onPointerUp={() => setIsPainting(false)}
      onPointerCancel={() => setIsPainting(false)}
    >
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
            <Square className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Área y Perímetro</span>
          </h1>
        </div>

        {/* Pestañas de Modos con alto contraste */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-lg border text-[11px] lg:text-xs ${
            isDark ? 'bg-black/30 border-white/10' : 'bg-slate-200/80 border-slate-300'
          }`}
        >
          <button
            onClick={() => setMode('explorador')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'explorador'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">Rectángulo</span>
            <span className="sm:hidden">1</span>
          </button>

          <button
            onClick={() => setMode('dibujo')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'dibujo'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Grid className="h-3 w-3" />
            <span className="hidden sm:inline">Cuadrícula Libre</span>
            <span className="sm:hidden">2</span>
          </button>

          <button
            onClick={() => setMode('comparador')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1 ${
              mode === 'comparador'
                ? 'bg-purple-600 text-white shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span className="hidden sm:inline">Comparador</span>
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
        {/* ── MODO 1: EXPLORADOR ── */}
        {mode === 'explorador' && (
          <div className="flex items-center justify-between w-full gap-2">
            {/* Controles de Base y Altura */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Control Base */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Base (b):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBaseChange(base - 1)}
                    disabled={base <= 1}
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
                    onClick={() => handleBaseChange(base + 1)}
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

              {/* Control Altura */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Altura (h):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleHeightChange(height - 1)}
                    disabled={height <= 1}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                    }`}
                  >
                    -
                  </button>
                  <span
                    className={`font-mono font-black text-xs px-1.5 py-0.5 rounded min-w-[26px] text-center ${
                      isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {height} u
                  </span>
                  <button
                    type="button"
                    onClick={() => handleHeightChange(height + 1)}
                    disabled={height >= 8}
                    className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                      isDark
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* BOTONES PRINCIPALES: PERÍMETRO Y ÁREA DINÁMICOS */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleStartPerimeter}
                disabled={isPerimeterAnimating}
                className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all ${
                  isPerimeterActive
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title="Trazar el contorno perimetral en secuencia"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Perímetro</span>
              </button>

              <button
                type="button"
                onClick={handleStartArea}
                disabled={isAreaAnimating}
                className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all ${
                  isAreaActive
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title="Dibujar las cuadrículas unitarias de forma dinámica"
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Área</span>
              </button>

              {(isPerimeterActive || isAreaActive) && (
                <button
                  type="button"
                  onClick={handleResetExplorer}
                  className={`px-2 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white/80'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                  }`}
                  title="Limpiar y volver al rectángulo sin datos"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── MODO 2: DIBUJO LIBRE ── */}
        {mode === 'dibujo' && (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                Toca o arrastra para dibujar:
              </span>
              <span className={`text-[10px] hidden sm:inline ${c.textMuted}`}>
                (Baldosas azules = Área | Bordes amarillos = Perímetro)
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`text-[10px] hidden md:inline ${c.textMuted}`}>Plantillas:</span>
              <button
                type="button"
                onClick={() => loadPresetShape('cruz')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${c.btnPreset}`}
              >
                Cruz
              </button>
              <button
                type="button"
                onClick={() => loadPresetShape('escalera')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${c.btnPreset}`}
              >
                Escalera
              </button>
              <button
                type="button"
                onClick={() => loadPresetShape('hueco')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${c.btnPreset}`}
              >
                Con Hueco
              </button>
              <button
                type="button"
                onClick={clearDrawing}
                className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border border-rose-500/30 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="h-3 w-3" />
                <span>Borrar</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MODO 3: COMPARADOR ── */}
        {mode === 'comparador' && (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Comparar con:</span>
              <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCompareCriteria('fixedP')
                    setCompareIndex(0)
                  }}
                  className={`px-2 py-0.5 font-bold cursor-pointer transition-colors ${
                    compareCriteria === 'fixedP'
                      ? 'bg-amber-500 text-slate-950'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mismo Perímetro ({fixedPerimeterValue} u)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompareCriteria('fixedA')
                    setCompareIndex(0)
                  }}
                  className={`px-2 py-0.5 font-bold cursor-pointer transition-colors ${
                    compareCriteria === 'fixedA'
                      ? 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Misma Área ({fixedAreaValue} u²)
                </button>
              </div>
            </div>

            {compareCriteria === 'fixedP' ? (
              <div className="flex items-center gap-1">
                <span className={c.textMuted}>Perímetro:</span>
                {[12, 16, 20, 24].map(pval => (
                  <button
                    key={`p-${pval}`}
                    type="button"
                    onClick={() => {
                      setFixedPerimeterValue(pval)
                      setCompareIndex(0)
                    }}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer transition-all ${
                      fixedPerimeterValue === pval
                        ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                        : isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {pval}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className={c.textMuted}>Área:</span>
                {[12, 16, 18, 24].map(aval => (
                  <button
                    key={`a-${aval}`}
                    type="button"
                    onClick={() => {
                      setFixedAreaValue(aval)
                      setCompareIndex(0)
                    }}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer transition-all ${
                      fixedAreaValue === aval
                        ? 'bg-blue-600 text-white ring-1 ring-blue-300'
                        : isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {aval}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODO 4: RETOS (CONTROLES DINÁMICOS COMPLETOS) ── */}
        {mode === 'retos' && (
          <div className="flex items-center justify-between w-full gap-2">
            {/* Selector de Reto con Estrellas */}
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Retos:</span>
              <div className="flex items-center gap-1">
                {CHALLENGES.map((ch, idx) => {
                  const isDone = completedChallenges.has(ch.id)
                  const isSelected = idx === currentChallengeIdx
                  return (
                    <button
                      key={`ch-btn-${ch.id}`}
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

            {/* Controles Interactivos de Base y Altura para el Reto */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Modificar Base */}
              <div className="flex items-center gap-1">
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Base:</span>
                <button
                  type="button"
                  onClick={() => handleRetoBaseChange(-1)}
                  disabled={retoBase <= 1}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                      : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'
                  }`}
                >
                  -
                </button>
                <span
                  className={`font-mono font-black text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center ${
                    isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                  }`}
                >
                  {retoBase}
                </span>
                <button
                  type="button"
                  onClick={() => handleRetoBaseChange(1)}
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

              {/* Modificar Altura */}
              <div className="flex items-center gap-1">
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Altura:</span>
                <button
                  type="button"
                  onClick={() => handleRetoHeightChange(-1)}
                  disabled={retoHeight <= 1}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                  }`}
                >
                  -
                </button>
                <span
                  className={`font-mono font-black text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {retoHeight}
                </span>
                <button
                  type="button"
                  onClick={() => handleRetoHeightChange(1)}
                  disabled={retoHeight >= 8}
                  className={`h-6 w-6 rounded font-black cursor-pointer transition-all active:scale-90 disabled:opacity-30 ${
                    isDark
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                  }`}
                >
                  +
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
                title="Ver pista didáctica"
              >
                <Lightbulb className="h-3 w-3" />
                <span className="hidden xs:inline">Pista</span>
              </button>

              {/* Botón Siguiente Reto */}
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
        {/* LIENZO PRINCIPAL SVG */}
        <main
          ref={svgContainerRef}
          className={`flex-1 min-w-0 min-h-0 flex flex-col rounded-xl border relative overflow-hidden ${c.cardBg} ${c.cardBorder}`}
          style={{ isolation: 'isolate' }}
        >
          {/* Sub-cabecera del lienzo con métricas y estado */}
          <div
            className={`flex h-7 shrink-0 items-center justify-between px-2 sm:px-3 border-b text-xs ${c.subBarBg}`}
          >
            {mode === 'retos' ? (
              /* En Modo Retos: Misión y estado en vivo */
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className={`font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Objetivo:
                  </span>
                  <span className={`font-bold truncate text-[11px] sm:text-xs ${c.text}`}>
                    {currentChallenge.instruction}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCurrentChallengeSolved ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-xs animate-pulse">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>¡Excelente! ¡Completado!</span>
                    </span>
                  ) : (
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-white/60' : 'bg-slate-200 text-slate-700'}`}>
                      Ajusta Base y Altura
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* En Otros Modos: Badges de Área y Perímetro */
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {/* Badge de Área */}
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
                    <span className={c.textMuted}>Área:</span>
                    {mode === 'dibujo' ? (
                      <span className="font-mono font-black text-blue-500 text-sm">
                        {freeShapeStats.area} u²
                      </span>
                    ) : isAreaActive ? (
                      <span className="font-mono font-black text-blue-500 text-sm animate-pulse">
                        {areaPhase === 'horizontal'
                          ? '1. Trazando líneas horizontales...'
                          : areaPhase === 'vertical'
                          ? '2. Trazando líneas verticales (cuadrícula)...'
                          : areaPhase === 'coloring'
                          ? `3. Baldosas: ${visibleTilesCount} de ${area1} u²`
                          : `${area1} u²`}
                      </span>
                    ) : (
                      <span className={`font-mono font-bold text-xs px-1 rounded ${isDark ? 'text-white/40 bg-white/5' : 'text-slate-400 bg-slate-200'}`}>
                        ? (pulsa Área)
                      </span>
                    )}
                  </div>

                  {/* Badge de Perímetro */}
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-500 shrink-0" />
                    <span className={c.textMuted}>Perímetro:</span>
                    {mode === 'dibujo' ? (
                      <span className="font-mono font-black text-amber-500 text-sm">
                        {freeShapeStats.perimeter} u
                      </span>
                    ) : isPerimeterActive ? (
                      <span className="font-mono font-black text-amber-500 text-sm animate-pulse">
                        {isPerimeterAnimating
                          ? `Recorriendo contorno: ${((perimeterProgress / 100) * perim1).toFixed(0)} de ${perim1} u`
                          : `${perim1} u`}
                      </span>
                    ) : (
                      <span className={`font-mono font-bold text-xs px-1 rounded ${isDark ? 'text-white/40 bg-white/5' : 'text-slate-400 bg-slate-200'}`}>
                        ? (pulsa Perímetro)
                      </span>
                    )}
                  </div>
                </div>

                {mode === 'explorador' && isUnrolled && (
                  <span className="text-[11px] font-bold text-purple-400">
                    Cerca desenrollada = Longitud lineal recta
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Banner desplegable de Pista en Retos */}
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

          {/* SVG Canvas Adaptativo 100% Sólido sin Filtros Mali Bug */}
          <div className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden p-0">
            <svg
              viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
              className="w-full h-full block"
              style={{ touchAction: 'none' }}
            >
              {/* Fondo del lienzo */}
              <rect x="0" y="0" width={canvasDims.width} height={canvasDims.height} fill={c.svgBg} />

              {/* ══════════════════════════════════════════════════════════════
                  MODO 1: EXPLORADOR DE RECTÁNGULO
              ══════════════════════════════════════════════════════════════ */}
              {mode === 'explorador' && (() => {
                const maxW = canvasDims.width - 120
                const maxH = canvasDims.height - 110
                const cellSize = Math.max(22, Math.min(50, Math.floor(Math.min(maxW / base, maxH / height))))

                const rectW = base * cellSize
                const rectH = height * cellSize
                const startX = (canvasDims.width - rectW) / 2
                const startY = (canvasDims.height - rectH) / 2 + 10

                // Recorrido secuencial del perímetro
                const perimeterLen = 2 * (base + height)
                const d = (perimeterProgress / 100) * perimeterLen

                const len1 = Math.min(base, d)
                const len2 = Math.min(height, Math.max(0, d - base))
                const len3 = Math.min(base, Math.max(0, d - (base + height)))
                const len4 = Math.min(height, Math.max(0, d - (2 * base + height)))

                let tipX = startX
                let tipY = startY
                if (d <= base) {
                  tipX = startX + (d / base) * rectW
                  tipY = startY
                } else if (d <= base + height) {
                  tipX = startX + rectW
                  tipY = startY + ((d - base) / height) * rectH
                } else if (d <= 2 * base + height) {
                  tipX = startX + rectW - ((d - (base + height)) / base) * rectW
                  tipY = startY + rectH
                } else {
                  tipX = startX
                  tipY = startY + rectH - ((d - (2 * base + height)) / height) * rectH
                }

                return (
                  <g>
                    {/* Cuadrícula de fondo suave */}
                    <g opacity={isDark ? '0.25' : '0.45'}>
                      {Array.from({ length: 25 }, (_, i) => i * 30).map(x => (
                        <line key={`bg-vx-${x}`} x1={x} y1="0" x2={x} y2={canvasDims.height} stroke={c.gridLine} strokeWidth="1" />
                      ))}
                      {Array.from({ length: 20 }, (_, i) => i * 30).map(y => (
                        <line key={`bg-hy-${y}`} x1="0" y1={y} x2={canvasDims.width} y2={y} stroke={c.gridLine} strokeWidth="1" />
                      ))}
                    </g>

                    {/* Sombra base del rectángulo */}
                    <rect
                      x={startX + 6}
                      y={startY + 6}
                      width={rectW}
                      height={rectH}
                      fill={isDark ? '#040711' : '#e2e8f0'}
                      rx={4}
                    />

                    {/* 1. RECTÁNGULO LIMPIO (Sin divisiones ni relleno de cuadrícula al inicio) */}
                    <rect
                      x={startX}
                      y={startY}
                      width={rectW}
                      height={rectH}
                      fill={isDark ? '#0f172a' : '#ffffff'}
                      stroke={isDark ? '#334155' : '#cbd5e1'}
                      strokeWidth="2"
                      rx={3}
                    />

                    {/* 2. DIBUJO DINÁMICO DE LAS CUADRÍCULAS EN 3 FASES */}
                    {isAreaActive && (
                      <g>
                        {/* Fase 1: Líneas horizontales trazadas de izquierda a derecha */}
                        {height > 1 && horizLineProgress > 0 && (
                          <g>
                            {Array.from({ length: height - 1 }, (_, i) => i + 1).map(r => {
                              const lineY = startY + r * cellSize
                              const lineEnd = startX + horizLineProgress * rectW
                              return (
                                <g key={`hline-${r}`}>
                                  <line
                                    x1={startX}
                                    y1={lineY}
                                    x2={lineEnd}
                                    y2={lineY}
                                    stroke={isDark ? '#38bdf8' : '#0284c7'}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  {areaPhase === 'horizontal' && horizLineProgress < 1 && (
                                    <circle
                                      cx={lineEnd}
                                      cy={lineY}
                                      r="3.5"
                                      fill="#38bdf8"
                                    />
                                  )}
                                </g>
                              )
                            })}
                          </g>
                        )}

                        {/* Fase 2: Líneas verticales trazadas de arriba a abajo (formando cuadrícula) */}
                        {base > 1 && vertLineProgress > 0 && (
                          <g>
                            {Array.from({ length: base - 1 }, (_, i) => i + 1).map(col => {
                              const lineX = startX + col * cellSize
                              const lineEnd = startY + vertLineProgress * rectH
                              return (
                                <g key={`vline-${col}`}>
                                  <line
                                    x1={lineX}
                                    y1={startY}
                                    x2={lineX}
                                    y2={lineEnd}
                                    stroke={isDark ? '#38bdf8' : '#0284c7'}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  {areaPhase === 'vertical' && vertLineProgress < 1 && (
                                    <circle
                                      cx={lineX}
                                      cy={lineEnd}
                                      r="3.5"
                                      fill="#38bdf8"
                                    />
                                  )}
                                </g>
                              )
                            })}
                          </g>
                        )}

                        {/* Fase 3: Coloreado cuadrado por cuadrado con su número */}
                        {visibleTilesCount > 0 && (
                          <g>
                            {Array.from({ length: visibleTilesCount }, (_, i) => {
                              const r = Math.floor(i / base)
                              const col = i % base
                              const cellX = startX + col * cellSize
                              const cellY = startY + r * cellSize
                              const tileIdx = i + 1
                              const isLatest = i === visibleTilesCount - 1 && areaPhase === 'coloring'

                              return (
                                <g key={`tile-${r}-${col}`}>
                                  <rect
                                    x={cellX}
                                    y={cellY}
                                    width={cellSize}
                                    height={cellSize}
                                    fill={c.areaColor}
                                    stroke={isLatest ? '#fbbf24' : c.areaTileBorder}
                                    strokeWidth={isLatest ? '2' : '1'}
                                  />
                                  {cellSize >= 20 && (
                                    <text
                                      x={cellX + cellSize / 2}
                                      y={cellY + cellSize / 2 + (cellSize >= 32 ? 4 : 3)}
                                      textAnchor="middle"
                                      fill="#ffffff"
                                      fontSize={cellSize >= 38 ? '13' : cellSize >= 28 ? '11' : '9'}
                                      fontWeight="bold"
                                      fontFamily="JetBrains Mono, monospace"
                                    >
                                      {tileIdx}
                                    </text>
                                  )}
                                </g>
                              )
                            })}
                          </g>
                        )}
                      </g>
                    )}

                    {/* 3. TRAZADO DINÁMICO SECUENCIAL DEL PERÍMETRO (Solo cuando se hace clic en Perímetro) */}
                    {isPerimeterActive && (
                      <g>
                        {/* Lados de la cerca animada */}
                        {len1 > 0 && (
                          <line
                            x1={startX}
                            y1={startY}
                            x2={startX + (len1 / base) * rectW}
                            y2={startY}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {len2 > 0 && (
                          <line
                            x1={startX + rectW}
                            y1={startY}
                            x2={startX + rectW}
                            y2={startY + (len2 / height) * rectH}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {len3 > 0 && (
                          <line
                            x1={startX + rectW}
                            y1={startY + rectH}
                            x2={startX + rectW - (len3 / base) * rectW}
                            y2={startY + rectH}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}
                        {len4 > 0 && (
                          <line
                            x1={startX}
                            y1={startY + rectH}
                            x2={startX}
                            y2={startY + rectH - (len4 / height) * rectH}
                            stroke={c.perimeterColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Postes en las esquinas */}
                        <circle cx={startX} cy={startY} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                        {d >= base && (
                          <circle cx={startX + rectW} cy={startY} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                        )}
                        {d >= base + height && (
                          <circle cx={startX + rectW} cy={startY + rectH} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                        )}
                        {d >= 2 * base + height && (
                          <circle cx={startX} cy={startY + rectH} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                        )}

                        {/* Marcador dinámico en la punta del trazado */}
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
                              {d.toFixed(1)} u
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* 4. MEDIDAS DE LOS LADOS (Base y Altura) */}
                    {/* Cota Superior: Base */}
                    <g>
                      <line x1={startX} y1={startY - 12} x2={startX + rectW} y2={startY - 12} stroke="#0284c7" strokeWidth="1.5" />
                      <line x1={startX} y1={startY - 17} x2={startX} y2={startY - 7} stroke="#0284c7" strokeWidth="1.5" />
                      <line x1={startX + rectW} y1={startY - 17} x2={startX + rectW} y2={startY - 7} stroke="#0284c7" strokeWidth="1.5" />
                      <rect
                        x={startX + rectW / 2 - 28}
                        y={startY - 25}
                        width={56}
                        height={18}
                        rx={4}
                        fill={isDark ? '#0a0f1d' : '#ffffff'}
                        stroke="#0284c7"
                        strokeWidth="1"
                      />
                      <text
                        x={startX + rectW / 2}
                        y={startY - 12}
                        textAnchor="middle"
                        fill={isDark ? '#38bdf8' : '#0284c7'}
                        fontWeight="black"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        b = {base} u
                      </text>
                    </g>

                    {/* Cota Derecha: Altura */}
                    <g>
                      <line x1={startX + rectW + 14} y1={startY} x2={startX + rectW + 14} y2={startY + rectH} stroke="#059669" strokeWidth="1.5" />
                      <line x1={startX + rectW + 9} y1={startY} x2={startX + rectW + 19} y2={startY} stroke="#059669" strokeWidth="1.5" />
                      <line x1={startX + rectW + 9} y1={startY + rectH} x2={startX + rectW + 19} y2={startY + rectH} stroke="#059669" strokeWidth="1.5" />
                      <rect
                        x={startX + rectW + 22}
                        y={startY + rectH / 2 - 10}
                        width={56}
                        height={20}
                        rx={4}
                        fill={isDark ? '#0a0f1d' : '#ffffff'}
                        stroke="#059669"
                        strokeWidth="1"
                      />
                      <text
                        x={startX + rectW + 50}
                        y={startY + rectH / 2 + 4}
                        textAnchor="middle"
                        fill={isDark ? '#34d399' : '#059669'}
                        fontWeight="black"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        h = {height} u
                      </text>
                    </g>
                  </g>
                )
              })()}

              {/* ══════════════════════════════════════════════════════════════
                  MODO 2: CUADRÍCULA LIBRE (GEOPLANO DE BALDOSAS)
              ══════════════════════════════════════════════════════════════ */}
              {mode === 'dibujo' && (() => {
                const marginX = 40
                const marginY = 30
                const cellW = (canvasDims.width - 2 * marginX) / GRID_COLS
                const cellH = (canvasDims.height - 2 * marginY) / GRID_ROWS
                const cellSize = Math.min(cellW, cellH)

                const startX = (canvasDims.width - GRID_COLS * cellSize) / 2
                const startY = (canvasDims.height - GRID_ROWS * cellSize) / 2

                return (
                  <g>
                    {/* Cuadrícula base interactiva */}
                    {Array.from({ length: GRID_ROWS }, (_, r) =>
                      Array.from({ length: GRID_COLS }, (_, col) => {
                        const cellX = startX + col * cellSize
                        const cellY = startY + r * cellSize
                        const isPainted = paintedCells.has(`${col},${r}`)

                        return (
                          <g
                            key={`grid-cell-${col}-${r}`}
                            onPointerDown={() => handlePointerDownCell(col, r)}
                            onPointerEnter={() => handlePointerEnterCell(col, r)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={cellX}
                              y={cellY}
                              width={cellSize}
                              height={cellSize}
                              fill={isPainted ? c.areaColor : isDark ? '#0d1527' : '#ffffff'}
                              stroke={isPainted ? c.areaTileBorder : c.gridLine}
                              strokeWidth="1"
                            />
                            {!isPainted && (
                              <circle
                                cx={cellX + cellSize / 2}
                                cy={cellY + cellSize / 2}
                                r="1.5"
                                fill={c.gridDot}
                              />
                            )}
                          </g>
                        )
                      })
                    )}

                    {/* Resaltado del Contorno Exterior (Perímetro Activo) */}
                    {freeShapeStats.edgeSegments.map((edge, idx) => (
                      <line
                        key={`edge-${idx}`}
                        x1={startX + edge.x1 * cellSize}
                        y1={startY + edge.y1 * cellSize}
                        x2={startX + edge.x2 * cellSize}
                        y2={startY + edge.y2 * cellSize}
                        stroke={c.perimeterColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    ))}

                    {/* Micro-leyenda compacta */}
                    <text
                      x={canvasDims.width / 2}
                      y={canvasDims.height - 8}
                      textAnchor="middle"
                      fill={isDark ? '#94a3b8' : '#64748b'}
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Pasa el dedo para pintar baldosas. Cada baldosa = 1 u² (Área) | Cada borde amarillo = 1 u (Perímetro).
                    </text>
                  </g>
                )
              })()}

              {/* ══════════════════════════════════════════════════════════════
                  MODO 3: COMPARADOR (Mismo Perímetro o Misma Área)
              ══════════════════════════════════════════════════════════════ */}
              {mode === 'comparador' && (() => {
                const count = compareOptions.length
                if (count === 0) return null

                const maxAvailableW = canvasDims.width - 40
                const colW = maxAvailableW / Math.min(count, 4)

                return (
                  <g>
                    {compareOptions.slice(0, 4).map((opt, idx) => {
                      const centerX = 20 + idx * colW + colW / 2
                      const maxShapeW = colW - 30
                      const maxShapeH = canvasDims.height - 120
                      const uSize = Math.min(24, Math.max(10, Math.floor(Math.min(maxShapeW / opt.b, maxShapeH / opt.h))))

                      const shapeW = opt.b * uSize
                      const shapeH = opt.h * uSize
                      const startX = centerX - shapeW / 2
                      const startY = (canvasDims.height - shapeH) / 2 - 10

                      const isSelected = idx === compareIndex

                      return (
                        <g
                          key={`cmp-${idx}`}
                          onClick={() => setCompareIndex(idx)}
                          className="cursor-pointer"
                        >
                          {/* Fondo de tarjeta para la opción */}
                          <rect
                            x={centerX - colW / 2 + 5}
                            y={15}
                            width={colW - 10}
                            height={canvasDims.height - 30}
                            rx={8}
                            fill={isSelected ? (isDark ? '#1e293b' : '#e0f2fe') : (isDark ? '#0f172a' : '#ffffff')}
                            stroke={isSelected ? '#0284c7' : isDark ? '#334155' : '#cbd5e1'}
                            strokeWidth={isSelected ? 2 : 1}
                          />

                          {/* Título de dimensiones */}
                          <text
                            x={centerX}
                            y={35}
                            textAnchor="middle"
                            fill={isSelected ? (isDark ? '#38bdf8' : '#0284c7') : isDark ? '#ffffff' : '#0f172a'}
                            fontSize="12"
                            fontWeight="black"
                          >
                            {opt.b} × {opt.h} u
                          </text>

                          {/* Figura geométrica */}
                          <g>
                            {Array.from({ length: opt.h }, (_, r) =>
                              Array.from({ length: opt.b }, (_, col) => (
                                <rect
                                  key={`cmp-tile-${idx}-${r}-${col}`}
                                  x={startX + col * uSize}
                                  y={startY + r * uSize}
                                  width={uSize}
                                  height={uSize}
                                  fill={c.areaColor}
                                  stroke={c.areaTileBorder}
                                  strokeWidth="1"
                                />
                              ))
                            )}
                            {/* Borde perimetral */}
                            <rect
                              x={startX}
                              y={startY}
                              width={shapeW}
                              height={shapeH}
                              fill="none"
                              stroke={c.perimeterColor}
                              strokeWidth="3"
                            />
                          </g>

                          {/* Estadísticas de la opción */}
                          <g transform={`translate(${centerX}, ${canvasDims.height - 50})`}>
                            <rect x="-45" y="-12" width="90" height="20" rx="4" fill="#2563eb" />
                            <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                              Área = {opt.a} u²
                            </text>

                            <rect x="-45" y="12" width="90" height="20" rx="4" fill="#f59e0b" />
                            <text x="0" y="26" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="black">
                              Perímetro = {opt.p} u
                            </text>
                          </g>
                        </g>
                      )
                    })}
                  </g>
                )
              })()}

              {/* ══════════════════════════════════════════════════════════════
                  MODO 4: RETOS (FIGURA INTERACTIVA DEL ESTUDIANTE)
              ══════════════════════════════════════════════════════════════ */}
              {mode === 'retos' && (() => {
                const maxW = canvasDims.width - 140
                const maxH = canvasDims.height - 110
                const cellSize = Math.max(22, Math.min(48, Math.floor(Math.min(maxW / retoBase, maxH / retoHeight))))

                const rectW = retoBase * cellSize
                const rectH = retoHeight * cellSize
                const startX = (canvasDims.width - rectW) / 2
                const startY = (canvasDims.height - rectH) / 2 + 8

                return (
                  <g>
                    {/* Sombra de la figura */}
                    <rect
                      x={startX + 5}
                      y={startY + 5}
                      width={rectW}
                      height={rectH}
                      fill={isDark ? '#040711' : '#e2e8f0'}
                      rx={4}
                    />

                    {/* Baldosas de Área */}
                    {Array.from({ length: retoHeight }, (_, r) =>
                      Array.from({ length: retoBase }, (_, col) => {
                        const tileIdx = r * retoBase + col + 1
                        const cellX = startX + col * cellSize
                        const cellY = startY + r * cellSize
                        return (
                          <g key={`reto-tile-${r}-${col}`}>
                            <rect
                              x={cellX}
                              y={cellY}
                              width={cellSize}
                              height={cellSize}
                              fill={isCurrentChallengeSolved ? '#10b981' : c.areaColor}
                              stroke={isCurrentChallengeSolved ? '#047857' : c.areaTileBorder}
                              strokeWidth="1.2"
                            />
                            {cellSize >= 24 && (
                              <text
                                x={cellX + cellSize / 2}
                                y={cellY + cellSize / 2 + 4}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize={cellSize >= 36 ? '12' : '10'}
                                fontWeight="bold"
                                fontFamily="JetBrains Mono, monospace"
                              >
                                {tileIdx}
                              </text>
                            )}
                          </g>
                        )
                      })
                    )}

                    {/* Marco Perimetral */}
                    <rect
                      x={startX}
                      y={startY}
                      width={rectW}
                      height={rectH}
                      fill="none"
                      stroke={isCurrentChallengeSolved ? '#34d399' : c.perimeterColor}
                      strokeWidth={isCurrentChallengeSolved ? '5' : '4'}
                    />

                    {/* Cota Superior: Base con botones interactivos +/- */}
                    <g>
                      <line x1={startX} y1={startY - 12} x2={startX + rectW} y2={startY - 12} stroke="#0284c7" strokeWidth="1.5" />
                      <line x1={startX} y1={startY - 17} x2={startX} y2={startY - 7} stroke="#0284c7" strokeWidth="1.5" />
                      <line x1={startX + rectW} y1={startY - 17} x2={startX + rectW} y2={startY - 7} stroke="#0284c7" strokeWidth="1.5" />
                      <rect
                        x={startX + rectW / 2 - 36}
                        y={startY - 26}
                        width={72}
                        height={20}
                        rx={4}
                        fill={isDark ? '#0a0f1d' : '#ffffff'}
                        stroke="#0284c7"
                        strokeWidth="1.2"
                      />
                      <text
                        x={startX + rectW / 2}
                        y={startY - 12}
                        textAnchor="middle"
                        fill={isDark ? '#38bdf8' : '#0284c7'}
                        fontSize="11"
                        fontWeight="black"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Base = {retoBase} u
                      </text>
                    </g>

                    {/* Cota Derecha: Altura con botones interactivos +/- */}
                    <g>
                      <line x1={startX + rectW + 14} y1={startY} x2={startX + rectW + 14} y2={startY + rectH} stroke="#059669" strokeWidth="1.5" />
                      <line x1={startX + rectW + 9} y1={startY} x2={startX + rectW + 19} y2={startY} stroke="#059669" strokeWidth="1.5" />
                      <line x1={startX + rectW + 9} y1={startY + rectH} x2={startX + rectW + 19} y2={startY + rectH} stroke="#059669" strokeWidth="1.5" />
                      <rect
                        x={startX + rectW + 22}
                        y={startY + rectH / 2 - 10}
                        width={74}
                        height={20}
                        rx={4}
                        fill={isDark ? '#0a0f1d' : '#ffffff'}
                        stroke="#059669"
                        strokeWidth="1.2"
                      />
                      <text
                        x={startX + rectW + 59}
                        y={startY + rectH / 2 + 4}
                        textAnchor="middle"
                        fill={isDark ? '#34d399' : '#059669'}
                        fontSize="11"
                        fontWeight="black"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Alt = {retoHeight} u
                      </text>
                    </g>

                    {/* Tarjeta de Comparación en Vivo en la esquina del lienzo */}
                    <g transform="translate(14, 18)">
                      <rect
                        x="0"
                        y="0"
                        width="160"
                        height="64"
                        rx="6"
                        fill={isDark ? '#0f172a' : '#ffffff'}
                        stroke={isDark ? '#334155' : '#cbd5e1'}
                        strokeWidth="1"
                      />
                      <text
                        x="10"
                        y="16"
                        fill={isDark ? '#94a3b8' : '#64748b'}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        Estado de tu figura:
                      </text>

                      {/* Línea de Área */}
                      <text
                        x="10"
                        y="34"
                        fill={isAreaMatch ? '#10b981' : isDark ? '#60a5fa' : '#2563eb'}
                        fontSize="11"
                        fontWeight="black"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Área: {retoArea} u² {isAreaMatch ? '✓' : currentChallenge.targetArea ? `(meta: ${currentChallenge.targetArea})` : ''}
                      </text>

                      {/* Línea de Perímetro */}
                      <text
                        x="10"
                        y="52"
                        fill={isPerimMatch ? '#10b981' : isDark ? '#fbbf24' : '#d97706'}
                        fontSize="11"
                        fontWeight="black"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Perím: {retoPerim} u {isPerimMatch ? '✓' : currentChallenge.targetPerimeter ? `(meta: ${currentChallenge.targetPerimeter})` : ''}
                      </text>
                    </g>

                    {/* Felicitación central si el reto está completado */}
                    {isCurrentChallengeSolved && (
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
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="black"
                        >
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
        {/* Fórmulas completas sin truncamiento */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {mode === 'explorador' ? (
            <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm whitespace-nowrap">
              {/* Área = b × h */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Área:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  b × h = {base} × {height} =
                </span>
                {isAreaActive ? (
                  <span
                    className={`font-black px-1.5 py-0.5 rounded ${
                      isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {areaPhase === 'horizontal' || areaPhase === 'vertical'
                      ? 'Formando cuadrícula...'
                      : `${visibleTilesCount} u²`}
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

              {/* Perímetro = 2(b + h) */}
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Perímetro:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  2(b + h) = 2({base} + {height}) =
                </span>
                {isPerimeterActive ? (
                  <span
                    className={`font-black px-1.5 py-0.5 rounded ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {isPerimeterAnimating ? `${((perimeterProgress / 100) * perim1).toFixed(0)} u` : `${perim1} u`}
                  </span>
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
          ) : mode === 'retos' ? (
            <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Área:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  {retoBase} × {retoHeight} = {retoArea} u²
                </span>
                {currentChallenge.targetArea && (
                  <span
                    className={`font-bold text-xs px-1.5 py-0.2 rounded ${
                      isAreaMatch ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    }`}
                  >
                    {isAreaMatch ? '¡Correcto!' : `Meta: ${currentChallenge.targetArea} u²`}
                  </span>
                )}
              </div>

              <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>

              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Perímetro:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  2({retoBase} + {retoHeight}) = {retoPerim} u
                </span>
                {currentChallenge.targetPerimeter && (
                  <span
                    className={`font-bold text-xs px-1.5 py-0.2 rounded ${
                      isPerimMatch ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    }`}
                  >
                    {isPerimMatch ? '¡Correcto!' : `Meta: ${currentChallenge.targetPerimeter} u`}
                  </span>
                )}
              </div>
            </div>
          ) : mode === 'dibujo' ? (
            <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Área =</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  {freeShapeStats.area} baldosas =
                </span>
                <span
                  className={`font-black px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {freeShapeStats.area} u²
                </span>
              </div>

              <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>

              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Perímetro =</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  {freeShapeStats.perimeter} bordes =
                </span>
                <span
                  className={`font-black px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {freeShapeStats.perimeter} u
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
              <span className={`font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Descubrimiento:</span>
              <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                {compareCriteria === 'fixedP'
                  ? 'Con el mismo perímetro, el cuadrado es el que mayor área encierra.'
                  : 'Con la misma área, la forma más cuadrada tiene el menor perímetro.'}
              </span>
            </div>
          )}
        </div>

        {/* Botón rápido de reinicio si es necesario */}
        <button
          type="button"
          onClick={() => {
            if (mode === 'retos') {
              setRetoBase(3)
              setRetoHeight(2)
              setShowHint(false)
            } else if (mode === 'explorador') {
              handleResetExplorer()
            } else if (mode === 'dibujo') {
              clearDrawing()
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
        title="¿Qué es el Área y el Perímetro?"
        onClose={() => setShowHelp(false)}
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-1.5">
              <span>📏 1. Perímetro: La Cerca (Contorno)</span>
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              El <strong>perímetro</strong> es la <strong>longitud total del contorno</strong> o borde exterior que encierra una figura.
              Imagínate que caminas alrededor de un parque o que colocas una cerca alrededor de un terreno.
            </p>
            <p className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-300">
              Unidad: lineal (u, cm, m). Fórmula en rectángulo: P = 2 × (base + altura).
            </p>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5">
            <h4 className="font-bold text-blue-500 mb-1 flex items-center gap-1.5">
              <span>🟦 2. Área: El Piso (Superficie)</span>
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              El <strong>área</strong> es la <strong>cantidad de espacio o superficie</strong> dentro de la figura.
              Es la cantidad de baldosas cuadradas unitarias (1×1) que se necesitan para cubrir todo el piso.
            </p>
            <p className="mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-300">
              Unidad: cuadrada (u², cm², m²). Fórmula en rectángulo: A = base × altura.
            </p>
          </div>

          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2.5">
            <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-1">
              💡 ¡Error Común entre Estudiantes!
            </h4>
            <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              ¿Dos figuras con el mismo perímetro tienen siempre la misma área? <strong>¡No!</strong>
            </p>
            <p className={`mt-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Usa la pestaña <strong>Comparador</strong> para comprobar que con una cerca de 16 metros puedes encerrar desde 7 m² (1×7) hasta 16 m² (4×4).
            </p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
