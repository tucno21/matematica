import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos y Estructuras ──────────────────────────────────────────────────────
export type DispersionTab = 'comparar' | 'distancias' | 'laboratorio'
export type ScenarioId = 'tiro' | 'calificaciones' | 'tiempo'
export type ActiveMeasure = 'rango' | 'desviacion_media' | 'varianza' | 'desviacion_estandar' | 'cv' | 'todas'
export type SpecificMeasure = 'rango' | 'desviacion_media' | 'varianza' | 'desviacion_estandar' | 'cv'

interface DataPoint {
  id: string
  val: number
  label: string
}

interface DatasetPair {
  id: ScenarioId
  title: string
  unit: string
  unitShort: string
  minScale: number
  maxScale: number
  stepScale: number
  groupA: {
    name: string
    subtitle: string
    color: string
    data: DataPoint[]
  }
  groupB: {
    name: string
    subtitle: string
    color: string
    data: DataPoint[]
  }
  contextNote: string
}

// ─── Catálogo de Casos Emblemáticos ──────────────────────────────────────────
const DATASET_PAIRS: DatasetPair[] = [
  {
    id: 'calificaciones',
    title: 'Rendimiento de Dos Estudiantes (Mismo Promedio)',
    unit: 'puntos',
    unitShort: 'pts',
    minScale: 6,
    maxScale: 20,
    stepScale: 2,
    contextNote: 'Ambos estudiantes tienen promedio exacto de 14. Sin embargo, Mateo es muy consistente y regular, mientras que Sofía tiene notas extremas e inestables.',
    groupA: {
      name: 'Estudiante A (Mateo)',
      subtitle: 'Alta Regularidad (Baja Dispersión)',
      color: '#10b981', // Verde esmeralda
      data: [
        { id: 'a1', val: 14, label: 'Ex. 1' },
        { id: 'a2', val: 13, label: 'Ex. 2' },
        { id: 'a3', val: 15, label: 'Ex. 3' },
        { id: 'a4', val: 14, label: 'Ex. 4' },
        { id: 'a5', val: 14, label: 'Ex. 5' }
      ]
    },
    groupB: {
      name: 'Estudiante B (Sofía)',
      subtitle: 'Alta Inestabilidad (Gran Dispersión)',
      color: '#f59e0b', // Ámbar / Naranja
      data: [
        { id: 'b1', val: 8, label: 'Ex. 1' },
        { id: 'b2', val: 10, label: 'Ex. 2' },
        { id: 'b3', val: 14, label: 'Ex. 3' },
        { id: 'b4', val: 18, label: 'Ex. 4' },
        { id: 'b5', val: 20, label: 'Ex. 5' }
      ]
    }
  },
  {
    id: 'tiro',
    title: 'Tiro al Blanco: Precisión vs. Dispersión',
    unit: 'puntos de acierto',
    unitShort: 'pts',
    minScale: 50,
    maxScale: 100,
    stepScale: 5,
    contextNote: 'Dos competidores logran la misma puntuación media (80 pts). El Tirador 1 agrupa sus tiros cerca de la diana; el Tirador 2 oscila entre el centro y los bordes.',
    groupA: {
      name: 'Tirador 1 (Preciso)',
      subtitle: 'Tiros Agrupados (Baja Dispersión)',
      color: '#38bdf8', // Celeste
      data: [
        { id: 't1', val: 78, label: 'Tiro 1' },
        { id: 't2', val: 81, label: 'Tiro 2' },
        { id: 't3', val: 80, label: 'Tiro 3' },
        { id: 't4', val: 82, label: 'Tiro 4' },
        { id: 't5', val: 79, label: 'Tiro 5' }
      ]
    },
    groupB: {
      name: 'Tirador 2 (Disperso)',
      subtitle: 'Tiros Dispersos (Alta Dispersión)',
      color: '#ec4899', // Rosa
      data: [
        { id: 't6', val: 60, label: 'Tiro 1' },
        { id: 't7', val: 98, label: 'Tiro 2' },
        { id: 't8', val: 80, label: 'Tiro 3' },
        { id: 't9', val: 65, label: 'Tiro 4' },
        { id: 't10', val: 97, label: 'Tiro 5' }
      ]
    }
  },
  {
    id: 'tiempo',
    title: 'Tiempos de Espera del Bus (Línea A vs. Línea B)',
    unit: 'minutos',
    unitShort: 'min',
    minScale: 0,
    maxScale: 30,
    stepScale: 5,
    contextNote: 'Ambas líneas tienen un promedio de espera de 15 minutos. Pero la Línea A siempre llega en torno a 14-16 min, mientras la Línea B a veces tarda 2 min y a veces 28 min.',
    groupA: {
      name: 'Línea A (Puntual)',
      subtitle: 'Predecible y Confiable (Baja Dispersión)',
      color: '#8b5cf6', // Violeta
      data: [
        { id: 'w1', val: 14, label: 'Día 1' },
        { id: 'w2', val: 16, label: 'Día 2' },
        { id: 'w3', val: 15, label: 'Día 3' },
        { id: 'w4', val: 15, label: 'Día 4' },
        { id: 'w5', val: 15, label: 'Día 5' }
      ]
    },
    groupB: {
      name: 'Línea B (Impredecible)',
      subtitle: 'Muy Variable e Irregular',
      color: '#ef4444', // Rojo
      data: [
        { id: 'w6', val: 4, label: 'Día 1' },
        { id: 'w7', val: 26, label: 'Día 2' },
        { id: 'w8', val: 15, label: 'Día 3' },
        { id: 'w9', val: 6, label: 'Día 4' },
        { id: 'w10', val: 24, label: 'Día 5' }
      ]
    }
  }
]

// ─── Función Utilitaria de Cálculos Estadísticos ─────────────────────────────
function calculateDispersionStats(data: DataPoint[]) {
  const vals = data.map((d) => d.val)
  const n = vals.length
  if (n === 0) {
    return {
      n: 0,
      mean: 0,
      min: 0,
      max: 0,
      range: 0,
      deviations: [],
      meanDeviation: 0,
      variance: 0,
      stdDev: 0,
      cv: 0,
      isHomogeneous: true
    }
  }

  const sum = vals.reduce((acc, v) => acc + v, 0)
  const mean = Number((sum / n).toFixed(2))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = Number((max - min).toFixed(2))

  // Desviaciones individuales respecto a la media: (xi - x̄)
  const deviations = data.map((d) => {
    const diff = Number((d.val - mean).toFixed(2))
    const absDiff = Number(Math.abs(diff).toFixed(2))
    const sqDiff = Number((diff * diff).toFixed(2))
    return {
      ...d,
      diff,
      absDiff,
      sqDiff
    }
  })

  // Desviación Media (DM): promedio de valores absolutos
  const sumAbsDiff = deviations.reduce((acc, d) => acc + d.absDiff, 0)
  const meanDeviation = Number((sumAbsDiff / n).toFixed(2))

  // Varianza (σ²): promedio de diferencias al cuadrado
  const sumSqDiff = deviations.reduce((acc, d) => acc + d.sqDiff, 0)
  const variance = Number((sumSqDiff / n).toFixed(2))

  // Desviación Estándar (σ): raíz cuadrada de la varianza
  const stdDev = Number(Math.sqrt(variance).toFixed(2))

  // Coeficiente de Variación (CV): (σ / x̄) * 100%
  const cv = mean > 0 ? Number(((stdDev / mean) * 100).toFixed(1)) : 0

  // Se considera homogéneo / consistente si CV <= 30%
  const isHomogeneous = cv <= 30

  return {
    n,
    mean,
    min,
    max,
    range,
    deviations,
    meanDeviation,
    variance,
    stdDev,
    cv,
    isHomogeneous
  }
}

// ─── Componente de Fracción Matemática Limpia ─────────────────────────────────
function MathFraction({
  prefix,
  numerator,
  denominator,
  suffix
}: {
  prefix?: React.ReactNode
  numerator: React.ReactNode
  denominator: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <div className="inline-flex items-center gap-1 font-mono text-center">
      {prefix && <span className="font-bold">{prefix}</span>}
      <div className="inline-flex flex-col items-center justify-center">
        <span className="px-1.5 pb-0.5 border-b-2 border-current font-bold text-center leading-tight">
          {numerator}
        </span>
        <span className="px-1.5 pt-0.5 font-bold text-center leading-tight">
          {denominator}
        </span>
      </div>
      {suffix && <span className="font-bold">{suffix}</span>}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MedidasDispersionView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<DispersionTab>('comparar')

  // Medida activa para explorar una a una
  const [activeMeasure, setActiveMeasure] = useState<ActiveMeasure>('rango')

  // Caso seleccionado
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('calificaciones')

  // Grupo enfocado para modo 'distancias' (A o B)
  const [focusedGroup, setFocusedGroup] = useState<'A' | 'B'>('A')

  // Estado del Laboratorio Dinámico (Modo 3)
  const [labSpread, setLabSpread] = useState<number>(3) // 1 (muy concentrado) a 6 (muy disperso)
  const [hasOutlier, setHasOutlier] = useState<boolean>(false)

  // Modales
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false)
  const [formulaModalMeasure, setFormulaModalMeasure] = useState<SpecificMeasure>('rango')
  const [showHelp, setShowHelp] = useState<boolean>(false)

  const openFormula = (m: SpecificMeasure) => {
    setFormulaModalMeasure(m)
    setShowFormulaModal(true)
  }

  // Obtener escenario actual
  const currentScenario = useMemo(() => {
    return DATASET_PAIRS.find((s) => s.id === selectedScenario) || DATASET_PAIRS[0]
  }, [selectedScenario])

  // Datos dinámicos para el Laboratorio
  const labData: DataPoint[] = useMemo(() => {
    const center = 14
    // Generar 5 puntos alrededor del centro según labSpread
    const offsets = [-labSpread * 1.5, -labSpread * 0.7, 0, labSpread * 0.8, labSpread * 1.4]
    const pts: DataPoint[] = offsets.map((off, idx) => {
      let v = Math.round((center + off) * 2) / 2
      v = Math.max(0, Math.min(20, v))
      return { id: `lab-${idx}`, val: v, label: `Dato ${idx + 1}` }
    })

    if (hasOutlier) {
      // Reemplazar el último dato por un valor atípico lejano (ej. 2 o 20)
      pts[pts.length - 1] = { id: 'lab-outlier', val: 20, label: '¡Atípico!' }
    }

    return pts
  }, [labSpread, hasOutlier])

  // Estadísticas calculadas
  const statsA = useMemo(() => calculateDispersionStats(currentScenario.groupA.data), [currentScenario])
  const statsB = useMemo(() => calculateDispersionStats(currentScenario.groupB.data), [currentScenario])
  const statsLab = useMemo(() => calculateDispersionStats(labData), [labData])

  // Geometría del SVG para rectas numéricas
  // Ancho 820px, alto 170px para cada recta
  const getXPos = useCallback(
    (val: number, min: number, max: number, startX = 70, endX = 750) => {
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
          <span className="text-xs lg:text-sm shrink-0">📏</span>
          <h1 className="text-[12px] lg:text-[14px] font-black tracking-tight truncate">
            Medidas de Dispersión
          </h1>
        </div>

        {/* Selector de Caso, Botón de Fórmula y Ayuda */}
        <div className="flex items-center gap-1.5 shrink-0">

          <div className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 ${
            isDark ? 'bg-sky-950/40 border-sky-400/30' : 'bg-sky-50 border-sky-400/50'
          }`}>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hidden sm:inline">Caso:</span>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as ScenarioId)}
              aria-label="Seleccionar situación"
              className={`h-6 text-[11px] font-bold bg-transparent cursor-pointer outline-none ${
                isDark ? 'text-sky-300' : 'text-sky-950'
              }`}
            >
              <option value="calificaciones" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                🎓 Estudiantes (Notas)
              </option>
              <option value="tiro" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                🎯 Tiro al Blanco
              </option>
              <option value="tiempo" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                ⏱️ Espera de Buses
              </option>
            </select>
          </div>

          {/* Botón de Fórmula subido estratégicamente al lado de Casos */}
          <button
            type="button"
            onClick={() => openFormula(activeMeasure === 'todas' ? 'rango' : activeMeasure)}
            className="h-6 lg:h-7 px-2 lg:px-2.5 rounded-lg text-[10.5px] lg:text-xs font-black cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1 border bg-sky-600 hover:bg-sky-500 text-white border-sky-400 whitespace-nowrap"
            title="Ver fórmula y solución paso a paso"
          >
            <BookOpen className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
            <span>Fórmula y Solución</span>
          </button>

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

      {/* ── 2. BARRA DE HERRAMIENTAS Y MEDIDAS (H-9 a H-10) ── */}
      <div className={`shrink-0 h-9 lg:h-10 border-b px-2 lg:px-4 flex items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
        isDark ? 'bg-[#0d1424] border-white/10' : 'bg-white border-slate-300'
      }`}>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('rango'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'rango'
                ? 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400'
                : isDark ? 'bg-slate-800 text-blue-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-blue-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>📏 1. Rango</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('desviacion_media'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'desviacion_media'
                ? 'bg-cyan-600 text-white font-black shadow-xs ring-2 ring-cyan-400'
                : isDark ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-cyan-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>📐 2. Desv. Media</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('varianza'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'varianza'
                ? 'bg-purple-600 text-white font-black shadow-xs ring-2 ring-purple-400'
                : isDark ? 'bg-slate-800 text-purple-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-purple-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>📊 3. Varianza (σ²)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('desviacion_estandar'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'desviacion_estandar'
                ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400'
                : isDark ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-emerald-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>🎯 4. Desv. Estándar (σ)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('cv'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'cv'
                ? 'bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400'
                : isDark ? 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-amber-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>📈 5. Coef. Variación</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('comparar'); setActiveMeasure('todas'); }}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparar' && activeMeasure === 'todas'
                ? 'bg-indigo-600 text-white font-black shadow-xs ring-2 ring-indigo-400'
                : isDark ? 'bg-slate-800 text-indigo-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-indigo-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>⚖️ Todas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('distancias')}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'distancias'
                ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400'
                : isDark ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-emerald-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>¿Por qué al Cuadrado?</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('laboratorio')}
            className={`px-2 lg:px-2.5 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'laboratorio'
                ? 'bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400'
                : isDark ? 'bg-slate-800 text-rose-300 hover:bg-slate-700 border border-white/10' : 'bg-slate-100 text-rose-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Laboratorio</span>
          </button>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === 'distancias' && (
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span className="opacity-70 text-[10px]">Analizar:</span>
              <button
                type="button"
                onClick={() => setFocusedGroup('A')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer border ${
                  focusedGroup === 'A'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300'
                    : isDark ? 'bg-slate-800 text-emerald-300 border-white/10' : 'bg-slate-100 text-emerald-800 border-slate-300'
                }`}
              >
                Grupo A (Regular)
              </button>
              <button
                type="button"
                onClick={() => setFocusedGroup('B')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer border ${
                  focusedGroup === 'B'
                    ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-300'
                    : isDark ? 'bg-slate-800 text-amber-300 border-white/10' : 'bg-slate-100 text-amber-800 border-slate-300'
                }`}
              >
                Grupo B (Disperso)
              </button>
            </div>
          )}

          {activeTab === 'laboratorio' && (
            <button
              type="button"
              onClick={() => setHasOutlier((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-black cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1 border ${
                hasOutlier
                  ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-300'
                  : isDark ? 'bg-slate-800 text-rose-300 border-rose-400/40' : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <span>{hasOutlier ? '✓ Dato Atípico Activo' : '+ Agregar Dato Atípico'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. ÁREA DE TRABAJO PRINCIPAL (PANTALLA COMPLETA CERO SCROLL) ── */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between p-1.5 sm:p-2 lg:p-3 overflow-hidden">
        <div className={`flex-1 min-h-0 relative flex flex-col justify-between rounded-2xl border p-2 lg:p-3 overflow-hidden ${
          isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-300 shadow-md'
        }`}>

          {/* ── CONTENIDO MODO 1: COMPARATIVA Y MEDIDAS PASO A PASO ── */}
          {activeTab === 'comparar' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">

              {/* Contenedor Gráfico Dividido en 2 Rectas Paralelas (Sin el banner para máxima amplitud) */}
              <div className="flex-1 min-h-0 flex flex-col justify-around gap-2 py-1">
                {/* Grupo A (Baja Dispersión) */}
                <div className={`p-2 rounded-xl border relative flex flex-col justify-between flex-1 min-h-0 ${
                  isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-300'
                }`}>
                  <div className="flex items-center justify-between text-xs font-black pb-1 border-b border-emerald-500/20">
                    <span className="text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {currentScenario.groupA.name} · Promedio x̄ = {statsA.mean} {currentScenario.unitShort}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {activeMeasure === 'rango' && `Rango = ${statsA.range} pts (Mín: ${statsA.min} | Máx: ${statsA.max})`}
                      {activeMeasure === 'desviacion_media' && `Desviación Media (DM) = ${statsA.meanDeviation} pts`}
                      {activeMeasure === 'varianza' && `Varianza σ² = ${statsA.variance} pts² (Distancias al cuadrado)`}
                      {activeMeasure === 'desviacion_estandar' && `Desv. Estándar σ = ${statsA.stdDev} pts (Zona Típica ±σ)`}
                      {activeMeasure === 'cv' && `CV = ${statsA.cv}% (Homogéneo ≤ 30%) ¡Alta Confiabilidad!`}
                      {activeMeasure === 'todas' && `Rango = ${statsA.range} | σ² = ${statsA.variance} | σ = ${statsA.stdDev} (CV = ${statsA.cv}%)`}
                    </span>
                  </div>

                  {/* SVG Recta Numérica Grupo A */}
                  <div className="flex-1 min-h-0 flex items-center justify-center">
                    <svg viewBox="0 0 820 145" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      {/* Eje horizontal bajado a y=105 para dar máxima holgura superior */}
                      <line x1="60" y1="105" x2="760" y2="105" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />
                      {/* Ticks */}
                      {Array.from({ length: Math.round((currentScenario.maxScale - currentScenario.minScale) / currentScenario.stepScale) + 1 }).map((_, i) => {
                        const val = currentScenario.minScale + i * currentScenario.stepScale
                        const x = getXPos(val, currentScenario.minScale, currentScenario.maxScale)
                        return (
                          <g key={`tick-a-${val}`}>
                            <line x1={x} y1="100" x2={x} y2="110" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                            <text x={x} y="124" textAnchor="middle" className={`font-mono text-[10.5px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                              {val}
                            </text>
                          </g>
                        )
                      })}

                      {/* 1. MODO RANGO: Corchete de amplitud con cartela de ancho dinámico */}
                      {activeMeasure === 'rango' && (() => {
                        const xMin = getXPos(statsA.min, currentScenario.minScale, currentScenario.maxScale)
                        const xMax = getXPos(statsA.max, currentScenario.minScale, currentScenario.maxScale)
                        const center = (xMin + xMax) / 2
                        const badgeText = `R = ${statsA.max} - ${statsA.min} = ${statsA.range} ${currentScenario.unitShort}`
                        const badgeW = Math.max(140, badgeText.length * 7.5 + 24)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {/* Líneas guía verticales hacia los extremos */}
                            <line x1={xMin} y1="22" x2={xMin} y2="65" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.7" />
                            <line x1={xMax} y1="22" x2={xMax} y2="65" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.7" />
                            {/* Línea horizontal del corchete */}
                            <line x1={xMin} y1="13" x2={xMax} y2="13" stroke="#10b981" strokeWidth="2.5" />
                            <line x1={xMin} y1="7" x2={xMin} y2="19" stroke="#10b981" strokeWidth="2.5" />
                            <line x1={xMax} y1="7" x2={xMax} y2="19" stroke="#10b981" strokeWidth="2.5" />
                            {/* Cartela central del rango con ancho dinámico amplio */}
                            <rect x={center - badgeW / 2} y="3" width={badgeW} height="20" rx="4" fill="#10b981" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
                            <text x={center} y="13" textAnchor="middle" dominantBaseline="central" className="font-mono text-[10px] font-black fill-slate-950">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* 2. MODO DESVIACIÓN MEDIA: Distancias directas al promedio en y=25 */}
                      {activeMeasure === 'desviacion_media' && (() => {
                        const xMean = getXPos(statsA.mean, currentScenario.minScale, currentScenario.maxScale)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {currentScenario.groupA.data
                              .filter((pt) => pt.val !== statsA.mean)
                              .map((pt) => {
                                const xPt = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                                const isLeft = pt.val < statsA.mean
                                const yPos = isLeft ? 26 : 26
                                return (
                                  <g key={`dist-line-a-${pt.id}`}>
                                    <line x1={xMean} y1={yPos} x2={xPt} y2={yPos} stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
                                    <line x1={xPt} y1={yPos} x2={xPt} y2="70" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
                                    <rect x={(xMean + xPt) / 2 - 18} y={yPos - 7} width="36" height="14" rx="3" fill="#0284c7" />
                                    <text x={(xMean + xPt) / 2} y={yPos} textAnchor="middle" dominantBaseline="central" className="font-mono text-[8.5px] font-black fill-white">
                                      |d|={Math.abs(pt.val - statsA.mean)}
                                    </text>
                                  </g>
                                )
                              })}
                          </g>
                        )
                      })()}

                      {/* 3. MODO VARIANZA: Distancias al cuadrado */}
                      {activeMeasure === 'varianza' && (() => {
                        const xMean = getXPos(statsA.mean, currentScenario.minScale, currentScenario.maxScale)
                        const badgeText = `x̄ = ${statsA.mean} · Varianza σ² = ${statsA.variance} pts²`
                        const badgeW = Math.max(180, badgeText.length * 6.8 + 16)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {currentScenario.groupA.data
                              .filter((pt) => pt.val !== statsA.mean)
                              .map((pt) => {
                                const xPt = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                                const isLeft = pt.val < statsA.mean
                                const yPos = isLeft ? 26 : 26
                                const diff = Math.abs(pt.val - statsA.mean)
                                return (
                                  <g key={`var-line-a-${pt.id}`}>
                                    <line x1={xMean} y1={yPos} x2={xPt} y2={yPos} stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3 2" />
                                    <line x1={xPt} y1={yPos} x2={xPt} y2="70" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
                                    <rect x={(xMean + xPt) / 2 - 20} y={yPos - 7} width="40" height="14" rx="3" fill="#8b5cf6" />
                                    <text x={(xMean + xPt) / 2} y={yPos} textAnchor="middle" dominantBaseline="central" className="font-mono text-[8.5px] font-black fill-white">
                                      d²={(diff * diff).toFixed(1)}
                                    </text>
                                  </g>
                                )
                              })}
                            <rect x={xMean - badgeW / 2} y="3" width={badgeW} height="18" rx="4" fill="#8b5cf6" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                            <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-white">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* 4. MODO DESV. ESTÁNDAR, CV O TODAS: Banda de Dispersión ± 1 Desviación Estándar */}
                      {(activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas') && (() => {
                        const xLeft = getXPos(statsA.mean - statsA.stdDev, currentScenario.minScale, currentScenario.maxScale)
                        const xRight = getXPos(statsA.mean + statsA.stdDev, currentScenario.minScale, currentScenario.maxScale)
                        const xMean = getXPos(statsA.mean, currentScenario.minScale, currentScenario.maxScale)
                        const badgeText =
                          activeMeasure === 'cv'
                            ? `x̄ = ${statsA.mean} · CV = ${statsA.cv}% (${statsA.isHomogeneous ? 'Homogéneo' : 'Heterogéneo'})`
                            : activeMeasure === 'todas'
                            ? `x̄ = ${statsA.mean} · σ = ${statsA.stdDev} (CV = ${statsA.cv}%)`
                            : `x̄ = ${statsA.mean} · Zona Típica (±σ: ${statsA.stdDev})`
                        const badgeW = Math.max(180, badgeText.length * 6.8 + 16)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {/* Banda sombreada de dispersión */}
                            <rect x={xLeft} y="22" width={Math.max(4, xRight - xLeft)} height="83" rx="6" fill="#10b981" fillOpacity="0.22" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
                            {/* Cartela unificada con promedio y zona para que no se superpongan */}
                            <rect x={xMean - badgeW / 2} y="3" width={badgeW} height="18" rx="4" fill="#10b981" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                            <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-slate-950">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* Línea de la Media: SOLO SI NO ES MODO RANGO */}
                      {activeMeasure !== 'rango' && (() => {
                        const xMean = getXPos(statsA.mean, currentScenario.minScale, currentScenario.maxScale)
                        const isDispersionMode = activeMeasure === 'varianza' || activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas'
                        return (
                          <g>
                            <line x1={xMean} y1="21" x2={xMean} y2="112" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 3" />
                            {!isDispersionMode && (
                              <>
                                <rect x={xMean - 32} y="3" width="64" height="18" rx="4" fill="#38bdf8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                                <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-slate-950">
                                  x̄ = {statsA.mean}
                                </text>
                              </>
                            )}
                          </g>
                        )
                      })()}

                      {/* Puntos de datos */}
                      {currentScenario.groupA.data.map((pt, idx) => {
                        const x = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                        const dupIdx = currentScenario.groupA.data.slice(0, idx).filter((p) => p.val === pt.val).length
                        const y = 105 - 15 - dupIdx * 24

                        // En modo rango, resaltar solo los dos extremos
                        const isExtreme = activeMeasure === 'rango' && (pt.val === statsA.min || pt.val === statsA.max)
                        const isDimmed = activeMeasure === 'rango' && !isExtreme

                        return (
                          <g key={`pt-a-${pt.id}`} className="transition-all duration-300" opacity={isDimmed ? 0.35 : 1}>
                            {isExtreme && (
                              <circle
                                cx={x}
                                cy={y}
                                r="15"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="3 2"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={y}
                              r="11.5"
                              fill="#10b981"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
                            />
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="font-mono text-[10.5px] font-black fill-white select-none pointer-events-none"
                            >
                              {pt.val}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>

                {/* Grupo B (Alta Dispersión) */}
                <div className={`p-2 rounded-xl border relative flex flex-col justify-between flex-1 min-h-0 ${
                  isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/60 border-amber-300'
                }`}>
                  <div className="flex items-center justify-between text-xs font-black pb-1 border-b border-amber-500/20">
                    <span className="text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {currentScenario.groupB.name} · Promedio x̄ = {statsB.mean} {currentScenario.unitShort}
                    </span>
                    <span className="font-mono text-[11px] text-amber-400">
                      {activeMeasure === 'rango' && `Rango = ${statsB.range} pts (Mín: ${statsB.min} | Máx: ${statsB.max})`}
                      {activeMeasure === 'desviacion_media' && `Desviación Media (DM) = ${statsB.meanDeviation} pts`}
                      {activeMeasure === 'varianza' && `Varianza σ² = ${statsB.variance} pts² (Distancias al cuadrado)`}
                      {activeMeasure === 'desviacion_estandar' && `Desv. Estándar σ = ${statsB.stdDev} pts (Zona Típica ±σ)`}
                      {activeMeasure === 'cv' && `CV = ${statsB.cv}% (Heterogéneo > 30%) ¡Gran Inestabilidad!`}
                      {activeMeasure === 'todas' && `Rango = ${statsB.range} | σ² = ${statsB.variance} | σ = ${statsB.stdDev} (CV = ${statsB.cv}%)`}
                    </span>
                  </div>

                  {/* SVG Recta Numérica Grupo B */}
                  <div className="flex-1 min-h-0 flex items-center justify-center">
                    <svg viewBox="0 0 820 145" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      {/* Eje horizontal bajado a y=105 */}
                      <line x1="60" y1="105" x2="760" y2="105" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />
                      {/* Ticks */}
                      {Array.from({ length: Math.round((currentScenario.maxScale - currentScenario.minScale) / currentScenario.stepScale) + 1 }).map((_, i) => {
                        const val = currentScenario.minScale + i * currentScenario.stepScale
                        const x = getXPos(val, currentScenario.minScale, currentScenario.maxScale)
                        return (
                          <g key={`tick-b-${val}`}>
                            <line x1={x} y1="100" x2={x} y2="110" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                            <text x={x} y="124" textAnchor="middle" className={`font-mono text-[10.5px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                              {val}
                            </text>
                          </g>
                        )
                      })}

                      {/* 1. MODO RANGO: Corchete de amplitud con cartela de ancho dinámico */}
                      {activeMeasure === 'rango' && (() => {
                        const xMin = getXPos(statsB.min, currentScenario.minScale, currentScenario.maxScale)
                        const xMax = getXPos(statsB.max, currentScenario.minScale, currentScenario.maxScale)
                        const center = (xMin + xMax) / 2
                        const badgeText = `R = ${statsB.max} - ${statsB.min} = ${statsB.range} ${currentScenario.unitShort}`
                        const badgeW = Math.max(140, badgeText.length * 7.5 + 24)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {/* Líneas guía verticales hacia los extremos */}
                            <line x1={xMin} y1="22" x2={xMin} y2="65" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.7" />
                            <line x1={xMax} y1="22" x2={xMax} y2="65" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.7" />
                            {/* Línea horizontal del corchete */}
                            <line x1={xMin} y1="13" x2={xMax} y2="13" stroke="#f59e0b" strokeWidth="2.5" />
                            <line x1={xMin} y1="7" x2={xMin} y2="19" stroke="#f59e0b" strokeWidth="2.5" />
                            <line x1={xMax} y1="7" x2={xMax} y2="19" stroke="#f59e0b" strokeWidth="2.5" />
                            {/* Cartela central del rango con ancho dinámico amplio */}
                            <rect x={center - badgeW / 2} y="3" width={badgeW} height="20" rx="4" fill="#f59e0b" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
                            <text x={center} y="13" textAnchor="middle" dominantBaseline="central" className="font-mono text-[10px] font-black fill-slate-950">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* 2. MODO DESVIACIÓN MEDIA: Distancias directas al promedio */}
                      {activeMeasure === 'desviacion_media' && (() => {
                        const xMean = getXPos(statsB.mean, currentScenario.minScale, currentScenario.maxScale)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {currentScenario.groupB.data
                              .filter((pt) => pt.val !== statsB.mean)
                              .map((pt, i) => {
                                const xPt = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                                const isLeft = pt.val < statsB.mean
                                const yPos = isLeft ? (i === 0 ? 20 : 36) : (i === 3 ? 36 : 20)
                                return (
                                  <g key={`dist-line-b-${pt.id}`}>
                                    <line x1={xMean} y1={yPos} x2={xPt} y2={yPos} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                                    <line x1={xPt} y1={yPos} x2={xPt} y2="70" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
                                    <rect x={(xMean + xPt) / 2 - 18} y={yPos - 7} width="36" height="14" rx="3" fill="#f59e0b" />
                                    <text x={(xMean + xPt) / 2} y={yPos} textAnchor="middle" dominantBaseline="central" className="font-mono text-[8.5px] font-black fill-slate-950">
                                      |d|={Math.abs(pt.val - statsB.mean)}
                                    </text>
                                  </g>
                                )
                              })}
                          </g>
                        )
                      })()}

                      {/* 3. MODO VARIANZA: Distancias al cuadrado */}
                      {activeMeasure === 'varianza' && (() => {
                        const xMean = getXPos(statsB.mean, currentScenario.minScale, currentScenario.maxScale)
                        const badgeText = `x̄ = ${statsB.mean} · Varianza σ² = ${statsB.variance} pts²`
                        const badgeW = Math.max(180, badgeText.length * 6.8 + 16)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {currentScenario.groupB.data
                              .filter((pt) => pt.val !== statsB.mean)
                              .map((pt, i) => {
                                const xPt = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                                const isLeft = pt.val < statsB.mean
                                const yPos = isLeft ? (i === 0 ? 20 : 36) : (i === 4 ? 20 : 36)
                                const diff = Math.abs(pt.val - statsB.mean)
                                return (
                                  <g key={`var-line-b-${pt.id}`}>
                                    <line x1={xMean} y1={yPos} x2={xPt} y2={yPos} stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3 2" />
                                    <line x1={xPt} y1={yPos} x2={xPt} y2="70" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
                                    <rect x={(xMean + xPt) / 2 - 20} y={yPos - 7} width="40" height="14" rx="3" fill="#8b5cf6" />
                                    <text x={(xMean + xPt) / 2} y={yPos} textAnchor="middle" dominantBaseline="central" className="font-mono text-[8.5px] font-black fill-white">
                                      d²={(diff * diff).toFixed(1)}
                                    </text>
                                  </g>
                                )
                              })}
                            <rect x={xMean - badgeW / 2} y="3" width={badgeW} height="18" rx="4" fill="#8b5cf6" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                            <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-white">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* 4. MODO DESV. ESTÁNDAR, CV O TODAS: Banda de Dispersión ± 1 Desviación Estándar */}
                      {(activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas') && (() => {
                        const xLeft = getXPos(statsB.mean - statsB.stdDev, currentScenario.minScale, currentScenario.maxScale)
                        const xRight = getXPos(statsB.mean + statsB.stdDev, currentScenario.minScale, currentScenario.maxScale)
                        const xMean = getXPos(statsB.mean, currentScenario.minScale, currentScenario.maxScale)
                        const badgeText =
                          activeMeasure === 'cv'
                            ? `x̄ = ${statsB.mean} · CV = ${statsB.cv}% (${statsB.isHomogeneous ? 'Homogéneo' : 'Heterogéneo > 30%'})`
                            : activeMeasure === 'todas'
                            ? `x̄ = ${statsB.mean} · σ = ${statsB.stdDev} (CV = ${statsB.cv}%)`
                            : `x̄ = ${statsB.mean} · Zona Típica (±σ: ${statsB.stdDev})`
                        const badgeW = Math.max(180, badgeText.length * 6.8 + 16)
                        return (
                          <g className="animate-in fade-in duration-300">
                            {/* Banda sombreada de dispersión */}
                            <rect x={xLeft} y="22" width={Math.max(4, xRight - xLeft)} height="83" rx="6" fill="#f59e0b" fillOpacity="0.22" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                            {/* Cartela unificada con promedio y zona para que no se superpongan */}
                            <rect x={xMean - badgeW / 2} y="3" width={badgeW} height="18" rx="4" fill="#f59e0b" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                            <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-slate-950">
                              {badgeText}
                            </text>
                          </g>
                        )
                      })()}

                      {/* Línea de la Media: SOLO SI NO ES MODO RANGO */}
                      {activeMeasure !== 'rango' && (() => {
                        const xMean = getXPos(statsB.mean, currentScenario.minScale, currentScenario.maxScale)
                        const isDispersionMode = activeMeasure === 'varianza' || activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas'
                        return (
                          <g>
                            <line x1={xMean} y1="21" x2={xMean} y2="112" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 3" />
                            {!isDispersionMode && (
                              <>
                                <rect x={xMean - 32} y="3" width="64" height="18" rx="4" fill="#38bdf8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                                <text x={xMean} y="12" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-slate-950">
                                  x̄ = {statsB.mean}
                                </text>
                              </>
                            )}
                          </g>
                        )
                      })()}

                      {/* Puntos de datos */}
                      {currentScenario.groupB.data.map((pt, idx) => {
                        const x = getXPos(pt.val, currentScenario.minScale, currentScenario.maxScale)
                        const dupIdx = currentScenario.groupB.data.slice(0, idx).filter((p) => p.val === pt.val).length
                        const y = 105 - 15 - dupIdx * 24

                        // En modo rango, resaltar solo los dos extremos
                        const isExtreme = activeMeasure === 'rango' && (pt.val === statsB.min || pt.val === statsB.max)
                        const isDimmed = activeMeasure === 'rango' && !isExtreme

                        return (
                          <g key={`pt-b-${pt.id}`} className="transition-all duration-300" opacity={isDimmed ? 0.35 : 1}>
                            {isExtreme && (
                              <circle
                                cx={x}
                                cy={y}
                                r="15"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="3 2"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={y}
                              r="11.5"
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"
                            />
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="font-mono text-[10.5px] font-black fill-white select-none pointer-events-none"
                            >
                              {pt.val}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tarjetas comparativas compactas al pie: Progresión pedagógica por pasos */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5 shrink-0 text-center font-mono text-[10.5px]">
                {/* 1. Rango */}
                <button
                  type="button"
                  onClick={() => setActiveMeasure('rango')}
                  className={`p-1 sm:p-1.5 lg:p-2 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                    activeMeasure === 'rango'
                      ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-400 shadow-xs'
                      : isDark ? 'bg-slate-800/60 border-white/10 hover:bg-slate-800' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] sm:text-[10px] font-sans font-black text-blue-500">1. Rango</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); openFormula('rango'); }}
                      className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 cursor-pointer"
                      title="Ver fórmula y solución"
                    >
                      Fórmula ➜
                    </span>
                  </div>
                  <div className="text-center font-bold text-[10px] sm:text-xs pt-0.5 w-full">
                    <span className="text-emerald-400">A: {statsA.range}</span> vs <span className="text-amber-400">B: {statsB.range}</span>
                  </div>
                </button>

                {/* 2. Desviación Media */}
                {(() => {
                  const isUnlocked = activeMeasure === 'desviacion_media' || activeMeasure === 'varianza' || activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas'
                  return (
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setActiveMeasure('desviacion_media')}
                      className={`p-1 sm:p-1.5 lg:p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        !isUnlocked
                          ? 'opacity-35 bg-slate-900/10 dark:bg-slate-900/40 border-white/5 cursor-not-allowed'
                          : activeMeasure === 'desviacion_media'
                          ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-400 shadow-xs cursor-pointer'
                          : isDark ? 'bg-slate-800/60 border-white/10 hover:bg-slate-800 cursor-pointer' : 'bg-slate-50 border-slate-300 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9px] sm:text-[10px] font-sans font-black ${isUnlocked ? 'text-cyan-500' : 'text-slate-500'}`}>
                          2. Desv. Media
                        </span>
                        {isUnlocked && (
                          <span
                            onClick={(e) => { e.stopPropagation(); openFormula('desviacion_media'); }}
                            className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer"
                            title="Ver fórmula y solución"
                          >
                            Fórmula ➜
                          </span>
                        )}
                      </div>
                      <div className="text-center font-bold text-[10px] sm:text-xs pt-0.5 w-full">
                        {isUnlocked ? (
                          <>
                            <span className="text-emerald-400">A: {statsA.meanDeviation}</span> vs <span className="text-amber-400">B: {statsB.meanDeviation}</span>
                          </>
                        ) : (
                          <span className="opacity-30 tracking-widest text-xs">— — —</span>
                        )}
                      </div>
                    </button>
                  )
                })()}

                {/* 3. Varianza (σ²) */}
                {(() => {
                  const isUnlocked = activeMeasure === 'varianza' || activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas'
                  return (
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setActiveMeasure('varianza')}
                      className={`p-1 sm:p-1.5 lg:p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        !isUnlocked
                          ? 'opacity-35 bg-slate-900/10 dark:bg-slate-900/40 border-white/5 cursor-not-allowed'
                          : activeMeasure === 'varianza'
                          ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-400 shadow-xs cursor-pointer'
                          : isDark ? 'bg-slate-800/60 border-white/10 hover:bg-slate-800 cursor-pointer' : 'bg-slate-50 border-slate-300 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9px] sm:text-[10px] font-sans font-black ${isUnlocked ? 'text-purple-500' : 'text-slate-500'}`}>
                          3. Varianza (σ²)
                        </span>
                        {isUnlocked && (
                          <span
                            onClick={(e) => { e.stopPropagation(); openFormula('varianza'); }}
                            className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 cursor-pointer"
                            title="Ver fórmula y solución"
                          >
                            Fórmula ➜
                          </span>
                        )}
                      </div>
                      <div className="text-center font-bold text-[10px] sm:text-xs pt-0.5 w-full">
                        {isUnlocked ? (
                          <>
                            <span className="text-emerald-400">A: {statsA.variance}</span> vs <span className="text-amber-400">B: {statsB.variance}</span>
                          </>
                        ) : (
                          <span className="opacity-30 tracking-widest text-xs">— — —</span>
                        )}
                      </div>
                    </button>
                  )
                })()}

                {/* 4. Desviación Estándar (σ) */}
                {(() => {
                  const isUnlocked = activeMeasure === 'desviacion_estandar' || activeMeasure === 'cv' || activeMeasure === 'todas'
                  return (
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setActiveMeasure('desviacion_estandar')}
                      className={`p-1 sm:p-1.5 lg:p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        !isUnlocked
                          ? 'opacity-35 bg-slate-900/10 dark:bg-slate-900/40 border-white/5 cursor-not-allowed'
                          : activeMeasure === 'desviacion_estandar'
                          ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-400 shadow-xs cursor-pointer'
                          : isDark ? 'bg-slate-800/60 border-white/10 hover:bg-slate-800 cursor-pointer' : 'bg-slate-50 border-slate-300 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9px] sm:text-[10px] font-sans font-black ${isUnlocked ? 'text-emerald-500' : 'text-slate-500'}`}>
                          4. Desv. Est. (σ)
                        </span>
                        {isUnlocked && (
                          <span
                            onClick={(e) => { e.stopPropagation(); openFormula('desviacion_estandar'); }}
                            className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                            title="Ver fórmula y solución"
                          >
                            Fórmula ➜
                          </span>
                        )}
                      </div>
                      <div className="text-center font-bold text-[10px] sm:text-xs pt-0.5 w-full">
                        {isUnlocked ? (
                          <>
                            <span className="text-emerald-400">A: {statsA.stdDev}</span> vs <span className="text-amber-400">B: {statsB.stdDev}</span>
                          </>
                        ) : (
                          <span className="opacity-30 tracking-widest text-xs">— — —</span>
                        )}
                      </div>
                    </button>
                  )
                })()}

                {/* 5. Coeficiente de Variación */}
                {(() => {
                  const isUnlocked = activeMeasure === 'cv' || activeMeasure === 'todas'
                  return (
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setActiveMeasure('cv')}
                      className={`p-1 sm:p-1.5 lg:p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        !isUnlocked
                          ? 'opacity-35 bg-slate-900/10 dark:bg-slate-900/40 border-white/5 cursor-not-allowed'
                          : activeMeasure === 'cv'
                          ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-400 shadow-xs cursor-pointer'
                          : isDark ? 'bg-slate-800/60 border-white/10 hover:bg-slate-800 cursor-pointer' : 'bg-slate-50 border-slate-300 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9px] sm:text-[10px] font-sans font-black ${isUnlocked ? 'text-amber-500' : 'text-slate-500'}`}>
                          5. Coef. Var. (CV)
                        </span>
                        {isUnlocked && (
                          <span
                            onClick={(e) => { e.stopPropagation(); openFormula('cv'); }}
                            className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 cursor-pointer"
                            title="Ver fórmula y solución"
                          >
                            Fórmula ➜
                          </span>
                        )}
                      </div>
                      <div className="text-center font-bold text-[10px] sm:text-xs pt-0.5 w-full">
                        {isUnlocked ? (
                          <>
                            <span className="text-emerald-400">A: {statsA.cv}%</span> vs <span className="text-amber-400">B: {statsB.cv}%</span>
                          </>
                        ) : (
                          <span className="opacity-30 tracking-widest text-xs">— — —</span>
                        )}
                      </div>
                    </button>
                  )
                })()}
              </div>
            </div>
          )}

          {/* ── CONTENIDO MODO 2: DISTANCIAS A LA MEDIA Y POR QUÉ AL CUADRADO ── */}
          {activeTab === 'distancias' && (() => {
            const currentGroup = focusedGroup === 'A' ? currentScenario.groupA : currentScenario.groupB
            const currentStats = focusedGroup === 'A' ? statsA : statsB
            const sumDiffs = currentStats.deviations.reduce((acc, d) => acc + d.diff, 0)

            return (
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
                <div className={`shrink-0 p-2 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📐</span>
                    <p className="leading-tight text-[11px] lg:text-xs">
                      Observa las distancias de cada dato hacia la Media (x̄ = {currentStats.mean}). 
                      Si sumamos las diferencias con signo: <strong className="font-mono text-rose-400">Σ(xi - x̄) = {Number(sumDiffs.toFixed(2))}</strong> (¡siempre da cero porque se anulan!). 
                      Por eso las elevamos al cuadrado o tomamos valor absoluto.
                    </p>
                  </div>
                </div>

                {/* Gráfico Vectorial Grande con Flechas de Desviación */}
                <div className="flex-1 min-h-0 flex items-center justify-center relative">
                  <svg viewBox="0 0 820 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {/* Eje horizontal */}
                    <line x1="60" y1="120" x2="760" y2="120" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />
                    {/* Ticks */}
                    {Array.from({ length: Math.round((currentScenario.maxScale - currentScenario.minScale) / currentScenario.stepScale) + 1 }).map((_, i) => {
                      const val = currentScenario.minScale + i * currentScenario.stepScale
                      const x = getXPos(val, currentScenario.minScale, currentScenario.maxScale)
                      return (
                        <g key={`dist-tick-${val}`}>
                          <line x1={x} y1="115" x2={x} y2="125" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                          <text x={x} y="142" textAnchor="middle" className={`font-mono text-[10px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                            {val}
                          </text>
                        </g>
                      )
                    })}

                    {/* Línea Central de la Media */}
                    {(() => {
                      const xMean = getXPos(currentStats.mean, currentScenario.minScale, currentScenario.maxScale)
                      return (
                        <g>
                          <line x1={xMean} y1="15" x2={xMean} y2="135" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 3" />
                          <rect x={xMean - 35} y="4" width="70" height="18" rx="4" fill="#38bdf8" />
                          <text x={xMean} y="16.5" textAnchor="middle" className="font-mono text-[10.5px] font-black fill-slate-950">
                            x̄ = {currentStats.mean}
                          </text>
                        </g>
                      )
                    })()}

                    {/* Segmentos y Flechas de Distancia a la Media */}
                    {currentStats.deviations.map((d, idx) => {
                      const xPt = getXPos(d.val, currentScenario.minScale, currentScenario.maxScale)
                      const xMean = getXPos(currentStats.mean, currentScenario.minScale, currentScenario.maxScale)
                      const yLev = 35 + idx * 16

                      const isLeft = xPt < xMean
                      const color = isLeft ? '#38bdf8' : '#f43f5e'

                      return (
                        <g key={`dev-arrow-${d.id}`} className="animate-in fade-in duration-300">
                          {/* Línea horizontal de distancia */}
                          <line x1={xMean} y1={yLev} x2={xPt} y2={yLev} stroke={color} strokeWidth="2" strokeDasharray="3 2" />
                          {/* Pequeño conector vertical hacia el punto */}
                          <line x1={xPt} y1={yLev} x2={xPt} y2="120" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
                          {/* Cartelito de distancia */}
                          <rect x={(xPt + xMean) / 2 - 20} y={yLev - 8} width="40" height="13" rx="3" fill={color} />
                          <text x={(xPt + xMean) / 2} y={yLev + 1.5} textAnchor="middle" className="font-mono text-[8.5px] font-black fill-white">
                            {d.diff > 0 ? `+${d.diff}` : d.diff}
                          </text>
                          {/* Círculo del dato en la recta */}
                          <circle cx={xPt} cy="120" r="10.5" fill={currentGroup.color} stroke="#ffffff" strokeWidth="2.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
                          <text x={xPt} y="120" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9.5px] font-black fill-white select-none pointer-events-none">
                            {d.val}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                {/* Tabla Desglosada Paso a Paso */}
                <div className={`shrink-0 p-2 rounded-xl border font-mono text-[11px] overflow-x-auto ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="grid grid-cols-5 gap-2 text-center border-b border-white/10 pb-1 font-bold text-[10px] uppercase opacity-70">
                    <span>Dato (xi)</span>
                    <span>Media (x̄)</span>
                    <span>Diferencia (xi - x̄)</span>
                    <span>Distancia |xi - x̄|</span>
                    <span>Cuadrado (xi - x̄)²</span>
                  </div>
                  {currentStats.deviations.map((d) => (
                    <div key={`row-${d.id}`} className="grid grid-cols-5 gap-2 text-center py-0.5 border-b border-white/5">
                      <span className="font-black text-sky-400">{d.val}</span>
                      <span>{currentStats.mean}</span>
                      <span className={d.diff < 0 ? 'text-sky-400 font-bold' : d.diff > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {d.diff > 0 ? `+${d.diff}` : d.diff}
                      </span>
                      <span className="font-black text-emerald-400">{d.absDiff}</span>
                      <span className="font-black text-purple-400">{d.sqDiff}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-5 gap-2 text-center pt-1 font-black text-[11px] bg-white/5 rounded mt-0.5">
                    <span>TOTALES (Σ)</span>
                    <span>-</span>
                    <span className="text-rose-400 font-black">0 (¡Se anulan!)</span>
                    <span className="text-emerald-400">Σ = {(currentStats.meanDeviation * currentStats.n).toFixed(2)}</span>
                    <span className="text-purple-400">Σ = {(currentStats.variance * currentStats.n).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── CONTENIDO MODO 3: LABORATORIO DINÁMICO INTERACTIVO ── */}
          {activeTab === 'laboratorio' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
              {/* Barra de control interactiva del laboratorio */}
              <div className={`shrink-0 p-2 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                isDark ? 'bg-purple-950/30 border-purple-500/20 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-950'
              }`}>
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold shrink-0">Nivel de Dispersión:</span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={labSpread}
                    onChange={(e) => setLabSpread(Number(e.target.value))}
                    aria-label="Nivel de dispersión"
                    className="flex-1 accent-purple-500 cursor-pointer h-2 bg-purple-200 dark:bg-purple-900 rounded-lg"
                  />
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                    {labSpread === 1 && '1: Muy Agrupados'}
                    {labSpread === 2 && '2: Concentrados'}
                    {labSpread === 3 && '3: Moderados'}
                    {labSpread === 4 && '4: Dispersos'}
                    {labSpread === 5 && '5: Muy Dispersos'}
                    {labSpread === 6 && '6: Dispersión Máxima'}
                  </span>
                </div>
              </div>

              {/* Gráfico del Laboratorio en tiempo real */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative">
                <svg viewBox="0 0 820 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Eje horizontal de 0 a 20 */}
                  <line x1="60" y1="120" x2="760" y2="120" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="3" strokeLinecap="round" />
                  {/* Ticks 0 a 20 de 2 en 2 */}
                  {Array.from({ length: 11 }).map((_, i) => {
                    const val = i * 2
                    const x = getXPos(val, 0, 20)
                    return (
                      <g key={`lab-tick-${val}`}>
                        <line x1={x} y1="115" x2={x} y2="125" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" />
                        <text x={x} y="142" textAnchor="middle" className={`font-mono text-[10px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}>
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {/* Banda de Dispersión ± σ */}
                  {(() => {
                    const xLeft = getXPos(statsLab.mean - statsLab.stdDev, 0, 20)
                    const xRight = getXPos(statsLab.mean + statsLab.stdDev, 0, 20)
                    return (
                      <g className="transition-all duration-300">
                        <rect x={xLeft} y="35" width={Math.max(4, xRight - xLeft)} height="55" rx="6" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" />
                        <text x={(xLeft + xRight) / 2} y="28" textAnchor="middle" className="font-mono text-[10px] font-black fill-purple-400">
                          Zona de 1 Desviación Estándar (x̄ ± σ: {statsLab.stdDev})
                        </text>
                      </g>
                    )
                  })()}

                  {/* Línea de la Media */}
                  {(() => {
                    const xMean = getXPos(statsLab.mean, 0, 20)
                    return (
                      <g className="transition-all duration-300">
                        <line x1={xMean} y1="20" x2={xMean} y2="135" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 3" />
                        <rect x={xMean - 34} y="8" width="68" height="18" rx="4" fill="#38bdf8" />
                        <text x={xMean} y="20.5" textAnchor="middle" className="font-mono text-[10px] font-black fill-slate-950">
                          x̄ = {statsLab.mean}
                        </text>
                      </g>
                    )
                  })()}

                  {/* Puntos de datos */}
                  {labData.map((pt) => {
                    const x = getXPos(pt.val, 0, 20)
                    const y = 120 - 18
                    const isOutlier = pt.id === 'lab-outlier'
                    return (
                      <g key={pt.id} className="transition-all duration-300">
                        <circle
                          cx={x}
                          cy={y}
                          r={isOutlier ? '13' : '11.5'}
                          fill={isOutlier ? '#f43f5e' : '#8b5cf6'}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        />
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-mono text-[10px] font-black fill-white select-none pointer-events-none"
                        >
                          {pt.val}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Indicadores en Tiempo Real del Laboratorio */}
              <div className="grid grid-cols-4 gap-2 shrink-0 text-center font-mono text-xs">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                  <span className="text-[10px] font-sans font-bold opacity-70 block">Rango (Amplitud)</span>
                  <span className="text-lg font-black text-sky-400">{statsLab.range}</span>
                  <span className="text-[10px] block opacity-60">Máx ({statsLab.max}) - Mín ({statsLab.min})</span>
                </div>
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                  <span className="text-[10px] font-sans font-bold opacity-70 block">Desv. Media (DM)</span>
                  <span className="text-lg font-black text-emerald-400">{statsLab.meanDeviation}</span>
                  <span className="text-[10px] block opacity-60">Promedio de distancias puras</span>
                </div>
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                  <span className="text-[10px] font-sans font-bold opacity-70 block">Desv. Estándar (σ)</span>
                  <span className="text-lg font-black text-purple-400">{statsLab.stdDev}</span>
                  <span className="text-[10px] block opacity-60">Varianza σ² = {statsLab.variance}</span>
                </div>
                <div className={`p-2 rounded-xl border ${
                  statsLab.isHomogeneous
                    ? isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                    : isDark ? 'bg-amber-950/40 border-amber-500/40' : 'bg-amber-50 border-amber-300'
                }`}>
                  <span className="text-[10px] font-sans font-bold opacity-70 block">Coef. Variación (CV)</span>
                  <span className={`text-lg font-black ${statsLab.isHomogeneous ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {statsLab.cv}%
                  </span>
                  <span className="text-[10px] font-bold block">
                    {statsLab.isHomogeneous ? '✓ Homogéneo (≤30%)' : '⚠️ Heterogéneo (>30%)'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL DIDÁCTICO DE FÓRMULAS Y SOLUCIÓN PASO A PASO ── */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`max-w-lg w-full rounded-2xl border p-3 sm:p-4 shadow-2xl relative flex flex-col justify-between max-h-[92vh] overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Cabecera del Modal con Selector de Medida */}
            <div className="pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🧮</span>
                  <h3 className="font-black text-xs sm:text-sm">
                    Fórmula y Solución Paso a Paso
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                  title="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Pestañas internas del Modal */}
              <div className="grid grid-cols-5 gap-1 text-[9.5px] sm:text-[10.5px] font-bold">
                <button
                  type="button"
                  onClick={() => setFormulaModalMeasure('rango')}
                  className={`py-1 rounded-lg transition-all cursor-pointer border text-center ${
                    formulaModalMeasure === 'rango'
                      ? 'bg-blue-600 text-white border-blue-400 font-black shadow-xs ring-1 ring-blue-300'
                      : isDark ? 'bg-slate-800 text-blue-300 border-white/10 hover:bg-slate-700' : 'bg-slate-100 text-blue-900 border-slate-300'
                  }`}
                >
                  1. Rango
                </button>

                <button
                  type="button"
                  onClick={() => setFormulaModalMeasure('desviacion_media')}
                  className={`py-1 rounded-lg transition-all cursor-pointer border text-center ${
                    formulaModalMeasure === 'desviacion_media'
                      ? 'bg-cyan-600 text-white border-cyan-400 font-black shadow-xs ring-1 ring-cyan-300'
                      : isDark ? 'bg-slate-800 text-cyan-300 border-white/10 hover:bg-slate-700' : 'bg-slate-100 text-cyan-900 border-slate-300'
                  }`}
                >
                  2. Desv. Media
                </button>

                <button
                  type="button"
                  onClick={() => setFormulaModalMeasure('varianza')}
                  className={`py-1 rounded-lg transition-all cursor-pointer border text-center ${
                    formulaModalMeasure === 'varianza'
                      ? 'bg-purple-600 text-white border-purple-400 font-black shadow-xs ring-1 ring-purple-300'
                      : isDark ? 'bg-slate-800 text-purple-300 border-white/10 hover:bg-slate-700' : 'bg-slate-100 text-purple-900 border-slate-300'
                  }`}
                >
                  3. Varianza (σ²)
                </button>

                <button
                  type="button"
                  onClick={() => setFormulaModalMeasure('desviacion_estandar')}
                  className={`py-1 rounded-lg transition-all cursor-pointer border text-center ${
                    formulaModalMeasure === 'desviacion_estandar'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-xs ring-1 ring-emerald-300'
                      : isDark ? 'bg-slate-800 text-emerald-300 border-white/10 hover:bg-slate-700' : 'bg-slate-100 text-emerald-900 border-slate-300'
                  }`}
                >
                  4. Desv. Est. (σ)
                </button>

                <button
                  type="button"
                  onClick={() => setFormulaModalMeasure('cv')}
                  className={`py-1 rounded-lg transition-all cursor-pointer border text-center ${
                    formulaModalMeasure === 'cv'
                      ? 'bg-amber-600 text-white border-amber-400 font-black shadow-xs ring-1 ring-amber-300'
                      : isDark ? 'bg-slate-800 text-amber-300 border-white/10 hover:bg-slate-700' : 'bg-slate-100 text-amber-900 border-slate-300'
                  }`}
                >
                  5. Coef. Var.
                </button>
              </div>
            </div>

            {/* Contenido Scrollable Interno */}
            <div className="flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2.5 text-xs pr-1">

              {/* ── 1. DETALLE DE RANGO ── */}
              {formulaModalMeasure === 'rango' && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                    <span className="font-black text-blue-400 block text-xs">Fórmula del Rango (R)</span>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      Mide la separación total entre los valores extremos de la muestra:
                    </p>
                    <div className="font-mono text-center font-black text-sm text-blue-500 dark:text-blue-300 py-1 bg-white/5 rounded-lg mt-1 border border-blue-400/20">
                      R = x_máx - x_mín
                    </div>
                  </div>

                  {/* Solución Paso a Paso */}
                  <div className="space-y-2">
                    <h4 className="font-black text-xs text-sky-400 uppercase tracking-wider">Solución del Caso Actual ({currentScenario.title}):</h4>

                    {/* Grupo A */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                      <strong className="text-emerald-400 block">{currentScenario.groupA.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>• Datos: [{currentScenario.groupA.data.map(d => d.val).join(', ')}]</div>
                        <div>• Valor Máximo (x_máx): <strong className="text-emerald-400">{statsA.max}</strong></div>
                        <div>• Valor Mínimo (x_mín): <strong className="text-emerald-400">{statsA.min}</strong></div>
                        <div className="pt-1 font-bold">
                          R_A = {statsA.max} - {statsA.min} = <span className="text-sm text-emerald-400 font-black">{statsA.range} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grupo B */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <strong className="text-amber-400 block">{currentScenario.groupB.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>• Datos: [{currentScenario.groupB.data.map(d => d.val).join(', ')}]</div>
                        <div>• Valor Máximo (x_máx): <strong className="text-amber-400">{statsB.max}</strong></div>
                        <div>• Valor Mínimo (x_mín): <strong className="text-amber-400">{statsB.min}</strong></div>
                        <div className="pt-1 font-bold">
                          R_B = {statsB.max} - {statsB.min} = <span className="text-sm text-amber-400 font-black">{statsB.range} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretación Gráfica */}
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                    <strong className="text-sky-400 block mb-1">👀 ¿Cómo se interpreta en el gráfico?</strong>
                    <p>
                      En la recta numérica, el rango es el <strong>corchete horizontal</strong> que conecta el primer punto con el último.
                      Observa que el corchete de Sofía mide <strong>{statsB.range} puntos</strong> (ocupa más de la mitad de la recta de 0 a 20), mientras que el de Mateo solo mide <strong>{statsA.range} puntos</strong>.
                    </p>
                    <p className="mt-1 text-slate-400 text-[10px]">
                      <em>Limitación</em>: El rango es muy veloz de calcular, pero solo mira los dos extremos y no toma en cuenta qué tan dispersos están los datos del medio.
                    </p>
                  </div>
                </div>
              )}

              {/* ── 2. DETALLE DE DESVIACIÓN MEDIA ── */}
              {formulaModalMeasure === 'desviacion_media' && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                    <span className="font-black text-cyan-400 block text-xs">Fórmula de Desviación Media (DM)</span>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      Promedia las distancias directas (en valor absoluto) de cada dato a la media:
                    </p>
                    <div className="py-1 text-center font-mono bg-white/5 rounded-lg mt-1 border border-cyan-400/20">
                      <MathFraction
                        prefix={<span className="font-bold text-cyan-400 mr-1">DM =</span>}
                        numerator={<span className="font-bold">Σ |xi - x̄|</span>}
                        denominator={<span className="font-bold">N</span>}
                      />
                    </div>
                  </div>

                  {/* Solución Paso a Paso */}
                  <div className="space-y-2">
                    <h4 className="font-black text-xs text-sky-400 uppercase tracking-wider">Solución del Caso Actual (Media x̄ = {statsA.mean}):</h4>

                    {/* Grupo A */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                      <strong className="text-emerald-400 block">{currentScenario.groupA.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Distancias absolutas |xi - {statsA.mean}|:</div>
                        <div className="text-[10px] opacity-85">
                          {statsA.deviations.map(d => `|${d.val} - ${statsA.mean}| = ${d.absDiff}`).join(' ; ')}
                        </div>
                        <div>2. Suma de distancias: Σ = {statsA.deviations.reduce((acc, d) => acc + d.absDiff, 0)}</div>
                        <div className="pt-0.5 font-bold">
                          DM_A = {statsA.deviations.reduce((acc, d) => acc + d.absDiff, 0)} / {statsA.n} = <span className="text-sm text-emerald-400 font-black">{statsA.meanDeviation} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grupo B */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <strong className="text-amber-400 block">{currentScenario.groupB.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Distancias absolutas |xi - {statsB.mean}|:</div>
                        <div className="text-[10px] opacity-85">
                          {statsB.deviations.map(d => `|${d.val} - ${statsB.mean}| = ${d.absDiff}`).join(' ; ')}
                        </div>
                        <div>2. Suma de distancias: Σ = {statsB.deviations.reduce((acc, d) => acc + d.absDiff, 0)}</div>
                        <div className="pt-0.5 font-bold">
                          DM_B = {statsB.deviations.reduce((acc, d) => acc + d.absDiff, 0)} / {statsB.n} = <span className="text-sm text-amber-400 font-black">{statsB.meanDeviation} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretación Gráfica */}
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                    <strong className="text-sky-400 block mb-1">👀 ¿Cómo se interpreta en el gráfico?</strong>
                    <p>
                      En el gráfico, cada línea punteada hacia la línea central azul de la media es una distancia individual.
                      En Mateo, un examen promedio solo se aleja <strong>{statsA.meanDeviation} puntos</strong> de su nota esperada (casi nada).
                      En Sofía, cada examen se aleja en promedio <strong>{statsB.meanDeviation} puntos</strong> (¡{Number((statsB.meanDeviation / Math.max(0.1, statsA.meanDeviation)).toFixed(1))} veces más lejos!).
                    </p>
                  </div>
                </div>
              )}

              {/* ── 3. DETALLE DE VARIANZA ── */}
              {formulaModalMeasure === 'varianza' && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                    <span className="font-black text-purple-400 block text-xs">Fórmula de la Varianza (σ²)</span>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      Promedio de las distancias elevadas al cuadrado. ¿Por qué al cuadrado? Para que las distancias negativas no se anulen con las positivas y castigar fuertemente a los datos alejados:
                    </p>
                    <div className="py-1 flex items-center justify-center font-mono text-center text-xs bg-white/5 rounded-lg mt-1 border border-purple-400/20">
                      <MathFraction
                        prefix={<span className="font-bold text-purple-400 mr-1">σ² =</span>}
                        numerator={<span>Σ (xi - x̄)²</span>}
                        denominator={<span>N</span>}
                      />
                    </div>
                    <div className="text-[10px] text-purple-300 mt-1">
                      ⚠️ <em>Nota importante</em>: Su resultado queda en unidades al cuadrado ({currentScenario.unitShort}²), por lo que no se puede graficar directamente como una nota normal.
                    </div>
                  </div>

                  {/* Solución Paso a Paso */}
                  <div className="space-y-2">
                    <h4 className="font-black text-xs text-sky-400 uppercase tracking-wider">Solución del Caso Actual:</h4>

                    {/* Grupo A */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                      <strong className="text-emerald-400 block">{currentScenario.groupA.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Diferencias al cuadrado (xi - {statsA.mean})²:</div>
                        <div className="text-[10px] opacity-85">
                          {statsA.deviations.map(d => `(${d.val}-${statsA.mean})²=${d.sqDiff}`).join(' ; ')}
                        </div>
                        <div className="pt-0.5 font-bold">
                          2. Varianza: σ² = {statsA.deviations.reduce((acc, d) => acc + d.sqDiff, 0)} ÷ {statsA.n} = <span className="text-sm text-emerald-400 font-black">{statsA.variance} {currentScenario.unitShort}²</span>
                        </div>
                      </div>
                    </div>

                    {/* Grupo B */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <strong className="text-amber-400 block">{currentScenario.groupB.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Diferencias al cuadrado (xi - {statsB.mean})²:</div>
                        <div className="text-[10px] opacity-85">
                          {statsB.deviations.map(d => `(${d.val}-${statsB.mean})²=${d.sqDiff}`).join(' ; ')}
                        </div>
                        <div className="pt-0.5 font-bold">
                          2. Varianza: σ² = {statsB.deviations.reduce((acc, d) => acc + d.sqDiff, 0)} ÷ {statsB.n} = <span className="text-sm text-amber-400 font-black">{statsB.variance} {currentScenario.unitShort}²</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretación Gráfica */}
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                    <strong className="text-sky-400 block mb-1">👀 ¿Cómo se interpreta en el gráfico?</strong>
                    <p>
                      En el gráfico de Varianza observas sobre cada dato su distancia al cuadrado (d²).
                      En Sofía, notas como 20 y 08 generan desvíos enormes (d² = 36), disparando la varianza a <strong>{statsB.variance} pts²</strong> (¡52 veces mayor que la de Mateo con solo <strong>{statsA.variance} pts²</strong>!).
                    </p>
                  </div>
                </div>
              )}

              {/* ── 4. DETALLE DE DESVIACIÓN ESTÁNDAR ── */}
              {formulaModalMeasure === 'desviacion_estandar' && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                    <span className="font-black text-emerald-400 block text-xs">Fórmula de la Desviación Estándar (σ)</span>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      Es la raíz cuadrada de la varianza. Permite "deshacer el cuadrado" y regresar a las unidades originales ({currentScenario.unitShort}) para medir la dispersión real:
                    </p>
                    <div className="py-1 flex items-center justify-center font-mono text-center text-xs bg-white/5 rounded-lg mt-1 border border-emerald-400/20">
                      <span className="text-emerald-400 font-black text-base">σ = √σ²</span>
                    </div>
                  </div>

                  {/* Solución Paso a Paso */}
                  <div className="space-y-2">
                    <h4 className="font-black text-xs text-sky-400 uppercase tracking-wider">Solución del Caso Actual:</h4>

                    {/* Grupo A */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                      <strong className="text-emerald-400 block">{currentScenario.groupA.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>• Varianza obtenida: σ² = {statsA.variance} {currentScenario.unitShort}²</div>
                        <div className="pt-0.5 font-bold">
                          • Desv. Estándar: σ_A = √{statsA.variance} = <span className="text-sm text-emerald-400 font-black">{statsA.stdDev} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grupo B */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <strong className="text-amber-400 block">{currentScenario.groupB.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>• Varianza obtenida: σ² = {statsB.variance} {currentScenario.unitShort}²</div>
                        <div className="pt-0.5 font-bold">
                          • Desv. Estándar: σ_B = √{statsB.variance} ≈ <span className="text-sm text-amber-400 font-black">{statsB.stdDev} {currentScenario.unitShort}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretación Gráfica */}
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                    <strong className="text-sky-400 block mb-1">👀 ¿Cómo se interpreta en el gráfico?</strong>
                    <p>
                      La Desviación Estándar define la <strong>Zona Típica (x̄ ± σ)</strong> sombreada en la recta numérica.
                      En Mateo, la franja es muy compacta ([{Number((statsA.mean - statsA.stdDev).toFixed(2))}, {Number((statsA.mean + statsA.stdDev).toFixed(2))}] pts).
                      En Sofía, la franja se estira por casi toda la recta ([{Number((statsB.mean - statsB.stdDev).toFixed(2))}, {Number((statsB.mean + statsB.stdDev).toFixed(2))}] pts).
                    </p>
                  </div>
                </div>
              )}

              {/* ── 4. DETALLE DE COEFICIENTE DE VARIACIÓN ── */}
              {formulaModalMeasure === 'cv' && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                    <span className="font-black text-amber-400 block text-xs">Fórmula del Coeficiente de Variación (CV)</span>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      Expresa la dispersión relativa en porcentaje con respecto a la media:
                    </p>
                    <div className="py-1 text-center font-mono bg-white/5 rounded-lg mt-1 border border-amber-400/20">
                      <MathFraction
                        prefix={<span className="font-bold text-amber-400 mr-1">CV =</span>}
                        numerator={<span>σ</span>}
                        denominator={<span>x̄</span>}
                        suffix={<span className="ml-1 font-bold">× 100%</span>}
                      />
                    </div>
                    <div className="text-[10px] opacity-90 pt-1 space-y-0.5">
                      <div>• <strong>CV ≤ 30%</strong>: Datos Homogéneos (baja dispersión, media muy confiable).</div>
                      <div>• <strong>CV &gt; 30%</strong>: Datos Heterogéneos (alta dispersión, media inestable).</div>
                    </div>
                  </div>

                  {/* Solución Paso a Paso */}
                  <div className="space-y-2">
                    <h4 className="font-black text-xs text-sky-400 uppercase tracking-wider">Solución del Caso Actual:</h4>

                    {/* Grupo A */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                      <strong className="text-emerald-400 block">{currentScenario.groupA.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Razón σ / x̄: {statsA.stdDev} / {statsA.mean} = {(statsA.stdDev / statsA.mean).toFixed(4)}</div>
                        <div>2. Multiplicar por 100%: {(statsA.stdDev / statsA.mean).toFixed(4)} × 100% = <span className="text-sm text-emerald-400 font-black">{statsA.cv}%</span></div>
                        <div className="pt-0.5 font-bold text-emerald-400">
                          ✓ Veredicto: Como {statsA.cv}% ≤ 30%, el grupo es altamente homogéneo y regular.
                        </div>
                      </div>
                    </div>

                    {/* Grupo B */}
                    <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <strong className="text-amber-400 block">{currentScenario.groupB.name}:</strong>
                      <div className="text-[11px] font-mono space-y-0.5 mt-1">
                        <div>1. Razón σ / x̄: {statsB.stdDev} / {statsB.mean} = {(statsB.stdDev / statsB.mean).toFixed(4)}</div>
                        <div>2. Multiplicar por 100%: {(statsB.stdDev / statsB.mean).toFixed(4)} × 100% = <span className="text-sm text-amber-400 font-black">{statsB.cv}%</span></div>
                        <div className="pt-0.5 font-bold text-amber-400">
                          ⚠️ Veredicto: Como {statsB.cv}% &gt; 30%, el grupo es heterogéneo y de gran inestabilidad.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretación Gráfica */}
                  <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
                    <strong className="text-sky-400 block mb-1">👀 ¿Cómo se interpreta en la vida real?</strong>
                    <p>
                      El CV te dice qué tan seguro puedes estar de que el próximo examen coincidirá con el promedio.
                      Con Mateo ({statsA.cv}%), es casi seguro que sacará entre 13 y 15.
                      Con Sofía ({statsB.cv}%), su promedio de 14 es una ilusión matemática: puede sacar un 20 o caer a un 08.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Pie del Modal */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[10px] opacity-60 font-mono">
                Pestaña actual: {formulaModalMeasure}
              </span>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
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
        title="Guía: Medidas de Dispersión"
        buttonColor="bg-blue-600 hover:bg-blue-500"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            ¿Por qué el promedio no es suficiente? Esta vista te permite comprender el concepto de regularidad y consistencia:
          </p>
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
            <strong className="text-blue-400">1. Comparativa (Mismo Promedio):</strong>
            <p>Observa cómo dos grupos pueden tener idéntica Media (14 puntos), pero uno es muy regular y predecible (puntos pegados a la media) y el otro es caótico con notas extremas.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <strong className="text-emerald-400">2. ¿Por qué al Cuadrado?:</strong>
            <p>Comprueba que la suma de las diferencias directas (xi - x̄) siempre da 0. Por eso se usan distancias absolutas (DM) o al cuadrado (σ).</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1">
            <strong className="text-purple-400">3. Laboratorio Dinámico:</strong>
            <p>Mueve el deslizador para abrir o cerrar los datos, o pulsa «Agregar Dato Atípico» para ver cómo un solo valor extremo dispara la desviación estándar.</p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
