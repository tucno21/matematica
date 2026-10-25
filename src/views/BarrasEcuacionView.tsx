import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Scissors, Divide, Sparkles, Check } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface BarEq {
  label: string
  xCount: number
  unitConst: number
  total: number
  xSolution: number
}

const BAR_PRESETS: BarEq[] = [
  { label: '3x + 6 = 24', xCount: 3, unitConst: 6, total: 24, xSolution: 6 },
  { label: '2x + 8 = 20', xCount: 2, unitConst: 8, total: 20, xSolution: 6 },
  { label: '4x + 5 = 25', xCount: 4, unitConst: 5, total: 25, xSolution: 5 },
  { label: '2x + 14 = 30', xCount: 2, unitConst: 14, total: 30, xSolution: 8 },
  { label: '3x + 12 = 33', xCount: 3, unitConst: 12, total: 33, xSolution: 7 },
]

export default function BarrasEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  const activeEq = BAR_PRESETS[presetIdx]

  // Fases del modelo de barras:
  // 1. 'cut': recortar el bloque constante (unitConst)
  // 2. 'partition': dividir la barra restante en xCount partes
  // 3. 'solved': x identificado
  const [stage, setStage] = useState<'cut' | 'partition' | 'solved'>('cut')
  const [trimmedTotal, setTrimmedTotal] = useState(activeEq.total)
  const [isTrimmed, setIsTrimmed] = useState(false)
  const [isPartitioned, setIsPartitioned] = useState(false)
  const [fbMsg, setFbMsg] = useState('Paso 1: Usa la tijera para recortar el segmento numérico constante en ambas barras.')

  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    const eq = BAR_PRESETS[idx]
    setStage('cut')
    setTrimmedTotal(eq.total)
    setIsTrimmed(false)
    setIsPartitioned(false)
    setFbMsg(`Cargado: ${eq.label}. Paso 1: Recorta el segmento constante de ${eq.unitConst}.`)
  }

  // Paso 1: Recortar constante
  const handleCut = () => {
    if (isTrimmed) return
    setIsTrimmed(true)
    const remaining = activeEq.total - activeEq.unitConst
    setTrimmedTotal(remaining)
    setStage('partition')
    setFbMsg(`¡Recorte exitoso! Se restó ${activeEq.unitConst} a ambos lados. Ahora ${activeEq.xCount} barras x miden ${remaining}.`)
  }

  // Paso 2: Particionar en partes iguales
  const handlePartition = () => {
    if (!isTrimmed || isPartitioned) return
    setIsPartitioned(true)
    setStage('solved')
    setFbMsg(`¡Partición completada! ${trimmedTotal} ÷ ${activeEq.xCount} = ${activeEq.xSolution}. Por lo tanto, x = ${activeEq.xSolution}.`)
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
              Modelo de Barras (Singapur)
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
              Visual Geométrico
            </span>
          </div>
        </div>

        {/* Ecuación actual */}
        <div className="font-mono text-xs lg:text-sm font-bold text-emerald-300 bg-emerald-400/10 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
          {activeEq.label}
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

      {/* ── 2. Barra de Selección de Retos (36-42px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Reto:</span>
          {BAR_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 lg:h-8 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-[11px] lg:text-xs font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
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

      {/* ── 3. Área de Trabajo Central: Barras de Longitud (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1.5 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Panel Izquierdo: Herramientas de Corte y División */}
        <aside className="w-[54px] sm:w-[62px] lg:w-[74px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Acciones
            </span>

            {/* Herramienta 1: Recortar */}
            <button
              onClick={handleCut}
              disabled={isTrimmed}
              className={`w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm ${
                !isTrimmed
                  ? 'bg-rose-500/25 border border-rose-400/50 text-rose-200 hover:bg-rose-500/35 ring-2 ring-rose-400/40 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-40'
              }`}
              title="Recortar constante en ambas barras"
            >
              <Scissors size={16} />
              <span className="text-[8px] lg:text-[9px] mt-0.5">Recortar</span>
            </button>

            {/* Herramienta 2: Dividir / Particionar */}
            <button
              onClick={handlePartition}
              disabled={!isTrimmed || isPartitioned}
              className={`w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm ${
                isTrimmed && !isPartitioned
                  ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/35 ring-2 ring-emerald-400/40 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-40'
              }`}
              title={`Dividir en ${activeEq.xCount} partes`}
            >
              <Divide size={16} />
              <span className="text-[8px] lg:text-[9px] mt-0.5">Dividir</span>
            </button>
          </div>

          <div className="text-[8px] lg:text-[9px] text-white/30 text-center px-0.5">
            Paso a paso
          </div>
        </aside>

        {/* Visualización Principal de Barras */}
        <main className="flex-1 min-w-0 flex flex-col justify-around bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-3 lg:p-6 overflow-hidden relative">
          {/* Barra Superior: Primer Miembro (Variables x + Constante) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-sky-300">
              <span>Primer Miembro: {activeEq.xCount}x {isTrimmed ? '' : `+ ${activeEq.unitConst}`}</span>
              <span className="text-[10px] lg:text-xs text-white/40 font-mono">
                {isTrimmed ? `Longitud: ${activeEq.xCount}x` : `Longitud total: ${activeEq.total}`}
              </span>
            </div>

            <div className="h-14 lg:h-18 w-full bg-[#0c1529] border border-white/15 rounded-xl flex items-stretch p-1 gap-1 shadow-inner overflow-hidden">
              {/* Segmentos de variables x */}
              {Array.from({ length: activeEq.xCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-sky-500/30 border-2 border-sky-400 rounded-lg flex flex-col items-center justify-center font-mono font-black text-sm lg:text-base text-sky-200 shadow-sm"
                >
                  <span>x</span>
                  {stage === 'solved' && (
                    <span className="text-[10px] lg:text-xs text-emerald-300 font-bold">
                      = {activeEq.xSolution}
                    </span>
                  )}
                </div>
              ))}

              {/* Segmento constante recortable */}
              <div
                onClick={handleCut}
                className={`w-20 lg:w-28 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs lg:text-sm cursor-pointer transition-all duration-500 ${
                  isTrimmed
                    ? 'opacity-0 scale-75 pointer-events-none w-0 overflow-hidden p-0 m-0 border-0'
                    : 'bg-rose-500/25 border-2 border-dashed border-rose-400 text-rose-200 hover:bg-rose-500/40 shadow-sm animate-pulse'
                }`}
                title="Tocar para recortar este segmento"
              >
                <span>+{activeEq.unitConst}</span>
                <span className="text-[9px] text-rose-300/70">Tijera ✂</span>
              </div>
            </div>
          </div>

          {/* Comparador de igualdad (=) */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px bg-white/15 flex-1" />
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs lg:text-sm font-bold text-white/80">
              Ambas barras tienen la misma longitud (=)
            </div>
            <div className="h-px bg-white/15 flex-1" />
          </div>

          {/* Barra Inferior: Segundo Miembro (Total numérico) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-emerald-300">
              <span>Segundo Miembro: {isTrimmed ? `${trimmedTotal} (tras recortar ${activeEq.unitConst})` : activeEq.total}</span>
              <span className="text-[10px] lg:text-xs text-white/40 font-mono">
                {isPartitioned ? `${activeEq.xCount} partes de ${activeEq.xSolution}` : `Valor: ${trimmedTotal}`}
              </span>
            </div>

            <div className="h-14 lg:h-18 w-full bg-[#0c1529] border border-white/15 rounded-xl flex items-stretch p-1 gap-1 shadow-inner overflow-hidden">
              {!isPartitioned ? (
                /* Barra única de total */
                <div className="flex-1 bg-emerald-500/25 border-2 border-emerald-400 rounded-lg flex items-center justify-center font-mono font-black text-sm lg:text-base text-emerald-200 transition-all">
                  <span>{trimmedTotal}</span>
                </div>
              ) : (
                /* Barra particionada en xCount segmentos iguales */
                Array.from({ length: activeEq.xCount }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/35 border-2 border-emerald-300 rounded-lg flex flex-col items-center justify-center font-mono font-black text-sm lg:text-base text-emerald-100 shadow-md animate-pulse"
                  >
                    <span>{activeEq.xSolution}</span>
                    <span className="text-[9px] text-emerald-300 font-bold">Pieza {i + 1}</span>
                  </div>
                ))
              )}

              {/* Segmento recortado fantasma en la barra inferior */}
              {!isTrimmed && (
                <div className="w-20 lg:w-28 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center font-mono text-xs text-white/30">
                  {activeEq.unitConst}
                </div>
              )}
            </div>
          </div>

          {/* Micro-leyenda */}
          <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-white/35 pt-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Barras de incógnita x</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Segmento constante</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Barra numérica total</span>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {stage === 'solved' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold animate-bounce">
              <Sparkles size={14} className="text-emerald-300 shrink-0" />
              <span>¡Ecuación resuelta! Cada x = {activeEq.xSolution}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {fbMsg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isTrimmed && (
            <button
              onClick={handleCut}
              className="h-7 lg:h-8 px-3 lg:px-4 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Scissors size={13} />
              <span>Recortar {activeEq.unitConst}</span>
            </button>
          )}

          {isTrimmed && !isPartitioned && (
            <button
              onClick={handlePartition}
              className="h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Divide size={13} />
              <span>Particionar en {activeEq.xCount}</span>
            </button>
          )}

          {stage === 'solved' && (
            <button
              onClick={() => loadPreset((presetIdx + 1) % BAR_PRESETS.length)}
              className="h-7 lg:h-8 px-3.5 lg:px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] lg:text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
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
        title="¿Cómo funciona el Modelo de Barras de Singapur?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-emerald-500 hover:bg-emerald-400"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Comparación de longitudes</strong>: La barra superior representa el primer miembro ($ax + b$) y la barra inferior representa el total numérico ($c$). Como están unidas por el $=$, miden lo mismo.
          </li>
          <li>
            <strong className="text-white">Paso 1: Recortar la constante</strong>: Presiona <strong className="text-rose-400">Recortar</strong> para eliminar el segmento constante $b$. Al descontarlo de ambas barras, la barra inferior se reduce a $c - b$.
          </li>
          <li>
            <strong className="text-white">Paso 2: Particionar en partes iguales</strong>: Ahora las $a$ barras $x$ equivalen exactamente al resto numérico. Presiona <strong className="text-emerald-400">Dividir</strong> para cortar la barra numérica en $a$ partes iguales.
          </li>
          <li>
            Cada segmento individual resultante es el valor exacto de la incógnita <strong className="text-sky-300">x</strong>.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
