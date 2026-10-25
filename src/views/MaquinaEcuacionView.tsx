import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Wrench } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

interface StepOp {
  op: '+' | '-' | '×' | '÷'
  val: number
}

interface MachineEq {
  label: string
  xStart: number
  steps: StepOp[]
  finalValue: number
  title: string
}

const MACHINE_PRESETS: MachineEq[] = [
  {
    label: '3x + 4 = 19',
    xStart: 5,
    steps: [{ op: '×', val: 3 }, { op: '+', val: 4 }],
    finalValue: 19,
    title: 'Multiplicar por 3 y sumar 4 da 19'
  },
  {
    label: '2x - 5 = 11',
    xStart: 8,
    steps: [{ op: '×', val: 2 }, { op: '-', val: 5 }],
    finalValue: 11,
    title: 'Multiplicar por 2 y restar 5 da 11'
  },
  {
    label: 'x/2 + 6 = 10',
    xStart: 8,
    steps: [{ op: '÷', val: 2 }, { op: '+', val: 6 }],
    finalValue: 10,
    title: 'Dividir entre 2 y sumar 6 da 10'
  },
  {
    label: '4x - 8 = 20',
    xStart: 7,
    steps: [{ op: '×', val: 4 }, { op: '-', val: 8 }],
    finalValue: 20,
    title: 'Multiplicar por 4 y restar 8 da 20'
  },
  {
    label: '5x + 10 = 35',
    xStart: 5,
    steps: [{ op: '×', val: 5 }, { op: '+', val: 10 }],
    finalValue: 35,
    title: 'Multiplicar por 5 y sumar 10 da 35'
  }
]

export default function MaquinaEcuacionView() {
  const nav = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)

  const activeEq = MACHINE_PRESETS[presetIdx]

  // Estado del proceso de desarme (hacia atrás)
  // currentStepIndex indica qué paso de la cola de pasos estamos desarmando (empieza en steps.length - 1)
  const [currentStepIndex, setCurrentStepIndex] = useState(activeEq.steps.length - 1)
  const [runningValue, setRunningValue] = useState(activeEq.finalValue)
  const [solved, setSolved] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ kind: 'info' | 'error' | 'success'; msg: string }>({
    kind: 'info',
    msg: 'Observa la máquina hacia adelante y elige la operación inversa para desarmarla hacia atrás.'
  })

  const loadPreset = (idx: number) => {
    setPresetIdx(idx)
    const eq = MACHINE_PRESETS[idx]
    setCurrentStepIndex(eq.steps.length - 1)
    setRunningValue(eq.finalValue)
    setSolved(false)
    setHistory([])
    setFeedback({
      kind: 'info',
      msg: `Ecuación cargada: ${eq.label}. Desarma la última operación aplicada.`
    })
  }

  // Operación actual que se debe desarmar
  const targetStep = currentStepIndex >= 0 ? activeEq.steps[currentStepIndex] : null

  // Opciones de palancas inversas para el paso actual
  const getInverseOptions = (step: StepOp | null) => {
    if (!step) return []
    const val = step.val
    if (step.op === '+') {
      return [
        { op: '-', val, correct: true, label: `Restar ${val} (−${val})` },
        { op: '+', val, correct: false, label: `Sumar ${val} (+${val})` },
        { op: '÷', val, correct: false, label: `Dividir entre ${val}` },
      ]
    }
    if (step.op === '-') {
      return [
        { op: '+', val, correct: true, label: `Sumar ${val} (+${val})` },
        { op: '-', val, correct: false, label: `Restar ${val} (−${val})` },
        { op: '×', val, correct: false, label: `Multiplicar por ${val}` },
      ]
    }
    if (step.op === '×') {
      return [
        { op: '÷', val, correct: true, label: `Dividir entre ${val} (÷${val})` },
        { op: '×', val, correct: false, label: `Multiplicar por ${val} (×${val})` },
        { op: '-', val, correct: false, label: `Restar ${val}` },
      ]
    }
    // op === '÷'
    return [
      { op: '×', val, correct: true, label: `Multiplicar por ${val} (×${val})` },
      { op: '÷', val, correct: false, label: `Dividir entre ${val} (÷${val})` },
      { op: '+', val, correct: false, label: `Sumar ${val}` },
    ]
  }

  const handleApplyInverse = (choice: { op: string; val: number; correct: boolean; label: string }) => {
    if (solved || !targetStep) return

    if (!choice.correct) {
      setFeedback({
        kind: 'error',
        msg: `¡Incorrecto! La operación original fue "${targetStep.op}${targetStep.val}". Su inversa debe deshacerla.`
      })
      return
    }

    // Calcular nuevo valor
    let nextVal = runningValue
    if (choice.op === '+') nextVal = runningValue + choice.val
    else if (choice.op === '-') nextVal = runningValue - choice.val
    else if (choice.op === '×') nextVal = runningValue * choice.val
    else if (choice.op === '÷') nextVal = Math.round(runningValue / choice.val)

    const stepDesc = `${runningValue} ${choice.op} ${choice.val} = ${nextVal}`
    setHistory(prev => [...prev, stepDesc])
    setRunningValue(nextVal)

    if (currentStepIndex === 0) {
      // Liberó a x
      setSolved(true)
      setCurrentStepIndex(-1)
      setFeedback({
        kind: 'success',
        msg: `¡Cápsula de x liberada con éxito! x = ${nextVal}`
      })
    } else {
      setCurrentStepIndex(prev => prev - 1)
      setFeedback({
        kind: 'success',
        msg: `¡Bien hecho! ${stepDesc}. Ahora desarma el siguiente módulo.`
      })
    }
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
              Máquina de Ecuaciones
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Operaciones Inversas
            </span>
          </div>
        </div>

        {/* Ecuación objetivo */}
        <div className="font-mono text-xs lg:text-sm font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
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
          <span className="text-[10px] lg:text-[11px] text-white/40 font-semibold hidden sm:inline">Ecuación:</span>
          {MACHINE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => loadPreset(i)}
              className={`h-7 lg:h-8 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-[11px] lg:text-xs font-bold transition-all shrink-0 ${
                presetIdx === i
                  ? 'bg-amber-500 text-[#1a0e05] shadow-sm font-black'
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

      {/* ── 3. Área de Trabajo Central: Cinta y Desarme (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-between p-2 lg:p-4 gap-2 lg:gap-3 overflow-hidden" style={{ touchAction: 'none' }}>
        {/* Circuito Superior: Cómo se armó la ecuación (Hacia adelante) */}
        <div className="bg-[#0b1324]/80 border border-white/10 rounded-xl p-2 lg:p-3 shrink-0">
          <div className="flex items-center justify-between text-[10px] lg:text-xs text-white/40 font-semibold mb-1.5">
            <span>1. Construcción de la ecuación (Adelante):</span>
            <span className="text-amber-300 font-mono">{activeEq.title}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-3 lg:gap-4 overflow-x-auto py-1">
            {/* Inicio: x */}
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center font-mono font-black text-sm lg:text-base text-sky-200 shrink-0 shadow-lg">
              x
            </div>

            {/* Módulos de Operación */}
            {activeEq.steps.map((st, i) => {
              const isDisarmed = currentStepIndex < i
              return (
                <div key={i} className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
                  <div className="text-white/30 text-xs font-bold">→</div>
                  <div
                    className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isDisarmed
                        ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 opacity-60'
                        : i === currentStepIndex
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-lg animate-pulse'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <span className="text-[9px] text-white/40 font-mono">Paso {i + 1}</span>
                    <span className="text-xs lg:text-sm font-black font-mono">
                      {st.op} {st.val}
                    </span>
                    {isDisarmed && <span className="text-[8px] text-emerald-400 font-bold">✓ Desarmado</span>}
                  </div>
                </div>
              )
            })}

            <div className="text-white/30 text-xs font-bold">→</div>

            {/* Resultado Final */}
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-mono font-black text-sm lg:text-base text-amber-200 shrink-0 shadow-lg">
              {activeEq.finalValue}
            </div>
          </div>
        </div>

        {/* Zona Central: El Proceso de Desarme (Hacia atrás) */}
        <div className="flex-1 min-h-0 bg-[#0e172a] border border-amber-500/20 rounded-xl p-3 lg:p-4 flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-amber-400" />
              <span className="text-xs lg:text-sm font-bold text-white/90">2. Proceso de Desarme (Operación Inversa)</span>
            </div>
            <div className="text-xs lg:text-sm font-mono font-bold text-emerald-400">
              Valor actual: <strong className="text-white text-base lg:text-lg">{runningValue}</strong>
            </div>
          </div>

          {/* Historial de pasos desarmados */}
          <div className="flex items-center justify-center gap-2 flex-wrap py-1">
            {history.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono text-[11px] lg:text-xs font-bold">
                <CheckCircle2 size={12} />
                {h}
              </span>
            ))}
          </div>

          {/* Palancas de decisión interactiva */}
          {!solved ? (
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <span className="text-[11px] lg:text-xs text-white/60 font-semibold text-center">
                El último paso fue <strong className="text-amber-300 font-mono font-bold">{targetStep?.op}{targetStep?.val}</strong>. ¿Qué operación inversa aplicas a <strong className="text-white">{runningValue}</strong>?
              </span>

              <div className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 flex-wrap">
                {getInverseOptions(targetStep).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyInverse(opt)}
                    className="h-9 lg:h-11 px-3 sm:px-4 lg:px-5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-mono font-bold text-xs lg:text-sm active:scale-95 transition-all shadow-md flex items-center gap-2"
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 animate-bounce">
              <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 font-bold text-base lg:text-lg flex items-center gap-2 shadow-2xl">
                <Sparkles size={20} className="text-emerald-300" />
                <span>¡Cápsula Liberada! x = {runningValue}</span>
              </div>
            </div>
          )}

          <div className="text-center text-[10px] text-white/30 pt-1">
            Regla: Lo que sumó se resta, lo que multiplicó se divide. Se opera en orden inverso.
          </div>
        </div>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {feedback.kind === 'error' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-[10px] sm:text-[11px] lg:text-xs font-semibold">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : feedback.kind === 'success' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] sm:text-[11px] lg:text-xs font-semibold">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span className="truncate">{feedback.msg}</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/70 truncate max-w-full font-medium">
              {feedback.msg}
            </div>
          )}
        </div>

        {solved && (
          <button
            onClick={() => loadPreset((presetIdx + 1) % MACHINE_PRESETS.length)}
            className="h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1a0e05] font-black text-[11px] lg:text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
          >
            <span>Siguiente Reto →</span>
          </button>
        )}
      </footer>

      {/* ── Modal de Ayuda ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo funciona la Máquina de Ecuaciones?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-amber-500 text-black hover:bg-amber-400"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Camino de ida (Construcción)</strong>: En la fila superior ves cómo $x$ fue multiplicado o dividido y luego sumado o restado hasta llegar al valor final.
          </li>
          <li>
            <strong className="text-white">Camino de regreso (Desarme)</strong>: Para encontrar $x$, empezamos desde el valor final y aplicamos las operaciones en sentido contrario.
          </li>
          <li>
            <strong className="text-white">Operaciones Inversas</strong>:
            <ul className="list-disc list-inside pl-4 text-white/70 space-y-0.5 mt-1">
              <li>El opuesto de sumar es <strong className="text-sky-300">restar</strong>.</li>
              <li>El opuesto de restar es <strong className="text-sky-300">sumar</strong>.</li>
              <li>El opuesto de multiplicar es <strong className="text-emerald-300">dividir</strong>.</li>
              <li>El opuesto de dividir es <strong className="text-emerald-300">multiplicar</strong>.</li>
            </ul>
          </li>
          <li>
            Presiona la palanca inversa correcta en cada paso hasta liberar a $x$.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
