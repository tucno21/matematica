import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Shuffle,
  Play,
  Pause,
  ArrowUpDown,
  Sparkles,
  Trophy,
  CheckCircle2,
  Calculator,
  Crown,
  Layers,
  ChevronRight,
  Info,
  Lock
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ExerciseMode = 'guiado' | 'reto'
type GuidedStep =
  | 'datos'        // Paso 1: Solo muestra 30 datos, hacer clic en menor y mayor
  | 'rango'        // Paso 2: Calcular Rango (R = Xmax - Xmin)
  | 'intervalos'   // Paso 3: Hallar los intervalos (k)
  | 'amplitud'     // Paso 4: Calcular la amplitud (A = R / k)
  | 'conteo'       // Paso 5: Conteo y llenado de la tabla de frecuencias

interface GroupedDataset {
  id: string
  title: string
  variableName: string
  unit: string
  icon: string
  sample: number[]
  suggestedK: number // normalmente 5 o 6
}

interface IntervalRow {
  index: number
  li: number
  ls: number
  isLast: boolean
  label: string
  xi: number // Marca de clase
  fi: number
  Fi: number
  hi: number
  hiPct: number
  color: string
}

interface StatsResult {
  N: number
  minVal: number
  maxVal: number
  R: number
  sturgesK: number
  rootK: number
  k: number
  exactA: number
  A: number
  RPrime: number
  intervals: IntervalRow[]
  totalCounted: number
  isComplete: boolean
  modalInterval: IntervalRow | null
}

// ─── Datasets Cuantitativos Realistas para Secundaria (N = 30) ────────────────
const DATASETS: GroupedDataset[] = [
  {
    id: 'estaturas',
    title: 'Estatura',
    variableName: 'Estatura de 30 estudiantes',
    unit: 'cm',
    icon: '📏',
    suggestedK: 5,
    sample: [
      // [142 - 148): fi = 3 (10%)
      142, 144, 146,
      // [148 - 154): fi = 6 (20%)
      148, 149, 150, 151, 152, 153,
      // [154 - 160): fi = 12 (40% - Clase Modal con pico claro)
      154, 155, 155, 156, 156, 157, 157, 158, 158, 158, 159, 159,
      // [160 - 166): fi = 6 (20%)
      160, 161, 162, 163, 164, 165,
      // [166 - 172]: fi = 3 (10%)
      167, 169, 172
    ]
  },
  {
    id: 'pesos',
    title: 'Peso',
    variableName: 'Masa corporal de 30 adolescentes',
    unit: 'kg',
    icon: '⚖️',
    suggestedK: 5,
    sample: [
      // [40 - 46): fi = 4 (~13.3%)
      40, 42, 43, 45,
      // [46 - 52): fi = 8 (~26.7%)
      46, 47, 48, 48, 49, 50, 51, 51,
      // [52 - 58): fi = 11 (~36.7% - Clase Modal)
      52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57,
      // [58 - 64): fi = 5 (~16.7%)
      58, 59, 60, 61, 63,
      // [64 - 70]: fi = 2 (~6.7%)
      66, 70
    ]
  },
  {
    id: 'edades',
    title: 'Edades',
    variableName: 'Edades de 30 participantes',
    unit: 'años',
    icon: '🎂',
    suggestedK: 5,
    sample: [
      // [10 - 13): fi = 4 (~13.3%)
      10, 11, 12, 12,
      // [13 - 16): fi = 11 (~36.7% - Clase Modal)
      13, 13, 13, 14, 14, 14, 14, 15, 15, 15, 15,
      // [16 - 19): fi = 8 (~26.7%)
      16, 16, 16, 17, 17, 18, 18, 18,
      // [19 - 22): fi = 4 (~13.3%)
      19, 20, 20, 21,
      // [22 - 25]: fi = 3 (10%)
      22, 23, 25
    ]
  },
  {
    id: 'tiempos',
    title: 'Estudio',
    variableName: 'Horas de estudio mensual de 30 alumnos',
    unit: 'h',
    icon: '⏱️',
    suggestedK: 5,
    sample: [
      // [5 - 11): fi = 3 (10%)
      5, 7, 9,
      // [11 - 17): fi = 8 (~26.7%)
      11, 12, 13, 14, 14, 15, 16, 16,
      // [17 - 23): fi = 12 (40% - Clase Modal)
      17, 18, 18, 19, 19, 20, 20, 20, 21, 21, 22, 22,
      // [23 - 29): fi = 5 (~16.7%)
      23, 24, 25, 27, 28,
      // [29 - 35]: fi = 2 (~6.7%)
      31, 35
    ]
  }
]

const PALETTE = [
  '#0284c7', // Sky-600
  '#0d9488', // Teal-600
  '#d97706', // Amber-600
  '#7c3aed', // Violet-600
  '#e11d48', // Rose-600
  '#059669'  // Emerald-600
]

// Barritas de palotes para conteo
function TallyMarks({ count, colorHex }: { count: number; colorHex: string }) {
  if (count <= 0) return <span className="opacity-30 italic font-mono text-[10px]">—</span>
  const groupsOfFive = Math.floor(count / 5)
  const remainder = count % 5

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: groupsOfFive }).map((_, gIdx) => (
        <div
          key={`g5-${gIdx}`}
          className="relative inline-flex items-center h-4.5 w-4.5 justify-between px-0.5"
          title="Grupo de 5 palotes"
        >
          <div className="w-[2.5px] h-4 rounded-full" style={{ backgroundColor: colorHex }} />
          <div className="w-[2.5px] h-4 rounded-full" style={{ backgroundColor: colorHex }} />
          <div className="w-[2.5px] h-4 rounded-full" style={{ backgroundColor: colorHex }} />
          <div className="w-[2.5px] h-4 rounded-full" style={{ backgroundColor: colorHex }} />
          {/* Línea diagonal tachando los 4 palotes */}
          <div
            className="absolute left-[-1px] top-[7px] w-[20px] h-[2.5px] rounded-full rotate-[-32deg] origin-center shadow-xs"
            style={{ backgroundColor: colorHex }}
          />
        </div>
      ))}
      {remainder > 0 && (
        <div className="inline-flex items-center h-4.5 gap-0.5">
          {Array.from({ length: remainder }).map((_, rIdx) => (
            <div
              key={`rem-${rIdx}`}
              className="w-[2.5px] h-4 rounded-full"
              style={{ backgroundColor: colorHex }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Mezclador de Fisher-Yates para mostrar los datos de forma desorganizada/aleatoria
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const STEP_ORDER: GuidedStep[] = ['datos', 'rango', 'intervalos', 'amplitud', 'conteo']

export default function DatosAgrupadosView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Estado general
  const [datasetId, setDatasetId] = useState<string>('estaturas')
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('guiado')
  const [guidedStep, setGuidedStep] = useState<GuidedStep>('datos')
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<GuidedStep>('datos')
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [isSorted, setIsSorted] = useState<boolean>(false)

  // Animación de construcción de intervalos en Paso 4 (Amplitud)
  const [animStepIndex, setAnimStepIndex] = useState<number>(0)
  const [animPhase, setAnimPhase] = useState<'sumando' | 'formado'>('sumando')
  const [isAnimRunning, setIsAnimRunning] = useState<boolean>(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selección interactiva de Mínimo y Máximo en Paso 1 (Datos)
  const [selectedMin, setSelectedMin] = useState<number | null>(null)
  const [selectedMax, setSelectedMax] = useState<number | null>(null)
  const [targetToSelect, setTargetToSelect] = useState<'min' | 'max'>('min')
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null)

  // Dataset activo
  const currentDataset = useMemo(() => {
    return DATASETS.find((d) => d.id === datasetId) || DATASETS[0]
  }, [datasetId])

  // Muestra de 30 datos (inicializada de forma aleatoria/desorganizada)
  const [rawSample, setRawSample] = useState<number[]>(() => shuffleArray(DATASETS[0].sample))
  // Estado de tachado de cada dato al contar
  const [tachados, setTachados] = useState<boolean[]>(() => new Array(30).fill(false))
  // Número de intervalos elegido (k)
  const [selectedK, setSelectedK] = useState<number>(currentDataset.suggestedK)

  // Generar o restablecer datos aleatorios al cambiar dataset
  useEffect(() => {
    setRawSample(shuffleArray(currentDataset.sample))
    setTachados(new Array(currentDataset.sample.length).fill(false))
    setSelectedK(currentDataset.suggestedK)
    setGuidedStep('datos')
    setMaxUnlockedStep('datos')
    setIsSorted(false)
    setSelectedMin(null)
    setSelectedMax(null)
    setTargetToSelect('min')
    setSelectionFeedback(null)
    setRetoFeedback(null)
    setRetoInputs({
      min: '',
      max: '',
      rango: '',
      k: '',
      amplitud: '',
      intervals: {}
    })
  }, [currentDataset])

  // Muestra visual (ordenada o desorganizada)
  const displaySample = useMemo(() => {
    const list = rawSample.map((val, originalIdx) => ({
      val,
      originalIdx,
      isTachado: tachados[originalIdx]
    }))
    if (isSorted) {
      return [...list].sort((a, b) => a.val - b.val)
    }
    return list
  }, [rawSample, isSorted, tachados])

  // ¿La tabla de frecuencias en el panel derecho debe estar en espera vacía?
  const isTableWaiting =
    exerciseMode === 'guiado' &&
    (guidedStep === 'datos' ||
      guidedStep === 'rango' ||
      guidedStep === 'intervalos' ||
      guidedStep === 'amplitud')

  // ─── Cálculos Estadísticos de Parámetros (R, k, A) ───────────────────────────
  const stats = useMemo<StatsResult>(() => {
    const N = rawSample.length
    const minVal = Math.min(...rawSample)
    const maxVal = Math.max(...rawSample)
    const R = maxVal - minVal

    // Regla de Sturges: k = 1 + 3.322 * log10(N)
    const sturgesK = Math.round(1 + 3.322 * Math.log10(N))
    const rootK = Math.round(Math.sqrt(N))
    const k = selectedK

    // Amplitud A = ceil(R / k)
    const exactA = R / k
    const A = Math.ceil(exactA) === exactA ? exactA : Math.ceil(exactA)
    const RPrime = k * A // Rango ampliado si hubo redondeo

    // Construir la estructura de intervalos
    const intervals: IntervalRow[] = []
    let currentLi = minVal

    for (let i = 0; i < k; i++) {
      const li = currentLi
      const ls = li + A
      const isLast = i === k - 1
      const label = isLast ? `[${li} - ${ls}]` : `[${li} - ${ls})`
      const xi = (li + ls) / 2

      // Conteo de cuántos datos caen en este intervalo (teniendo en cuenta los ya tachados)
      const countInInterval = rawSample.reduce((acc, val, idx) => {
        if (!tachados[idx]) return acc
        if (isLast) {
          return val >= li && val <= ls ? acc + 1 : acc
        }
        return val >= li && val < ls ? acc + 1 : acc
      }, 0)

      intervals.push({
        index: i,
        li,
        ls,
        isLast,
        label,
        xi,
        fi: countInInterval,
        Fi: 0, // Se calcula abajo en acumulado
        hi: countInInterval / N,
        hiPct: (countInInterval / N) * 100,
        color: PALETTE[i % PALETTE.length]
      })

      currentLi = ls
    }

    // Calcular frecuencias acumuladas (Fi)
    let cumulative = 0
    intervals.forEach((row) => {
      cumulative += row.fi
      row.Fi = cumulative
    })

    const totalCounted = tachados.filter(Boolean).length
    const isComplete = totalCounted === N

    // Clase modal (intervalo con mayor fi)
    let maxFi = -1
    let modalInterval: IntervalRow | null = null
    intervals.forEach((row) => {
      if (row.fi > maxFi) {
        maxFi = row.fi
        modalInterval = row
      }
    })

    return {
      N,
      minVal,
      maxVal,
      R,
      sturgesK,
      rootK,
      k,
      exactA,
      A,
      RPrime,
      intervals,
      totalCounted,
      isComplete,
      modalInterval
    }
  }, [rawSample, tachados, selectedK])

  // Animación secuencial de formación de intervalos en Paso 4 (Amplitud)
  const runStep = useCallback((stepIdx: number, total: number) => {
    if (stepIdx >= total) {
      setAnimStepIndex(total)
      setIsAnimRunning(false)
      return
    }

    setAnimStepIndex(stepIdx)
    setAnimPhase('sumando')
    setIsAnimRunning(true)

    animTimerRef.current = setTimeout(() => {
      setAnimPhase('formado')
      animTimerRef.current = setTimeout(() => {
        runStep(stepIdx + 1, total)
      }, 500)
    }, 750)
  }, [])

  const handleReplayIntervalAnim = useCallback(() => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    runStep(0, stats.intervals.length)
  }, [runStep, stats.intervals.length])

  useEffect(() => {
    if (guidedStep === 'amplitud') {
      handleReplayIntervalAnim()
    } else {
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
      setIsAnimRunning(false)
    }
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
    }
  }, [guidedStep, handleReplayIntervalAnim])

  // Alternar tachado de un dato individual
  const handleToggleTachado = useCallback((originalIdx: number) => {
    setTachados((prev) => {
      const next = [...prev]
      next[originalIdx] = !next[originalIdx]
      return next
    })
  }, [])

  // Tachar todos los datos automáticamente
  const handleTacharTodos = useCallback(() => {
    setTachados(new Array(rawSample.length).fill(true))
  }, [rawSample.length])

  // Reiniciar conteo
  const handleResetConteo = useCallback(() => {
    setTachados(new Array(rawSample.length).fill(false))
    if (autoCountTimerRef.current) {
      clearInterval(autoCountTimerRef.current)
      setIsAutoCounting(false)
    }
  }, [rawSample.length])

  // Generar nueva muestra aleatoria pero con distribución pedagógica (campana realista)
  const handleNewSample = useCallback(() => {
    const baseMin = Math.min(...currentDataset.sample)
    const baseMax = Math.max(...currentDataset.sample)
    const k = currentDataset.suggestedK || 5
    const A = Math.round((baseMax - baseMin) / k)

    // Patrones de frecuencias realistas (con clase modal y extremos suaves) que suman 30
    const patterns = [
      [3, 6, 12, 6, 3],
      [4, 8, 11, 5, 2],
      [3, 7, 12, 5, 3],
      [4, 7, 11, 6, 2],
      [3, 8, 11, 6, 2]
    ]
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)]

    const newSample: number[] = []
    let currentLi = baseMin

    for (let i = 0; i < k; i++) {
      const li = currentLi
      const ls = li + A
      const isLast = i === k - 1
      const count = chosenPattern[i]

      for (let j = 0; j < count; j++) {
        if (i === 0 && j === 0) {
          newSample.push(baseMin)
        } else if (isLast && j === count - 1) {
          newSample.push(baseMax)
        } else {
          const maxValInInterval = isLast ? ls : ls - 1
          const val = li + Math.floor(Math.random() * (maxValInInterval - li + 1))
          newSample.push(val)
        }
      }
      currentLi = ls
    }

    setRawSample(shuffleArray(newSample))
    setTachados(new Array(30).fill(false))
    setIsSorted(false)
    setRetoFeedback(null)
    setSelectedMin(null)
    setSelectedMax(null)
    setMaxUnlockedStep('datos')
    setGuidedStep('datos')
    setTargetToSelect('min')
    setSelectionFeedback(null)
  }, [currentDataset])

  const isDatosCompleted = stats.minVal !== undefined && selectedMin === stats.minVal && selectedMax === stats.maxVal

  const isStepAccessible = useCallback(
    (stepId: GuidedStep): boolean => {
      if (stepId === 'datos') return true
      if (!isDatosCompleted) return false
      if (stepId === 'rango') return true
      const targetIdx = STEP_ORDER.indexOf(stepId)
      const maxIdx = STEP_ORDER.indexOf(maxUnlockedStep)
      return targetIdx <= maxIdx
    },
    [isDatosCompleted, maxUnlockedStep]
  )

  const handleStepClick = useCallback(
    (targetStep: GuidedStep) => {
      if (!isStepAccessible(targetStep)) {
        if (!isDatosCompleted) {
          setSelectionFeedback('⚠️ Selecciona primero el Dato Menor y el Dato Mayor en la muestra de arriba.')
        }
        return
      }
      setGuidedStep(targetStep)
    },
    [isStepAccessible, isDatosCompleted]
  )

  // Clic interactivo en los datos:
  // - En Paso 1 ('datos'): selecciona Mínimo o Máximo
  // - En demás pasos: conmuta tachado para el conteo
  const handleChipClick = useCallback(
    (itemVal: number, originalIdx: number) => {
      if (guidedStep === 'datos' && exerciseMode === 'guiado') {
        if (targetToSelect === 'min') {
          if (itemVal === stats.minVal) {
            setSelectedMin(itemVal)
            setSelectionFeedback(`¡Correcto! ${itemVal} es el dato menor (Mínimo). Ahora busca el dato mayor.`)
            setTargetToSelect('max')
            if (selectedMax === stats.maxVal) {
              setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 1 ? 'rango' : prev))
            }
          } else {
            setSelectionFeedback(`El número ${itemVal} no es el menor. Hay un valor más pequeño en la muestra. ¡Búscalo!`)
          }
        } else {
          if (itemVal === stats.maxVal) {
            setSelectedMax(itemVal)
            setSelectionFeedback(`¡Excelente! ${itemVal} es el dato mayor (Máximo). ¡Ambos extremos identificados!`)
            if (selectedMin === stats.minVal) {
              setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 1 ? 'rango' : prev))
            }
          } else {
            setSelectionFeedback(`El número ${itemVal} no es el mayor. Hay un valor más grande en la muestra. ¡Búscalo!`)
          }
        }
        return
      }

      handleToggleTachado(originalIdx)
    },
    [guidedStep, exerciseMode, targetToSelect, stats.minVal, stats.maxVal, selectedMin, selectedMax, handleToggleTachado]
  )

  // Intervalo activo seleccionado para inspección
  const [selectedIntervalIdx, setSelectedIntervalIdx] = useState<number>(0)

  // ─── Modo Reto: Respuestas del Usuario ───────────────────────────────────────
  const [retoInputs, setRetoInputs] = useState<{
    min: string
    max: string
    rango: string
    k: string
    amplitud: string
    intervals: Record<number, { li: string; ls: string; xi: string; fi: string }>
  }>({
    min: '',
    max: '',
    rango: '',
    k: '',
    amplitud: '',
    intervals: {}
  })

  const [retoFeedback, setRetoFeedback] = useState<{
    checked: boolean
    score: number
    total: number
    errors: string[]
  } | null>(null)

  // Comprobar respuestas en modo reto
  const handleCheckReto = useCallback(() => {
    let score = 0
    let total = 5 + stats.intervals.length * 4
    const errors: string[] = []

    if (parseInt(retoInputs.min, 10) === stats.minVal) score++
    else errors.push('Valor Mínimo incorrecto')

    if (parseInt(retoInputs.max, 10) === stats.maxVal) score++
    else errors.push('Valor Máximo incorrecto')

    if (parseInt(retoInputs.rango, 10) === stats.R) score++
    else errors.push('Rango R incorrecto (R = Max - Min)')

    if (parseInt(retoInputs.k, 10) === stats.k) score++
    else errors.push(`Número de intervalos k incorrecto (se sugiere k = ${stats.k})`)

    if (parseInt(retoInputs.amplitud, 10) === stats.A) score++
    else errors.push(`Amplitud A incorrecta (A = R ÷ k)`)

    stats.intervals.forEach((row, i) => {
      const user = retoInputs.intervals[i] || { li: '', ls: '', xi: '', fi: '' }
      if (parseInt(user.li, 10) === row.li) score++
      if (parseInt(user.ls, 10) === row.ls) score++
      if (parseFloat(user.xi) === row.xi) score++
      if (parseInt(user.fi, 10) === row.fi) score++
    })

    setRetoFeedback({
      checked: true,
      score,
      total,
      errors
    })
  }, [retoInputs, stats])

  // Auto-conteo animado paso a paso
  const [isAutoCounting, setIsAutoCounting] = useState<boolean>(false)
  const autoCountTimerRef = useRef<number | null>(null)

  const handleToggleAutoCount = useCallback(() => {
    if (isAutoCounting) {
      if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
      setIsAutoCounting(false)
    } else {
      setIsAutoCounting(true)
      autoCountTimerRef.current = window.setInterval(() => {
        setTachados((prev) => {
          const nextUntouched = prev.findIndex((t) => !t)
          if (nextUntouched === -1) {
            if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
            setIsAutoCounting(false)
            return prev
          }
          const next = [...prev]
          next[nextUntouched] = true
          return next
        })
      }, 700)
    }
  }, [isAutoCounting])

  useEffect(() => {
    return () => {
      if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
    }
  }, [])

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden select-none ${
        isDark ? 'bg-[#080c18] text-white' : 'bg-[#f1f5f9] text-slate-900'
      }`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera Principal (h-9 a lg:h-11) ──────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 z-20 ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 lg:gap-2">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1 px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-lg border text-[11px] lg:text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Volver a la página principal"
          >
            <ArrowLeft className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-base lg:text-lg">📊</span>
            <h1 className="text-xs lg:text-sm font-black tracking-tight flex items-center gap-1.5">
              <span>Datos Agrupados</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9.5px] lg:text-[10.5px] font-bold bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/25">
                INTERVALOS DE CLASE
              </span>
            </h1>
          </div>
        </div>

        {/* Selector de Modo: Guiado vs Reto */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center p-0.5 rounded-lg border text-[11px] font-bold ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setExerciseMode('guiado')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                exerciseMode === 'guiado'
                  ? 'bg-sky-600 text-white shadow-xs font-black'
                  : isDark
                  ? 'text-white/60 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={exerciseMode === 'guiado' ? { color: '#ffffff' } : undefined}
            >
              <Sparkles className="h-3 w-3" />
              <span>Guiado</span>
            </button>
            <button
              onClick={() => setExerciseMode('reto')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                exerciseMode === 'reto'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : isDark
                  ? 'text-white/60 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={exerciseMode === 'reto' ? { color: '#ffffff' } : undefined}
            >
              <Trophy className="h-3 w-3" />
              <span>Reto</span>
            </button>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className={`p-1 lg:p-1.5 rounded-lg border transition-all cursor-pointer ${
              isDark
                ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Ver guía pedagógica de fórmulas y conceptos"
          >
            <HelpCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Barra de Contexto y Herramientas (h-7 a lg:h-9) ────────────────── */}
      <div
        className={`flex items-center justify-between border-b px-2 lg:px-4 py-0.5 text-[10px] lg:text-xs z-10 no-scrollbar overflow-x-auto ${
          isDark ? 'bg-[#0b1120] border-white/5' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Temas / Variables Cuantitativas */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold opacity-60 mr-0.5 hidden sm:inline">Variable:</span>
          {DATASETS.map((ds) => {
            const isSelected = ds.id === datasetId
            return (
              <button
                key={ds.id}
                onClick={() => setDatasetId(ds.id)}
                className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? isDark
                      ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-400/50'
                      : 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-600'
                    : isDark
                    ? 'bg-white/5 text-white/70 hover:bg-white/10'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
                style={isSelected && !isDark ? { color: '#ffffff' } : undefined}
              >
                <span>{ds.icon}</span>
                <span>{ds.title}</span>
              </button>
            )
          })}
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Ordenar / Desordenar */}
          <button
            onClick={() => setIsSorted((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isSorted
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'bg-white/10 text-white/80 hover:bg-white/15'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-xs'
            }`}
            style={isSorted ? { color: '#ffffff' } : undefined}
            title={isSorted ? 'Ver en orden desorganizado (original)' : 'Ordenar de menor a mayor'}
          >
            <ArrowUpDown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span>{isSorted ? 'Desordenar' : 'Ordenar'}</span>
          </button>

          {/* Nueva Muestra */}
          <button
            onClick={handleNewSample}
            className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30'
                : 'bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200'
            }`}
            title="Generar nueva muestra aleatoria"
          >
            <Shuffle className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden md:inline">Nueva</span>
          </button>

          {/* Reiniciar Conteo */}
          <button
            onClick={handleResetConteo}
            className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
            }`}
            title="Reiniciar el conteo de datos"
          >
            <RotateCcw className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden md:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* ── 3. Área de Trabajo Principal (flex-1 min-h-0) CERO SCROLL ──────────── */}
      <main className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-3 py-1 gap-1.5 lg:gap-2">
        {/* ════════════════════════════════════════════════════════════════════
            PANEL IZQUIERDO: ETAPAS DE CONSTRUCCIÓN PEDAGÓGICA Y MUESTRA
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className={`flex-1 min-w-0 min-h-0 rounded-xl border flex flex-col overflow-hidden transition-all ${
            isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Cabecera del Panel Izquierdo con Selector de Pasos */}
          <div
            className={`px-2 py-1 border-b shrink-0 flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-black text-sky-500">
              <Layers className="h-3.5 w-3.5" />
              <span>1. Proceso de Agrupación</span>
            </div>

            {/* Stepper de Pasos Guiados */}
            {exerciseMode === 'guiado' ? (
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'datos', label: '1. Datos' },
                  { id: 'rango', label: '2. Rango' },
                  { id: 'intervalos', label: '3. k' },
                  { id: 'amplitud', label: '4. Amplitud' },
                  { id: 'conteo', label: '5. Conteo' }
                ].map((s) => {
                  const isAccessible = isStepAccessible(s.id as GuidedStep)
                  const isActive = guidedStep === s.id
                  return (
                    <button
                      key={s.id}
                      disabled={!isAccessible}
                      onClick={() => handleStepClick(s.id as GuidedStep)}
                      title={
                        !isAccessible
                          ? !isDatosCompleted
                            ? 'Selecciona primero el Dato Menor y Dato Mayor'
                            : 'Completa los pasos anteriores primero'
                          : s.label
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white font-black shadow-xs cursor-pointer'
                          : !isAccessible
                          ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600'
                          : isDark
                          ? 'text-white/70 hover:text-white hover:bg-white/5 cursor-pointer'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer'
                      }`}
                      style={isActive ? { color: '#ffffff' } : undefined}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <button
                onClick={handleCheckReto}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10.5px] cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 transition-all"
              >
                <Trophy className="h-3 w-3" />
                <span>Comprobar Reto</span>
              </button>
            )}
          </div>

          {/* Contenido Dinámico del Panel Izquierdo según el Paso o Modo Reto */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 lg:p-2 flex flex-col justify-between gap-1.5">
            {exerciseMode === 'reto' ? (
              <div className="flex-1 flex flex-col justify-between gap-1.5">
                {/* Instrucción del reto */}
                <div
                  className={`p-2 rounded-lg border text-xs leading-relaxed shrink-0 ${
                    isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Reto: Encuentra los parámetros y las clases</span>
                    </span>
                    <span className="font-mono text-[10px] opacity-75">N = {stats.N}</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-tight">
                    Calcula Xmin, Xmax, Rango (R), k y Amplitud (A). Luego completa los límites [Li, Ls), la marca de clase (Xi) y la frecuencia (fi).
                  </p>
                </div>

                {/* Muestra de datos para tachar mientras se cuenta */}
                <div className="p-1 sm:p-1.5 rounded-lg border shrink-0 bg-slate-500/5">
                  <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-bold mb-0.5">
                    <span className="opacity-75">Toca los datos para tachar al contar:</span>
                    <span className="font-mono text-sky-500">{stats.totalCounted}/{stats.N} tachados</span>
                  </div>
                  <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                    {displaySample.map((item) => (
                      <button
                        key={item.originalIdx}
                        type="button"
                        onClick={() => handleToggleTachado(item.originalIdx)}
                        className={`h-4.5 sm:h-5 lg:h-6 rounded border font-mono font-bold text-[9px] sm:text-[9.5px] lg:text-[10.5px] flex items-center justify-center cursor-pointer transition-all ${
                          item.isTachado
                            ? 'opacity-40 line-through bg-slate-800/40 border-slate-700 text-slate-400'
                            : isDark
                            ? 'bg-slate-900 border-white/20 text-white hover:border-sky-400'
                            : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-sky-500'
                        }`}
                      >
                        {item.val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inputs de Parámetros R, k, A */}
                <div className="grid grid-cols-5 gap-1 shrink-0">
                  <div className="p-1 rounded border flex flex-col items-center bg-slate-500/5">
                    <label className="text-[9px] font-bold opacity-75">Xmin</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={retoInputs.min}
                      onChange={(e) => setRetoInputs((prev) => ({ ...prev, min: e.target.value }))}
                      placeholder="?"
                      className="w-full text-center font-mono font-bold text-xs h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                    />
                  </div>
                  <div className="p-1 rounded border flex flex-col items-center bg-slate-500/5">
                    <label className="text-[9px] font-bold opacity-75">Xmax</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={retoInputs.max}
                      onChange={(e) => setRetoInputs((prev) => ({ ...prev, max: e.target.value }))}
                      placeholder="?"
                      className="w-full text-center font-mono font-bold text-xs h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                    />
                  </div>
                  <div className="p-1 rounded border flex flex-col items-center bg-slate-500/5">
                    <label className="text-[9px] font-bold text-sky-500">Rango (R)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={retoInputs.rango}
                      onChange={(e) => setRetoInputs((prev) => ({ ...prev, rango: e.target.value }))}
                      placeholder="?"
                      className="w-full text-center font-mono font-bold text-xs h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                    />
                  </div>
                  <div className="p-1 rounded border flex flex-col items-center bg-slate-500/5">
                    <label className="text-[9px] font-bold text-amber-500">k (clases)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={retoInputs.k}
                      onChange={(e) => setRetoInputs((prev) => ({ ...prev, k: e.target.value }))}
                      placeholder="?"
                      className="w-full text-center font-mono font-bold text-xs h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-amber-500"
                    />
                  </div>
                  <div className="p-1 rounded border flex flex-col items-center bg-slate-500/5">
                    <label className="text-[9px] font-bold text-emerald-500">Amplitud (A)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={retoInputs.amplitud}
                      onChange={(e) => setRetoInputs((prev) => ({ ...prev, amplitud: e.target.value }))}
                      placeholder="?"
                      className="w-full text-center font-mono font-bold text-xs h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-emerald-500"
                    />
                  </div>
                </div>

                {/* Inputs de Intervalos (Li, Ls, Xi, fi) */}
                <div className="p-1 rounded-lg border bg-slate-500/5 flex flex-col gap-1 overflow-x-auto shrink-0">
                  <div className="text-[9px] font-bold opacity-75">
                    Límites [Li, Ls), Marca (Xi) y Conteo (fi) por clase:
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[8.5px] font-bold text-center opacity-70">
                    <span>Límite Li</span>
                    <span>Límite Ls</span>
                    <span>Marca Xi</span>
                    <span>Frecuencia fi</span>
                  </div>
                  {stats.intervals.map((_, i) => {
                    const u = retoInputs.intervals[i] || { li: '', ls: '', xi: '', fi: '' }
                    return (
                      <div key={i} className="grid grid-cols-4 gap-1 items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={u.li}
                          onChange={(e) => {
                            const val = e.target.value
                            setRetoInputs((prev) => ({
                              ...prev,
                              intervals: {
                                ...prev.intervals,
                                [i]: { ...(prev.intervals[i] || { li: '', ls: '', xi: '', fi: '' }), li: val }
                              }
                            }))
                          }}
                          placeholder={`Li`}
                          className="text-center font-mono font-bold text-[11px] h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={u.ls}
                          onChange={(e) => {
                            const val = e.target.value
                            setRetoInputs((prev) => ({
                              ...prev,
                              intervals: {
                                ...prev.intervals,
                                [i]: { ...(prev.intervals[i] || { li: '', ls: '', xi: '', fi: '' }), ls: val }
                              }
                            }))
                          }}
                          placeholder={`Ls`}
                          className="text-center font-mono font-bold text-[11px] h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                        />
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={u.xi}
                          onChange={(e) => {
                            const val = e.target.value
                            setRetoInputs((prev) => ({
                              ...prev,
                              intervals: {
                                ...prev.intervals,
                                [i]: { ...(prev.intervals[i] || { li: '', ls: '', xi: '', fi: '' }), xi: val }
                              }
                            }))
                          }}
                          placeholder={`Xi`}
                          className="text-center font-mono font-bold text-[11px] h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={u.fi}
                          onChange={(e) => {
                            const val = e.target.value
                            setRetoInputs((prev) => ({
                              ...prev,
                              intervals: {
                                ...prev.intervals,
                                [i]: { ...(prev.intervals[i] || { li: '', ls: '', xi: '', fi: '' }), fi: val }
                              }
                            }))
                          }}
                          placeholder={`fi`}
                          className="text-center font-mono font-bold text-[11px] h-6 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 focus:outline-sky-500"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Feedback y Botón Comprobar */}
                <div className="pt-1 border-t border-white/5 flex flex-col gap-1 shrink-0">
                  {retoFeedback && (
                    <div
                      className={`p-1.5 rounded-lg border text-xs ${
                        retoFeedback.errors.length === 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                        <span>Puntaje: {retoFeedback.score} / {retoFeedback.total} aciertos</span>
                        <span>{retoFeedback.errors.length === 0 ? '🎉 ¡Excelente!' : '💡 Revisa tus respuestas'}</span>
                      </div>
                      {retoFeedback.errors.length > 0 && (
                        <div className="text-[10px] text-rose-300 truncate">
                          {retoFeedback.errors.slice(0, 2).join(' • ')}
                          {retoFeedback.errors.length > 2 ? ` (+${retoFeedback.errors.length - 2} más)` : ''}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleCheckReto}
                    className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Comprobar Respuestas</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5">
                {/* ── 1. MUESTRA DE 30 DATOS RECOLECTADOS (6x5) ── */}
                <div className="p-1 sm:p-1.5 rounded-lg border shrink-0 bg-slate-500/5 flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center justify-between text-[9px] sm:text-[9.5px] lg:text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sky-500 font-extrabold flex items-center gap-1">
                        <span>📋</span>
                        <span>Muestra ({isSorted ? 'Ordenada' : 'Aleatoria / Desorganizada'}):</span>
                      </span>
                      <span className="font-mono text-[8.5px] sm:text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 font-bold opacity-80">
                        N = {stats.N}
                      </span>
                    </div>

                    {guidedStep === 'datos' ? (
                      <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold shrink-0">
                        <span className={`px-1.5 py-0.2 rounded border ${selectedMin === stats.minVal ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                          Mín: {selectedMin !== null ? selectedMin : '?'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded border ${selectedMax === stats.maxVal ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                          Máx: {selectedMax !== null ? selectedMax : '?'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold shrink-0">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Mín: {stats.minVal}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Máx: {stats.maxVal}
                        </span>
                        {guidedStep === 'conteo' && (
                          <span className="font-mono text-sky-500 ml-1">
                            ({stats.totalCounted}/{stats.N})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grilla 6x5 compacta de los 30 datos optimizada para Tablets */}
                  <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                    {displaySample.map((item) => {
                      const isMin = item.val === stats.minVal
                      const isMax = item.val === stats.maxVal
                      const isSelectedMin = guidedStep === 'datos' && selectedMin === item.val
                      const isSelectedMax = guidedStep === 'datos' && selectedMax === item.val

                      const matchedInterval = stats.intervals.find((inv) => {
                        if (inv.isLast) return item.val >= inv.li && item.val <= inv.ls
                        return item.val >= inv.li && item.val < inv.ls
                      })

                      const showIntervalColor = guidedStep === 'conteo' && matchedInterval

                      return (
                        <button
                          key={item.originalIdx}
                          type="button"
                          onClick={() => handleChipClick(item.val, item.originalIdx)}
                          className={`h-4.5 sm:h-5 lg:h-6 rounded border font-mono font-bold text-[8.5px] sm:text-[9.5px] lg:text-[10.5px] flex items-center justify-center relative cursor-pointer transition-all ${
                            item.isTachado && guidedStep !== 'datos'
                              ? 'opacity-40 scale-95 line-through bg-slate-800/40 border-slate-700 text-slate-400'
                              : (isSelectedMin || (guidedStep !== 'datos' && isMin))
                              ? 'bg-emerald-500/25 border-emerald-500 text-emerald-400 ring-1 sm:ring-2 ring-emerald-500/60 shadow-xs'
                              : (isSelectedMax || (guidedStep !== 'datos' && isMax))
                              ? 'bg-amber-500/25 border-amber-500 text-amber-400 ring-1 sm:ring-2 ring-amber-500/60 shadow-xs'
                              : isDark
                              ? 'bg-slate-900 border-white/15 text-white hover:border-sky-400'
                              : 'bg-white border-slate-300 text-slate-900 shadow-xs hover:border-sky-500'
                          }`}
                          style={
                            showIntervalColor && !item.isTachado
                              ? { borderLeftWidth: '3px', borderLeftColor: matchedInterval.color }
                              : undefined
                          }
                          title={
                            guidedStep === 'datos'
                              ? `Toca para seleccionar este número (${item.val})`
                              : isMin
                              ? `Valor Mínimo (${item.val})`
                              : isMax
                              ? `Valor Máximo (${item.val})`
                              : `Dato: ${item.val}${matchedInterval ? ` (Intervalo ${matchedInterval.label})` : ''}`
                          }
                        >
                          <span>{item.val}</span>

                          {/* Badges Min / Max compactos */}
                          {(isSelectedMin || (guidedStep !== 'datos' && isMin)) && (
                            <span className="absolute -top-1 -left-0.5 lg:-top-1.5 lg:-left-1 text-[5.5px] sm:text-[6px] lg:text-[6.5px] font-black uppercase bg-emerald-600 text-white px-0.5 rounded leading-tight shadow-xs">
                              Mín
                            </span>
                          )}
                          {(isSelectedMax || (guidedStep !== 'datos' && isMax)) && (
                            <span className="absolute -top-1 -right-0.5 lg:-top-1.5 lg:-right-1 text-[5.5px] sm:text-[6px] lg:text-[6.5px] font-black uppercase bg-amber-600 text-white px-0.5 rounded leading-tight shadow-xs">
                              Máx
                            </span>
                          )}

                          {item.isTachado && guidedStep !== 'datos' && (
                            <span className="absolute -top-0.5 -right-0.5 text-[7px] lg:text-[8px] text-emerald-400 font-black">
                              ✓
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── 2. CONTENIDO PEDAGÓGICO SEGÚN EL PASO GUIADO ── */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 overflow-y-auto">
                  {/* ── PASO 1: DATOS (IDENTIFICAR MÍNIMO Y MÁXIMO) ── */}
                  {guidedStep === 'datos' && (
                    <div className="flex-1 flex flex-col justify-between gap-1 sm:gap-1.5">
                      <div
                        className={`p-1.5 lg:p-2 rounded-lg border text-[10px] lg:text-xs leading-relaxed shrink-0 ${
                          isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1 text-[10.5px] lg:text-[11px] mb-0.5">
                          <Info className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-sky-500 shrink-0" />
                          <span>Paso 1: Identificar el Dato Menor y Dato Mayor</span>
                        </p>
                        <p className="text-[9px] sm:text-[9.5px] lg:text-[10px] opacity-90 leading-tight">
                          Observa los 30 datos de la muestra arriba. <strong>Haz clic en el número menor (Mínimo) y en el número mayor (Máximo)</strong> para poder calcular el rango.
                        </p>
                      </div>

                      {/* Botones selectores de objetivo: Mínimo o Máximo */}
                      <div className="flex items-center justify-between gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTargetToSelect('min')}
                          className={`flex-1 py-0.5 lg:py-1 px-1.5 lg:px-2 rounded-lg border font-bold text-[9.5px] lg:text-xs flex items-center justify-between cursor-pointer transition-all ${
                            targetToSelect === 'min'
                              ? 'ring-2 ring-emerald-500 bg-emerald-500/20 border-emerald-500 text-emerald-400 font-extrabold'
                              : selectedMin !== null
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isDark
                              ? 'bg-slate-900/60 border-white/10 text-white/70'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-1 text-[9px] sm:text-[9.5px] lg:text-[10px]">
                            <span>🟢</span>
                            <span>Dato Menor (Mín):</span>
                          </span>
                          <span className="font-mono text-[10.5px] lg:text-xs font-black">
                            {selectedMin !== null ? selectedMin : '?'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTargetToSelect('max')}
                          className={`flex-1 py-0.5 lg:py-1 px-1.5 lg:px-2 rounded-lg border font-bold text-[9.5px] lg:text-xs flex items-center justify-between cursor-pointer transition-all ${
                            targetToSelect === 'max'
                              ? 'ring-2 ring-amber-500 bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold'
                              : selectedMax !== null
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : isDark
                              ? 'bg-slate-900/60 border-white/10 text-white/70'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-1 text-[9px] sm:text-[9.5px] lg:text-[10px]">
                            <span>🟠</span>
                            <span>Dato Mayor (Máx):</span>
                          </span>
                          <span className="font-mono text-[10.5px] lg:text-xs font-black">
                            {selectedMax !== null ? selectedMax : '?'}
                          </span>
                        </button>
                      </div>

                      {/* Mensaje de retroalimentación interactiva */}
                      <div
                        className={`p-1 lg:p-1.5 rounded-lg border text-[9px] sm:text-[9.5px] lg:text-[10.5px] text-center font-medium shrink-0 transition-all ${
                          selectedMin === stats.minVal && selectedMax === stats.maxVal
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                            : selectionFeedback
                            ? 'bg-sky-500/15 border-sky-500/30 text-sky-200'
                            : isDark
                            ? 'bg-slate-900/40 border-white/5 text-white/60'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {selectionFeedback || (
                          <span>
                            💡 Selecciona {targetToSelect === 'min' ? 'el número más pequeño' : 'el número más grande'} tocándolo en la muestra.
                          </span>
                        )}
                      </div>

                      {/* Botón de acción para pasar a Rango cuando estén identificados */}
                      <div className="pt-0.5 lg:pt-1 border-t border-white/5">
                        <button
                          type="button"
                          disabled={!isDatosCompleted}
                          onClick={() => {
                            setGuidedStep('rango')
                            setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 1 ? 'rango' : prev))
                          }}
                          className={`w-full py-1 lg:py-1.5 rounded-lg font-bold text-[10.5px] lg:text-xs flex items-center justify-center gap-1 lg:gap-1.5 transition-all shadow-xs ${
                            isDatosCompleted
                              ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-95'
                              : 'bg-slate-700/40 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
                          }`}
                          style={isDatosCompleted ? { color: '#ffffff' } : undefined}
                        >
                          <span>Paso 2: Calcular Rango (R = Xmax − Xmin)</span>
                          <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 2: RANGO ── */}
                  {guidedStep === 'rango' && (
                    <div className="flex-1 flex flex-col justify-between gap-1 sm:gap-1.5">
                      <div
                        className={`p-1.5 lg:p-2 rounded-lg border text-[10px] lg:text-xs leading-relaxed shrink-0 ${
                          isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1 text-[10.5px] lg:text-[11px] mb-0.5">
                          <Calculator className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-sky-500 shrink-0" />
                          <span>Paso 2: Calcular el Rango de la Distribución (R)</span>
                        </p>
                        <p className="text-[9px] sm:text-[9.5px] lg:text-[10px] opacity-90 leading-tight">
                          El Rango representa la distancia numérica entre el dato mayor y el dato menor de la muestra.
                        </p>
                      </div>

                      {/* Tarjeta destacada de Rango */}
                      <div className={`p-1.5 lg:p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                        <div className="text-[9px] lg:text-[10px] font-bold text-sky-500 uppercase tracking-wide">Fórmula del Rango</div>
                        <div className="font-mono font-black text-sm sm:text-base lg:text-lg text-center my-0.5">
                          R = Xmax − Xmin = <span className="text-amber-500">{stats.maxVal}</span> − <span className="text-emerald-500">{stats.minVal}</span> = <span className="text-sky-500">{stats.R}</span>
                        </div>
                        <div className="text-[8.5px] sm:text-[9px] lg:text-[9.5px] text-center opacity-75">
                          Hay una separación de <strong>{stats.R} {currentDataset.unit}</strong> a lo largo de los 30 datos.
                        </div>
                      </div>

                      {/* Botón hacia Intervalos */}
                      <div className="pt-0.5 lg:pt-1 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setGuidedStep('intervalos')
                            setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 2 ? 'intervalos' : prev))
                          }}
                          className="w-full py-1 lg:py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10.5px] lg:text-xs cursor-pointer flex items-center justify-center gap-1 lg:gap-1.5 active:scale-95 transition-all shadow-xs"
                          style={{ color: '#ffffff' }}
                        >
                          <span>Paso 3: Hallar el Número de Intervalos (k)</span>
                          <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 3: INTERVALOS (k) ── */}
                  {guidedStep === 'intervalos' && (
                    <div className="flex-1 flex flex-col justify-between gap-1 sm:gap-1.5">
                      <div
                        className={`p-1.5 lg:p-2 rounded-lg border text-[10px] lg:text-xs leading-relaxed shrink-0 ${
                          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1 text-[10.5px] lg:text-[11px] mb-0.5">
                          <Layers className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-amber-500 shrink-0" />
                          <span>Paso 3: Determinar el Número de Intervalos (k)</span>
                        </p>
                        <p className="text-[9px] sm:text-[9.5px] lg:text-[10px] opacity-90 leading-tight">
                          Existen dos reglas matemáticas estándar en secundaria para elegir cuántas clases o grupos formar con N = 30 datos:
                        </p>
                      </div>

                      {/* Comparativa de reglas k */}
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 shrink-0">
                        <div className={`p-1 sm:p-1.5 rounded-lg border flex flex-col justify-between ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                          <div className="text-[8.5px] sm:text-[9px] font-bold text-amber-500 uppercase">Regla de la Raíz</div>
                          <div className="font-mono font-black text-xs sm:text-sm text-center my-0.5">
                            k ≈ √30 ≈ 5.48
                          </div>
                          <div className="text-[8px] sm:text-[8.5px] text-center opacity-70">
                            Se redondea a <strong>5</strong> intervalos
                          </div>
                        </div>

                        <div className={`p-1 sm:p-1.5 rounded-lg border flex flex-col justify-between ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                          <div className="text-[8.5px] sm:text-[9px] font-bold text-purple-500 uppercase">Regla de Sturges</div>
                          <div className="font-mono font-black text-xs sm:text-sm text-center my-0.5">
                            k = 1 + 3.322 log(30)
                          </div>
                          <div className="text-[8px] sm:text-[8.5px] text-center opacity-70">
                            k ≈ 1 + 4.90 ≈ <strong>6</strong> intervalos
                          </div>
                        </div>
                      </div>

                      {/* Selector interactivo de k */}
                      <div className={`p-1 sm:p-1.5 rounded-lg border flex items-center justify-between text-xs ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
                        <span className="font-bold text-[9.5px] sm:text-[10px] lg:text-[10.5px]">Seleccionar cantidad (k):</span>
                        <div className="flex items-center gap-1">
                          <select
                            value={selectedK}
                            onChange={(e) => setSelectedK(parseInt(e.target.value, 10))}
                            className="bg-amber-500/20 text-amber-500 font-black rounded px-1.5 py-0.5 text-[10px] sm:text-xs border border-amber-500/40 cursor-pointer"
                          >
                            <option value={4}>k = 4 clases</option>
                            <option value={5}>k = 5 clases (Recomendado)</option>
                            <option value={6}>k = 6 clases (Sturges)</option>
                          </select>
                        </div>
                      </div>

                      {/* Botón hacia Amplitud */}
                      <div className="pt-0.5 lg:pt-1 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setGuidedStep('amplitud')
                            setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 3 ? 'amplitud' : prev))
                          }}
                          className="w-full py-1 lg:py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10.5px] lg:text-xs cursor-pointer flex items-center justify-center gap-1 lg:gap-1.5 active:scale-95 transition-all shadow-xs"
                          style={{ color: '#ffffff' }}
                        >
                          <span>Paso 4: Calcular la Amplitud (A = R ÷ k)</span>
                          <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 4: AMPLITUD (A) Y FORMACIÓN ANIMADA DE INTERVALOS ── */}
                  {guidedStep === 'amplitud' && (
                    <div className="flex-1 min-h-0 flex flex-col gap-1 sm:gap-1.5">
                      {/* Cabecera superior compacta: Título, Reanimar y botón Paso 5 */}
                      <div className="flex items-center justify-between shrink-0 px-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-1.5 font-bold text-[10.5px] lg:text-xs text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Paso 4: Amplitud e Intervalos</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={handleReplayIntervalAnim}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="Repetir animación de intervalos"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            <span>{isAnimRunning ? 'Animando...' : 'Reanimar'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGuidedStep('conteo')
                              setMaxUnlockedStep((prev) => (STEP_ORDER.indexOf(prev) < 4 ? 'conteo' : prev))
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] lg:text-[11px] cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                            style={{ color: '#ffffff' }}
                          >
                            <span>Ir al Conteo</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* 2 Columnas: Izquierda = Fórmula | Derecha = Intervalos Animados (sin Xi) */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-h-0 items-stretch">
                        {/* Columna Izquierda: Fórmula de Amplitud */}
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg border flex flex-col justify-between ${
                            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                                Fórmula de Amplitud
                              </span>
                              <span className="font-mono text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                                k = {stats.k}
                              </span>
                            </div>

                            {/* Dos líneas: A = R ÷ k y abajo A = 30 ÷ 5 = 6 */}
                            <div className="my-0.5 flex flex-col items-center justify-center gap-0.5 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 font-mono text-center">
                              <div className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-200">
                                A = R ÷ k
                              </div>
                              <div className="text-sm sm:text-base font-black text-emerald-400">
                                A = {stats.R} ÷ {stats.k} = <strong>{stats.A} {currentDataset.unit}</strong>
                              </div>
                            </div>

                            <div className="space-y-1 text-[8px] sm:text-[8.5px] text-slate-300 dark:text-slate-300 leading-tight">
                              <div className="flex items-center gap-1">
                                <span className="text-emerald-400 font-bold">• Inicio:</span>
                                <span>Li = Xmin = <strong>{stats.minVal}</strong></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-sky-400 font-bold">• Regla:</span>
                                <span>Ls = Li + A = Li + <strong>{stats.A}</strong></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-amber-400 font-bold">• Continuidad:</span>
                                <span>El Ls de una clase es el Li de la siguiente.</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[8px] opacity-75">
                            <span>Clases a formar:</span>
                            <span className="font-mono font-bold text-emerald-400">{stats.k} intervalos</span>
                          </div>
                        </div>

                        {/* Columna Derecha: Intervalos formándose con Animación */}
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg border flex flex-col justify-between overflow-hidden ${
                            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] font-bold mb-1 pb-0.5 border-b border-white/5">
                            <span className="text-sky-400 flex items-center gap-1">
                              <span>✨</span>
                              <span>Construcción de Intervalos:</span>
                            </span>
                            <span className="font-mono text-[8.5px] text-emerald-400 font-bold">
                              +A ({stats.A} {currentDataset.unit})
                            </span>
                          </div>

                          {/* Lista Animada de Intervalos */}
                          <div className="flex-1 flex flex-col justify-around gap-1 overflow-y-auto no-scrollbar py-0.5">
                            {stats.intervals.map((inv, idx) => {
                              const isCurrent = idx === animStepIndex
                              const isFuture = idx > animStepIndex

                              return (
                                <div
                                  key={inv.index}
                                  className={`px-1.5 py-1 rounded-md border flex items-center justify-between font-mono text-[9px] sm:text-[10px] transition-all duration-300 ${
                                    isFuture
                                      ? 'opacity-25 border-dashed border-slate-600 bg-transparent'
                                      : isCurrent
                                      ? animPhase === 'sumando'
                                        ? 'ring-2 ring-amber-400 bg-amber-500/25 border-amber-400 scale-[1.02] shadow-xs'
                                        : 'ring-2 ring-emerald-400 bg-emerald-500/25 border-emerald-400 scale-[1.02] shadow-xs'
                                      : isDark
                                      ? 'bg-slate-900/80 border-white/10'
                                      : 'bg-white border-slate-300 shadow-xs'
                                  }`}
                                  style={!isFuture ? { borderLeftWidth: '3.5px', borderLeftColor: inv.color } : undefined}
                                >
                                  {isFuture ? (
                                    <div className="text-[8.5px] text-slate-500 italic">
                                      Clase {idx + 1}...
                                    </div>
                                  ) : isCurrent && animPhase === 'sumando' ? (
                                    /* Fase activa: muestra cómo se suma Li + A = Ls */
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-[8px] sm:text-[8.5px] font-bold text-amber-400 flex items-center gap-0.5">
                                        <span>➕</span>
                                        <span>Sumando:</span>
                                      </span>
                                      <span className="font-black text-amber-300 text-[9.5px] sm:text-[10.5px] animate-pulse">
                                        {inv.li} + {stats.A} = {inv.ls}
                                      </span>
                                    </div>
                                  ) : (
                                    /* La suma desaparece: solo queda el intervalo limpio */
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-bold text-[9.5px] sm:text-[10px]" style={{ color: inv.color }}>
                                        {inv.label}
                                      </span>
                                      <span className="text-emerald-400 font-bold text-[8.5px] flex items-center gap-0.5">
                                        <span>✓</span>
                                        <span className="text-[7.5px] text-slate-400 opacity-75">listo</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          <div className="pt-1 border-t border-white/5 text-[8px] text-center text-slate-400 font-medium truncate">
                            {isAnimRunning ? (
                              <span className="text-amber-400 font-bold animate-pulse">
                                {animPhase === 'sumando'
                                  ? `⚡ Sumando amplitud: ${stats.intervals[animStepIndex]?.li} + ${stats.A} = ${stats.intervals[animStepIndex]?.ls}`
                                  : `✓ Formado: ${stats.intervals[animStepIndex]?.label}`}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                                <span>✓</span>
                                <span>¡{stats.k} intervalos listos sumando +{stats.A}!</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 5: CONTEO (fi) Y LLENADO AUTOMÁTICO DE LA TABLA ── */}
                  {guidedStep === 'conteo' && (
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5">
                      {/* Control de auto-conteo y estado */}
                      <div className="flex items-center justify-between p-1 sm:p-1.5 rounded-lg bg-slate-500/5 border shrink-0">
                        <div className="text-[9.5px] sm:text-[10px] font-bold">
                          <span>Conteo: </span>
                          <span className="font-mono text-sky-500 font-extrabold">
                            {stats.totalCounted} de {stats.N} tachados
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleToggleAutoCount}
                            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              isAutoCounting
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : isDark
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            }`}
                          >
                            {isAutoCounting ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            <span>{isAutoCounting ? 'Pausar' : 'Paso a paso'}</span>
                          </button>

                          <button
                            onClick={handleTacharTodos}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all ${
                              isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                          >
                            Tachar todos
                          </button>
                        </div>
                      </div>

                      {/* Indicación pedagógica o celebración de tabla completa */}
                      {stats.isComplete ? (
                        <div className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 flex flex-col gap-1 text-emerald-300 shrink-0">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>¡Conteo completado con éxito!</span>
                            </span>
                            <span className="font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                              30 / 30 datos
                            </span>
                          </div>
                          <p className="text-[9.5px] leading-tight text-slate-300 dark:text-slate-200">
                            Se ha completado automáticamente toda la tabla de frecuencias a la derecha: se calcularon las frecuencias acumuladas (<strong>Fi</strong>), relativas (<strong>hi</strong>) y porcentuales (<strong>hi %</strong>).
                          </p>
                        </div>
                      ) : (
                        <div
                          className={`p-1.5 sm:p-2 rounded-lg border text-[9px] sm:text-[9.5px] lg:text-[10px] leading-relaxed shrink-0 ${
                            isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                          }`}
                        >
                          <p className="font-bold mb-0.5">📌 ¿Cómo funciona el conteo?</p>
                          <p>
                            Toca cada número en la muestra arriba para tacharlo. El color del borde izquierdo indica a qué intervalo pertenece. Al terminar de contar los 30 datos, <strong>se llenará automáticamente toda la tabla</strong> con sus frecuencias relativas, porcentuales y acumuladas.
                          </p>
                        </div>
                      )}

                      {/* Tarjeta de Clase Modal si está completada */}
                      {stats.modalInterval && stats.isComplete && (
                        <div className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-[9.5px] sm:text-[10px] lg:text-[10.5px] shrink-0">
                          <div className="flex items-center gap-1 font-bold text-amber-500">
                            <Crown className="h-3.5 w-3.5" />
                            <span>Clase Modal: {stats.modalInterval.label}</span>
                          </div>
                          <span className="font-mono text-amber-400 font-bold">
                            fi = {stats.modalInterval.fi} datos (mayor frecuencia)
                          </span>
                        </div>
                      )}

                      {/* Botón de reinicio o nueva muestra al finalizar */}
                      <div className="pt-0.5 lg:pt-1 border-t border-white/5 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={handleResetConteo}
                          className="flex-1 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reiniciar conteo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNewSample}
                          className="flex-1 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Nueva Muestra</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            PANEL DERECHO: TABLA DE FRECUENCIAS ESTILO EXCEL E HISTOGRAMA
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className={`flex-1 min-w-0 min-h-0 rounded-xl border flex flex-col overflow-hidden transition-all ${
            isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Cabecera del Panel Derecho */}
          <div
            className={`px-2.5 py-1.5 border-b shrink-0 flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-500 text-[11px]">
                2. Tabla de Frecuencias (Datos Agrupados)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold">
                N = {stats.N}
              </span>
            </div>

            {stats.modalInterval && stats.isComplete && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <Crown className="h-3 w-3" />
                <span>Clase Modal: {stats.modalInterval.label}</span>
              </div>
            )}
          </div>

          {/* Contenido: Tabla de Frecuencias estilo Excel + Histograma */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1 lg:p-2 flex flex-col justify-between gap-1.5">
            {/* Tabla Estilo Excel (.excel-table) */}
            <div
              className={`overflow-x-auto w-full no-scrollbar rounded-md border shadow-xs ${
                isDark ? 'border-white/20' : 'border-slate-400'
              }`}
            >
              <table className="excel-table w-full border-collapse text-left text-[10px] lg:text-xs">
                {/* Encabezados */}
                <thead>
                  <tr className="text-[9.5px] lg:text-[11px] font-bold">
                    <th className={`py-1 px-1.5 font-bold ${isDark ? 'bg-slate-800/90 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
                      Intervalo [{currentDataset.unit}]
                    </th>
                    <th className={`py-1 px-1 text-center font-bold ${isDark ? 'bg-slate-800/90 text-white' : 'bg-slate-200/80 text-slate-900'}`} title="Marca de clase">
                      Xi
                    </th>
                    <th className={`py-1 px-1.5 min-w-[55px] font-bold text-center sm:text-left ${isDark ? 'bg-slate-800/90 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
                      Conteo
                    </th>
                    <th className={`py-1 px-1 text-center font-bold ${isDark ? 'bg-sky-950/40' : 'bg-sky-100/90'}`} title="Frecuencia absoluta">
                      <span className="text-sky-600 dark:text-sky-400 font-mono font-bold lowercase">fi</span>
                    </th>
                    <th className={`py-1 px-1 text-center font-bold ${isDark ? 'bg-purple-950/40' : 'bg-purple-100/90'}`} title="Frecuencia acumulada">
                      <span className="text-purple-600 dark:text-purple-400 font-mono font-bold lowercase">Fi</span>
                    </th>
                    <th className={`py-1 px-1 text-center font-bold ${isDark ? 'bg-emerald-950/40' : 'bg-emerald-100/90'}`} title="Frecuencia relativa">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold lowercase">hi</span>
                    </th>
                    <th className={`py-1 px-1 text-center font-bold ${isDark ? 'bg-amber-950/40' : 'bg-amber-100/90'}`} title="Frecuencia porcentual">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold lowercase">hi %</span>
                    </th>
                  </tr>
                </thead>

                {/* Filas de Intervalos o Estado de Espera */}
                {isTableWaiting ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
                          <div className="h-8 w-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500">
                            <Lock className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                            Tabla de Frecuencias en Espera
                          </span>
                          <span className="text-[10px] max-w-xs opacity-75 leading-relaxed">
                            Completa los pasos del panel izquierdo (<strong>1. Datos</strong>, <strong>2. Rango</strong>, <strong>3. k</strong> y <strong>4. Amplitud</strong>) para construir los intervalos de esta tabla.
                          </span>
                          <div className="flex items-center gap-1 text-[9px] font-mono text-sky-500 mt-0.5">
                            <span>Paso actual: </span>
                            <span className="font-bold uppercase bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                              {guidedStep === 'datos'
                                ? '1. Datos (Identificar Mín/Máx)'
                                : guidedStep === 'rango'
                                ? '2. Rango (R)'
                                : guidedStep === 'intervalos'
                                ? '3. Intervalos (k)'
                                : '4. Amplitud (A)'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {stats.intervals.map((row) => {
                      const isSelected = selectedIntervalIdx === row.index
                      const isModal = stats.modalInterval?.index === row.index && stats.isComplete

                      return (
                        <tr
                          key={row.index}
                          onClick={() => setSelectedIntervalIdx(row.index)}
                          className={`transition-colors duration-150 cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'bg-sky-500/20'
                                : 'bg-sky-100/90 font-medium'
                              : isModal
                              ? isDark
                                ? 'bg-amber-500/15'
                                : 'bg-amber-100/80 font-medium'
                              : isDark
                              ? 'hover:bg-white/5'
                              : 'bg-white hover:bg-slate-100/70'
                          }`}
                          title="Toca para seleccionar este intervalo"
                        >
                          {/* Intervalo */}
                          <td className="py-0.5 lg:py-1 px-1.5 whitespace-nowrap font-mono font-bold">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                              <span>{row.label}</span>
                            </div>
                          </td>

                          {/* Marca de Clase (Xi) */}
                          <td className="py-0.5 lg:py-1 px-1 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {row.xi.toFixed(1)}
                          </td>

                          {/* Conteo (Palotes) */}
                          <td className="py-0.5 lg:py-1 px-1.5">
                            <TallyMarks count={row.fi} colorHex={row.color} />
                          </td>

                          {/* fi */}
                          <td className="py-0.5 lg:py-1 px-1 text-center font-mono font-black text-xs lg:text-sm">
                            <span className={row.fi > 0 ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'opacity-40'}>
                              {row.fi}
                            </span>
                          </td>

                          {/* Fi Acumulada */}
                          <td className="py-1 lg:py-1.5 px-1 text-center font-mono font-bold text-[10px] lg:text-xs text-purple-600 dark:text-purple-400">
                            {stats.isComplete ? row.Fi : <span className="opacity-40 italic">—</span>}
                          </td>

                          {/* hi Relativa */}
                          <td className="py-1 lg:py-1.5 px-1 text-center font-mono text-[10px] lg:text-xs">
                            {stats.isComplete ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {row.hi.toFixed(2)}
                              </span>
                            ) : (
                              <span className="opacity-40 italic">—</span>
                            )}
                          </td>

                          {/* hi% Porcentual */}
                          <td className="py-1 lg:py-1.5 px-1 text-center font-mono font-bold text-[10px] lg:text-xs">
                            {stats.isComplete ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                {row.hiPct.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="opacity-40 italic">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                )}

                {/* Fila Total (Σ) */}
                <tfoot>
                  <tr
                    className={`border-t-2 font-black ${
                      isDark
                        ? 'border-white/30 bg-slate-900/90 text-white'
                        : 'border-slate-500 bg-slate-200/90 text-slate-900'
                    }`}
                  >
                    <td className="py-1 lg:py-1.5 px-1.5 uppercase text-[9.5px] lg:text-[11px] font-black">
                      Total (Σ)
                    </td>
                    <td className="py-1 lg:py-1.5 px-1 text-center font-mono text-slate-400 opacity-60">
                      -
                    </td>
                    <td className="py-1 lg:py-1.5 px-1.5 font-mono text-[9.5px] text-slate-500 dark:text-slate-400">
                      {isTableWaiting ? '—' : `${stats.totalCounted} p.`}
                    </td>
                    <td
                      className={`py-1 lg:py-1.5 px-1 text-center font-mono font-black text-xs lg:text-sm ${
                        stats.totalCounted === stats.N
                          ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                          : ''
                      }`}
                    >
                      {isTableWaiting ? '—' : stats.totalCounted}
                    </td>
                    <td className="py-1 lg:py-1.5 px-1 text-center font-mono text-slate-400 opacity-60">
                      -
                    </td>
                    <td className="py-1 lg:py-1.5 px-1 text-center font-mono font-black text-[10px] lg:text-xs text-emerald-600 dark:text-emerald-400">
                      {isTableWaiting ? '—' : stats.isComplete ? '1.00' : '—'}
                    </td>
                    <td className="py-1 lg:py-1.5 px-1 text-center font-mono font-black text-[10px] lg:text-xs text-amber-600 dark:text-amber-400">
                      {isTableWaiting ? '—' : stats.isComplete ? '100%' : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* ── 4. Modal de Ayuda Pedagógica ────────────────────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía Pedagógica: Tablas para Datos Agrupados"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <h4 className="font-bold text-sky-400 mb-1">¿Cuándo se usan Datos Agrupados?</h4>
            <p>
              Se usan cuando la variable es <strong>cuantitativa continua</strong> (estatura, peso, tiempo) o cuando hay una <strong>gran dispersión de números</strong>, agrupándolos en intervalos o clases.
            </p>
          </div>

          <ol className="list-decimal pl-4 space-y-2">
            <li>
              <strong>Rango (R):</strong> Diferencia entre el dato mayor y el menor: <code className="font-mono font-bold">R = Xmax − Xmin</code>.
            </li>
            <li>
              <strong>Número de Intervalos (k):</strong> Cuántos grupos formaremos. Se usa la raíz de la muestra <code className="font-mono font-bold">k ≈ √N</code> o la regla de Sturges <code className="font-mono font-bold">1 + 3.322 log(N)</code>.
            </li>
            <li>
              <strong>Amplitud o Ancho (A):</strong> Cuánto abarca cada intervalo: <code className="font-mono font-bold">A = R ÷ k</code>. Si no es entero, se redondea al entero superior.
            </li>
            <li>
              <strong>Marca de Clase (Xi):</strong> El promedio o punto medio de cada intervalo: <code className="font-mono font-bold">Xi = (Li + Ls) ÷ 2</code>.
            </li>
            <li>
              <strong>Frecuencias (Fi, hi, hi%):</strong> Al terminar el conteo de frecuencias absolutas (fi), se calculan la acumulada Fi, la relativa <code className="font-mono font-bold">hi = fi ÷ N</code> y la porcentual <code className="font-mono font-bold">hi% = hi × 100</code>.
            </li>
          </ol>
        </div>
      </ModalHelp>
    </div>
  )
}
