import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Check,
  Layers,
  ArrowRight,
  Target,
  Zap,
  Box,
  Play
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'
import { useThemeStore } from '../store/useThemeStore'

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
        text: '2x - 1 = y',
        isCorrect: true,
        feedback: '¡Excelente! Multiplicamos la entrada x por 2 y restamos 1 para obtener la salida y: 2x - 1 = y.'
      },
      {
        text: '2y - 1 = x',
        isCorrect: false,
        feedback: '¡Cuidado con las variables! La máquina transforma la entrada x para dar la salida y (2x - 1 = y), no al revés.'
      },
      {
        text: '2x + 1 = y',
        isCorrect: false,
        feedback: 'El ajuste obtenido en el paso anterior fue restar 1 (-1), no sumar 1.'
      },
      {
        text: 'x + 2 = y',
        isCorrect: false,
        feedback: 'Si x=4, 4+2=6, pero la salida real en la tabla es 7.'
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
        text: '2x = y',
        isCorrect: true,
        feedback: '¡Brillante! Cada salida y es el doble exacto de la entrada x: 2x = y.'
      },
      {
        text: '2y = x',
        isCorrect: false,
        feedback: '¡Atención! La salida y se calcula multiplicando la entrada x por 2 (2x = y), no al revés.'
      },
      {
        text: '2x + 1 = y',
        isCorrect: false,
        feedback: 'No tiene ajuste sumado; cuando entra x=0 sale 0, por lo que b = 0.'
      },
      {
        text: 'x² = y',
        isCorrect: false,
        feedback: 'Para x=3 daría 9, pero la máquina arroja 6.'
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
        text: 'x + 3 = y',
        isCorrect: true,
        feedback: '¡Excelente! A cada entrada x se le suma 3 para calcular la salida y: x + 3 = y.'
      },
      {
        text: 'y + 3 = x',
        isCorrect: false,
        feedback: 'Recuerda: la salida y se obtiene sumando 3 a la entrada x (x + 3 = y).'
      },
      {
        text: '3x = y',
        isCorrect: false,
        feedback: 'Para x=0 daría 0, pero la máquina produce 3.'
      },
      {
        text: 'x - 3 = y',
        isCorrect: false,
        feedback: 'El ajuste obtenido en el paso anterior fue sumar 3 (+3), no restar 3.'
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

// Conversión precisa e inmune al aspect ratio / letterbox del SVG
function getSvgCoordinates(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM()
  if (ctm) {
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * svg.viewBox.baseVal.width,
    y: ((clientY - rect.top) / rect.height) * svg.viewBox.baseVal.height
  }
}

// Función para mezclar aleatoriamente las opciones (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function DescubrirFuncionView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

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
  const [revealedTableCount, setRevealedTableCount] = useState<number>(0)

  // Estado de animación dinámica de la Fábrica de Funciones
  type MachineAnimStage = 'idle' | 'entering' | 'processing' | 'ejecting'
  const [machineStage, setMachineStage] = useState<MachineAnimStage>('idle')
  const [currentAnimX, setCurrentAnimX] = useState<number | null>(null)
  const [currentAnimY, setCurrentAnimY] = useState<number | null>(null)
  const [animStatusText, setAnimStatusText] = useState<string>('Toca una entrada para comenzar la fabricación')

  // Estado del plano cartesiano interactivo
  const [targetPointIndex, setTargetPointIndex] = useState<number>(0)
  const [planeFeedback, setPlaneFeedback] = useState<string | null>(null)
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Estado pedagógico de deducción de regla paso a paso
  const [selectedSlope, setSelectedSlope] = useState<number | null>(null)
  const [slopeFeedback, setSlopeFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [selectedIntercept, setSelectedIntercept] = useState<number | null>(null)
  const [interceptFeedback, setInterceptFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [selectedFormulaIdx, setSelectedFormulaIdx] = useState<number | null>(null)
  const [formulaFeedback, setFormulaFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null)
  const [shuffledFormulaOptions, setShuffledFormulaOptions] = useState(() =>
    shuffleArray(MISSIONS[0].ruleOptionsFormula)
  )
  const [showSubtleClues, setShowSubtleClues] = useState<boolean>(false)
  const [isRuleConfirmed, setIsRuleConfirmed] = useState(false)

  // Reto de predicción
  const [challengeUserGuess, setChallengeUserGuess] = useState<string>('')
  const [showKb, setShowKb] = useState<boolean>(false)
  const [challengeResolved, setChallengeResolved] = useState(false)

  // Opciones barajadas para la razón de cambio (m) y ajuste (b)
  const slopeOptions = useMemo(() => {
    const m = currentMission.slopeM
    const items = [
      { val: m, label: `Salto de +${m}` },
      { val: m === 1 ? 2 : m - 1, label: `Salto de +${m === 1 ? 2 : m - 1}` },
      { val: m + 1, label: `Salto de +${m + 1}` },
      { val: m + 2, label: `Salto de +${m + 2}` }
    ]
    const seed = (missionIdx * 3 + 1) % items.length
    return [...items.slice(seed), ...items.slice(0, seed)]
  }, [missionIdx, currentMission.slopeM])

  const interceptOptions = useMemo(() => {
    const b = currentMission.interceptB
    const formatLabel = (v: number) => {
      if (v === 0) return 'Sin ajuste (0)'
      if (v > 0) return `Sumar ${v} (+${v})`
      return `Restar ${Math.abs(v)} (${v})`
    }
    const candidates = [
      b,
      b === 0 ? 1 : b > 0 ? b - 2 : b + 1,
      b === 0 ? -1 : b > 0 ? -b : b + 2,
      b === 0 ? 2 : b > 0 ? b + 1 : -b
    ]
    const uniqueVals = Array.from(new Set(candidates))
    const items = uniqueVals.map(v => ({ val: v, label: formatLabel(v) }))
    const seed = (missionIdx * 2 + 1) % items.length
    return [...items.slice(seed), ...items.slice(0, seed)]
  }, [missionIdx, currentMission.interceptB])

  const handleSelectSlope = (val: number) => {
    setSelectedSlope(val)
    if (val === currentMission.slopeM) {
      setSlopeFeedback('correct')
    } else {
      setSlopeFeedback('incorrect')
    }
  }

  const handleSelectIntercept = (val: number) => {
    setSelectedIntercept(val)
    if (val === currentMission.interceptB) {
      setInterceptFeedback('correct')
    } else {
      setInterceptFeedback('incorrect')
    }
  }

  const handleSelectFormula = (idx: number) => {
    setSelectedFormulaIdx(idx)
    const opt = shuffledFormulaOptions[idx]
    if (opt) {
      setFormulaFeedback({ isCorrect: opt.isCorrect, text: opt.feedback })
    }
  }

  // Modal de ayuda
  const [showHelp, setShowHelp] = useState(false)

  // Cambiar o reiniciar misión
  const loadMission = (idx: number) => {
    setMissionIdx(idx)
    const m = MISSIONS[idx]
    setSteps(m.initialSteps.map(s => ({ ...s, isPlaced: false })))
    setMachineStage('idle')
    setCurrentAnimX(null)
    setCurrentAnimY(null)
    setAnimStatusText('Toca una entrada para comenzar la fabricación')
    setRevealedTableCount(0)
    setTargetPointIndex(0)
    setPlaneFeedback(null)
    setHoverCoord(null)
    setSelectedSlope(null)
    setSlopeFeedback(null)
    setSelectedIntercept(null)
    setInterceptFeedback(null)
    setSelectedFormulaIdx(null)
    setFormulaFeedback(null)
    setShuffledFormulaOptions(shuffleArray(m.ruleOptionsFormula))
    setShowSubtleClues(false)
    setIsRuleConfirmed(false)
    setChallengeUserGuess('')
    setShowKb(false)
    setChallengeResolved(false)
    setActiveTab('machine')
  }

  // Activar la animación de la máquina y revelar en la tabla
  const handleRunMachine = (inputX: number) => {
    if (machineStage !== 'idle') return
    const step = steps.find(s => s.x === inputX)
    if (!step) return

    setCurrentAnimX(inputX)
    setCurrentAnimY(step.expectedY)
    setMachineStage('entering')
    setAnimStatusText(`Introduciendo x = ${inputX} en la tolva...`)

    // Paso 1: Cápsula entra en la máquina (450ms)
    setTimeout(() => {
      setMachineStage('processing')
      setAnimStatusText(`✨ ¡Proceso mágico! Fabricando f(${inputX})... ⚙️`)

      // Paso 2: Fabricación mágica / engranajes girando (650ms)
      setTimeout(() => {
        setMachineStage('ejecting')
        setAnimStatusText(`🎉 ¡Éxito! La máquina produjo la salida y = ${step.expectedY}`)

        // Revelar en la tabla
        const stepIdx = steps.findIndex(s => s.x === inputX)
        if (stepIdx !== -1) {
          setRevealedTableCount(prev => Math.max(prev, stepIdx + 1))
        }

        // Paso 3: Retornar a reposo tras el salto (850ms)
        setTimeout(() => {
          setMachineStage('idle')
        }, 850)
      }, 650)
    }, 450)
  }

  // Procesar la siguiente entrada pendiente
  const handleRunNextMachine = () => {
    if (machineStage !== 'idle') return
    const nextStep = steps.find((_, idx) => idx >= revealedTableCount)
    if (nextStep) {
      handleRunMachine(nextStep.x)
    }
  }

  // Clic táctil / pointer down en el plano cartesiano interactivo
  const handlePlaneClick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const svgCoords = getSvgCoordinates(svgRef.current, e.clientX, e.clientY)
    const { rawX, rawY, x, y } = fromSvgCoords(svgCoords.x, svgCoords.y)

    // Verificar si coincide con el punto objetivo que falta ubicar
    const currentTarget = targetPointIndex < steps.length ? steps[targetPointIndex] : null

    if (!currentTarget) {
      setPlaneFeedback(`Tocaste (${x}; ${y}). ¡Los 4 puntos ya están ubicados!`)
      return
    }

    // Tolerancia generosa para pantalla táctil (±0.75 unidades de cuadrícula alrededor del punto entero)
    const isTargetHit =
      Math.abs(rawX - currentTarget.x) <= 0.75 && Math.abs(rawY - currentTarget.expectedY) <= 0.75

    if (isTargetHit) {
      // Punto correcto
      setSteps(prev =>
        prev.map((s, idx) => (idx === targetPointIndex ? { ...s, isPlaced: true } : s))
      )
      const nextIdx = targetPointIndex + 1
      setTargetPointIndex(nextIdx)

      if (nextIdx < steps.length) {
        setPlaneFeedback(
          `¡Genial! Punto (${currentTarget.x}; ${currentTarget.expectedY}) ubicado. Ahora busca (${steps[nextIdx].x}; ${steps[nextIdx].expectedY}).`
        )
      } else {
        setPlaneFeedback('¡Excelente! Ubicaste los 4 puntos. ¡Pasan por una línea recta!')
      }
    } else {
      // Retroalimentación pedagógica orientadora
      setPlaneFeedback(
        `Marcaste cerca de (${x}; ${y}). Para (${currentTarget.x}; ${currentTarget.expectedY}): ubica x = ${currentTarget.x} en la base y sube a y = ${currentTarget.expectedY}.`
      )
    }
  }

  const handlePlanePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const svgCoords = getSvgCoordinates(svgRef.current, e.clientX, e.clientY)
    const { x, y } = fromSvgCoords(svgCoords.x, svgCoords.y)
    if (x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y) {
      setHoverCoord({ x, y })
    } else {
      setHoverCoord(null)
    }
  }

  const handlePlanePointerLeave = () => {
    setHoverCoord(null)
  }

  // Ubicar todos los puntos automáticamente con guía
  const handleAutoPlaceAll = () => {
    setSteps(prev => prev.map(s => ({ ...s, isPlaced: true })))
    setTargetPointIndex(steps.length)
    setPlaneFeedback('Puntos ubicados en el plano. Observa la alineación recta.')
  }

  // Manejo de pulsaciones del teclado virtual para el reto de predicción
  const handleKbPress = (key: string) => {
    if (key === 'clear') {
      setChallengeUserGuess('')
      return
    }
    if (key === 'backspace') {
      const s = String(challengeUserGuess)
      if (s.length <= 1 || (s.length === 2 && s.startsWith('-'))) {
        setChallengeUserGuess('')
      } else {
        setChallengeUserGuess(s.slice(0, -1))
      }
      return
    }
    if (key === '±') {
      if (challengeUserGuess === '' || challengeUserGuess === '0') return
      const s = String(challengeUserGuess)
      if (s.startsWith('-')) {
        setChallengeUserGuess(s.slice(1))
      } else {
        setChallengeUserGuess('-' + s)
      }
      return
    }
    // Números 0-9
    const currentStr = challengeUserGuess === '' ? '' : String(challengeUserGuess)
    if (currentStr.replace('-', '').length >= 4) return
    if (currentStr === '0') {
      setChallengeUserGuess(key)
    } else {
      setChallengeUserGuess(currentStr + key)
    }
  }

  // Resolver reto final
  const handleCheckChallenge = () => {
    if (challengeUserGuess !== '' && Number(challengeUserGuess) === currentMission.expectedChallengeY) {
      setChallengeResolved(true)
      setIsRuleConfirmed(true)
      setShowKb(false)
    }
  }

  // Puntos ya colocados en el plano
  const placedPoints = useMemo(() => {
    return steps.filter(s => s.isPlaced)
  }, [steps])

  // Coordenadas extremas de la recta para dibujarla ÚNICAMENTE cuando se ubiquen todos los puntos en el plano
  const linePoints = useMemo(() => {
    const allPlaced = steps.every(s => s.isPlaced)
    if (!allPlaced) return null
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
  }, [steps, currentMission])

  // Punto objetivo actual
  const currentTargetPoint = targetPointIndex < steps.length ? steps[targetPointIndex] : null

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none transition-colors duration-150 ${
      isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* ──────────────────────────────────────────────────────────────────────────
          1. HEADER COMPACTO (34-38px)
      ────────────────────────────────────────────────────────────────────────── */}
      <header className={`flex h-9 shrink-0 items-center justify-between border-b px-2 lg:px-4 transition-colors ${
        isDark ? 'border-white/10 bg-[#0a0f1d]' : 'border-slate-300 bg-white'
      }`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => navigate('/')}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded ${
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700 border border-amber-300'
            }`}>
              <Layers className="h-3 w-3" />
            </span>
            <h1 className={`text-[12px] sm:text-[13px] font-bold tracking-wide truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Máquina de Funciones (Descubre y Grafica)
            </h1>
          </div>
        </div>

        {/* Selector de Misión compacto con botón Misión Siguiente */}
        <div className={`flex items-center gap-1 px-1 py-0.5 rounded-md border ${
          isDark ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-300'
        }`}>
          {MISSIONS.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => loadMission(idx)}
              className={`h-5 sm:h-6 px-1.5 sm:px-2 rounded text-[10px] font-bold transition-all ${
                idx === missionIdx
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              M{m.id}
            </button>
          ))}
          <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-white/20' : 'bg-slate-300'}`} />
          <button
            onClick={() => loadMission((missionIdx + 1) % MISSIONS.length)}
            className="h-5 sm:h-6 px-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
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
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
            }`}
            title="Reiniciar misión"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-300'
            }`}
            title="Ayuda pedagógica"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. SUBHEADER: 3 PESTAÑAS DEL FLUJO (34-36px)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className={`shrink-0 flex items-center justify-between border-b px-2 sm:px-4 py-1 text-[11px] lg:text-xs transition-colors ${
        isDark ? 'border-white/5 bg-[#0d1424]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto gap-1">
          {/* Pestañas de Navegación del Flujo de Aprendizaje: 1. Fábrica -> 2. Adivina la Regla -> 3. Plano Cartesiano */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveTab('machine')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'machine'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-white/70 hover:bg-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>⚙️ 1. Fábrica y Tabla</span>
              {revealedTableCount >= 4 && <Check className="h-3 w-3" />}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-white/70 hover:bg-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>💡 2. Adivina la Regla</span>
              {isRuleConfirmed && <Sparkles className="h-3 w-3 text-amber-300" />}
            </button>

            <button
              onClick={() => setActiveTab('plane')}
              className={`h-6 sm:h-7 px-2 sm:px-3 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'plane'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-white/70 hover:bg-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>📈 3. Plano Cartesiano</span>
              <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                isDark ? 'bg-black/40 text-white/80' : 'bg-slate-200 text-slate-700'
              }`}>
                {placedPoints.length}/4
              </span>
            </button>
          </div>

          {/* Indicador de regla activa */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono">
            {isRuleConfirmed ? (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                <Sparkles className="h-2.5 w-2.5" />
                {currentMission.ruleFormula}
              </span>
            ) : (
              <span className={isDark ? 'text-white/40' : 'text-slate-400 font-medium'}>
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
            <div className={`flex-1 flex flex-col justify-between rounded-xl border p-2 sm:p-3 shadow-md overflow-hidden transition-colors ${
              isDark ? 'bg-[#0a1020] border-white/10' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                {/* Cabecera compacta */}
                <div className={`flex items-center justify-between mb-1 pb-1 border-b shrink-0 ${
                  isDark ? 'border-white/10' : 'border-slate-200'
                }`}>
                  <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}>
                    <Layers className="h-4 w-4 text-amber-400" />
                    <span>Fábrica de Funciones: Proceso de Transformación</span>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    machineStage === 'processing'
                      ? isDark
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse'
                      : machineStage === 'ejecting'
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold'
                      : isDark
                      ? 'bg-white/5 text-white/60 border-white/10'
                      : 'bg-slate-100 text-slate-700 border-slate-300 font-medium'
                  }`}>
                    {animStatusText}
                  </span>
                </div>

                {/* ── FÁBRICA HORIZONTAL: ENTRADA (IZQUIERDA) ──→ FÁBRICA (CENTRO) ──→ SALIDA (DERECHA) ── */}
                <div className="shrink-0 my-1 relative select-none w-full">
                  {/* Fila fija horizontal de 3 columnas: NUNCA hace wrap ni se desborda */}
                  <div className="flex flex-row items-stretch justify-between gap-1.5 sm:gap-2.5 w-full">

                    {/* ── 1. ENTRADA (x) A LA IZQUIERDA ── */}
                    <div className={`w-[29%] sm:w-[28%] shrink-0 flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border relative overflow-hidden transition-all ${
                      isDark
                        ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border-cyan-500/40 shadow-sm'
                        : 'bg-gradient-to-br from-cyan-50 via-white to-slate-100 border-cyan-400 shadow-sm'
                    }`}>
                      {/* Cabecera Entrada */}
                      <div className="w-full flex items-center justify-between mb-1 pb-1 border-b border-cyan-500/20">
                        <div className="flex items-center gap-1">
                          <Zap className={`h-3 w-3 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                          <span className={`text-[10px] sm:text-xs font-black tracking-wide uppercase ${
                            isDark ? 'text-cyan-300' : 'text-cyan-900'
                          }`}>
                            Entrada (x)
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono ${isDark ? 'text-cyan-300/70' : 'text-cyan-800/80 font-bold'}`}>
                          1. Elige
                        </span>
                      </div>

                      {/* Botones de entrada x en cuadrícula compacta */}
                      <div className="w-full grid grid-cols-2 gap-1 sm:gap-1.5 my-0.5">
                        {steps.map((st, i) => {
                          const isDone = revealedTableCount > i
                          const isRunning = currentAnimX === st.x && machineStage !== 'idle'
                          return (
                            <button
                              key={`btn-in-${st.x}`}
                              onClick={() => handleRunMachine(st.x)}
                              disabled={machineStage !== 'idle' || isDone}
                              className={`h-7 sm:h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center gap-1 border transition-all ${
                                isRunning
                                  ? 'bg-amber-400 text-slate-950 border-white scale-105 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-amber-300'
                                  : isDone
                                  ? isDark
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 opacity-60 cursor-default'
                                    : 'bg-emerald-100 border-emerald-300 text-emerald-800 opacity-60 cursor-default'
                                  : isDark
                                  ? 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border-cyan-500/40 hover:scale-105 active:scale-95 shadow-sm cursor-pointer'
                                  : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer'
                              }`}
                            >
                              <span>x={st.x}</span>
                              {isDone ? (
                                <Check className={`h-2.5 w-2.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                              ) : isRunning ? (
                                <span className="animate-ping text-[10px]">⚡</span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>

                      {/* Botón Fabricar Siguiente / Riel hacia la máquina */}
                      <div className="w-full mt-1 flex items-center justify-between gap-1">
                        {revealedTableCount < steps.length ? (
                          <button
                            onClick={handleRunNextMachine}
                            disabled={machineStage !== 'idle'}
                            className="w-full h-5.5 sm:h-6 px-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            <span>Fabricar sig.</span>
                          </button>
                        ) : (
                          <div className={`w-full text-center text-[9px] font-bold ${
                            isDark ? 'text-emerald-400' : 'text-emerald-800'
                          }`}>
                            ✓ Entradas listas
                          </div>
                        )}
                      </div>

                      {/* Flecha indicadora hacia el centro */}
                      <div className="hidden sm:flex absolute right-0.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none text-cyan-400">
                        <ArrowRight className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                    </div>

                    {/* ── 2. LA FÁBRICA COMPACTA (CENTRO - TAMAÑO Y COLOR FIJOS, ANIMACIONES INTERNAS) ── */}
                    <div className="flex-1 min-w-0 flex flex-col items-center justify-center relative px-0.5 sm:px-1">
                      {/* Chimeneas y Tubos Superiores con Humo/Chispas al procesar */}
                      <div className="flex items-center gap-4 -mb-1 z-10">
                        <div className="flex flex-col items-center">
                          {machineStage === 'processing' && (
                            <span className="text-[10px] animate-bounce" style={{ color: '#f59e0b' }}>✨</span>
                          )}
                          <div className={`w-3 h-2 rounded-t-sm border border-b-0 ${
                            isDark ? 'bg-slate-700 border-slate-500' : 'bg-slate-300 border-slate-400'
                          }`} />
                        </div>
                        <div className="flex flex-col items-center">
                          {machineStage === 'processing' && (
                            <span className="text-[10px] animate-pulse" style={{ color: '#a855f7' }}>💨</span>
                          )}
                          <div className={`w-3.5 h-3 rounded-t-sm border border-b-0 ${
                            isDark ? 'bg-slate-700 border-slate-500' : 'bg-slate-300 border-slate-400'
                          }`} />
                        </div>
                      </div>

                      {/* Chasis Central de la Máquina: NUNCA CRECE NI CAMBIA DE COLOR EXTERNO */}
                      <div className={`relative w-full rounded-xl border-2 p-1.5 sm:p-2 flex flex-col items-center shadow-md select-none ${
                        isDark
                          ? 'border-white/15 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900'
                          : 'border-slate-300 bg-white shadow-sm'
                      }`}>
                        {/* Tolva de entrada izquierda (tubo metálico fijo) */}
                        <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-2.5 h-6 rounded-l border border-r-0 flex items-center justify-center text-[8px] font-bold ${
                          isDark ? 'bg-slate-800 border-white/20 text-cyan-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                        }`}>
                          ›
                        </div>

                        {/* Tolva de salida derecha (tubo metálico fijo) */}
                        <div className={`absolute -right-2 top-1/2 -translate-y-1/2 w-2.5 h-6 rounded-r border border-l-0 flex items-center justify-center text-[8px] font-bold ${
                          isDark ? 'bg-slate-800 border-white/20 text-emerald-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                        }`}>
                          ›
                        </div>

                        {/* Barra Superior con LEDs y Nombre (animación solo en las luces) */}
                        <div className="w-full flex items-center justify-between px-1 mb-1">
                          <div className="flex gap-1 items-center">
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              machineStage === 'processing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
                            }`} />
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              machineStage === 'processing' ? 'bg-cyan-400 animate-bounce' : 'bg-amber-500'
                            }`} />
                          </div>

                          <div className="flex items-center gap-1">
                            <Sparkles className={`h-2.5 w-2.5 ${machineStage === 'processing' ? 'text-amber-400 animate-spin' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <span className={`text-[8px] sm:text-[9px] font-mono font-black tracking-widest uppercase ${
                              isDark ? 'text-white/80' : 'text-slate-800'
                            }`}>
                              FÁBRICA f(x)
                            </span>
                          </div>

                          <div className="flex gap-1 items-center">
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              machineStage === 'processing' ? 'bg-purple-400 animate-pulse' : 'bg-cyan-500'
                            }`} />
                          </div>
                        </div>

                        {/* Ventana de Transformación: Mantiene su fondo de tema, solo animan sus elementos internos */}
                        <div className={`w-full h-14 sm:h-16 rounded-lg border flex items-center justify-between px-1.5 sm:px-3 relative overflow-hidden ${
                          isDark
                            ? 'bg-black/60 border-white/10'
                            : 'bg-slate-50 border-slate-200 shadow-inner'
                        }`}>
                          {/* Engranaje Izquierdo: Rota en sentido horario solo al fabricar */}
                          <span
                            className="text-lg sm:text-2xl select-none"
                            style={{
                              display: 'inline-block',
                              animation: machineStage === 'processing' ? 'spin 1.2s linear infinite' : 'none'
                            }}
                          >
                            ⚙️
                          </span>

                          {/* Núcleo Central: Proceso Mágico de la Función */}
                          <div className="flex flex-col items-center justify-center relative z-10 text-center px-0.5">
                            {machineStage === 'entering' ? (
                              <div className="flex flex-col items-center animate-pulse">
                                <span className={`text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider ${
                                  isDark ? 'text-cyan-300' : 'text-cyan-800'
                                }`}>
                                  Entrando x
                                </span>
                                <div className={`px-2 py-0.5 mt-0.5 rounded-full font-mono font-black text-[10px] flex items-center gap-1 border shadow-xs ${
                                  isDark ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200' : 'bg-cyan-100 border-cyan-400 text-cyan-950'
                                }`}>
                                  <span>x = {currentAnimX}</span>
                                  <span>→</span>
                                </div>
                              </div>
                            ) : machineStage === 'processing' ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 animate-pulse">
                                  <span className="text-[10px] text-amber-500">✨</span>
                                  <span className={`text-[9px] sm:text-[10px] font-black tracking-wider ${
                                    isDark ? 'text-amber-300' : 'text-amber-800'
                                  }`}>
                                    FABRICANDO
                                  </span>
                                  <span className="text-[10px] text-amber-500">✨</span>
                                </div>
                                <span className={`text-[9px] font-mono font-bold mt-0.5 ${
                                  isDark ? 'text-purple-300' : 'text-purple-800'
                                }`}>
                                  f({currentAnimX}) → y
                                </span>
                              </div>
                            ) : machineStage === 'ejecting' ? (
                              <div className="flex flex-col items-center animate-bounce">
                                <span className={`text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider ${
                                  isDark ? 'text-emerald-300' : 'text-emerald-800'
                                }`}>
                                  ¡Listo!
                                </span>
                                <div className={`px-2 py-0.5 mt-0.5 rounded-full font-mono font-black text-[10px] flex items-center gap-1 border shadow-xs ${
                                  isDark ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200' : 'bg-emerald-100 border-emerald-400 text-emerald-950'
                                }`}>
                                  <span>y = {currentAnimY}</span>
                                  <span>→</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={`text-[9px] sm:text-[10px] font-black ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                                  f(x) = ?
                                </span>
                                <span className={`text-[8px] ${isDark ? 'text-white/40' : 'text-slate-500 font-medium'}`}>
                                  {revealedTableCount >= steps.length ? '¡Fábrica completa!' : 'Esperando entrada...'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Engranaje Derecho: Rota en sentido antihorario (engranaje mecánico inverso) */}
                          <span
                            className="text-lg sm:text-2xl select-none"
                            style={{
                              display: 'inline-block',
                              animation: machineStage === 'processing' ? 'spin 1.2s linear infinite reverse' : 'none'
                            }}
                          >
                            ⚙️
                          </span>
                        </div>

                        {/* Base / Pieza de Sujeción de la Máquina */}
                        <div className={`w-20 h-1.5 rounded-b-md border-t-0 border ${
                          isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-300 border-slate-400'
                        }`} />
                      </div>
                    </div>

                    {/* ── 3. SALIDA (y) A LA DERECHA (GARANTIZADO AL LADO DERECHO Y CON ALTO CONTRASTE) ── */}
                    <div className={`w-[29%] sm:w-[28%] shrink-0 flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border relative overflow-hidden transition-all ${
                      isDark
                        ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                        : 'bg-emerald-50/70 border-emerald-400 shadow-sm'
                    }`}>
                      {/* Cabecera Salida */}
                      <div className="w-full flex items-center justify-between mb-1 pb-1 border-b border-emerald-500/20">
                        <div className="flex items-center gap-1">
                          <Box className="h-3 w-3" style={{ color: isDark ? '#34d399' : '#047857' }} />
                          <span
                            className="text-[10px] sm:text-xs font-black tracking-wide uppercase"
                            style={{ color: isDark ? '#6ee7b7' : '#064e3b' }}
                          >
                            Salida (y)
                          </span>
                        </div>
                        <span
                          className="text-[9px] font-mono font-bold"
                          style={{ color: isDark ? '#6ee7b7' : '#064e3b' }}
                        >
                          {revealedTableCount}/{steps.length}
                        </span>
                      </div>

                      {/* Área de Recepción / Caja de Salida con Rebote a la derecha */}
                      <div className="w-full flex-1 flex flex-col items-center justify-center my-0.5 min-h-[50px]">
                        {machineStage === 'ejecting' ? (
                          <div className="flex flex-col items-center animate-bounce">
                            <div
                              className="px-2 sm:px-2.5 py-1 rounded-xl border-2 shadow-lg flex items-center gap-1 font-mono font-black text-xs sm:text-sm"
                              style={{
                                backgroundColor: isDark ? '#022c22' : '#047857',
                                borderColor: isDark ? '#34d399' : '#065f46',
                                color: '#ffffff'
                              }}
                            >
                              <Box className="h-3.5 w-3.5 shrink-0 text-white" />
                              <span className="text-white">y =</span>
                              <span className="text-sm font-black text-white drop-shadow">
                                {currentAnimY}
                              </span>
                              <span>✨</span>
                            </div>
                            <span
                              className="text-[9px] font-bold mt-0.5 animate-pulse"
                              style={{ color: isDark ? '#6ee7b7' : '#064e3b' }}
                            >
                              ¡Salida producida!
                            </span>
                          </div>
                        ) : revealedTableCount > 0 ? (
                          <div className="flex flex-col items-center w-full">
                            <div
                              className="w-full py-1.5 px-2 rounded-lg border font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs"
                              style={{
                                backgroundColor: isDark ? 'rgba(6,78,59,0.5)' : '#d1fae5',
                                borderColor: isDark ? '#059669' : '#34d399',
                                color: isDark ? '#a7f3d0' : '#064e3b'
                              }}
                            >
                              <Box className="h-3.5 w-3.5 shrink-0" style={{ color: isDark ? '#34d399' : '#047857' }} />
                              <span style={{ color: isDark ? '#a7f3d0' : '#064e3b' }}>y =</span>
                              <span
                                className="text-sm sm:text-base font-black"
                                style={{ color: isDark ? '#6ee7b7' : '#022c22' }}
                              >
                                {steps[revealedTableCount - 1]?.expectedY}
                              </span>
                            </div>
                            {/* Chips de salidas ya producidas con alto contraste */}
                            <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                              {steps.slice(0, revealedTableCount).map(s => (
                                <span
                                  key={`out-chip-${s.x}`}
                                  className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#a7f3d0',
                                    color: isDark ? '#6ee7b7' : '#022c22',
                                    borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#34d399'
                                  }}
                                >
                                  {s.expectedY}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <Box className="h-5 w-5 mb-0.5" style={{ color: isDark ? 'rgba(52,211,153,0.5)' : '#059669' }} />
                            <span
                              className="text-[8px] font-medium"
                              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}
                            >
                              Esperando salida...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Indicador de Estado Inferior */}
                      <div className="w-full mt-1 text-center">
                        {revealedTableCount >= steps.length ? (
                          <div
                            className="w-full py-0.5 rounded text-[9px] font-black border"
                            style={{
                              backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                              color: isDark ? '#6ee7b7' : '#064e3b',
                              borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#34d399'
                            }}
                          >
                            🎉 ¡Salidas listas!
                          </div>
                        ) : (
                          <div
                            className="text-[9px] font-mono font-bold"
                            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}
                          >
                            Pasa a la tabla ↓
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── 3. TABLA DE ENTRADA Y SALIDA ── */}
                <div className={`rounded-lg p-1.5 sm:p-2 border mt-1 shrink-0 ${
                  isDark ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-300 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] sm:text-xs font-bold ${
                      isDark ? 'text-white/80' : 'text-slate-800'
                    }`}>
                      Tabla de valores de la función:
                    </span>
                    <div className="flex items-center gap-2">
                      {revealedTableCount < steps.length && (
                        <button
                          onClick={() => setRevealedTableCount(steps.length)}
                          className={`text-[9px] underline transition-colors cursor-pointer ${
                            isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-900 font-medium'
                          }`}
                        >
                          Revelar todas
                        </button>
                      )}
                      <span className="text-[9px] font-mono opacity-60">
                        {revealedTableCount}/{steps.length} fabricados
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono border-collapse">
                      <tbody>
                        <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
                          <td className={`p-1 text-left text-[10px] sm:text-xs font-sans font-bold rounded-l ${
                            isDark ? 'text-cyan-300 bg-white/5' : 'text-cyan-800 bg-slate-200/80'
                          }`}>
                            Entrada (x)
                          </td>
                          {steps.map(s => (
                            <td key={`x-${s.x}`} className={`p-1 font-bold ${
                              isDark ? 'text-cyan-200 bg-cyan-950/20' : 'text-cyan-900 bg-cyan-100/60 font-black'
                            }`}>
                              {s.x}
                            </td>
                          ))}
                        </tr>
                        <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
                          <td className={`p-1 text-left text-[10px] sm:text-xs font-sans font-bold rounded-l ${
                            isDark ? 'text-emerald-300 bg-white/5' : 'text-emerald-800 bg-slate-200/80'
                          }`}>
                            Salida (y)
                          </td>
                          {steps.map((s, idx) => {
                            const isRevealed = revealedTableCount > idx
                            const isJustRevealed = currentAnimX === s.x && machineStage === 'ejecting'
                            return (
                              <td key={`y-${s.x}`} className={`p-1 font-black transition-all ${
                                isJustRevealed
                                  ? 'bg-emerald-400 text-slate-950 scale-105'
                                  : isDark
                                  ? 'text-emerald-300 bg-emerald-950/20'
                                  : 'text-emerald-900 bg-emerald-100/60'
                              }`}>
                                {isRevealed ? s.expectedY : '—'}
                              </td>
                            )
                          })}
                        </tr>
                        <tr>
                          <td className={`p-1 text-left text-[10px] sm:text-xs font-sans font-bold rounded-l ${
                            isDark ? 'text-white/50 bg-white/5' : 'text-slate-600 bg-slate-200/80'
                          }`}>
                            Par ordenado (x; y)
                          </td>
                          {steps.map((s, idx) => (
                            <td key={`pt-${s.x}`} className={`p-1 text-[11px] sm:text-xs ${
                              isDark ? 'text-white/80' : 'text-slate-800'
                            }`}>
                              {revealedTableCount > idx ? (
                                <span
                                  className={
                                    s.isPlaced
                                      ? isDark ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-black'
                                      : isDark ? 'text-amber-300 underline font-bold' : 'text-amber-700 underline font-black'
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
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 2: LABORATORIO PEDAGÓGICO PARA DEDUCIR LA REGLA
          ========================================================================= */}
          {activeTab === 'rules' && (
            <div className={`flex-1 flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 shadow-md overflow-hidden transition-colors ${
              isDark ? 'bg-[#0a1020] border-white/10' : 'bg-white border-slate-300 shadow-sm'
            }`}>
              {/* Cabecera */}
              <div className={`flex items-center justify-between pb-1 border-b shrink-0 ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs sm:text-sm font-bold ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}>
                    💡 Paso 2: Deduce la Regla de la Función
                  </span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                  isDark ? 'bg-white/5 border-white/15 text-white/70' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}>
                  Etapa {challengeResolved ? '4/4' : selectedFormulaIdx !== null && shuffledFormulaOptions[selectedFormulaIdx]?.isCorrect ? '4/4' : selectedIntercept === currentMission.interceptB ? '3/4' : selectedSlope === currentMission.slopeM ? '2/4' : '1/4'}
                </span>
              </div>

              {/* Área de trabajo desplazable */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-1 pr-0.5">

                {/* ── TABLA DE REFERENCIA CON PISTAS SUTILES ── */}
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-300 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-white/80' : 'text-slate-800'}`}>
                      Valores de la Fábrica (Observación):
                    </span>
                    <button
                      onClick={() => setShowSubtleClues(!showSubtleClues)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                        showSubtleClues
                          ? isDark ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-cyan-100 border-cyan-500 text-cyan-900 font-black'
                          : isDark ? 'bg-white/5 border-white/15 text-white/70 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900'
                      }`}
                      title="Muestra u oculta la diferencia constante entre salidas consecutivas"
                    >
                      <span>{showSubtleClues ? '👁️ Ocultar pistas' : '🔍 Pistas sutiles (Δy)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono border-collapse">
                      <tbody>
                        <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                          <td className={`p-1 text-left text-[10px] font-sans font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                            Entrada (x)
                          </td>
                          {steps.map(s => (
                            <td key={`ref-x-${s.x}`} className={`p-1 font-bold ${isDark ? 'text-cyan-200' : 'text-cyan-900 font-black'}`}>
                              {s.x}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className={`p-1 text-left text-[10px] font-sans font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                            Salida (y)
                          </td>
                          {steps.map(s => (
                            <td key={`ref-y-${s.x}`} className={`p-1 font-black ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                              {s.expectedY}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pista sutil: Saltos Δy entre salidas */}
                  {showSubtleClues && (
                    <div className={`mt-1 pt-1 border-t flex items-center justify-between text-[9px] font-mono font-bold animate-in fade-in duration-200 ${
                      isDark ? 'border-white/10 text-cyan-300' : 'border-slate-200 text-cyan-900'
                    }`}>
                      <span className="font-sans font-medium opacity-80">Razón de cambio (salto entre salidas):</span>
                      <div className="flex items-center gap-2">
                        {steps.slice(0, -1).map((s, idx) => (
                          <span key={`diff-${s.x}`} className="px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30">
                            +{steps[idx + 1].expectedY - s.expectedY}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── PASO 1: LA RAZÓN DE CAMBIO (MULTIPLICADOR m) ── */}
                {selectedSlope === currentMission.slopeM ? (
                  <div className={`p-1.5 rounded-lg border flex items-center justify-between transition-all ${
                    isDark ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>
                        <strong>Paso 1:</strong> Razón de cambio = <strong className="font-mono">+{currentMission.slopeM}</strong> → Se multiplica la entrada por <strong className="font-mono">{currentMission.slopeM}</strong> ({currentMission.slopeM === 1 ? 'x' : `${currentMission.slopeM}x`}).
                      </span>
                    </div>
                    <button
                      onClick={() => { setSelectedSlope(null); setSlopeFeedback(null); }}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ml-2 ${
                        isDark ? 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className={`p-2 rounded-lg border transition-all ${
                    isDark ? 'bg-black/20 border-white/10' : 'bg-white border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                        1. ¿De cuánto en cuánto aumentan las salidas consecutivas?
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 my-1">
                      {slopeOptions.map(opt => {
                        const isSelected = selectedSlope === opt.val
                        const isCorrect = opt.val === currentMission.slopeM
                        return (
                          <button
                            key={`slope-${opt.val}`}
                            onClick={() => handleSelectSlope(opt.val)}
                            className={`py-1.5 px-2 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? isCorrect
                                  ? isDark ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black'
                                  : isDark ? 'bg-rose-950/70 border-rose-400 text-rose-200' : 'bg-rose-100 border-rose-500 text-rose-950 font-black'
                                : isDark
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    {slopeFeedback === 'incorrect' && (
                      <div className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                        Ese salto no coincide. Compara dos salidas consecutivas de la tabla (por ejemplo: {steps[1]?.expectedY} - {steps[0]?.expectedY}).
                      </div>
                    )}
                  </div>
                )}

                {/* ── PASO 2: EL AJUSTE O TÉRMINO INDEPENDIENTE (b) ── */}
                {selectedSlope === currentMission.slopeM && (
                  selectedIntercept === currentMission.interceptB ? (
                    <div className={`p-1.5 rounded-lg border flex items-center justify-between transition-all ${
                      isDark ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    }`}>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong>Paso 2:</strong> Ajuste inicial = <strong className="font-mono">{currentMission.interceptB === 0 ? 'Sin ajuste (0)' : currentMission.interceptB > 0 ? `+${currentMission.interceptB}` : currentMission.interceptB}</strong>.
                        </span>
                      </div>
                      <button
                        onClick={() => { setSelectedIntercept(null); setInterceptFeedback(null); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ml-2 ${
                          isDark ? 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className={`p-2 rounded-lg border transition-all animate-in fade-in duration-200 ${
                      isDark ? 'bg-black/20 border-white/10' : 'bg-white border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                          2. Si multiplicamos la entrada por {currentMission.slopeM}, ¿qué ajuste le falta para dar la salida real?
                        </span>
                      </div>

                      <div className={`text-[10px] my-1 p-1.5 rounded border ${
                        isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        Para la entrada <strong>x = {steps[0].x}</strong>: multiplicando por {currentMission.slopeM} daría{' '}
                        <strong className="font-mono">{currentMission.slopeM * steps[0].x}</strong>, pero la salida real en la tabla es{' '}
                        <strong className={`font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-800 font-black'}`}>
                          {steps[0].expectedY}
                        </strong>.
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 my-1">
                        {interceptOptions.map(opt => {
                          const isSelected = selectedIntercept === opt.val
                          const isCorrect = opt.val === currentMission.interceptB
                          return (
                            <button
                              key={`intercept-${opt.val}`}
                              onClick={() => handleSelectIntercept(opt.val)}
                              className={`py-1.5 px-2 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? isCorrect
                                    ? isDark ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black'
                                    : isDark ? 'bg-rose-950/70 border-rose-400 text-rose-200' : 'bg-rose-100 border-rose-500 text-rose-950 font-black'
                                  : isDark
                                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>

                      {interceptFeedback === 'incorrect' && (
                        <div className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                          Comprueba: {currentMission.slopeM} · ({steps[0].x}) = {currentMission.slopeM * steps[0].x}. ¿Cuánto le falta o le sobra para llegar a {steps[0].expectedY}?
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* ── PASO 3: PATRÓN ARITMÉTICO FILA POR FILA Y DEDUCCIÓN DE FÓRMULA ── */}
                {selectedIntercept === currentMission.interceptB && (
                  <div className={`p-2 rounded-lg border space-y-2 animate-in fade-in duration-300 ${
                    isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-300 shadow-xs'
                  }`}>
                    {/* Encabezado del patrón */}
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className={`text-[11px] sm:text-xs font-black flex items-center gap-1.5 ${
                        isDark ? 'text-amber-300' : 'text-amber-800'
                      }`}>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>3. Patrón Aritmético:</span>
                        <span className={`text-[10px] sm:text-[11px] font-normal font-sans ${
                          isDark ? 'text-white/70' : 'text-slate-600'
                        }`}>
                          (analiza los siguientes datos)
                        </span>
                      </span>
                      <span className={`text-[9px] font-mono ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        {currentMission.isLineal ? 'Función Lineal' : 'Función Afín'}
                      </span>
                    </div>

                    {/* Tarjeta única con el patrón aritmético en una sola columna */}
                    <div className={`py-2 px-4 rounded-lg border flex flex-col items-center justify-center gap-1 font-mono text-xs sm:text-sm my-1 ${
                      isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200 shadow-inner'
                    }`}>
                      {steps.map(s => (
                        <div key={`pattern-row-${s.x}`} className="flex items-center gap-1.5 leading-relaxed">
                          <span className={isDark ? 'text-white/80 font-bold' : 'text-slate-700 font-bold'}>
                            {currentMission.slopeM}
                          </span>
                          <span
                            className="font-black"
                            style={{ color: isDark ? '#38bdf8' : '#0284c7' }}
                          >
                            ({s.x})
                          </span>
                          {currentMission.interceptB !== 0 && (
                            <span className={isDark ? 'text-white/80 font-bold' : 'text-slate-700 font-bold'}>
                              {currentMission.interceptB < 0 ? `- ${Math.abs(currentMission.interceptB)}` : `+ ${currentMission.interceptB}`}
                            </span>
                          )}
                          <span className={isDark ? 'text-white/80 font-bold' : 'text-slate-700 font-bold'}>=</span>
                          <span
                            className="font-black text-sm sm:text-base"
                            style={{ color: isDark ? '#34d399' : '#047857' }}
                          >
                            {s.expectedY}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Paso 4: Deducción Interactiva de la Fórmula */}
                    <div className="pt-1 space-y-1.5">
                      <span className={`text-[10px] sm:text-[11px] font-bold block ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        4. Traduce la regla a fórmula matemática: ¿cuál es la ecuación de la función?
                      </span>

                      <div className="grid grid-cols-2 gap-1.5">
                        {shuffledFormulaOptions.map((opt, idx) => {
                          const isSelected = selectedFormulaIdx === idx
                          const isCorrect = opt.isCorrect
                          return (
                            <button
                              key={`formula-opt-${opt.text}`}
                              onClick={() => handleSelectFormula(idx)}
                              className={`py-1.5 px-2 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? isCorrect
                                    ? isDark ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-500'
                                    : isDark ? 'bg-rose-950/70 border-rose-400 text-rose-200' : 'bg-rose-100 border-rose-500 text-rose-950 font-black'
                                  : isDark
                                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                              }`}
                            >
                              {opt.text}
                            </button>
                          )
                        })}
                      </div>

                      {formulaFeedback && (
                        <div className={`p-1.5 rounded border text-[10px] sm:text-[11px] font-medium flex items-start gap-1.5 animate-in fade-in duration-200 ${
                          formulaFeedback.isCorrect
                            ? isDark ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                            : isDark ? 'bg-rose-950/50 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                        }`}>
                          {formulaFeedback.isCorrect ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                          )}
                          <span>{formulaFeedback.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Paso 5: Reto de Predicción */}
                    {selectedFormulaIdx !== null && shuffledFormulaOptions[selectedFormulaIdx]?.isCorrect && (
                      <div className={`p-2 rounded-lg border space-y-1.5 animate-in fade-in duration-300 ${
                        isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-300'
                      }`}>
                        <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
                          <span className={`font-black text-[10px] sm:text-xs flex items-center gap-1 ${
                            isDark ? 'text-amber-300' : 'text-amber-900'
                          }`}>
                            <span>🎯 5. Reto de Predicción: Pon a prueba tu fórmula</span>
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-black border ${
                            isDark ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300' : 'bg-emerald-200 border-emerald-500 text-emerald-950'
                          }`}>
                            {currentMission.ruleFormula}
                          </span>
                        </div>

                        <p className={`text-[10px] sm:text-[11px] ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                          Si ingresamos la entrada <strong className="font-mono text-cyan-500 font-black">x = {currentMission.challengeX}</strong>, ¿cuál será el valor de la salida <strong className="font-mono text-emerald-600 font-black">y</strong>?
                        </p>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] sm:text-xs font-bold ${
                            isDark ? 'text-white/70' : 'text-slate-700'
                          }`}>
                            Salida y =
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowKb(true)}
                            className={`min-w-16 h-7 px-2.5 rounded font-mono text-center text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 ${
                              isDark
                                ? 'bg-slate-900 border-amber-400/60 text-amber-300 hover:border-amber-400'
                                : 'bg-white border-amber-500/70 text-amber-900 hover:border-amber-600 shadow-xs'
                            }`}
                            title="Tocar para abrir teclado virtual"
                          >
                            <span>{challengeUserGuess !== '' ? challengeUserGuess : '?'}</span>
                            <span className="text-[10px] opacity-70">⌨️</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCheckChallenge}
                            className="h-7 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] sm:text-xs cursor-pointer shadow-xs transition-all active:scale-95"
                          >
                            Comprobar
                          </button>
                        </div>

                        {challengeResolved && (
                          <div className={`p-1.5 rounded border text-[10px] sm:text-[11px] font-bold flex items-center justify-between animate-in fade-in duration-300 ${
                            isDark ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>
                                ¡Predicción exacta! {currentMission.slopeM} · ({currentMission.challengeX}){' '}
                                {currentMission.interceptB < 0 ? `- ${Math.abs(currentMission.interceptB)}` : currentMission.interceptB > 0 ? `+ ${currentMission.interceptB}` : ''}{' '}
                                = {currentMission.expectedChallengeY}. ¡Fórmula completamente dominada!
                              </span>
                            </div>
                            <button
                              onClick={() => setActiveTab('plane')}
                              className="h-5 px-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] cursor-pointer shrink-0 ml-1"
                            >
                              Ir al Plano →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 3: PLANO CARTESIANO OPTIMIZADO (AL LADO DERECHO EN HORIZONTAL)
          ========================================================================= */}
          {activeTab === 'plane' && (
            <div className={`flex-1 flex flex-col landscape:flex-row lg:flex-row gap-1.5 sm:gap-2 rounded-xl border p-1.5 sm:p-2 shadow-md overflow-hidden transition-colors ${
              isDark ? 'bg-[#0a1020] border-white/10' : 'bg-white border-slate-300 shadow-sm'
            }`}>

              {/* PANEL LATERAL DE COORDENADAS E INSTRUCCIÓN (A la izquierda en horizontal) */}
              <aside className={`w-full landscape:w-[210px] lg:w-[230px] shrink-0 flex flex-col justify-between rounded-lg p-2 border overflow-hidden ${
                isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1.5">
                  <div className={`flex items-center justify-between border-b pb-1 ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-white/60' : 'text-slate-600'
                    }`}>
                      Pares Ordenados (x; y):
                    </span>
                    {placedPoints.length < steps.length && (
                      <button
                        onClick={handleAutoPlaceAll}
                        className={`h-5 px-1.5 rounded text-[10px] transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-white/10 hover:bg-white/20 text-white/80'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs font-semibold'
                        }`}
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
                              ? isDark
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-400 font-black'
                              : isCurrent
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black animate-pulse'
                              : isDark
                              ? 'bg-white/5 text-white/50 border-white/10'
                              : 'bg-white text-slate-600 border-slate-200 font-medium'
                          }`}
                        >
                          {isDone ? (
                            <Check className={`h-2.5 w-2.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                          ) : isCurrent ? (
                            <Target className="h-2.5 w-2.5 text-slate-950 shrink-0" />
                          ) : (
                            <span className={`text-[8px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>•</span>
                          )}
                          <span>({st.x}; {st.expectedY})</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Instrucción o feedback pedagógico activo */}
                  <div className={`p-1.5 rounded border text-[10px] sm:text-[11px] leading-tight ${
                    isDark
                      ? 'bg-amber-950/50 border-amber-500/30 text-amber-200'
                      : 'bg-amber-50 border-2 border-amber-300 text-amber-950 font-semibold'
                  }`}>
                    {planeFeedback || (currentTargetPoint ? (
                      <>Toca la cuadrícula para ubicar: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-950 font-bold'}`}>({currentTargetPoint.x}; {currentTargetPoint.expectedY})</strong></>
                    ) : (
                      '¡Puntos ubicados! Observa que forman una recta.'
                    ))}
                  </div>
                </div>

                {/* Acciones al pie del panel lateral */}
                {placedPoints.length >= steps.length && (
                  <div className="mt-1.5">
                    <button
                      onClick={() => loadMission((missionIdx + 1) % MISSIONS.length)}
                      className="w-full h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow cursor-pointer"
                    >
                      <span>Misión Siguiente</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </aside>

              {/* PLANO CARTESIANO: AL LADO DERECHO OCUPANDO TODO EL ESPACIO POSIBLE */}
              <div className={`flex-1 min-w-0 h-full flex flex-col items-center justify-between rounded-lg border p-1 relative overflow-hidden transition-colors ${
                isDark ? 'bg-[#080e1e] border-white/10' : 'bg-slate-50 border-slate-200 shadow-inner'
              }`}>
                {/* Header compacto con indicador dinámico de coordenadas del puntero */}
                <div className="w-full h-6 shrink-0 flex items-center justify-between px-2 text-[10px]">
                  <span className={`font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                    Plano Cartesiano <span className="font-mono text-[9px] font-normal opacity-70">[-2 a 10]</span>
                  </span>
                  <div
                    className={`flex items-center gap-1 font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded transition-opacity duration-150 ${
                      hoverCoord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <span>Puntero:</span>
                    <span className="font-bold text-white">
                      ({hoverCoord?.x ?? 0}; {hoverCoord?.y ?? 0})
                    </span>
                  </div>
                </div>

                <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    onPointerDown={handlePlaneClick}
                    onPointerMove={handlePlanePointerMove}
                    onPointerLeave={handlePlanePointerLeave}
                    className="w-full h-full max-h-full max-w-full select-none cursor-crosshair drop-shadow-md rounded-lg"
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
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isDark ? "#38bdf8" : "#0284c7"} />
                    </marker>
                    <pattern id="descubrirGridSub" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path
                        d="M 10 0 L 0 0 0 10"
                        fill="none"
                        stroke={isDark ? "#1e293b" : "#f1f5f9"}
                        strokeWidth="0.6"
                      />
                    </pattern>
                    <clipPath id="descubrirPlotArea">
                      <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
                    </clipPath>
                  </defs>

                  {/* Fondo del plano */}
                  <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill={isDark ? "#080e1e" : "#ffffff"} rx="6" />
                  <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="url(#descubrirGridSub)" rx="6" />

                  {/* Cuadrícula Principal - Líneas Verticales (de -2 a 10 en X) */}
                  {Array.from({ length: MAX_X - MIN_X + 1 }, (_, i) => i + MIN_X).map(gx => {
                    const px = toSvgX(gx)
                    if (gx === 0) return null // Eje principal dibujado con mayor grosor abajo
                    return (
                      <line
                        key={`gx-${gx}`}
                        x1={px}
                        y1={PAD_TOP}
                        x2={px}
                        y2={SVG_SIZE - PAD_BOTTOM}
                        stroke={isDark ? "#64748b" : "#94a3b8"}
                        strokeWidth={1.2}
                        strokeDasharray="3,3"
                        opacity={isDark ? 0.65 : 0.8}
                      />
                    )
                  })}

                  {/* Cuadrícula Principal - Líneas Horizontales (de -2 a 10 en Y) */}
                  {Array.from({ length: MAX_Y - MIN_Y + 1 }, (_, i) => i + MIN_Y).map(gy => {
                    const py = toSvgY(gy)
                    if (gy === 0) return null // Eje principal dibujado con mayor grosor abajo
                    return (
                      <line
                        key={`gy-${gy}`}
                        x1={PAD_LEFT}
                        y1={py}
                        x2={SVG_SIZE - PAD_RIGHT}
                        y2={py}
                        stroke={isDark ? "#64748b" : "#94a3b8"}
                        strokeWidth={1.2}
                        strokeDasharray="3,3"
                        opacity={isDark ? 0.65 : 0.8}
                      />
                    )
                  })}

                  {/* Eje X principal (y = 0) */}
                  <line
                    x1={PAD_LEFT - 8}
                    y1={toSvgY(0)}
                    x2={SVG_SIZE - PAD_RIGHT + 10}
                    y2={toSvgY(0)}
                    stroke={isDark ? "#38bdf8" : "#0284c7"}
                    strokeWidth={2.5}
                    markerEnd="url(#arrow)"
                  />

                  {/* Eje Y principal (x = 0) */}
                  <line
                    x1={toSvgX(0)}
                    y1={SVG_SIZE - PAD_BOTTOM + 8}
                    x2={toSvgX(0)}
                    y2={PAD_TOP - 10}
                    stroke={isDark ? "#38bdf8" : "#0284c7"}
                    strokeWidth={2.5}
                    markerEnd="url(#arrow)"
                  />

                  {/* Etiquetas y Ticks del Eje X (-2 a 10) */}
                  {[-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(vx => (
                    <g key={`tx-${vx}`} className="select-none">
                      <line
                        x1={toSvgX(vx)}
                        y1={toSvgY(0) - 3}
                        x2={toSvgX(vx)}
                        y2={toSvgY(0) + 3}
                        stroke={isDark ? "#38bdf8" : "#0284c7"}
                        strokeWidth={vx === 0 ? 0 : 1.2}
                      />
                      <text
                        x={toSvgX(vx)}
                        y={toSvgY(0) + 14}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                        fill={vx === 0 ? (isDark ? "#38bdf8" : "#0284c7") : (isDark ? "#f8fafc" : "#0f172a")}
                      >
                        {vx}
                      </text>
                    </g>
                  ))}

                  {/* Etiquetas y Ticks del Eje Y (-2 a 10) */}
                  {[-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(vy => (
                    <g key={`ty-${vy}`} className="select-none">
                      <line
                        x1={toSvgX(0) - 3}
                        y1={toSvgY(vy)}
                        x2={toSvgX(0) + 3}
                        y2={toSvgY(vy)}
                        stroke={isDark ? "#38bdf8" : "#0284c7"}
                        strokeWidth={1.2}
                      />
                      <text
                        x={toSvgX(0) - 8}
                        y={toSvgY(vy)}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                        fill={isDark ? "#f8fafc" : "#0f172a"}
                      >
                        {vy}
                      </text>
                    </g>
                  ))}

                  {/* Rótulos x e y */}
                  <text
                    x={SVG_SIZE - PAD_RIGHT + 12}
                    y={toSvgY(0) + 4}
                    fill={isDark ? "#38bdf8" : "#0284c7"}
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="Nunito, sans-serif"
                  >
                    X
                  </text>
                  <text
                    x={toSvgX(0)}
                    y={PAD_TOP - 12}
                    fill={isDark ? "#38bdf8" : "#0284c7"}
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="Nunito, sans-serif"
                  >
                    Y
                  </text>

                  {/* Recta continua si se ubicaron todos los puntos o se descubrió la regla */}
                  {linePoints && (
                    <g clipPath="url(#descubrirPlotArea)">
                      {/* Brillo de fondo */}
                      <line
                        x1={linePoints.x1}
                        y1={linePoints.y1}
                        x2={linePoints.x2}
                        y2={linePoints.y2}
                        stroke="#06b6d4"
                        strokeWidth={8}
                        strokeLinecap="round"
                        opacity={0.3}
                      />
                      {/* Recta continua nítida */}
                      <line
                        x1={linePoints.x1}
                        y1={linePoints.y1}
                        x2={linePoints.x2}
                        y2={linePoints.y2}
                        stroke={isDark ? "#38bdf8" : "#0284c7"}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        opacity={0.95}
                      />
                    </g>
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
                          r={6}
                          fill="#38bdf8"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        <text
                          x={sx + 8}
                          y={sy - 6}
                          fill={isDark ? "#e2e8f0" : "#0f172a"}
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          ({st.x}; {st.expectedY})
                        </text>
                      </g>
                    )
                  })}
                </svg>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TECLADO VIRTUAL FLOTANTE (Reto de Predicción)
      ────────────────────────────────────────────────────────────────────────── */}
      {showKb && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowKb(false)}
          />
          <div
            className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[270px] lg:w-[290px] rounded-xl border shadow-2xl p-3 select-none animate-in zoom-in-95 duration-150 ${
              isDark
                ? 'bg-[#0f172a] border-amber-500/40 text-white'
                : 'bg-white border-amber-500 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between pb-1.5 border-b mb-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                <span>⌨️ Ingresa la Salida (y)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowKb(false)}
                className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                  isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Cerrar teclado"
              >
                ✕
              </button>
            </div>

            {/* Display de valor actual */}
            <div
              className={`mb-2 py-1 px-3 rounded-lg border font-mono text-center flex items-center justify-center h-9 ${
                isDark ? 'bg-black/40 border-white/10 text-emerald-300' : 'bg-slate-50 border-slate-200 text-emerald-700'
              }`}
            >
              <span className="text-xs mr-2 font-sans font-bold opacity-70">y =</span>
              <span className="text-lg font-black">{challengeUserGuess !== '' ? challengeUserGuess : '?'}</span>
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono font-bold">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKbPress(key)}
                  className={`h-8 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer ${
                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKbPress('±')}
                className={`h-8 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-amber-800'
                }`}
                title="Cambiar signo (+/-)"
              >
                ±
              </button>
              <button
                type="button"
                onClick={() => handleKbPress('0')}
                className={`h-8 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKbPress('backspace')}
                className={`h-8 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                }`}
                title="Borrar dígito"
              >
                ⌫
              </button>
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleKbPress('clear')}
                className={`h-7 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCheckChallenge()
                  setShowKb(false)
                }}
                className="h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>✓ Comprobar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL DE AYUDA PEDAGÓGICA (ModalHelp)
      ────────────────────────────────────────────────────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía: Cómo descubrir la Función con la Máquina"
        bgColor={isDark ? "#0a1020" : "#ffffff"}
        titleColor={isDark ? "#ffffff" : "#0f172a"}
        maxWidth="max-w-md"
        buttonColor="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
      >
        <div className={`space-y-4 text-xs sm:text-sm ${isDark ? "text-white/90" : "text-slate-700"}`}>
          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? "text-amber-300" : "text-amber-700"
            }`}>
              1. La Máquina de Entrada y Salida
            </h4>
            <p className={isDark ? "text-white/80" : "text-slate-600"}>
              Una función matemática funciona como una máquina: recibe un número <code className={`px-1 py-0.5 rounded font-mono font-bold ${
                isDark ? "bg-white/10 text-amber-200" : "bg-slate-100 text-amber-900 border border-slate-300"
              }`}>x</code>, le aplica una regla secreta y devuelve un único resultado <code className={`px-1 py-0.5 rounded font-mono font-bold ${
                isDark ? "bg-white/10 text-amber-200" : "bg-slate-100 text-amber-900 border border-slate-300"
              }`}>y</code>.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? "text-cyan-300" : "text-cyan-800"
            }`}>
              2. Tabla y Pares Ordenados (x, y)
            </h4>
            <p className={isDark ? "text-white/80" : "text-slate-600"}>
              Cada prueba genera un par <code className={`px-1 py-0.5 rounded font-mono font-bold ${
                isDark ? "bg-white/10 text-cyan-200" : "bg-slate-100 text-cyan-900 border border-slate-300"
              }`}>(x, y)</code>. Por ejemplo, si con entrada 1 sale 1, el par es <code className={`px-1 py-0.5 rounded font-mono font-bold ${
                isDark ? "bg-white/10 text-cyan-200" : "bg-slate-100 text-cyan-900 border border-slate-300"
              }`}>(1, 1)</code>; con entrada 2 sale 3, el par es <code className={`px-1 py-0.5 rounded font-mono font-bold ${
                isDark ? "bg-white/10 text-cyan-200" : "bg-slate-100 text-cyan-900 border border-slate-300"
              }`}>(2, 3)</code>.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? "text-emerald-300" : "text-emerald-700"
            }`}>
              3. Ubicación en el Plano Cartesiano
            </h4>
            <ul className={`list-disc pl-5 space-y-0.5 ${isDark ? "text-white/70" : "text-slate-600"}`}>
              <li>El primer valor <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>x</strong> te indica cuánto avanzar en horizontal (eje X).</li>
              <li>El segundo valor <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>y</strong> te indica cuánto subir o bajar en vertical (eje Y).</li>
              <li>Al ubicar varios puntos de una función lineal o afín, notarás que todos quedan en una línea recta.</li>
            </ul>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
