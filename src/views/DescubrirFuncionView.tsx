import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Check,
  ChevronRight,
  Layers,
  LineChart,
  ArrowRight,
  Target
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

// ── Tipos y Modelos ──────────────────────────────────────────────────────────

export interface MachineStepData {
  x: number
  expectedY: number
  isPlaced: boolean
}

export interface Mission {
  id: number
  title: string
  subtitle: string
  ruleFormula: string
  ruleInWords: string
  isLineal: boolean
  interceptB: number
  slopeM: number
  initialSteps: MachineStepData[]
  ruleOptionsInWords: { text: string; isCorrect: boolean; feedback: string }[]
  ruleOptionsFormula: { text: string; isCorrect: boolean; feedback: string }[]
  challengeX: number
  expectedChallengeY: number
}

const MISSIONS: Mission[] = [
  {
    id: 1,
    title: 'Misión 1: La Máquina Misteriosa (Ficha)',
    subtitle: 'Entradas 1, 2, 3, 4',
    ruleFormula: 'y = 2x - 1',
    ruleInWords: 'Multiplicar la entrada por 2 y restar 1',
    isLineal: false,
    interceptB: -1,
    slopeM: 2,
    initialSteps: [
      { x: 1, expectedY: 1, isPlaced: false },
      { x: 2, expectedY: 3, isPlaced: false },
      { x: 3, expectedY: 5, isPlaced: false },
      { x: 4, expectedY: 7, isPlaced: false }
    ],
    ruleOptionsInWords: [
      {
        text: 'Multiplicar por 2 y restar 1 (el doble menos uno)',
        isCorrect: true,
        feedback: '¡Correcto! 2·1 - 1 = 1; 2·2 - 1 = 3; 2·3 - 1 = 5; 2·4 - 1 = 7.'
      },
      {
        text: 'Multiplicar por 2 directamente',
        isCorrect: false,
        feedback: 'Si solo multiplicaras por 2, para entrada 1 daría 2 (no 1). Le falta restar 1.'
      },
      {
        text: 'Sumar 2 al número anterior',
        isCorrect: false,
        feedback: 'Aunque las salidas aumentan de 2 en 2, la regla debe transformar la entrada x directamente en y.'
      }
    ],
    ruleOptionsFormula: [
      {
        text: 'y = 2x - 1',
        isCorrect: true,
        feedback: '¡Excelente! Ésta es la ecuación matemática de una función afín.'
      },
      {
        text: 'y = 2x',
        isCorrect: false,
        feedback: 'y = 2x pasaría por (0,0), pero esta máquina da 1 para entrada 1.'
      },
      {
        text: 'y = x + 2',
        isCorrect: false,
        feedback: 'Si x=3, 3+2=5, pero si x=4, 4+2=6 (y la máquina da 7).'
      }
    ],
    challengeX: 5,
    expectedChallengeY: 9
  },
  {
    id: 2,
    title: 'Misión 2: La Máquina que Duplica',
    subtitle: 'Proporcionalidad directa y origen (0,0)',
    ruleFormula: 'y = 2x',
    ruleInWords: 'Multiplicar la entrada por 2',
    isLineal: true,
    interceptB: 0,
    slopeM: 2,
    initialSteps: [
      { x: 0, expectedY: 0, isPlaced: false },
      { x: 1, expectedY: 2, isPlaced: false },
      { x: 2, expectedY: 4, isPlaced: false },
      { x: 3, expectedY: 6, isPlaced: false }
    ],
    ruleOptionsInWords: [
      {
        text: 'Multiplicar por 2 (el doble exacto)',
        isCorrect: true,
        feedback: '¡Exacto! Pasa por el origen (0,0) porque 2 · 0 = 0.'
      },
      {
        text: 'Sumar 2 a la entrada',
        isCorrect: false,
        feedback: 'Si x=0 daría 2, pero la máquina da 0.'
      },
      {
        text: 'Multiplicar por 3 y restar 1',
        isCorrect: false,
        feedback: 'Para x=1 daría 2, pero para x=2 daría 5 (la máquina da 4).'
      }
    ],
    ruleOptionsFormula: [
      {
        text: 'y = 2x',
        isCorrect: true,
        feedback: '¡Brillante! Es una Función Lineal pura (pasa por (0,0) y b = 0).'
      },
      {
        text: 'y = 2x + 1',
        isCorrect: false,
        feedback: 'No tiene término independiente sumado porque cuando x=0, y=0.'
      },
      {
        text: 'y = x²',
        isCorrect: false,
        feedback: 'Para x=3 daría 9, pero la máquina da 6.'
      }
    ],
    challengeX: 4,
    expectedChallengeY: 8
  },
  {
    id: 3,
    title: 'Misión 3: La Máquina que Suma',
    subtitle: 'Pendiente 1 con corte b = 3',
    ruleFormula: 'y = x + 3',
    ruleInWords: 'Sumar 3 a cada número de entrada',
    isLineal: false,
    interceptB: 3,
    slopeM: 1,
    initialSteps: [
      { x: 0, expectedY: 3, isPlaced: false },
      { x: 1, expectedY: 4, isPlaced: false },
      { x: 2, expectedY: 5, isPlaced: false },
      { x: 3, expectedY: 6, isPlaced: false }
    ],
    ruleOptionsInWords: [
      {
        text: 'Sumar 3 a la entrada x',
        isCorrect: true,
        feedback: '¡Correcto! 0+3=3, 1+3=4, 2+3=5, 3+3=6.'
      },
      {
        text: 'Multiplicar por 3',
        isCorrect: false,
        feedback: '0 · 3 = 0, pero la máquina produce 3.'
      },
      {
        text: 'Multiplicar por 2 y sumar 1',
        isCorrect: false,
        feedback: 'Para x=0 daría 1, pero la salida es 3.'
      }
    ],
    ruleOptionsFormula: [
      {
        text: 'y = x + 3',
        isCorrect: true,
        feedback: '¡Excelente! Función afín con pendiente m=1 e intercepto b=3.'
      },
      {
        text: 'y = 3x',
        isCorrect: false,
        feedback: 'Si x=2, 3·2 = 6, pero si x=1, 3·1 = 3 (la máquina da 4).'
      },
      {
        text: 'y = 2x + 1',
        isCorrect: false,
        feedback: 'No concuerda con las salidas observadas.'
      }
    ],
    challengeX: 4,
    expectedChallengeY: 7
  }
]

// ── Geometría y Configuración del Plano Cartesiano ────────────────────────────
// -2 a 10 en X e Y (Exacto al plano de la ficha escolar)
const SVG_SIZE = 460
const MIN_X = -2
const MAX_X = 10
const MIN_Y = -2
const MAX_Y = 10

const PAD_LEFT = 36
const PAD_RIGHT = 18
const PAD_TOP = 18
const PAD_BOTTOM = 30

const PLOT_W = SVG_SIZE - PAD_LEFT - PAD_RIGHT // 406
const PLOT_H = SVG_SIZE - PAD_TOP - PAD_BOTTOM // 412

const toSvgX = (x: number) => PAD_LEFT + ((x - MIN_X) / (MAX_X - MIN_X)) * PLOT_W
const toSvgY = (y: number) => PAD_TOP + ((MAX_Y - y) / (MAX_Y - MIN_Y)) * PLOT_H

const fromSvgCoords = (svgX: number, svgY: number) => {
  const normX = (svgX - PAD_LEFT) / PLOT_W
  const normY = (svgY - PAD_TOP) / PLOT_H
  const mathX = MIN_X + normX * (MAX_X - MIN_X)
  const mathY = MAX_Y - normY * (MAX_Y - MIN_Y)
  return {
    rawX: mathX,
    rawY: mathY,
    x: Math.round(mathX),
    y: Math.round(mathY)
  }
}

export default function DescubrirFuncionView() {
  const navigate = useNavigate()

  // Estado de misión activa
  const [missionIdx, setMissionIdx] = useState(0)
  const currentMission = MISSIONS[missionIdx]

  // Pestañas principales de aprendizaje:
  // 'machine': ⚙️ 1. Máquina y Tabla
  // 'plane':   📈 2. Plano Cartesiano
  // 'rules':   💡 3. Adivina la Regla
  const [activeTab, setActiveTab] = useState<'machine' | 'plane' | 'rules'>('machine')

  // Estado de la máquina y tabla
  const [steps, setSteps] = useState<MachineStepData[]>(currentMission.initialSteps)
  const [activeMachineInput, setActiveMachineInput] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [revealedTableCount, setRevealedTableCount] = useState<number>(0)

  // Estado del plano cartesiano interactivo
  const [targetPointIndex, setTargetPointIndex] = useState<number>(0)
  const [planeFeedback, setPlaneFeedback] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Estado de deducción de regla
  const [wordsAnswerIdx, setWordsAnswerIdx] = useState<number | null>(null)
  const [formulaAnswerIdx, setFormulaAnswerIdx] = useState<number | null>(null)
  const [isRuleConfirmed, setIsRuleConfirmed] = useState(false)

  // Reto de predicción
  const [challengeUserGuess, setChallengeUserGuess] = useState<number>(0)
  const [challengeResolved, setChallengeResolved] = useState(false)

  // Modal de ayuda
  const [showHelp, setShowHelp] = useState(false)

  // Cambiar o reiniciar misión
  const loadMission = (idx: number) => {
    setMissionIdx(idx)
    const m = MISSIONS[idx]
    setSteps(m.initialSteps.map(s => ({ ...s, isPlaced: false })))
    setActiveMachineInput(null)
    setIsProcessing(false)
    setRevealedTableCount(0)
    setTargetPointIndex(0)
    setPlaneFeedback(null)
    setWordsAnswerIdx(null)
    setFormulaAnswerIdx(null)
    setIsRuleConfirmed(false)
    setChallengeUserGuess(0)
    setChallengeResolved(false)
    setActiveTab('machine')
  }

  // Activar la animación de la máquina y revelar en la tabla
  const handleRunMachine = (inputX: number) => {
    if (isProcessing) return
    setActiveMachineInput(inputX)
    setIsProcessing(true)

    setTimeout(() => {
      setIsProcessing(false)
      const stepIdx = steps.findIndex(s => s.x === inputX)
      if (stepIdx !== -1) {
        setRevealedTableCount(prev => Math.max(prev, stepIdx + 1))
      }
    }, 450)
  }

  // Pasar al paso 2: Adivinar la regla
  const handleGoToRules = () => {
    setRevealedTableCount(steps.length)
    setActiveTab('rules')
  }

  // Clic táctil en el plano cartesiano interactivo
  const handlePlaneClick = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.clientX
    const clientY = e.clientY

    const scaleX = SVG_SIZE / rect.width
    const scaleY = SVG_SIZE / rect.height
    const svgX = (clientX - rect.left) * scaleX
    const svgY = (clientY - rect.top) * scaleY

    const clicked = fromSvgCoords(svgX, svgY)

    // Snap a la intersección entera más cercana
    const px = toSvgX(clicked.x)
    const py = toSvgY(clicked.y)
    const dist = Math.hypot(svgX - px, svgY - py)

    if (dist > 34) return // Toque fuera del radio de tolerancia

    // Verificar si coincide con el punto objetivo que falta ubicar
    const currentTarget = targetPointIndex < steps.length ? steps[targetPointIndex] : null

    if (!currentTarget) {
      setPlaneFeedback(`Tocaste (${clicked.x}; ${clicked.y}). ¡Los 4 puntos ya están ubicados!`)
      return
    }

    if (clicked.x === currentTarget.x && clicked.y === currentTarget.expectedY) {
      // Punto correcto
      setSteps(prev =>
        prev.map((s, idx) => (idx === targetPointIndex ? { ...s, isPlaced: true } : s))
      )
      const nextIdx = targetPointIndex + 1
      setTargetPointIndex(nextIdx)

      if (nextIdx < steps.length) {
        setPlaneFeedback(
          `¡Bien! Ahora ubica: (${steps[nextIdx].x}; ${steps[nextIdx].expectedY})`
        )
      } else {
        setPlaneFeedback('¡Excelente! Ubicaste los 4 puntos. ¡Pasan por una línea recta!')
      }
    } else {
      // Retroalimentación pedagógica orientadora
      setPlaneFeedback(
        `Tocaste (${clicked.x}; ${clicked.y}). Para (${currentTarget.x}; ${currentTarget.expectedY}): avanza a x = ${currentTarget.x} y sube a y = ${currentTarget.expectedY}.`
      )
    }
  }

  // Ubicar todos los puntos automáticamente con guía
  const handleAutoPlaceAll = () => {
    setSteps(prev => prev.map(s => ({ ...s, isPlaced: true })))
    setTargetPointIndex(steps.length)
    setPlaneFeedback('Puntos ubicados en el plano. Observa la alineación recta.')
  }

  // Validar deducción de regla
  const handleConfirmRule = () => {
    if (wordsAnswerIdx === null || formulaAnswerIdx === null) return
    const wOk = currentMission.ruleOptionsInWords[wordsAnswerIdx].isCorrect
    const fOk = currentMission.ruleOptionsFormula[formulaAnswerIdx].isCorrect

    if (wOk && fOk) {
      setIsRuleConfirmed(true)
    }
  }

  // Resolver reto final
  const handleCheckChallenge = () => {
    if (challengeUserGuess === currentMission.expectedChallengeY) {
      setChallengeResolved(true)
    }
  }

  // Puntos ya colocados en el plano
  const placedPoints = useMemo(() => {
    return steps.filter(s => s.isPlaced)
  }, [steps])

  // Coordenadas extremas de la recta para dibujarla cuando la regla esté confirmada
  const linePoints = useMemo(() => {
    if (!isRuleConfirmed) return null
    const x1 = -2
    const y1 = currentMission.slopeM * x1 + currentMission.interceptB
    const x2 = 10
    const y2 = currentMission.slopeM * x2 + currentMission.interceptB
    return {
      x1: toSvgX(x1),
      y1: toSvgY(y1),
      x2: toSvgX(x2),
      y2: toSvgY(y2)
    }
  }, [isRuleConfirmed, currentMission])

  // Punto objetivo actual
  const currentTargetPoint = targetPointIndex < steps.length ? steps[targetPointIndex] : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. HEADER COMPACTO (34-38px)
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400">
              <Layers className="h-3 w-3" />
            </span>
            <h1 className="text-[12px] sm:text-[13px] font-bold text-white tracking-wide truncate">
              Máquina de Funciones (Descubre y Grafica)
            </h1>
          </div>
        </div>

        {/* Selector de Misión compacto con botón Misión Siguiente */}
        <div className="flex items-center gap-1 bg-black/40 px-1 py-0.5 rounded-md border border-white/10">
          {MISSIONS.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => loadMission(idx)}
              className={`h-5 sm:h-6 px-1.5 sm:px-2 rounded text-[10px] font-bold transition-all ${
                idx === missionIdx
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              M{m.id}
            </button>
          ))}
          <div className="w-px h-3.5 bg-white/20 mx-0.5" />
          <button
            onClick={() => loadMission((missionIdx + 1) % MISSIONS.length)}
            className="h-5 sm:h-6 px-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm"
            title="Pasar a la siguiente misión"
          >
            <span>Misión Siguiente</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => loadMission(missionIdx)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Reiniciar misión"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Ayuda pedagógica"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. SUBHEADER: 3 PESTAÑAS DEL FLUJO (34-36px)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between border-b border-white/5 bg-[#0d1424] px-2 sm:px-4 py-1 text-[11px] lg:text-xs">
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto gap-1">
          {/* Pestañas de Navegación del Flujo de Aprendizaje: 1. Fábrica -> 2. Adivina la Regla -> 3. Plano Cartesiano */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveTab('machine')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                activeTab === 'machine'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <span>⚙️ 1. Fábrica y Tabla</span>
              {revealedTableCount >= 4 && <Check className="h-3 w-3" />}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <span>💡 2. Adivina la Regla</span>
              {isRuleConfirmed && <Sparkles className="h-3 w-3 text-yellow-300" />}
            </button>

            <button
              onClick={() => setActiveTab('plane')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                activeTab === 'plane'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <span>📈 3. Plano Cartesiano</span>
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-black/40">
                {placedPoints.length}/4
              </span>
            </button>
          </div>

          {/* Indicador de regla activa */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono">
            {isRuleConfirmed ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                <Sparkles className="h-2.5 w-2.5" />
                {currentMission.ruleFormula}
              </span>
            ) : (
              <span className="text-white/40">
                Regla: [Descubriendo...]
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ÁREA DE TRABAJO PRINCIPAL (flex-1 min-h-0)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden">
        <div className="w-full max-w-4xl h-full flex flex-col justify-between overflow-hidden">

          {/* =========================================================================
              PESTAÑA 1: MÁQUINA Y TABLA DE ENTRADA/SALIDA COMPACTAS
          ========================================================================= */}
          {activeTab === 'machine' && (
            <div className="flex-1 flex flex-col justify-between bg-[#0a1020] rounded-xl border border-white/10 p-2 sm:p-3 shadow-md overflow-hidden">
              <div>
                {/* Cabecera de la ficha */}
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-300">
                    <Layers className="h-4 w-4" />
                    <span>La Fábrica de Funciones y la Tabla de Entrada y Salida</span>
                  </div>
                  <span className="text-[10px] text-white/60">
                    Toca cada máquina para procesar su número
                  </span>
                </div>

                {/* LAS 4 MÁQUINAS COMPACTAS */}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {steps.map((st, i) => {
                    const isCurrent = activeMachineInput === st.x
                    const isRevealed = revealedTableCount > i
                    return (
                      <button
                        key={st.x}
                        onClick={() => handleRunMachine(st.x)}
                        disabled={isProcessing}
                        className={`p-1 rounded-lg border flex flex-col items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-950/40 border-amber-400 shadow-sm'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {/* Embudo de entrada x */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] sm:text-xs font-bold text-cyan-300 font-mono">
                            {st.x}
                          </span>
                          <div className="w-3.5 h-1 bg-cyan-600 rounded-b-sm" />
                        </div>

                        {/* Cuerpo de la máquina metálica */}
                        <div className="my-1 w-full bg-slate-800 rounded p-1 flex items-center justify-center gap-1 border border-slate-700">
                          <span
                            className={`text-[9px] text-slate-300 ${
                              isProcessing && isCurrent ? 'animate-spin' : ''
                            }`}
                          >
                            ⚙
                          </span>
                          <span className="text-[8px] font-mono text-white/50 hidden sm:inline">
                            M{i + 1}
                          </span>
                        </div>

                        {/* Boca de salida y */}
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-0.5 bg-emerald-600 rounded-t-sm" />
                          <span className="text-[11px] sm:text-xs font-mono font-black text-emerald-300">
                            {isRevealed ? st.expectedY : '?'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* EL DOBLE CUADRO DE ENTRADA Y SALIDA */}
                <div className="bg-black/30 rounded-lg p-1.5 sm:p-2 border border-white/10">
                  <span className="text-[10px] sm:text-xs font-bold text-white/70 block mb-1">
                    Completa la tabla con los números de entrada y salida:
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono border-collapse">
                      <tbody>
                        <tr className="border-b border-white/10">
                          <td className="p-1 text-left text-[10px] sm:text-xs font-sans font-bold text-cyan-300 bg-white/5 rounded-l">
                            Número de entrada
                          </td>
                          {steps.map(s => (
                            <td key={`x-${s.x}`} className="p-1 font-bold text-cyan-200 bg-cyan-950/20">
                              {s.x}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-white/10">
                          <td className="p-1 text-left text-[10px] sm:text-xs font-sans font-bold text-emerald-300 bg-white/5 rounded-l">
                            Número de salida
                          </td>
                          {steps.map((s, idx) => (
                            <td key={`y-${s.x}`} className="p-1 font-black text-emerald-300 bg-emerald-950/20">
                              {revealedTableCount > idx ? s.expectedY : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-1 text-left text-[10px] sm:text-xs font-sans font-bold text-white/50 bg-white/5 rounded-l">
                            Pares ordenados (x; y)
                          </td>
                          {steps.map((s, idx) => (
                            <td key={`pt-${s.x}`} className="p-1 text-[11px] sm:text-xs text-white/80">
                              {revealedTableCount > idx ? (
                                <span
                                  className={
                                    s.isPlaced ? 'text-emerald-400 font-bold' : 'text-amber-300 underline'
                                  }
                                >
                                  ({s.x}; {s.expectedY})
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Botón de acción al pie de la tabla */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => setRevealedTableCount(steps.length)}
                  className="text-[10px] sm:text-xs text-white/50 hover:text-white underline"
                >
                  Revelar todas las salidas
                </button>

                <button
                  onClick={handleGoToRules}
                  className="h-7 sm:h-8 px-3 sm:px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1 shadow"
                >
                  <span>Paso 2: Adivinar la Regla</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 2: ADIVINAR LA REGLA DE FORMACIÓN (EN PALABRAS Y FÓRMULA)
          ========================================================================= */}
          {activeTab === 'rules' && (
            <div className="flex-1 flex flex-col justify-between bg-[#0a1020] rounded-xl border border-white/10 p-2 sm:p-3 shadow-md overflow-hidden">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  Adivina la Regla de Formación (Función)
                </span>
                <button
                  onClick={() => setActiveTab('plane')}
                  className="h-6 px-2 rounded bg-white/10 hover:bg-white/15 text-white/80 text-[10px] sm:text-xs flex items-center gap-1"
                >
                  <span>Ver Plano Cartesiano</span>
                  <LineChart className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-1.5 pr-1">
                {/* Pregunta 1: En palabras */}
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs text-white/95 font-semibold">
                    1. En palabras: ¿cómo obtienes la salida a partir de la entrada?
                  </p>
                  <div className="space-y-1">
                    {currentMission.ruleOptionsInWords.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setWordsAnswerIdx(i)}
                        className={`w-full text-left text-[10px] sm:text-[11px] p-1.5 rounded-md border transition-all ${
                          wordsAnswerIdx === i
                            ? opt.isCorrect
                              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-rose-950/70 border-rose-400 text-rose-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/85'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pregunta 2: En fórmula */}
                {wordsAnswerIdx !== null && (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <p className="text-[11px] sm:text-xs text-white/95 font-semibold">
                      2. Si "x" es la entrada e "y" la salida, ¿qué ecuación las conecta?
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {currentMission.ruleOptionsFormula.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setFormulaAnswerIdx(i)}
                          className={`text-center font-mono text-xs sm:text-sm p-1.5 rounded-md border transition-all ${
                            formulaAnswerIdx === i
                              ? opt.isCorrect
                                ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 font-bold'
                                : 'bg-rose-950/70 border-rose-400 text-rose-200'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/85'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón de Confirmación */}
                {!isRuleConfirmed && wordsAnswerIdx !== null && formulaAnswerIdx !== null && (
                  <button
                    onClick={handleConfirmRule}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow"
                  >
                    Comprobar Regla de Formación
                  </button>
                )}

                {/* Reto de Comprobación Final */}
                {isRuleConfirmed && (
                  <div className="p-1.5 sm:p-2 rounded-lg bg-black/40 border border-emerald-500/40 space-y-1">
                    <span className="font-bold text-emerald-300 text-[10px] sm:text-xs block">
                      Reto de Predicción: ¿Qué salida produciría si entra x = {currentMission.challengeX}?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs text-white/70">Calcula y:</span>
                      <input
                        type="number"
                        value={challengeUserGuess}
                        onChange={e => setChallengeUserGuess(parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-900 border border-white/20 rounded p-1 font-mono text-center text-xs font-bold"
                      />
                      <button
                        onClick={handleCheckChallenge}
                        className="h-6 px-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] sm:text-xs"
                      >
                        Verificar
                      </button>
                    </div>
                    {challengeResolved && (
                      <div className="text-[10px] sm:text-xs text-emerald-300 font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        ¡Excelente! {currentMission.slopeM} · {currentMission.challengeX} - 1 ={' '}
                        {currentMission.expectedChallengeY}. ¡Has dominado la regla!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pie del panel con botón para avanzar al Plano Cartesiano */}
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('machine')}
                  className="text-[10px] sm:text-xs text-white/60 hover:text-white"
                >
                  ← Volver a Fábrica
                </button>
                <button
                  onClick={() => setActiveTab('plane')}
                  className="h-7 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] flex items-center gap-1 shadow"
                >
                  <span>Paso 3: Trazar en el Plano</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 3: PLANO CARTESIANO OPTIMIZADO (AL LADO DERECHO EN HORIZONTAL)
          ========================================================================= */}
          {activeTab === 'plane' && (
            <div className="flex-1 flex flex-col landscape:flex-row lg:flex-row gap-1.5 sm:gap-2 bg-[#0a1020] rounded-xl border border-white/10 p-1.5 sm:p-2 shadow-md overflow-hidden">

              {/* PANEL LATERAL DE COORDENADAS E INSTRUCCIÓN (A la izquierda en horizontal) */}
              <aside className="w-full landscape:w-[210px] lg:w-[230px] shrink-0 flex flex-col justify-between bg-black/40 rounded-lg p-2 border border-white/10 overflow-hidden">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1">
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      Pares Ordenados (x; y):
                    </span>
                    {placedPoints.length < steps.length && (
                      <button
                        onClick={handleAutoPlaceAll}
                        className="h-5 px-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-[10px]"
                      >
                        Auto-ubicar
                      </button>
                    )}
                  </div>

                  {/* Chips de coordenadas 2x2 */}
                  <div className="grid grid-cols-2 gap-1">
                    {steps.map((st, i) => {
                      const isDone = st.isPlaced
                      const isCurrent = i === targetPointIndex && !isDone
                      return (
                        <div
                          key={`chip-${st.x}`}
                          className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-mono font-bold border transition-all ${
                            isDone
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                              : isCurrent
                              ? 'bg-amber-500 text-black border-amber-400 shadow-sm animate-pulse'
                              : 'bg-white/5 text-white/50 border-white/10'
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <Target className="h-2.5 w-2.5 text-black shrink-0" />
                          ) : (
                            <span className="text-[8px] text-white/30">•</span>
                          )}
                          <span>({st.x}; {st.expectedY})</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Instrucción o feedback pedagógico activo */}
                  <div className="p-1.5 rounded bg-amber-950/50 border border-amber-500/30 text-amber-200 text-[10px] sm:text-[11px] leading-tight">
                    {planeFeedback || (currentTargetPoint ? (
                      <>Toca la cuadrícula para ubicar: <strong className="text-white font-mono">({currentTargetPoint.x}; {currentTargetPoint.expectedY})</strong></>
                    ) : (
                      '¡Puntos ubicados! Observa que forman una recta.'
                    ))}
                  </div>
                </div>

                {/* Acciones al pie del panel lateral */}
                <div className="mt-1.5 space-y-1">
                  {placedPoints.length >= steps.length && (
                    <button
                      onClick={() => loadMission((missionIdx + 1) % MISSIONS.length)}
                      className="w-full h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow"
                    >
                      <span>Misión Siguiente</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('rules')}
                    className="w-full h-6 rounded-md bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-[10px] flex items-center justify-center gap-1"
                  >
                    <span>← Paso 2: Adivinar Regla</span>
                  </button>
                </div>
              </aside>

              {/* PLANO CARTESIANO: AL LADO DERECHO OCUPANDO TODO EL ESPACIO POSIBLE */}
              <div className="flex-1 min-w-0 h-full flex items-center justify-center bg-[#070c18] rounded-lg border border-white/5 p-1 relative overflow-hidden">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                  onClick={handlePlaneClick}
                  className="w-full h-full max-h-full max-w-full select-none cursor-crosshair"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ touchAction: 'none' }}
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
                    </marker>
                  </defs>

                  {/* Fondo del plano */}
                  <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="#070c18" rx="6" />

                  {/* Cuadrícula (de -2 a 10 en X e Y) */}
                  {Array.from({ length: MAX_X - MIN_X + 1 }, (_, i) => i + MIN_X).map(gx => {
                    const px = toSvgX(gx)
                    return (
                      <line
                        key={`gx-${gx}`}
                        x1={px}
                        y1={PAD_TOP}
                        x2={px}
                        y2={SVG_SIZE - PAD_BOTTOM}
                        stroke="#94a3b8"
                        strokeWidth={gx === 0 ? 0 : 0.6}
                        opacity={0.18}
                      />
                    )
                  })}

                  {Array.from({ length: MAX_Y - MIN_Y + 1 }, (_, i) => i + MIN_Y).map(gy => {
                    const py = toSvgY(gy)
                    return (
                      <line
                        key={`gy-${gy}`}
                        x1={PAD_LEFT}
                        y1={py}
                        x2={SVG_SIZE - PAD_RIGHT}
                        y2={py}
                        stroke="#94a3b8"
                        strokeWidth={gy === 0 ? 0 : 0.6}
                        opacity={0.18}
                      />
                    )
                  })}

                  {/* Eje X principal (y = 0) */}
                  <line
                    x1={PAD_LEFT - 8}
                    y1={toSvgY(0)}
                    x2={SVG_SIZE - PAD_RIGHT + 10}
                    y2={toSvgY(0)}
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    markerEnd="url(#arrow)"
                  />

                  {/* Eje Y principal (x = 0) */}
                  <line
                    x1={toSvgX(0)}
                    y1={SVG_SIZE - PAD_BOTTOM + 8}
                    x2={toSvgX(0)}
                    y2={PAD_TOP - 10}
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    markerEnd="url(#arrow)"
                  />

                  {/* Guía visual interactiva de la coordenada actual a colocar */}
                  {currentTargetPoint && (
                    <g opacity={0.35}>
                      <line
                        x1={toSvgX(currentTargetPoint.x)}
                        y1={PAD_TOP}
                        x2={toSvgX(currentTargetPoint.x)}
                        y2={SVG_SIZE - PAD_BOTTOM}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                      <line
                        x1={PAD_LEFT}
                        y1={toSvgY(currentTargetPoint.expectedY)}
                        x2={SVG_SIZE - PAD_RIGHT}
                        y2={toSvgY(currentTargetPoint.expectedY)}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={toSvgX(currentTargetPoint.x)}
                        cy={toSvgY(currentTargetPoint.expectedY)}
                        r={14}
                        fill="rgba(245, 158, 11, 0.15)"
                        stroke="#f59e0b"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                      />
                    </g>
                  )}

                  {/* Etiquetas y Ticks del Eje X (-2 a 10) */}
                  {[-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(vx => (
                    <g key={`tx-${vx}`} className="text-[9px] font-mono select-none" fill="#94a3b8">
                      <line
                        x1={toSvgX(vx)}
                        y1={toSvgY(0) - 3}
                        x2={toSvgX(vx)}
                        y2={toSvgY(0) + 3}
                        stroke="#94a3b8"
                        strokeWidth={1}
                      />
                      <text
                        x={toSvgX(vx)}
                        y={toSvgY(0) + 12}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {vx}
                      </text>
                    </g>
                  ))}

                  {/* Etiquetas y Ticks del Eje Y (-2 a 10) */}
                  {[-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(vy => (
                    <g key={`ty-${vy}`} className="text-[9px] font-mono select-none" fill="#94a3b8">
                      <line
                        x1={toSvgX(0) - 3}
                        y1={toSvgY(vy)}
                        x2={toSvgX(0) + 3}
                        y2={toSvgY(vy)}
                        stroke="#94a3b8"
                        strokeWidth={1}
                      />
                      <text
                        x={toSvgX(0) - 8}
                        y={toSvgY(vy)}
                        textAnchor="end"
                        dominantBaseline="middle"
                      >
                        {vy}
                      </text>
                    </g>
                  ))}

                  {/* Rótulos x e y */}
                  <text x={SVG_SIZE - PAD_RIGHT + 6} y={toSvgY(0) + 14} fill="#cbd5e1" fontSize="12" fontStyle="italic" fontWeight="bold">
                    x
                  </text>
                  <text x={toSvgX(0) - 12} y={PAD_TOP - 4} fill="#cbd5e1" fontSize="12" fontStyle="italic" fontWeight="bold">
                    y
                  </text>

                  {/* Recta continua si la regla fue descubierta */}
                  {linePoints && (
                    <line
                      x1={linePoints.x1}
                      y1={linePoints.y1}
                      x2={linePoints.x2}
                      y2={linePoints.y2}
                      stroke="#38bdf8"
                      strokeWidth={3}
                      strokeLinecap="round"
                      opacity={0.9}
                    />
                  )}

                  {/* Puntos ubicados por el estudiante */}
                  {placedPoints.map(st => {
                    const sx = toSvgX(st.x)
                    const sy = toSvgY(st.expectedY)

                    return (
                      <g key={`pt-${st.x}`}>
                        <circle
                          cx={sx}
                          cy={sy}
                          r={7}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={1.8}
                        />
                        <circle cx={sx} cy={sy} r={5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
                        <text
                          x={sx + 8}
                          y={sy - 6}
                          fill="#fde68a"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                          stroke="#000000"
                          strokeWidth={0.5}
                        >
                          ({st.x}; {st.expectedY})
                        </text>
                      </g>
                    )
                  })}

                  {/* Punto del reto final si fue resuelto */}
                  {challengeResolved && (
                    <g>
                      <circle
                        cx={toSvgX(currentMission.challengeX)}
                        cy={toSvgY(currentMission.expectedChallengeY)}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <text
                        x={toSvgX(currentMission.challengeX) + 8}
                        y={toSvgY(currentMission.expectedChallengeY) - 6}
                        fill="#6ee7b7"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ({currentMission.challengeX}; {currentMission.expectedChallengeY})
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL DE AYUDA PEDAGÓGICA (ModalHelp)
      ────────────────────────────────────────────────────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía: Cómo descubrir la Función con la Máquina"
      >
        <div className="space-y-4 text-xs sm:text-sm text-white/90">
          <section className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm flex items-center gap-1">
              1. La Máquina de Entrada y Salida
            </h4>
            <p className="text-white/80">
              Una función matemática funciona como una máquina: recibe un número <code>x</code>, le aplica una regla secreta y devuelve un único resultado <code>y</code>.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-bold text-cyan-300 text-sm flex items-center gap-1">
              2. Tabla y Pares Ordenados (x, y)
            </h4>
            <p className="text-white/80">
              Cada prueba genera un par <code>(x, y)</code>. Por ejemplo, si con entrada 1 sale 1, el par es <code>(1, 1)</code>; con entrada 2 sale 3, el par es <code>(2, 3)</code>.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-1">
              3. Ubicación en el Plano Cartesiano
            </h4>
            <ul className="list-disc pl-5 space-y-0.5 text-white/70">
              <li>El primer valor <strong>x</strong> te indica cuánto avanzar en horizontal (eje X).</li>
              <li>El segundo valor <strong>y</strong> te indica cuánto subir o bajar en vertical (eje Y).</li>
              <li>Al ubicar varios puntos de una función lineal o afín, notarás que todos quedan en una línea recta.</li>
            </ul>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
