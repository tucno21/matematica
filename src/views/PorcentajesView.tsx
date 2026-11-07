import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Percent,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Trophy,
  ArrowRight,
  Calculator,
  Grid,
  Scissors
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

type TabMode = 'esencia' | 'cantidad' | 'cotidiano' | 'retos'

// Máximo común divisor para simplificar fracciones
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyFraction(num: number, den: number): { n: number; d: number } {
  if (num === 0) return { n: 0, d: 1 }
  const divisor = gcd(Math.abs(num), Math.abs(den))
  return { n: num / divisor, d: den / divisor }
}

export default function PorcentajesView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // ── Modo / Pestaña Activa ──
  const [tab, setTab] = useState<TabMode>('esencia')
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO MODO 1: ESENCIA ("¿Qué es el %?")
  // ══════════════════════════════════════════════════════════════════════════
  const [isDivided, setIsDivided] = useState<boolean>(false)
  const [divisionPhase, setDivisionPhase] = useState<'idle' | 'animating_h' | 'animating_v' | 'done'>('idle')
  const [hProgress, setHProgress] = useState<number>(0)
  const [vProgress, setVProgress] = useState<number>(0)
  const animFrameRef = useRef<number | null>(null)

  const [percentValue, setPercentValue] = useState<number>(0)
  const [isDraggingGrid, setIsDraggingGrid] = useState<boolean>(false)

  const startDivision = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setDivisionPhase('animating_h')
    setHProgress(0)
    setVProgress(0)
    setPercentValue(0)

    const H_DURATION = 850 // Duración líneas horizontales
    const V_DURATION = 850 // Duración líneas verticales
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime

      if (elapsed < H_DURATION) {
        // Fase 1: Trazando líneas horizontales
        const p = Math.min(1, elapsed / H_DURATION)
        setDivisionPhase('animating_h')
        setHProgress(p)
        setVProgress(0)
        animFrameRef.current = requestAnimationFrame(step)
      } else if (elapsed < H_DURATION + V_DURATION) {
        // Fase 2: Trazando líneas verticales
        const vElapsed = elapsed - H_DURATION
        const vp = Math.min(1, vElapsed / V_DURATION)
        setDivisionPhase('animating_v')
        setHProgress(1)
        setVProgress(vp)
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        // Fase 3: Cuadrícula de 100 completada
        setHProgress(1)
        setVProgress(1)
        setDivisionPhase('done')
        setIsDivided(true)
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(step)
  }, [])

  const resetToWhole = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsDivided(false)
    setDivisionPhase('idle')
    setHProgress(0)
    setVProgress(0)
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const handleGridPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top))
    const col = Math.min(9, Math.max(0, Math.floor((x / rect.width) * 10)))
    const row = Math.min(9, Math.max(0, Math.floor((y / rect.height) * 10)))
    const cellNum = row * 10 + col + 1
    setPercentValue(cellNum)
  }

  // Fracción simplificada del porcentaje
  const fraction = useMemo(() => {
    return simplifyFraction(percentValue, 100)
  }, [percentValue])

  const decimalValue = (percentValue / 100).toFixed(2)

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO MODO 2: DE UNA CANTIDAD ("¿Cuánto es el P% de N?")
  // ══════════════════════════════════════════════════════════════════════════
  const [totalQuantity, setTotalQuantity] = useState<number>(200)
  const [calcPercent, setCalcPercent] = useState<number>(30)

  // Cálculo del resultado
  const quantityResult = useMemo(() => {
    return (calcPercent * totalQuantity) / 100
  }, [calcPercent, totalQuantity])

  const valuePerOnePercent = useMemo(() => {
    return totalQuantity / 100
  }, [totalQuantity])

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO MODO 3: CASOS DE LA VIDA REAL (Descuento e Impuesto IGV)
  // ══════════════════════════════════════════════════════════════════════════
  const [caseType, setCaseType] = useState<'descuento' | 'igv'>('descuento')
  // Descuento
  const [productPrice, setProductPrice] = useState<number>(40)
  const [discountPercent, setDiscountPercent] = useState<number>(20)

  // Valor en dinero de cada cuadrito individual (1%) para Descuento
  const cellMoneyVal = useMemo(() => {
    const val = productPrice / 100
    return Number.isInteger(val) ? val.toString() : val.toFixed(1)
  }, [productPrice])

  // IGV
  const [subtotalPrice, setSubtotalPrice] = useState<number>(150)

  // Valor en dinero de cada cuadrito individual (1%) para IGV
  const igvCellMoneyVal = useMemo(() => {
    const val = subtotalPrice / 100
    return Number.isInteger(val) ? val.toString() : val.toFixed(1)
  }, [subtotalPrice])

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO MODO 4: RETOS CONCEPTUALES
  // ══════════════════════════════════════════════════════════════════════════
  interface Challenge {
    id: number
    question: string
    hint: string
    type: 'equivalencia' | 'cantidad' | 'descuento'
    options: { text: string; correct: boolean; explanation: string }[]
  }

  const CHALLENGES: Challenge[] = [
    {
      id: 1,
      question: '¿Qué significa exactamente decir que el 50% de los estudiantes lee?',
      hint: 'Recuerda que «por ciento» significa «de cada 100».',
      type: 'equivalencia',
      options: [
        { text: 'Que exactamente 50 personas leen siempre', correct: false, explanation: 'No siempre son 50 personas, depende del total del grupo.' },
        { text: 'Que de cada 100 estudiantes, 50 leen (la mitad)', correct: true, explanation: '¡Correcto! 50% significa 50 de cada 100, es decir, exactamente 1/2 (la mitad).' },
        { text: 'Que leen 50 páginas por día', correct: false, explanation: 'El porcentaje indica una proporción del grupo, no la cantidad de páginas.' },
        { text: 'Que leen menos de la cuarta parte', correct: false, explanation: 'La cuarta parte sería el 25%.' }
      ]
    },
    {
      id: 2,
      question: 'Si una casaca cuesta S/ 80 y tiene un 25% de descuento, ¿cuánto te descuentan?',
      hint: '25% equivale a la cuarta parte (1/4). Divide 80 entre 4.',
      type: 'descuento',
      options: [
        { text: 'S/ 25', correct: false, explanation: 'Cuidado con confundir el porcentaje (25%) con soles (S/).' },
        { text: 'S/ 20', correct: true, explanation: '¡Excelente! 25% de 80 = (80 ÷ 4) = S/ 20 de ahorro. Pagarías S/ 60.' },
        { text: 'S/ 40', correct: false, explanation: 'S/ 40 sería el 50% (la mitad).' },
        { text: 'S/ 10', correct: false, explanation: 'S/ 10 sería el 12.5% o la octava parte.' }
      ]
    },
    {
      id: 3,
      question: '¿A qué fracción irreducible equivale el 75%?',
      hint: '75 cuadritos de 100 se pueden simplificar dividiendo entre 25.',
      type: 'equivalencia',
      options: [
        { text: '7/5', correct: false, explanation: '7/5 es una fracción mayor a 1 (140%).' },
        { text: '1/4', correct: false, explanation: '1/4 equivale al 25%.' },
        { text: '3/4', correct: true, explanation: '¡Muy bien! 75/100 se simplifica dividiendo entre 25: (75÷25)/(100÷25) = 3/4.' },
        { text: '3/5', correct: false, explanation: '3/5 equivale al 60%.' }
      ]
    },
    {
      id: 4,
      question: 'En un salón de 40 estudiantes, el 10% faltó por lluvia. ¿Cuántos faltaron?',
      hint: 'El 10% es la décima parte de una cantidad (dividir entre 10).',
      type: 'cantidad',
      options: [
        { text: '10 estudiantes', correct: false, explanation: 'No son 10 personas, es el 10% de 40.' },
        { text: '4 estudiantes', correct: true, explanation: '¡Correcto! 10% de 40 = 40 ÷ 10 = 4 estudiantes.' },
        { text: '1 estudiante', correct: false, explanation: '1 estudiante de 40 sería el 2.5%.' },
        { text: '8 estudiantes', correct: false, explanation: '8 estudiantes sería el 20%.' }
      ]
    },
    {
      id: 5,
      question: 'Si una cantidad aumenta en 100%, ¿qué le pasa a la cantidad?',
      hint: '100% de algo es ese mismo algo entero.',
      type: 'equivalencia',
      options: [
        { text: 'Se queda igual', correct: false, explanation: 'Si aumenta 0% se queda igual, pero aquí aumenta 100%.' },
        { text: 'Se duplica (se hace el doble)', correct: true, explanation: '¡Exacto! Tenías el 100% y le sumas otro 100%, ahora tienes 200% (el doble).' },
        { text: 'Se multiplica por 100', correct: false, explanation: 'Aumentar 100% suma una vez la misma cantidad.' },
        { text: 'Aumenta 100 unidades fijas', correct: false, explanation: 'Es proporcional a la cantidad original, no un valor fijo de 100.' }
      ]
    }
  ]

  const [challengeIndex, setChallengeIndex] = useState<number>(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [score, setScore] = useState<number>(0)
  const [showExplanation, setShowExplanation] = useState<boolean>(false)

  const currentChallenge = CHALLENGES[challengeIndex]

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return
    setSelectedOption(idx)
    setShowExplanation(true)
    if (currentChallenge.options[idx].correct) {
      setScore(prev => prev + 1)
    }
  }

  const handleNextChallenge = () => {
    setSelectedOption(null)
    setShowExplanation(false)
    setChallengeIndex(prev => (prev + 1) % CHALLENGES.length)
  }

  const handleResetChallenge = () => {
    setChallengeIndex(0)
    setSelectedOption(null)
    setScore(0)
    setShowExplanation(false)
  }

  // Colores dinámicos compatibles con GPU en tablets y modos oscuro/claro
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    cardBg: isDark ? 'bg-[#10172b]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    textMuted: isDark ? 'text-white/60' : 'text-slate-500',
    innerCard: isDark ? 'bg-[#0d1424]' : 'bg-slate-100',
    gridCellEmpty: isDark ? '#131c33' : '#e2e8f0',
    gridCellBorder: isDark ? '#1a2744' : '#cbd5e1',
    gridCellFilled: '#38bdf8',
    gridCellFilledBorder: '#7dd3fc',
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Volver</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <h1 className="text-xs sm:text-sm lg:text-base font-bold tracking-tight truncate flex items-center gap-1.5">
            <Percent className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Porcentajes</span>
            <span className="text-[11px] text-cyan-300/80 font-mono hidden md:inline">
              (¿Qué es «por ciento»?)
            </span>
          </h1>
        </div>

        {/* Selector de Pestañas / Modos Pedagógicos */}
        <nav className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setTab('esencia')}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'esencia'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:bg-white/5'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Esencia</span>
          </button>

          <button
            onClick={() => setTab('cantidad')}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'cantidad'
                ? 'bg-purple-500 text-white shadow-xs'
                : isDark
                ? 'text-white/70 hover:bg-white/5'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">% de una Cantidad</span>
          </button>

          <button
            onClick={() => setTab('cotidiano')}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'cotidiano'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:bg-white/5'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vida Real</span>
          </button>

          <button
            onClick={() => setTab('retos')}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              tab === 'retos'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isDark
                ? 'text-white/70 hover:bg-white/5'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Retos</span>
          </button>
        </nav>

        {/* Acciones del Header */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center h-7 w-7 lg:h-8 lg:w-8 rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer"
            title="Guía conceptual de porcentajes"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Área Principal de Trabajo (CERO SCROLL) ────────────────────── */}
      <main className="flex-1 min-h-0 flex flex-col p-1 sm:p-2 lg:p-3 overflow-hidden">
        {/* ══════════════════════════════════════════════════════════════════════
            PESTAÑA 1: ESENCIA DEL PORCENTAJE (La Rejilla de 100 y Triple Equivalencia)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'esencia' && (
          <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">
            {/* Panel Izquierdo: La Rejilla de 100 (10x10) */}
            <div
              className={`flex-1 min-w-0 min-h-0 rounded-xl border p-2 sm:p-2.5 flex flex-col items-center justify-between overflow-hidden ${c.cardBg} ${c.cardBorder}`}
            >
              {/* Barra superior del panel de rejilla */}
              <div className="w-full flex items-center justify-between pb-1 border-b border-white/10 text-xs shrink-0 min-h-[30px]">
                {/* Si no está dividido: Botón Dividir en ese mismo sitio */}
                {!isDivided && divisionPhase === 'idle' ? (
                  <button
                    type="button"
                    onClick={startDivision}
                    className={`px-3 py-1 rounded-md font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 animate-pulse ${
                      isDark
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 ring-2 ring-cyan-300'
                        : 'bg-sky-600 hover:bg-sky-500 text-white ring-2 ring-sky-300'
                    }`}
                    title="Dividir el cuadrado entero en 100 partes iguales"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Dividir</span>
                  </button>
                ) : (
                  /* Luego desaparece el botón y aparece "LA REJILLA DE 100 CUADROS" */
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <Grid className="h-4 w-4" />
                    <span>LA REJILLA DE 100 CUADROS</span>
                    {isDivided && (
                      <button
                        type="button"
                        onClick={resetToWhole}
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          isDark
                            ? 'bg-white/10 text-white/70 hover:bg-white/20'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Volver a ver el cuadrado entero sin divisiones"
                      >
                        Ver el Todo
                      </button>
                    )}
                  </div>
                )}

                <span className="font-mono font-bold text-amber-500 dark:text-amber-300">
                  {!isDivided && divisionPhase === 'idle'
                    ? '1 unidad entera (El Todo)'
                    : divisionPhase !== 'done'
                    ? 'Dividiendo en 100 partes...'
                    : `${percentValue} de 100 cuadros pintados`}
                </span>
              </div>

              {/* Contenedor Cuadrado Centrado de la Rejilla 10x10 */}
              <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1">
                <svg
                  viewBox="0 0 500 500"
                  className="aspect-square h-full max-h-[min(54vh,280px)] lg:max-h-[min(65vh,380px)] w-auto select-none cursor-pointer touch-none shadow-md rounded-md overflow-hidden"
                  onPointerDown={e => {
                    if (!isDivided) return
                    setIsDraggingGrid(true)
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch {}
                    handleGridPointer(e)
                  }}
                  onPointerMove={e => {
                    if (isDivided && isDraggingGrid) {
                      handleGridPointer(e)
                    }
                  }}
                  onPointerUp={e => {
                    setIsDraggingGrid(false)
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    } catch {}
                  }}
                  onPointerCancel={() => setIsDraggingGrid(false)}
                >
                  <defs>
                    <clipPath id="grid-border-clip">
                      <rect x="0" y="0" width="500" height="500" rx="8" />
                    </clipPath>
                  </defs>

                  <g clipPath="url(#grid-border-clip)">
                    {/* Fondo base de la cuadrícula */}
                    <rect
                      x="0"
                      y="0"
                      width="500"
                      height="500"
                      fill={isDark ? '#0a1022' : '#ffffff'}
                    />

                    {/* ── 1. ESTADO INICIAL: Cuadrado Grande sin Divisiones (TODO) ── */}
                    {!isDivided && divisionPhase === 'idle' && (
                      <g className="transition-opacity duration-300">
                        <rect
                          x="0"
                          y="0"
                          width="500"
                          height="500"
                          fill={isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(2, 132, 199, 0.05)'}
                        />
                        <text
                          x={250}
                          y={235}
                          textAnchor="middle"
                          fontSize={46}
                          fontWeight="900"
                          fill={isDark ? '#38bdf8' : '#0284c7'}
                          letterSpacing="4"
                        >
                          TODO
                        </text>
                        <text
                          x={250}
                          y={275}
                          textAnchor="middle"
                          fontSize={17}
                          fontWeight="bold"
                          fill={isDark ? 'rgba(255, 255, 255, 0.8)' : '#334155'}
                        >
                          1 Unidad Completa (100%)
                        </text>
                        <text
                          x={250}
                          y={310}
                          textAnchor="middle"
                          fontSize={13}
                          fill={isDark ? 'rgba(255, 255, 255, 0.5)' : '#64748b'}
                        >
                          Haz clic arriba en «Dividir» para partir en 100 partes
                        </text>
                      </g>
                    )}

                    {/* ── 2. ANIMACIÓN FASE 1: Líneas Horizontales trazándose (mismo color y grosor que la cuadrícula final) ── */}
                    {(divisionPhase === 'animating_h' || divisionPhase === 'animating_v') && (
                      <>
                        {Array.from({ length: 9 }, (_, i) => {
                          const y = (i + 1) * 50
                          const currentX2 = divisionPhase === 'animating_h' ? 500 * hProgress : 500
                          return (
                            <line
                              key={`anim-h-${i}`}
                              x1={0}
                              y1={y}
                              x2={currentX2}
                              y2={y}
                              stroke={isDark ? 'rgba(255, 255, 255, 0.22)' : '#94a3b8'}
                              strokeWidth={1.5}
                              shapeRendering="crispEdges"
                            />
                          )
                        })}
                      </>
                    )}

                    {/* ── 3. ANIMACIÓN FASE 2: Líneas Verticales trazándose (mismo color y grosor que la cuadrícula final) ── */}
                    {divisionPhase === 'animating_v' && (
                      <>
                        {Array.from({ length: 9 }, (_, i) => {
                          const x = (i + 1) * 50
                          return (
                            <line
                              key={`anim-v-${i}`}
                              x1={x}
                              y1={0}
                              x2={x}
                              y2={500 * vProgress}
                              stroke={isDark ? 'rgba(255, 255, 255, 0.22)' : '#94a3b8'}
                              strokeWidth={1.5}
                              shapeRendering="crispEdges"
                            />
                          )
                        })}
                      </>
                    )}

                    {/* ── 4. ESTADO DIVIDIDO Y LISTO: 100 Cuadrados Interactivos ── */}
                    {isDivided && divisionPhase === 'done' && (
                      <>
                        {/* Cuadrados Vacíos */}
                        {Array.from({ length: 100 }, (_, i) => {
                          const cellNum = i + 1
                          if (cellNum <= percentValue) return null
                          const row = Math.floor(i / 10)
                          const col = i % 10
                          return (
                            <rect
                              key={`empty-${i}`}
                              x={col * 50}
                              y={row * 50}
                              width={50}
                              height={50}
                              fill={isDark ? '#0a1022' : '#ffffff'}
                              stroke={isDark ? 'rgba(255, 255, 255, 0.22)' : '#94a3b8'}
                              strokeWidth={1.5}
                              shapeRendering="crispEdges"
                            />
                          )
                        })}

                        {/* Cuadrados Pintados con línea de alto contraste */}
                        {Array.from({ length: 100 }, (_, i) => {
                          const cellNum = i + 1
                          if (cellNum > percentValue) return null
                          const row = Math.floor(i / 10)
                          const col = i % 10
                          return (
                            <rect
                              key={`filled-${i}`}
                              x={col * 50}
                              y={row * 50}
                              width={50}
                              height={50}
                              fill={isDark ? '#06b6d4' : '#0284c7'}
                              stroke={isDark ? '#041d2f' : '#ffffff'}
                              strokeWidth={2}
                              shapeRendering="crispEdges"
                            />
                          )
                        })}
                      </>
                    )}

                    {/* Marco Exterior Continuo de la Cuadrícula */}
                    <rect
                      x={1}
                      y={1}
                      width={498}
                      height={498}
                      rx={8}
                      fill="none"
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth={2.5}
                    />
                  </g>
                </svg>
              </div>

              {/* Botones de Porcentajes Clave y Deslizador Rápido */}
              <div className="w-full space-y-1.5 pt-1 border-t border-white/10 shrink-0">
                {!isDivided && divisionPhase === 'idle' ? (
                  <div className="py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                    <span>💡 Haz clic en el botón</span>
                    <button
                      type="button"
                      onClick={startDivision}
                      className="px-2 py-0.5 rounded font-black text-xs bg-sky-500 text-white dark:bg-cyan-500 dark:text-slate-950 cursor-pointer shadow-xs"
                    >
                      Dividir
                    </button>
                    <span>para partir el Todo en 100 partes iguales.</span>
                  </div>
                ) : (
                  <>
                    {/* Deslizador continuo */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-cyan-300 w-7 text-right font-mono">
                        0%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={percentValue}
                        onChange={e => setPercentValue(Number(e.target.value))}
                        disabled={!isDivided}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
                      />
                      <span className="text-[11px] font-bold text-cyan-300 w-9 font-mono">
                        100%
                      </span>
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 min-w-[46px] text-center border border-cyan-500/30">
                        {percentValue}%
                      </span>
                    </div>

                    {/* Atajos de porcentajes visuales intuitivos */}
                    <div className="flex items-center justify-between gap-1 overflow-x-auto">
                      <span className={`text-[10px] font-bold shrink-0 hidden sm:inline ${c.textMuted}`}>
                        Comunes:
                      </span>
                      {[
                        { val: 10, label: '10% (1/10)' },
                        { val: 25, label: '25% (1/4)' },
                        { val: 50, label: '50% (1/2)' },
                        { val: 75, label: '75% (3/4)' },
                        { val: 100, label: '100% (Todo)' },
                      ].map(b => (
                        <button
                          key={`btn-${b.val}`}
                          onClick={() => setPercentValue(b.val)}
                          disabled={!isDivided}
                          className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all disabled:opacity-40 ${
                            percentValue === b.val
                              ? 'bg-cyan-500 text-slate-950 shadow-xs'
                              : isDark
                              ? 'bg-white/5 text-white/70 hover:bg-white/10'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Panel Derecho: La Triple Equivalencia (Porcentaje ↔ Fracción ↔ Decimal) */}
            <div
              className={`w-full sm:w-[260px] lg:w-[320px] xl:w-[360px] shrink-0 rounded-xl border p-2 sm:p-2.5 flex flex-col justify-between overflow-y-auto ${c.cardBg} ${c.cardBorder}`}
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="pb-1 border-b border-white/10 text-xs font-bold text-purple-400 flex items-center justify-between shrink-0">
                  <span>TRIPLE EQUIVALENCIA</span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                </div>

                {/* Contenedor de las 3 tarjetas: En vertical (móvil) van en grid de 3 columnas para no robar altura; en horizontal/laptop van apiladas */}
                <div className="grid grid-cols-3 sm:grid-cols-1 gap-1.5 sm:gap-2">
                  {/* Tarjeta 1: Porcentaje */}
                  <div className={`p-1.5 sm:p-2.5 rounded-lg border ${c.innerCard} border-cyan-500/30 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left`}>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                        1. Porcentaje (%)
                      </span>
                      <span className="text-base sm:text-xl font-mono font-black text-cyan-300">
                        {percentValue}%
                      </span>
                    </div>
                    <span className={`text-[10px] sm:text-[11px] sm:text-right sm:max-w-[130px] hidden sm:block ${c.textMuted}`}>
                      Significa: <strong>{percentValue} de cada 100</strong>
                    </span>
                  </div>

                  {/* Tarjeta 2: Fracción Decimal y Reducida */}
                  <div className={`p-1.5 sm:p-2.5 rounded-lg border ${c.innerCard} border-purple-500/30 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left`}>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                        2. Fracción
                      </span>
                      <div className="flex items-center gap-1 font-mono font-black text-sm sm:text-base">
                        <span className="text-purple-300">
                          {percentValue}/100
                        </span>
                        {fraction.d !== 100 && (
                          <>
                            <span className="text-white/40">=</span>
                            <span className="text-amber-300 font-black px-1 rounded bg-amber-500/20 border border-amber-500/30 text-xs sm:text-sm">
                              {fraction.n}/{fraction.d}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] sm:text-[11px] sm:text-right sm:max-w-[110px] hidden sm:block ${c.textMuted}`}>
                      {percentValue === 0
                        ? '0 centésimos'
                        : fraction.d === 2
                        ? '¡La mitad exacta!'
                        : fraction.d === 4
                        ? fraction.n === 1
                          ? 'La cuarta parte'
                          : 'Tres cuartas partes'
                        : fraction.d === 10
                        ? 'La décima parte'
                        : 'Simplificada'}
                    </span>
                  </div>

                  {/* Tarjeta 3: Expresión Decimal */}
                  <div className={`p-1.5 sm:p-2.5 rounded-lg border ${c.innerCard} border-emerald-500/30 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left`}>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                        3. Decimal
                      </span>
                      <span className="text-base sm:text-xl font-mono font-black text-emerald-300">
                        {decimalValue}
                      </span>
                    </div>
                    <span className={`text-[10px] sm:text-[11px] sm:text-right sm:max-w-[110px] hidden sm:block ${c.textMuted}`}>
                      {percentValue} centésimos
                    </span>
                  </div>
                </div>

                {/* Explicación Pedagógica Intuitiva */}
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] space-y-0.5">
                  <div className="font-bold text-cyan-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>¿Por qué se llama «por ciento»?</span>
                  </div>
                  <p className={c.textMuted}>
                    Viene del latín <em>per centum</em>. Si tienes 100 monedas y tomas el{' '}
                    <strong className="text-cyan-300">{percentValue}%</strong>, te llevas exactamente{' '}
                    <strong className="text-cyan-300">{percentValue} monedas</strong>.
                  </p>
                </div>
              </div>

              {/* Botón de reinicio */}
              <button
                type="button"
                onClick={() => setPercentValue(0)}
                className={`w-full py-1 mt-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  isDark
                    ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpiar a 0%</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PESTAÑA 2: PORCENTAJE DE UNA CANTIDAD (Doble Barra y Descomposición)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'cantidad' && (
          <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">
            {/* Panel Principal: La Doble Barra Sincronizada */}
            <div
              className={`flex-1 min-w-0 min-h-0 rounded-xl border p-2 sm:p-2.5 flex flex-col justify-between overflow-hidden ${c.cardBg} ${c.cardBorder}`}
            >
              <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/10 text-xs">
                <span className="font-bold text-purple-400">
                  ¿CUÁNTO ES EL {calcPercent}% DE {totalQuantity}?
                </span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  Resultado: {quantityResult}
                </span>
              </div>

              {/* Visualizador central: Doble Barra Proporcional */}
              <div className="flex-1 min-h-0 flex flex-col justify-center items-center py-2 px-2 sm:px-6 w-full">
                <div className="w-full max-w-xl space-y-3 sm:space-y-4">
                  {/* Barra 1: Escala de Porcentajes (0% a 100%) */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs font-bold text-cyan-400">
                      <span>0%</span>
                      <span className="font-mono text-sm font-black text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                        {calcPercent}%
                      </span>
                      <span>100%</span>
                    </div>
                    <div
                      className={`h-7 sm:h-8 w-full rounded-lg border overflow-hidden relative ${
                        isDark ? 'bg-slate-900/60 border-white/15' : 'bg-slate-200 border-slate-300'
                      }`}
                    >
                      {/* Relleno dinámico (si calcPercent > 0) */}
                      {calcPercent > 0 && (
                        <div
                          className="h-full bg-cyan-500 transition-all duration-150 flex items-center justify-end"
                          style={{ width: `${calcPercent}%` }}
                        >
                          {calcPercent >= 15 && (
                            <span className="text-xs font-mono font-black text-slate-950 pr-2">
                              {calcPercent}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Líneas divisorias de alta visibilidad cada 25% (z-10 para mantenerse visibles al pintar) */}
                      <div
                        className="absolute top-0 bottom-0 left-[25%] w-[1.5px] z-10 pointer-events-none bg-slate-600 dark:bg-white/70 shadow-2xs"
                        title="25% (1/4)"
                      />
                      <div
                        className="absolute top-0 bottom-0 left-[50%] w-[2px] z-10 pointer-events-none bg-slate-800 dark:bg-white/90 shadow-2xs"
                        title="50% (1/2)"
                      />
                      <div
                        className="absolute top-0 bottom-0 left-[75%] w-[1.5px] z-10 pointer-events-none bg-slate-600 dark:bg-white/70 shadow-2xs"
                        title="75% (3/4)"
                      />
                    </div>

                    {/* Etiquetas guía de cuartos (25%, 50%, 75%) */}
                    <div className="relative w-full h-3 text-[9px] font-mono font-bold text-slate-500 dark:text-white/50 pointer-events-none select-none">
                      <span className="absolute left-[25%] -translate-x-1/2">25%</span>
                      <span className="absolute left-[50%] -translate-x-1/2 font-black text-cyan-600 dark:text-cyan-400">50%</span>
                      <span className="absolute left-[75%] -translate-x-1/2">75%</span>
                    </div>
                  </div>

                  {/* Conector de flechas y sincronización */}
                  <div className="flex justify-center items-center py-0.5 text-xs font-mono">
                    <span className="text-slate-500 dark:text-white/40 font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                      ↕ Proporción equivalente ↕
                    </span>
                  </div>

                  {/* Barra 2: Escala de Cantidad Real (0 a N) */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs font-bold text-purple-400">
                      <span>0</span>
                      <span className="font-mono text-sm font-black text-amber-500 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        {quantityResult}
                      </span>
                      <span>Total: {totalQuantity}</span>
                    </div>
                    <div
                      className={`h-7 sm:h-8 w-full rounded-lg border overflow-hidden relative ${
                        isDark ? 'bg-slate-900/60 border-white/15' : 'bg-slate-200 border-slate-300'
                      }`}
                    >
                      {/* Relleno dinámico (si calcPercent > 0) */}
                      {calcPercent > 0 && (
                        <div
                          className="h-full bg-purple-500 transition-all duration-150 flex items-center justify-end"
                          style={{ width: `${calcPercent}%` }}
                        >
                          {calcPercent >= 15 && (
                            <span className="text-xs font-mono font-black text-white pr-2">
                              {quantityResult}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Líneas divisorias de alta visibilidad alineadas al 25%, 50%, 75% */}
                      <div
                        className="absolute top-0 bottom-0 left-[25%] w-[1.5px] z-10 pointer-events-none bg-slate-600 dark:bg-white/70 shadow-2xs"
                        title={`25% = ${Math.round(totalQuantity * 0.25 * 10) / 10}`}
                      />
                      <div
                        className="absolute top-0 bottom-0 left-[50%] w-[2px] z-10 pointer-events-none bg-slate-800 dark:bg-white/90 shadow-2xs"
                        title={`50% = ${Math.round(totalQuantity * 0.5 * 10) / 10}`}
                      />
                      <div
                        className="absolute top-0 bottom-0 left-[75%] w-[1.5px] z-10 pointer-events-none bg-slate-600 dark:bg-white/70 shadow-2xs"
                        title={`75% = ${Math.round(totalQuantity * 0.75 * 10) / 10}`}
                      />
                    </div>

                    {/* Etiquetas guía de valores correspondientes (N/4, N/2, 3N/4) */}
                    <div className="relative w-full h-3 text-[9px] font-mono font-bold text-slate-500 dark:text-white/50 pointer-events-none select-none">
                      <span className="absolute left-[25%] -translate-x-1/2">{Math.round(totalQuantity * 0.25 * 10) / 10}</span>
                      <span className="absolute left-[50%] -translate-x-1/2 font-black text-purple-600 dark:text-purple-400">{Math.round(totalQuantity * 0.5 * 10) / 10}</span>
                      <span className="absolute left-[75%] -translate-x-1/2">{Math.round(totalQuantity * 0.75 * 10) / 10}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles del Porcentaje y de la Cantidad */}
              <div className="w-full space-y-1.5 pt-1 border-t border-white/10 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Control 1: Deslizador de Porcentaje con Botones Rápidos */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-cyan-400">Porcentaje (P%):</span>
                      <span className="font-mono text-cyan-300 font-bold">{calcPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={calcPercent}
                      onChange={e => setCalcPercent(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex gap-1 pt-0.5">
                      {[0, 10, 25, 50, 75, 100].map(p => (
                        <button
                          key={`btn-p-${p}`}
                          onClick={() => setCalcPercent(p)}
                          className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                            calcPercent === p
                              ? 'bg-cyan-500 text-slate-950 font-black shadow-2xs'
                              : isDark
                              ? 'bg-white/5 text-white/70 hover:bg-white/10'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 2: Selector de Cantidad Total */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-purple-400">Cantidad Total (N):</span>
                      <span className="font-mono text-purple-300 font-bold">{totalQuantity}</span>
                    </div>
                    <div className="flex gap-1 pt-1.5">
                      {[40, 80, 100, 150, 200, 500].map(qty => (
                        <button
                          key={`qty-${qty}`}
                          onClick={() => setTotalQuantity(qty)}
                          className={`flex-1 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                            totalQuantity === qty
                              ? 'bg-purple-500 text-white font-black shadow-2xs'
                              : isDark
                              ? 'bg-white/5 text-white/60 hover:bg-white/10'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Lateral: Los 2 Métodos Conceptuales Explicados */}
            <div
              className={`w-full sm:w-[260px] lg:w-[320px] xl:w-[360px] shrink-0 rounded-xl border p-2 sm:p-2.5 flex flex-col justify-between overflow-y-auto ${c.cardBg} ${c.cardBorder}`}
            >
              <div className="space-y-2 text-xs">
                <div className="pb-1 border-b border-white/10 font-bold text-amber-400">
                  ¿CÓMO CALCULAR SIN MECANIZARSE?
                </div>

                {/* Método 1: Por cada ciento (Valor de cada 1%) */}
                <div className={`p-2.5 rounded-lg border ${c.innerCard} border-cyan-500/30 space-y-1`}>
                  <div className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider">
                    Método 1: ¿Cuánto vale cada 1%?
                  </div>
                  <p className={c.textMuted}>
                    El total ({totalQuantity}) se divide en 100 partes iguales:
                  </p>
                  <div className="font-mono font-bold text-cyan-300 text-center py-1 bg-black/20 rounded">
                    1% = {totalQuantity} ÷ 100 = {valuePerOnePercent}
                  </div>
                  <p className={c.textMuted}>
                    Ahora multiplicamos por {calcPercent}:
                  </p>
                  <div className="font-mono font-bold text-amber-300 text-center py-1 bg-amber-500/10 rounded border border-amber-500/20">
                    {calcPercent} × {valuePerOnePercent} = {quantityResult}
                  </div>
                </div>

                {/* Método 2: Fracción simplificada */}
                <div className={`p-2.5 rounded-lg border ${c.innerCard} border-purple-500/30 space-y-1`}>
                  <div className="font-bold text-purple-400 text-[11px] uppercase tracking-wider">
                    Método 2: Fracción del Total
                  </div>
                  <p className={c.textMuted}>
                    Multiplicamos la fracción por el total:
                  </p>
                  <div className="font-mono font-bold text-purple-300 text-center py-1 bg-black/20 rounded">
                    ({calcPercent} / 100) × {totalQuantity} = {quantityResult}
                  </div>
                </div>

                {/* Atajo Mental Clave */}
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                  <span className="font-bold text-emerald-400 block text-[11px]">
                    💡 Atajos Mentales:
                  </span>
                  <ul className={`list-disc list-inside text-[11px] space-y-0.5 ${c.textMuted}`}>
                    <li><strong>10%</strong> = Quitar un cero o dividir entre 10.</li>
                    <li><strong>50%</strong> = La mitad exacta (÷ 2).</li>
                    <li><strong>25%</strong> = La mitad de la mitad (÷ 4).</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-center text-xs font-mono font-bold text-cyan-300">
                {calcPercent}% de {totalQuantity} = {quantityResult}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PESTAÑA 3: SITUACIONES DE LA VIDA REAL (Descuento e Impuesto IGV)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'cotidiano' && (
          <div className="flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">
            {/* Panel Principal del Simulador Cotidiano */}
            <div
              className={`flex-1 min-w-0 min-h-0 rounded-xl border p-2 sm:p-2.5 flex flex-col justify-between overflow-hidden ${c.cardBg} ${c.cardBorder}`}
            >
              {/* Selector de Caso Real */}
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-xs shrink-0">
                <span className="font-bold text-emerald-400">APLICACIONES DE LA VIDA REAL</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCaseType('descuento')}
                    className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
                      caseType === 'descuento'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-2xs'
                        : isDark
                        ? 'bg-white/5 text-white/60 hover:bg-white/10'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    🏷️ Descuento Comercial
                  </button>
                  <button
                    onClick={() => setCaseType('igv')}
                    className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
                      caseType === 'igv'
                        ? 'bg-purple-500 text-white font-black shadow-2xs'
                        : isDark
                        ? 'bg-white/5 text-white/60 hover:bg-white/10'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    🧾 Impuesto (IGV 18%)
                  </button>
                </div>
              </div>

              {/* ── BARRA SUPERIOR SEGÚN EL CASO ACTIVO ── */}
              {/* Caso Descuento: Selector de Precio Prenda */}
              {caseType === 'descuento' && (
                <div className="flex flex-wrap items-center justify-between gap-1.5 py-1 px-1.5 border-b border-white/10 shrink-0 bg-slate-500/5 rounded-lg my-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Precio Prenda:</span>
                    <span className="font-mono text-sm font-black text-cyan-600 dark:text-cyan-400">S/ {productPrice}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                      1 cuadrito (1%) = S/ {cellMoneyVal}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[40, 60, 80, 100, 120, 200].map(pr => (
                      <button
                        key={`pr-${pr}`}
                        onClick={() => setProductPrice(pr)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                          productPrice === pr
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-2xs scale-105'
                            : isDark
                            ? 'bg-white/5 text-white/60 hover:bg-white/10'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        S/{pr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Caso IGV: Selector de Subtotal sin Impuesto */}
              {caseType === 'igv' && (
                <div className="flex flex-wrap items-center justify-between gap-1.5 py-1 px-1.5 border-b border-white/10 shrink-0 bg-slate-500/5 rounded-lg my-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subtotal de compra (Base 100%):</span>
                    <span className="font-mono text-sm font-black text-purple-700 dark:text-purple-300">S/ {subtotalPrice}.00</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30 font-mono font-bold">
                      1 cuadrito (1%) = S/ {igvCellMoneyVal}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[50, 100, 150, 200, 300].map(sb => (
                      <button
                        key={`sb-${sb}`}
                        onClick={() => setSubtotalPrice(sb)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                          subtotalPrice === sb
                            ? 'bg-purple-600 text-white font-black shadow-2xs scale-105'
                            : isDark
                            ? 'bg-white/5 text-white/60 hover:bg-white/10'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        S/{sb}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CONTENIDO VISUAL SEGÚN EL CASO ── */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden">
                {/* 1. VISUALIZADOR DE DESCUENTO COMERCIAL */}
                {caseType === 'descuento' && (
                  <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 overflow-hidden">
                    {/* Rejilla Cuadrada Grande de 100 partes (10x10) con dinero visible en cada cuadrito */}
                    <div className="h-full flex items-center justify-center min-h-0 shrink-0">
                      <svg
                        viewBox="0 0 500 500"
                        className={`aspect-square h-full max-h-[min(64vh,340px)] lg:max-h-[min(72vh,420px)] w-auto select-none shadow-lg rounded-xl overflow-hidden border-2 ${
                          isDark ? 'border-white/20 bg-slate-950/40' : 'border-slate-300 bg-white shadow-sm'
                        }`}
                      >
                        <defs>
                          <clipPath id="discount-grid-clip">
                            <rect x="0" y="0" width="500" height="500" rx="8" />
                          </clipPath>
                        </defs>

                        <g clipPath="url(#discount-grid-clip)">
                          {Array.from({ length: 100 }, (_, i) => {
                            const row = Math.floor(i / 10)
                            const col = i % 10
                            const x = col * 50
                            const y = row * 50
                            const paidCount = 100 - discountPercent
                            const isPaid = i < paidCount

                            return (
                              <g key={`disc-cell-${i}`}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={50}
                                  height={50}
                                  fill={isPaid ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f43f5e' : '#e11d48')}
                                  stroke="#ffffff"
                                  strokeWidth={1.5}
                                  shapeRendering="crispEdges"
                                />
                                <text
                                  x={x + 25}
                                  y={y + 25}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#ffffff"
                                  fontSize={18}
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  className="select-none pointer-events-none drop-shadow-xs"
                                >
                                  {cellMoneyVal}
                                </text>
                              </g>
                            )
                          })}
                        </g>
                      </svg>
                    </div>

                    {/* Tarjetas Resumen Descuento */}
                    <div className="flex flex-col justify-center gap-2 sm:gap-2.5 w-full sm:w-60 lg:w-72 shrink-0">
                      {/* Tarjeta Lo que Pagas (Verde) */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 text-center space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-2xs" />
                          <span>PAGAS ({100 - discountPercent}%)</span>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                          S/ {((productPrice * (100 - discountPercent)) / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-emerald-900 dark:text-emerald-300 font-mono font-bold bg-emerald-500/20 py-0.5 px-2 rounded inline-block">
                          {100 - discountPercent} cuadritos × S/ {cellMoneyVal}
                        </div>
                      </div>

                      {/* Tarjeta Lo que Ahorras (Rojo) */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/15 border-2 border-rose-500/30 text-center space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                          <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block shadow-2xs" />
                          <span>TE AHORRAS ({discountPercent}%)</span>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-rose-600 dark:text-rose-400">
                          - S/ {((productPrice * discountPercent) / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-rose-900 dark:text-rose-300 font-mono font-bold bg-rose-500/20 py-0.5 px-2 rounded inline-block">
                          {discountPercent} cuadritos × S/ {cellMoneyVal}
                        </div>
                      </div>

                      {/* Nota pedagógica directa de cálculo */}
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-500/10 border border-slate-300 dark:border-white/10 text-center text-xs font-mono space-y-0.5">
                        <div className="text-slate-600 dark:text-slate-400 text-[11px]">S/ {productPrice} ÷ 100 partes =</div>
                        <div className="font-bold text-cyan-700 dark:text-cyan-300">
                          S/ {cellMoneyVal} <span className="text-slate-700 dark:text-slate-300 font-normal">por cada cuadrito (1%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. VISUALIZADOR DE IMPUESTO IGV (+18%) */}
                {caseType === 'igv' && (
                  <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 overflow-hidden">
                    {/* Gráfico Vectorial Unificado: Cuadrado Base (100) + Símbolo Más (+) + 18 Cuadritos Extras */}
                    <div className="h-full flex items-center justify-center min-h-0 shrink-0">
                      <svg
                        viewBox="0 0 700 535"
                        className={`h-full max-h-[min(64vh,340px)] lg:max-h-[min(72vh,420px)] w-auto select-none shadow-lg rounded-xl overflow-hidden border-2 p-1 ${
                          isDark ? 'border-white/20 bg-slate-950/40' : 'border-slate-300 bg-white shadow-sm'
                        }`}
                        style={{ aspectRatio: '700 / 535' }}
                      >
                        <defs>
                          <clipPath id="igv-base-clip">
                            <rect x="0" y="35" width="500" height="500" rx="8" />
                          </clipPath>
                          <clipPath id="igv-extra-clip">
                            <rect x="580" y="60" width="100" height="450" rx="8" />
                          </clipPath>
                        </defs>

                        {/* Etiquetas descriptivas superiores con alto contraste */}
                        <text
                          x={250}
                          y={24}
                          textAnchor="middle"
                          fill={isDark ? '#c084fc' : '#6b21a8'}
                          fontSize={16}
                          fontWeight="900"
                          letterSpacing="1"
                        >
                          BASE: 100% (100 CUADRITOS)
                        </text>
                        <text
                          x={630}
                          y={24}
                          textAnchor="middle"
                          fill={isDark ? '#fbbf24' : '#b45309'}
                          fontSize={16}
                          fontWeight="900"
                          letterSpacing="1"
                        >
                          IGV: +18%
                        </text>

                        {/* ── Cuadrado Grande de 100 partes (Base) ── */}
                        <g clipPath="url(#igv-base-clip)">
                          {Array.from({ length: 100 }, (_, i) => {
                            const row = Math.floor(i / 10)
                            const col = i % 10
                            const x = col * 50
                            const y = 35 + row * 50

                            return (
                              <g key={`igv-base-cell-${i}`}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={50}
                                  height={50}
                                  fill="#7c3aed"
                                  stroke="#ffffff"
                                  strokeWidth={1.5}
                                  shapeRendering="crispEdges"
                                />
                                <text
                                  x={x + 25}
                                  y={y + 25}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#ffffff"
                                  fontSize={18}
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  className="select-none pointer-events-none drop-shadow-xs"
                                >
                                  {igvCellMoneyVal}
                                </text>
                              </g>
                            )
                          })}
                        </g>

                        {/* ── Símbolo «+» bien visible entre los dos bloques ── */}
                        <g>
                          <circle
                            cx={540}
                            cy={285}
                            r={26}
                            fill={isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'}
                            stroke={isDark ? '#f59e0b' : '#d97706'}
                            strokeWidth={2}
                          />
                          <text
                            x={540}
                            y={285}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isDark ? '#fbbf24' : '#b45309'}
                            fontSize={46}
                            fontWeight="900"
                            fontFamily="monospace"
                          >
                            +
                          </text>
                        </g>

                        {/* ── 18 Cuadritos Adicionales (2 columnas x 9 filas) con texto de alto contraste ── */}
                        <g clipPath="url(#igv-extra-clip)">
                          {Array.from({ length: 18 }, (_, i) => {
                            const col = Math.floor(i / 9) // 0 o 1
                            const row = i % 9            // 0 a 8
                            const x = 580 + col * 50
                            const y = 60 + row * 50

                            return (
                              <g key={`igv-extra-cell-${i}`}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={50}
                                  height={50}
                                  fill="#f59e0b"
                                  stroke="#ffffff"
                                  strokeWidth={1.5}
                                  shapeRendering="crispEdges"
                                />
                                <text
                                  x={x + 25}
                                  y={y + 25}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill={isDark ? '#ffffff' : '#0f172a'}
                                  fontSize={18}
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  className="select-none pointer-events-none drop-shadow-xs"
                                >
                                  {igvCellMoneyVal}
                                </text>
                              </g>
                            )
                          })}
                        </g>
                      </svg>
                    </div>

                    {/* Tarjetas Resumen IGV */}
                    <div className="flex flex-col justify-center gap-2 sm:gap-2.5 w-full sm:w-60 lg:w-72 shrink-0">
                      {/* Tarjeta IGV (18%) */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/30 text-center space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block shadow-2xs" />
                          <span>IGV (+18% al Estado)</span>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-amber-600 dark:text-amber-400">
                          + S/ {(subtotalPrice * 0.18).toFixed(2)}
                        </div>
                        <div className="text-xs text-amber-900 dark:text-amber-300 font-mono font-bold bg-amber-500/20 py-0.5 px-2 rounded inline-block">
                          18 cuadritos × S/ {igvCellMoneyVal}
                        </div>
                      </div>

                      {/* Tarjeta Total Boleta (118%) */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-cyan-500/15 border-2 border-cyan-500/30 text-center space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                          <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block shadow-2xs" />
                          <span>TOTAL EN BOLETA (118%)</span>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-black text-cyan-600 dark:text-cyan-400">
                          S/ {(subtotalPrice * 1.18).toFixed(2)}
                        </div>
                        <div className="text-xs text-cyan-900 dark:text-cyan-300 font-mono font-bold bg-cyan-500/20 py-0.5 px-2 rounded inline-block">
                          118 cuadritos = Base (100) + IGV (18)
                        </div>
                      </div>

                      {/* Explicación pedagógica directa */}
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-500/10 border border-slate-300 dark:border-white/10 text-center text-xs font-mono space-y-0.5">
                        <div className="text-slate-600 dark:text-slate-400 text-[11px]">Subtotal S/ {subtotalPrice} ÷ 100 partes =</div>
                        <div className="font-bold text-purple-700 dark:text-purple-300">
                          S/ {igvCellMoneyVal} <span className="text-slate-700 dark:text-slate-300 font-normal">por cada cuadrito (1%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── BARRA INFERIOR DE CONTROLES Y RESUMEN ── */}
              <div className="w-full pt-1.5 border-t border-white/10 text-xs shrink-0">
                {caseType === 'descuento' && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Porcentaje Descuento:</span>
                      <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">-{discountPercent}%</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30 font-mono">
                        {discountPercent} cuadritos rojos (ahorro)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[10, 20, 25, 50, 70].map(ds => (
                        <button
                          key={`ds-${ds}`}
                          onClick={() => setDiscountPercent(ds)}
                          className={`px-3 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                            discountPercent === ds
                              ? 'bg-rose-500 text-white font-black shadow-2xs scale-105'
                              : isDark
                              ? 'bg-white/5 text-white/60 hover:bg-white/10'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {ds}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {caseType === 'igv' && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Ley del IGV en el Perú:</span>
                      <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-400">+18% adicional</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-mono">
                        18 cuadritos dorados para el Estado
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Total a pagar: <span className="text-cyan-700 dark:text-cyan-400 font-black">118%</span> (100% Subtotal + 18% IGV)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PESTAÑA 4: RETOS CONCEPTUALES (Gamificación con Feedback Pedagógico)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'retos' && (
          <div className={`flex-1 min-h-0 flex flex-col max-w-2xl mx-auto w-full rounded-xl border p-2.5 sm:p-4 justify-between overflow-y-auto relative ${c.cardBg} ${c.cardBorder}`}>
            {/* Header del Reto */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Reto {challengeIndex + 1} de {CHALLENGES.length}
                </span>
                <span className={c.textMuted}>Puntos: {score}</span>
              </div>
              <button
                onClick={handleResetChallenge}
                className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Reiniciar retos
              </button>
            </div>

            {/* Pregunta del Reto */}
            <div className="py-2 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                {currentChallenge.question}
              </h3>
              <p className="text-xs text-amber-300/90 font-medium">
                💡 Pista: {currentChallenge.hint}
              </p>
            </div>

            {/* Opciones de Respuesta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1">
              {currentChallenge.options.map((opt, idx) => {
                const isSelected = selectedOption === idx
                let btnStyle = isDark
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'

                if (selectedOption !== null) {
                  if (opt.correct) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                  }
                }

                return (
                  <button
                    key={`opt-${idx}`}
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOption !== null}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${btnStyle} ${
                      selectedOption !== null ? 'cursor-default' : 'active:scale-98'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {selectedOption !== null && opt.correct && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 ml-1" />
                    )}
                    {selectedOption !== null && isSelected && !opt.correct && (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 ml-1" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explicación Pedagógica Inmediata */}
            {showExplanation && (
              <div
                className={`p-2.5 rounded-xl border text-xs space-y-1 animate-fade-in ${
                  currentChallenge.options[selectedOption!].correct
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  {currentChallenge.options[selectedOption!].correct ? '¡Correcto!' : 'Explicación:'}
                </div>
                <p>{currentChallenge.options[selectedOption!].explanation}</p>
              </div>
            )}

            {/* Botón Siguiente Reto */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={handleNextChallenge}
                disabled={selectedOption === null}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  selectedOption === null
                    ? 'opacity-30 cursor-not-allowed bg-slate-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs'
                }`}
              >
                <span>Siguiente Reto</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DE AYUDA PEDAGÓGICA (ModalHelp) ────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía Conceptual: ¿Qué es realmente un Porcentaje?"
        bgColor={isDark ? '#0a1020' : '#ffffff'}
        titleColor={isDark ? '#ffffff' : '#0f172a'}
        maxWidth="max-w-md"
        buttonColor="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
      >
        <div className={`space-y-4 text-xs sm:text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}>
              1. El significado literal: «Por cada ciento»
            </h4>
            <p>
              El símbolo <strong>%</strong> significa simplemente <strong>dividir entre 100</strong>. Si algo tiene 25%, quiere decir que tomamos 25 partes de cada 100 partes iguales.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}>
              2. La Triple Equivalencia
            </h4>
            <p>
              Cualquier porcentaje se puede escribir de 3 formas equivalentes:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-xs">
              <li><strong>Porcentaje:</strong> 50%</li>
              <li><strong>Fracción irreducible:</strong> 50/100 = 1/2 (la mitad)</li>
              <li><strong>Decimal:</strong> 0.50</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-emerald-300' : 'text-emerald-700'
            }`}>
              3. ¿Cómo calcular el P% de una cantidad N?
            </h4>
            <p>
              No necesitas memorizar una fórmula mecánica:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1 text-xs">
              <li>Averigua cuánto vale el <strong>1%</strong> (divide el total entre 100).</li>
              <li>Multiplica ese resultado por el porcentaje que buscas.</li>
            </ol>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}>
              4. Porcentajes Amigables
            </h4>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-xs">
              <li><strong>50%</strong> = Dividir entre 2 (la mitad).</li>
              <li><strong>25%</strong> = Dividir entre 4 (la cuarta parte).</li>
              <li><strong>10%</strong> = Dividir entre 10 (la décima parte).</li>
              <li><strong>75%</strong> = Las tres cuartas partes (50% + 25%).</li>
            </ul>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
