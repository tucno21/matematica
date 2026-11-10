import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Split,
  Box,
  Layers,
  X
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type BoxplotTab = 'cuartiles' | 'construccion' | 'comparar'
export type BoxplotScenarioId = 'notas' | 'estaturas' | 'edades'

interface BoxplotScenario {
  id: BoxplotScenarioId
  title: string
  unit: string
  unitShort: string
  minScale: number
  maxScale: number
  stepScale: number
  classA: {
    name: string
    color: string
    data: number[]
  }
  classB: {
    name: string
    color: string
    data: number[]
  }
}

// ─── Catálogo de Situaciones ──────────────────────────────────────────────────
const BOXPLOT_SCENARIOS: BoxplotScenario[] = [
  {
    id: 'notas',
    title: 'Calificaciones de Matemáticas (N = 12 estudiantes)',
    unit: 'puntos',
    unitShort: 'pts',
    minScale: 9,
    maxScale: 20,
    stepScale: 1,
    classA: {
      name: 'Sección A (Regular y Competente)',
      color: '#38bdf8', // Celeste
      // 12 notas ordenadas: 10, 11, 12, 13, 14, 14, 15, 15, 16, 17, 18, 19
      data: [14, 11, 17, 10, 15, 13, 18, 14, 16, 12, 19, 15]
    },
    classB: {
      name: 'Sección B (Mayor Dispersión)',
      color: '#ec4899', // Rosa
      // 12 notas con mayor dispersión: 9, 9, 10, 10, 11, 12, 13, 14, 17, 18, 20, 20
      data: [9, 14, 9, 20, 11, 10, 17, 12, 20, 10, 18, 13]
    }
  },
  {
    id: 'estaturas',
    title: 'Estatura en Centímetros (N = 12 estudiantes)',
    unit: 'centímetros',
    unitShort: 'cm',
    minScale: 140,
    maxScale: 180,
    stepScale: 5,
    classA: {
      name: 'Grupo 1 (Básquet)',
      color: '#10b981', // Verde
      data: [160, 155, 172, 148, 165, 158, 175, 162, 168, 152, 178, 164]
    },
    classB: {
      name: 'Grupo 2 (Fútbol)',
      color: '#f59e0b', // Ámbar
      data: [145, 162, 142, 176, 154, 148, 168, 156, 174, 150, 170, 158]
    }
  },
  {
    id: 'edades',
    title: 'Edades del Taller Juvenil (N = 12 participantes)',
    unit: 'años',
    unitShort: 'años',
    minScale: 10,
    maxScale: 20,
    stepScale: 1,
    classA: {
      name: 'Turno Mañana',
      color: '#8b5cf6', // Violeta
      data: [14, 12, 16, 11, 15, 13, 17, 14, 15, 13, 18, 15]
    },
    classB: {
      name: 'Turno Tarde',
      color: '#f43f5e', // Rosa fuerte
      data: [11, 15, 10, 19, 13, 12, 17, 14, 18, 12, 19, 15]
    }
  }
]

// ─── Función para calcular los 5 números del resumen de Tukey y Cuartiles ─────
function calculateTukeySummary(rawNumbers: number[]) {
  const sorted = [...rawNumbers].sort((a, b) => a - b)
  const n = sorted.length

  const min = sorted[0]
  const max = sorted[n - 1]

  // Mediana (Q2)
  const mid = Math.floor(n / 2)
  const q2 = n % 2 === 0 ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)) : sorted[mid]

  // Mitad inferior y mitad superior
  const lowerHalf = n % 2 === 0 ? sorted.slice(0, mid) : sorted.slice(0, mid)
  const upperHalf = n % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1)

  // Cuartil 1 (Mediana de la mitad inferior)
  const midLow = Math.floor(lowerHalf.length / 2)
  const q1 =
    lowerHalf.length % 2 === 0
      ? Number(((lowerHalf[midLow - 1] + lowerHalf[midLow]) / 2).toFixed(2))
      : lowerHalf[midLow]

  // Cuartil 3 (Mediana de la mitad superior)
  const midUp = Math.floor(upperHalf.length / 2)
  const q3 =
    upperHalf.length % 2 === 0
      ? Number(((upperHalf[midUp - 1] + upperHalf[midUp]) / 2).toFixed(2))
      : upperHalf[midUp]

  // Rango Intercuartílico (IQR)
  const iqr = Number((q3 - q1).toFixed(2))

  // Barreras para outliers
  const lowerFence = Number((q1 - 1.5 * iqr).toFixed(2))
  const upperFence = Number((q3 + 1.5 * iqr).toFixed(2))

  return {
    n,
    sorted,
    min,
    max,
    q1,
    q2,
    q3,
    iqr,
    lowerFence,
    upperFence
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MedidasPosicionBoxplotView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Pestañas principales
  const [activeTab, setActiveTab] = useState<BoxplotTab>('cuartiles')

  // Escenario
  const [selectedScenario, setSelectedScenario] = useState<BoxplotScenarioId>('notas')

  // Fases de descubrimiento en Pestaña 1 (Cuartiles):
  // 0: Datos desordenados
  // 1: Datos ordenados de menor a mayor
  // 2: Corte de Mediana Q2 (50%)
  // 3: Corte de Cuartiles Q1 y Q3 (4 cuartos de 25%)
  const [stepPhase, setStepPhase] = useState<number>(0)

  // Fases de construcción en Pestaña 2 (De los puntos a la caja):
  // 0: Los 12 datos formados en la recta
  // 1: Proyección de las 5 marcas de Tukey (Mín, Q1, Mediana, Q3, Máx)
  // 2: Nace la Caja Central (50% central, IQR)
  // 3: Boxplot completo con bigotes
  const [boxStepPhase, setBoxStepPhase] = useState<number>(3)

  // Criterios de comparación en Pestaña 3 (Comparar 2 Cajas):
  // 'todo': Vista general con veredicto
  // 'medianas': Comparar la nota típica o centro (Mediana)
  // 'cajas': Comparar la regularidad / dispersión del 50% central (IQR)
  // 'extremos': Comparar los valores mínimos y máximos (Bigotes)
  const [compareCriteria, setCompareCriteria] = useState<'todo' | 'medianas' | 'cajas' | 'extremos'>('todo')
  const [compareShowDots, setCompareShowDots] = useState<boolean>(true)
  const [activeComparePoint, setActiveComparePoint] = useState<{
    section: 'A' | 'B'
    val: number
    rank: number
    quartile: number
  } | null>(null)

  // Modales
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [showCalculationModal, setShowCalculationModal] = useState<boolean>(false)
  const [showWhyBoxplotModal, setShowWhyBoxplotModal] = useState<boolean>(false)
  const [showCompareHelpModal, setShowCompareHelpModal] = useState<boolean>(false)
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // Datos actuales
  const scenario = useMemo(() => {
    return BOXPLOT_SCENARIOS.find((s) => s.id === selectedScenario) || BOXPLOT_SCENARIOS[0]
  }, [selectedScenario])

  // Resumen estadístico
  const summaryA = useMemo(() => calculateTukeySummary(scenario.classA.data), [scenario.classA.data])
  const summaryB = useMemo(() => calculateTukeySummary(scenario.classB.data), [scenario.classB.data])

  // Desglose aritmético detallado para la explicación paso a paso de los cuartiles
  const calcDetails = useMemo(() => {
    const sorted = summaryA.sorted
    const n = sorted.length
    const mid = Math.floor(n / 2)
    const isEven = n % 2 === 0

    // Q2 (Mediana)
    const posQ2Left = isEven ? mid : mid + 1
    const posQ2Right = isEven ? mid + 1 : mid + 1
    const valQ2Left = sorted[mid - 1]
    const valQ2Right = sorted[mid]

    // Mitad inferior
    const lowerHalf = isEven ? sorted.slice(0, mid) : sorted.slice(0, mid)
    const midLow = Math.floor(lowerHalf.length / 2)
    const isLowEven = lowerHalf.length % 2 === 0
    const posQ1Left = isLowEven ? midLow : midLow + 1
    const posQ1Right = isLowEven ? midLow + 1 : midLow + 1
    const valQ1Left = lowerHalf[midLow - 1]
    const valQ1Right = lowerHalf[midLow]

    // Mitad superior
    const upperHalf = isEven ? sorted.slice(mid) : sorted.slice(mid + 1)
    const midUp = Math.floor(upperHalf.length / 2)
    const isUpEven = upperHalf.length % 2 === 0
    const offsetUp = isEven ? mid : mid + 1
    const posQ3Left = offsetUp + (isUpEven ? midUp : midUp + 1)
    const posQ3Right = offsetUp + (isUpEven ? midUp + 1 : midUp + 1)
    const valQ3Left = upperHalf[midUp - 1]
    const valQ3Right = upperHalf[midUp]

    return {
      sorted,
      n,
      isEven,
      posQ2Left,
      posQ2Right,
      valQ2Left,
      valQ2Right,
      lowerHalf,
      isLowEven,
      posQ1Left,
      posQ1Right,
      valQ1Left,
      valQ1Right,
      upperHalf,
      isUpEven,
      posQ3Left,
      posQ3Right,
      valQ3Left,
      valQ3Right
    }
  }, [summaryA.sorted])

  // Ítems de muestra con identidad estable para animar fluidamente de desordenados a ordenados
  const sampleItems = useMemo(() => {
    const raw = scenario.classA.data
    const items = raw.map((val, rawIndex) => ({
      id: `sample-${selectedScenario}-${rawIndex}-${val}`,
      val,
      rawIndex,
      sortedIndex: 0,
      dupIndex: 0
    }))

    // Calculamos el índice ordenado y duplicados
    const sorted = [...items].sort((a, b) => a.val - b.val)
    sorted.forEach((item, sIdx) => {
      item.sortedIndex = sIdx
      const dupCount = sorted.slice(0, sIdx).filter((prev) => prev.val === item.val).length
      item.dupIndex = dupCount
    })

    return items
  }, [scenario.classA.data, selectedScenario])

  // Ítems de muestra para la Clase B (para visualizar y comparar datos reales en Pestaña 3)
  const sampleItemsB = useMemo(() => {
    const raw = scenario.classB.data
    const items = raw.map((val, rawIndex) => ({
      id: `sample-b-${selectedScenario}-${rawIndex}-${val}`,
      val,
      rawIndex,
      sortedIndex: 0,
      dupIndex: 0
    }))

    const sorted = [...items].sort((a, b) => a.val - b.val)
    sorted.forEach((item, sIdx) => {
      item.sortedIndex = sIdx
      const dupCount = sorted.slice(0, sIdx).filter((prev) => prev.val === item.val).length
      item.dupIndex = dupCount
    })

    return items
  }, [scenario.classB.data, selectedScenario])

  // Escala SVG
  const getX = useCallback(
    (val: number, min: number, max: number, startX = 60, endX = 760) => {
      const frac = (val - min) / (max - min)
      const clamped = Math.max(0, Math.min(1, frac))
      return startX + clamped * (endX - startX)
    },
    []
  )

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-900'}`}>
      {/* ── 1. CABECERA COMPACTA (36-44px) ── */}
      <header className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-300 shadow-xs'}`}>
        <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1 px-2 py-0.5 lg:py-1 rounded-md text-[11px] lg:text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white/90' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
            <span>Volver</span>
          </button>
          <span className="text-xs lg:text-sm shrink-0">📦</span>
          <h1 className="text-[12px] lg:text-[14px] font-black tracking-tight truncate">
            Medidas de Posición: Cuartiles y Diagrama de Caja (Boxplot)
          </h1>
        </div>

        {/* Selector de Situación Didáctica */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 ${
            isDark ? 'bg-sky-950/40 border-sky-400/30' : 'bg-sky-50 border-sky-400/50'
          }`}>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hidden sm:inline">Caso:</span>
            <select
              value={selectedScenario}
              onChange={(e) => {
                setSelectedScenario(e.target.value as BoxplotScenarioId)
                setStepPhase(0)
              }}
              aria-label="Seleccionar situación"
              className={`h-6 text-[11px] font-bold bg-transparent cursor-pointer outline-none ${
                isDark ? 'text-sky-300' : 'text-sky-950'
              }`}
            >
              <option value="notas" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                📝 Notas (9 a 20 pts)
              </option>
              <option value="estaturas" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                📏 Estaturas (140 a 180 cm)
              </option>
              <option value="edades" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                🎂 Edades (10 a 20 años)
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className={`p-1 lg:p-1.5 rounded-lg border cursor-pointer transition-all ${
              isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Guía didáctica"
          >
            <HelpCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-sky-500" />
          </button>
        </div>
      </header>

      {/* ── 2. BARRA DE HERRAMIENTAS Y PESTAÑAS (H-9 a H-10) ── */}
      <div className={`shrink-0 h-9 lg:h-10 border-b px-2 lg:px-4 flex items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
        isDark ? 'bg-[#0d1424] border-white/10' : 'bg-white border-slate-300'
      }`}>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cuartiles')}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap border ${
              activeTab === 'cuartiles'
                ? 'bg-blue-600 text-white font-black shadow-xs border-blue-400'
                : isDark
                ? 'bg-slate-800 text-blue-300 hover:bg-slate-700 border-white/10'
                : 'bg-slate-100 text-blue-900 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <Split className="h-3.5 w-3.5" />
            <span>1. Descubrir los 4 Cuartos (25%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('construccion')}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap border ${
              activeTab === 'construccion'
                ? 'bg-emerald-600 text-white font-black shadow-xs border-emerald-400'
                : isDark
                ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border-white/10'
                : 'bg-slate-100 text-emerald-900 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>2. De los Puntos a la Caja (Boxplot)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparar')}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap border ${
              activeTab === 'comparar'
                ? 'bg-purple-600 text-white font-black shadow-xs border-purple-400'
                : isDark
                ? 'bg-slate-800 text-purple-300 hover:bg-slate-700 border-white/10'
                : 'bg-slate-100 text-purple-900 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>3. Comparar 2 Cajas Paralelas</span>
          </button>
        </div>

        {/* Botón de fórmulas e interpretación a la derecha */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDetailModal(true)}
            className="px-2.5 py-1 rounded-md text-[10.5px] font-black cursor-pointer transition-all active:scale-95 shadow-sm flex items-center gap-1.5 border bg-sky-600 hover:bg-sky-500 text-white border-sky-400 whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Fórmulas e Interpretación</span>
          </button>
        </div>
      </div>

      {/* ── 2.1. FILA DEDICADA DE PASOS DIDÁCTICOS (Para Pestaña 1) ── */}
      {activeTab === 'cuartiles' && (
        <div className={`shrink-0 h-8 sm:h-9 border-b px-2 lg:px-4 flex items-center justify-between gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-sky-500 flex items-center gap-1 shrink-0">
              🧭 Pasos:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setStepPhase(0)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  stepPhase === 0
                    ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-blue-300 hover:bg-slate-700 border-white/10' : 'bg-white text-blue-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Paso 0: Muestra Inicial
              </button>
              <button
                type="button"
                onClick={() => setStepPhase(1)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  stepPhase === 1
                    ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-amber-300 hover:bg-slate-700 border-white/10' : 'bg-white text-amber-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Paso 1: Ordenar Datos
              </button>
              <button
                type="button"
                onClick={() => setStepPhase(2)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  stepPhase === 2
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-emerald-300 hover:bg-slate-700 border-white/10' : 'bg-white text-emerald-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Paso 2: Mediana (Q2)
              </button>
              <button
                type="button"
                onClick={() => setStepPhase(3)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  stepPhase === 3
                    ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-purple-300 hover:bg-slate-700 border-white/10' : 'bg-white text-purple-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Paso 3: ¡Los 4 Cuartos (25%)!
              </button>
            </div>
          </div>

          {/* Botones de navegación Anterior / Siguiente */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={stepPhase === 0}
              onClick={() => setStepPhase((prev) => Math.max(0, prev - 1))}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-all ${
                stepPhase === 0
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : isDark ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              ◀ Ant.
            </button>
            <button
              type="button"
              disabled={stepPhase === 3}
              onClick={() => setStepPhase((prev) => Math.min(3, prev + 1))}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-all ${
                stepPhase === 3
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : 'bg-sky-600 hover:bg-sky-500 border-sky-400 text-white font-black'
              }`}
            >
              Sig. ▶
            </button>
          </div>
        </div>
      )}

      {/* ── 2.2. FILA DE PASOS DE CONSTRUCCIÓN DE LA CAJA (Pestaña 2) ── */}
      {activeTab === 'construccion' && (
        <div className={`shrink-0 h-8 sm:h-9 border-b px-2 lg:px-4 flex items-center justify-between gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-500 flex items-center gap-1 shrink-0">
              📦 Construir:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setBoxStepPhase(0)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  boxStepPhase === 0
                    ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-blue-300 hover:bg-slate-700 border-white/10' : 'bg-white text-blue-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                1. Los 12 Puntos
              </button>
              <button
                type="button"
                onClick={() => setBoxStepPhase(1)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  boxStepPhase === 1
                    ? 'bg-sky-600 text-white border-sky-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-sky-300 hover:bg-slate-700 border-white/10' : 'bg-white text-sky-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                2. Las 5 Marcas
              </button>
              <button
                type="button"
                onClick={() => setBoxStepPhase(2)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  boxStepPhase === 2
                    ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-purple-300 hover:bg-slate-700 border-white/10' : 'bg-white text-purple-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                3. Nace la Caja (50%)
              </button>
              <button
                type="button"
                onClick={() => setBoxStepPhase(3)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                  boxStepPhase === 3
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                    : isDark ? 'bg-slate-800/80 text-emerald-300 hover:bg-slate-700 border-white/10' : 'bg-white text-emerald-800 hover:bg-slate-100 border-slate-300'
                }`}
              >
                4. ¡Boxplot Completo!
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowWhyBoxplotModal(true)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold border bg-amber-600 hover:bg-amber-500 text-white border-amber-400 cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
            >
              <span>💡</span>
              <span className="hidden sm:inline">¿Para qué sirve el Boxplot?</span>
              <span className="sm:hidden">¿Para qué sirve?</span>
            </button>

            <button
              type="button"
              disabled={boxStepPhase === 0}
              onClick={() => setBoxStepPhase((prev) => Math.max(0, prev - 1))}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-all ${
                boxStepPhase === 0
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : isDark ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              ◀ Ant.
            </button>
            <button
              type="button"
              disabled={boxStepPhase === 3}
              onClick={() => setBoxStepPhase((prev) => Math.min(3, prev + 1))}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-all ${
                boxStepPhase === 3
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white font-black'
              }`}
            >
              Sig. ▶
            </button>
          </div>
        </div>
      )}

      {/* ── 2.3. FILA DE CRITERIOS DE COMPARACIÓN (Pestaña 3) ── */}
      {activeTab === 'comparar' && (
        <div className={`shrink-0 h-8 sm:h-9 border-b px-2 lg:px-4 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-400 flex items-center gap-1 shrink-0">
              🔍 Criterio:
            </span>
            <button
              type="button"
              onClick={() => setCompareCriteria('todo')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                compareCriteria === 'todo'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                  : isDark ? 'bg-slate-800/80 text-purple-300 hover:bg-slate-700 border-white/10' : 'bg-white text-purple-800 hover:bg-slate-100 border-slate-300'
              }`}
            >
              1. General
            </button>
            <button
              type="button"
              onClick={() => setCompareCriteria('medianas')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                compareCriteria === 'medianas'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                  : isDark ? 'bg-slate-800/80 text-emerald-300 hover:bg-slate-700 border-white/10' : 'bg-white text-emerald-800 hover:bg-slate-100 border-slate-300'
              }`}
            >
              2. Medianas
            </button>
            <button
              type="button"
              onClick={() => setCompareCriteria('cajas')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                compareCriteria === 'cajas'
                  ? 'bg-sky-600 text-white border-sky-400 shadow-xs'
                  : isDark ? 'bg-slate-800/80 text-sky-300 hover:bg-slate-700 border-white/10' : 'bg-white text-sky-800 hover:bg-slate-100 border-slate-300'
              }`}
            >
              3. Cajas (IQR)
            </button>
            <button
              type="button"
              onClick={() => setCompareCriteria('extremos')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black cursor-pointer border transition-all active:scale-95 ${
                compareCriteria === 'extremos'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                  : isDark ? 'bg-slate-800/80 text-amber-300 hover:bg-slate-700 border-white/10' : 'bg-white text-amber-800 hover:bg-slate-100 border-slate-300'
              }`}
            >
              4. Bigotes
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCompareShowDots(!compareShowDots)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold border cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1 ${
                compareShowDots
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              <span>{compareShowDots ? '👁️' : '📦'}</span>
              <span>{compareShowDots ? '24 Datos' : 'Solo Cajas'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCompareHelpModal(true)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold border bg-purple-600 hover:bg-purple-500 text-white border-purple-400 cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
            >
              <span>❓</span>
              <span>Preguntas</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. ÁREA DE TRABAJO PRINCIPAL (PANTALLA COMPLETA CERO SCROLL) ── */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between p-1.5 sm:p-2 lg:p-3 overflow-hidden">
        <div className={`flex-1 min-h-0 relative flex flex-col justify-between rounded-2xl border p-2 lg:p-3 overflow-hidden ${
          isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-300 shadow-md'
        }`}>

          {/* ── CONTENIDO PESTAÑA 1: DESCUBRIR CUARTILES PASO A PASO ── */}
          {activeTab === 'cuartiles' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
              {/* Noticia didáctica del paso activo */}
              <div className={`shrink-0 p-2 rounded-xl border flex items-center justify-between text-xs gap-2 ${
                isDark ? 'bg-sky-950/30 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-950'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">💡</span>
                  <p className="leading-tight text-[11px] lg:text-xs">
                    {stepPhase === 0 && 'Muestra de N = 12 datos sin ordenar. Para calcular cualquier cuartil o percentil, el primer requisito obligatorio es ordenar los datos de menor a mayor.'}
                    {stepPhase === 1 && '¡Datos Ordenados! Ahora los 12 datos están perfectamente formados en fila de menor a mayor sobre la recta numérica.'}
                    {stepPhase === 2 && `El Cuartil 2 (Q2 = ${summaryA.q2}) es la Mediana: divide exactamente a los 12 estudiantes en dos grupos de 6 (50% a la izquierda y 50% a la derecha).`}
                    {stepPhase === 3 && `¡Los 4 Cuartiles! Q1 = ${summaryA.q1}, Q2 = ${summaryA.q2} y Q3 = ${summaryA.q3} dividen a toda la población en 4 bloques exactos con el 25% de los estudiantes cada uno.`}
                  </p>
                </div>
                {(stepPhase === 2 || stepPhase === 3) && (
                  <button
                    type="button"
                    onClick={() => setShowCalculationModal(true)}
                    className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>📐</span>
                    <span>Ver cálculo</span>
                  </button>
                )}
              </div>

              {/* Gráfico Vectorial Interactivo */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative">
                <svg viewBox="0 0 820 185" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Bandeja de datos desordenados (visible en Paso 0 arriba) */}
                  <g className="transition-opacity duration-700" opacity={stepPhase === 0 ? 1 : 0} pointerEvents={stepPhase === 0 ? 'auto' : 'none'}>
                    <rect
                      x="65"
                      y="10"
                      width="690"
                      height="64"
                      rx="12"
                      fill={isDark ? '#0f172a' : '#f8fafc'}
                      fillOpacity={isDark ? 0.75 : 0.9}
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <text
                      x="410"
                      y="26"
                      textAnchor="middle"
                      className="font-mono text-[10.5px] font-black fill-sky-400"
                    >
                      📦 Muestra inicial de N = {sampleItems.length} datos (sin ordenar)
                    </text>
                  </g>

                  {/* Mensaje instructivo sobre el eje en Paso 0 */}
                  {stepPhase === 0 && (
                    <g className="animate-in fade-in duration-500">
                      <text
                        x="410"
                        y="108"
                        textAnchor="middle"
                        className={`font-mono text-[11px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}
                        opacity="0.85"
                      >
                        ⬇️ Haz clic en "Paso 1: Ordenar" para ver los datos descender a la recta numérica ⬇️
                      </text>
                    </g>
                  )}

                  {/* Bandas de color del 25% en paso 3 */}
                  {stepPhase === 3 && (
                    <g className="animate-in fade-in duration-300">
                      {/* 1° Cuarto: Min a Q1 */}
                      <rect
                        x={getX(summaryA.min, scenario.minScale, scenario.maxScale)}
                        y="35"
                        width={getX(summaryA.q1, scenario.minScale, scenario.maxScale) - getX(summaryA.min, scenario.minScale, scenario.maxScale)}
                        height="85"
                        rx="4"
                        fill="#38bdf8"
                        fillOpacity="0.22"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                      <rect
                        x={(getX(summaryA.min, scenario.minScale, scenario.maxScale) + getX(summaryA.q1, scenario.minScale, scenario.maxScale)) / 2 - 45}
                        y="44"
                        width="90"
                        height="18"
                        rx="4"
                        fill={isDark ? '#080c18' : '#ffffff'}
                        fillOpacity="0.85"
                        stroke="#38bdf8"
                        strokeWidth="1"
                      />
                      <text
                        x={(getX(summaryA.min, scenario.minScale, scenario.maxScale) + getX(summaryA.q1, scenario.minScale, scenario.maxScale)) / 2}
                        y="53"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9px] font-black fill-sky-400"
                      >
                        1° Cuarto (25%)
                      </text>

                      {/* 2° Cuarto: Q1 a Q2 */}
                      <rect
                        x={getX(summaryA.q1, scenario.minScale, scenario.maxScale)}
                        y="35"
                        width={getX(summaryA.q2, scenario.minScale, scenario.maxScale) - getX(summaryA.q1, scenario.minScale, scenario.maxScale)}
                        height="85"
                        rx="4"
                        fill="#10b981"
                        fillOpacity="0.25"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                      <rect
                        x={(getX(summaryA.q1, scenario.minScale, scenario.maxScale) + getX(summaryA.q2, scenario.minScale, scenario.maxScale)) / 2 - 45}
                        y="44"
                        width="90"
                        height="18"
                        rx="4"
                        fill={isDark ? '#080c18' : '#ffffff'}
                        fillOpacity="0.85"
                        stroke="#10b981"
                        strokeWidth="1"
                      />
                      <text
                        x={(getX(summaryA.q1, scenario.minScale, scenario.maxScale) + getX(summaryA.q2, scenario.minScale, scenario.maxScale)) / 2}
                        y="53"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9px] font-black fill-emerald-400"
                      >
                        2° Cuarto (25%)
                      </text>

                      {/* 3° Cuarto: Q2 a Q3 */}
                      <rect
                        x={getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        y="35"
                        width={getX(summaryA.q3, scenario.minScale, scenario.maxScale) - getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        height="85"
                        rx="4"
                        fill="#8b5cf6"
                        fillOpacity="0.25"
                        stroke="#8b5cf6"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                      <rect
                        x={(getX(summaryA.q2, scenario.minScale, scenario.maxScale) + getX(summaryA.q3, scenario.minScale, scenario.maxScale)) / 2 - 45}
                        y="44"
                        width="90"
                        height="18"
                        rx="4"
                        fill={isDark ? '#080c18' : '#ffffff'}
                        fillOpacity="0.85"
                        stroke="#8b5cf6"
                        strokeWidth="1"
                      />
                      <text
                        x={(getX(summaryA.q2, scenario.minScale, scenario.maxScale) + getX(summaryA.q3, scenario.minScale, scenario.maxScale)) / 2}
                        y="53"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9px] font-black fill-purple-400"
                      >
                        3° Cuarto (25%)
                      </text>

                      {/* 4° Cuarto: Q3 a Max */}
                      <rect
                        x={getX(summaryA.q3, scenario.minScale, scenario.maxScale)}
                        y="35"
                        width={getX(summaryA.max, scenario.minScale, scenario.maxScale) - getX(summaryA.q3, scenario.minScale, scenario.maxScale)}
                        height="85"
                        rx="4"
                        fill="#f59e0b"
                        fillOpacity="0.22"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                      <rect
                        x={(getX(summaryA.q3, scenario.minScale, scenario.maxScale) + getX(summaryA.max, scenario.minScale, scenario.maxScale)) / 2 - 45}
                        y="44"
                        width="90"
                        height="18"
                        rx="4"
                        fill={isDark ? '#080c18' : '#ffffff'}
                        fillOpacity="0.85"
                        stroke="#f59e0b"
                        strokeWidth="1"
                      />
                      <text
                        x={(getX(summaryA.q3, scenario.minScale, scenario.maxScale) + getX(summaryA.max, scenario.minScale, scenario.maxScale)) / 2}
                        y="53"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9px] font-black fill-amber-400"
                      >
                        4° Cuarto (25%)
                      </text>

                      {/* Líneas divisorias de Cuartiles */}
                      <line x1={getX(summaryA.q1, scenario.minScale, scenario.maxScale)} y1="35" x2={getX(summaryA.q1, scenario.minScale, scenario.maxScale)} y2="145" stroke="#38bdf8" strokeWidth="2.5" />
                      <line x1={getX(summaryA.q2, scenario.minScale, scenario.maxScale)} y1="30" x2={getX(summaryA.q2, scenario.minScale, scenario.maxScale)} y2="145" stroke="#10b981" strokeWidth="3.5" />
                      <line x1={getX(summaryA.q3, scenario.minScale, scenario.maxScale)} y1="35" x2={getX(summaryA.q3, scenario.minScale, scenario.maxScale)} y2="145" stroke="#8b5cf6" strokeWidth="2.5" />
                    </g>
                  )}

                  {/* Eje horizontal */}
                  <line
                    x1="60"
                    y1="135"
                    x2="760"
                    y2="135"
                    stroke={isDark ? '#475569' : '#cbd5e1'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={stepPhase === 0 ? 0.45 : 1}
                    className="transition-opacity duration-700"
                  />
                  {/* Ticks */}
                  {Array.from({ length: Math.round((scenario.maxScale - scenario.minScale) / scenario.stepScale) + 1 }).map((_, i) => {
                    const val = scenario.minScale + i * scenario.stepScale
                    const x = getX(val, scenario.minScale, scenario.maxScale)
                    return (
                      <g key={`box-tick-${val}`} opacity={stepPhase === 0 ? 0.45 : 1} className="transition-opacity duration-700">
                        <line x1={x} y1="130" x2={x} y2="140" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                        <text x={x} y="156" textAnchor="middle" className={`font-mono text-[10px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {/* Línea vertical de Q2 (Mediana) en Paso 2 */}
                  {stepPhase === 2 && (
                    <g className="animate-in fade-in duration-500">
                      <line
                        x1={getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        y1="30"
                        x2={getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        y2="145"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeDasharray="4 2"
                      />
                      <rect
                        x={getX(summaryA.q2, scenario.minScale, scenario.maxScale) - 52}
                        y="10"
                        width="104"
                        height="22"
                        rx="5"
                        fill="#10b981"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                      />
                      <text
                        x={getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        y="21"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[10px] font-black fill-slate-950"
                      >
                        Q2 (Mediana) = {summaryA.q2}
                      </text>
                      {/* Indicador de 50% mitad izquierda y derecha */}
                      <text
                        x={(getX(summaryA.min, scenario.minScale, scenario.maxScale) + getX(summaryA.q2, scenario.minScale, scenario.maxScale)) / 2}
                        y="55"
                        textAnchor="middle"
                        className="font-mono text-[10px] font-black fill-sky-400"
                      >
                        50% Inferior (6 datos)
                      </text>
                      <text
                        x={(getX(summaryA.q2, scenario.minScale, scenario.maxScale) + getX(summaryA.max, scenario.minScale, scenario.maxScale)) / 2}
                        y="55"
                        textAnchor="middle"
                        className="font-mono text-[10px] font-black fill-purple-400"
                      >
                        50% Superior (6 datos)
                      </text>
                    </g>
                  )}

                  {/* Líneas verticales de Q1 y Q3 en Paso 3 */}
                  {stepPhase >= 3 && (
                    <g className="animate-in fade-in duration-300">
                      {/* Q1 */}
                      <rect
                        x={getX(summaryA.q1, scenario.minScale, scenario.maxScale) - 34}
                        y="8"
                        width="68"
                        height="18"
                        rx="4"
                        fill="#38bdf8"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                      />
                      <text
                        x={getX(summaryA.q1, scenario.minScale, scenario.maxScale)}
                        y="17"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9.5px] font-black fill-slate-950"
                      >
                        Q1 = {summaryA.q1}
                      </text>

                      {/* Q2 */}
                      <rect
                        x={getX(summaryA.q2, scenario.minScale, scenario.maxScale) - 34}
                        y="8"
                        width="68"
                        height="18"
                        rx="4"
                        fill="#10b981"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                      />
                      <text
                        x={getX(summaryA.q2, scenario.minScale, scenario.maxScale)}
                        y="17"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9.5px] font-black fill-slate-950"
                      >
                        Q2 = {summaryA.q2}
                      </text>

                      {/* Q3 */}
                      <rect
                        x={getX(summaryA.q3, scenario.minScale, scenario.maxScale) - 34}
                        y="8"
                        width="68"
                        height="18"
                        rx="4"
                        fill="#8b5cf6"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                      />
                      <text
                        x={getX(summaryA.q3, scenario.minScale, scenario.maxScale)}
                        y="17"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9.5px] font-black fill-white"
                      >
                        Q3 = {summaryA.q3}
                      </text>
                    </g>
                  )}

                  {/* Puntos de datos animados: en Paso 0 arriba en la bandeja; en Paso >= 1 descienden suavemente sobre la recta */}
                  {sampleItems.map((item) => {
                    const isStep0 = stepPhase === 0
                    const targetX = getX(item.val, scenario.minScale, scenario.maxScale)
                    const x = isStep0 ? 92 + item.rawIndex * 58 : targetX
                    const targetY = 135 - 15 - item.dupIndex * 24
                    const y = isStep0 ? 48 : targetY

                    // Color según el paso
                    let ptColor = '#38bdf8'
                    if (stepPhase === 2) {
                      ptColor = item.val <= summaryA.q2 ? '#38bdf8' : '#8b5cf6'
                    } else if (stepPhase === 3) {
                      if (item.val <= summaryA.q1) ptColor = '#38bdf8'
                      else if (item.val <= summaryA.q2) ptColor = '#10b981'
                      else if (item.val <= summaryA.q3) ptColor = '#8b5cf6'
                      else ptColor = '#f59e0b'
                    }

                    return (
                      <g
                        key={item.id}
                        style={{
                          transform: `translate(${x}px, ${y}px)`,
                          transition: 'transform 1.3s cubic-bezier(0.25, 1, 0.5, 1)',
                          willChange: 'transform'
                        }}
                      >
                        <circle
                          cx="0"
                          cy="0"
                          r="11"
                          fill={ptColor}
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))"
                          className="transition-colors duration-500"
                        />
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-mono text-[10px] font-black fill-white select-none pointer-events-none"
                        >
                          {item.val}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Fila de Cuartiles y Resumen de Tukey */}
              <div className="grid grid-cols-5 gap-2 shrink-0 text-center font-mono text-xs">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                  <span className="text-[10px] font-sans font-bold opacity-70 block">Mínimo (0%)</span>
                  <span className="text-base font-black text-sky-400">{summaryA.min} {scenario.unitShort}</span>
                </div>
                <div
                  onClick={() => setShowCalculationModal(true)}
                  className={`p-2 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all group ${isDark ? 'bg-sky-950/40 border-sky-500/40 hover:bg-sky-950/70' : 'bg-sky-50 border-sky-300 hover:bg-sky-100'}`}
                  title="Clic para ver cómo se calculó Q1"
                >
                  <span className="text-[10px] font-sans font-bold text-sky-400 block flex items-center justify-center gap-0.5">
                    Cuartil 1 (25%) <span className="opacity-60 text-[9px]">📐</span>
                  </span>
                  <span className="text-base font-black text-sky-400">{summaryA.q1} {scenario.unitShort}</span>
                </div>
                <div
                  onClick={() => setShowCalculationModal(true)}
                  className={`p-2 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all group ${isDark ? 'bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-950/70' : 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100'}`}
                  title="Clic para ver cómo se calculó la Mediana Q2"
                >
                  <span className="text-[10px] font-sans font-bold text-emerald-400 block flex items-center justify-center gap-0.5">
                    Mediana Q2 (50%) <span className="opacity-60 text-[9px]">📐</span>
                  </span>
                  <span className="text-base font-black text-emerald-400">{summaryA.q2} {scenario.unitShort}</span>
                </div>
                <div
                  onClick={() => setShowCalculationModal(true)}
                  className={`p-2 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all group ${isDark ? 'bg-purple-950/40 border-purple-500/40 hover:bg-purple-950/70' : 'bg-purple-50 border-purple-300 hover:bg-purple-100'}`}
                  title="Clic para ver cómo se calculó Q3"
                >
                  <span className="text-[10px] font-sans font-bold text-purple-400 block flex items-center justify-center gap-0.5">
                    Cuartil 3 (75%) <span className="opacity-60 text-[9px]">📐</span>
                  </span>
                  <span className="text-base font-black text-purple-400">{summaryA.q3} {scenario.unitShort}</span>
                </div>
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/40 border-amber-500/40' : 'bg-amber-50 border-amber-300'}`}>
                  <span className="text-[10px] font-sans font-bold text-amber-400 block">Máximo (100%)</span>
                  <span className="text-base font-black text-amber-400">{summaryA.max} {scenario.unitShort}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENIDO PESTAÑA 2: CONSTRUCCIÓN COMPLETA DE LA CAJA Y BIGOTES ── */}
          {activeTab === 'construccion' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
              {/* Noticia didáctica del paso activo en Construcción */}
              <div className={`shrink-0 p-2 rounded-xl border flex items-center justify-between text-xs gap-2 ${
                isDark ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">📦</span>
                  <p className="leading-tight text-[11px] lg:text-xs">
                    {boxStepPhase === 0 && 'Paso 1: Muestra sobre la recta. Aquí están tus 12 estudiantes ordenados (notas de 10 a 19). En vez de analizar 12 puntos uno por uno, el Boxplot los condensará en 1 sola figura de 5 números.'}
                    {boxStepPhase === 1 && `Paso 2: Proyectamos los 5 números clave de Tukey: Mínimo (${summaryA.min}), Q1 (${summaryA.q1}), Mediana (${summaryA.q2}), Q3 (${summaryA.q3}) y Máximo (${summaryA.max}). Observa las líneas guía que suben desde los puntos.`}
                    {boxStepPhase === 2 && `Paso 3: ¡Nace la Caja! Se construye un rectángulo que encierra al 50% central (los 6 alumnos del medio, de ${summaryA.q1} a ${summaryA.q3} pts). Su ancho es el IQR = ${summaryA.iqr} pts, y la línea verde marca el centro del grupo (Mediana = ${summaryA.q2}).`}
                    {boxStepPhase === 3 && `Paso 4: ¡Bigotes y Boxplot Completo! Se estiran dos bigotes hacia los extremos: el izquierdo cubre al 25% con notas más bajas (${summaryA.min} a ${summaryA.q1}) y el derecho al 25% con notas más altas (${summaryA.q3} a ${summaryA.max}).`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhyBoxplotModal(true)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border bg-amber-600 hover:bg-amber-500 text-white border-amber-400 cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  <span>💡</span>
                  <span>¿Para qué sirve?</span>
                </button>
              </div>

              {/* Escenario de Boxplot Proyectado e Interactivo */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative">
                <svg viewBox="0 0 820 185" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Coordenadas X de los 5 números de Tukey */}
                  {(() => {
                    const xMin = getX(summaryA.min, scenario.minScale, scenario.maxScale)
                    const xQ1 = getX(summaryA.q1, scenario.minScale, scenario.maxScale)
                    const xQ2 = getX(summaryA.q2, scenario.minScale, scenario.maxScale)
                    const xQ3 = getX(summaryA.q3, scenario.minScale, scenario.maxScale)
                    const xMax = getX(summaryA.max, scenario.minScale, scenario.maxScale)

                    const yTop = 26
                    const h = 46
                    const yBoxCenter = yTop + h / 2
                    const yLineAxis = 145

                    return (
                      <g>
                        {/* 1. Líneas de Proyección Vertical punteadas desde los puntos hacia arriba */}
                        {boxStepPhase >= 1 && (
                          <g className="animate-in fade-in duration-500">
                            {/* Proyección Mínimo */}
                            <line x1={xMin} y1={yBoxCenter + 15} x2={xMin} y2={yLineAxis - 15} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                            {/* Proyección Q1 */}
                            <line x1={xQ1} y1={yTop + h} x2={xQ1} y2={yLineAxis - 15} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                            {/* Proyección Q2 */}
                            <line x1={xQ2} y1={yTop + h} x2={xQ2} y2={yLineAxis - 15} stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" opacity="0.75" />
                            {/* Proyección Q3 */}
                            <line x1={xQ3} y1={yTop + h} x2={xQ3} y2={yLineAxis - 15} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                            {/* Proyección Máximo */}
                            <line x1={xMax} y1={yBoxCenter + 15} x2={xMax} y2={yLineAxis - 15} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

                            {/* Placas/Insignias de los 5 números */}
                            <rect x={xMin - 28} y={yTop + h + 8} width="56" height="17" rx="3.5" fill={isDark ? '#0f172a' : '#ffffff'} fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
                            <text x={xMin} y={yTop + h + 17} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-sky-400">
                              Mín ({summaryA.min})
                            </text>

                            <rect x={xQ1 - 28} y={yTop + h + 8} width="56" height="17" rx="3.5" fill={isDark ? '#0f172a' : '#ffffff'} fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
                            <text x={xQ1} y={yTop + h + 17} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-sky-400">
                              Q1 = {summaryA.q1}
                            </text>

                            <rect x={xQ2 - 30} y={yTop + h + 8} width="60" height="17" rx="3.5" fill={isDark ? '#0f172a' : '#ffffff'} fillOpacity="0.85" stroke="#10b981" strokeWidth="1.2" />
                            <text x={xQ2} y={yTop + h + 17} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-emerald-400">
                              Me = {summaryA.q2}
                            </text>

                            <rect x={xQ3 - 28} y={yTop + h + 8} width="56" height="17" rx="3.5" fill={isDark ? '#0f172a' : '#ffffff'} fillOpacity="0.85" stroke="#8b5cf6" strokeWidth="1" />
                            <text x={xQ3} y={yTop + h + 17} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-purple-400">
                              Q3 = {summaryA.q3}
                            </text>

                            <rect x={xMax - 28} y={yTop + h + 8} width="56" height="17" rx="3.5" fill={isDark ? '#0f172a' : '#ffffff'} fillOpacity="0.85" stroke="#f59e0b" strokeWidth="1" />
                            <text x={xMax} y={yTop + h + 17} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-amber-400">
                              Máx ({summaryA.max})
                            </text>
                          </g>
                        )}

                        {/* 2. La Caja Central (50%) en Paso >= 2 */}
                        {boxStepPhase >= 2 && (
                          <g className="animate-in fade-in duration-500">
                            {/* Cuerpo de la Caja */}
                            <rect
                              x={xQ1}
                              y={yTop}
                              width={Math.max(10, xQ3 - xQ1)}
                              height={h}
                              rx="5"
                              fill="#8b5cf6"
                              fillOpacity="0.3"
                              stroke="#8b5cf6"
                              strokeWidth="2.5"
                              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
                            />

                            {/* Línea de la Mediana (Q2) en el interior */}
                            <line x1={xQ2} y1={yTop} x2={xQ2} y2={yTop + h} stroke="#10b981" strokeWidth="3.5" />

                            {/* Soporte y rótulo superior del IQR */}
                            <line x1={xQ1} y1={yTop - 6} x2={xQ3} y2={yTop - 6} stroke="#c084fc" strokeWidth="1.5" />
                            <text x={(xQ1 + xQ3) / 2} y={yTop - 11} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-purple-300">
                              Caja = 50% Central (IQR: {summaryA.iqr} pts)
                            </text>
                          </g>
                        )}

                        {/* 3. Los Bigotes en Paso >= 3 */}
                        {boxStepPhase >= 3 && (
                          <g className="animate-in fade-in duration-500">
                            {/* Bigote Izquierdo */}
                            <line x1={xMin} y1={yBoxCenter} x2={xQ1} y2={yBoxCenter} stroke="#38bdf8" strokeWidth="2.5" />
                            <line x1={xMin} y1={yBoxCenter - 14} x2={xMin} y2={yBoxCenter + 14} stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

                            {/* Bigote Derecho */}
                            <line x1={xQ3} y1={yBoxCenter} x2={xMax} y2={yBoxCenter} stroke="#f59e0b" strokeWidth="2.5" />
                            <line x1={xMax} y1={yBoxCenter - 14} x2={xMax} y2={yBoxCenter + 14} stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                          </g>
                        )}
                      </g>
                    )
                  })()}

                  {/* Eje horizontal */}
                  <line x1="60" y1="145" x2="760" y2="145" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />

                  {/* Ticks de la escala numérica */}
                  {Array.from({ length: Math.round((scenario.maxScale - scenario.minScale) / scenario.stepScale) + 1 }).map((_, i) => {
                    const val = scenario.minScale + i * scenario.stepScale
                    const x = getX(val, scenario.minScale, scenario.maxScale)
                    return (
                      <g key={`box-build-tick-${val}`}>
                        <line x1={x} y1="140" x2={x} y2="150" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                        <text x={x} y="165" textAnchor="middle" className={`font-mono text-[10px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {/* Puntos individuales reales de los estudiantes con números y apilamiento */}
                  {sampleItems.map((item) => {
                    const x = getX(item.val, scenario.minScale, scenario.maxScale)
                    const y = 145 - 15 - item.dupIndex * 24

                    // Color según su cuartil
                    let ptColor = '#38bdf8'
                    if (item.val <= summaryA.q1) ptColor = '#38bdf8'
                    else if (item.val <= summaryA.q2) ptColor = '#10b981'
                    else if (item.val <= summaryA.q3) ptColor = '#8b5cf6'
                    else ptColor = '#f59e0b'

                    return (
                      <g key={`box-build-pt-${item.id}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r="11"
                          fill={ptColor}
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        />
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-mono text-[10px] font-black fill-white select-none pointer-events-none"
                        >
                          {item.val}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Guía didáctica de lectura rápida de las 3 partes del Boxplot */}
              <div className="grid grid-cols-3 gap-2 shrink-0 font-mono text-xs">
                {/* Bigote Izquierdo */}
                <div className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                  boxStepPhase >= 3 ? 'border-sky-500/40 bg-sky-950/20' : 'opacity-60 border-white/10 bg-slate-800/40'
                } ${isDark ? '' : 'bg-sky-50/80 border-sky-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-sky-400">🔵 Bigote Izquierdo</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">25% más bajo</span>
                  </div>
                  <div className="text-xs font-black text-sky-400">
                    Notas de {summaryA.min} a {summaryA.q1} {scenario.unitShort}
                  </div>
                  <p className="text-[10px] font-sans opacity-80 leading-snug">
                    Concentra a los <strong>3 alumnos</strong> con menor nota. Su longitud mide qué tan lejos quedó el peor alumno del 25% central.
                  </p>
                </div>

                {/* Caja Central */}
                <div className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                  boxStepPhase >= 2 ? 'border-purple-500/50 bg-purple-950/30' : 'opacity-60 border-white/10 bg-slate-800/40'
                } ${isDark ? '' : 'bg-purple-50/80 border-purple-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-purple-400">🟣 Caja Central (IQR)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">50% del grupo</span>
                  </div>
                  <div className="text-xs font-black text-purple-300">
                    Notas de {summaryA.q1} a {summaryA.q3} (Ancho: {summaryA.iqr} pts)
                  </div>
                  <p className="text-[10px] font-sans opacity-80 leading-snug">
                    El "corazón" del grupo: los <strong>6 alumnos</strong> del medio. Línea verde = Mediana ({summaryA.q2}). Caja angosta = notas parecidas.
                  </p>
                </div>

                {/* Bigote Derecho */}
                <div className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                  boxStepPhase >= 3 ? 'border-amber-500/40 bg-amber-950/20' : 'opacity-60 border-white/10 bg-slate-800/40'
                } ${isDark ? '' : 'bg-amber-50/80 border-amber-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-amber-400">🟠 Bigote Derecho</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">25% más alto</span>
                  </div>
                  <div className="text-xs font-black text-amber-400">
                    Notas de {summaryA.q3} a {summaryA.max} {scenario.unitShort}
                  </div>
                  <p className="text-[10px] font-sans opacity-80 leading-snug">
                    Concentra a los <strong>3 alumnos</strong> con mayor nota. Muestra hasta dónde se estira la calificación más alta ({summaryA.max}).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENIDO PESTAÑA 3: COMPARAR 2 CAJAS PARALELAS ── */}
          {activeTab === 'comparar' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5 overflow-hidden">
              {/* Barra de Síntesis y Datos Reales (Compacta, Cero scroll, Ultra legible) */}
              <div className={`shrink-0 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border flex flex-col gap-1 ${
                isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Fila superior: Explicación directa del criterio seleccionado */}
                <div className="flex items-center justify-between text-[10.5px] sm:text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">📊</span>
                    <p className="truncate text-slate-700 dark:text-slate-200 leading-tight">
                      {compareCriteria === 'todo' && <span><strong>Vista General:</strong> 12 alumnos por sección. Las cajas encierran al 50% central y los puntos son las notas reales de cada estudiante.</span>}
                      {compareCriteria === 'medianas' && <span><strong>Mediana (Centro):</strong> El alumno central de la Sec. A (nota {summaryA.q2}) supera por +{(summaryA.q2 - summaryB.q2).toFixed(1)} pts al alumno central de la Sec. B (nota {summaryB.q2}).</span>}
                      {compareCriteria === 'cajas' && <span><strong>Cajas (Regularidad IQR):</strong> Ambas encierran al 50% central (6 alumnos), pero en A están concentrados (IQR={summaryA.iqr}) y en B muy esparcidos (IQR={summaryB.iqr}).</span>}
                      {compareCriteria === 'extremos' && <span><strong>Bigotes (Límites):</strong> La Sec. B tiene dos notas 20, pero también la peor nota ({summaryB.min}). La Sec. A es mucho más consistente.</span>}
                    </p>
                  </div>
                  {activeComparePoint && (
                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-300 text-[10px] font-mono animate-in fade-in">
                      <span>🎯 Nota <strong>{activeComparePoint.val}</strong> (Sec. {activeComparePoint.section}, Puesto #{activeComparePoint.rank})</span>
                      <button type="button" onClick={() => setActiveComparePoint(null)} className="ml-1 font-bold cursor-pointer hover:opacity-75">×</button>
                    </div>
                  )}
                </div>

                {/* Filas de Datos Reales (A y B a ancho completo, 100% de los datos visibles sin recorte) */}
                <div className="flex flex-col gap-1 text-[9.5px] sm:text-[10px] font-mono">
                  {/* Sec A */}
                  <div className={`px-2 py-0.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                    isDark ? 'bg-sky-950/25 border-sky-500/30 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                  }`}>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                      <span className="font-bold text-sky-500 shrink-0">🟦 Sec. A (12 datos):</span>
                      <span className="text-sky-400 font-bold">[{summaryA.sorted.slice(0, 3).join(', ')}]</span>
                      <span className="opacity-30">·</span>
                      <span className="text-emerald-400 font-bold">[{summaryA.sorted.slice(3, 6).join(', ')}]</span>
                      <span className="text-emerald-400 font-black text-xs px-0.5">‖</span>
                      <span className="text-purple-400 font-bold">[{summaryA.sorted.slice(6, 9).join(', ')}]</span>
                      <span className="opacity-30">·</span>
                      <span className="text-amber-400 font-bold">[{summaryA.sorted.slice(9, 12).join(', ')}]</span>
                    </div>
                    <span className="font-bold text-emerald-500 dark:text-emerald-400 shrink-0 font-sans text-[10px] sm:text-[10.5px]">
                      Me = {summaryA.q2} {scenario.unitShort}
                    </span>
                  </div>

                  {/* Sec B */}
                  <div className={`px-2 py-0.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                    isDark ? 'bg-pink-950/25 border-pink-500/30 text-pink-200' : 'bg-pink-50 border-pink-200 text-pink-900'
                  }`}>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                      <span className="font-bold text-pink-500 shrink-0">🟪 Sec. B (12 datos):</span>
                      <span className="text-sky-400 font-bold">[{summaryB.sorted.slice(0, 3).join(', ')}]</span>
                      <span className="opacity-30">·</span>
                      <span className="text-emerald-400 font-bold">[{summaryB.sorted.slice(3, 6).join(', ')}]</span>
                      <span className="text-pink-400 font-black text-xs px-0.5">‖</span>
                      <span className="text-purple-400 font-bold">[{summaryB.sorted.slice(6, 9).join(', ')}]</span>
                      <span className="opacity-30">·</span>
                      <span className="text-amber-400 font-bold">[{summaryB.sorted.slice(9, 12).join(', ')}]</span>
                    </div>
                    <span className="font-bold text-pink-500 dark:text-pink-400 shrink-0 font-sans text-[10px] sm:text-[10.5px]">
                      Me = {summaryB.q2} {scenario.unitShort}
                    </span>
                  </div>
                </div>
              </div>

              {/* Escenario de Dos Cajas Paralelas Interactivas (Espacioso, sin colisiones) */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative w-full">
                <svg viewBox="0 0 820 225" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {(() => {
                    const xMinA = getX(summaryA.min, scenario.minScale, scenario.maxScale)
                    const xQ1A = getX(summaryA.q1, scenario.minScale, scenario.maxScale)
                    const xQ2A = getX(summaryA.q2, scenario.minScale, scenario.maxScale)
                    const xQ3A = getX(summaryA.q3, scenario.minScale, scenario.maxScale)
                    const xMaxA = getX(summaryA.max, scenario.minScale, scenario.maxScale)

                    const xMinB = getX(summaryB.min, scenario.minScale, scenario.maxScale)
                    const xQ1B = getX(summaryB.q1, scenario.minScale, scenario.maxScale)
                    const xQ2B = getX(summaryB.q2, scenario.minScale, scenario.maxScale)
                    const xQ3B = getX(summaryB.q3, scenario.minScale, scenario.maxScale)
                    const xMaxB = getX(summaryB.max, scenario.minScale, scenario.maxScale)

                    const yBoxA = 55
                    const hA = 28
                    const yTopA = yBoxA - hA / 2 // 41
                    const yBottomA = yBoxA + hA / 2 // 69

                    const yBoxB = 152
                    const hB = 28
                    const yTopB = yBoxB - hB / 2 // 138
                    const yBottomB = yBoxB + hB / 2 // 166

                    const isDimWhiskers = compareCriteria === 'cajas'
                    const isDimBoxes = compareCriteria === 'extremos'
                    const isFocusMedians = compareCriteria === 'medianas'

                    return (
                      <g>
                        {/* Franja comparativa entre las dos medianas */}
                        {(isFocusMedians || compareCriteria === 'todo') && (
                          <g className="animate-in fade-in duration-500">
                            {/* Líneas guía verticales punteadas de medianas */}
                            <line x1={xQ2A} y1={yBottomA} x2={xQ2A} y2="200" stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.6" />
                            <line x1={xQ2B} y1={yBottomB} x2={xQ2B} y2="200" stroke="#ec4899" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.6" />

                            {/* Zona de diferencia entre medianas */}
                            <rect
                              x={Math.min(xQ2A, xQ2B)}
                              y="90"
                              width={Math.abs(xQ2A - xQ2B)}
                              height="26"
                              rx="5"
                              fill="#10b981"
                              fillOpacity="0.18"
                              stroke="#10b981"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                            />
                            <text
                              x={(xQ2A + xQ2B) / 2}
                              y="103"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="font-mono text-[10px] font-black fill-emerald-600 dark:fill-emerald-400"
                            >
                              Δ Mediana = +{(summaryA.q2 - summaryB.q2).toFixed(1)} {scenario.unitShort}
                            </text>
                          </g>
                        )}

                        {/* 1. CAJA SUPERIOR: CLASE A */}
                        <g opacity={isDimBoxes ? 0.35 : 1} className="transition-opacity duration-300">
                          {/* Etiqueta del Grupo A */}
                          <text x="60" y="20" className="font-mono text-[11px] font-black fill-sky-600 dark:fill-sky-400">
                            🟦 {scenario.classA.name} · (IQR = {summaryA.iqr} {scenario.unitShort})
                          </text>

                          {/* Bigotes A */}
                          <g opacity={isDimWhiskers ? 0.3 : 1}>
                            <line x1={xMinA} y1={yBoxA} x2={xQ1A} y2={yBoxA} stroke="#38bdf8" strokeWidth="2.5" />
                            <line x1={xMinA} y1={yBoxA - 11} x2={xMinA} y2={yBoxA + 11} stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
                            <line x1={xQ3A} y1={yBoxA} x2={xMaxA} y2={yBoxA} stroke="#38bdf8" strokeWidth="2.5" />
                            <line x1={xMaxA} y1={yBoxA - 11} x2={xMaxA} y2={yBoxA + 11} stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />

                            {/* Valores extremos A */}
                            <text x={xMinA} y={yBoxA - 15} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-sky-600 dark:fill-sky-300">
                              Mín {summaryA.min}
                            </text>
                            <text x={xMaxA} y={yBoxA - 15} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-sky-600 dark:fill-sky-300">
                              Máx {summaryA.max}
                            </text>
                          </g>

                          {/* Cuerpo de la Caja A */}
                          <rect
                            x={xQ1A}
                            y={yTopA}
                            width={Math.max(12, xQ3A - xQ1A)}
                            height={hA}
                            rx="5"
                            fill="#38bdf8"
                            fillOpacity="0.22"
                            stroke="#38bdf8"
                            strokeWidth={compareCriteria === 'cajas' ? '3.5' : '2.5'}
                            filter={compareCriteria === 'cajas' ? 'drop-shadow(0 0 8px rgba(56,189,248,0.5))' : 'none'}
                          />

                          {/* Mediana A (Línea blanca central) */}
                          <line
                            x1={xQ2A}
                            y1={yTopA}
                            x2={xQ2A}
                            y2={yBottomA}
                            stroke="#ffffff"
                            strokeWidth={isFocusMedians ? '4.5' : '3.5'}
                          />

                          {/* Placa de Mediana A (Arriba de la caja) */}
                          <g>
                            <rect x={xQ2A - 28} y={yTopA - 16} width="56" height="15" rx="3.5" fill="#10b981" />
                            <text x={xQ2A} y={yTopA - 8.5} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-slate-950">
                              Me: {summaryA.q2}
                            </text>
                          </g>

                          {/* Etiquetas numéricas de cuartiles Q1 y Q3 A (Debajo de la caja) */}
                          <text x={xQ1A} y={yBottomA + 13} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-sky-600 dark:fill-sky-400">
                            Q1: {summaryA.q1}
                          </text>
                          <text x={xQ3A} y={yBottomA + 13} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-sky-600 dark:fill-sky-400">
                            Q3: {summaryA.q3}
                          </text>

                          {/* Puntos de datos reales de la Sección A (12 alumnos) */}
                          {compareShowDots && sampleItems.map((item) => {
                            const x = getX(item.val, scenario.minScale, scenario.maxScale)
                            const y = item.dupIndex === 0 ? yBoxA : (item.dupIndex === 1 ? yBoxA - 12 : yBoxA + 12)
                            const isSelected = activeComparePoint?.section === 'A' && activeComparePoint.val === item.val
                            let qNum = 1
                            if (item.val > summaryA.q3) qNum = 4
                            else if (item.val > summaryA.q2) qNum = 3
                            else if (item.val > summaryA.q1) qNum = 2

                            return (
                              <g
                                key={`comp-dot-a-${item.id}`}
                                className="cursor-pointer transition-transform duration-200 hover:scale-115 active:scale-95"
                                onClick={() => setActiveComparePoint({ section: 'A', val: item.val, rank: item.sortedIndex + 1, quartile: qNum })}
                              >
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isSelected ? "11.5" : "9.5"}
                                  fill="#0284c7"
                                  stroke={isSelected ? "#38bdf8" : "#ffffff"}
                                  strokeWidth={isSelected ? "2.5" : "1.8"}
                                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
                                />
                                <text
                                  x={x}
                                  y={y}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="font-mono text-[8.5px] font-black fill-white select-none pointer-events-none"
                                >
                                  {item.val}
                                </text>
                              </g>
                            )
                          })}
                        </g>

                        {/* 2. CAJA INFERIOR: CLASE B */}
                        <g opacity={isDimBoxes ? 0.35 : 1} className="transition-opacity duration-300">
                          {/* Etiqueta del Grupo B (en y = 124, libre de cualquier solapamiento) */}
                          <text x="60" y="124" className="font-mono text-[11px] font-black fill-pink-600 dark:fill-pink-400">
                            🟪 {scenario.classB.name} · (IQR = {summaryB.iqr} {scenario.unitShort})
                          </text>

                          {/* Bigotes B */}
                          <g opacity={isDimWhiskers ? 0.3 : 1}>
                            <line x1={xMinB} y1={yBoxB} x2={xQ1B} y2={yBoxB} stroke="#ec4899" strokeWidth="2.5" />
                            <line x1={xMinB} y1={yBoxB - 11} x2={xMinB} y2={yBoxB + 11} stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
                            <line x1={xQ3B} y1={yBoxB} x2={xMaxB} y2={yBoxB} stroke="#ec4899" strokeWidth="2.5" />
                            <line x1={xMaxB} y1={yBoxB - 11} x2={xMaxB} y2={yBoxB + 11} stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />

                            {/* Valores extremos B */}
                            <text x={xMinB} y={yBoxB - 15} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-pink-600 dark:fill-pink-300">
                              Mín {summaryB.min}
                            </text>
                            <text x={xMaxB} y={yBoxB - 15} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-pink-600 dark:fill-pink-300">
                              Máx {summaryB.max}
                            </text>
                          </g>

                          {/* Cuerpo de la Caja B */}
                          <rect
                            x={xQ1B}
                            y={yTopB}
                            width={Math.max(12, xQ3B - xQ1B)}
                            height={hB}
                            rx="5"
                            fill="#ec4899"
                            fillOpacity="0.22"
                            stroke="#ec4899"
                            strokeWidth={compareCriteria === 'cajas' ? '3.5' : '2.5'}
                            filter={compareCriteria === 'cajas' ? 'drop-shadow(0 0 8px rgba(236,72,153,0.5))' : 'none'}
                          />

                          {/* Mediana B */}
                          <line
                            x1={xQ2B}
                            y1={yTopB}
                            x2={xQ2B}
                            y2={yBottomB}
                            stroke="#ffffff"
                            strokeWidth={isFocusMedians ? '4.5' : '3.5'}
                          />

                          {/* Placa de Mediana B */}
                          <g>
                            <rect x={xQ2B - 28} y={yTopB - 16} width="56" height="15" rx="3.5" fill="#ec4899" />
                            <text x={xQ2B} y={yTopB - 8.5} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-black fill-white">
                              Me: {summaryB.q2}
                            </text>
                          </g>

                          {/* Etiquetas numéricas de cuartiles Q1 y Q3 B (Debajo de la caja) */}
                          <text x={xQ1B} y={yBottomB + 13} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-pink-600 dark:fill-pink-400">
                            Q1: {summaryB.q1}
                          </text>
                          <text x={xQ3B} y={yBottomB + 13} textAnchor="middle" className="font-mono text-[9.5px] font-black fill-pink-600 dark:fill-pink-400">
                            Q3: {summaryB.q3}
                          </text>

                          {/* Puntos de datos reales de la Sección B (12 alumnos) */}
                          {compareShowDots && sampleItemsB.map((item) => {
                            const x = getX(item.val, scenario.minScale, scenario.maxScale)
                            const y = item.dupIndex === 0 ? yBoxB : (item.dupIndex === 1 ? yBoxB - 12 : yBoxB + 12)
                            const isSelected = activeComparePoint?.section === 'B' && activeComparePoint.val === item.val
                            let qNum = 1
                            if (item.val > summaryB.q3) qNum = 4
                            else if (item.val > summaryB.q2) qNum = 3
                            else if (item.val > summaryB.q1) qNum = 2

                            return (
                              <g
                                key={`comp-dot-b-${item.id}`}
                                className="cursor-pointer transition-transform duration-200 hover:scale-115 active:scale-95"
                                onClick={() => setActiveComparePoint({ section: 'B', val: item.val, rank: item.sortedIndex + 1, quartile: qNum })}
                              >
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isSelected ? "11.5" : "9.5"}
                                  fill="#db2777"
                                  stroke={isSelected ? "#f472b6" : "#ffffff"}
                                  strokeWidth={isSelected ? "2.5" : "1.8"}
                                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
                                />
                                <text
                                  x={x}
                                  y={y}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="font-mono text-[8.5px] font-black fill-white select-none pointer-events-none"
                                >
                                  {item.val}
                                </text>
                              </g>
                            )
                          })}
                        </g>
                      </g>
                    )
                  })()}

                  {/* Eje horizontal de la escala numérica (Claramente visible y destacado) */}
                  <line x1="60" y1="200" x2="760" y2="200" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="3.5" strokeLinecap="round" />

                  {/* Ticks y números de la escala */}
                  {Array.from({ length: Math.round((scenario.maxScale - scenario.minScale) / scenario.stepScale) + 1 }).map((_, i) => {
                    const val = scenario.minScale + i * scenario.stepScale
                    const x = getX(val, scenario.minScale, scenario.maxScale)
                    return (
                      <g key={`box-comp-tick-${val}`}>
                        <line x1={x} y1="194" x2={x} y2="206" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="2" />
                        <text x={x} y="219" textAnchor="middle" className={`font-mono text-[11px] font-black ${isDark ? 'fill-slate-300' : 'fill-slate-800'}`}>
                          {val}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Conclusiones de Lectura Rápida en 3 Tarjetas de Veredicto */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 shrink-0 font-mono text-xs">
                {/* 1. Centro / Rendimiento Típico */}
                <div className={`p-1.5 sm:p-2 lg:p-2.5 rounded-xl border space-y-0.5 sm:space-y-1 ${
                  compareCriteria === 'medianas' ? 'border-emerald-400 shadow-sm' : ''
                } ${isDark ? 'bg-sky-950/20 border-sky-500/30' : 'bg-sky-50 border-sky-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-sky-500 dark:text-sky-400">🏆 1. Centro (Mediana)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                      Gana A
                    </span>
                  </div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {summaryA.q2} vs {summaryB.q2} {scenario.unitShort} (+{(summaryA.q2 - summaryB.q2).toFixed(1)})
                  </div>
                  <p className="text-[9px] sm:text-[9.5px] font-sans opacity-85 leading-snug">
                    El alumno central de A rindió más alto. El 50% de A sacó ≥ {summaryA.q2}, frente al 50% de B con notas ≤ {summaryB.q2}.
                  </p>
                </div>

                {/* 2. Regularidad / Dispersión IQR */}
                <div className={`p-1.5 sm:p-2 lg:p-2.5 rounded-xl border space-y-0.5 sm:space-y-1 ${
                  compareCriteria === 'cajas' ? 'border-purple-400 shadow-sm' : ''
                } ${isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-purple-500 dark:text-purple-400">⚖️ 2. Regularidad (IQR)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                      Más parejo: A
                    </span>
                  </div>
                  <div className="text-xs font-black text-purple-600 dark:text-purple-300">
                    Caja A: {summaryA.iqr} vs Caja B: {summaryB.iqr} pts
                  </div>
                  <p className="text-[9px] sm:text-[9.5px] font-sans opacity-85 leading-snug">
                    Caja angosta = notas agrupadas. La Sección A tiene notas concentradas en el centro; la Sección B está muy dispersa.
                  </p>
                </div>

                {/* 3. Deducción de Examen */}
                <div className={`p-1.5 sm:p-2 lg:p-2.5 rounded-xl border space-y-0.5 sm:space-y-1 ${
                  isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-amber-500 dark:text-amber-400">🎯 3. Deducción Clave</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">
                      Pregunta Típica
                    </span>
                  </div>
                  <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                    Q1 de A ({summaryA.q1}) = Me de B ({summaryB.q2})
                  </div>
                  <p className="text-[9px] sm:text-[9.5px] font-sans opacity-85 leading-snug">
                    ¡El <strong>75% de los alumnos de A</strong> (9 de 12) tiene notas iguales o superiores a la mitad (50%) de los alumnos de B!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL DIDÁCTICO DE CÁLCULO PASO A PASO DE MEDIANA Y CUARTILES ── */}
      {showCalculationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`max-w-lg lg:max-w-xl w-full rounded-2xl border p-3.5 sm:p-5 shadow-2xl relative flex flex-col justify-between max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📐</span>
                <div>
                  <h3 className="font-black text-sm lg:text-base leading-tight">
                    ¿Cómo se obtuvieron la Mediana y los Cuartiles?
                  </h3>
                  <p className="text-[10.5px] opacity-75 font-mono">
                    Procedimiento aritmético paso a paso • {scenario.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-3 space-y-3 text-xs leading-relaxed">
              {/* Paso 0: Los datos ordenados */}
              <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-sky-400 flex items-center gap-1">
                    <span>1️⃣</span> Paso obligatorio: Datos ordenados de menor a mayor (N = {calcDetails.n})
                  </span>
                  <span className="text-[10px] opacity-70">Posiciones 1° al {calcDetails.n}°</span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 font-mono text-center">
                  {calcDetails.sorted.map((val, idx) => {
                    const pos = idx + 1
                    const isQ1 = pos === calcDetails.posQ1Left || pos === calcDetails.posQ1Right
                    const isQ2 = pos === calcDetails.posQ2Left || pos === calcDetails.posQ2Right
                    const isQ3 = pos === calcDetails.posQ3Left || pos === calcDetails.posQ3Right

                    let badgeColor = isDark ? 'bg-slate-700/60 border-slate-600' : 'bg-white border-slate-300'
                    if (isQ1) badgeColor = 'bg-sky-500/25 border-sky-400 text-sky-300 font-black'
                    if (isQ2) badgeColor = 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-black'
                    if (isQ3) badgeColor = 'bg-purple-500/25 border-purple-400 text-purple-300 font-black'

                    return (
                      <div key={`modal-pos-${pos}`} className={`p-1 rounded border flex flex-col items-center ${badgeColor}`}>
                        <span className="text-[8.5px] opacity-70">{pos}°</span>
                        <span className="text-xs font-black">{val}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[9.5px] font-sans opacity-80">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block" /> Pos. {calcDetails.posQ1Left}° y {calcDetails.posQ1Right}° para Q1</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" /> Pos. {calcDetails.posQ2Left}° y {calcDetails.posQ2Right}° para Q2</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-400 inline-block" /> Pos. {calcDetails.posQ3Left}° y {calcDetails.posQ3Right}° para Q3</span>
                </div>
              </div>

              {/* 1. Cálculo de Q2 (Mediana) */}
              <div className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-emerald-950/25 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <span>🟢</span> Mediana (Q2 = 50% central): ¿Cómo se obtuvo {summaryA.q2}?
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Posiciones {calcDetails.posQ2Left}° y {calcDetails.posQ2Right}°
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  Como el número total de datos es par (<strong>N = {calcDetails.n}</strong>), no existe un único dato en el centro exacto. Se toman los <strong>dos datos centrales</strong> (posiciones {calcDetails.posQ2Left}° y {calcDetails.posQ2Right}°) y se calcula su promedio (semisuma):
                </p>
                <div className={`p-2 rounded-lg font-mono flex items-center justify-center gap-2 border ${
                  isDark ? 'bg-[#080d1a] border-emerald-500/20' : 'bg-white border-emerald-200'
                }`}>
                  <span className="text-emerald-400 font-bold">Q₂ = </span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ2Left} + {calcDetails.valQ2Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ2Left + calcDetails.valQ2Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <strong className="text-emerald-400 text-sm font-black">{summaryA.q2} {scenario.unitShort}</strong>
                </div>
                <p className="text-[10px] opacity-75">
                  ✓ Q2 divide exactamente a la muestra en dos grupos de 6 datos: 50% de estudiantes tiene nota ≤ {summaryA.q2} y 50% tiene nota ≥ {summaryA.q2}.
                </p>
              </div>

              {/* 2. Cálculo de Q1 */}
              <div className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-sky-950/25 border-sky-500/30' : 'bg-sky-50 border-sky-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                    <span>🔵</span> Primer Cuartil (Q1 = 25%): ¿Cómo se obtuvo {summaryA.q1}?
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Mitad Inferior
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  El Cuartil 1 es la <strong>mediana de la mitad inferior</strong> (los primeros 6 datos: [{calcDetails.lowerHalf.join(', ')}]). Sus valores centrales son las posiciones 3° y 4° ({calcDetails.valQ1Left} y {calcDetails.valQ1Right}):
                </p>
                <div className={`p-2 rounded-lg font-mono flex items-center justify-center gap-2 border ${
                  isDark ? 'bg-[#080d1a] border-sky-500/20' : 'bg-white border-sky-200'
                }`}>
                  <span className="text-sky-400 font-bold">Q₁ = </span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ1Left} + {calcDetails.valQ1Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ1Left + calcDetails.valQ1Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <strong className="text-sky-400 text-sm font-black">{summaryA.q1} {scenario.unitShort}</strong>
                </div>
                <p className="text-[10px] opacity-75">
                  ✓ El 25% de los estudiantes (la cuarta parte) tiene una calificación de {summaryA.q1} o menos.
                </p>
              </div>

              {/* 3. Cálculo de Q3 */}
              <div className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-purple-950/25 border-purple-500/30' : 'bg-purple-50 border-purple-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                    <span>🟣</span> Tercer Cuartil (Q3 = 75%): ¿Cómo se obtuvo {summaryA.q3}?
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Mitad Superior
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  El Cuartil 3 es la <strong>mediana de la mitad superior</strong> (los últimos 6 datos: [{calcDetails.upperHalf.join(', ')}]). Sus valores centrales en la serie completa son las posiciones 9° y 10° ({calcDetails.valQ3Left} y {calcDetails.valQ3Right}):
                </p>
                <div className={`p-2 rounded-lg font-mono flex items-center justify-center gap-2 border ${
                  isDark ? 'bg-[#080d1a] border-purple-500/20' : 'bg-white border-purple-200'
                }`}>
                  <span className="text-purple-400 font-bold">Q₃ = </span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ3Left} + {calcDetails.valQ3Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <div className="inline-flex flex-col items-center">
                    <span className="border-b border-current px-1 text-[11px]">{calcDetails.valQ3Left + calcDetails.valQ3Right}</span>
                    <span className="text-[11px]">2</span>
                  </div>
                  <span>=</span>
                  <strong className="text-purple-400 text-sm font-black">{summaryA.q3} {scenario.unitShort}</strong>
                </div>
                <p className="text-[10px] opacity-75">
                  ✓ El 75% de los estudiantes tiene nota ≤ {summaryA.q3}, y el 25% más alto supera los {summaryA.q3}.
                </p>
              </div>

              {/* 4. ¿Por qué hay 3 datos en cada cuarto? ¿Siempre es uniforme? */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                  <span className="text-base">⚠️</span>
                  <span>Pregunta Clave: ¿Siempre hay la misma cantidad de datos en cada cuarto?</span>
                </div>
                <div className="text-[11px] space-y-1.5 leading-snug opacity-90">
                  <p>
                    <strong>¡SÍ! Por definición matemática, los cuartiles siempre dividen la CANTIDAD total de datos en 4 partes iguales (25% cada una):</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Si hay <strong>12 datos</strong>, cada cuarto tiene exactamente <strong>3 datos</strong> (12 ÷ 4 = 3).</li>
                    <li>Si hubiera <strong>20 datos</strong>, cada cuarto tendría <strong>5 datos</strong> (20 ÷ 4 = 5).</li>
                  </ul>
                  <div className={`p-2 rounded-lg border mt-2 ${
                    isDark ? 'bg-[#0a0f1d] border-amber-500/20' : 'bg-white border-amber-200'
                  }`}>
                    <strong className="text-amber-400 block text-[11px] mb-0.5">💡 ¿Qué es lo que NO es uniforme?:</strong>
                    <p className="text-[10.5px]">
                      Lo que cambia en la recta es el <strong>ANCHO o DISTANCIA del intervalo</strong>, no la cantidad de alumnos:
                    </p>
                    <p className="text-[10.5px] mt-1">
                      • <strong>Intervalo angosto</strong>: Los 3 alumnos sacaron notas muy parecidas (alta concentración).<br/>
                      • <strong>Intervalo ancho</strong>: Los 3 alumnos tuvieron notas muy distintas (alta dispersión).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="pt-2.5 border-t border-white/10 shrink-0 flex items-center justify-between">
              <span className="text-[10.5px] opacity-75 font-mono">
                Rango Intercuartílico: IQR = {summaryA.q3} - {summaryA.q1} = {summaryA.iqr} {scenario.unitShort}
              </span>
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DIDÁCTICO: ¿QUÉ ES Y PARA QUÉ SIRVE EL BOXPLOT? ── */}
      {showWhyBoxplotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`max-w-lg lg:max-w-xl w-full rounded-2xl border p-3.5 sm:p-5 shadow-2xl relative flex flex-col justify-between max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="font-black text-sm lg:text-base leading-tight">
                    ¿Qué es y para qué sirve el Diagrama de Caja (Boxplot)?
                  </h3>
                  <p className="text-[10.5px] opacity-75 font-mono">
                    Guía conceptual y pedagógica para entender su poder estadístico
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhyBoxplotModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-3 space-y-3.5 text-xs leading-relaxed">
              {/* 1. ¿Qué problema resuelve? */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-sky-950/25 border-sky-500/30' : 'bg-sky-50 border-sky-200'
              }`}>
                <h4 className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                  <span>1️⃣</span> ¿Qué problema resuelve el Boxplot?
                </h4>
                <p className="text-[11px] opacity-90 leading-snug">
                  Imagina que tienes <strong>40, 100 o 500 notas</strong> de una evaluación. Mirar una lista interminable de números o una gráfica con cientos de puntos amontonados es agotador y difícil de interpretar.
                </p>
                <p className="text-[11px] opacity-90 leading-snug">
                  El estadístico <strong>John Tukey</strong> inventó el <em>Boxplot</em> (Diagrama de Caja y Bigotes) precisamente para eso: <strong>comprimir cualquier cantidad de datos en una sola figura geométrica elegante de 5 números</strong> (Mínimo, Q1, Mediana, Q3, Máximo).
                </p>
              </div>

              {/* 2. ¿Qué significa cada parte de la figura? */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-purple-950/25 border-purple-500/30' : 'bg-purple-50 border-purple-200'
              }`}>
                <h4 className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                  <span>2️⃣</span> ¿Cómo se interpreta cada parte del gráfico?
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded bg-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>La Caja Central (50% del grupo):</strong> Representa el "corazón" de tus estudiantes. El 50% de los alumnos del medio está metido dentro de esta caja (entre Q1 y Q3).
                      <div className="mt-0.5 opacity-90">
                        • <em>Caja angosta</em>: Las notas son muy parecidas; el salón es regular y parejo.<br />
                        • <em>Caja ancha</em>: Hay mucha desigualdad entre los estudiantes (alta dispersión).
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>La Línea Verde de la Mediana:</strong> Marca el centro exacto del grupo. La mitad de los alumnos sacó menos que esa nota y la otra mitad sacó más. Te dice dónde se ubica el rendimiento típico real.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Los Bigotes (Extremos):</strong> Se estiran hacia los costados para mostrarte hasta dónde llegan las notas más bajas (bigote izquierdo, 25%) y las más altas (bigote derecho, 25%).
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. ¿Por qué es mejor que mirar solo el promedio? */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-amber-950/25 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <h4 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                  <span>3️⃣</span> ¿Por qué es mejor que mirar solo el Promedio?
                </h4>
                <p className="text-[11px] opacity-90 leading-snug">
                  El promedio puede engañarte: si en un salón un alumno saca 20 y otro saca 0, el promedio dice "10", pero oculta una realidad engañosa.
                </p>
                <p className="text-[11px] opacity-90 leading-snug">
                  El <strong>Boxplot no se deja engañar</strong>: te muestra dónde está la mayoría real (la caja), qué tan parejos son (el ancho IQR) y cuán lejos quedaron los extremos (los bigotes).
                </p>
              </div>

              {/* 4. ¿Cómo se usa para comparar? */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-emerald-950/25 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <span>4️⃣</span> Su mayor poder: Comparar dos grupos en 2 segundos
                </h4>
                <p className="text-[11px] opacity-90 leading-snug">
                  En la <strong>Pestaña 3 (Comparar 2 Cajas)</strong> verás su verdadero superpoder: pones la caja de la <em>Sección A</em> al lado de la <em>Sección B</em> y sin calcular nada sabes cuál sección rindió más alto y cuál es más constante.
                </p>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="pt-2.5 border-t border-white/10 shrink-0 flex items-center justify-between">
              <span className="text-[10.5px] opacity-75 font-mono">
                Resumen de 5 números: Mín • Q1 • Mediana • Q3 • Máx
              </span>
              <button
                type="button"
                onClick={() => setShowWhyBoxplotModal(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DIDÁCTICO: PREGUNTAS DE EXAMEN SOBRE COMPARACIÓN DE BOXPLOTS ── */}
      {showCompareHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`max-w-lg lg:max-w-xl w-full rounded-2xl border p-3.5 sm:p-5 shadow-2xl relative flex flex-col justify-between max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎓</span>
                <div>
                  <h3 className="font-black text-sm lg:text-base leading-tight">
                    ¿Cómo responder preguntas sobre Diagramas de Caja (Boxplots)?
                  </h3>
                  <p className="text-[10.5px] opacity-75 font-mono">
                    Guía de resolución de preguntas frecuentes de evaluaciones y exámenes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareHelpModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-3 space-y-3.5 text-xs leading-relaxed">
              {/* Pregunta 1 */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-sky-950/25 border-sky-500/30' : 'bg-sky-50 border-sky-200'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs text-sky-400">
                  <span>❓ Pregunta 1: ¿Qué grupo fue más regular u homogéneo?</span>
                  <span className="px-2 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px]">Cajas (IQR)</span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  <strong>Respuesta:</strong> Aquel cuya caja sea más angosta (menor Rango Intercuartílico, IQR).
                </p>
                <p className="text-[10.5px] opacity-80 leading-snug">
                  • <strong>Sección A (IQR = {summaryA.iqr} pts)</strong>: Notas muy concentradas alrededor del centro. Rendimiento parejo.<br/>
                  • <strong>Sección B (IQR = {summaryB.iqr} pts)</strong>: Caja casi el doble de ancha. Gran disparidad entre estudiantes.
                </p>
              </div>

              {/* Pregunta 2 */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-emerald-950/25 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs text-emerald-400">
                  <span>❓ Pregunta 2: ¿Quién tuvo mejor rendimiento central?</span>
                  <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Medianas</span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  <strong>Respuesta:</strong> Aquel cuya línea de la Mediana esté ubicada más a la derecha en la recta numérica.
                </p>
                <p className="text-[10.5px] opacity-80 leading-snug">
                  La Sección A tiene Mediana de <strong>{summaryA.q2} pts</strong> frente a <strong>{summaryB.q2} pts</strong> de la Sección B. Por ende, el estudiante típico de la Sección A rindió +{(summaryA.q2 - summaryB.q2).toFixed(1)} puntos más alto.
                </p>
              </div>

              {/* Pregunta 3 */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-amber-950/25 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs text-amber-400">
                  <span>❓ Pregunta 3: ¿Qué porcentaje de un grupo supera al otro?</span>
                  <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">Corte de Cuartiles</span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  Observa que el <strong>Q1 de la Sección A ({summaryA.q1}) coincide con la Mediana de la Sección B ({summaryB.q2})</strong>.
                </p>
                <p className="text-[10.5px] opacity-85 leading-snug">
                  Esto permite afirmar con certeza matemática: <em>«Al menos el <strong>75% de los alumnos de la Sección A</strong> obtuvieron una calificación igual o superior a la mitad (50%) de los alumnos de la Sección B»</em>.
                </p>
              </div>

              {/* Pregunta 4 */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-purple-950/25 border-purple-500/30' : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs text-purple-400">
                  <span>❓ Pregunta 4: ¿Por qué tener nota 20 no hace mejor a la Sección B?</span>
                  <span className="px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">Extremos vs Mayoría</span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  Porque el Boxplot evalúa el comportamiento de la <strong>población completa</strong>. La Sección B tiene dos notas de 20 (su bigote llega a 20), pero su caja está más a la izquierda y su nota mínima es {summaryB.min}. Hay casos sobresalientes aislados pero un colectivo más rezagado y desigual.
                </p>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="pt-2.5 border-t border-white/10 shrink-0 flex items-center justify-between">
              <span className="text-[10.5px] opacity-75 font-mono">
                Regla de oro: Menor IQR = Mayor homogeneidad
              </span>
              <button
                type="button"
                onClick={() => setShowCompareHelpModal(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DIDÁCTICO DE FÓRMULAS Y CONCEPTOS ── */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className={`max-w-md w-full rounded-2xl border p-4 shadow-2xl relative flex flex-col justify-between max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                <h3 className="font-black text-sm lg:text-base">
                  Cuartiles y Diagrama de Caja (Boxplot)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p className="opacity-90">
                Las <strong>Medidas de Posición</strong> dividen una distribución ordenada en partes porcentualmente iguales. Los <strong>Cuartiles</strong> la dividen en <strong>4 partes iguales de 25% cada una</strong>.
              </p>

              {/* Fórmulas de Cuartiles */}
              <div className={`p-2.5 rounded-xl border space-y-1 ${isDark ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-200'}`}>
                <span className="font-bold text-sky-400 block text-xs">Los Tres Cuartiles (Q1, Q2, Q3)</span>
                <p className="text-[11px] opacity-85">
                  • <strong>Q1 (Primer Cuartil - 25%):</strong> El 25% de los datos es menor o igual a este valor.<br/>
                  • <strong>Q2 (Segundo Cuartil - 50%):</strong> Coincide con la <strong>Mediana</strong>.<br/>
                  • <strong>Q3 (Tercer Cuartil - 75%):</strong> El 75% de los datos es menor o igual a este valor.
                </p>
              </div>

              {/* Rango Intercuartílico (IQR) */}
              <div className={`p-2.5 rounded-xl border space-y-1 ${isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                <span className="font-bold text-purple-400 block text-xs">Rango Intercuartílico (IQR)</span>
                <p className="text-[11px] opacity-85">
                  Es la longitud de la caja. Mide la dispersión del 50% central sin verse afectada por valores extremos o trampas:
                </p>
                <div className="font-mono text-center font-black text-purple-400 py-1">
                  IQR = Q3 - Q1
                </div>
              </div>

              {/* Datos Atípicos (Outliers) */}
              <div className={`p-2.5 rounded-xl border space-y-1 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <span className="font-bold text-amber-400 block text-xs">Criterio de Valores Atípicos (Outliers)</span>
                <p className="text-[11px] opacity-85">
                  Un dato se considera un valor atípico o anómalo si se sale de los límites de los bigotes:
                </p>
                <p className="font-mono text-[10.5px] opacity-90 text-center py-0.5">
                  Límite Inferior = Q1 - 1.5 × IQR<br/>
                  Límite Superior = Q3 + 1.5 × IQR
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE AYUDA GENERAL (ModalHelp) ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía: Cuartiles y Diagrama de Caja"
        buttonColor="bg-blue-600 hover:bg-blue-500"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            Aprende a interpretar el diagrama de caja (*boxplot*), uno de los gráficos más potentes de la estadística moderna:
          </p>
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
            <strong className="text-blue-400">1. Descubrir los 4 Cuartos:</strong>
            <p>Avanza paso a paso para ver cómo una muestra desordenada se alinea y se corta en cuatro bloques de 25% cada uno.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <strong className="text-emerald-400">2. De los Puntos a la Caja:</strong>
            <p>Comprende por qué la caja encierra el 50% central ($IQR = Q_3 - Q_1$) y cómo los bigotes conectan con los extremos.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1">
            <strong className="text-purple-400">3. Comparar Cajas:</strong>
            <p>Compara dos secciones escolares cara a cara: evalúa cuál tiene mejor rendimiento central y cuál es más regular.</p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
