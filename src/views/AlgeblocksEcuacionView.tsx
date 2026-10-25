import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Sparkles, Check, Split, RotateCcw, Zap } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface AlgeTerm {
  id: string
  type: 'x' | 'unit'
  sign: 1 | -1
}

interface PresetEq {
  label: string
  eq: string
  desc: string
}

const PRESETS: PresetEq[] = [
  { label: '12 = 10 + 2x', eq: '12 = 10 + 2x', desc: 'Incógnita en segundo miembro: aislar 2x a la derecha' },
  { label: '5 - 3x = 2x - 10', eq: '5 - 3x = 2x - 10', desc: 'Variables y unidades negativas en ambos miembros' },
  { label: '2x + 4 = 10', eq: '2x + 4 = 10', desc: 'Básico: 2 variables y unidades positivas' },
  { label: '3x + 1 = x + 7', eq: '3x + 1 = x + 7', desc: 'Variables en ambos miembros: restar x' },
  { label: '2x - 3 = 5', eq: '2x - 3 = 5', desc: 'Neutralizar -3 sumando +3 a ambos lados' },
  { label: '4x - 2 = 2x + 6', eq: '4x - 2 = 2x + 6', desc: 'Restar 2x y sumar +2 a ambos lados' },
  { label: '3x - 1 = 8', eq: '3x - 1 = 8', desc: 'Neutralizar -1 sumando +1' },
]

const KB_ROWS = [
  ['1', '2', '3', 'x', '⌫'],
  ['4', '5', '6', '2x', '+'],
  ['7', '8', '9', '3x', '−'],
  ['0', 'C', '✓'],
]

function parseSideTerms(raw: string): { vars: number; units: number } {
  const clean = raw.replace(/\s+/g, '').replace(/−/g, '-').replace(/X/g, 'x')
  if (!clean) return { vars: 0, units: 0 }
  const matches = clean.match(/[+-]?[^+-]+/g) || []
  let v = 0
  let u = 0
  for (const p of matches) {
    if (p.includes('x')) {
      let coeff = p.replace('x', '')
      if (coeff === '' || coeff === '+') coeff = '1'
      if (coeff === '-') coeff = '-1'
      const n = parseInt(coeff, 10)
      if (!isNaN(n)) v += n
    } else {
      const n = parseInt(p, 10)
      if (!isNaN(n)) u += n
    }
  }
  return { vars: v, units: u }
}

function createTilesFromCounts(vars: number, units: number, prefix: string): AlgeTerm[] {
  const list: AlgeTerm[] = []
  if (vars !== 0) {
    const varSign: 1 | -1 = vars > 0 ? 1 : -1
    const varCount = Math.min(Math.abs(vars), 20)
    for (let i = 0; i < varCount; i++) {
      list.push({ id: `x-${prefix}-${i}-${Date.now()}-${Math.random()}`, type: 'x', sign: varSign })
    }
  }
  if (units !== 0) {
    const unitSign: 1 | -1 = units > 0 ? 1 : -1
    const unitCount = Math.min(Math.abs(units), 36)
    for (let i = 0; i < unitCount; i++) {
      list.push({ id: `u-${prefix}-${i}-${Date.now()}-${Math.random()}`, type: 'unit', sign: unitSign })
    }
  }
  return list
}

function findPairsToCancel(tiles: AlgeTerm[]): Set<string> {
  const toCancel = new Set<string>()

  // Variables x (+x y -x)
  const posX = tiles.filter(t => t.type === 'x' && t.sign > 0)
  const negX = tiles.filter(t => t.type === 'x' && t.sign < 0)
  const xPairs = Math.min(posX.length, negX.length)
  for (let i = 0; i < xPairs; i++) {
    toCancel.add(posX[i].id)
    toCancel.add(negX[i].id)
  }

  // Unidades (+1 y -1)
  const posU = tiles.filter(t => t.type === 'unit' && t.sign > 0)
  const negU = tiles.filter(t => t.type === 'unit' && t.sign < 0)
  const uPairs = Math.min(posU.length, negU.length)
  for (let i = 0; i < uPairs; i++) {
    toCancel.add(posU[i].id)
    toCancel.add(negU[i].id)
  }

  return toCancel
}

function formatMemberExpr(xCount: number, uCount: number): string {
  const parts: string[] = []
  if (xCount !== 0) {
    if (xCount === 1) parts.push('x')
    else if (xCount === -1) parts.push('−x')
    else parts.push(`${xCount}x`)
  }
  if (uCount !== 0 || parts.length === 0) {
    if (parts.length === 0) {
      parts.push(`${uCount}`)
    } else {
      parts.push(uCount > 0 ? `+ ${uCount}` : `− ${Math.abs(uCount)}`)
    }
  }
  return parts.join(' ')
}

export default function AlgeblocksEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('0')

  // Estado del teclado virtual
  const [kbL, setKbL] = useState('12')
  const [kbR, setKbR] = useState('10+2x')
  const [activeKb, setActiveKb] = useState<'left' | 'right' | null>(null)

  // Estado del tapete
  const [leftTiles, setLeftTiles] = useState<AlgeTerm[]>(() => {
    const parts = PRESETS[0].eq.split('=')
    const pL = parseSideTerms(parts[0] || '')
    return createTilesFromCounts(pL.vars, pL.units, 'L')
  })
  const [rightTiles, setRightTiles] = useState<AlgeTerm[]>(() => {
    const parts = PRESETS[0].eq.split('=')
    const pR = parseSideTerms(parts[1] || '')
    return createTilesFromCounts(pR.vars, pR.units, 'R')
  })

  // Historial para deshacer
  const [history, setHistory] = useState<{ left: AlgeTerm[]; right: AlgeTerm[] }[]>([])

  const [isDivided, setIsDivided] = useState(false)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [fbMsg, setFbMsg] = useState('Añade fichas opuestas a ambos lados y presiona "Operar" para cancelar pares cero.')

  // Cargar ecuación procesando ambos miembros
  const handleLoadEquation = useCallback((raw: string, desc?: string) => {
    const parts = raw.split('=')
    const rawL = parts[0]?.trim() || '0'
    const rawR = parts.length > 1 ? parts.slice(1).join('=').trim() : '0'

    const pL = parseSideTerms(rawL)
    const pR = parseSideTerms(rawR)

    setIsDivided(false)
    setCancelledIds(new Set())
    setHistory([])
    setActiveKb(null)
    setLeftTiles(createTilesFromCounts(pL.vars, pL.units, 'L'))
    setRightTiles(createTilesFromCounts(pR.vars, pR.units, 'R'))
    setFbMsg(desc || `Ecuación cargada: ${rawL} = ${rawR}`)
  }, [])

  const handleSelectPreset = (idxStr: string) => {
    setSelectedPreset(idxStr)
    const idx = parseInt(idxStr, 10)
    if (!isNaN(idx) && PRESETS[idx]) {
      const parts = PRESETS[idx].eq.split('=')
      const l = parts[0]?.trim() || ''
      const r = parts[1]?.trim() || ''
      setKbL(l)
      setKbR(r)
      handleLoadEquation(PRESETS[idx].eq, PRESETS[idx].desc)
    }
  }

  // Manejo de teclas del teclado virtual
  const handleKb = useCallback((key: string) => {
    const set = activeKb === 'left' ? setKbL : setKbR
    if (key === '⌫') {
      set(prev => prev.slice(0, -1))
    } else if (key === 'C') {
      set('')
    } else if (key === '✓') {
      setActiveKb(null)
      handleLoadEquation(`${kbL} = ${kbR}`)
    } else {
      set(prev => prev + key)
    }
  }, [activeKb, kbL, kbR, handleLoadEquation])

  // Contadores algebraicos reales en cada miembro
  const xCountL = leftTiles.filter(t => t.type === 'x').reduce((acc, t) => acc + t.sign, 0)
  const unitCountL = leftTiles.filter(t => t.type === 'unit').reduce((acc, t) => acc + t.sign, 0)
  const xCountR = rightTiles.filter(t => t.type === 'x').reduce((acc, t) => acc + t.sign, 0)
  const unitCountR = rightTiles.filter(t => t.type === 'unit').reduce((acc, t) => acc + t.sign, 0)

  // Revisar si existen pares opuestos listos para cancelar
  const pendingCancelL = findPairsToCancel(leftTiles)
  const pendingCancelR = findPairsToCancel(rightTiles)
  const hasCancellablePairs = pendingCancelL.size > 0 || pendingCancelR.size > 0

  // Detectar simetría: si las variables están a la izquierda O a la derecha
  let varSide: 'left' | 'right' | null = null
  let activeVarCount = 0
  let activeUnitCount = 0

  if (xCountL !== 0 && unitCountL === 0 && xCountR === 0 && unitCountR !== 0) {
    varSide = 'left'
    activeVarCount = xCountL
    activeUnitCount = unitCountR
  } else if (xCountR !== 0 && unitCountR === 0 && xCountL === 0 && unitCountL !== 0) {
    varSide = 'right'
    activeVarCount = xCountR
    activeUnitCount = unitCountL
  }

  const quotient = activeVarCount !== 0 ? activeUnitCount / activeVarCount : 0
  const isIntegerQuotient = Number.isInteger(quotient)
  const numRows = Math.abs(activeVarCount)
  const unitsPerRow = Math.abs(quotient)
  const unitSignPerRow: 1 | -1 = quotient >= 0 ? 1 : -1

  // Estado resuelto: cuando queda 1x = n o n = 1x
  const isSolved =
    ((xCountL === 1 && unitCountL === 0 && xCountR === 0 && !isDivided && !hasCancellablePairs) ||
     (xCountR === 1 && unitCountR === 0 && xCountL === 0 && !isDivided && !hasCancellablePairs))

  const solvedVal = xCountL === 1 ? unitCountR : unitCountL

  // El botón repartir funciona sin importar en qué miembro esté la variable
  const canDivide =
    varSide !== null &&
    numRows > 1 &&
    isIntegerQuotient &&
    !isDivided &&
    !hasCancellablePairs

  // Acción: Añadir ficha a ambos miembros (NO se elimina automáticamente)
  const addTileToBoth = (type: 'x' | 'unit', sign: 1 | -1) => {
    if (isDivided) return

    setHistory(prev => [...prev, { left: leftTiles, right: rightTiles }])

    const idL = `${type}-add-L-${Date.now()}-${Math.random()}`
    const idR = `${type}-add-R-${Date.now()}-${Math.random()}`

    setLeftTiles(prev => [...prev, { id: idL, type, sign }])
    setRightTiles(prev => [...prev, { id: idR, type, sign }])

    const name = type === 'x' ? (sign > 0 ? '+x' : '−x') : (sign > 0 ? '+1' : '−1')
    setFbMsg(`Se añadió ${name} a ambos miembros. Presiona "Operar" para cancelar pares cero.`)
  }

  // Acción: Multiplicar ambos miembros por -1 (invertir signos)
  const handleInvertSigns = () => {
    if (isDivided) return
    setHistory(prev => [...prev, { left: leftTiles, right: rightTiles }])
    setLeftTiles(prev => prev.map(t => ({ ...t, sign: (t.sign * -1) as 1 | -1 })))
    setRightTiles(prev => prev.map(t => ({ ...t, sign: (t.sign * -1) as 1 | -1 })))
    setFbMsg('Se multiplicaron ambos miembros por −1 (cambio de signo en todas las fichas).')
  }

  // Acción: OPERAR (Cancelar pares cero en ambos miembros)
  const handleOperate = () => {
    if (isDivided) return

    const cancelL = findPairsToCancel(leftTiles)
    const cancelR = findPairsToCancel(rightTiles)
    const allCancels = new Set([...cancelL, ...cancelR])

    if (allCancels.size === 0) {
      setFbMsg('No hay pares opuestos (+ y −) en este momento para cancelar.')
      return
    }

    setHistory(prev => [...prev, { left: leftTiles, right: rightTiles }])
    setCancelledIds(allCancels)
    setFbMsg('¡Operando! Cancelando pares cero en ambos miembros...')

    setTimeout(() => {
      setLeftTiles(prev => prev.filter(t => !allCancels.has(t.id)))
      setRightTiles(prev => prev.filter(t => !allCancels.has(t.id)))
      setCancelledIds(new Set())
      setFbMsg('¡Listo! Se eliminaron los pares cero en ambos miembros.')
    }, 600)
  }

  // Acción: Deshacer último movimiento
  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setLeftTiles(prev.left)
    setRightTiles(prev.right)
    setCancelledIds(new Set())
    setIsDivided(false)
    setHistory(h => h.slice(0, -1))
    setFbMsg('Paso anterior recuperado.')
  }

  // Acción: Reparto visual en filas
  const handleDivide = () => {
    if (!canDivide || varSide === null) return
    setIsDivided(true)
    const sideName = varSide === 'left' ? 'primer miembro' : 'segundo miembro'
    setFbMsg(`¡Reparto equitativo! ${Math.abs(activeUnitCount)} unidades distribuidas entre ${numRows} barras x (${sideName}). x = ${quotient}.`)
  }

  // Acción: Consolidar solución final
  const handleConsolidate = () => {
    if (!isDivided || varSide === null) return
    const finalVal = quotient
    const absVal = Math.abs(finalVal)
    const signVal: 1 | -1 = finalVal >= 0 ? 1 : -1

    const unitTiles: AlgeTerm[] = []
    for (let i = 0; i < absVal; i++) {
      unitTiles.push({ id: `u-final-${i}-${Math.random()}`, type: 'unit', sign: signVal })
    }

    if (varSide === 'left') {
      setLeftTiles([{ id: `x-sol-${Math.random()}`, type: 'x', sign: 1 }])
      setRightTiles(unitTiles)
    } else {
      setLeftTiles(unitTiles)
      setRightTiles([{ id: `x-sol-${Math.random()}`, type: 'x', sign: 1 }])
    }

    setIsDivided(false)
    setFbMsg(`¡Ecuación resuelta con éxito! x = ${finalVal}`)
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
              Álgebra Tiles & Reparto
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-indigo-400/10 text-indigo-300 border border-indigo-400/20">
              Método Concreto
            </span>
          </div>
        </div>

        {/* Ecuación actual representada por las fichas */}
        <div className="flex items-center gap-1 font-mono text-[11px] lg:text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10">
          <span className="text-sky-300">{formatMemberExpr(xCountL, unitCountL)}</span>
          <span className="text-white/40 mx-0.5">=</span>
          <span className="text-teal-300">{formatMemberExpr(xCountR, unitCountR)}</span>
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

      {/* ── 2. Barra de Control / Entrada con Teclado Virtual (36-44px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs">
        {/* Selector de Presets */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Reto:</span>
          <select
            value={selectedPreset}
            onChange={e => handleSelectPreset(e.target.value)}
            className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/10 border border-white/15 text-[10px] sm:text-[11px] lg:text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i} className="bg-[#0f172a] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entrada de ecuación interactiva con Teclado Virtual */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] text-white/40 font-semibold hidden md:inline">Ecuación:</span>
          <button
            type="button"
            onClick={() => setActiveKb(activeKb === 'left' ? null : 'left')}
            className={`h-7 lg:h-8 min-w-[56px] sm:min-w-[70px] lg:min-w-[84px] px-2 rounded-md font-mono text-[10px] sm:text-[11px] lg:text-xs font-bold border transition-all truncate text-center ${
              activeKb === 'left'
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/50'
                : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
            }`}
            title="Tocar para editar 1° miembro con teclado virtual"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {kbL || '0'}
          </button>
          <span className="text-white/40 font-bold text-xs lg:text-sm shrink-0">=</span>
          <button
            type="button"
            onClick={() => setActiveKb(activeKb === 'right' ? null : 'right')}
            className={`h-7 lg:h-8 min-w-[56px] sm:min-w-[70px] lg:min-w-[84px] px-2 rounded-md font-mono text-[10px] sm:text-[11px] lg:text-xs font-bold border transition-all truncate text-center ${
              activeKb === 'right'
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/50'
                : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
            }`}
            title="Tocar para editar 2° miembro con teclado virtual"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {kbR || '0'}
          </button>
          <button
            type="button"
            onClick={() => handleLoadEquation(`${kbL} = ${kbR}`)}
            className="h-7 lg:h-8 px-2 sm:px-2.5 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[10px] sm:text-[11px] lg:text-xs active:scale-95 transition-all shadow-sm shrink-0 flex items-center gap-1"
            title="Cargar y graficar ecuación"
          >
            <RefreshCw size={11} />
            <span className="hidden xs:inline">Cargar</span>
          </button>
        </div>

        {/* Botones Deshacer y Reiniciar */}
        <div className="flex items-center gap-1 shrink-0">
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all"
              title="Deshacer último movimiento"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
          )}

          <button
            onClick={() => handleLoadEquation(`${kbL} = ${kbR}`)}
            className="h-7 lg:h-8 px-1.5 sm:px-2 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            title="Reiniciar ecuación actual"
          >
            <RefreshCw size={11} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>

        {/* ── Teclado Virtual Flotante (Popover Overlay) ── */}
        {activeKb && (
          <>
            {/* Backdrop invisible para cerrar al hacer clic afuera */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveKb(null)}
            />

            <div className="absolute left-2 sm:left-24 top-9 sm:top-10 lg:top-12 z-50 w-[270px] sm:w-[290px] lg:w-[320px] bg-[#0c1529] p-2.5 lg:p-3 rounded-xl border border-indigo-500/40 shadow-2xl space-y-1.5 lg:space-y-2 backdrop-blur-md">
              {/* Selector de Miembro y Botón Cerrar */}
              <div className="flex items-center justify-between text-[11px] lg:text-xs text-white/50 px-0.5">
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveKb('left')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      activeKb === 'left' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    1° Miembro
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKb('right')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      activeKb === 'right' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    2° Miembro
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveKb(null)}
                  className="text-white/40 hover:text-white p-0.5 text-xs font-bold"
                  title="Cerrar teclado"
                >
                  ✕
                </button>
              </div>

              {/* Display del miembro en edición */}
              <div
                className="text-center font-mono text-white text-xs lg:text-sm py-1 px-2 bg-white/5 rounded border border-white/10 min-h-[28px] flex items-center justify-center font-bold tracking-wider"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {activeKb === 'left' ? kbL || '0' : kbR || '0'}
              </div>

              {/* Teclas */}
              <div className="grid grid-cols-5 gap-1 lg:gap-1.5">
                {KB_ROWS.flat().map((k, i) => {
                  const isOp = k === '+' || k === '−'
                  const isDel = k === '⌫'
                  const isClr = k === 'C'
                  const isOk = k === '✓'
                  let cls = 'h-7 lg:h-8 rounded text-[11px] lg:text-xs font-bold active:scale-95 transition-all flex items-center justify-center '
                  if (isOk) cls += 'col-span-3 bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/35'
                  else if (isDel) cls += 'bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30'
                  else if (isClr) cls += 'bg-red-500/15 text-red-300/70 border border-red-400/20 hover:bg-red-500/25'
                  else if (isOp) cls += 'bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30'
                  else cls += 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                  return (
                    <button
                      key={`${k}-${i}`}
                      type="button"
                      className={cls}
                      onClick={() => handleKb(k)}
                    >
                      {k}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 3. Área de Trabajo: Tapete de Álgebra (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Panel Izquierdo: Herramientas para añadir fichas a ambos lados */}
        <aside className="w-[52px] sm:w-[60px] lg:w-[70px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-1">
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-wider text-white/30 text-center leading-tight">
              Añadir a ambos
            </span>

            {/* Variable +x */}
            <button
              onClick={() => addTileToBoth('x', 1)}
              disabled={isDivided}
              className="w-9 sm:w-11 lg:w-13 h-7 sm:h-8 lg:h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 hover:bg-sky-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir +x a ambos miembros"
            >
              <div className="w-2.5 h-3 bg-sky-500 rounded-sm mb-0.5" />
              <span className="text-[9px] lg:text-[11px] leading-none">+x</span>
            </button>

            {/* Variable -x */}
            <button
              onClick={() => addTileToBoth('x', -1)}
              disabled={isDivided}
              className="w-9 sm:w-11 lg:w-13 h-7 sm:h-8 lg:h-9 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir −x a ambos miembros"
            >
              <div className="w-2.5 h-3 bg-red-500 rounded-sm mb-0.5" />
              <span className="text-[9px] lg:text-[11px] leading-none">−x</span>
            </button>

            {/* Unidad +1 */}
            <button
              onClick={() => addTileToBoth('unit', 1)}
              disabled={isDivided}
              className="w-9 sm:w-11 lg:w-13 h-7 sm:h-8 lg:h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-200 hover:bg-blue-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir +1 a ambos miembros"
            >
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm mb-0.5" />
              <span className="text-[9px] lg:text-[11px] leading-none">+1</span>
            </button>

            {/* Unidad -1 */}
            <button
              onClick={() => addTileToBoth('unit', -1)}
              disabled={isDivided}
              className="w-9 sm:w-11 lg:w-13 h-7 sm:h-8 lg:h-9 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir −1 a ambos miembros"
            >
              <div className="w-2.5 h-2.5 bg-red-500 rounded-sm mb-0.5" />
              <span className="text-[9px] lg:text-[11px] leading-none">−1</span>
            </button>

            {/* Invertir signos (multiplicar por -1) */}
            <button
              onClick={handleInvertSigns}
              disabled={isDivided}
              className="w-9 sm:w-11 lg:w-13 h-7 sm:h-8 lg:h-9 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-200 hover:bg-purple-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Multiplicar ambos miembros por −1 (cambiar signos)"
            >
              <span className="text-[10px] lg:text-xs font-mono font-bold leading-none">±</span>
              <span className="text-[7px] sm:text-[8px] leading-none text-purple-300">×(−1)</span>
            </button>
          </div>

          <div className="text-[7px] sm:text-[8px] lg:text-[9px] text-white/30 text-center px-0.5 leading-tight">
            Pares cero
          </div>
        </aside>

        {/* Tapete Central Dividido en 2 Miembros */}
        <main className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-1.5 sm:p-2 lg:p-4 overflow-hidden relative">
          <div className="flex-1 min-h-0 flex items-stretch gap-1.5 sm:gap-2 lg:gap-4 relative">
            {/* ── 1° Miembro (Izquierda) ── */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1220]/70 border border-sky-500/20 rounded-lg p-1.5 sm:p-2 lg:p-3 overflow-hidden">
              <div className="text-[10px] lg:text-xs font-bold text-sky-400/80 border-b border-white/5 pb-1 mb-1.5 flex items-center justify-between">
                <span>Primer Miembro</span>
                <span className="text-[9px] text-white/40 font-mono">
                  {formatMemberExpr(xCountL, unitCountL)}
                </span>
              </div>

              {!isDivided ? (
                <div className="flex-1 min-h-0 flex flex-wrap content-start gap-1.5 overflow-y-auto pr-0.5">
                  {/* Fichas Variables (x y −x) */}
                  {leftTiles.filter(t => t.type === 'x').map(t => {
                    const isCancel = cancelledIds.has(t.id)
                    const isPos = t.sign > 0
                    return (
                      <div
                        key={t.id}
                        className={`w-7 sm:w-8 lg:w-9 h-14 sm:h-18 lg:h-22 rounded-md shadow-md flex items-center justify-center font-mono font-black text-xs sm:text-sm lg:text-base text-white select-none transition-all duration-500 ${
                          isPos ? 'bg-sky-500 border border-sky-300' : 'bg-red-500 border border-red-300'
                        } ${isCancel ? 'scale-0 opacity-0 rotate-45 ring-2 ring-amber-400' : 'scale-100 opacity-100'}`}
                      >
                        {isPos ? 'x' : '−x'}
                      </div>
                    )
                  })}

                  {/* Fichas de Unidades (+1 y −1) */}
                  <div className={`flex flex-wrap gap-1 items-start ${leftTiles.some(t => t.type === 'x') ? 'pl-1.5 border-l border-white/10' : ''}`}>
                    {leftTiles.filter(t => t.type === 'unit').map(t => {
                      const isCancel = cancelledIds.has(t.id)
                      const isPos = t.sign > 0
                      return (
                        <div
                          key={t.id}
                          className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[10px] sm:text-[11px] lg:text-xs text-white shadow-sm transition-all duration-500 ${
                            isPos ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                          } ${isCancel ? 'scale-0 opacity-0 rotate-45 ring-2 ring-amber-400' : 'scale-100 opacity-100'}`}
                        >
                          {isPos ? '+1' : '−1'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Modo Reparto en 1° Miembro */
                <div className="flex-1 min-h-0 flex flex-col justify-around py-1 overflow-y-auto">
                  {varSide === 'left' ? (
                    /* Si las variables estaban a la izquierda: 1 x por fila */
                    Array.from({ length: numRows }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1 rounded bg-sky-500/10 border border-sky-400/20">
                        <div className="w-7 lg:w-8 h-9 lg:h-11 rounded bg-sky-500 border border-sky-300 flex items-center justify-center font-mono font-bold text-xs lg:text-sm text-white">
                          x
                        </div>
                        <span className="text-white/40 text-xs font-bold">=</span>
                        <span className="text-sky-300 font-bold text-xs">Fila {idx + 1}</span>
                      </div>
                    ))
                  ) : (
                    /* Si las unidades estaban a la izquierda: unitsPerRow por fila */
                    Array.from({ length: numRows }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-1 rounded bg-teal-500/10 border border-teal-400/20 overflow-x-auto">
                        {Array.from({ length: unitsPerRow }).map((__, uIdx) => (
                          <div
                            key={uIdx}
                            className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[10px] lg:text-xs text-white shadow-sm animate-pulse ${
                              unitSignPerRow > 0 ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                            }`}
                          >
                            {unitSignPerRow > 0 ? '+1' : '−1'}
                          </div>
                        ))}
                        <span className="text-teal-300 font-mono font-bold text-xs pl-2">
                          ({unitSignPerRow > 0 ? `+${unitsPerRow}` : `−${unitsPerRow}`})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Divisor Central = */}
            <div className="w-5 sm:w-6 lg:w-8 shrink-0 flex flex-col items-center justify-center">
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm sm:text-base lg:text-lg text-white/80 shadow-md">
                =
              </div>
            </div>

            {/* ── 2° Miembro (Derecha) ── */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1220]/70 border border-teal-500/20 rounded-lg p-1.5 sm:p-2 lg:p-3 overflow-hidden">
              <div className="text-[10px] lg:text-xs font-bold text-teal-400/80 border-b border-white/5 pb-1 mb-1.5 flex items-center justify-between">
                <span>Segundo Miembro</span>
                <span className="text-[9px] text-white/40 font-mono">
                  {formatMemberExpr(xCountR, unitCountR)}
                </span>
              </div>

              {!isDivided ? (
                <div className="flex-1 min-h-0 flex flex-wrap content-start gap-1.5 overflow-y-auto pr-0.5">
                  {/* Fichas Variables (x y −x en miembro derecho) */}
                  {rightTiles.filter(t => t.type === 'x').map(t => {
                    const isCancel = cancelledIds.has(t.id)
                    const isPos = t.sign > 0
                    return (
                      <div
                        key={t.id}
                        className={`w-7 sm:w-8 lg:w-9 h-14 sm:h-18 lg:h-22 rounded-md shadow-md flex items-center justify-center font-mono font-black text-xs sm:text-sm lg:text-base text-white select-none transition-all duration-500 ${
                          isPos ? 'bg-sky-500 border border-sky-300' : 'bg-red-500 border border-red-300'
                        } ${isCancel ? 'scale-0 opacity-0 rotate-45 ring-2 ring-amber-400' : 'scale-100 opacity-100'}`}
                      >
                        {isPos ? 'x' : '−x'}
                      </div>
                    )
                  })}

                  {/* Fichas de Unidades (+1 y −1 en miembro derecho) */}
                  <div className={`flex flex-wrap gap-1 items-start ${rightTiles.some(t => t.type === 'x') ? 'pl-1.5 border-l border-white/10' : ''}`}>
                    {rightTiles.filter(t => t.type === 'unit').map(t => {
                      const isCancel = cancelledIds.has(t.id)
                      const isPos = t.sign > 0
                      return (
                        <div
                          key={t.id}
                          className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[10px] sm:text-[11px] lg:text-xs text-white shadow-sm transition-all duration-500 ${
                            isPos ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                          } ${isCancel ? 'scale-0 opacity-0 rotate-45 ring-2 ring-amber-400' : 'scale-100 opacity-100'}`}
                        >
                          {isPos ? '+1' : '−1'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Modo Reparto en 2° Miembro */
                <div className="flex-1 min-h-0 flex flex-col justify-around py-1 overflow-y-auto">
                  {varSide === 'right' ? (
                    /* Si las variables estaban a la derecha: 1 x por fila */
                    Array.from({ length: numRows }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1 rounded bg-sky-500/10 border border-sky-400/20">
                        <div className="w-7 lg:w-8 h-9 lg:h-11 rounded bg-sky-500 border border-sky-300 flex items-center justify-center font-mono font-bold text-xs lg:text-sm text-white">
                          x
                        </div>
                        <span className="text-white/40 text-xs font-bold">=</span>
                        <span className="text-sky-300 font-bold text-xs">Fila {idx + 1}</span>
                      </div>
                    ))
                  ) : (
                    /* Si las unidades estaban a la derecha: unitsPerRow por fila */
                    Array.from({ length: numRows }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-1 rounded bg-teal-500/10 border border-teal-400/20 overflow-x-auto">
                        {Array.from({ length: unitsPerRow }).map((__, uIdx) => (
                          <div
                            key={uIdx}
                            className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[10px] lg:text-xs text-white shadow-sm animate-pulse ${
                              unitSignPerRow > 0 ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                            }`}
                          >
                            {unitSignPerRow > 0 ? '+1' : '−1'}
                          </div>
                        ))}
                        <span className="text-teal-300 font-mono font-bold text-xs pl-2">
                          ({unitSignPerRow > 0 ? `+${unitsPerRow}` : `−${unitsPerRow}`})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Micro-leyenda pedagógica */}
          <div className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 text-[8px] sm:text-[9px] lg:text-[10px] text-white/40 pt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-3.5 rounded-sm bg-sky-500" /> Variable +x</span>
            <span className="flex items-center gap-1"><span className="w-2 h-3.5 rounded-sm bg-red-500" /> Variable −x</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Unidad +1</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Unidad −1</span>
            <span className="hidden sm:inline text-amber-300/70 font-semibold">+ y − se anulan con "Operar"</span>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isSolved ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-[11px] lg:text-xs font-bold animate-bounce">
              <Sparkles size={13} className="text-emerald-300 shrink-0" />
              <span>¡Ecuación resuelta! x = {solvedVal}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {fbMsg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón OPERAR (Cancelar pares cero) */}
          <button
            onClick={handleOperate}
            disabled={isDivided || !hasCancellablePairs}
            className={`h-7 lg:h-8 px-2.5 sm:px-3 lg:px-4 rounded-lg font-bold text-[10px] sm:text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              hasCancellablePairs
                ? 'bg-amber-500 hover:bg-amber-400 text-black animate-pulse ring-1 ring-amber-300'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            title="Cancelar fichas opuestas (+ y −) en ambos miembros"
          >
            <Zap size={13} />
            <span>Operar {hasCancellablePairs && `(${pendingCancelL.size / 2 + pendingCancelR.size / 2})`}</span>
          </button>

          {/* Botón REPARTIR (soporta variables a la izquierda O a la derecha) */}
          {canDivide && (
            <button
              onClick={handleDivide}
              className="h-7 lg:h-8 px-2.5 sm:px-3.5 lg:px-4 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[10px] sm:text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Split size={13} />
              <span>Repartir en {numRows} grupos</span>
            </button>
          )}

          {/* Botón AISLAR X */}
          {isDivided && (
            <button
              onClick={handleConsolidate}
              className="h-7 lg:h-8 px-3 lg:px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] sm:text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check size={14} />
              <span>Aislar x = {quotient}</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Modal de Ayuda ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo resolver cualquier ecuación en Álgebra Tiles?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-indigo-500 hover:bg-indigo-400"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Teclado virtual para editar</strong>: Toca la casilla del primer o segundo miembro para abrir el teclado virtual interactivo e ingresar números, operaciones y variables (ej. <span className="font-mono text-sky-300">12</span> = <span className="font-mono text-teal-300">10 + 2x</span> o <span className="font-mono text-sky-300">5 - 3x</span> = <span className="font-mono text-teal-300">2x - 10</span>) y pulsa <strong className="text-emerald-400">✓</strong> o <strong className="text-indigo-400">Cargar</strong>.
          </li>
          <li>
            <strong className="text-white">Añadir fichas a ambos lados</strong>: Usa los botones laterales (<strong className="text-sky-300">+x</strong>, <strong className="text-red-300">−x</strong>, <strong className="text-blue-300">+1</strong>, <strong className="text-red-300">−1</strong>) para agregar la misma cantidad a ambos miembros manteniendo la igualdad. Las fichas no desaparecen de inmediato para que veas los pares opuestos conviviendo.
          </li>
          <li>
            <strong className="text-white">Botón Operar</strong>: Cuando tengas fichas opuestas (como $+1$ con $-1$ o $+x$ con $-x$) en cualquier miembro, presiona <strong className="text-amber-400">Operar</strong> para cancelarlas y eliminarlas simultáneamente.
          </li>
          <li>
            <strong className="text-white">Botón Invertir signos (±)</strong>: Si las variables quedan negativas (ej. $-x = -3$ o $-2x = 6$), puedes pulsar <strong className="text-purple-400">±</strong> para multiplicar ambos miembros por $-1$.
          </li>
          <li>
            <strong className="text-white">Reparto equitativo simétrico</strong>: Ya sea que las barras $x$ queden en el primer miembro (ej. $2x = 6$) o en el segundo (ej. $2 = 2x$ o $15 = 5x$), el botón <strong className="text-indigo-400">Repartir</strong> organizará las unidades en filas iguales para ver cuánto vale cada $x$.
          </li>
          <li>
            Pulsa <strong className="text-emerald-400">Aislar x</strong> para consolidar la solución final.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
