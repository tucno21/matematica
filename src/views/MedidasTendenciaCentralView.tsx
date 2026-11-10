import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type StageLevel = 'sueltos' | 'no_agrupados' | 'agrupados'
export type MeasureType = 'media' | 'mediana' | 'moda'

interface DiscreteRow {
  xi: number
  fi: number
  Fi: number
  xiFi: number
}

interface GroupedRow {
  index: number
  li: number
  ls: number
  label: string
  xi: number
  fi: number
  Fi: number
  xiFi: number
}

// ─── Componente Reutilizable de Fracción Matemática Vertical ──────────────────
function MathFraction({
  numerator,
  denominator,
  prefix,
  suffix
}: {
  numerator: React.ReactNode
  denominator: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-center">
      {prefix && <span className="font-bold">{prefix}</span>}
      <div className="inline-flex flex-col items-center justify-center">
        <span className="px-1.5 pb-0.5 border-b-2 border-current font-bold text-center w-full leading-tight">
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
export default function MedidasTendenciaCentralView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Nivel seleccionado (1. Datos Sueltos, 2. Tabla No Agrupados, 3. Tabla Agrupados)
  const [stageLevel, setStageLevel] = useState<StageLevel>('sueltos')
  // Medida activa para ver explicación y animación detallada
  const [activeMeasure, setActiveMeasure] = useState<MeasureType>('media')
  // Modal de ayuda
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // ─── ESTADO NIVEL 1: DATOS SUELTOS ───
  // Muestra didáctica inicial de 9 datos
  const defaultSueltos = useMemo(() => [11, 14, 12, 16, 12, 18, 12, 15, 20], [])
  const [sueltosData, setSueltosData] = useState<number[]>(defaultSueltos)
  const [outlierActive, setOutlierActive] = useState<boolean>(false)

  // Pasos de la animación de Datos Sueltos:
  // 0: Inicial (solo datos desordenados, recta sin marcas)
  // 1: Se traza la recta numérica (sub 0: eje y escala, sub 1: puntos de datos)
  // 2: Se halla la MODA (sub 0: resalta repetidos en fichas, sub 1: marca Mo en recta)
  // 3: Se halla la MEDIANA (sub 0: orden ascendente, sub 1..4: cancela pares de extremos, sub 5: marca Me en recta)
  // 4: Se calcula la MEDIA (sub 0: suma y división vertical limpia, sub 1: marca x̄ en recta)
  // 5: Comparativa completa con las 3 marcas simultáneas
  const [animStep, setAnimStep] = useState<number>(0)
  const [subStep, setSubStep] = useState<number>(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Datos sueltos efectivos (con o sin dato atípico para ver sensibilidad)
  const currentSueltos = useMemo(() => {
    if (!outlierActive) return sueltosData
    const copy = [...sueltosData]
    copy[copy.length - 1] = 75
    return copy
  }, [sueltosData, outlierActive])

  // Datos sueltos ordenados de menor a mayor
  const sortedSueltos = useMemo(() => {
    return [...currentSueltos].sort((a, b) => a - b)
  }, [currentSueltos])

  // Objetos de datos con id único para animación de reordenamiento FLIP
  const sueltosItems = useMemo(() => {
    return currentSueltos.map((val, idx) => ({
      id: idx,
      val
    }))
  }, [currentSueltos])

  const sortedItems = useMemo(() => {
    return [...sueltosItems].sort((a, b) => a.val - b.val)
  }, [sueltosItems])

  // Estado que controla si las fichas de Mediana están en orden ascendente (con animación dinámica)
  const [medianaSorted, setMedianaSorted] = useState<boolean>(false)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const prevPositions = useRef<Map<number, number>>(new Map())

  // Capturar coordenadas horizontales de las fichas antes de ordenar
  const captureCardPositions = useCallback(() => {
    cardRefs.current.forEach((el, id) => {
      if (el) {
        prevPositions.current.set(id, el.getBoundingClientRect().left)
      }
    })
  }, [])

  // Animar el deslizamiento físico de cada ficha hacia su nueva posición (FLIP Animation pausada y suave)
  useLayoutEffect(() => {
    if (prevPositions.current.size === 0) return

    cardRefs.current.forEach((el, id) => {
      const prevLeft = prevPositions.current.get(id)
      if (el && prevLeft !== undefined) {
        const newLeft = el.getBoundingClientRect().left
        const deltaX = prevLeft - newLeft
        if (deltaX !== 0) {
          // Desplazamiento inicial con ligera elevación vertical para no colisionar visualmente
          const deltaY = id % 2 === 0 ? -6 : 6
          el.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px)`
          el.style.transition = 'none'
          void el.offsetHeight
          el.style.transition = 'transform 1300ms cubic-bezier(0.25, 1, 0.5, 1)'
          el.style.transform = 'translateX(0) translateY(0)'
        }
      }
    })
    prevPositions.current.clear()
  }, [medianaSorted])

  // Disparar la animación de ordenamiento al entrar en el Paso 3, Sub-paso 1
  useEffect(() => {
    if (animStep === 3) {
      if (subStep === 0) {
        setMedianaSorted(false)
      } else if (subStep >= 1) {
        if (!medianaSorted) {
          captureCardPositions()
          setMedianaSorted(true)
        }
      }
    } else {
      setMedianaSorted(false)
    }
  }, [animStep, subStep, captureCardPositions, medianaSorted])

  // Cálculos Nivel 1 (Datos Sueltos)
  const sueltosStats = useMemo(() => {
    const n = currentSueltos.length
    const sum = currentSueltos.reduce((acc, v) => acc + v, 0)
    const media = sum / n

    // Mediana
    const midIdx = Math.floor(n / 2)
    const isOdd = n % 2 !== 0
    const mediana = isOdd ? sortedSueltos[midIdx] : (sortedSueltos[midIdx - 1] + sortedSueltos[midIdx]) / 2

    // Frecuencias para la moda
    const freqMap: Record<number, number> = {}
    currentSueltos.forEach((v) => {
      freqMap[v] = (freqMap[v] || 0) + 1
    })
    let maxF = 0
    let modaVal: number[] = []
    Object.entries(freqMap).forEach(([valStr, count]) => {
      const v = Number(valStr)
      if (count > maxF) {
        maxF = count
        modaVal = [v]
      } else if (count === maxF && maxF > 1) {
        modaVal.push(v)
      }
    })

    return {
      n,
      sum,
      media,
      mediana,
      isOdd,
      midIdx,
      modaVal: maxF > 1 ? modaVal : [],
      maxF,
      freqMap
    }
  }, [currentSueltos, sortedSueltos])

  // ─── ESTADO NIVEL 2: DATOS NO AGRUPADOS (TABLA DE FRECUENCIA) ───
  const discreteRows = useMemo<DiscreteRow[]>(() => {
    const raw = [
      { xi: 0, fi: 4 },
      { xi: 1, fi: 10 },
      { xi: 2, fi: 12 },
      { xi: 3, fi: 8 },
      { xi: 4, fi: 2 }
    ]
    let cumulative = 0
    return raw.map((r) => {
      cumulative += r.fi
      return {
        xi: r.xi,
        fi: r.fi,
        Fi: cumulative,
        xiFi: r.xi * r.fi
      }
    })
  }, [])

  const discreteStats = useMemo(() => {
    const n = discreteRows.reduce((acc, r) => acc + r.fi, 0)
    const sumXiFi = discreteRows.reduce((acc, r) => acc + r.xiFi, 0)
    const media = sumXiFi / n
    const halfN = n / 2
    const medRow = discreteRows.find((r) => r.Fi >= halfN) || discreteRows[0]
    const maxFi = Math.max(...discreteRows.map((r) => r.fi))
    const modalRow = discreteRows.find((r) => r.fi === maxFi) || discreteRows[0]

    return {
      n,
      halfN,
      sumXiFi,
      media,
      medRow,
      modalRow,
      maxFi
    }
  }, [discreteRows])

  // ─── ESTADO NIVEL 3: DATOS AGRUPADOS EN INTERVALOS ───
  const groupedRows = useMemo<GroupedRow[]>(() => {
    const rawIntervals = [
      { li: 140, ls: 146, fi: 3 },
      { li: 146, ls: 152, fi: 7 },
      { li: 152, ls: 158, fi: 12 },
      { li: 158, ls: 164, fi: 6 },
      { li: 164, ls: 170, fi: 2 }
    ]
    let cumulative = 0
    return rawIntervals.map((r, idx) => {
      cumulative += r.fi
      const xi = (r.li + r.ls) / 2
      const isLast = idx === rawIntervals.length - 1
      return {
        index: idx,
        li: r.li,
        ls: r.ls,
        label: isLast ? `[${r.li} - ${r.ls}]` : `[${r.li} - ${r.ls})`,
        xi,
        fi: r.fi,
        Fi: cumulative,
        xiFi: xi * r.fi
      }
    })
  }, [])

  const groupedStats = useMemo(() => {
    const n = groupedRows.reduce((acc, r) => acc + r.fi, 0) // 30
    const sumXiFi = groupedRows.reduce((acc, r) => acc + r.xiFi, 0)
    const media = sumXiFi / n
    const halfN = n / 2 // 15
    const A = groupedRows[0].ls - groupedRows[0].li // 6

    const medRowIdx = groupedRows.findIndex((r) => r.Fi >= halfN)
    const medRow = groupedRows[medRowIdx] || groupedRows[0]
    const FiAnt = medRowIdx > 0 ? groupedRows[medRowIdx - 1].Fi : 0
    const fiMed = medRow.fi
    const mediana = medRow.li + ((halfN - FiAnt) / fiMed) * A

    const modalRowIdx = groupedRows.reduce((maxIdx, r, i, arr) => (r.fi > arr[maxIdx].fi ? i : maxIdx), 0)
    const modalRow = groupedRows[modalRowIdx]
    const fiAntMod = modalRowIdx > 0 ? groupedRows[modalRowIdx - 1].fi : 0
    const fiSigMod = modalRowIdx < groupedRows.length - 1 ? groupedRows[modalRowIdx + 1].fi : 0
    const d1 = modalRow.fi - fiAntMod // 12 - 7 = 5
    const d2 = modalRow.fi - fiSigMod // 12 - 6 = 6
    const moda = modalRow.li + (d1 / (d1 + d2)) * A

    return {
      n,
      halfN,
      A,
      sumXiFi,
      media,
      medRow,
      FiAnt,
      fiMed,
      mediana,
      modalRow,
      d1,
      d2,
      moda
    }
  }, [groupedRows])

  // Limpiar temporizador automático al desmontar
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
    }
  }, [])

  // Número máximo de sub-pasos internos para cada paso pedagógico
  const getMaxSubStep = (step: number) => {
    switch (step) {
      case 1:
        // 0: Trazo de recta vacía, 1: Colocación de puntos de datos
        return 1
      case 2:
        // 0: Resaltado de repetidos en fichas, 1: Colocación de marca Mo en recta
        return 1
      case 3:
        // 0: Muestra desordenada, 1: Deslizamiento suave a orden ascendente
        // 2..5: Cancelación sucesiva de 4 pares de extremos, 6: Marca Me colocada en la recta
        return 6
      case 4:
        // 0: Planteamiento y fórmula, 1: Suma progresiva de valores (Σx = 130)
        // 2: Fracción vertical (130/9), 3: Cálculo del cociente (14.44), 4: Marca x̄ en recta
        return 4
      case 5:
        // Comparativa final simultánea
        return 0
      default:
        return 0
    }
  }

  // Tiempos progresivos y pausados para cada micro-paso pedagógico (en milisegundos)
  const getSubStepDuration = (step: number, sub: number) => {
    if (step === 1) {
      return sub === 0 ? 1800 : 2200
    }
    if (step === 2) {
      // 0: Resalta repetidos (2.8s), 1: Coloca marca Mo en recta (2.6s)
      return sub === 0 ? 2800 : 2600
    }
    if (step === 3) {
      // 0: Observa fichas desordenadas antes de ordenar (2.2s)
      // 1: Deslizamiento visible y pausado de fichas (1.4s) + apreciación de orden (1.8s) = 3.2s
      // 2..4: Cancela extremos par por par (1.6s cada par)
      // 5: Cancela último par y revela centro aislado 14 (1.8s)
      // 6: Coloca marca Me en la recta (2.6s)
      if (sub === 0) return 2200
      if (sub === 1) return 3200
      if (sub === 2) return 1600
      if (sub === 3) return 1600
      if (sub === 4) return 1600
      if (sub === 5) return 1800
      return 2600
    }
    if (step === 4) {
      // 0: Planteamiento y fórmula (2.2s)
      // 1: Suma progresiva de todos los datos Σx = 130 (2.6s)
      // 2: Formación de fracción vertical 130/9 (2.2s)
      // 3: Cálculo del cociente y promedio x̄ = 14.44 (2.4s)
      // 4: Coloca marca x̄ en la recta con línea de equilibrio (2.6s)
      if (sub === 0) return 2200
      if (sub === 1) return 2600
      if (sub === 2) return 2200
      if (sub === 3) return 2400
      return 2600
    }
    return 3000
  }

  // Control de reproducción automática secuencial y progresiva
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
      return
    }

    if (animStep === 0) {
      setAnimStep(1)
      setSubStep(0)
      return
    }

    if (animStep >= 5) {
      setIsAutoPlaying(false)
      return
    }

    const duration = getSubStepDuration(animStep, subStep)
    autoPlayTimerRef.current = setTimeout(() => {
      const maxSub = getMaxSubStep(animStep)
      if (subStep < maxSub) {
        setSubStep((prev) => prev + 1)
      } else {
        const nextStep = animStep + 1
        if (nextStep >= 5) {
          setAnimStep(5)
          setSubStep(0)
          setIsAutoPlaying(false)
        } else {
          setAnimStep(nextStep)
          setSubStep(0)
        }
      }
    }, duration)

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
    }
  }, [isAutoPlaying, animStep, subStep])

  // Iniciar demostración automática completa desde el inicio
  const handleStartAutoPlay = useCallback(() => {
    setAnimStep(1)
    setSubStep(0)
    setIsAutoPlaying(true)
  }, [])

  // Alternar pausa / reanudar
  const handleToggleAutoPlay = useCallback(() => {
    if (animStep === 0 || animStep >= 5) {
      setAnimStep(1)
      setSubStep(0)
      setIsAutoPlaying(true)
    } else {
      setIsAutoPlaying((prev) => !prev)
    }
  }, [animStep])

  const handleNextStep = useCallback(() => {
    setIsAutoPlaying(false)
    const maxSub = getMaxSubStep(animStep)
    if (subStep < maxSub) {
      setSubStep((prev) => prev + 1)
    } else if (animStep < 5) {
      setAnimStep((prev) => prev + 1)
      setSubStep(0)
    }
  }, [animStep, subStep])

  const handlePrevStep = useCallback(() => {
    setIsAutoPlaying(false)
    if (subStep > 0) {
      setSubStep((prev) => prev - 1)
    } else if (animStep > 1) {
      const prevStep = animStep - 1
      setAnimStep(prevStep)
      setSubStep(getMaxSubStep(prevStep))
    } else {
      setAnimStep(0)
      setSubStep(0)
    }
  }, [animStep, subStep])

  const handleResetAnimation = useCallback(() => {
    setAnimStep(0)
    setSubStep(0)
    setIsAutoPlaying(false)
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current)
  }, [])

  const handleSelectStep = useCallback((step: number) => {
    setIsAutoPlaying(false)
    setAnimStep(step)
    setSubStep(0)
  }, [])

  // Generar nueva muestra aleatoria para datos sueltos
  const handleNewRandomSample = useCallback(() => {
    const sample: number[] = []
    for (let i = 0; i < 9; i++) {
      sample.push(10 + Math.floor(Math.random() * 11))
    }
    // Asegurar repetición para tener moda definida
    sample[1] = sample[0]
    sample[4] = sample[0]
    setSueltosData(sample)
    setOutlierActive(false)
    setAnimStep(0)
    setSubStep(0)
    setIsAutoPlaying(false)
  }, [])

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-900'}`}>
      {/* ── 1. CABECERA (36-44px) ── */}
      <header className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-200 shadow-xs'}`}>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1 px-2 py-0.5 lg:py-1 rounded-md text-[11px] lg:text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white/90' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
            <span>Volver</span>
          </button>
          <span className="text-xs lg:text-sm">🎯</span>
          <h1 className="text-[12px] lg:text-[14px] font-black tracking-tight truncate">
            Medidas de Tendencia Central: Media, Mediana y Moda
          </h1>
        </div>

        {/* Botón de Ayuda Pedagógica */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className={`p-1 lg:p-1.5 rounded-lg border cursor-pointer transition-all ${
              isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Guía pedagógica de las medidas de tendencia central"
          >
            <HelpCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* ── 2. BARRAS DE CONTROL EN DOS FILAS (Nivel Curricular + Controles Didácticos) ── */}
      <div className={`shrink-0 flex flex-col border-b text-[10px] lg:text-xs ${
        isDark ? 'bg-[#0d1424] border-white/5 divide-y divide-white/5' : 'bg-slate-50 border-slate-200 divide-y divide-slate-200'
      }`}>
        {/* Fila 1: Selector de Formato de Datos + Opciones de Muestra */}
        <div className="flex items-center justify-between px-2 lg:px-4 py-1 overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-bold text-slate-400 text-[9px] lg:text-[10px] uppercase tracking-wide shrink-0">
              Formato:
            </span>
            <div className="flex items-center gap-1">
              {[
                { id: 'sueltos', label: '1. Datos Sueltos', icon: '🎲' },
                { id: 'no_agrupados', label: '2. No Agrupados', icon: '📋' },
                { id: 'agrupados', label: '3. Intervalos (Agrupados)', icon: '📊' }
              ].map((lvl) => {
                const isActive = stageLevel === lvl.id
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setStageLevel(lvl.id as StageLevel)
                      setAnimStep(0)
                      setSubStep(0)
                      setIsAutoPlaying(false)
                    }}
                    className={`px-2 py-0.5 rounded-md font-bold text-[9.5px] lg:text-[10.5px] whitespace-nowrap cursor-pointer transition-all ${
                      isActive
                        ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    <span className="mr-1">{lvl.icon}</span>
                    <span>{lvl.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Opciones de muestra en Datos Sueltos */}
          {stageLevel === 'sueltos' && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setOutlierActive(!outlierActive)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer transition-all whitespace-nowrap ${
                  outlierActive
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                title="Añadir un dato atípico (75) para comparar sensibilidad de Media vs Mediana"
              >
                <span>{outlierActive ? '⚠️ Atípico: ON (75)' : '+ Probar Dato Atípico'}</span>
              </button>
              <button
                type="button"
                onClick={handleNewRandomSample}
                className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] font-bold cursor-pointer transition-all whitespace-nowrap"
                title="Nueva muestra aleatoria de 9 números"
              >
                🎲 Nueva muestra
              </button>
            </div>
          )}
        </div>

        {/* Fila 2: Selector de Pasos y Botones de Reproducción */}
        <div className="flex items-center justify-between px-2 lg:px-4 py-1 overflow-x-auto no-scrollbar gap-2">
          {stageLevel === 'sueltos' ? (
            <>
              {/* Guía de pasos secuenciales en Datos Sueltos */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wide mr-0.5">
                  Pasos:
                </span>
                {[
                  { step: 1, label: '1. Recta' },
                  { step: 2, label: '2. Moda' },
                  { step: 3, label: '3. Mediana' },
                  { step: 4, label: '4. Media' },
                  { step: 5, label: '5. Resumen' }
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleSelectStep(s.step)}
                    className={`px-1.5 py-0.5 rounded text-[8.5px] lg:text-[9.5px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      animStep === s.step
                        ? 'bg-emerald-600 text-white font-black shadow-xs scale-105'
                        : animStep > s.step
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Botones de Control de la Demostración */}
              <div className="flex items-center gap-1 shrink-0">
                {animStep === 0 && (
                  <button
                    type="button"
                    onClick={handleStartAutoPlay}
                    className="px-2.5 py-0.5 rounded-md font-black text-[9.5px] lg:text-[10.5px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse whitespace-nowrap"
                  >
                    <Play className="h-2.5 w-2.5 fill-white" />
                    <span>▶ Iniciar Demostración</span>
                  </button>
                )}

                {animStep > 0 && animStep < 5 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] lg:text-[10px] flex items-center gap-0.5 cursor-pointer transition-all whitespace-nowrap"
                      title="Paso anterior manual"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Ant</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleAutoPlay}
                      className={`px-2 py-0.5 rounded-md font-bold text-[9px] lg:text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        isAutoPlaying
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold'
                      }`}
                      title={isAutoPlaying ? 'Pausar reproducción automática' : 'Continuar reproducción automática'}
                    >
                      {isAutoPlaying ? <Pause className="h-2.5 w-2.5 fill-current" /> : <Play className="h-2.5 w-2.5 fill-current" />}
                      <span>{isAutoPlaying ? 'Pausar' : 'Continuar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] lg:text-[10px] flex items-center gap-0.5 cursor-pointer transition-all whitespace-nowrap"
                      title="Avanzar manualmente"
                    >
                      <span>Sig</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    {isAutoPlaying && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 animate-pulse whitespace-nowrap">
                        ⚡ Paso {animStep}.{subStep + 1}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleResetAnimation}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-all"
                      title="Reiniciar a datos desordenados (Paso 0)"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </>
                )}

                {animStep === 5 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleStartAutoPlay}
                      className="px-2.5 py-0.5 rounded-md font-black text-[9.5px] lg:text-[10.5px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm bg-purple-600 hover:bg-purple-500 text-white whitespace-nowrap"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>↺ Repetir</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAnimation}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-all"
                      title="Reiniciar al inicio"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Selector de Medida para Niveles 2 y 3 (Tablas) */
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-400 text-[9px] lg:text-[10px] uppercase tracking-wide shrink-0">
                Medida a Explorar:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { id: 'media', label: 'Media Aritmética (x̄)' },
                  { id: 'mediana', label: 'Mediana (Me)' },
                  { id: 'moda', label: 'Moda (Mo)' }
                ].map((m) => {
                  const isSelected = activeMeasure === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMeasure(m.id as MeasureType)}
                      className={`px-2.5 py-0.5 rounded-md font-bold text-[9.5px] lg:text-[10.5px] whitespace-nowrap cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. ÁREA DE TRABAJO PRINCIPAL (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch p-1 sm:p-2 lg:p-3 gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">
        {/* ══════════════════════════════════════════════════════════════════
            NIVEL 1: DATOS SUELTOS (PROCESO DINÁMICO SECUENCIAL)
        ══════════════════════════════════════════════════════════════════ */}
        {stageLevel === 'sueltos' && (
          <>
            {/* Panel Izquierdo: Fichas de datos y operaciones verticales paso a paso */}
            <div className={`w-full md:w-[48%] lg:w-[46%] shrink-0 flex flex-col justify-between p-2 lg:p-2.5 rounded-xl border overflow-y-auto no-scrollbar ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              {/* Encabezado del Paso Actual */}
              <div className="shrink-0 mb-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs lg:text-[13px] text-sky-400">
                    Datos Sueltos (Muestra N = {sueltosStats.n})
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                    {animStep === 0 && 'Paso 0: Esperando inicio'}
                    {animStep === 1 && `Paso 1: Recta (${subStep === 0 ? 'Escala 10 a 21' : 'Puntos ubicados'})`}
                    {animStep === 2 && `Paso 2: Moda (${subStep === 0 ? 'Buscando repetidos' : 'Marca Mo en recta'})`}
                    {animStep === 3 && `Paso 3: Mediana (${subStep === 0 ? 'Muestra inicial' : subStep === 1 ? 'Ordenando' : subStep < 5 ? `Extremos ${subStep - 1}/4` : subStep === 5 ? 'Centro aislado' : 'Marca Me en recta'})`}
                    {animStep === 4 && `Paso 4: Media (${subStep === 0 ? 'Fórmula' : subStep === 1 ? 'Suma Σx' : subStep === 2 ? 'Fracción' : subStep === 3 ? 'Cociente' : 'Marca x̄ en recta'})`}
                    {animStep === 5 && 'Paso 5: Resumen completo'}
                  </span>
                </div>
                <p className="text-[8.5px] sm:text-[9px] text-slate-400 leading-tight mt-0.5">
                  {animStep === 0 && 'Primero observamos los datos sueltos desordenados. Presiona "Iniciar" para comenzar la demostración.'}
                  {animStep === 1 && (subStep === 0 ? 'Trazamos la recta numérica con una escala exacta del 10 al 21.' : 'Ubicamos cada uno de los 9 datos en la recta; los valores repetidos se apilan verticalmente.')}
                  {animStep === 2 && (subStep === 0 ? 'Identificamos en las fichas cuál es el dato que más se repite (mayor frecuencia).' : '¡El 12 tiene la mayor frecuencia! Agregamos la marca de la Moda (Mo = 12) a la recta.')}
                  {animStep === 3 && (
                    subStep === 0
                      ? 'Observamos la muestra desordenada antes de buscar el valor central.'
                      : subStep === 1
                      ? 'Ordenamos los 9 datos de menor a mayor (orden ascendente).'
                      : subStep < 5
                      ? `Desactivamos el par de extremos número ${subStep - 1} de 4 (de afuera hacia adentro).`
                      : subStep === 5
                      ? '¡Todos los extremos cancelados! El número 14 queda aislado en la posición central (5°).'
                      : 'Agregamos la marca de la Mediana (Me = 14) en la recta numérica.'
                  )}
                  {animStep === 4 && (
                    subStep === 0
                      ? 'Planteamos la fórmula de la Media: suma de todos los datos dividida entre N = 9.'
                      : subStep === 1
                      ? 'Sumamos paso a paso todos los valores individuales de la muestra: Σx = 130.'
                      : subStep === 2
                      ? 'Reemplazamos en la fracción vertical matemática: x̄ = 130 / 9.'
                      : subStep === 3
                      ? 'Resolvemos el cociente de la división: 130 ÷ 9 = 14.44.'
                      : 'Agregamos la marca de la Media (x̄ = 14.4) como punto de equilibrio en la recta.'
                  )}
                  {animStep === 5 && '¡Demostración completada! Observa las tres medidas ubicadas simultáneamente en la recta.'}
                </p>
              </div>

              {/* Fichas Interactivas de Datos */}
              <div className={`p-2 rounded-xl border flex flex-col gap-2 my-1 ${
                isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                {animStep === 3 ? (
                  /* ─── En Paso 3: Fichas de Mediana con Animación Dinámica de Reordenamiento FLIP ─── */
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <span className="text-amber-400 font-extrabold">
                          {medianaSorted ? '✓ Datos ordenados de menor a mayor:' : '1. Muestra inicial de datos:'}
                        </span>
                      </span>
                      <span className="font-mono text-amber-400 font-bold">
                        {!medianaSorted
                          ? 'Muestra desordenada'
                          : subStep === 1
                          ? '¡Orden ascendente listo!'
                          : subStep < 5
                          ? `Cancelando extremos (${subStep - 1}/4)`
                          : subStep === 5
                          ? '¡Centro aislado: 14 (5° término)!'
                          : '¡Mediana Me = 14 ubicada!'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap py-1">
                      {(medianaSorted ? sortedItems : sueltosItems).map((item, idx) => {
                        const isMid = medianaSorted && idx === sueltosStats.midIdx
                        const pairNum = idx < sueltosStats.midIdx ? idx + 1 : sueltosStats.n - idx
                        const isCancelled = medianaSorted && !isMid && (subStep - 1) >= pairNum
                        const isJustCancelling = medianaSorted && !isMid && (subStep - 1) === pairNum
                        const isCenterIsolated = isMid && subStep >= 5

                        return (
                          <div
                            key={`mediana-card-${item.id}`}
                            ref={(el) => {
                              if (el) cardRefs.current.set(item.id, el)
                              else cardRefs.current.delete(item.id)
                            }}
                            className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center shadow-xs transition-all duration-300 ${
                              isCenterIsolated
                                ? 'bg-amber-500 text-slate-950 font-black ring-4 ring-amber-300 scale-110 shadow-lg'
                                : isCancelled
                                ? 'opacity-25 line-through bg-slate-800 text-slate-500 border border-slate-700 scale-95'
                                : isDark
                                ? 'bg-slate-800/90 border border-white/10 text-white'
                                : 'bg-white border border-slate-300 text-slate-800'
                            } ${isJustCancelling ? 'ring-2 ring-rose-500/80 animate-pulse' : ''}`}
                          >
                            {item.val}
                            {isCenterIsolated && (
                              <span className="absolute -bottom-3 text-[7px] font-black text-amber-400 uppercase tracking-tighter">
                                Centro
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* ─── En Pasos 0, 1, 2, 4, 5: Muestra de datos original ─── */
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
                      <span>{animStep === 4 ? 'Datos de la muestra para calcular la Media:' : '1. Datos desordenados (muestra original):'}</span>
                      {animStep === 2 && (
                        <span className="font-mono text-purple-400 font-bold animate-pulse">
                          {subStep === 0 ? '¡Se iluminan los repetidos! (Moda)' : '✓ Moda = 12 identificada'}
                        </span>
                      )}
                      {animStep === 4 && (
                        <span className="font-mono text-sky-400 font-bold">
                          Σx = {sueltosStats.sum}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap py-0.5">
                      {currentSueltos.map((val, idx) => {
                        const isModalItem = sueltosStats.modaVal.includes(val)
                        const isOutlier = val >= 70
                        const highlightModa = animStep === 2 && isModalItem
                        const highlightMedia = animStep === 4

                        return (
                          <div
                            key={`orig-${idx}`}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center transition-all duration-300 shadow-xs ${
                              isOutlier
                                ? 'bg-rose-500/25 border-2 border-rose-500 text-rose-300 scale-105 animate-pulse'
                                : highlightModa
                                ? 'bg-purple-600 text-white ring-4 ring-purple-400 scale-110 shadow-md font-black'
                                : highlightMedia
                                ? 'bg-sky-500/25 border-2 border-sky-400 text-sky-300 scale-105'
                                : isDark
                                ? 'bg-slate-800 border border-white/10 text-white'
                                : 'bg-white border border-slate-300 text-slate-800'
                            }`}
                          >
                            {val}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fórmulas y Operaciones Matemáticas Verticales */}
              <div className={`p-2 rounded-xl border text-xs leading-relaxed shrink-0 ${
                isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                {animStep === 0 && (
                  <div className="text-center py-2 space-y-1">
                    <p className="font-bold text-slate-300 text-xs">
                      ¿Cómo se calculan la Moda, la Mediana y la Media?
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Haz clic en <strong>"▶ Iniciar Demostración Automática"</strong> arriba para ver la construcción animada paso a paso.
                    </p>
                  </div>
                )}

                {animStep === 1 && (
                  <div className="space-y-1">
                    <span className="font-bold text-sky-400 text-[11px] block">
                      Paso 1: Trazado de la Recta Numérica
                    </span>
                    <p className="text-[10.5px] text-slate-300">
                      {subStep === 0
                        ? 'Trazamos la recta numérica con una escala exacta del 10 al 21 (cada número entero señalizado).'
                        : `Hemos ubicado los ${sueltosStats.n} datos como puntos en la recta. Cuando un número se repite (como el 12), los puntos se apilan verticalmente formando una torre.`}
                    </p>
                  </div>
                )}

                {animStep === 2 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-purple-400 font-bold text-[11px]">
                      <span>Paso 2: Identificar la Moda (Mo)</span>
                      <span className="font-mono text-[10px] bg-purple-500/20 px-1.5 py-0.2 rounded">
                        {subStep === 0 ? 'Buscando repeticiones...' : '¡Marca colocada en la recta!'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10.5px] space-y-1">
                      <div>
                        • Contamos cuántas veces se repite cada dato en la muestra.<br />
                        • El número <strong>{sueltosStats.modaVal.join(', ')}</strong> se repite <strong>{sueltosStats.maxF} veces</strong> (es la torre más alta en la recta).
                      </div>
                      <div className="pt-1 border-t border-purple-500/20 font-black text-sm text-purple-300 flex items-center justify-between">
                        <span>Moda:</span>
                        <span className="font-mono">Mo = <strong>{sueltosStats.modaVal.join(', ')}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {animStep === 3 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                      <span>Paso 3: Determinar la Mediana (Me)</span>
                      <span className="font-mono text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded">
                        {subStep === 0
                          ? 'Muestra desordenada'
                          : subStep === 1
                          ? 'Orden ascendente listo'
                          : subStep < 5
                          ? `Cancelando extremos (${subStep - 1}/4)`
                          : subStep === 5
                          ? 'Centro aislado'
                          : '¡Marca en la recta!'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                      <div className="text-[10px] text-slate-300 leading-tight">
                        Cancelamos los extremos de afuera hacia adentro hasta aislar el <strong>término central</strong>:
                      </div>

                      {/* Posición central: fórmula teórica y cálculo con datos bien separados y nítidos */}
                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                        <span className="font-sans font-bold text-amber-300 block text-[8.5px] uppercase tracking-wide text-center">
                          Cálculo de la posición del dato central:
                        </span>
                        <div className="flex items-center justify-center gap-2 flex-wrap text-[10.5px] font-mono">
                          <MathFraction
                            prefix={<span className="text-slate-300 font-bold">Posición =</span>}
                            numerator="N + 1"
                            denominator="2"
                          />
                          <span className="text-amber-400 font-bold">=</span>
                          <MathFraction
                            numerator={`${sueltosStats.n} + 1 = 10`}
                            denominator="2"
                            suffix={<span className="text-amber-300 font-black ml-1">= 5° término</span>}
                          />
                        </div>
                      </div>

                      {/* Resultado claro y conectado */}
                      <div className="pt-1 border-t border-amber-500/20 font-black text-xs sm:text-sm text-amber-400 flex items-center justify-between">
                        <span className="text-slate-300 font-bold text-[10.5px]">
                          {subStep >= 5 ? '5° término en orden ascendente:' : 'Valor del término central:'}
                        </span>
                        <span className="font-mono text-sm">Me = <strong>{sueltosStats.mediana}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {animStep === 4 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sky-400 font-bold text-[11px]">
                      <span>Paso 4: Calcular la Media Aritmética (x̄)</span>
                      <span className="font-mono text-[10px] bg-sky-500/20 px-1.5 py-0.2 rounded">
                        {subStep === 0 && '1/4: Planteamiento'}
                        {subStep === 1 && '2/4: Suma de datos'}
                        {subStep === 2 && '3/4: Fracción vertical'}
                        {subStep === 3 && '4/4: Cociente y resultado'}
                        {subStep >= 4 && '✓ ¡Marca en la recta!'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 space-y-1.5">
                      {/* Sub-paso 0: Fórmula y planteamiento */}
                      <div className={`p-1.5 rounded-lg border transition-all duration-300 ${
                        subStep === 0 ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400' : 'bg-sky-500/10 border-sky-500/20'
                      }`}>
                        <span className="font-sans font-bold text-slate-300 block mb-0.5 text-[8.5px] uppercase tracking-wide">
                          Fórmula pedagógica (Promedio equitativo):
                        </span>
                        <div className="flex items-center justify-center font-mono text-[10.5px] text-sky-200">
                          <MathFraction
                            prefix={<span className="text-sky-300 font-bold mr-1">x̄ =</span>}
                            numerator={<span className="text-amber-300 font-bold">Σx (Suma de todos los datos)</span>}
                            denominator={<span className="text-sky-300 font-bold">N (Cantidad total de datos)</span>}
                          />
                        </div>
                      </div>

                      {/* Sub-paso 1: Suma de todos los datos */}
                      <div className={`p-1.5 rounded-lg border transition-all duration-300 ${
                        subStep === 1 ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400' : 'bg-sky-500/10 border-sky-500/20'
                      }`}>
                        <span className="font-sans font-bold text-slate-300 block mb-0.5 text-[8.5px] uppercase tracking-wide">
                          1. Suma progresiva de las {sueltosStats.n} notas (Σx):
                        </span>
                        <div className="font-mono text-[9.5px] text-sky-200 font-bold flex items-center justify-center flex-wrap gap-1">
                          <span>{currentSueltos.join(' + ')}</span>
                          <span className={`font-black px-1.5 py-0.2 rounded ${subStep >= 1 ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400' : 'text-slate-400'}`}>
                            = {sueltosStats.sum}
                          </span>
                        </div>
                      </div>

                      {/* Sub-paso 2 y 3: Reemplazo en fracción y cálculo del cociente */}
                      {subStep >= 2 && (
                        <div className={`p-1.5 rounded-lg border transition-all duration-300 animate-in fade-in ${
                          subStep >= 2 ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400' : 'bg-sky-500/10 border-sky-500/20'
                        }`}>
                          <span className="font-sans font-bold text-slate-300 block mb-0.5 text-[8.5px] uppercase tracking-wide text-center">
                            2. Sustitución y cálculo del cociente:
                          </span>
                          <div className="flex items-center justify-center py-0.5">
                            <MathFraction
                              prefix={<span className="text-sky-300 font-black text-xs mr-1">x̄ =</span>}
                              numerator={<span className="text-amber-300 font-black text-sm">{sueltosStats.sum}</span>}
                              denominator={<span className="text-sky-300 font-black text-sm">{sueltosStats.n}</span>}
                              suffix={
                                subStep >= 3 ? (
                                  <span className="text-emerald-400 font-black text-sm ml-2 animate-in zoom-in-95">
                                    = {sueltosStats.media.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs ml-2 italic">
                                    (dividiendo...)
                                  </span>
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Conclusión del resultado */}
                      {subStep >= 3 && (
                        <div className="pt-1 border-t border-sky-500/20 font-black text-xs sm:text-sm text-sky-400 flex items-center justify-between">
                          <span>Media Aritmética final:</span>
                          <span className="font-mono text-sm text-emerald-400">
                            x̄ = <strong>{sueltosStats.media.toFixed(2)}</strong> (≈ {sueltosStats.media.toFixed(1)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {animStep === 5 && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-400 text-[11px] block">
                      Paso 5: Resumen de las 3 Medidas
                    </span>
                    <div className="grid grid-cols-3 gap-1 py-1 text-center font-mono">
                      <div className="p-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <span className="text-[8px] text-slate-400 block font-sans">1. Moda</span>
                        <span className="font-black text-xs">Mo = {sueltosStats.modaVal.join(', ')}</span>
                      </div>
                      <div className="p-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span className="text-[8px] text-slate-400 block font-sans">2. Mediana</span>
                        <span className="font-black text-xs">Me = {sueltosStats.mediana}</span>
                      </div>
                      <div className="p-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        <span className="text-[8px] text-slate-400 block font-sans">3. Media</span>
                        <span className="font-black text-xs">x̄ = {sueltosStats.media.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Derecho: Recta Numérica Dinámica (se traza y va recibiendo las marcas) */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between p-2 lg:p-3 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="shrink-0 flex items-center justify-between pb-1 border-b border-white/10">
                <span className="font-extrabold text-xs lg:text-[13px]">
                  📊 Recta Numérica Dinámica
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {animStep === 0 && 'Esperando trazar recta...'}
                  {animStep === 1 && subStep === 0 && '1. Trazando eje y escala (10 a 21)'}
                  {animStep === 1 && subStep >= 1 && '1. Datos ubicados en la recta (con apilamiento)'}
                  {animStep === 2 && subStep === 0 && '2. Identificando repeticiones'}
                  {animStep === 2 && subStep >= 1 && '2. ¡Agregada marca de Moda (Mo)!'}
                  {animStep === 3 && subStep < 5 && `3. Buscando centro (${subStep <= 1 ? 'ordenando' : `${subStep - 1}/4 extremos`})`}
                  {animStep === 3 && subStep === 5 && '3. ¡Centro aislado: 14!'}
                  {animStep === 3 && subStep >= 6 && '3. ¡Agregada marca de Mediana (Me)!'}
                  {animStep === 4 && subStep < 4 && `4. Calculando Media (${subStep + 1}/4 pasos)`}
                  {animStep === 4 && subStep >= 4 && '4. ¡Agregada marca de Media (x̄)!'}
                  {animStep >= 5 && 'Completado: Mo, Me y Media (x̄)'}
                </span>
              </div>

              {/* Contenedor de la Recta Numérica SVG */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-2 relative">
                {animStep === 0 ? (
                  /* Estado Inicial: Recta vacía esperando inicio */
                  <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Play className="h-6 w-6 ml-0.5 animate-pulse" />
                    </div>
                    <p className="font-bold text-xs text-slate-300">
                      La recta numérica se trazará al iniciar
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-xs">
                      Al hacer clic en "Iniciar", se trazará el eje con escala del 10 al 21 y los puntos apilados, luego aparecerá la <strong>Moda</strong>, después la <strong>Mediana</strong> y al final la <strong>Media</strong>.
                    </p>
                  </div>
                ) : (
                  /* SVG con Trazado y Aparición Progresiva de Marcas */
                  (() => {
                    const width = 500
                    const height = 215
                    const padX = 36
                    const axisY = 175
                    const minAxis = 10
                    const maxAxis = outlierActive ? 80 : 21
                    const scaleX = (val: number) => padX + ((val - minAxis) / (maxAxis - minAxis)) * (width - padX * 2)

                    const showDots = (animStep === 1 && subStep >= 1) || animStep > 1
                    const showMoMarker = (animStep === 2 && subStep >= 1) || animStep > 2
                    const showMeMarker = (animStep === 3 && subStep >= 6) || animStep > 3
                    const showMediaMarker = (animStep === 4 && subStep >= 4) || animStep > 4

                    const ticks = outlierActive
                      ? [10, 20, 30, 40, 50, 60, 70, 80]
                      : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

                    const dotCounts: Record<number, number> = {}

                    return (
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none animate-in fade-in duration-300">
                        <defs>
                          <filter id="badge-shadow" x="-15%" y="-15%" width="130%" height="130%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.45" />
                          </filter>
                        </defs>

                        {/* Eje horizontal */}
                        <line
                          x1={padX - 12}
                          y1={axisY}
                          x2={width - padX + 12}
                          y2={axisY}
                          stroke={isDark ? '#64748b' : '#94a3b8'}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                        />

                        {/* Flechas en los extremos del eje */}
                        <polygon
                          points={`${padX - 14},${axisY} ${padX - 8},${axisY - 4} ${padX - 8},${axisY + 4}`}
                          fill={isDark ? '#64748b' : '#94a3b8'}
                        />
                        <polygon
                          points={`${width - padX + 14},${axisY} ${width - padX + 8},${axisY - 4} ${width - padX + 8},${axisY + 4}`}
                          fill={isDark ? '#64748b' : '#94a3b8'}
                        />

                        {/* Marcas de escala en el eje (Cada entero de 10 a 21) */}
                        {ticks.map((tick) => {
                          const tx = scaleX(tick)
                          return (
                            <g key={`tick-${tick}`}>
                              <line x1={tx} y1={axisY - 5} x2={tx} y2={axisY + 5} stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth={1.8} />
                              <text
                                x={tx}
                                y={axisY + 18}
                                textAnchor="middle"
                                className={`font-mono text-[10px] font-bold ${isDark ? 'fill-slate-300' : 'fill-slate-600'}`}
                              >
                                {tick}
                              </text>
                            </g>
                          )
                        })}

                        {/* Puntos de los datos de la muestra (Apilados verticalmente para datos repetidos) */}
                        {showDots && currentSueltos.map((v, i) => {
                          const px = scaleX(v)
                          const stackIndex = dotCounts[v] || 0
                          dotCounts[v] = stackIndex + 1
                          const py = axisY - 14 - stackIndex * 14
                          const isOutlier = v >= 70
                          const isModalPoint = sueltosStats.modaVal.includes(v)
                          const isHighlightModa = animStep === 2 && isModalPoint

                          return (
                            <g key={`dot-${i}`} className="animate-in zoom-in-50 duration-300">
                              <circle
                                cx={px}
                                cy={py}
                                r={isOutlier ? 7 : 5.5}
                                fill={
                                  isOutlier
                                    ? '#f43f5e'
                                    : isHighlightModa
                                    ? '#c084fc'
                                    : '#38bdf8'
                                }
                                fillOpacity={0.9}
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              />
                              {isHighlightModa && (
                                <circle
                                  cx={px}
                                  cy={py}
                                  r={9}
                                  fill="none"
                                  stroke="#c084fc"
                                  strokeWidth={1.5}
                                  strokeDasharray="2 2"
                                />
                              )}
                            </g>
                          )
                        })}

                        {/* 1. MARCA DE LA MODA (Nivel inferior: y = 92 a 118) */}
                        {showMoMarker && sueltosStats.modaVal.length > 0 && (() => {
                          const mx = scaleX(sueltosStats.modaVal[0])
                          const tagY = 92
                          return (
                            <g className="animate-in fade-in duration-300">
                              {/* Línea vertical conectora desde el eje */}
                              <line x1={mx} y1={axisY} x2={mx} y2={tagY + 24} stroke="#a855f7" strokeWidth={2.5} strokeDasharray="3 2" />
                              <circle cx={mx} cy={axisY} r={3.5} fill="#a855f7" stroke="#ffffff" strokeWidth={1.5} />

                              {/* Puntero triangular */}
                              <polygon points={`${mx},${tagY + 25} ${mx - 5},${tagY + 20} ${mx + 5},${tagY + 20}`} fill="#7c3aed" />

                              {/* Insignia destacada */}
                              <g filter="url(#badge-shadow)">
                                <rect x={mx - 38} y={tagY - 2} width={76} height={24} rx={6} fill="#7c3aed" stroke="#c084fc" strokeWidth={1.8} />
                                <text x={mx} y={tagY + 14} textAnchor="middle" className="font-mono text-[11px] font-black fill-white tracking-wide">
                                  Mo = {sueltosStats.modaVal[0]}
                                </text>
                              </g>
                            </g>
                          )
                        })()}

                        {/* 2. MARCA DE LA MEDIANA (Nivel intermedio: y = 48 a 74) */}
                        {showMeMarker && (() => {
                          const mx = scaleX(sueltosStats.mediana)
                          const tagY = 48
                          return (
                            <g className="animate-in fade-in duration-300">
                              {/* Línea vertical conectora desde el eje */}
                              <line x1={mx} y1={axisY} x2={mx} y2={tagY + 24} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="3 2" />
                              <circle cx={mx} cy={axisY} r={3.5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />

                              {/* Puntero triangular */}
                              <polygon points={`${mx},${tagY + 25} ${mx - 5},${tagY + 20} ${mx + 5},${tagY + 20}`} fill="#d97706" />

                              {/* Insignia destacada */}
                              <g filter="url(#badge-shadow)">
                                <rect x={mx - 38} y={tagY - 2} width={76} height={24} rx={6} fill="#d97706" stroke="#fbbf24" strokeWidth={1.8} />
                                <text x={mx} y={tagY + 14} textAnchor="middle" className="font-mono text-[11px] font-black fill-white tracking-wide">
                                  Me = {sueltosStats.mediana}
                                </text>
                              </g>
                            </g>
                          )
                        })()}

                        {/* 3. MARCA DE LA MEDIA ARITMÉTICA (Nivel superior: y = 6 a 32) */}
                        {showMediaMarker && (() => {
                          const mx = scaleX(sueltosStats.media)
                          const tagY = 6
                          return (
                            <g className="animate-in fade-in duration-300">
                              {/* Línea de equilibrio completa que atraviesa hasta el eje */}
                              <line x1={mx} y1={axisY + 8} x2={mx} y2={tagY + 24} stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4 3" />
                              <circle cx={mx} cy={axisY} r={3.5} fill="#0284c7" stroke="#ffffff" strokeWidth={1.5} />

                              {/* Puntero triangular */}
                              <polygon points={`${mx},${tagY + 25} ${mx - 5},${tagY + 20} ${mx + 5},${tagY + 20}`} fill="#0284c7" />

                              {/* Insignia destacada */}
                              <g filter="url(#badge-shadow)">
                                <rect x={mx - 40} y={tagY - 2} width={80} height={24} rx={6} fill="#0284c7" stroke="#38bdf8" strokeWidth={1.8} />
                                <text x={mx} y={tagY + 14} textAnchor="middle" className="font-mono text-[11px] font-black fill-white tracking-wide">
                                  x̄ = {sueltosStats.media.toFixed(1)}
                                </text>
                              </g>
                            </g>
                          )
                        })()}
                      </svg>
                    )
                  })()
                )}
              </div>

              {/* Caja de Interpretación Didáctica */}
              <div className={`p-2 rounded-xl border text-[9.5px] sm:text-[10px] leading-tight space-y-1 ${
                outlierActive
                  ? isDark ? 'bg-rose-500/10 border-rose-500/25 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
                  : isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-1 font-bold text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  <span>Lección pedagógica:</span>
                </div>
                {outlierActive ? (
                  <p>
                    <strong>¡Efecto del dato atípico (75)!</strong> La <strong>Media</strong> se disparó a <strong>{sueltosStats.media.toFixed(1)}</strong> por el valor extremo, mientras que la <strong>Mediana ({sueltosStats.mediana})</strong> permaneció casi inalterada en el centro de los datos. Por eso, ante valores atípicos, se usa la <strong>Mediana</strong>.
                  </p>
                ) : (
                  <p>
                    {animStep === 0 && 'Al presionar Iniciar, verás cómo se traza la recta, se resalta la Moda, se eliminan los extremos para la Mediana y se divide para la Media.'}
                    {animStep === 1 && 'La recta representa la escala continua de valores posibles para las notas.'}
                    {animStep === 2 && 'La Moda señala la cúspide o valor donde hay mayor densidad de datos repetidos.'}
                    {animStep === 3 && 'La Mediana marca el 50% exacto: 4 notas están a su izquierda y 4 notas a su derecha.'}
                    {animStep >= 4 && 'La Media representa el punto de equilibrio físico de todos los datos en la recta.'}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            NIVEL 2: TABLA DE DATOS NO AGRUPADOS (DISCRETOS)
        ══════════════════════════════════════════════════════════════════ */}
        {stageLevel === 'no_agrupados' && (
          <>
            {/* Panel Izquierdo: Tabla de Frecuencias con columnas xi, fi, Fi, xi·fi */}
            <div className={`w-full md:w-[48%] lg:w-[46%] shrink-0 flex flex-col justify-between p-2 lg:p-3 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="shrink-0 mb-1">
                <span className={`font-extrabold text-xs lg:text-[13px] block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  Tabla de Frecuencia: Número de Hermanos
                </span>
                <p className={`text-[8.5px] sm:text-[9px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                  Encuesta a N = {discreteStats.n} estudiantes sobre cantidad de hermanos.
                </p>
              </div>

              {/* Tabla de Frecuencia con bordes en todas las celdas */}
              <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar rounded-lg border my-1 ${
                isDark ? 'border-slate-700' : 'border-slate-300 shadow-xs'
              }`}>
                <table className={`w-full text-[9px] sm:text-[10px] border-collapse font-mono border ${
                  isDark ? 'border-slate-700' : 'border-slate-300'
                }`}>
                  <thead>
                    <tr className={isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-slate-100 text-slate-900'}>
                      <th className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-900'}`}>
                        Hermanos (xi)
                      </th>
                      <th className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-300 text-sky-800'}`}>
                        fi
                      </th>
                      <th className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-amber-400' : 'border-slate-300 text-amber-800'}`}>
                        Fi (Acum.)
                      </th>
                      <th className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                        xi · fi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discreteRows.map((r) => {
                      const isModal = r.fi === discreteStats.maxFi
                      const isMed = r.xi === discreteStats.medRow.xi
                      const isHighlightModa = activeMeasure === 'moda' && isModal
                      const isHighlightMed = activeMeasure === 'mediana' && isMed
                      const isHighlightMedia = activeMeasure === 'media'

                      return (
                        <tr
                          key={`disc-${r.xi}`}
                          className={`transition-colors ${
                            isHighlightModa
                              ? isDark ? 'bg-purple-900/40 text-purple-200 font-bold' : 'bg-purple-100 text-purple-950 font-black'
                              : isHighlightMed
                              ? isDark ? 'bg-amber-900/40 text-amber-200 font-bold' : 'bg-amber-100 text-amber-950 font-black'
                              : isHighlightMedia
                              ? isDark ? 'bg-sky-950/20' : 'bg-sky-50/70'
                              : isDark ? 'text-slate-200 hover:bg-slate-800/40' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <td className={`py-1 px-1.5 text-center font-black border ${isDark ? 'border-slate-700/80 text-slate-200' : 'border-slate-300 text-slate-900'}`}>
                            {r.xi}
                          </td>
                          <td className={`py-1 px-1.5 text-center font-bold border ${isDark ? 'border-slate-700/80 text-sky-300' : 'border-slate-300 text-sky-800'}`}>
                            {r.fi}
                          </td>
                          <td className={`py-1 px-1.5 text-center font-bold border ${isDark ? 'border-slate-700/80 text-amber-300' : 'border-slate-300 text-amber-800'}`}>
                            {r.Fi}
                          </td>
                          <td className={`py-1 px-1.5 text-center font-bold border ${isDark ? 'border-slate-700/80 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {r.xiFi}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`font-black ${isDark ? 'bg-slate-900/90 text-white' : 'bg-slate-200 text-slate-950'}`}>
                      <td className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        TOTAL (Σ)
                      </td>
                      <td className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-300 text-sky-900'}`}>
                        N = {discreteStats.n}
                      </td>
                      <td className={`py-1.5 px-2 text-center border ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}>
                        —
                      </td>
                      <td className={`py-1.5 px-2 text-center font-black border ${isDark ? 'border-slate-700 text-emerald-400' : 'border-slate-300 text-emerald-900'}`}>
                        Σ = {discreteStats.sumXiFi}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Guía de lectura con alto contraste */}
              <div className={`p-2 rounded-lg border text-[9px] leading-tight shrink-0 ${
                isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}>
                <span className={`font-bold block mb-0.5 ${isDark ? 'text-sky-400' : 'text-sky-800'}`}>
                  Lectura de la tabla:
                </span>
                <div>
                  • <strong>xi · fi</strong>: cada valor multiplicado por su frecuencia.<br />
                  • <strong>Fi (Acumulada)</strong>: suma progresiva de alumnos para ubicar el centro (Mediana).
                </div>
              </div>
            </div>

            {/* Panel Derecho: Cálculos matemáticos con Fracciones Verticales */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between p-2 lg:p-3 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`shrink-0 pb-1 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <span className={`font-extrabold text-xs lg:text-[13px] ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  {activeMeasure === 'media' && '📐 Cálculo de la Media en Tabla No Agrupada'}
                  {activeMeasure === 'mediana' && '🎯 Cálculo de la Mediana en Tabla No Agrupada'}
                  {activeMeasure === 'moda' && '👑 Identificación de la Moda en Tabla No Agrupada'}
                </span>
              </div>

              {/* Operaciones Matemáticas Verticales con alto contraste */}
              <div className="flex-1 flex flex-col justify-center space-y-2 py-1">
                {activeMeasure === 'media' && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center gap-1.5 ${
                      isDark ? 'bg-sky-500/10 border-sky-500/20 text-slate-200' : 'bg-sky-50/80 border-sky-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        Fórmula de la Media Ponderada:
                      </div>
                      <div className={isDark ? 'text-sky-300' : 'text-sky-950 font-black'}>
                        <MathFraction
                          prefix={<span className={isDark ? 'text-sky-300 font-bold' : 'text-sky-900 font-bold'}>x̄ =</span>}
                          numerator="Σ (xi · fi)"
                          denominator="N"
                        />
                      </div>
                      <div className={`pt-1.5 border-t w-full flex items-center justify-center ${
                        isDark ? 'border-sky-500/20 text-slate-200' : 'border-sky-200 text-slate-950 font-black'
                      }`}>
                        <MathFraction
                          prefix={<span className={isDark ? 'text-sky-300 font-bold' : 'text-sky-900 font-bold'}>x̄ =</span>}
                          numerator={<span className={isDark ? 'text-amber-300 font-black' : 'text-amber-800 font-black'}>{discreteStats.sumXiFi}</span>}
                          denominator={<span className={isDark ? 'text-sky-300 font-black' : 'text-sky-800 font-black'}>{discreteStats.n}</span>}
                          suffix={<span className={`font-black ml-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>= {discreteStats.media.toFixed(2)} hermanos</span>}
                        />
                      </div>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      💡 <strong>Interpretación:</strong> Cada estudiante encuestado tiene en promedio <strong>{discreteStats.media.toFixed(2)} hermanos</strong>.
                    </p>
                  </div>
                )}

                {activeMeasure === 'mediana' && (
                  <div className="space-y-2">
                    <div className={`p-2.5 rounded-lg border space-y-2 text-center flex flex-col items-center ${
                      isDark ? 'bg-amber-500/10 border-amber-500/20 text-slate-200' : 'bg-amber-50/80 border-amber-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className={`text-[10.5px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        1. Calculamos la mitad del total de datos:
                      </div>
                      <div className={isDark ? 'text-amber-300' : 'text-amber-950 font-black'}>
                        <MathFraction
                          prefix={<span className={isDark ? 'text-amber-300 font-bold' : 'text-amber-900 font-bold'}>Posición =</span>}
                          numerator={`N = ${discreteStats.n}`}
                          denominator="2"
                          suffix={<span className={`font-black ml-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>= {discreteStats.halfN}</span>}
                        />
                      </div>
                      <div className={`text-[10px] text-left w-full pt-1.5 border-t ${
                        isDark ? 'text-slate-300 border-amber-500/20' : 'text-slate-800 border-amber-200'
                      }`}>
                        2. Buscamos en la columna <strong>Fi</strong> la primera fila con <code className={`px-1 py-0.2 rounded font-mono font-bold ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900'}`}>Fi ≥ {discreteStats.halfN}</code>.<br />
                        3. En <strong>xi = 2</strong>, el acumulado es <strong>Fi = 26</strong> (que es ≥ 18).
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center font-mono ${
                      isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black'
                    }`}>
                      <span className="font-bold text-sm">
                        Mediana (Me) = <strong>{discreteStats.medRow.xi} hermanos</strong>
                      </span>
                    </div>
                  </div>
                )}

                {activeMeasure === 'moda' && (
                  <div className="space-y-2">
                    <div className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${
                      isDark ? 'bg-purple-500/10 border-purple-500/20 text-slate-200' : 'bg-purple-50/80 border-purple-200 text-slate-900 shadow-xs'
                    }`}>
                      <div>1. Revisamos la columna de frecuencias simples (<strong>fi</strong>).</div>
                      <div>2. La frecuencia más alta es <strong className={isDark ? 'text-sky-300' : 'text-sky-800'}>fi = {discreteStats.maxFi}</strong>.</div>
                      <div>3. Corresponde al valor de la variable: <strong className={isDark ? 'text-purple-300' : 'text-purple-800'}>xi = {discreteStats.modalRow.xi} hermanos</strong>.</div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center font-mono ${
                      isDark ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-300 text-purple-900 font-black'
                    }`}>
                      <span className="font-bold text-sm">
                        Moda (Mo) = <strong>{discreteStats.modalRow.xi} hermanos</strong> (se repite {discreteStats.maxFi} veces)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de las 3 medidas */}
              <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-lg border shrink-0 text-center font-mono text-[9px] ${
                isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-300 bg-slate-50'
              }`}>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-sky-100 text-sky-950 border-sky-300'
                }`}>
                  x̄ = {discreteStats.media.toFixed(2)}
                </div>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  Me = {discreteStats.medRow.xi}
                </div>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-950 border-purple-300'
                }`}>
                  Mo = {discreteStats.modalRow.xi}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            NIVEL 3: TABLA DE DATOS AGRUPADOS (EN INTERVALOS)
        ══════════════════════════════════════════════════════════════════ */}
        {stageLevel === 'agrupados' && (
          <>
            {/* Panel Izquierdo: Tabla con Intervalos, Xi, fi, Fi y Xi·fi */}
            <div className={`w-full md:w-[50%] lg:w-[48%] shrink-0 flex flex-col justify-between p-2 lg:p-3 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="shrink-0 mb-1">
                <span className={`font-extrabold text-xs lg:text-[13px] block ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  Datos Agrupados: Estatura en cm (Amplitud A = {groupedStats.A})
                </span>
                <p className={`text-[8.5px] sm:text-[9px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                  Muestra de N = {groupedStats.n} estudiantes agrupados en 5 clases continuas.
                </p>
              </div>

              {/* Tabla de Frecuencias Agrupadas con bordes completos */}
              <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar rounded-lg border my-1 ${
                isDark ? 'border-slate-700' : 'border-slate-300 shadow-xs'
              }`}>
                <table className={`w-full text-[8.5px] sm:text-[9.5px] border-collapse font-mono border ${
                  isDark ? 'border-slate-700' : 'border-slate-300'
                }`}>
                  <thead>
                    <tr className={isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-slate-100 text-slate-900'}>
                      <th className={`py-1.5 px-1.5 text-left font-black border ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-900'}`}>
                        Intervalo
                      </th>
                      <th className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-amber-400' : 'border-slate-300 text-amber-800'}`} title="Marca de clase Xi = (Li + Ls)/2">
                        Xi
                      </th>
                      <th className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-300 text-sky-800'}`}>
                        fi
                      </th>
                      <th className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-purple-400' : 'border-slate-300 text-purple-800'}`}>
                        Fi
                      </th>
                      <th className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                        Xi · fi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map((r) => {
                      const isModal = r.index === groupedStats.modalRow.index
                      const isMed = r.index === groupedStats.medRow.index
                      const isHighlightModa = activeMeasure === 'moda' && isModal
                      const isHighlightMed = activeMeasure === 'mediana' && isMed

                      // Marcadores contextuales para Mediana
                      const isFiAntMed = activeMeasure === 'mediana' && r.index === groupedStats.medRow.index - 1

                      // Marcadores contextuales para Moda
                      const isFiAntMod = activeMeasure === 'moda' && r.index === groupedStats.modalRow.index - 1
                      const isFiSigMod = activeMeasure === 'moda' && r.index === groupedStats.modalRow.index + 1

                      return (
                        <tr
                          key={`grp-${r.index}`}
                          className={`transition-colors ${
                            isHighlightModa
                              ? isDark ? 'bg-purple-900/40 text-purple-200 font-bold' : 'bg-purple-100 text-purple-950 font-black'
                              : isHighlightMed
                              ? isDark ? 'bg-amber-900/40 text-amber-200 font-bold' : 'bg-amber-100 text-amber-950 font-black'
                              : isFiAntMed
                              ? isDark ? 'bg-amber-950/20' : 'bg-amber-50/50'
                              : isFiAntMod || isFiSigMod
                              ? isDark ? 'bg-purple-950/20' : 'bg-purple-50/50'
                              : isDark ? 'text-slate-200 hover:bg-slate-800/40' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <td className={`py-1 px-1.5 font-bold border ${isDark ? 'border-slate-700/80 text-slate-200' : 'border-slate-300 text-slate-900'}`}>
                            <div className="flex items-center justify-between gap-1">
                              <span>{r.label}</span>
                              {isHighlightMed && (
                                <span className="text-[7px] font-black px-1 py-0.2 rounded bg-amber-500 text-slate-950 uppercase">
                                  Li = {r.li}
                                </span>
                              )}
                              {isHighlightModa && (
                                <span className="text-[7px] font-black px-1 py-0.2 rounded bg-purple-600 text-white uppercase">
                                  Li = {r.li}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`py-1 px-1 text-center font-bold border ${isDark ? 'border-slate-700/80 text-amber-300' : 'border-slate-300 text-amber-800'}`}>
                            {r.xi}
                          </td>
                          <td className={`py-1 px-1 text-center font-bold border ${isDark ? 'border-slate-700/80 text-sky-300' : 'border-slate-300 text-sky-800'}`}>
                            <div className="flex flex-col items-center">
                              <span>{r.fi}</span>
                              {isHighlightMed && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 leading-tight">
                                  fi
                                </span>
                              )}
                              {isHighlightModa && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 leading-tight">
                                  Mayor fi
                                </span>
                              )}
                              {isFiAntMod && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 leading-tight">
                                  fi-1 = {r.fi}
                                </span>
                              )}
                              {isFiSigMod && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 leading-tight">
                                  fi+1 = {r.fi}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`py-1 px-1 text-center font-bold border ${isDark ? 'border-slate-700/80 text-purple-300' : 'border-slate-300 text-purple-800'}`}>
                            <div className="flex flex-col items-center">
                              <span>{r.Fi}</span>
                              {isFiAntMed && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 leading-tight">
                                  Fi-1 = {r.Fi}
                                </span>
                              )}
                              {isHighlightMed && (
                                <span className="text-[6.5px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 leading-tight">
                                  ≥ 15 (Me)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`py-1 px-1 text-center font-bold border ${isDark ? 'border-slate-700/80 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {r.xiFi}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`font-black ${isDark ? 'bg-slate-900/90 text-white' : 'bg-slate-200 text-slate-950'}`}>
                      <td className={`py-1.5 px-1.5 font-black border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        TOTAL (Σ)
                      </td>
                      <td className={`py-1.5 px-1 text-center border ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}>
                        —
                      </td>
                      <td className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-300 text-sky-900'}`}>
                        N = {groupedStats.n}
                      </td>
                      <td className={`py-1.5 px-1 text-center border ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}>
                        —
                      </td>
                      <td className={`py-1.5 px-1 text-center font-black border ${isDark ? 'border-slate-700 text-emerald-400' : 'border-slate-300 text-emerald-900'}`}>
                        Σ = {groupedStats.sumXiFi}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Parámetros clave con alto contraste */}
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border shrink-0 text-center font-mono text-[8px] sm:text-[8.5px] ${
                isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>Amplitud (A):</span>
                  <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>{groupedStats.A} cm</span>
                </div>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>N ÷ 2 (Mediana):</span>
                  <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{groupedStats.halfN}</span>
                </div>
                <div>
                  <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>Mayor fi (Moda):</span>
                  <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>{groupedStats.modalRow.fi}</span>
                </div>
              </div>
            </div>

            {/* Panel Derecho: Fórmulas Matemáticas de Datos Agrupados con Desarrollo Paso a Paso */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between p-2 lg:p-3 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`shrink-0 pb-1 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <span className={`font-extrabold text-xs lg:text-[13px] ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                  {activeMeasure === 'media' && '📐 Media con Marcas de Clase (Xi)'}
                  {activeMeasure === 'mediana' && '🎯 Mediana Agrupada: Deducción Paso a Paso'}
                  {activeMeasure === 'moda' && '👑 Moda Agrupada: Deducción de Diferencias d1 y d2'}
                </span>
              </div>

              {/* Fórmulas detalladas verticales con alto contraste y deducción paso a paso */}
              <div className="flex-1 flex flex-col justify-start space-y-2 py-1 overflow-y-auto no-scrollbar">
                {activeMeasure === 'media' && (
                  <div className="space-y-2 font-mono text-center">
                    <div className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 ${
                      isDark ? 'bg-sky-500/10 border-sky-500/20 text-slate-200' : 'bg-sky-50/80 border-sky-200 text-slate-900 shadow-xs'
                    }`}>
                      <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        Fórmula de Media con Marcas de Clase:
                      </div>
                      <div className={isDark ? 'text-sky-300' : 'text-sky-950 font-black'}>
                        <MathFraction
                          prefix={<span className={isDark ? 'text-sky-300 font-bold' : 'text-sky-900 font-bold'}>x̄ =</span>}
                          numerator="Σ (Xi · fi)"
                          denominator="N"
                        />
                      </div>
                      <div className={`pt-1.5 border-t w-full flex items-center justify-center ${
                        isDark ? 'border-sky-500/20 text-slate-200' : 'border-sky-200 text-slate-950 font-black'
                      }`}>
                        <MathFraction
                          prefix={<span className={isDark ? 'text-sky-300 font-bold' : 'text-sky-900 font-bold'}>x̄ =</span>}
                          numerator={<span className={isDark ? 'text-amber-300 font-black' : 'text-amber-800 font-black'}>{groupedStats.sumXiFi}</span>}
                          denominator={<span className={isDark ? 'text-sky-300 font-black' : 'text-sky-800 font-black'}>{groupedStats.n}</span>}
                          suffix={<span className={`font-black ml-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>= {groupedStats.media.toFixed(2)} cm</span>}
                        />
                      </div>
                    </div>
                    <p className={`text-[9.5px] font-sans text-left leading-tight ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                      En datos agrupados la <strong>marca de clase (Xi)</strong> representa el centro del intervalo. La estatura media del grupo es de <strong>{groupedStats.media.toFixed(2)} cm</strong>.
                    </p>
                  </div>
                )}

                {activeMeasure === 'mediana' && (
                  <div className="space-y-1.5 font-mono text-[9px] sm:text-[10px]">
                    {/* Paso 1: Posición central N/2 */}
                    <div className={`p-2 rounded-lg border space-y-1 shrink-0 ${
                      isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-300 shadow-xs'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide ${
                          isDark ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-200 text-amber-950'
                        }`}>
                          Paso 1: Posición Central
                        </span>
                        <span className={`text-[10.5px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          ¿Dónde se ubica la Mediana?
                        </span>
                      </div>
                      <div className="flex items-center justify-around flex-wrap gap-2 py-0.5 border-t border-amber-500/20 pt-1">
                        <MathFraction
                          prefix={<span className={`font-bold text-xs ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>Posición =</span>}
                          numerator={<span className={`font-black text-xs ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>N = 30</span>}
                          denominator={<span className={`font-black text-xs ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>2</span>}
                          suffix={<span className={`font-black text-sm ml-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>= 15</span>}
                        />
                        <div className={`text-[9.5px] font-sans leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`}>
                          Buscamos en la columna <strong>Fi</strong> el primer valor <strong>≥ 15</strong>:<br />
                          ➔ Fila 3: <strong>[152 - 158)</strong> con <strong className="text-amber-600 dark:text-amber-400">Fi = 22</strong> (Clase Mediana)
                        </div>
                      </div>
                    </div>

                    {/* Paso 2: Elementos de la fórmula */}
                    <div className={`p-1.5 rounded-lg border grid grid-cols-4 gap-1 text-center shrink-0 ${
                      isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-300 shadow-xs'
                    }`}>
                      <div className={`p-0.5 rounded border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                        <span className="block text-[7.5px] font-sans text-slate-500 font-bold">Li</span>
                        <span className={`font-black text-[11px] ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>152</span>
                        <span className="block text-[6.5px] text-slate-400 font-sans">Límite inf.</span>
                      </div>
                      <div className={`p-0.5 rounded border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                        <span className="block text-[7.5px] font-sans text-slate-500 font-bold">Fi-1</span>
                        <span className={`font-black text-[11px] ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>10</span>
                        <span className="block text-[6.5px] text-slate-400 font-sans">Fila arriba</span>
                      </div>
                      <div className={`p-0.5 rounded border ${isDark ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-200'}`}>
                        <span className="block text-[7.5px] font-sans text-slate-500 font-bold">fi</span>
                        <span className={`font-black text-[11px] ${isDark ? 'text-sky-400' : 'text-sky-800'}`}>12</span>
                        <span className="block text-[6.5px] text-slate-400 font-sans">De la clase</span>
                      </div>
                      <div className={`p-0.5 rounded border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="block text-[7.5px] font-sans text-slate-500 font-bold">A</span>
                        <span className={`font-black text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>6</span>
                        <span className="block text-[6.5px] text-slate-400 font-sans">158 - 152</span>
                      </div>
                    </div>

                    {/* Paso 3: Desarrollo matemático de la fórmula */}
                    <div className={`p-2 rounded-lg border space-y-1.5 shrink-0 ${
                      isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50/70 border-amber-300'
                    }`}>
                      {/* 1. Fórmula Teórica con Fracción Vertical Matemática */}
                      <div className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center gap-0.5 ${
                        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-amber-200 shadow-xs'
                      }`}>
                        <span className="text-[9px] font-sans font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                          Fórmula Teórica de la Mediana Agrupada:
                        </span>
                        <div className="flex items-center justify-center font-bold text-xs sm:text-sm py-0.5">
                          <span className="mr-1">Me = Li +</span>
                          <span className="text-sm sm:text-base font-light mr-0.5">[</span>
                          <MathFraction
                            numerator={
                              <div className="inline-flex items-center gap-1">
                                <MathFraction numerator="N" denominator="2" />
                                <span>− Fi-1</span>
                              </div>
                            }
                            denominator="fi"
                          />
                          <span className="text-sm sm:text-base font-light ml-0.5">]</span>
                          <span className="ml-1">· A</span>
                        </div>
                      </div>

                      {/* 2. Reemplazo numérico con Fracción Vertical Matemática */}
                      <div className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center gap-0.5 ${
                        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-amber-200 shadow-xs'
                      }`}>
                        <span className="text-[9px] font-sans font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Sustitución de Valores Numéricos:
                        </span>
                        <div className={`flex items-center justify-center font-bold text-xs sm:text-sm py-0.5 ${
                          isDark ? 'text-amber-300' : 'text-amber-950 font-black'
                        }`}>
                          <span className="mr-1">Me = 152 +</span>
                          <span className="text-sm sm:text-base font-light mr-0.5">[</span>
                          <MathFraction
                            numerator={<span className={isDark ? 'text-amber-300 font-black' : 'text-amber-800 font-black'}>15 − 10</span>}
                            denominator={<span className={isDark ? 'text-sky-300 font-black' : 'text-sky-800 font-black'}>12</span>}
                          />
                          <span className="text-sm sm:text-base font-light ml-0.5">]</span>
                          <span className="ml-1">· <strong className={isDark ? 'text-emerald-400' : 'text-emerald-800'}>6</strong></span>
                        </div>
                      </div>

                      {/* 3. Desarrollo aritmético detallado */}
                      <div className={`p-1.5 rounded-md text-[8.5px] sm:text-[9px] font-mono space-y-0.5 border ${
                        isDark ? 'bg-slate-900/70 border-white/10 text-slate-300' : 'bg-white border-amber-200 text-slate-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-slate-500">a) Resta numerador:</span>
                          <span>15 − 10 = <strong>5</strong> ➔ Fracción: <strong>5 / 12</strong></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-slate-500">b) Multiplicar por amplitud (A = 6):</span>
                          <span>(5 · 6) ÷ 12 = 30 ÷ 12 = <strong>2.50</strong></span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700/20 pt-0.5">
                          <span className="font-sans font-bold text-slate-500">c) Sumar a Li = 152:</span>
                          <span>152 + 2.50 = <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">154.50 cm</strong></span>
                        </div>
                      </div>

                      {/* Resultado Final */}
                      <div className={`p-1 rounded-md border text-center ${
                        isDark ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
                      }`}>
                        <span className="text-[11px] font-black font-mono">Mediana (Me) = 154.50 cm</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeMeasure === 'moda' && (
                  <div className="space-y-1.5 font-mono text-[9px] sm:text-[10px]">
                    {/* Paso 1: Identificación de la clase modal */}
                    <div className={`p-2 rounded-lg border space-y-1 shrink-0 ${
                      isDark ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-300 shadow-xs'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide ${
                          isDark ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-200 text-purple-950'
                        }`}>
                          Paso 1: Clase Modal
                        </span>
                        <span className={`text-[10.5px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          ¿Dónde se ubica la mayor concentración?
                        </span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2 py-0.5 border-t border-purple-500/20 pt-1 text-[10px]">
                        <div>
                          Frecuencias fi: 3, 7, <strong className="text-purple-600 dark:text-purple-400 underline font-black text-xs">12</strong>, 6, 2
                        </div>
                        <span className={`text-[9px] font-sans ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`}>
                          Mayor fi = <strong>12</strong> ➔ Clase Modal: <strong>[152 - 158)</strong> (Li = 152, A = 6)
                        </span>
                      </div>
                    </div>

                    {/* Paso 2: Deducción de d1 y d2 */}
                    <div className={`p-1.5 rounded-lg border grid grid-cols-2 gap-1.5 text-[8.5px] shrink-0 ${
                      isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-300 shadow-xs'
                    }`}>
                      <div className={`p-1 rounded border ${
                        isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'
                      }`}>
                        <span className={`font-sans font-bold block ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>
                          d1 = fi actual − fi anterior (arriba)
                        </span>
                        <div className="text-center font-black text-[11px] py-0.2">
                          d1 = 12 − 7 = <span className="text-purple-600 dark:text-purple-400">5</span>
                        </div>
                        <span className="block text-[6.5px] font-sans text-slate-500 text-center">
                          (fi fila de arriba: 7)
                        </span>
                      </div>

                      <div className={`p-1 rounded border ${
                        isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'
                      }`}>
                        <span className={`font-sans font-bold block ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>
                          d2 = fi actual − fi posterior (abajo)
                        </span>
                        <div className="text-center font-black text-[11px] py-0.2">
                          d2 = 12 − 6 = <span className="text-purple-600 dark:text-purple-400">6</span>
                        </div>
                        <span className="block text-[6.5px] font-sans text-slate-500 text-center">
                          (fi fila de abajo: 6)
                        </span>
                      </div>
                    </div>

                    {/* Paso 3: Desarrollo matemático de la fórmula */}
                    <div className={`p-2 rounded-lg border space-y-1.5 shrink-0 ${
                      isDark ? 'bg-purple-500/10 border-purple-500/25' : 'bg-purple-50/70 border-purple-300'
                    }`}>
                      {/* 1. Fórmula Teórica con Fracción Vertical Matemática */}
                      <div className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center gap-0.5 ${
                        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-purple-200 shadow-xs'
                      }`}>
                        <span className="text-[9px] font-sans font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                          Fórmula Teórica de la Moda Agrupada:
                        </span>
                        <div className="flex items-center justify-center font-bold text-xs sm:text-sm py-0.5">
                          <span className="mr-1">Mo = Li +</span>
                          <span className="text-sm sm:text-base font-light mr-0.5">[</span>
                          <MathFraction
                            numerator="d1"
                            denominator="d1 + d2"
                          />
                          <span className="text-sm sm:text-base font-light ml-0.5">]</span>
                          <span className="ml-1">· A</span>
                        </div>
                      </div>

                      {/* 2. Reemplazo numérico con Fracción Vertical Matemática */}
                      <div className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center gap-0.5 ${
                        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-purple-200 shadow-xs'
                      }`}>
                        <span className="text-[9px] font-sans font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          Sustitución de Valores Numéricos:
                        </span>
                        <div className={`flex items-center justify-center font-bold text-xs sm:text-sm py-0.5 ${
                          isDark ? 'text-purple-300' : 'text-purple-950 font-black'
                        }`}>
                          <span className="mr-1">Mo = 152 +</span>
                          <span className="text-sm sm:text-base font-light mr-0.5">[</span>
                          <MathFraction
                            numerator={<span className={isDark ? 'text-purple-300 font-black' : 'text-purple-800 font-black'}>5</span>}
                            denominator={<span className={isDark ? 'text-purple-300 font-black' : 'text-purple-800 font-black'}>5 + 6</span>}
                          />
                          <span className="text-sm sm:text-base font-light ml-0.5">]</span>
                          <span className="ml-1">· <strong className={isDark ? 'text-emerald-400' : 'text-emerald-800'}>6</strong></span>
                        </div>
                      </div>

                      {/* 3. Desarrollo aritmético detallado */}
                      <div className={`p-1.5 rounded-md text-[8.5px] sm:text-[9px] font-mono space-y-0.5 border ${
                        isDark ? 'bg-slate-900/70 border-white/10 text-slate-300' : 'bg-white border-purple-200 text-slate-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-slate-500">a) Suma denominador:</span>
                          <span>5 + 6 = <strong>11</strong> ➔ Fracción: <strong>5 / 11</strong></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-slate-500">b) Multiplicar por amplitud (A = 6):</span>
                          <span>(5 · 6) ÷ 11 = 30 ÷ 11 ≈ <strong>2.73</strong></span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-700/20 pt-0.5">
                          <span className="font-sans font-bold text-slate-500">c) Sumar a Li = 152:</span>
                          <span>152 + 2.73 = <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">154.73 cm</strong></span>
                        </div>
                      </div>

                      {/* Resultado Final */}
                      <div className={`p-1 rounded-md border text-center ${
                        isDark ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-purple-100 border-purple-400 text-purple-950 font-black'
                      }`}>
                        <span className="text-[11px] font-black font-mono">Moda (Mo) = 154.73 cm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen Comparativo de las 3 medidas agrupadas */}
              <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-lg border shrink-0 text-center font-mono text-[9px] ${
                isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-300 bg-slate-50'
              }`}>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-sky-100 text-sky-950 border-sky-300'
                }`}>
                  x̄ = {groupedStats.media.toFixed(2)} cm
                </div>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  Me = {groupedStats.mediana.toFixed(2)} cm
                </div>
                <div className={`p-1 rounded font-black border ${
                  isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-950 border-purple-300'
                }`}>
                  Mo = {groupedStats.moda.toFixed(2)} cm
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL DE AYUDA PEDAGÓGICA (ModalHelp) ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Medidas de Tendencia Central: Guía Curricular"
        buttonColor="bg-purple-600 hover:bg-purple-500"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <strong className="text-sky-300 block mb-0.5">1. Media Aritmética (x̄):</strong>
            <p>
              Punto de equilibrio o reparto equitativo. Se suman todos los valores y se divide entre la cantidad total (N). <em>Es muy sensible a valores atípicos</em>.
            </p>
          </div>

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <strong className="text-amber-300 block mb-0.5">2. Mediana (Me):</strong>
            <p>
              Valor central que divide los datos ordenados en dos mitades (50% y 50%). <em>Es robusta y no se altera por datos atípicos</em>.
            </p>
          </div>

          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <strong className="text-purple-300 block mb-0.5">3. Moda (Mo):</strong>
            <p>
              Dato o intervalo con mayor frecuencia absoluta (el que más veces se repite).
            </p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
