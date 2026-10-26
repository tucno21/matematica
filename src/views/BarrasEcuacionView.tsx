import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Scissors, Divide, Sparkles, Check } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface BarEq {
  label: string
  xCount: number
  unitConst: number
  total: number
  xSolution: number
  difficulty: 'Fácil' | 'Medio' | 'Difícil'
}

const BAR_PRESETS: BarEq[] = [
  { label: '2x + 8 = 20', xCount: 2, unitConst: 8, total: 20, xSolution: 6, difficulty: 'Fácil' },
  { label: '3x + 6 = 24', xCount: 3, unitConst: 6, total: 24, xSolution: 6, difficulty: 'Fácil' },
  { label: '4x + 4 = 24', xCount: 4, unitConst: 4, total: 24, xSolution: 5, difficulty: 'Medio' },
  { label: '2x + 14 = 30', xCount: 2, unitConst: 14, total: 30, xSolution: 8, difficulty: 'Medio' },
  { label: '3x + 12 = 33', xCount: 3, unitConst: 12, total: 33, xSolution: 7, difficulty: 'Difícil' },
  { label: '5x + 10 = 35', xCount: 5, unitConst: 10, total: 35, xSolution: 5, difficulty: 'Difícil' },
]

export default function BarrasEcuacionView() {
  const nav = useNavigate()
  const helpId = useId()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(1) // Empezar con 3x + 6 = 24 por defecto

  const activeEq = BAR_PRESETS[presetIdx]

  const [isCutting, setIsCutting] = useState(false)
  const [isTrimmed, setIsTrimmed] = useState(false)
  const [isPartitioned, setIsPartitioned] = useState(false)
  const [fbMsg, setFbMsg] = useState(
    'Paso 1: Observa que ambas barras tienen la misma longitud. Usa la tijera para recortar la constante numérica.'
  )

  // Porcentajes matemáticos de proporción exactos
  const trimmedTotal = activeEq.total - activeEq.unitConst
  const varPct = (trimmedTotal / activeEq.total) * 100
  const constPct = 100 - varPct

  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    const eq = BAR_PRESETS[idx]
    setIsCutting(false)
    setIsTrimmed(false)
    setIsPartitioned(false)
    setFbMsg(
      `Ecuación ${eq.label}: La barra superior (${eq.xCount}x + ${eq.unitConst}) y la barra inferior (${eq.total}) miden lo mismo. Recorta el ${eq.unitConst}.`
    )
  }

  // Paso 1: Recortar constante con animación
  const handleCut = () => {
    if (isTrimmed || isCutting) return
    setIsCutting(true)
    setFbMsg(`Cortando ${activeEq.unitConst} unidades al mismo nivel en ambos miembros...`)

    setTimeout(() => {
      setIsCutting(false)
      setIsTrimmed(true)
      setFbMsg(
        `¡Recorte exitoso! Se restó ${activeEq.unitConst} a ambos lados. Quedan ${activeEq.xCount} barras de "x" que suman ${trimmedTotal}.`
      )
    }, 650)
  }

  // Paso 2: Particionar en partes iguales según las variables
  const handlePartition = () => {
    if (!isTrimmed || isPartitioned) return
    setIsPartitioned(true)
    setFbMsg(
      `¡División completada! La barra de ${trimmedTotal} se divide en ${activeEq.xCount} partes iguales: ${trimmedTotal} ÷ ${activeEq.xCount} = ${activeEq.xSolution}. Por lo tanto, x = ${activeEq.xSolution}.`
    )
  }

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
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              Modelo de Barras (Singapur)
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
              Método Visual
            </span>
          </div>
        </div>

        {/* Ecuación actual */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 hidden sm:inline">Ecuación:</span>
          <div className="font-mono text-xs lg:text-sm font-bold text-emerald-300 bg-emerald-400/10 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
            {activeEq.label}
          </div>
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

      {/* ── 3. Área de Trabajo Central: Barras Proporcionales (flex-1 min-h-0) ── */}
      <div
        className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1.5 sm:gap-2 lg:gap-3"
        style={{ touchAction: 'none' }}
      >
        {/* Panel Izquierdo: Herramientas de Corte y División */}
        <aside className="w-[54px] sm:w-[62px] lg:w-[74px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Acciones
            </span>

            {/* Herramienta 1: Recortar */}
            <button
              onClick={handleCut}
              disabled={isTrimmed || isCutting}
              className={`w-10 sm:w-11 lg:w-13 h-10 lg:h-12 rounded-lg flex flex-col items-center justify-center font-bold active:scale-95 transition-all shadow-sm ${
                !isTrimmed
                  ? 'bg-rose-500/25 border border-rose-400/50 text-rose-200 hover:bg-rose-500/35 ring-2 ring-rose-400/40 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed opacity-40'
              }`}
              title="Recortar constante al mismo nivel en ambas barras"
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
              title={`Dividir en ${activeEq.xCount} partes iguales`}
            >
              <Divide size={16} />
              <span className="text-[8px] lg:text-[9px] mt-0.5">Dividir</span>
            </button>
          </div>

          <div className="text-[8px] lg:text-[9px] text-white/30 text-center px-0.5">
            {isPartitioned ? '¡Resuelto!' : isTrimmed ? 'Paso 2/2' : 'Paso 1/2'}
          </div>
        </aside>

        {/* Visualización Principal de Barras Proporcionales */}
        <main className="flex-1 min-w-0 flex flex-col justify-around bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-2 sm:p-3 lg:p-6 overflow-hidden relative">
          
          {/* Contenedor central con ancho máximo balanceado */}
          <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col justify-around h-full gap-2 lg:gap-4 relative">

            {/* ── BARRA SUPERIOR: Primer Miembro (ax + b) ── */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-sky-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Primer Miembro: {activeEq.xCount}x {isTrimmed ? '' : `+ ${activeEq.unitConst}`}
                </span>
                <span className="text-[10px] lg:text-xs text-white/40 font-mono">
                  {isTrimmed ? `Mide: ${trimmedTotal}` : `Longitud total: ${activeEq.total}`}
                </span>
              </div>

              {/* Riel Superior (100% de longitud) */}
              <div className="h-14 sm:h-16 lg:h-20 w-full bg-[#0c1529]/80 border border-white/15 rounded-xl flex items-stretch p-1 relative shadow-inner">
                {/* 1. Bloque de variables x (ancho exacto varPct%, nunca se encoge) */}
                <div
                  className="h-full flex items-stretch gap-1.5 shrink-0"
                  style={{ width: `${varPct}%` }}
                >
                  {Array.from({ length: activeEq.xCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 min-w-0 rounded-lg flex flex-col items-center justify-center font-mono font-black transition-all ${
                        isPartitioned
                          ? 'bg-sky-500/40 border-2 border-sky-300 text-sky-100 shadow-md ring-1 ring-sky-400/50'
                          : 'bg-sky-500/25 border-2 border-sky-400 text-sky-200'
                      }`}
                    >
                      <span className="text-base sm:text-lg lg:text-xl">x</span>
                      {isPartitioned && (
                        <span className="text-[10px] lg:text-xs text-emerald-300 font-bold animate-pulse">
                          = {activeEq.xSolution}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 2. Bloque de constante recortable (ancho exacto constPct%, shrink-0) */}
                <div
                  className="h-full pl-1.5 shrink-0"
                  style={{ width: `${constPct}%` }}
                >
                  {!isTrimmed ? (
                    <div
                      onClick={handleCut}
                      className={`h-full w-full rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs lg:text-sm cursor-pointer transition-all ${
                        isCutting
                          ? 'bg-rose-500/40 border-2 border-rose-300 text-rose-100 animate-ping'
                          : 'bg-rose-500/20 border-2 border-dashed border-rose-400 text-rose-200 hover:bg-rose-500/35 hover:scale-[1.01]'
                      }`}
                      title="Haz clic para recortar este segmento"
                    >
                      <span>+{activeEq.unitConst}</span>
                      <span className="text-[9px] text-rose-300/80 flex items-center gap-0.5">
                        <Scissors size={10} /> Cortar
                      </span>
                    </div>
                  ) : (
                    /* Silueta fantasma de lo recortado */
                    <div className="h-full w-full rounded-lg border border-dashed border-rose-400/25 bg-rose-500/[0.04] flex items-center justify-center text-[10px] font-mono text-rose-300/50">
                      ✂ -{activeEq.unitConst}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── LÍNEA DE IGUALDAD Y GUÍA DE CORTE VERTICAL ── */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="h-px bg-white/10 w-full" />
              <div className="absolute px-3 py-0.5 rounded-full bg-[#0a0f1d] border border-white/20 text-[10px] sm:text-xs font-bold text-white/70 shadow-sm flex items-center gap-1.5 z-10">
                <span>Misma longitud inicial (=)</span>
              </div>

              {/* Indicador visual de línea de corte vertical si no está recortado */}
              {!isTrimmed && (
                <div
                  className="absolute top-[-14px] bottom-[-14px] w-0.5 border-l-2 border-dashed border-rose-400 pointer-events-none z-20 flex flex-col items-center justify-between"
                  style={{ left: `${varPct}%` }}
                >
                  <div className={`p-0.5 rounded-full bg-rose-500 text-white shadow-lg ${isCutting ? 'animate-bounce scale-125' : ''}`}>
                    <Scissors size={11} />
                  </div>
                  <div className="text-[8px] font-mono bg-rose-950/95 text-rose-200 px-1.5 py-0.5 rounded border border-rose-500/50 whitespace-nowrap shadow">
                    Línea de corte
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
              )}
            </div>

            {/* ── BARRA INFERIOR: Segundo Miembro (Total numérico c) ── */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Segundo Miembro: {isTrimmed ? `${trimmedTotal} (después de restar ${activeEq.unitConst})` : `Total = ${activeEq.total}`}
                </span>
                <span className="text-[10px] lg:text-xs text-white/40 font-mono">
                  {isPartitioned
                    ? `${activeEq.xCount} partes de ${activeEq.xSolution}`
                    : isTrimmed
                    ? `Mide: ${trimmedTotal}`
                    : `Barra completa: ${activeEq.total}`}
                </span>
              </div>

              {/* Riel Inferior (100% de longitud idéntica al riel superior) */}
              <div className="h-14 sm:h-16 lg:h-20 w-full bg-[#0c1529]/80 border border-white/15 rounded-xl flex items-stretch p-1 relative shadow-inner">
                
                {/* 1. ANTES DE RECORTAR: Barra TOTALMENTE COMPLETA Y SÓLIDA (100% de ancho) */}
                {!isTrimmed ? (
                  <div className="w-full h-full relative flex items-stretch">
                    {/* Barra completa continua */}
                    <div className="w-full h-full bg-emerald-500/25 border-2 border-emerald-400 rounded-lg flex items-center justify-center font-mono font-black text-base sm:text-lg lg:text-xl text-emerald-200 shadow-md">
                      <span>{activeEq.total}</span>
                    </div>

                    {/* Pre-visualización sutil del segmento que se cortará al nivel exacto */}
                    <div
                      style={{ left: `${varPct}%`, width: `${constPct}%` }}
                      className="absolute top-0 bottom-0 pl-1.5 pointer-events-none"
                    >
                      <div className="h-full w-full border-l-2 border-dashed border-rose-400/80 bg-rose-500/15 rounded-r-lg flex items-center justify-center">
                        <span className="text-[10px] lg:text-xs font-mono font-bold text-rose-200 bg-[#080c18]/90 px-1.5 py-0.5 rounded border border-rose-400/40 shadow">
                          -{activeEq.unitConst}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. TRAS RECORTAR: Dos secciones perfectamente alineadas con la barra superior */
                  <>
                    {/* Sección restante (ocupa varPct%, exactamente idéntica en ancho que las x) */}
                    <div
                      style={{ width: `${varPct}%` }}
                      className="h-full shrink-0"
                    >
                      {!isPartitioned ? (
                        /* Barra sólida recortada que muestra trimmedTotal (ej. 18) */
                        <div className="w-full h-full bg-emerald-500/30 border-2 border-emerald-400 rounded-lg flex flex-col items-center justify-center font-mono font-black text-sm sm:text-base lg:text-lg text-emerald-200 shadow-md">
                          <span>{trimmedTotal}</span>
                          <span className="text-[9px] text-emerald-300/70 font-normal">
                            ({activeEq.total} - {activeEq.unitConst})
                          </span>
                        </div>
                      ) : (
                        /* PARTICIONADA: Dividida en xCount partes exactamente alineadas bajo cada x */
                        <div className="w-full h-full flex items-stretch gap-1.5">
                          {Array.from({ length: activeEq.xCount }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 min-w-0 rounded-lg bg-emerald-500/40 border-2 border-emerald-300 flex flex-col items-center justify-center font-mono font-black text-emerald-100 shadow-lg ring-1 ring-emerald-400/50 animate-pulse"
                            >
                              <span className="text-base sm:text-lg lg:text-xl">{activeEq.xSolution}</span>
                              <span className="text-[8px] lg:text-[9px] text-emerald-300 font-bold uppercase tracking-wider">
                                x
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Espacio del corte en la barra inferior (muestra el -b recortado) */}
                    <div
                      style={{ width: `${constPct}%` }}
                      className="h-full pl-1.5 shrink-0 pointer-events-none"
                    >
                      <div className="h-full w-full rounded-lg border border-dashed border-rose-400/25 bg-rose-500/[0.04] flex items-center justify-center text-[10px] font-mono text-rose-300/50">
                        ✂ -{activeEq.unitConst}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── MICRO-LEYENDA ── */}
            <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-6 text-[9px] lg:text-[10px] text-white/40 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Incógnita (x)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Constante (+{activeEq.unitConst})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Barra numérica
              </span>
            </div>

          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isPartitioned ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold">
              <Sparkles size={14} className="text-emerald-300 shrink-0 animate-spin" />
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
              disabled={isCutting}
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

          {isPartitioned && (
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
        <div key={helpId} className="space-y-2.5 text-white/80 text-xs leading-relaxed pb-2">
          <p>
            El <strong>Modelo de Barras</strong> permite visualizar ecuaciones como barras de longitud equivalente:
          </p>
          <ol className="space-y-2 list-decimal list-inside pl-1">
            <li>
              <strong className="text-white">Equivalencia inicial</strong>: La barra superior representa el primer miembro ($ax + b$) y la barra inferior representa el total numérico ($c$). Ambas comienzan con la misma longitud total.
            </li>
            <li>
              <strong className="text-rose-400">Paso 1: Recortar la constante</strong>: Se descuenta el segmento constante $b$ simultáneamente en ambas barras al mismo nivel vertical. La barra inferior se reduce a $c - b$.
            </li>
            <li>
              <strong className="text-emerald-400">Paso 2: Particionar en partes iguales</strong>: Ahora las $a$ barras $x$ tienen la misma longitud que el valor numérico restante ($c - b$). Se divide la barra inferior en $a$ partes iguales directamente alineadas bajo cada $x$.
            </li>
            <li>
              Cada segmento individual muestra el valor de una única <strong className="text-sky-300">x</strong>.
            </li>
          </ol>
        </div>
      </ModalHelp>
    </div>
  )
}
