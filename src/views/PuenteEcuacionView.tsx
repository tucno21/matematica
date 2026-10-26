import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Check,
  Merge,
  RotateCcw,
  Divide
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface TermCard {
  id: string
  coeff: number
  hasVar: boolean
  side: 'left' | 'right'
}

interface BridgePreset {
  label: string
  leftExpr: string
  rightExpr: string
  desc: string
}

const BRIDGE_PRESETS: BridgePreset[] = [
  {
    label: '3x = 12',
    leftExpr: '3x',
    rightExpr: '12',
    desc: 'Caso clave: el factor 3 que multiplica pasa al otro lado dividiendo'
  },
  {
    label: '3x + 5 = 14',
    leftExpr: '3x + 5',
    rightExpr: '14',
    desc: 'Trasponer +5 al segundo miembro y luego despejar el factor 3'
  },
  {
    label: '4x - 2 = 2x + 8',
    leftExpr: '4x - 2',
    rightExpr: '2x + 8',
    desc: 'Variables y números en ambos miembros: trasponer y fusionar'
  },
  {
    label: '5x + 3 = 2x + 15',
    leftExpr: '5x + 3',
    rightExpr: '2x + 15',
    desc: 'Trasponer 2x a la izquierda y 3 a la derecha hasta llegar a 3x = 12'
  },
  {
    label: '2x + 7 = 19',
    leftExpr: '2x + 7',
    rightExpr: '19',
    desc: 'Trasponer +7 restando y pasar el 2 dividiendo'
  },
  {
    label: '6x - 4 = 3x + 11',
    leftExpr: '6x - 4',
    rightExpr: '3x + 11',
    desc: 'Términos negativos trasponiendo a positivos (+)'
  }
]

const KB_ROWS = [
  ['1', '2', '3', 'x', '⌫'],
  ['4', '5', '6', '2x', '+'],
  ['7', '8', '9', '3x', '−'],
  ['0', 'C', '✓'],
]

// Parsea expresiones a tarjetas de términos
function parseExprToCards(expr: string, side: 'left' | 'right'): TermCard[] {
  const clean = expr.replace(/\s+/g, '').replace(/−/g, '-').replace(/X/g, 'x')
  if (!clean) return []
  const matches = clean.match(/[+-]?[^+-]+/g) || []
  const list: TermCard[] = []

  matches.forEach((p, idx) => {
    if (p.includes('x')) {
      let coeffStr = p.replace('x', '')
      if (coeffStr === '' || coeffStr === '+') coeffStr = '1'
      if (coeffStr === '-') coeffStr = '-1'
      const n = parseInt(coeffStr, 10)
      if (!isNaN(n) && n !== 0) {
        list.push({
          id: `card-${side}-v-${idx}-${Date.now()}-${Math.random()}`,
          coeff: n,
          hasVar: true,
          side,
        })
      }
    } else {
      const n = parseInt(p, 10)
      if (!isNaN(n) && n !== 0) {
        list.push({
          id: `card-${side}-n-${idx}-${Date.now()}-${Math.random()}`,
          coeff: n,
          hasVar: false,
          side,
        })
      }
    }
  })

  return list
}

export default function PuenteEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  // Editor con teclado virtual
  const [kbL, setKbL] = useState(BRIDGE_PRESETS[0].leftExpr)
  const [kbR, setKbR] = useState(BRIDGE_PRESETS[0].rightExpr)
  const [activeKb, setActiveKb] = useState<'left' | 'right' | null>(null)

  // Referencia al contenedor de la mesa para cálculo de coordenadas del puente
  const boardRef = useRef<HTMLDivElement>(null)

  // Tarjetas en el tapete
  const [cards, setCards] = useState<TermCard[]>(() => [
    ...parseExprToCards(BRIDGE_PRESETS[0].leftExpr, 'left'),
    ...parseExprToCards(BRIDGE_PRESETS[0].rightExpr, 'right'),
  ])

  // Historial para deshacer
  const [history, setHistory] = useState<TermCard[][]>([])

  // Estado del vuelo parabólico de un término (+ <-> -)
  const [flyingToken, setFlyingToken] = useState<{
    card: TermCard
    x: number
    y: number
    displayLabel: string
    displaySign: number
    isAtApex: boolean
  } | null>(null)

  // ID del término que está volando (para ocultarlo de la mesa durante el salto)
  const [crossingId, setCrossingId] = useState<string | null>(null)

  // Estado del vuelo parabólico del coeficiente (ax = b -> x = b/a)
  const [coeffDivState, setCoeffDivState] = useState<{
    stage: 'idle' | 'flying' | 'fraction' | 'solved'
    coeff: number
    num: number
    result: number
    varSide: 'left' | 'right'
    numSide: 'left' | 'right'
    flyX: number
    flyY: number
    isAtApex: boolean
    isFlipped: boolean
  }>({
    stage: 'idle',
    coeff: 0,
    num: 0,
    result: 0,
    varSide: 'left',
    numSide: 'right',
    flyX: 0,
    flyY: 0,
    isAtApex: false,
    isFlipped: false,
  })

  // Mensaje de feedback
  const [fbMsg, setFbMsg] = useState('Toca una tarjeta para trasponerla en parábola por el puente del =.')
  const [solvedState, setSolvedState] = useState(false)
  const [finalXState, setFinalXState] = useState<number | null>(null)

  const leftTerms = cards.filter(c => c.side === 'left')
  const rightTerms = cards.filter(c => c.side === 'right')

  const isAlreadySolved =
    (leftTerms.length === 1 &&
      leftTerms[0].hasVar &&
      leftTerms[0].coeff === 1 &&
      rightTerms.length === 1 &&
      !rightTerms[0].hasVar &&
      coeffDivState.stage === 'idle') ||
    (rightTerms.length === 1 &&
      rightTerms[0].hasVar &&
      rightTerms[0].coeff === 1 &&
      leftTerms.length === 1 &&
      !leftTerms[0].hasVar &&
      coeffDivState.stage === 'idle')

  const solved = solvedState || isAlreadySolved
  const finalX =
    finalXState !== null
      ? finalXState
      : isAlreadySolved
      ? (leftTerms[0]?.hasVar ? rightTerms[0]?.coeff : leftTerms[0]?.coeff) ?? null
      : null

  // Carga una ecuación dada
  const loadEquation = useCallback((lExpr: string, rExpr: string, desc?: string) => {
    setCrossingId(null)
    setFlyingToken(null)
    setCoeffDivState({
      stage: 'idle',
      coeff: 0,
      num: 0,
      result: 0,
      varSide: 'left',
      numSide: 'right',
      flyX: 0,
      flyY: 0,
      isAtApex: false,
      isFlipped: false,
    })
    setSolvedState(false)
    setFinalXState(null)
    setHistory([])
    setActiveKb(null)

    const lCards = parseExprToCards(lExpr, 'left')
    const rCards = parseExprToCards(rExpr, 'right')
    setCards([...lCards, ...rCards])
    setFbMsg(desc || `Ecuación cargada: ${lExpr} = ${rExpr}`)
  }, [])

  const handleSelectPreset = (idxStr: string) => {
    const idx = parseInt(idxStr, 10)
    setPresetIdx(idx)
    if (!isNaN(idx) && BRIDGE_PRESETS[idx]) {
      setKbL(BRIDGE_PRESETS[idx].leftExpr)
      setKbR(BRIDGE_PRESETS[idx].rightExpr)
      loadEquation(BRIDGE_PRESETS[idx].leftExpr, BRIDGE_PRESETS[idx].rightExpr, BRIDGE_PRESETS[idx].desc)
    }
  }

  // Teclado virtual
  const handleKb = useCallback((key: string) => {
    const set = activeKb === 'left' ? setKbL : setKbR
    if (key === '⌫') set(p => p.slice(0, -1))
    else if (key === 'C') set('')
    else if (key === '✓') {
      setActiveKb(null)
      loadEquation(kbL, kbR)
    } else set(p => p + key)
  }, [activeKb, kbL, kbR, loadEquation])

  // Soporte de teclado físico (para laptops y computadoras)
  useEffect(() => {
    if (!activeKb) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveKb(null)
      } else if (e.key === 'Enter') {
        setActiveKb(null)
        loadEquation(kbL, kbR)
      } else if (e.key === 'Backspace') {
        const set = activeKb === 'left' ? setKbL : setKbR
        set(p => p.slice(0, -1))
      } else if (/^[0-9xX+\-=]$/.test(e.key)) {
        const set = activeKb === 'left' ? setKbL : setKbR
        set(p => p + (e.key === '-' ? '−' : e.key.toLowerCase()))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeKb, kbL, kbR, loadEquation])

  // Deshacer movimiento
  const handleUndo = () => {
    if (history.length === 0 || crossingId || coeffDivState.stage === 'flying') return
    const prev = history[history.length - 1]
    setCards(prev)
    setHistory(h => h.slice(0, -1))
    setCoeffDivState({
      stage: 'idle',
      coeff: 0,
      num: 0,
      result: 0,
      varSide: 'left',
      numSide: 'right',
      flyX: 0,
      flyY: 0,
      isAtApex: false,
      isFlipped: false,
    })
    setSolvedState(false)
    setFinalXState(null)
    setFbMsg('Paso anterior restaurado.')
  }

  // ── 1. MOVIMIENTO PARABÓLICO SUAVE PARA TÉRMINOS (+ <-> -) ──
  const crossBridgeParabolic = (card: TermCard, event: React.MouseEvent<HTMLDivElement>) => {
    if (solved || crossingId || coeffDivState.stage !== 'idle') return

    const board = boardRef.current
    if (!board) return

    const cardRect = event.currentTarget.getBoundingClientRect()
    const boardRect = board.getBoundingClientRect()

    const startX = cardRect.left - boardRect.left + cardRect.width / 2
    const startY = cardRect.top - boardRect.top + cardRect.height / 2

    const targetSide = card.side === 'left' ? 'right' : 'left'
    const endX = targetSide === 'right' ? boardRect.width * 0.75 : boardRect.width * 0.25
    const endY = boardRect.height * 0.5
    const midX = boardRect.width * 0.5
    const midY = Math.max(30, boardRect.height * 0.15) // altura del arco sobre el puente =

    const originalCoeff = card.coeff
    const flippedCoeff = -card.coeff

    const origLabel = card.hasVar
      ? `${originalCoeff === 1 ? '' : originalCoeff === -1 ? '−' : originalCoeff}x`
      : `${originalCoeff}`
    const flippedLabel = card.hasVar
      ? `${flippedCoeff > 0 ? '+' : ''}${flippedCoeff === 1 ? '' : flippedCoeff === -1 ? '−' : flippedCoeff}x`
      : `${flippedCoeff > 0 ? '+' : ''}${flippedCoeff}`

    // Guardar en historial
    setHistory(prev => [...prev, cards])
    setCrossingId(card.id)

    let startTime: number | null = null
    const duration = 1400 // ms - velocidad suave y bien visible para observar el cruce

    const animate = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const rawT = Math.min(1, elapsed / duration)
      // Easing suave sinusoidal (arranque suave, cúspide fluida y aterrizaje suave)
      const t = 0.5 - 0.5 * Math.cos(Math.PI * rawT)

      // Ecuación cuadrática de Bézier para la parábola
      const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX
      const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY

      const isAtApex = rawT >= 0.42 && rawT <= 0.58
      const isPastApex = rawT >= 0.5

      setFlyingToken({
        card,
        x: curX,
        y: curY,
        displayLabel: isPastApex ? flippedLabel : origLabel,
        displaySign: isPastApex ? (flippedCoeff > 0 ? 1 : -1) : (originalCoeff > 0 ? 1 : -1),
        isAtApex,
      })

      if (isPastApex) {
        setFbMsg(`⚡ ¡Cruzando el puente! ${origLabel} invierte su operación a ${flippedLabel}.`)
      }

      if (rawT < 1) {
        requestAnimationFrame(animate)
      } else {
        // Aterrizaje completado: actualizar estado oficial
        setCards(prev => prev.map(c => {
          if (c.id === card.id) {
            return { ...c, coeff: flippedCoeff, side: targetSide }
          }
          return c
        }))
        setCrossingId(null)
        setFlyingToken(null)
        setFbMsg(`Aterrizaje en el ${targetSide === 'right' ? 'segundo' : 'primer'} miembro: ahora es ${flippedLabel}.`)
      }
    }

    requestAnimationFrame(animate)
  }

  // ── 2. FUSIÓN DE TÉRMINOS SEMEJANTES (Reducir) ──
  const canSimplifyLeft = leftTerms.length > 1 && (leftTerms.filter(t => t.hasVar).length > 1 || leftTerms.filter(t => !t.hasVar).length > 1)
  const canSimplifyRight = rightTerms.length > 1 && (rightTerms.filter(t => t.hasVar).length > 1 || rightTerms.filter(t => !t.hasVar).length > 1)
  const canSimplify = (canSimplifyLeft || canSimplifyRight) && !crossingId && coeffDivState.stage === 'idle'

  const handleSimplify = () => {
    if (!canSimplify) return
    setHistory(prev => [...prev, cards])

    const simplifySide = (terms: TermCard[], side: 'left' | 'right'): TermCard[] => {
      let varCoeff = 0
      let numCoeff = 0
      let hasV = false
      let hasN = false

      for (const t of terms) {
        if (t.hasVar) {
          varCoeff += t.coeff
          hasV = true
        } else {
          numCoeff += t.coeff
          hasN = true
        }
      }

      const out: TermCard[] = []
      if (hasV && varCoeff !== 0) {
        out.push({ id: `merged-v-${side}-${Math.random()}`, coeff: varCoeff, hasVar: true, side })
      }
      if (hasN && numCoeff !== 0) {
        out.push({ id: `merged-n-${side}-${Math.random()}`, coeff: numCoeff, hasVar: false, side })
      }
      return out
    }

    const newLeft = simplifySide(leftTerms, 'left')
    const newRight = simplifySide(rightTerms, 'right')
    setCards([...newLeft, ...newRight])
    setFbMsg('Términos semejantes reducidos en ambos miembros.')
  }

  // ── 3. DETECCIÓN DEL CASO ax = b (ej. 3x = 12) ──
  let canDivideCoeff = false
  let varSide: 'left' | 'right' = 'left'
  let numSide: 'left' | 'right' = 'right'
  let currentA = 1
  let currentB = 0

  if (
    leftTerms.length === 1 &&
    leftTerms[0].hasVar &&
    rightTerms.length === 1 &&
    !rightTerms[0].hasVar &&
    !crossingId &&
    coeffDivState.stage === 'idle'
  ) {
    canDivideCoeff = leftTerms[0].coeff !== 1
    varSide = 'left'
    numSide = 'right'
    currentA = leftTerms[0].coeff
    currentB = rightTerms[0].coeff
  } else if (
    rightTerms.length === 1 &&
    rightTerms[0].hasVar &&
    leftTerms.length === 1 &&
    !leftTerms[0].hasVar &&
    !crossingId &&
    coeffDivState.stage === 'idle'
  ) {
    canDivideCoeff = rightTerms[0].coeff !== 1
    varSide = 'right'
    numSide = 'left'
    currentA = rightTerms[0].coeff
    currentB = leftTerms[0].coeff
  }

  // ── 4. LANZAR VUELO PARABÓLICO DEL COEFICIENTE a (Multiplica -> Divide) ──
  const launchCoeffDivision = (event?: React.MouseEvent) => {
    if (!canDivideCoeff || coeffDivState.stage !== 'idle') return

    const board = boardRef.current
    if (!board) return

    setHistory(prev => [...prev, cards])
    setCards(prev => prev.map(c => {
      if (c.hasVar && c.side === varSide) {
        return { ...c, coeff: 1 }
      }
      return c
    }))

    const boardRect = board.getBoundingClientRect()
    let startX = varSide === 'left' ? boardRect.width * 0.32 : boardRect.width * 0.68
    let startY = boardRect.height * 0.5

    if (event) {
      const btnRect = event.currentTarget.getBoundingClientRect()
      startX = btnRect.left - boardRect.left + btnRect.width / 2
      startY = btnRect.top - boardRect.top + btnRect.height / 2
    }

    const endX = numSide === 'right' ? boardRect.width * 0.75 : boardRect.width * 0.25
    const endY = boardRect.height * 0.62 // aterriza debajo del número (como denominador)
    const midX = boardRect.width * 0.5
    const midY = Math.max(30, boardRect.height * 0.12)

    const a = currentA
    const b = currentB
    const res = Math.round((b / a) * 100) / 100

    setCoeffDivState({
      stage: 'flying',
      coeff: a,
      num: b,
      result: res,
      varSide,
      numSide,
      flyX: startX,
      flyY: startY,
      isAtApex: false,
      isFlipped: false,
    })

    let startTime: number | null = null
    const duration = 1400 // ms - velocidad suave para observar la trasposición de multiplicación a división

    const animate = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const rawT = Math.min(1, elapsed / duration)
      // Easing suave sinusoidal
      const t = 0.5 - 0.5 * Math.cos(Math.PI * rawT)

      const curX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX
      const curY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY

      const isAtApex = rawT >= 0.42 && rawT <= 0.58
      const isPastApex = rawT >= 0.5

      setCoeffDivState(prev => ({
        ...prev,
        flyX: curX,
        flyY: curY,
        isAtApex,
        isFlipped: isPastApex,
      }))

      if (isPastApex) {
        setFbMsg(`⚡ ¡El factor ${a} que multiplicaba cruza el puente y pasa a DIVIDIR al denominador!`)
      }

      if (rawT < 1) {
        requestAnimationFrame(animate)
      } else {
        // Llega como fracción b / a
        setCoeffDivState(prev => ({
          ...prev,
          stage: 'fraction',
          isAtApex: false,
        }))
        setFbMsg(`¡Ubicado en el denominador! Ahora tenemos ${b} ÷ ${a}. Toca el botón para calcular.`)
      }
    }

    requestAnimationFrame(animate)
  }

  // ── 5. RESOLVER FRACCIÓN b / a -> resultado final ──
  const handleResolveFraction = () => {
    if (coeffDivState.stage !== 'fraction') return

    const { result, varSide, numSide, num, coeff } = coeffDivState
    setFinalXState(result)
    setSolvedState(true)

    const newCards: TermCard[] = [
      { id: 'final-x', coeff: 1, hasVar: true, side: varSide },
      { id: 'final-num', coeff: result, hasVar: false, side: numSide },
    ]
    setCards(newCards)
    setCoeffDivState(prev => ({ ...prev, stage: 'solved' }))
    setFbMsg(`¡Ecuación resuelta! ${num} ÷ ${coeff} = ${result}. Por lo tanto: x = ${result}.`)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
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
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              El Puente del Igual
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-violet-400/10 text-violet-300 border border-violet-400/20">
              Transposición Parabólica
            </span>
          </div>
        </div>

        {/* Ecuación actual simplificada en la cabecera */}
        <div className="font-mono text-xs lg:text-sm font-bold text-violet-300 bg-violet-400/10 px-2.5 py-0.5 rounded-md border border-violet-400/20">
          {BRIDGE_PRESETS[presetIdx]?.label || `${kbL} = ${kbR}`}
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

      {/* ── 2. Barra de Control con Selector y Teclado Virtual (36-42px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Reto:</span>
          <select
            value={presetIdx}
            onChange={e => handleSelectPreset(e.target.value)}
            className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/10 border border-white/15 text-[10px] sm:text-[11px] lg:text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
          >
            {BRIDGE_PRESETS.map((p, i) => (
              <option key={i} value={i} className="bg-[#0f172a] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de Miembro Táctiles con Teclado Virtual */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveKb(activeKb === 'left' ? null : 'left')}
            className={`h-7 lg:h-8 min-w-[56px] sm:min-w-[70px] lg:min-w-[84px] px-2 rounded-md font-mono text-[10px] sm:text-[11px] lg:text-xs font-bold border transition-all truncate text-center cursor-pointer ${
              activeKb === 'left'
                ? 'border-violet-400 bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/50'
                : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
            }`}
            title="Tocar para editar 1° miembro con teclado virtual"
          >
            {kbL || '0'}
          </button>
          <span className="text-white/40 font-bold text-xs lg:text-sm shrink-0">=</span>
          <button
            type="button"
            onClick={() => setActiveKb(activeKb === 'right' ? null : 'right')}
            className={`h-7 lg:h-8 min-w-[56px] sm:min-w-[70px] lg:min-w-[84px] px-2 rounded-md font-mono text-[10px] sm:text-[11px] lg:text-xs font-bold border transition-all truncate text-center cursor-pointer ${
              activeKb === 'right'
                ? 'border-violet-400 bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/50'
                : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
            }`}
            title="Tocar para editar 2° miembro con teclado virtual"
          >
            {kbR || '0'}
          </button>
          <button
            type="button"
            onClick={() => loadEquation(kbL, kbR)}
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] sm:text-[11px] lg:text-xs active:scale-95 transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
            title="Cargar ecuación"
          >
            <RefreshCw size={11} />
            <span className="hidden xs:inline">Cargar</span>
          </button>
        </div>

        {/* Acciones de Reinicio y Deshacer */}
        <div className="flex items-center gap-1 shrink-0">
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
              title="Deshacer último movimiento"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
          )}

          <button
            onClick={() => loadEquation(kbL, kbR)}
            className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Reiniciar reto"
          >
            <RefreshCw size={11} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* ── 3. Área de Trabajo Central: El Puente (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1.5 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Panel Izquierdo: Acciones */}
        <aside className="w-[54px] sm:w-[62px] lg:w-[74px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Acción
            </span>

            {/* Botón Fusionar Términos Semejantes */}
            <button
              onClick={handleSimplify}
              disabled={!canSimplify}
              className={`w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm ${
                canSimplify
                  ? 'bg-violet-500/25 border-2 border-violet-400 text-violet-200 hover:bg-violet-500/35 ring-2 ring-violet-400/40 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-40'
              }`}
              title="Reducir y fusionar términos semejantes"
            >
              <Merge size={16} />
              <span className="text-[8px] lg:text-[9px] mt-0.5">Fusionar</span>
            </button>

            {/* Botón Despejar Coeficiente (ax = b) */}
            {canDivideCoeff && (
              <button
                onClick={e => launchCoeffDivision(e)}
                className="w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg bg-amber-500/25 border-2 border-amber-400 text-amber-200 hover:bg-amber-500/35 ring-2 ring-amber-400/40 animate-pulse flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm"
                title={`Despejar x pasando ${currentA} a dividir`}
              >
                <Divide size={16} />
                <span className="text-[8px] lg:text-[9px] mt-0.5 font-bold">÷ {currentA}</span>
              </button>
            )}
          </div>

          <div className="text-[7px] sm:text-[8px] text-white/30 text-center px-0.5 leading-tight">
            Toca fichas
          </div>
        </aside>

        {/* Mesa del Puente Central */}
        <main
          ref={boardRef}
          className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-2 lg:p-4 overflow-hidden relative"
        >
          <div className="flex-1 min-h-0 flex items-stretch gap-2 lg:gap-4 relative">
            {/* ── LADO IZQUIERDO (Primer Miembro) ── */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1329]/80 border border-sky-500/20 rounded-xl p-2 lg:p-3 justify-between overflow-hidden relative">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-sky-400/80 border-b border-white/5 pb-1">
                <span>Primer Miembro</span>
                <span className="text-[10px] text-white/40 font-mono">
                  {canDivideCoeff && varSide === 'left' ? 'Despejar x' : 'Toca para trasponer'}
                </span>
              </div>

              {/* Contenido del Miembro Izquierdo */}
              <div className="flex-1 min-h-0 flex flex-wrap items-center justify-center content-center gap-2 lg:gap-3 p-2 overflow-y-auto">
                {/* Caso Especial: Despeje del coeficiente en ax = b */}
                {canDivideCoeff && varSide === 'left' && coeffDivState.stage === 'idle' ? (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-sky-950/40 border border-sky-400/30">
                    <button
                      onClick={e => launchCoeffDivision(e)}
                      className="h-11 sm:h-13 lg:h-14 px-4 sm:px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono font-black text-xl lg:text-2xl border-2 border-violet-300 shadow-xl shadow-violet-500/40 animate-pulse ring-2 ring-violet-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      title={`Tocar para pasar el ${currentA} dividiendo al otro lado`}
                    >
                      <span>{currentA}</span>
                    </button>
                    <span className="text-white/40 font-mono font-bold text-xl">·</span>
                    <span className="h-11 sm:h-13 lg:h-14 px-4 sm:px-5 rounded-xl font-mono font-black text-2xl lg:text-3xl text-sky-300 bg-white/5 border border-white/10 flex items-center justify-center">
                      x
                    </span>
                  </div>
                ) : varSide === 'left' && coeffDivState.stage !== 'idle' ? (
                  <div className="h-11 sm:h-13 lg:h-14 px-5 sm:px-6 rounded-xl border-2 border-sky-400 bg-sky-500/25 text-sky-200 flex items-center justify-center font-mono font-black text-2xl lg:text-3xl shadow-lg ring-2 ring-sky-400/30">
                    x
                  </div>
                ) : (
                  leftTerms.map(term => {
                    const isCrossing = crossingId === term.id
                    const isPos = term.coeff > 0
                    return (
                      <div
                        key={term.id}
                        onClick={e => crossBridgeParabolic(term, e)}
                        className={`h-11 sm:h-13 lg:h-14 px-3 sm:px-4 lg:px-5 rounded-xl border-2 flex items-center justify-center font-mono font-black text-sm sm:text-base lg:text-lg cursor-pointer select-none shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                          term.hasVar
                            ? isPos
                              ? 'bg-sky-500/25 border-sky-400 text-sky-200 hover:bg-sky-500/35'
                              : 'bg-rose-500/25 border-rose-400 text-rose-200 hover:bg-rose-500/35'
                            : isPos
                            ? 'bg-blue-500/25 border-blue-400 text-blue-200 hover:bg-blue-500/35'
                            : 'bg-red-500/25 border-red-400 text-red-200 hover:bg-red-500/35'
                        } ${isCrossing ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                        title="Tocar para trasladar al otro lado por el puente"
                      >
                        <span>
                          {term.hasVar
                            ? (term.coeff === 1 ? 'x' : term.coeff === -1 ? '−x' : `${isPos ? '+' : ''}${term.coeff}x`)
                            : `${isPos ? '+' : ''}${term.coeff}`}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="text-[9px] text-white/30 text-center">
                {canDivideCoeff && varSide === 'left'
                  ? 'Toca el número para pasarlo dividiendo'
                  : 'Toca cualquier término para pasarlo al otro lado del puente'}
              </div>
            </div>

            {/* ── EL PUENTE ENERGÉTICO DEL = ── */}
            <div className="w-12 lg:w-16 shrink-0 flex flex-col items-center justify-center relative">
              {/* Haz de energía vertical */}
              <div className="h-full w-1 bg-gradient-to-b from-transparent via-violet-500/60 to-transparent absolute shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

              {/* Portal del = */}
              <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 border-2 border-violet-300 shadow-xl shadow-violet-500/40 flex flex-col items-center justify-center z-10 animate-pulse">
                <span className="font-mono font-black text-xl lg:text-2xl text-white leading-none">=</span>
                <span className="text-[7px] lg:text-[8px] font-bold text-violet-200 tracking-tighter uppercase">
                  Puente
                </span>
              </div>
            </div>

            {/* ── LADO DERECHO (Segundo Miembro) ── */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1329]/80 border border-teal-500/20 rounded-xl p-2 lg:p-3 justify-between overflow-hidden relative">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-teal-400/80 border-b border-white/5 pb-1">
                <span>Segundo Miembro</span>
                <span className="text-[10px] text-white/40 font-mono">
                  {coeffDivState.stage === 'fraction' ? 'Fracción formada' : 'Toca para trasponer'}
                </span>
              </div>

              {/* Contenido del Miembro Derecho */}
              <div className="flex-1 min-h-0 flex flex-wrap items-center justify-center content-center gap-2 lg:gap-3 p-2 overflow-y-auto">
                {/* Visualización de la fracción generada cuando el coeficiente aterriza en el denominador */}
                {coeffDivState.stage === 'fraction' ? (
                  <div className="flex flex-col items-center gap-2 animate-bounce">
                    <div className="flex flex-col items-center font-mono font-black text-xl lg:text-2xl text-white bg-teal-950/40 border-2 border-teal-400/60 rounded-xl p-2.5 shadow-xl">
                      <span className="text-teal-200">{coeffDivState.num}</span>
                      <div className="w-12 lg:w-16 h-0.5 bg-amber-400 my-1 rounded" />
                      <span className="text-amber-300 text-lg lg:text-xl font-bold flex items-center gap-1">
                        {coeffDivState.coeff}
                      </span>
                    </div>

                    <button
                      onClick={handleResolveFraction}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all animate-pulse"
                    >
                      <Check size={13} />
                      <span>Calcular: {coeffDivState.num} ÷ {coeffDivState.coeff} = {coeffDivState.result}</span>
                    </button>
                  </div>
                ) : canDivideCoeff && varSide === 'right' && coeffDivState.stage === 'idle' ? (
                  /* Coeficiente interactivo si la variable estuviese a la derecha */
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-teal-950/40 border border-teal-400/30">
                    <button
                      onClick={e => launchCoeffDivision(e)}
                      className="h-11 sm:h-13 lg:h-14 px-4 sm:px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-mono font-black text-xl lg:text-2xl border-2 border-violet-300 shadow-xl shadow-violet-500/40 animate-pulse ring-2 ring-violet-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      title={`Tocar para pasar el ${currentA} dividiendo al otro lado`}
                    >
                      <span>{currentA}</span>
                    </button>
                    <span className="text-white/40 font-mono font-bold text-xl">·</span>
                    <span className="h-11 sm:h-13 lg:h-14 px-4 sm:px-5 rounded-xl font-mono font-black text-2xl lg:text-3xl text-sky-300 bg-white/5 border border-white/10 flex items-center justify-center">
                      x
                    </span>
                  </div>
                ) : varSide === 'right' && coeffDivState.stage === 'flying' ? (
                  <div className="h-11 sm:h-13 lg:h-14 px-5 sm:px-6 rounded-xl border-2 border-sky-400 bg-sky-500/25 text-sky-200 flex items-center justify-center font-mono font-black text-2xl lg:text-3xl shadow-lg ring-2 ring-sky-400/30">
                    x
                  </div>
                ) : (
                  rightTerms.map(term => {
                    const isCrossing = crossingId === term.id
                    const isPos = term.coeff > 0
                    return (
                      <div
                        key={term.id}
                        onClick={e => crossBridgeParabolic(term, e)}
                        className={`h-11 sm:h-13 lg:h-14 px-3 sm:px-4 lg:px-5 rounded-xl border-2 flex items-center justify-center font-mono font-black text-sm sm:text-base lg:text-lg cursor-pointer select-none shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                          term.hasVar
                            ? isPos
                              ? 'bg-sky-500/25 border-sky-400 text-sky-200 hover:bg-sky-500/35'
                              : 'bg-rose-500/25 border-rose-400 text-rose-200 hover:bg-rose-500/35'
                            : isPos
                            ? 'bg-blue-500/25 border-blue-400 text-blue-200 hover:bg-blue-500/35'
                            : 'bg-red-500/25 border-red-400 text-red-200 hover:bg-red-500/35'
                        } ${isCrossing ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                        title="Tocar para trasladar al otro lado por el puente"
                      >
                        <span>
                          {term.hasVar
                            ? (term.coeff === 1 ? 'x' : term.coeff === -1 ? '−x' : `${isPos ? '+' : ''}${term.coeff}x`)
                            : `${isPos ? '+' : ''}${term.coeff}`}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="text-[9px] text-white/30 text-center">
                Al cruzar el puente (=), la operación se invierte automáticamente
              </div>
            </div>
          </div>

          {/* ── 6. PROYECTIL FLOTANTE: TÉRMINO EN VUELO PARABÓLICO (+ <-> -) ── */}
          {flyingToken && (
            <div
              className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-none"
              style={{
                left: `${flyingToken.x}px`,
                top: `${flyingToken.y}px`,
              }}
            >
              <div
                className={`h-12 lg:h-14 px-4 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-black text-sm lg:text-base shadow-2xl transition-all duration-200 ${
                  flyingToken.card.hasVar
                    ? flyingToken.displaySign > 0
                      ? 'bg-sky-500/40 border-sky-300 text-white ring-4 ring-sky-400/60 shadow-sky-500/50'
                      : 'bg-rose-500/40 border-rose-300 text-white ring-4 ring-rose-400/60 shadow-rose-500/50'
                    : flyingToken.displaySign > 0
                    ? 'bg-blue-500/40 border-blue-300 text-white ring-4 ring-blue-400/60 shadow-blue-500/50'
                    : 'bg-red-500/40 border-red-300 text-white ring-4 ring-red-400/60 shadow-red-500/50'
                } ${flyingToken.isAtApex ? 'scale-125 ring-8 ring-amber-400 brightness-150 animate-pulse' : 'scale-110'}`}
              >
                <div className="flex items-center gap-1">
                  {flyingToken.isAtApex && <Sparkles size={14} className="text-amber-300 animate-spin" />}
                  <span>{flyingToken.displayLabel}</span>
                </div>
                <span className="text-[8px] lg:text-[9px] font-bold text-amber-200 uppercase tracking-tighter">
                  {flyingToken.isAtApex ? '⚡ Inviertes signo' : 'Cruzando el puente'}
                </span>
              </div>
            </div>
          )}

          {/* ── 7. PROYECTIL FLOTANTE: COEFICIENTE a EN VUELO PARABÓLICO (× -> ÷) ── */}
          {coeffDivState.stage === 'flying' && (
            <div
              className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-none"
              style={{
                left: `${coeffDivState.flyX}px`,
                top: `${coeffDivState.flyY}px`,
              }}
            >
              <div
                className={`px-3.5 py-2 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-black text-sm lg:text-base shadow-2xl transition-all duration-200 ${
                  coeffDivState.isAtApex
                    ? 'bg-amber-500 border-amber-300 text-black ring-8 ring-amber-300 scale-125 shadow-amber-500/60'
                    : 'bg-violet-600 border-violet-300 text-white ring-4 ring-violet-400/60 scale-110'
                }`}
              >
                <div className="flex items-center gap-1">
                  {coeffDivState.isAtApex && <Sparkles size={14} className="text-black animate-spin" />}
                  <span>{coeffDivState.isFlipped ? `÷ ${coeffDivState.coeff}` : `× ${coeffDivState.coeff}`}</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-tighter text-amber-100">
                  {coeffDivState.isAtApex ? '⚡ × pasa a ÷' : coeffDivState.isFlipped ? 'Pasa a dividir' : 'Despejando factor'}
                </span>
              </div>
            </div>
          )}

          {/* Micro-leyenda pedagógica */}
          <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-white/35 pt-1.5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Variables x</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Números</span>
            <span className="text-violet-300/80 font-semibold">Regla del Puente: suma ↔ resta y multiplicación ↔ división</span>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {solved ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold animate-bounce">
              <Sparkles size={14} className="text-emerald-300 shrink-0" />
              <span>¡Ecuación resuelta! x = {finalX}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {fbMsg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón Fusionar */}
          {canSimplify && (
            <button
              onClick={handleSimplify}
              className="h-7 lg:h-8 px-3 lg:px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all animate-pulse"
            >
              <Merge size={13} />
              <span>Fusionar semejantes</span>
            </button>
          )}

          {/* Botón Despejar Coeficiente (ax = b) */}
          {canDivideCoeff && (
            <button
              onClick={e => launchCoeffDivision(e)}
              className="h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all animate-pulse ring-1 ring-amber-300"
            >
              <Divide size={14} />
              <span>Despejar factor {currentA}</span>
            </button>
          )}

          {/* Botón Siguiente Reto al Resolver */}
          {solved && (
            <button
              onClick={() => handleSelectPreset(String((presetIdx + 1) % BRIDGE_PRESETS.length))}
              className="h-7 lg:h-8 px-3.5 lg:px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Check size={13} />
              <span>Siguiente Reto</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Teclado Virtual Flotante (Overlay Global z-50) ── */}
      {activeKb && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-14 px-2 pointer-events-auto">
          {/* Backdrop para cerrar al hacer clic afuera */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setActiveKb(null)} />

          <div className="relative z-10 w-[275px] sm:w-[300px] lg:w-[330px] bg-[#0c1529] p-2.5 lg:p-3 rounded-2xl border border-violet-500/50 shadow-2xl space-y-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-[11px] text-white/50 px-0.5">
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveKb('left')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    activeKb === 'left' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  1° Miembro
                </button>
                <button
                  type="button"
                  onClick={() => setActiveKb('right')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    activeKb === 'right' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  2° Miembro
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveKb(null)}
                className="text-white/40 hover:text-white p-0.5 text-xs font-bold cursor-pointer"
                title="Cerrar teclado"
              >
                ✕
              </button>
            </div>

            <div className="text-center font-mono text-white text-xs lg:text-sm py-1 px-2 bg-white/5 rounded border border-white/10 min-h-[28px] flex items-center justify-center font-bold tracking-wider">
              {activeKb === 'left' ? kbL || '0' : kbR || '0'}
            </div>

            <div className="grid grid-cols-5 gap-1 lg:gap-1.5">
              {KB_ROWS.flat().map((k, i) => {
                const isOp = k === '+' || k === '−'
                const isDel = k === '⌫'
                const isClr = k === 'C'
                const isOk = k === '✓'
                let cls = 'h-7 lg:h-8 rounded text-[11px] font-bold active:scale-95 transition-all flex items-center justify-center cursor-pointer '
                if (isOk) cls += 'col-span-3 bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/35'
                else if (isDel) cls += 'bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30'
                else if (isClr) cls += 'bg-red-500/15 text-red-300/70 border border-red-400/20 hover:bg-red-500/25'
                else if (isOp) cls += 'bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30'
                else cls += 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                return (
                  <button key={`${k}-${i}`} type="button" className={cls} onClick={() => handleKb(k)}>
                    {k}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Ayuda ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo funciona el Puente del Igual?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-violet-600 hover:bg-violet-500"
      >
        <ol className="space-y-2.5 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Movimiento Parabólico sobre el =</strong>: Toca cualquier tarjeta de número o variable para que salte por el aire en una parábola. Justo en el punto más alto, al pasar por encima del signo <strong className="text-violet-300">=</strong>, su signo se invierte automáticamente (<span className="text-sky-300">+</span> pasa a <span className="text-rose-300">−</span>, y <span className="text-rose-300">−</span> pasa a <span className="text-sky-300">+</span>).
          </li>
          <li>
            <strong className="text-white">Fusionar términos semejantes</strong>: Agrupa las variables $x$ a un lado y los números al otro. Cuando tengas varios términos en un mismo miembro, presiona <strong className="text-violet-400">Fusionar</strong> para reducirlos sumando o restando sus coeficientes.
          </li>
          <li>
            <strong className="text-white">El Paso Crucial (ax = b, ej. 3x = 12)</strong>: Cuando te queda solo el factor multiplicando a la $x$ (ej. $3x = 12$), el número <strong className="text-amber-300">3</strong> está multiplicando. Toca el botón <strong className="text-violet-400">3</strong> para que despegue en parábola, cambie en el aire de <span className="text-violet-300">multiplicación (×)</span> a <span className="text-amber-300">división (÷)</span>, y aterrice debajo del 12 formando la fracción <span className="font-mono text-emerald-300">12 / 3</span>.
          </li>
          <li>
            <strong className="text-white">Calcular solución</strong>: Presiona el botón verde para calcular la división final ($12 \div 3 = 4$) y despejar completamente el valor de $x$.
          </li>
          <li>
            <strong className="text-white">Teclado Virtual</strong>: Puedes tocar las casillas de los miembros en la barra superior para editar o probar cualquier ecuación que desees.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
