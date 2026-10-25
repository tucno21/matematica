import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Sparkles, Check, Split } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface AlgeTerm {
  id: string
  type: 'x' | 'unit'
  sign: 1 | -1
}

interface PresetEq {
  label: string
  xCount: number
  unitCountL: number
  unitCountR: number
  desc: string
}

const PRESETS: PresetEq[] = [
  { label: '2x + 4 = 10', xCount: 2, unitCountL: 4, unitCountR: 10, desc: 'Básico: 2 variables y unidades positivas' },
  { label: '3x + 2 = 11', xCount: 3, unitCountL: 2, unitCountR: 11, desc: '3 variables con reparto exacto' },
  { label: '2x - 3 = 5', xCount: 2, unitCountL: -3, unitCountR: 5, desc: 'Con unidades negativas' },
  { label: '4x + 4 = 16', xCount: 4, unitCountL: 4, unitCountR: 16, desc: '4 variables: reparto en 4 grupos' },
  { label: '3x - 1 = 8', xCount: 3, unitCountL: -1, unitCountR: 8, desc: 'Neutralizar -1 sumando +1' },
]

function initFromPreset(p: PresetEq, side: 'left' | 'right'): AlgeTerm[] {
  const list: AlgeTerm[] = []
  if (side === 'left') {
    for (let i = 0; i < p.xCount; i++) {
      list.push({ id: `x-${i}-${Math.random()}`, type: 'x', sign: 1 })
    }
    const sign = p.unitCountL >= 0 ? 1 : -1
    const count = Math.abs(p.unitCountL)
    for (let i = 0; i < count; i++) {
      list.push({ id: `u-L-${i}-${Math.random()}`, type: 'unit', sign })
    }
  } else {
    const sign = p.unitCountR >= 0 ? 1 : -1
    const count = Math.abs(p.unitCountR)
    for (let i = 0; i < count; i++) {
      list.push({ id: `u-R-${i}-${Math.random()}`, type: 'unit', sign })
    }
  }
  return list
}

export default function AlgeblocksEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  // Estado del tapete
  const [leftTiles, setLeftTiles] = useState<AlgeTerm[]>(() => initFromPreset(PRESETS[0], 'left'))
  const [rightTiles, setRightTiles] = useState<AlgeTerm[]>(() => initFromPreset(PRESETS[0], 'right'))
  const [isDivided, setIsDivided] = useState(false)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [fbMsg, setFbMsg] = useState('Usa los botones de acción para cancelar opuestos o repartir en partes iguales.')

  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    setIsDivided(false)
    setCancelledIds(new Set())
    setLeftTiles(initFromPreset(PRESETS[idx], 'left'))
    setRightTiles(initFromPreset(PRESETS[idx], 'right'))
    setFbMsg(`Cargado: ${PRESETS[idx].label}. ${PRESETS[idx].desc}`)
  }

  // Contadores
  const xCountL = leftTiles.filter(t => t.type === 'x').reduce((acc, t) => acc + t.sign, 0)
  const unitCountL = leftTiles.filter(t => t.type === 'unit').reduce((acc, t) => acc + t.sign, 0)
  const unitCountR = rightTiles.filter(t => t.type === 'unit').reduce((acc, t) => acc + t.sign, 0)

  const isSolved = xCountL === 1 && unitCountL === 0 && !isDivided
  const canDivide = xCountL > 1 && unitCountL === 0 && unitCountR % xCountL === 0 && !isDivided

  // Acción: Añadir unidades a ambos lados para neutralizar
  const addOpToBoth = useCallback((sign: 1 | -1) => {
    if (isDivided) return
    const idL = `u-add-L-${Math.random()}`
    const idR = `u-add-R-${Math.random()}`

    // Revisar si cancela en L
    const oppInL = leftTiles.find(t => t.type === 'unit' && t.sign === -sign && !cancelledIds.has(t.id))

    if (oppInL) {
      // Animación de cancelación
      const newCancels = new Set(cancelledIds)
      newCancels.add(oppInL.id)
      newCancels.add(idL)
      setCancelledIds(newCancels)

      setLeftTiles(prev => [...prev, { id: idL, type: 'unit', sign }])
      setRightTiles(prev => [...prev, { id: idR, type: 'unit', sign }])
      setFbMsg(`Se añadió ${sign > 0 ? '+1' : '−1'} a ambos miembros. ¡Cancelación de par cero!`)

      setTimeout(() => {
        setLeftTiles(prev => prev.filter(t => t.id !== oppInL.id && t.id !== idL))
        setCancelledIds(prev => {
          const s = new Set(prev)
          s.delete(oppInL.id)
          s.delete(idL)
          return s
        })
      }, 700)
    } else {
      setLeftTiles(prev => [...prev, { id: idL, type: 'unit', sign }])
      setRightTiles(prev => [...prev, { id: idR, type: 'unit', sign }])
      setFbMsg(`Se añadió ${sign > 0 ? '+1' : '−1'} a ambos miembros para mantener la igualdad.`)
    }
  }, [cancelledIds, isDivided, leftTiles])

  // Acción: Reparto visual en filas
  const handleDivide = () => {
    if (!canDivide) return
    setIsDivided(true)
    setFbMsg(`¡Reparto equitativo! ${unitCountR} unidades repartidas entre ${xCountL} barras x. Cada x vale ${unitCountR / xCountL}.`)
  }

  // Acción: Consolidar solución final
  const handleConsolidate = () => {
    if (!isDivided) return
    const finalVal = unitCountR / xCountL
    setLeftTiles([{ id: `x-sol-${Math.random()}`, type: 'x', sign: 1 }])
    const newR: AlgeTerm[] = []
    for (let i = 0; i < finalVal; i++) {
      newR.push({ id: `u-final-${i}`, type: 'unit', sign: 1 })
    }
    setRightTiles(newR)
    setIsDivided(false)
    setFbMsg(`¡Ecuación resuelta! x = ${finalVal}`)
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

        {/* Ecuación actual simplificada */}
        <div className="flex items-center gap-1 font-mono text-[11px] lg:text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10">
          <span className="text-sky-300">{xCountL > 0 ? (xCountL === 1 ? 'x' : `${xCountL}x`) : '0'}</span>
          {unitCountL !== 0 && (
            <span className={unitCountL > 0 ? 'text-blue-300' : 'text-rose-300'}>
              {unitCountL > 0 ? `+${unitCountL}` : unitCountL}
            </span>
          )}
          <span className="text-white/40 mx-0.5">=</span>
          <span className={unitCountR >= 0 ? 'text-blue-300' : 'text-rose-300'}>{unitCountR}</span>
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
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Reto:</span>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 lg:h-8 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-[11px] lg:text-xs font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-indigo-400'
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
          title="Reiniciar reto actual"
        >
          <RefreshCw size={11} />
          <span className="hidden sm:inline">Reiniciar</span>
        </button>
      </div>

      {/* ── 3. Área de Trabajo: Tapete de Álgebra (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1.5 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Panel Izquierdo: Herramientas de Neutralización */}
        <aside className="w-[54px] sm:w-[62px] lg:w-[74px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Sumar a ambos
            </span>
            <button
              onClick={() => addOpToBoth(1)}
              disabled={isDivided}
              className="w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-200 hover:bg-blue-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir +1 a ambos lados"
            >
              <div className="w-3.5 h-3.5 lg:w-4 lg:h-4 bg-blue-500 rounded-sm mb-0.5" />
              <span className="text-[10px] lg:text-xs">+1</span>
            </button>
            <button
              onClick={() => addOpToBoth(-1)}
              disabled={isDivided}
              className="w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 active:scale-95 transition-all flex flex-col items-center justify-center font-bold disabled:opacity-40"
              title="Añadir -1 a ambos lados"
            >
              <div className="w-3.5 h-3.5 lg:w-4 lg:h-4 bg-red-500 rounded-sm mb-0.5" />
              <span className="text-[10px] lg:text-xs">−1</span>
            </button>
          </div>

          <div className="text-[8px] lg:text-[9px] text-white/30 text-center px-1">
            Pares cero
          </div>
        </aside>

        {/* Tapete Central Dividido en 2 Miembros */}
        <main className="flex-1 min-w-0 flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-2 lg:p-4 overflow-hidden relative">
          {/* Zona de Trabajo del Tapete */}
          <div className="flex-1 min-h-0 flex items-stretch gap-2 lg:gap-4 relative">
            {/* 1° Miembro (Izquierda) */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1220]/70 border border-sky-500/20 rounded-lg p-2 lg:p-3 overflow-hidden">
              <div className="text-[10px] lg:text-xs font-bold text-sky-400/70 border-b border-white/5 pb-1 mb-2 flex items-center justify-between">
                <span>Primer Miembro</span>
                <span className="text-[9px] text-white/30 font-mono">
                  {xCountL}x {unitCountL !== 0 ? (unitCountL > 0 ? `+ ${unitCountL}` : `− ${Math.abs(unitCountL)}`) : ''}
                </span>
              </div>

              {!isDivided ? (
                <div className="flex-1 min-h-0 flex flex-wrap content-start gap-2 overflow-y-auto">
                  {/* Fichas de Variables x */}
                  {leftTiles.filter(t => t.type === 'x').map(t => (
                    <div
                      key={t.id}
                      className="w-7 lg:w-9 h-20 lg:h-24 rounded-md bg-sky-500 border border-sky-300 shadow-md flex items-center justify-center font-mono font-black text-sm lg:text-base text-white select-none transition-all"
                    >
                      x
                    </div>
                  ))}

                  {/* Fichas de Unidades */}
                  <div className="flex flex-wrap gap-1.5 items-start pl-2 border-l border-white/10">
                    {leftTiles.filter(t => t.type === 'unit').map(t => {
                      const isCancel = cancelledIds.has(t.id)
                      const isPos = t.sign > 0
                      return (
                        <div
                          key={t.id}
                          className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[11px] lg:text-xs text-white shadow-sm transition-all duration-300 ${
                            isPos ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                          } ${isCancel ? 'scale-0 opacity-0 rotate-45' : 'scale-100 opacity-100'}`}
                        >
                          {isPos ? '+1' : '−1'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Modo Reparto: Filas correspondientes a cada x */
                <div className="flex-1 min-h-0 flex flex-col justify-around py-1">
                  {Array.from({ length: xCountL }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1 rounded bg-white/5 border border-white/10">
                      <div className="w-7 lg:w-8 h-10 lg:h-12 rounded bg-sky-500 border border-sky-300 flex items-center justify-center font-mono font-bold text-xs lg:text-sm text-white">
                        x
                      </div>
                      <span className="text-white/40 text-xs font-bold">=</span>
                      <span className="text-emerald-400 font-bold text-xs">Fila {idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divisor Central = */}
            <div className="w-6 lg:w-8 shrink-0 flex flex-col items-center justify-center">
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-base lg:text-lg text-white/80 shadow-md">
                =
              </div>
            </div>

            {/* 2° Miembro (Derecha) */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#0b1220]/70 border border-teal-500/20 rounded-lg p-2 lg:p-3 overflow-hidden">
              <div className="text-[10px] lg:text-xs font-bold text-teal-400/70 border-b border-white/5 pb-1 mb-2 flex items-center justify-between">
                <span>Segundo Miembro</span>
                <span className="text-[9px] text-white/30 font-mono">{unitCountR} unidades</span>
              </div>

              {!isDivided ? (
                <div className="flex-1 min-h-0 flex flex-wrap content-start gap-1.5 overflow-y-auto">
                  {rightTiles.map(t => {
                    const isPos = t.sign > 0
                    return (
                      <div
                        key={t.id}
                        className={`w-6 h-6 lg:w-7 lg:h-7 rounded flex items-center justify-center font-mono font-bold text-[11px] lg:text-xs text-white shadow-sm transition-all ${
                          isPos ? 'bg-blue-500 border border-blue-300' : 'bg-red-500 border border-red-300'
                        }`}
                      >
                        {isPos ? '+1' : '−1'}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Modo Reparto: Grupos asignados a cada fila */
                <div className="flex-1 min-h-0 flex flex-col justify-around py-1">
                  {Array.from({ length: xCountL }).map((_, idx) => {
                    const perRow = unitCountR / xCountL
                    return (
                      <div key={idx} className="flex items-center gap-1.5 p-1 rounded bg-teal-500/10 border border-teal-400/20 overflow-x-auto">
                        {Array.from({ length: perRow }).map((__, uIdx) => (
                          <div
                            key={uIdx}
                            className="w-6 h-6 lg:w-7 lg:h-7 rounded bg-blue-500 border border-blue-300 flex items-center justify-center font-mono font-bold text-[10px] lg:text-xs text-white shadow-sm animate-pulse"
                          >
                            +1
                          </div>
                        ))}
                        <span className="text-teal-300 font-mono font-bold text-xs pl-2">
                          ({perRow})
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Micro-leyenda pedagógica */}
          <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-white/35 pt-1.5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-4 rounded-sm bg-sky-500" /> Variable x</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Unidad +1</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Unidad −1</span>
            <span className="hidden sm:inline text-indigo-300/60 font-semibold">+1 con −1 se anulan</span>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isSolved ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold animate-bounce">
              <Sparkles size={14} className="text-emerald-300 shrink-0" />
              <span>{fbMsg}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {fbMsg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canDivide && (
            <button
              onClick={handleDivide}
              className="h-7 lg:h-8 px-3 lg:px-4 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Split size={13} />
              <span>Repartir en {xCountL} grupos</span>
            </button>
          )}

          {isDivided && (
            <button
              onClick={handleConsolidate}
              className="h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check size={14} />
              <span>Aislar x = {unitCountR / xCountL}</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Modal de Ayuda ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo usar Álgebra Tiles y Reparto?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-indigo-500 hover:bg-indigo-400"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Añadir fichas opuestas</strong>: En el panel izquierdo usa los botones <strong className="text-blue-400">+1</strong> o <strong className="text-red-400">−1</strong> para neutralizar las unidades que acompañan a las variables $x$.
          </li>
          <li>
            <strong className="text-white">Pares cero</strong>: Cuando una ficha $+1$ coincide con un $-1$, ambas se cancelan y desaparecen.
          </li>
          <li>
            <strong className="text-white">Reparto equitativo</strong>: Una vez aisladas las barras $x$ a la izquierda, presiona <strong className="text-indigo-400">Repartir</strong> para distribuir en partes iguales las unidades del segundo miembro entre cada barra $x$.
          </li>
          <li>
            Presiona <strong className="text-emerald-400">Aislar x</strong> para consolidar la respuesta final.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
