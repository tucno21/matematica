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
import { useThemeStore } from '../store/useThemeStore'

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
  const isDark = useThemeStore(s => s.theme === 'dark')
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
    kind: 'rose' | 'amber' | 'purple' | 'emerald' | 'sky'
  }

  const getOptionClasses = (kind: InverseOption['kind']) => {
    switch (kind) {
      case 'rose':
        return {
          btn: isDark
            ? 'bg-rose-500/25 hover:bg-rose-500/35 border-2 border-rose-400 text-rose-100 shadow-sm'
            : 'bg-rose-50 hover:bg-rose-100 border-2 border-rose-400 text-rose-950 shadow-xs font-black',
          sub: isDark ? 'text-rose-200/90 font-semibold' : 'text-rose-700 font-bold',
        }
      case 'emerald':
        return {
          btn: isDark
            ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border-2 border-emerald-400 text-emerald-100 shadow-sm'
            : 'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400 text-emerald-950 shadow-xs font-black',
          sub: isDark ? 'text-emerald-200/90 font-semibold' : 'text-emerald-700 font-bold',
        }
      case 'sky':
        return {
          btn: isDark
            ? 'bg-sky-500/25 hover:bg-sky-500/35 border-2 border-sky-400 text-sky-100 shadow-sm'
            : 'bg-sky-50 hover:bg-sky-100 border-2 border-sky-400 text-sky-950 shadow-xs font-black',
          sub: isDark ? 'text-sky-200/90 font-semibold' : 'text-sky-700 font-bold',
        }
      case 'amber':
        return {
          btn: isDark
            ? 'bg-amber-500/25 hover:bg-amber-500/35 border-2 border-amber-400 text-amber-100 shadow-sm'
            : 'bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 text-amber-950 shadow-xs font-black',
          sub: isDark ? 'text-amber-200/90 font-semibold' : 'text-amber-700 font-bold',
        }
      case 'purple':
      default:
        return {
          btn: isDark
            ? 'bg-purple-500/25 hover:bg-purple-500/35 border-2 border-purple-400 text-purple-100 shadow-sm'
            : 'bg-purple-50 hover:bg-purple-100 border-2 border-purple-400 text-purple-950 shadow-xs font-black',
          sub: isDark ? 'text-purple-200/90 font-semibold' : 'text-purple-700 font-bold',
        }
    }
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
          kind: 'rose',
        },
        {
          id: 'plus',
          op: '+',
          val,
          actionText: `Sumar ${val} (+${val})`,
          reason: `Sumar de nuevo aumentaría el número`,
          isCorrect: false,
          kind: 'amber',
        },
        {
          id: 'div',
          op: '÷',
          val,
          actionText: `Dividir entre ${val}`,
          reason: `Dividir es lo contrario de multiplicar, no de sumar`,
          isCorrect: false,
          kind: 'purple',
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
          kind: 'emerald',
        },
        {
          id: 'minus',
          op: '-',
          val,
          actionText: `Restar ${val} (−${val})`,
          reason: `Volver a restar quitaría aún más`,
          isCorrect: false,
          kind: 'rose',
        },
        {
          id: 'mult',
          op: '×',
          val,
          actionText: `Multiplicar por ${val}`,
          reason: `Multiplicar es lo contrario de dividir, no de restar`,
          isCorrect: false,
          kind: 'sky',
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
          kind: 'sky',
        },
        {
          id: 'mult',
          op: '×',
          val,
          actionText: `Multiplicar por ${val}`,
          reason: `Multiplicar otra vez haría el número ${val} veces más grande`,
          isCorrect: false,
          kind: 'amber',
        },
        {
          id: 'minus',
          op: '-',
          val,
          actionText: `Restar ${val}`,
          reason: `Restar es lo contrario de sumar, no de multiplicar`,
          isCorrect: false,
          kind: 'rose',
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
        kind: 'amber',
      },
      {
        id: 'div',
        op: '÷',
        val,
        actionText: `Dividir entre ${val}`,
        reason: `Dividir de nuevo haría el número aún más pequeño`,
        isCorrect: false,
        kind: 'purple',
      },
      {
        id: 'plus',
        op: '+',
        val,
        actionText: `Sumar ${val}`,
        reason: `Sumar es lo contrario de restar, no de dividir`,
        isCorrect: false,
        kind: 'emerald',
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
      className={`flex h-dvh flex-col overflow-hidden select-none ${
        isDark ? "bg-[#080c18] text-white" : "bg-slate-100 text-slate-900"
      }`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera Compacta (34-44px) ── */}
      <header className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${
        isDark ? "border-white/10 bg-[#0a0f1d]" : "border-slate-300 bg-white shadow-xs"
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => nav(-1)}
            className={`flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border active:scale-95 transition-all ${
              isDark
                ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-xs"
            }`}
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className={`text-[12px] sm:text-[13px] lg:text-[15px] font-bold truncate ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Máquina de Ecuaciones
            </h1>
            <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono border ${
              isDark
                ? "bg-amber-400/10 text-amber-300 border-amber-400/30 font-bold"
                : "bg-amber-50 text-amber-900 border-amber-300 font-bold"
            }`}>
              Operaciones Contrarias
            </span>
          </div>
        </div>

        {/* Ecuación objetivo */}
        <div className={`font-mono text-xs lg:text-sm font-black px-2 sm:px-2.5 py-0.5 rounded-md border shadow-xs ${
          isDark
            ? "text-amber-300 bg-amber-400/15 border-amber-400/40"
            : "text-amber-950 bg-amber-100 border-amber-400 font-black"
        }`}>
          {activeEq.label}
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className={`flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border active:scale-95 transition-all ${
            isDark
              ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
              : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-xs"
          }`}
          aria-label="Ayuda"
          title="Ayuda"
        >
          <HelpCircle size={15} />
        </button>
      </header>

      {/* ── 2. Selector de Retos Horizontal Compacto (34-40px) ── */}
      <div className={`relative shrink-0 flex items-center justify-between gap-1.5 border-b px-2 lg:px-4 py-1 text-[11px] overflow-x-auto custom-scrollbar ${
        isDark ? "border-white/10 bg-[#0d1424]" : "border-slate-300 bg-white shadow-xs"
      }`}>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold hidden sm:inline ${
            isDark ? "text-white/60" : "text-slate-600"
          }`}>
            Reto:
          </span>
          {MACHINE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 px-2.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? (isDark
                      ? 'bg-amber-500 text-black shadow-md ring-1 ring-amber-400 font-black'
                      : 'bg-amber-500 text-slate-950 shadow-xs font-black ring-1 ring-amber-600')
                  : (isDark
                      ? 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/15'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-xs font-semibold')
              }`}
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => loadPreset(presetIdx)}
          className={`h-7 px-2 rounded-md border text-[10px] font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all ${
            isDark
              ? "bg-white/5 hover:bg-white/10 text-white/80 border-white/15"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-xs font-semibold"
          }`}
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
        <section className={`border rounded-xl px-2 py-1.5 shrink-0 shadow-md ${
          isDark
            ? "bg-[#0b1326] border-white/15"
            : "bg-white border-slate-300 shadow-xs"
        }`}>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-1">
            <div className={`flex items-center gap-1 font-bold ${
              isDark ? "text-sky-300" : "text-sky-800"
            }`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-mono font-bold border ${
                isDark ? "bg-sky-500/20 text-sky-300 border-sky-400/30" : "bg-sky-100 text-sky-800 border-sky-300"
              }`}>
                1
              </span>
              <span>Viaje de Ida: ¿Cómo se armó?</span>
            </div>

            <button
              onClick={runForwardDemo}
              disabled={showForwardDemo}
              className={`px-2 py-0.5 rounded border text-[9px] sm:text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all ${
                isDark
                  ? "bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/40 text-sky-200"
                  : "bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800 shadow-xs"
              }`}
            >
              <Play size={9} className={showForwardDemo ? 'animate-spin' : ''} />
              <span>{showForwardDemo ? 'Viajando...' : 'Ver ida ▶'}</span>
            </button>
          </div>

          {/* Fila compacta de la máquina */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-0.5 custom-scrollbar">
            {/* Caja x */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg flex flex-col items-center justify-center font-mono font-black border transition-all shrink-0 ${
                solved
                  ? (isDark ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50' : 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400 shadow-xs')
                  : showForwardDemo
                  ? (isDark ? 'bg-sky-500/40 border-sky-300 text-white animate-pulse' : 'bg-sky-200 border-sky-400 text-sky-950 font-black animate-pulse')
                  : (isDark ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-sky-50 border-sky-400 text-sky-900 font-bold shadow-xs')
              }`}
            >
              <div className="flex items-center gap-0.5 text-xs sm:text-sm">
                {solved ? <Unlock size={10} className={isDark ? "text-emerald-400" : "text-emerald-600"} /> : <Lock size={10} className={isDark ? "text-sky-300" : "text-sky-700"} />}
                <span>x</span>
              </div>
              <span className={`text-[7px] font-bold ${isDark ? "text-sky-300/80" : "text-sky-700"}`}>
                {solved ? `=${currentValue}` : 'Inicio'}
              </span>
            </div>

            {/* Módulos de Operación de Ida */}
            {activeEq.steps.map((st, i) => {
              const isPastInReversal = currentStepIndex < i
              const isCurrentInReversal = currentStepIndex === i

              return (
                <div key={i} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <ArrowRight size={11} className={`shrink-0 ${isDark ? "text-white/40" : "text-slate-400"}`} />
                  <div
                    className={`px-2 py-1 rounded-lg border flex flex-col items-center justify-center min-w-[58px] sm:min-w-[72px] lg:min-w-[84px] transition-all ${
                      isPastInReversal
                        ? (isDark ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs')
                        : isCurrentInReversal
                        ? (isDark ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/60 shadow-md' : 'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-400 shadow-xs font-black')
                        : (isDark ? 'bg-slate-800/80 border-slate-700 text-white/90' : 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs')
                    }`}
                  >
                    <span className={`text-[7px] sm:text-[8px] uppercase font-black ${
                      isDark ? "text-white/50" : "text-slate-500"
                    }`}>
                      Paso {i + 1}
                    </span>
                    <span className="text-[11px] sm:text-xs lg:text-sm font-black font-mono">
                      {st.op} {st.val}
                    </span>
                    {isPastInReversal && (
                      <span className={`text-[7px] font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        ✓ Listo
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            <ArrowRight size={11} className={`shrink-0 ${isDark ? "text-white/40" : "text-slate-400"}`} />

            {/* Resultado Final al que llegó la máquina */}
            <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg border flex flex-col items-center justify-center font-mono font-black shrink-0 ${
              isDark
                ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-xs"
                : "bg-amber-50 border-amber-400 text-amber-900 shadow-xs"
            }`}>
              <span className="text-xs sm:text-sm lg:text-base font-black">{activeEq.finalValue}</span>
              <span className={`text-[7px] font-bold ${isDark ? "text-amber-300/80" : "text-amber-700"}`}>Salida</span>
            </div>
          </div>
        </section>

        {/* PISTA 2: EL REBOBINADOR (Desarmar en sentido contrario ⬅) */}
        <section className={`flex-1 min-h-0 border rounded-xl p-1.5 sm:p-2.5 lg:p-3 flex flex-col justify-between shadow-xl relative overflow-hidden ${
          isDark
            ? "bg-[#0c1529] border-amber-500/35"
            : "bg-white border-amber-300/80 shadow-sm"
        }`}>
          
          {/* Cabecera del rebobinador */}
          <div className={`flex items-center justify-between border-b pb-1 shrink-0 ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}>
            <div className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold ${
              isDark ? "text-amber-300" : "text-amber-900"
            }`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-mono font-bold border ${
                isDark ? "bg-amber-500/20 text-amber-300 border-amber-400/30" : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                2
              </span>
              <span>Viaje de Regreso: Desarmar la máquina</span>
              <Undo2 size={12} className={isDark ? "text-amber-400" : "text-amber-600"} />
            </div>

            <div className={`px-2 py-0.5 rounded border font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-sm ${
              isDark
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                : "bg-emerald-50 border-emerald-400 text-emerald-900"
            }`}>
              <span className={isDark ? "text-white/70" : "text-slate-600 font-semibold"}>Cápsula:</span>
              <span className={`font-black text-xs sm:text-sm ${isDark ? "text-white" : "text-emerald-700"}`}>{currentValue}</span>
            </div>
          </div>

          {/* Visualización de la cápsula retrocediendo de derecha a izquierda */}
          <div className="py-0.5 shrink-0">
            <div className={`rounded-lg p-1.5 border flex items-center justify-between gap-1 ${
              isDark ? "bg-[#060a14] border-white/15" : "bg-slate-100 border-slate-300 shadow-inner"
            }`}>
              
              {/* Meta: x liberada a la izquierda */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-mono font-black border text-xs sm:text-sm transition-all ${
                    solved
                      ? (isDark ? 'bg-emerald-500 border-emerald-300 text-white shadow-lg animate-bounce' : 'bg-emerald-600 border-emerald-500 text-white shadow-md animate-bounce font-black')
                      : (isDark ? 'bg-white/5 border-dashed border-white/30 text-white/50' : 'bg-slate-200 border-dashed border-slate-400 text-slate-500 font-bold')
                  }`}
                >
                  <span>x</span>
                </div>
                <span className={`text-[7px] font-bold ${isDark ? "text-white/50" : "text-slate-600"}`}>Meta: x</span>
              </div>

              {/* Cápsula flotante actual */}
              <div className="flex-1 flex items-center justify-center gap-1 px-1">
                <ArrowLeftIcon size={12} className={isDark ? "text-amber-300/80" : "text-amber-600"} />
                <div
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 font-mono font-bold text-xs shadow-md transition-all ${
                    isAnimating
                      ? (isDark ? 'bg-amber-400 text-black animate-pulse font-black' : 'bg-amber-400 text-slate-950 animate-pulse font-black shadow-md')
                      : solved
                      ? (isDark ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200' : 'bg-emerald-100 border-emerald-500 text-emerald-900 font-black shadow-xs')
                      : (isDark ? 'bg-amber-500/25 border-amber-400 text-amber-100 ring-1 ring-amber-400/50' : 'bg-amber-100 border-amber-500 text-amber-950 font-black ring-1 ring-amber-400 shadow-xs')
                  }`}
                >
                  <Sparkles size={11} className={isDark ? "text-amber-300" : "text-amber-600"} />
                  <span>Valor: <strong className={isDark ? "text-white font-black" : "text-slate-950 font-black"}>{currentValue}</strong></span>
                </div>
                <ArrowLeftIcon size={12} className={isDark ? "text-amber-300/80" : "text-amber-600"} />
              </div>

              {/* Salida inicial a la derecha */}
              <div className="flex flex-col items-center opacity-70">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center font-mono text-xs font-bold ${
                  isDark ? "bg-amber-500/15 border-amber-400/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-800"
                }`}>
                  {activeEq.finalValue}
                </div>
                <span className={`text-[7px] font-bold ${isDark ? "text-white/50" : "text-slate-600"}`}>Salida</span>
              </div>
            </div>
          </div>

          {/* Historial de pasos desarmados */}
          {history.length > 0 && (
            <div className="flex items-center justify-center gap-1 flex-wrap shrink-0 py-0.5">
              {history.map((h, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-mono text-[9px] sm:text-[10px] font-bold ${
                    isDark
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                      : "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs"
                  }`}
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
                  <div className={`text-[10px] sm:text-[11px] font-medium ${
                    isDark ? "text-white/80" : "text-slate-700"
                  }`}>
                    La máquina hizo al final:{' '}
                    <span className={`font-mono font-black px-1.5 py-0.5 rounded border ${
                      isDark ? "text-amber-300 bg-amber-400/20 border-amber-400/40" : "text-amber-950 bg-amber-100 border-amber-300 shadow-xs"
                    }`}>
                      {targetStep?.op} {targetStep?.val}
                    </span>
                  </div>
                  <div className={`text-[11px] sm:text-xs font-bold mt-0.5 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    ¿Qué operación <strong className={isDark ? "text-amber-400 font-black" : "text-amber-700 font-black"}>contraria</strong> le aplicamos a{' '}
                    <span className={`font-mono font-black ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{currentValue}</span>?
                  </div>
                </div>

                {/* 3 Botones SIEMPRE en grid-cols-3 horizontal */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full pt-0.5">
                  {getInverseOptions(targetStep).map((opt) => {
                    const styling = getOptionClasses(opt.kind)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleApplyInverse(opt)}
                        disabled={isAnimating}
                        className={`h-11 sm:h-12 lg:h-13 px-1 rounded-xl ${styling.btn} flex flex-col items-center justify-center active:scale-95 transition-all`}
                      >
                        <span className="text-[10px] sm:text-[11px] lg:text-xs font-black font-mono leading-tight text-center">
                          {opt.actionText}
                        </span>
                        <span className={`text-[8px] leading-tight mt-0.5 truncate ${styling.sub}`}>
                          {opt.id === 'minus' && 'Resta'}
                          {opt.id === 'plus' && 'Suma'}
                          {opt.id === 'div' && 'Divide'}
                          {opt.id === 'mult' && 'Multiplica'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* PANTALLA DE ÉXITO COMPACTA */
              <div className="flex flex-col items-center justify-center gap-1 text-center py-1">
                <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 shadow-lg ${
                  isDark
                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-100"
                    : "bg-emerald-100 border-emerald-500 text-emerald-950 font-black"
                }`}>
                  <Sparkles size={16} className={isDark ? "text-emerald-300" : "text-emerald-600"} />
                  <span className="text-xs sm:text-sm font-black font-mono">¡Caja Abierta! x = {currentValue}</span>
                </div>
                <p className={`text-[10px] sm:text-[11px] max-w-sm truncate font-medium ${
                  isDark ? "text-white/70" : "text-slate-600"
                }`}>
                  Comprobación: {activeEq.steps.map((s, i) => `${i === 0 ? currentValue : ''} ${s.op} ${s.val}`).join(' ')} = {activeEq.finalValue} ✓
                </p>
              </div>
            )}
          </div>

          {/* Micro-regla al pie */}
          <div className={`border-t pt-0.5 flex items-center justify-around text-[8px] sm:text-[9px] shrink-0 ${
            isDark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-600 font-semibold"
          }`}>
            <span>
              <strong className={isDark ? "text-sky-300 font-bold" : "text-sky-700 font-bold"}>Sumar ➕</strong> ⇄ <strong className={isDark ? "text-rose-300 font-bold" : "text-rose-700 font-bold"}>Restar ➖</strong>
            </span>
            <span>|</span>
            <span>
              <strong className={isDark ? "text-amber-300 font-bold" : "text-amber-700 font-bold"}>Multiplicar ✖</strong> ⇄ <strong className={isDark ? "text-emerald-300 font-bold" : "text-emerald-700 font-bold"}>Dividir ➗</strong>
            </span>
          </div>
        </section>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className={`h-10 lg:h-12 shrink-0 border-t px-2 sm:px-3 lg:px-4 flex items-center justify-between gap-2 ${
        isDark ? "border-white/10 bg-[#0a0f1d]" : "border-slate-300 bg-white shadow-xs"
      }`}>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {feedback.kind === 'error' ? (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold ${
              isDark ? "bg-rose-500/20 border-rose-400/40 text-rose-200" : "bg-rose-50 border-rose-400 text-rose-800 shadow-xs"
            }`}>
              <AlertCircle size={13} className={isDark ? "text-rose-400 shrink-0" : "text-rose-600 shrink-0"} />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : feedback.kind === 'success' ? (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold ${
              isDark ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200" : "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs"
            }`}>
              <CheckCircle2 size={13} className={isDark ? "text-emerald-400 shrink-0" : "text-emerald-600 shrink-0"} />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : (
            <div className={`text-[10px] sm:text-[11px] truncate max-w-full font-medium ${
              isDark ? "text-white/80" : "text-slate-700 font-semibold"
            }`}>
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
              className={`h-7 lg:h-8 px-2.5 rounded-lg border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/15 text-white/80 hover:text-white"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 shadow-xs font-semibold"
              }`}
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
        bgColor={isDark ? "#080c18" : "#ffffff"}
        maxWidth="max-w-md"
        buttonColor="bg-amber-500 text-black hover:bg-amber-400 font-bold"
      >
        <div key={helpId} className={`space-y-2.5 text-xs leading-relaxed pb-2 ${
          isDark ? "text-white/80" : "text-slate-700"
        }`}>
          <p>
            Imagina una <strong className={isDark ? "text-white" : "text-slate-900"}>máquina de fábrica</strong> que transforma una caja secreta con la incógnita <strong className={isDark ? "text-sky-300" : "text-sky-700 font-black"}>x</strong>:
          </p>

          <div className={`p-2.5 rounded-xl border space-y-1.5 ${
            isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 text-slate-800 shadow-xs"
          }`}>
            <div className={`font-bold ${isDark ? "text-amber-300" : "text-amber-800"}`}>1. En el viaje de ida (Construcción):</div>
            <p className={isDark ? "text-white/70" : "text-slate-600"}>
              La incógnita $x$ entra a la máquina y sufre transformaciones paso a paso hasta dar el resultado final.
            </p>
          </div>

          <div className={`p-2.5 rounded-xl border space-y-1.5 ${
            isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 text-slate-800 shadow-xs"
          }`}>
            <div className={`font-bold ${isDark ? "text-emerald-300" : "text-emerald-800"}`}>2. En el viaje de regreso (Rebobinar):</div>
            <p className={isDark ? "text-white/70" : "text-slate-600"}>
              Para descubrir el valor de $x$, tomamos el resultado final y <strong>hacemos el camino hacia atrás</strong> con las <strong>operaciones opuestas</strong>:
            </p>
            <ul className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[11px]">
              <li className={`p-1 rounded border font-bold ${
                isDark ? "bg-sky-500/10 border-sky-400/30 text-sky-200" : "bg-sky-50 border-sky-300 text-sky-800 shadow-xs"
              }`}>➕ Sumar ⇄ ➖ Restar</li>
              <li className={`p-1 rounded border font-bold ${
                isDark ? "bg-amber-500/10 border-amber-400/30 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900 shadow-xs"
              }`}>✖ Multiplicar ⇄ ➗ Dividir</li>
            </ul>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
