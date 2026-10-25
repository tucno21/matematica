import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Sparkles, ArrowRightLeft, Check, Merge } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface TermCard {
  id: string
  coeff: number
  hasVar: boolean
  side: 'left' | 'right'
}

interface BridgePreset {
  label: string
  terms: { coeff: number; hasVar: boolean; side: 'left' | 'right' }[]
  desc: string
}

const BRIDGE_PRESETS: BridgePreset[] = [
  {
    label: '4x - 2 = 2x + 8',
    terms: [
      { coeff: 4, hasVar: true, side: 'left' },
      { coeff: -2, hasVar: false, side: 'left' },
      { coeff: 2, hasVar: true, side: 'right' },
      { coeff: 8, hasVar: false, side: 'right' },
    ],
    desc: 'Variables y números en ambos miembros'
  },
  {
    label: '3x + 5 = 14',
    terms: [
      { coeff: 3, hasVar: true, side: 'left' },
      { coeff: 5, hasVar: false, side: 'left' },
      { coeff: 14, hasVar: false, side: 'right' },
    ],
    desc: 'Básico: trasponer el +5 a la derecha'
  },
  {
    label: '5x + 3 = 2x + 15',
    terms: [
      { coeff: 5, hasVar: true, side: 'left' },
      { coeff: 3, hasVar: false, side: 'left' },
      { coeff: 2, hasVar: true, side: 'right' },
      { coeff: 15, hasVar: false, side: 'right' },
    ],
    desc: 'Trasponer 2x a la izquierda y 3 a la derecha'
  },
  {
    label: '6x - 4 = 3x + 11',
    terms: [
      { coeff: 6, hasVar: true, side: 'left' },
      { coeff: -4, hasVar: false, side: 'left' },
      { coeff: 3, hasVar: true, side: 'right' },
      { coeff: 11, hasVar: false, side: 'right' },
    ],
    desc: 'Con términos negativos trasponiendo a positivos'
  }
]

export default function PuenteEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  const [cards, setCards] = useState<TermCard[]>(() => initCards(BRIDGE_PRESETS[0]))
  const [crossingId, setCrossingId] = useState<string | null>(null)
  const [fbMsg, setFbMsg] = useState('Toca una tarjeta para cruzarla por el puente del = (cambiará de signo automáticamente).')
  const [solved, setSolved] = useState(false)
  const [finalX, setFinalX] = useState<number | null>(null)

  function initCards(p: BridgePreset): TermCard[] {
    return p.terms.map((t, i) => ({
      id: `term-${i}-${Math.random()}`,
      coeff: t.coeff,
      hasVar: t.hasVar,
      side: t.side,
    }))
  }

  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    setCards(initCards(BRIDGE_PRESETS[idx]))
    setCrossingId(null)
    setSolved(false)
    setFinalX(null)
    setFbMsg(`Cargado: ${BRIDGE_PRESETS[idx].label}. ${BRIDGE_PRESETS[idx].desc}`)
  }

  const leftTerms = cards.filter(c => c.side === 'left')
  const rightTerms = cards.filter(c => c.side === 'right')

  // Trasponer tarjeta al otro miembro
  const crossBridge = (card: TermCard) => {
    if (solved || crossingId) return

    setCrossingId(card.id)
    const targetSide = card.side === 'left' ? 'right' : 'left'
    const newCoeff = -card.coeff // Regla del puente: invierte signo

    const termName = card.hasVar
      ? `${card.coeff > 0 ? '+' : ''}${card.coeff}x`
      : `${card.coeff > 0 ? '+' : ''}${card.coeff}`
    const transformedName = card.hasVar
      ? `${newCoeff > 0 ? '+' : ''}${newCoeff}x`
      : `${newCoeff > 0 ? '+' : ''}${newCoeff}`

    setFbMsg(`¡Cruzó el puente! ${termName} cambió de signo a ${transformedName} al pasar al otro miembro.`)

    setTimeout(() => {
      setCards(prev => prev.map(c => {
        if (c.id === card.id) {
          return { ...c, coeff: newCoeff, side: targetSide }
        }
        return c
      }))
      setCrossingId(null)
    }, 450)
  }

  // Fusión de términos semejantes
  const canSimplifyLeft = leftTerms.length > 1 && (leftTerms.filter(t => t.hasVar).length > 1 || leftTerms.filter(t => !t.hasVar).length > 1)
  const canSimplifyRight = rightTerms.length > 1 && (rightTerms.filter(t => t.hasVar).length > 1 || rightTerms.filter(t => !t.hasVar).length > 1)
  const canSimplify = canSimplifyLeft || canSimplifyRight

  const handleSimplify = () => {
    if (!canSimplify) return

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
    setFbMsg('Términos semejantes fusionados. Ahora agrupa variables a un lado y números al otro.')
  }

  // Despejar x cuando queda ax = b
  const singleVarL = leftTerms.length === 1 && leftTerms[0].hasVar
  const singleNumR = rightTerms.length === 1 && !rightTerms[0].hasVar
  const canDivideCoeff = singleVarL && singleNumR && leftTerms[0].coeff !== 1 && !solved

  const handleDivideCoeff = () => {
    if (!canDivideCoeff) return
    const a = leftTerms[0].coeff
    const b = rightTerms[0].coeff
    const res = b / a
    setFinalX(res)
    setSolved(true)
    setCards([
      { id: 'sol-x', coeff: 1, hasVar: true, side: 'left' },
      { id: 'sol-num', coeff: res, hasVar: false, side: 'right' },
    ])
    setFbMsg(`¡El coeficiente ${a} que multiplicaba pasó dividiendo! x = ${b} ÷ ${a} = ${res}. ¡Ecuación resuelta!`)
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
              Transposición
            </span>
          </div>
        </div>

        {/* Ecuación objetivo */}
        <div className="font-mono text-xs lg:text-sm font-bold text-violet-300 bg-violet-400/10 px-2.5 py-0.5 rounded-md border border-violet-400/20">
          {BRIDGE_PRESETS[presetIdx].label}
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

      {/* ── 2. Barra de Control / Presets (36-42px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Ecuación:</span>
          {BRIDGE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 lg:h-8 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-[11px] lg:text-xs font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-400 font-bold'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => loadPreset(presetIdx)}
          className="h-7 lg:h-8 px-2 sm:px-2.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] lg:text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all"
          title="Reiniciar"
        >
          <RefreshCw size={11} />
          <span className="hidden sm:inline">Reiniciar</span>
        </button>
      </div>

      {/* ── 3. Área de Trabajo Central: El Puente (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1.5 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Panel Izquierdo: Operaciones de fusión */}
        <aside className="w-[54px] sm:w-[62px] lg:w-[74px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Acción
            </span>

            <button
              onClick={handleSimplify}
              disabled={!canSimplify}
              className={`w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm ${
                canSimplify
                  ? 'bg-violet-500/25 border border-violet-400 text-violet-200 hover:bg-violet-500/35 ring-2 ring-violet-400/40 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-40'
              }`}
              title="Fusionar términos semejantes"
            >
              <Merge size={16} />
              <span className="text-[8px] lg:text-[9px] mt-0.5">Fusionar</span>
            </button>

            {canDivideCoeff && (
              <button
                onClick={handleDivideCoeff}
                className="w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg bg-emerald-500/25 border border-emerald-400 text-emerald-200 hover:bg-emerald-500/35 ring-2 ring-emerald-400/40 animate-pulse flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm"
                title="Despejar incógnita x"
              >
                <Check size={16} />
                <span className="text-[8px] lg:text-[9px] mt-0.5">Dividir a</span>
              </button>
            )}
          </div>

          <div className="text-[8px] lg:text-[9px] text-white/30 text-center px-0.5">
            Toca fichas
          </div>
        </aside>

        {/* Zona del Puente Central */}
        <main className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-2 lg:p-4 overflow-hidden relative">
          <div className="flex-1 min-h-0 flex items-stretch gap-2 lg:gap-4 relative">
            {/* Lado Izquierdo (Primer Miembro) */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1329]/80 border border-sky-500/20 rounded-xl p-2 lg:p-4 justify-between">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-sky-400/80 border-b border-white/5 pb-1">
                <span>Primer Miembro</span>
                <span className="text-[10px] text-white/30 font-mono">Variables preferidas</span>
              </div>

              {/* Tarjetas del Miembro Izquierdo */}
              <div className="flex-1 min-h-0 flex flex-wrap items-center justify-center content-center gap-2 lg:gap-3 p-2">
                {leftTerms.map(term => {
                  const isCrossing = crossingId === term.id
                  const isPos = term.coeff > 0
                  return (
                    <div
                      key={term.id}
                      onClick={() => crossBridge(term)}
                      className={`h-14 lg:h-18 px-3 lg:px-5 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-black text-sm lg:text-lg cursor-pointer select-none shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                        term.hasVar
                          ? isPos
                            ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                            : 'bg-red-500/25 border-red-400 text-red-200'
                          : isPos
                          ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                          : 'bg-rose-500/25 border-rose-400 text-rose-200'
                      } ${isCrossing ? 'rotate-180 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
                      title="Tocar para cruzar el puente ="
                    >
                      <span>
                        {term.hasVar
                          ? (term.coeff === 1 ? 'x' : term.coeff === -1 ? '−x' : `${isPos ? '+' : ''}${term.coeff}x`)
                          : `${isPos ? '+' : ''}${term.coeff}`}
                      </span>
                      <span className="text-[8px] lg:text-[9px] text-white/40 font-normal flex items-center gap-0.5 mt-0.5">
                        Cruzar <ArrowRightLeft size={9} />
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="text-[10px] text-white/30 text-center">
                Toca cualquier término para enviarlo al otro lado
              </div>
            </div>

            {/* El Puente Energético del = */}
            <div className="w-12 lg:w-16 shrink-0 flex flex-col items-center justify-center relative">
              <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-violet-500/40 to-transparent absolute" />

              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 border-2 border-violet-300/60 shadow-xl shadow-violet-500/30 flex flex-col items-center justify-center z-10 animate-pulse">
                <span className="font-mono font-black text-lg lg:text-2xl text-white leading-none">=</span>
                <span className="text-[7px] lg:text-[8px] font-bold text-violet-200 tracking-tighter uppercase">Puente</span>
              </div>
            </div>

            {/* Lado Derecho (Segundo Miembro) */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1329]/80 border border-teal-500/20 rounded-xl p-2 lg:p-4 justify-between">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-teal-400/80 border-b border-white/5 pb-1">
                <span>Segundo Miembro</span>
                <span className="text-[10px] text-white/30 font-mono">Números preferidos</span>
              </div>

              {/* Tarjetas del Miembro Derecho */}
              <div className="flex-1 min-h-0 flex flex-wrap items-center justify-center content-center gap-2 lg:gap-3 p-2">
                {rightTerms.map(term => {
                  const isCrossing = crossingId === term.id
                  const isPos = term.coeff > 0
                  return (
                    <div
                      key={term.id}
                      onClick={() => crossBridge(term)}
                      className={`h-14 lg:h-18 px-3 lg:px-5 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-black text-sm lg:text-lg cursor-pointer select-none shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                        term.hasVar
                          ? isPos
                            ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                            : 'bg-red-500/25 border-red-400 text-red-200'
                          : isPos
                          ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                          : 'bg-rose-500/25 border-rose-400 text-rose-200'
                      } ${isCrossing ? '-rotate-180 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
                      title="Tocar para cruzar el puente ="
                    >
                      <span>
                        {term.hasVar
                          ? (term.coeff === 1 ? 'x' : term.coeff === -1 ? '−x' : `${isPos ? '+' : ''}${term.coeff}x`)
                          : `${isPos ? '+' : ''}${term.coeff}`}
                      </span>
                      <span className="text-[8px] lg:text-[9px] text-white/40 font-normal flex items-center gap-0.5 mt-0.5">
                        <ArrowRightLeft size={9} /> Cruzar
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="text-[10px] text-white/30 text-center">
                Al cruzar, el signo se invierte (+ a − o − a +)
              </div>
            </div>
          </div>

          {/* Micro-leyenda */}
          <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-white/35 pt-1.5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Variables x</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Términos numéricos</span>
            <span className="text-violet-300/60 font-semibold">Regla del Puente: cambia el signo al cruzar el =</span>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {solved ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold animate-bounce">
              <Sparkles size={14} className="text-emerald-300 shrink-0" />
              <span>¡Solución encontrada! x = {finalX}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {fbMsg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canSimplify && (
            <button
              onClick={handleSimplify}
              className="h-7 lg:h-8 px-3 lg:px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Merge size={13} />
              <span>Fusionar semejantes</span>
            </button>
          )}

          {canDivideCoeff && (
            <button
              onClick={handleDivideCoeff}
              className="h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check size={14} />
              <span>Despejar x</span>
            </button>
          )}

          {solved && (
            <button
              onClick={() => loadPreset((presetIdx + 1) % BRIDGE_PRESETS.length)}
              className="h-7 lg:h-8 px-3.5 lg:px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Check size={13} />
              <span>Siguiente Reto</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Modal de Ayuda ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo funciona el Puente del Igual?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-violet-600 hover:bg-violet-500"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Transposición de términos</strong>: Toca cualquier tarjeta para cruzarla al otro lado del signo $=$.
          </li>
          <li>
            <strong className="text-white">Inversión de signo</strong>: Al cruzar el puente, automáticamente un término positivo se transforma en negativo, y un término negativo se transforma en positivo ($+ \leftrightarrow −$).
          </li>
          <li>
            <strong className="text-white">Fusión de términos semejantes</strong>: Agrupa las variables $x$ en el miembro izquierdo y los números en el derecho. Cuando estén listos, presiona <strong className="text-violet-400">Fusionar</strong> para sumar o restar sus coeficientes.
          </li>
          <li>
            <strong className="text-white">Paso final (Despeje)</strong>: Cuando te quede una expresión como $ax = b$, presiona <strong className="text-emerald-400">Despejar x</strong> para pasar el coeficiente $a$ dividiendo ($x = b \div a$).
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
