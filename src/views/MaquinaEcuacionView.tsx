import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Undo2,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface StepOp {
  op: '+' | '-' | '×' | '÷'
  val: number
  labelOp: string
}

interface MachineEq {
  label: string
  xStart: number
  steps: StepOp[]
  finalValue: number
  story: string
}

const MACHINE_PRESETS: MachineEq[] = [
  {
    label: '2x + 6 = 16',
    xStart: 5,
    steps: [
      { op: '×', val: 2, labelOp: 'Multiplica por 2' },
      { op: '+', val: 6, labelOp: 'Suma 6' },
    ],
    finalValue: 16,
    story: 'Un número secreto x se multiplica por 2, luego se le suma 6 y el resultado es 16.',
  },
  {
    label: '3x + 4 = 19',
    xStart: 5,
    steps: [
      { op: '×', val: 3, labelOp: 'Multiplica por 3' },
      { op: '+', val: 4, labelOp: 'Suma 4' },
    ],
    finalValue: 19,
    story: 'Un número secreto x se multiplica por 3, luego se le suma 4 y el resultado es 19.',
  },
  {
    label: '2x - 5 = 11',
    xStart: 8,
    steps: [
      { op: '×', val: 2, labelOp: 'Multiplica por 2' },
      { op: '-', val: 5, labelOp: 'Resta 5' },
    ],
    finalValue: 11,
    story: 'Un número secreto x se multiplica por 2, luego se le resta 5 y da 11.',
  },
  {
    label: 'x/2 + 6 = 10',
    xStart: 8,
    steps: [
      { op: '÷', val: 2, labelOp: 'Divide entre 2' },
      { op: '+', val: 6, labelOp: 'Suma 6' },
    ],
    finalValue: 10,
    story: 'Un número secreto x se divide a la mitad (÷2), luego se le suma 6 y da 10.',
  },
  {
    label: '4x - 8 = 20',
    xStart: 7,
    steps: [
      { op: '×', val: 4, labelOp: 'Multiplica por 4' },
      { op: '-', val: 8, labelOp: 'Resta 8' },
    ],
    finalValue: 20,
    story: 'Un número secreto x se multiplica por 4, luego se le resta 8 y da 20.',
  },
  {
    label: 'x/3 - 2 = 5',
    xStart: 21,
    steps: [
      { op: '÷', val: 3, labelOp: 'Divide entre 3' },
      { op: '-', val: 2, labelOp: 'Resta 2' },
    ],
    finalValue: 5,
    story: 'Un número secreto x se divide entre 3, luego se le resta 2 y da 5.',
  },
]

export default function MaquinaEcuacionView() {
  const nav = useNavigate()
  const helpId = useId()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  const activeEq = MACHINE_PRESETS[presetIdx]

  // Estado del proceso de rebobinado / desarme
  const [currentStepIndex, setCurrentStepIndex] = useState(activeEq.steps.length - 1)
  const [currentValue, setCurrentValue] = useState(activeEq.finalValue)
  const [history, setHistory] = useState<string[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [solved, setSolved] = useState(false)
  const [showForwardDemo, setShowForwardDemo] = useState(false)

  const [feedback, setFeedback] = useState<{ kind: 'info' | 'error' | 'success'; msg: string }>({
    kind: 'info',
    msg: '¡Máquina lista! Para descubrir "x", rebobinamos la máquina con operaciones contrarias.',
  })

  // Cargar reto
  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    const eq = MACHINE_PRESETS[idx]
    setCurrentStepIndex(eq.steps.length - 1)
    setCurrentValue(eq.finalValue)
    setHistory([])
    setSolved(false)
    setIsAnimating(false)
    setShowForwardDemo(false)
    setFeedback({
      kind: 'info',
      msg: `Reto: ${eq.label}. Empezamos desde el resultado (${eq.finalValue}) y viajamos en reversa.`,
    })
  }

  // Animación didáctica de demostración de ida
  const runForwardDemo = () => {
    if (showForwardDemo) return
    setShowForwardDemo(true)
    setTimeout(() => {
      setShowForwardDemo(false)
    }, 2500)
  }

  // Operación activa a desarmar
  const targetStep = currentStepIndex >= 0 ? activeEq.steps[currentStepIndex] : null

  // Opciones de palancas inversas para niños con texto claro
  interface InverseOption {
    id: string
    op: '+' | '-' | '×' | '÷'
    val: number
    actionText: string
    reason: string
    isCorrect: boolean
    color: string
  }

  const getInverseOptions = (step: StepOp | null): InverseOption[] => {
    if (!step) return []
    const val = step.val

    if (step.op === '+') {
      return [
        {
          id: 'minus',
          op: '-',
          val,
          actionText: `Restar ${val} (−${val})`,
          reason: `Lo contrario de sumar ${val} es restar ${val}`,
          isCorrect: true,
          color: 'from-rose-500/30 to-rose-600/20 border-rose-400 text-rose-100 hover:bg-rose-500/40',
        },
        {
          id: 'plus',
          op: '+',
          val,
          actionText: `Sumar ${val} (+${val})`,
          reason: `Sumar de nuevo aumentaría el número`,
          isCorrect: false,
          color: 'from-amber-500/20 to-amber-600/10 border-amber-400/40 text-amber-200 hover:bg-amber-500/30',
        },
        {
          id: 'div',
          op: '÷',
          val,
          actionText: `Dividir entre ${val}`,
          reason: `Dividir es lo contrario de multiplicar, no de sumar`,
          isCorrect: false,
          color: 'from-purple-500/20 to-purple-600/10 border-purple-400/40 text-purple-200 hover:bg-purple-500/30',
        },
      ]
    }

    if (step.op === '-') {
      return [
        {
          id: 'plus',
          op: '+',
          val,
          actionText: `Sumar ${val} (+${val})`,
          reason: `Lo contrario de restar ${val} es devolverle o sumarle ${val}`,
          isCorrect: true,
          color: 'from-emerald-500/30 to-emerald-600/20 border-emerald-400 text-emerald-100 hover:bg-emerald-500/40',
        },
        {
          id: 'minus',
          op: '-',
          val,
          actionText: `Restar ${val} (−${val})`,
          reason: `Volver a restar quitaría aún más`,
          isCorrect: false,
          color: 'from-rose-500/20 to-rose-600/10 border-rose-400/40 text-rose-200 hover:bg-rose-500/30',
        },
        {
          id: 'mult',
          op: '×',
          val,
          actionText: `Multiplicar por ${val}`,
          reason: `Multiplicar es lo contrario de dividir, no de restar`,
          isCorrect: false,
          color: 'from-sky-500/20 to-sky-600/10 border-sky-400/40 text-sky-200 hover:bg-sky-500/30',
        },
      ]
    }

    if (step.op === '×') {
      return [
        {
          id: 'div',
          op: '÷',
          val,
          actionText: `Dividir entre ${val} (÷${val})`,
          reason: `Lo contrario de multiplicar por ${val} es repartir o dividir entre ${val}`,
          isCorrect: true,
          color: 'from-sky-500/30 to-sky-600/20 border-sky-400 text-sky-100 hover:bg-sky-500/40',
        },
        {
          id: 'mult',
          op: '×',
          val,
          actionText: `Multiplicar por ${val}`,
          reason: `Multiplicar otra vez haría el número ${val} veces más grande`,
          isCorrect: false,
          color: 'from-amber-500/20 to-amber-600/10 border-amber-400/40 text-amber-200 hover:bg-amber-500/30',
        },
        {
          id: 'minus',
          op: '-',
          val,
          actionText: `Restar ${val}`,
          reason: `Restar es lo contrario de sumar, no de multiplicar`,
          isCorrect: false,
          color: 'from-rose-500/20 to-rose-600/10 border-rose-400/40 text-rose-200 hover:bg-rose-500/30',
        },
      ]
    }

    // op === '÷'
    return [
      {
        id: 'mult',
        op: '×',
        val,
        actionText: `Multiplicar por ${val} (×${val})`,
        reason: `Lo contrario de dividir en ${val} partes es multiplicar por ${val}`,
        isCorrect: true,
        color: 'from-amber-500/30 to-amber-600/20 border-amber-400 text-amber-100 hover:bg-amber-500/40',
      },
      {
        id: 'div',
        op: '÷',
        val,
        actionText: `Dividir entre ${val}`,
        reason: `Dividir de nuevo haría el número aún más pequeño`,
        isCorrect: false,
        color: 'from-purple-500/20 to-purple-600/10 border-purple-400/40 text-purple-200 hover:bg-purple-500/30',
      },
      {
        id: 'plus',
        op: '+',
        val,
        actionText: `Sumar ${val}`,
        reason: `Sumar es lo contrario de restar, no de dividir`,
        isCorrect: false,
        color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30',
      },
    ]
  }

  // Aplicar operación inversa seleccionada
  const handleApplyInverse = (opt: InverseOption) => {
    if (solved || !targetStep || isAnimating) return

    if (!opt.isCorrect) {
      setFeedback({
        kind: 'error',
        msg: `¡Casi! ${opt.reason}. La máquina hizo "${targetStep.op} ${targetStep.val}". ¿Cuál es la operación opuesta?`,
      })
      return
    }

    setIsAnimating(true)

    let nextVal = currentValue
    if (opt.op === '+') nextVal = currentValue + opt.val
    else if (opt.op === '-') nextVal = currentValue - opt.val
    else if (opt.op === '×') nextVal = currentValue * opt.val
    else if (opt.op === '÷') nextVal = Math.round(currentValue / opt.val)

    const stepFormula = `${currentValue} ${opt.op} ${opt.val} = ${nextVal}`

    setTimeout(() => {
      setHistory(prev => [...prev, stepFormula])
      setCurrentValue(nextVal)
      setIsAnimating(false)

      if (currentStepIndex === 0) {
        setSolved(true)
        setCurrentStepIndex(-1)
        setFeedback({
          kind: 'success',
          msg: `🎉 ¡Caja misteriosa abierta! x = ${nextVal}. ¡Has desarmado la ecuación por completo!`,
        })
      } else {
        const nextIdx = currentStepIndex - 1
        setCurrentStepIndex(nextIdx)
        setFeedback({
          kind: 'success',
          msg: `¡Muy bien! ${stepFormula}. Ahora desarmemos "${activeEq.steps[nextIdx].op} ${activeEq.steps[nextIdx].val}".`,
        })
      }
    }, 450)
  }

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera Compacta (34-44px) ── */}
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
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[12px] sm:text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              Máquina de Ecuaciones
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Operaciones Contrarias
            </span>
          </div>
        </div>

        {/* Ecuación objetivo */}
        <div className="font-mono text-xs lg:text-sm font-bold text-amber-300 bg-amber-400/10 px-2 sm:px-2.5 py-0.5 rounded-md border border-amber-400/20">
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

      {/* ── 2. Selector de Retos Horizontal Compacto (34-40px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] text-white/40 font-semibold hidden sm:inline">Reto:</span>
          {MACHINE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 px-2.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? 'bg-amber-500 text-black shadow-sm ring-1 ring-amber-400 font-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => loadPreset(presetIdx)}
          className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all"
          title="Reiniciar"
        >
          <RefreshCw size={11} />
          <span className="hidden sm:inline">Reiniciar</span>
        </button>
      </div>

      {/* ── 3. Fábrica Visual e Interactiva (flex-1 min-h-0) ── */}
      <div
        className="flex-1 min-h-0 flex flex-col justify-between p-1.5 sm:p-2 lg:p-3 gap-1.5 sm:gap-2 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* PISTA 1: ¿CÓMO SE ARMÓ LA ECUACIÓN? (Ida compacta) */}
        <section className="bg-[#0b1326]/90 border border-white/10 rounded-xl px-2 py-1.5 shrink-0 shadow-md">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-1">
            <div className="flex items-center gap-1 font-bold text-sky-300">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-[9px] font-mono">
                1
              </span>
              <span>Viaje de Ida: ¿Cómo se armó?</span>
            </div>

            <button
              onClick={runForwardDemo}
              disabled={showForwardDemo}
              className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-[9px] sm:text-[10px] text-sky-200 font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <Play size={9} className={showForwardDemo ? 'animate-spin' : ''} />
              <span>{showForwardDemo ? 'Viajando...' : 'Ver ida ▶'}</span>
            </button>
          </div>

          {/* Fila compacta de la máquina */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-0.5">
            {/* Caja x */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black border transition-all shrink-0 ${
                solved
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50'
                  : showForwardDemo
                  ? 'bg-sky-500/40 border-sky-300 text-white animate-pulse'
                  : 'bg-sky-500/20 border-sky-400 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-0.5 text-xs sm:text-sm">
                {solved ? <Unlock size={10} className="text-emerald-400" /> : <Lock size={10} className="text-sky-300" />}
                <span>x</span>
              </div>
              <span className="text-[7px] text-sky-300/70">{solved ? `=${currentValue}` : 'Inicio'}</span>
            </div>

            {/* Módulos de Operación de Ida */}
            {activeEq.steps.map((st, i) => {
              const isPastInReversal = currentStepIndex < i
              const isCurrentInReversal = currentStepIndex === i

              return (
                <div key={i} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <ArrowRight size={11} className="text-white/30 shrink-0" />
                  <div
                    className={`px-2 py-1 rounded-lg border flex flex-col items-center justify-center min-w-[58px] sm:min-w-[72px] lg:min-w-[84px] transition-all ${
                      isPastInReversal
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                        : isCurrentInReversal
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <span className="text-[7px] sm:text-[8px] text-white/40 uppercase font-black">
                      Paso {i + 1}
                    </span>
                    <span className="text-[11px] sm:text-xs lg:text-sm font-black font-mono">
                      {st.op} {st.val}
                    </span>
                    {isPastInReversal && (
                      <span className="text-[7px] font-bold text-emerald-400">✓ Listo</span>
                    )}
                  </div>
                </div>
              )
            })}

            <ArrowRight size={11} className="text-white/30 shrink-0" />

            {/* Resultado Final al que llegó la máquina */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg bg-amber-500/20 border border-amber-400 flex flex-col items-center justify-center font-mono font-black text-amber-200 shrink-0">
              <span className="text-xs sm:text-sm lg:text-base">{activeEq.finalValue}</span>
              <span className="text-[7px] text-amber-300/70">Salida</span>
            </div>
          </div>
        </section>

        {/* PISTA 2: EL REBOBINADOR (Desarmar en sentido contrario ⬅) */}
        <section className="flex-1 min-h-0 bg-[#0c1529]/95 border border-amber-500/25 rounded-xl p-1.5 sm:p-2.5 lg:p-3 flex flex-col justify-between shadow-xl relative overflow-hidden">
          
          {/* Cabecera del rebobinador */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-300">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                2
              </span>
              <span>Viaje de Regreso: Desarmar la máquina</span>
              <Undo2 size={12} className="text-amber-400" />
            </div>

            <div className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-sm">
              <span className="text-white/60">Cápsula:</span>
              <span className="text-white font-black text-xs sm:text-sm">{currentValue}</span>
            </div>
          </div>

          {/* Visualización de la cápsula retrocediendo de derecha a izquierda */}
          <div className="py-0.5 shrink-0">
            <div className="bg-[#060a14] rounded-lg p-1.5 border border-white/10 flex items-center justify-between gap-1">
              
              {/* Meta: x liberada a la izquierda */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-mono font-black border text-xs sm:text-sm transition-all ${
                    solved
                      ? 'bg-emerald-500 border-emerald-300 text-white shadow-lg animate-bounce'
                      : 'bg-white/5 border-dashed border-white/20 text-white/30'
                  }`}
                >
                  <span>x</span>
                </div>
                <span className="text-[7px] text-white/40">Meta: x</span>
              </div>

              {/* Cápsula flotante actual */}
              <div className="flex-1 flex items-center justify-center gap-1 px-1">
                <ArrowLeftIcon size={12} className="text-amber-300/70" />
                <div
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 font-mono font-bold text-xs shadow-md transition-all ${
                    isAnimating
                      ? 'bg-amber-400 text-black animate-pulse'
                      : solved
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-amber-500/25 border-amber-400 text-amber-100 ring-1 ring-amber-400/40'
                  }`}
                >
                  <Sparkles size={11} className="text-amber-300" />
                  <span>Valor: <strong className="text-white font-black">{currentValue}</strong></span>
                </div>
                <ArrowLeftIcon size={12} className="text-amber-300/70" />
              </div>

              {/* Salida inicial a la derecha */}
              <div className="flex flex-col items-center opacity-60">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-400/20 flex items-center justify-center font-mono text-xs text-amber-300/80">
                  {activeEq.finalValue}
                </div>
                <span className="text-[7px] text-white/40">Salida</span>
              </div>
            </div>
          </div>

          {/* Historial de pasos desarmados */}
          {history.length > 0 && (
            <div className="flex items-center justify-center gap-1 flex-wrap shrink-0 py-0.5">
              {history.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono text-[9px] sm:text-[10px] font-bold"
                >
                  <CheckCircle2 size={10} />
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* ÁREA DE DECISIÓN: Pregunta y 3 Botones SIEMPRE en una sola fila (grid-cols-3) */}
          <div className="flex-1 min-h-0 flex flex-col justify-center py-1">
            {!solved ? (
              <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-1 sm:gap-1.5">
                <div className="text-center px-1">
                  <div className="text-[10px] sm:text-[11px] text-white/60">
                    La máquina hizo al final:{' '}
                    <span className="font-mono font-black text-amber-300 bg-amber-400/15 px-1 py-0.2 rounded border border-amber-400/30">
                      {targetStep?.op} {targetStep?.val}
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-white mt-0.5">
                    ¿Qué operación <strong className="text-amber-400">contraria</strong> le aplicamos a{' '}
                    <span className="text-emerald-300 font-mono">{currentValue}</span>?
                  </div>
                </div>

                {/* 3 Botones SIEMPRE en grid-cols-3 horizontal */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full pt-0.5">
                  {getInverseOptions(targetStep).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleApplyInverse(opt)}
                      disabled={isAnimating}
                      className={`h-11 sm:h-12 lg:h-13 px-1 rounded-xl border bg-gradient-to-b ${opt.color} flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm`}
                    >
                      <span className="text-[10px] sm:text-[11px] lg:text-xs font-black font-mono leading-tight text-center">
                        {opt.actionText}
                      </span>
                      <span className="text-[8px] text-white/60 leading-tight mt-0.5 truncate">
                        {opt.id === 'minus' && 'Resta'}
                        {opt.id === 'plus' && 'Suma'}
                        {opt.id === 'div' && 'Divide'}
                        {opt.id === 'mult' && 'Multiplica'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* PANTALLA DE ÉXITO COMPACTA */
              <div className="flex flex-col items-center justify-center gap-1 text-center py-1">
                <div className="px-4 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400 text-emerald-100 flex items-center gap-2 shadow-lg">
                  <Sparkles size={16} className="text-emerald-300" />
                  <span className="text-xs sm:text-sm font-black font-mono">¡Caja Abierta! x = {currentValue}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/70 max-w-sm truncate">
                  Comprobación: {activeEq.steps.map((s, i) => `${i === 0 ? currentValue : ''} ${s.op} ${s.val}`).join(' ')} = {activeEq.finalValue} ✓
                </p>
              </div>
            )}
          </div>

          {/* Micro-regla al pie */}
          <div className="border-t border-white/5 pt-0.5 flex items-center justify-around text-[8px] sm:text-[9px] text-white/40 shrink-0">
            <span>
              <strong className="text-sky-300">Sumar ➕</strong> ⇄ <strong className="text-rose-300">Restar ➖</strong>
            </span>
            <span>|</span>
            <span>
              <strong className="text-amber-300">Multiplicar ✖</strong> ⇄ <strong className="text-emerald-300">Dividir ➗</strong>
            </span>
          </div>
        </section>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {feedback.kind === 'error' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] sm:text-[11px] font-semibold">
              <AlertCircle size={13} className="text-rose-400 shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : feedback.kind === 'success' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-[11px] font-semibold">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] text-white/70 truncate max-w-full font-medium">
              {feedback.msg}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {solved ? (
            <button
              onClick={() => loadPreset((presetIdx + 1) % MACHINE_PRESETS.length)}
              className="h-7 lg:h-8 px-3 lg:px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <span>Siguiente</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={() => loadPreset(presetIdx)}
              className="h-7 lg:h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Reiniciar este reto"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Modal de Ayuda Pedagógica ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo funciona la Máquina de Ecuaciones?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-amber-500 text-black hover:bg-amber-400"
      >
        <div key={helpId} className="space-y-2.5 text-white/80 text-xs leading-relaxed pb-2">
          <p>
            Imagina una <strong>máquina de fábrica</strong> que transforma una caja secreta con la incógnita <strong className="text-sky-300">x</strong>:
          </p>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="font-bold text-amber-300">1. En el viaje de ida (Construcción):</div>
            <p className="text-white/70">
              La incógnita $x$ entra a la máquina y sufre transformaciones paso a paso hasta dar el resultado final.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="font-bold text-emerald-300">2. En el viaje de regreso (Rebobinar):</div>
            <p className="text-white/70">
              Para descubrir el valor de $x$, tomamos el resultado final y <strong>hacemos el camino hacia atrás</strong> con las <strong>operaciones opuestas</strong>:
            </p>
            <ul className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[11px]">
              <li className="bg-sky-500/10 p-1 rounded border border-sky-400/30 text-sky-200">➕ Sumar ⇄ ➖ Restar</li>
              <li className="bg-amber-500/10 p-1 rounded border border-amber-400/30 text-amber-200">✖ Multiplicar ⇄ ➗ Dividir</li>
            </ul>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
