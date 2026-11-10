import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  BookOpen,
  X,
  Shuffle
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type SituationId = 'estaturas' | 'mochilas' | 'edades' | 'lectura'
export type ActiveTab = 'moda' | 'media' | 'mediana' | 'comparativa'

export interface PersonItem {
  id: string
  name: string
  val: number
  displayVal: string
  gender: 'boy' | 'girl'
  hairColor: string
  skinColor: string
  shirtColor: string
  bottomColor: string
  hairStyle: 'short-mateo' | 'short-carlos' | 'short-diego' | 'bob-sofia' | 'bob-valeria' | 'long-elena' | 'pigtails-lucia'
}

export interface SituationData {
  id: SituationId
  title: string
  badge: string
  unit: string
  unitShort: string
  minVal: number
  maxVal: number
  stepY: number
  description: string
  people: PersonItem[]
}

// ─── Componente de Fracción Matemática Vertical ──────────────────────────────
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

// ─── Catálogo de Situaciones Didácticas ────────────────────────────────────────
const SITUATIONS: SituationData[] = [
  {
    id: 'estaturas',
    title: 'Estaturas en el Aula',
    badge: '📏 Estaturas (m)',
    unit: 'metros',
    unitShort: 'm',
    minVal: 1.45,
    maxVal: 1.75,
    stepY: 0.05,
    description: 'Estaturas de 7 estudiantes en metros (idéntico a la infografía didáctica).',
    people: [
      { id: 'p1', name: 'Mateo', val: 1.60, displayVal: '1,60 m', gender: 'boy', skinColor: '#fed7aa', hairColor: '#1e293b', hairStyle: 'short-mateo', shirtColor: '#22c55e', bottomColor: '#1d4ed8' },
      { id: 'p2', name: 'Sofía', val: 1.55, displayVal: '1,55 m', gender: 'girl', skinColor: '#fed7aa', hairColor: '#854d0e', hairStyle: 'bob-sofia', shirtColor: '#eab308', bottomColor: '#2563eb' },
      { id: 'p3', name: 'Lucía', val: 1.50, displayVal: '1,50 m', gender: 'girl', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'pigtails-lucia', shirtColor: '#ec4899', bottomColor: '#db2777' },
      { id: 'p4', name: 'Carlos', val: 1.60, displayVal: '1,60 m', gender: 'boy', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'short-carlos', shirtColor: '#dc2626', bottomColor: '#334155' },
      { id: 'p5', name: 'Elena', val: 1.70, displayVal: '1,70 m', gender: 'girl', skinColor: '#fed7aa', hairColor: '#3b0764', hairStyle: 'long-elena', shirtColor: '#c084fc', bottomColor: '#7e22ce' },
      { id: 'p6', name: 'Diego', val: 1.65, displayVal: '1,65 m', gender: 'boy', skinColor: '#fed7aa', hairColor: '#78350f', hairStyle: 'short-diego', shirtColor: '#92400e', bottomColor: '#1e293b' },
      { id: 'p7', name: 'Valeria', val: 1.60, displayVal: '1,60 m', gender: 'girl', skinColor: '#fed7aa', hairColor: '#1e1b4b', hairStyle: 'bob-valeria', shirtColor: '#8b5cf6', bottomColor: '#1e1e24' }
    ]
  },
  {
    id: 'mochilas',
    title: 'Peso de Mochilas Escolares',
    badge: '🎒 Mochilas (kg)',
    unit: 'kilogramos',
    unitShort: 'kg',
    minVal: 2,
    maxVal: 8,
    stepY: 1,
    description: 'Peso en kilogramos de las mochilas de los estudiantes.',
    people: [
      { id: 'm1', name: 'Mateo', val: 5, displayVal: '5 kg', gender: 'boy', skinColor: '#fed7aa', hairColor: '#1e293b', hairStyle: 'short-mateo', shirtColor: '#22c55e', bottomColor: '#1d4ed8' },
      { id: 'm2', name: 'Sofía', val: 4, displayVal: '4 kg', gender: 'girl', skinColor: '#fed7aa', hairColor: '#854d0e', hairStyle: 'bob-sofia', shirtColor: '#eab308', bottomColor: '#2563eb' },
      { id: 'm3', name: 'Lucía', val: 3, displayVal: '3 kg', gender: 'girl', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'pigtails-lucia', shirtColor: '#ec4899', bottomColor: '#db2777' },
      { id: 'm4', name: 'Carlos', val: 5, displayVal: '5 kg', gender: 'boy', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'short-carlos', shirtColor: '#dc2626', bottomColor: '#334155' },
      { id: 'm5', name: 'Elena', val: 7, displayVal: '7 kg', gender: 'girl', skinColor: '#fed7aa', hairColor: '#3b0764', hairStyle: 'long-elena', shirtColor: '#c084fc', bottomColor: '#7e22ce' },
      { id: 'm6', name: 'Diego', val: 6, displayVal: '6 kg', gender: 'boy', skinColor: '#fed7aa', hairColor: '#78350f', hairStyle: 'short-diego', shirtColor: '#92400e', bottomColor: '#1e293b' },
      { id: 'm7', name: 'Valeria', val: 5, displayVal: '5 kg', gender: 'girl', skinColor: '#fed7aa', hairColor: '#1e1b4b', hairStyle: 'bob-valeria', shirtColor: '#8b5cf6', bottomColor: '#1e1e24' }
    ]
  },
  {
    id: 'edades',
    title: 'Edades del Grupo',
    badge: '🎂 Edades (Años)',
    unit: 'años',
    unitShort: 'a.',
    minVal: 11,
    maxVal: 17,
    stepY: 1,
    description: 'Edades de los estudiantes en años cumplidos.',
    people: [
      { id: 'e1', name: 'Mateo', val: 14, displayVal: '14 años', gender: 'boy', skinColor: '#fed7aa', hairColor: '#1e293b', hairStyle: 'short-mateo', shirtColor: '#22c55e', bottomColor: '#1d4ed8' },
      { id: 'e2', name: 'Sofía', val: 12, displayVal: '12 años', gender: 'girl', skinColor: '#fed7aa', hairColor: '#854d0e', hairStyle: 'bob-sofia', shirtColor: '#eab308', bottomColor: '#2563eb' },
      { id: 'e3', name: 'Lucía', val: 11, displayVal: '11 años', gender: 'girl', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'pigtails-lucia', shirtColor: '#ec4899', bottomColor: '#db2777' },
      { id: 'e4', name: 'Carlos', val: 14, displayVal: '14 años', gender: 'boy', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'short-carlos', shirtColor: '#dc2626', bottomColor: '#334155' },
      { id: 'e5', name: 'Elena', val: 16, displayVal: '16 años', gender: 'girl', skinColor: '#fed7aa', hairColor: '#3b0764', hairStyle: 'long-elena', shirtColor: '#c084fc', bottomColor: '#7e22ce' },
      { id: 'e6', name: 'Diego', val: 15, displayVal: '15 años', gender: 'boy', skinColor: '#fed7aa', hairColor: '#78350f', hairStyle: 'short-diego', shirtColor: '#92400e', bottomColor: '#1e293b' },
      { id: 'e7', name: 'Valeria', val: 14, displayVal: '14 años', gender: 'girl', skinColor: '#fed7aa', hairColor: '#1e1b4b', hairStyle: 'bob-valeria', shirtColor: '#8b5cf6', bottomColor: '#1e1e24' }
    ]
  },
  {
    id: 'lectura',
    title: 'Minutos de Lectura Diaria',
    badge: '⏱️ Lectura (min)',
    unit: 'minutos',
    unitShort: 'min',
    minVal: 15,
    maxVal: 50,
    stepY: 5,
    description: 'Minutos que dedica a la lectura recreativa cada integrante.',
    people: [
      { id: 'l1', name: 'Mateo', val: 30, displayVal: '30 min', gender: 'boy', skinColor: '#fed7aa', hairColor: '#1e293b', hairStyle: 'short-mateo', shirtColor: '#22c55e', bottomColor: '#1d4ed8' },
      { id: 'l2', name: 'Sofía', val: 25, displayVal: '25 min', gender: 'girl', skinColor: '#fed7aa', hairColor: '#854d0e', hairStyle: 'bob-sofia', shirtColor: '#eab308', bottomColor: '#2563eb' },
      { id: 'l3', name: 'Lucía', val: 20, displayVal: '20 min', gender: 'girl', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'pigtails-lucia', shirtColor: '#ec4899', bottomColor: '#db2777' },
      { id: 'l4', name: 'Carlos', val: 30, displayVal: '30 min', gender: 'boy', skinColor: '#fed7aa', hairColor: '#0f172a', hairStyle: 'short-carlos', shirtColor: '#dc2626', bottomColor: '#334155' },
      { id: 'l5', name: 'Elena', val: 45, displayVal: '45 min', gender: 'girl', skinColor: '#fed7aa', hairColor: '#3b0764', hairStyle: 'long-elena', shirtColor: '#c084fc', bottomColor: '#7e22ce' },
      { id: 'l6', name: 'Diego', val: 35, displayVal: '35 min', gender: 'boy', skinColor: '#fed7aa', hairColor: '#78350f', hairStyle: 'short-diego', shirtColor: '#92400e', bottomColor: '#1e293b' },
      { id: 'l7', name: 'Valeria', val: 30, displayVal: '30 min', gender: 'girl', skinColor: '#fed7aa', hairColor: '#1e1b4b', hairStyle: 'bob-valeria', shirtColor: '#8b5cf6', bottomColor: '#1e1e24' }
    ]
  }
]

// ─── Generador Aleatorio Inteligente (Garantiza Moda y Medidas Diferenciadas) ──
function generateRandomPeople(situation: SituationData, basePeople: PersonItem[]): PersonItem[] {
  const { minVal, maxVal, stepY, unitShort } = situation

  // Generar conjunto de valores posibles discretos
  const pool: number[] = []
  const steps = Math.round((maxVal - minVal) / stepY)
  for (let i = 0; i <= steps; i++) {
    const val = Number((minVal + i * stepY).toFixed(2))
    pool.push(val)
  }

  let finalVals: number[] = []

  for (let attempt = 0; attempt < 120; attempt++) {
    // 1. Frecuencia de la moda (2 o 3 repeticiones garantizadas)
    const modeFreq = Math.random() < 0.65 ? 3 : 2

    // 2. Elegir el valor modal de la piscina (no extremos para mayor estética visual)
    const innerPool = pool.length > 4 ? pool.slice(1, pool.length - 1) : pool
    const modalVal = innerPool[Math.floor(Math.random() * innerPool.length)]

    // 3. Completar los valores restantes de modo que NINGÚN otro valor alcance modeFreq
    const remainingPool = pool.filter((v) => v !== modalVal)
    const otherVals: number[] = []
    const needed = 7 - modeFreq

    const freqCount: Record<number, number> = {}
    let valid = true

    for (let j = 0; j < needed; j++) {
      const allowed = remainingPool.filter((v) => (freqCount[v] || 0) < modeFreq - 1)
      if (allowed.length === 0) {
        valid = false
        break
      }
      const pick = allowed[Math.floor(Math.random() * allowed.length)]
      freqCount[pick] = (freqCount[pick] || 0) + 1
      otherVals.push(pick)
    }

    if (!valid || otherVals.length !== needed) continue

    const candidateVals = [...Array(modeFreq).fill(modalVal), ...otherVals]

    // Verificar estadísticos
    const sorted = [...candidateVals].sort((a, b) => a - b)
    const medianVal = sorted[3]
    const sum = candidateVals.reduce((a, b) => a + b, 0)
    const meanVal = sum / 7

    // REGLA CRUCIAL DEL USUARIO: Moda, Mediana y Media NO deben ser todas iguales
    // Para que el estudiante aprenda que cada medida analiza el centro de forma diferente
    const allThreeEqual = (modalVal === medianVal && Math.abs(meanVal - modalVal) < 0.02)
    if (allThreeEqual) continue

    finalVals = candidateVals
    break
  }

  if (finalVals.length !== 7) {
    finalVals = basePeople.map((p) => p.val)
  }

  // Mezclar los valores aleatoriamente entre los 7 personajes (Fisher-Yates)
  const shuffled = [...finalVals]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return basePeople.map((p, idx) => {
    const v = shuffled[idx]
    const displayVal = stepY < 1
      ? `${v.toFixed(2).replace('.', ',')} ${unitShort}`
      : unitShort === 'a.'
      ? `${v} años`
      : `${v} ${unitShort}`
    return {
      ...p,
      val: v,
      displayVal
    }
  })
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MedidasTendenciaPersonasView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Situación seleccionada (Estaturas, Mochilas, Edades, Lectura)
  const [selectedSituation, setSelectedSituation] = useState<SituationId>('estaturas')

  // Pestaña activa (Moda, Media, Mediana, Comparativa)
  const [activeTab, setActiveTab] = useState<ActiveTab>('moda')

  // Estado de ordenamiento (false = desordenado original, true = ordenado de menor a mayor)
  const [isOrdered, setIsOrdered] = useState<boolean>(false)

  // Modal de Explicación y Fórmulas
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)

  // Modal de Ayuda Didáctica General
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // Datos personalizados/generados por cada situación
  const [customPeopleMap, setCustomPeopleMap] = useState<Record<SituationId, PersonItem[]>>(() => {
    const map: Partial<Record<SituationId, PersonItem[]>> = {}
    SITUATIONS.forEach((s) => {
      map[s.id] = s.people
    })
    return map as Record<SituationId, PersonItem[]>
  })

  // Datos actuales
  const currentSit = useMemo(() => {
    const base = SITUATIONS.find((s) => s.id === selectedSituation) || SITUATIONS[0]
    return {
      ...base,
      people: customPeopleMap[selectedSituation] || base.people
    }
  }, [selectedSituation, customPeopleMap])

  // Datos ordenados de menor a mayor (orden estable)
  const sortedPeople = useMemo(() => {
    return [...currentSit.people].sort((a, b) => a.val - b.val)
  }, [currentSit.people])

  // Cálculos estadísticos
  const stats = useMemo(() => {
    const vals = currentSit.people.map((p) => p.val)
    const n = vals.length
    const sum = vals.reduce((acc, v) => acc + v, 0)
    const media = Number((sum / n).toFixed(2))

    // Mediana
    const midIdx = Math.floor(n / 2) // En n=7, midIdx = 3 (4° término)
    const mediana = sortedPeople[midIdx].val
    const medianPersonId = sortedPeople[midIdx].id

    // Moda
    const freq: Record<number, number> = {}
    vals.forEach((v) => {
      freq[v] = (freq[v] || 0) + 1
    })
    let maxF = 0
    let modalVals: number[] = []
    Object.entries(freq).forEach(([valStr, count]) => {
      const v = Number(valStr)
      if (count > maxF) {
        maxF = count
        modalVals = [v]
      } else if (count === maxF && maxF > 1) {
        modalVals.push(v)
      }
    })

    return {
      n,
      sum,
      media,
      mediana,
      midIdx,
      medianPersonId,
      modalVals,
      maxF
    }
  }, [currentSit.people, sortedPeople])

  // Personas que pertenecen a la moda
  const modalPersons = useMemo(() => {
    return currentSit.people.filter((p) => stats.modalVals.includes(p.val))
  }, [currentSit.people, stats.modalVals])

  const modalNames = useMemo(() => {
    return modalPersons.map((p) => p.name).join(', ')
  }, [modalPersons])

  // Restablecer al cambiar de situación
  useEffect(() => {
    setIsOrdered(false)
  }, [selectedSituation])

  // Acción interactiva: Desplazarse horizontalmente de forma calmada y suave
  const handleToggleOrder = useCallback(() => {
    setIsOrdered((prev) => !prev)
  }, [])

  // Generar nuevos datos aleatorios manteniendo moda estricta y evitando que las 3 sean idénticas
  const handleGenerateRandomData = useCallback(() => {
    setCustomPeopleMap((prev) => {
      const base = SITUATIONS.find((s) => s.id === selectedSituation) || SITUATIONS[0]
      const currentList = prev[selectedSituation] || base.people
      const newPeople = generateRandomPeople(base, currentList)
      return {
        ...prev,
        [selectedSituation]: newPeople
      }
    })
    setIsOrdered(false)
  }, [selectedSituation])

  // ── CONSTANTES GEOMÉTRICAS Y ESCALA DEL PLANO CARTESIANO ──
  // ViewBox estándar del gráfico: 880 x 410 (880px de ancho para dejar espacio libre a la derecha)
  const baselineY = 345 // Línea del suelo verde donde apoyan los pies

  const getHeadY = useCallback((val: number) => {
    const fraction = (val - currentSit.minVal) / (currentSit.maxVal - currentSit.minVal)
    const clamped = Math.max(0, Math.min(1, fraction))
    const h = 130 + clamped * (270 - 130)
    return baselineY - h
  }, [baselineY, currentSit])

  // Etiquetas del margen derecho con espaciado vertical dinámico para prevenir CERO solapamientos
  const compTags = useMemo(() => {
    const yMo = getHeadY(stats.modalVals[0] ?? stats.mediana)
    const yMe = getHeadY(stats.mediana)
    const yMedia = getHeadY(stats.media)

    const items = [
      {
        id: 'moda',
        label: `👑 Moda (Mo) = ${stats.modalVals[0]?.toFixed(2)} ${currentSit.unitShort}`,
        rawY: yMo,
        color: '#ef4444',
        lineStyle: 'solid'
      },
      {
        id: 'mediana',
        label: `🎯 Mediana (Me) = ${stats.mediana.toFixed(2)} ${currentSit.unitShort}`,
        rawY: yMe,
        color: '#10b981',
        lineStyle: '8 4'
      },
      {
        id: 'media',
        label: `⚖️ Media (x̄) ≈ ${stats.media.toFixed(2)} ${currentSit.unitShort}`,
        rawY: yMedia,
        color: '#ec4899',
        lineStyle: '4 3'
      }
    ]

    // Ordenar de arriba hacia abajo en la pantalla
    items.sort((a, b) => a.rawY - b.rawY)

    const tagH = 26
    const minGap = 29
    const placed: { id: string; label: string; rawY: number; tagY: number; color: string; lineStyle: string }[] = []

    for (let i = 0; i < items.length; i++) {
      let targetY = items[i].rawY - tagH / 2
      if (i > 0 && targetY < placed[i - 1].tagY + minGap) {
        targetY = placed[i - 1].tagY + minGap
      }
      placed.push({ ...items[i], tagY: targetY })
    }

    const maxY = baselineY - tagH - 6
    if (placed[placed.length - 1].tagY > maxY) {
      const shift = placed[placed.length - 1].tagY - maxY
      for (let i = 0; i < placed.length; i++) {
        placed[i].tagY -= shift
      }
    }

    return placed
  }, [stats, currentSit.unitShort, getHeadY, baselineY])

  // Ticks y líneas guía horizontales del eje Y
  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const count = Math.round((currentSit.maxVal - currentSit.minVal) / currentSit.stepY)
    for (let i = 0; i <= count; i++) {
      ticks.push(Number((currentSit.minVal + i * currentSit.stepY).toFixed(2)))
    }
    return ticks
  }, [currentSit])

  // Coordenadas X para los 7 estudiantes (entre x=115 y x=595, dejando x=660 a x=870 libre a la derecha)
  const xSlots = [115, 195, 275, 355, 435, 515, 595]

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
          <span className="text-xs lg:text-sm shrink-0">👥</span>
          <h1 className="text-[12px] lg:text-[14px] font-black tracking-tight truncate">
            Tendencia Central con Personas
          </h1>
        </div>

        {/* Selector de Situación Didáctica y Botón de Nuevos Datos */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 ${
            isDark ? 'bg-sky-950/40 border-sky-400/30' : 'bg-sky-50 border-sky-400/50'
          }`}>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hidden sm:inline">Caso:</span>
            <select
              value={selectedSituation}
              onChange={(e) => setSelectedSituation(e.target.value as SituationId)}
              aria-label="Seleccionar caso"
              className={`h-6 text-[11px] font-bold bg-transparent cursor-pointer outline-none ${
                isDark ? 'text-sky-300' : 'text-sky-950'
              }`}
            >
              {SITUATIONS.map((sit) => (
                <option key={sit.id} value={sit.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  {sit.badge}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Generar Nuevos Datos en la Cabecera Superior */}
          <button
            type="button"
            onClick={handleGenerateRandomData}
            title="Generar nuevos datos aleatorios para este caso con Moda garantizada"
            className={`h-7 px-2 lg:px-2.5 rounded-lg text-[10.5px] lg:text-[11px] font-black cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1 border whitespace-nowrap ${
              isDark
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-400/40'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400'
            }`}
          >
            <Shuffle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>🎲 Nuevos Datos</span>
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

      {/* ── 2. BARRA DE HERRAMIENTAS Y PESTAÑAS (H-9 a H-10, SIEMPRE 1 SOLA LÍNEA) ── */}
      <div className={`shrink-0 h-9 lg:h-10 border-b px-2 lg:px-4 flex items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap ${
        isDark ? 'bg-[#0d1424] border-white/10' : 'bg-white border-slate-300'
      }`}>
        {/* Pestañas de Medidas (Compactas, sin salto de línea) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('moda'); setIsOrdered(false); }}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'moda'
                ? 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400'
                : isDark
                ? 'bg-slate-800 text-blue-300 hover:bg-slate-700 border border-white/10'
                : 'bg-slate-100 text-blue-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>👑 Moda (Mo)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('media'); setIsOrdered(false); }}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-pink-600 text-white font-black shadow-xs ring-2 ring-pink-400'
                : isDark
                ? 'bg-slate-800 text-pink-300 hover:bg-slate-700 border border-white/10'
                : 'bg-slate-100 text-pink-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>⚖️ Media (x̄)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mediana')}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'mediana'
                ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400'
                : isDark
                ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-white/10'
                : 'bg-slate-100 text-emerald-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>🎯 Mediana (Me)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparativa')}
            className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-xs font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'comparativa'
                ? 'bg-purple-600 text-white font-black shadow-xs ring-2 ring-purple-400'
                : isDark
                ? 'bg-slate-800 text-purple-300 hover:bg-slate-700 border border-white/10'
                : 'bg-slate-100 text-purple-900 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <span>📊 Las 3 Medidas</span>
          </button>
        </div>

        {/* Acciones: Botón Ordenar y Botón Modal */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón Ordenar (Mediana o Comparativa) */}
          {(activeTab === 'mediana' || activeTab === 'comparativa') && (
            <button
              type="button"
              onClick={handleToggleOrder}
              className={`px-2.5 lg:px-3 py-1 rounded-md text-[10.5px] lg:text-[11px] font-black cursor-pointer transition-all active:scale-95 shadow-sm flex items-center gap-1 whitespace-nowrap ${
                isOrdered
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400'
              }`}
            >
              <span>{isOrdered ? '↺' : '📶'}</span>
              <span>{isOrdered ? 'Desordenar' : 'Ordenar'}</span>
            </button>
          )}

          {/* Botón Principal para Ver la Información en Modal */}
          <button
            type="button"
            onClick={() => setShowDetailModal(true)}
            className={`px-2.5 py-1 rounded-md text-[10.5px] font-black cursor-pointer transition-all active:scale-95 shadow-sm flex items-center gap-1.5 border whitespace-nowrap ${
              activeTab === 'moda'
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                : activeTab === 'media'
                ? 'bg-pink-600 hover:bg-pink-500 text-white border-pink-400'
                : activeTab === 'mediana'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Ver Explicación y Fórmula</span>
          </button>
        </div>
      </div>

      {/* ── 3. ÁREA DE TRABAJO PRINCIPAL: EL ESCENARIO CARTESIANO EN PANTALLA COMPLETA ── */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between p-1.5 sm:p-2 lg:p-3 overflow-hidden">
        {/* Contenedor del Gráfico Vectorial Unificado */}
        <div className={`flex-1 min-h-0 relative flex flex-col justify-between rounded-2xl border p-2 overflow-hidden ${
          isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-300 shadow-md'
        }`}>
          {/* Mini-Barra Superior del Escenario */}
          <div className="shrink-0 flex items-center justify-between pb-1 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs lg:text-sm text-sky-500 dark:text-sky-400">
                {currentSit.title}
              </span>
              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border ${
                isOrdered
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-white/10'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {isOrdered ? '✓ Orden Ascendente (Menor a Mayor)' : '🔀 Datos Desordenados (Muestra Inicial)'}
              </span>
            </div>

            {/* Pill del Resultado Activo */}
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs border ${
                activeTab === 'moda'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/40'
                  : activeTab === 'media'
                  ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/40'
                  : activeTab === 'mediana'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/40'
              }`}>
                {activeTab === 'moda' && `Moda = ${stats.modalVals[0].toFixed(2)} ${currentSit.unitShort}`}
                {activeTab === 'media' && `Media ≈ ${stats.media.toFixed(2)} ${currentSit.unitShort}`}
                {activeTab === 'mediana' && `Mediana = ${stats.mediana.toFixed(2)} ${currentSit.unitShort}`}
                {activeTab === 'comparativa' && (
                  <span className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px]">
                    <span className="text-red-500 font-bold">Mo: {stats.modalVals[0].toFixed(2)}</span>
                    <span className="opacity-40">•</span>
                    <span className="text-emerald-500 font-bold">Me: {stats.mediana.toFixed(2)}</span>
                    <span className="opacity-40">•</span>
                    <span className="text-pink-500 font-bold">x̄: {stats.media.toFixed(2)} {currentSit.unitShort}</span>
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ── ESCENARIO CARTESIANO EN SVG UNIFICADO CON ANCHO 880 (ESPACIO DERECHO LIBRE) ── */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 880 410"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Cuadrícula milimétrica suave */}
                <pattern id="person-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                    strokeWidth="0.5"
                    strokeOpacity={isDark ? 0.4 : 0.6}
                  />
                </pattern>

                {/* Sombra suave para las personas */}
                <filter id="avatar-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Fondo del plano */}
              <rect width="880" height="410" fill="url(#person-grid)" />

              {/* Eje Vertical Y en x=60 */}
              <line x1="60" y1="30" x2="60" y2={baselineY + 10} stroke={isDark ? '#64748b' : '#64748b'} strokeWidth="2.5" />
              <polygon points="60,20 55,32 65,32" fill={isDark ? '#64748b' : '#64748b'} />
              <text x="60" y="16" textAnchor="middle" className={`text-[10.5px] font-extrabold ${isDark ? 'fill-slate-300' : 'fill-slate-700'}`}>
                Y ({currentSit.unitShort})
              </text>

              {/* Líneas horizontales de referencia del Eje Y detrás de las personas */}
              {yTicks.map((tick) => {
                const y = getHeadY(tick)
                return (
                  <g key={`guide-ytick-${tick}`}>
                    <line
                      x1="60"
                      y1={y}
                      x2="865"
                      y2={y}
                      stroke={isDark ? '#475569' : '#cbd5e1'}
                      strokeWidth={isDark ? '1.2' : '1.5'}
                      strokeDasharray="4 4"
                      strokeOpacity={isDark ? 0.75 : 0.9}
                    />
                    <line x1="53" y1={y} x2="60" y2={y} stroke={isDark ? '#94a3b8' : '#475569'} strokeWidth="2" />
                    <text
                      x="50"
                      y={y + 4}
                      textAnchor="end"
                      className={`font-mono text-[10.5px] font-black ${isDark ? 'fill-slate-200' : 'fill-slate-800'}`}
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                )
              })}

              {/* Suelo Horizontal (Eje X) */}
              <line
                x1="30"
                y1={baselineY}
                x2="870"
                y2={baselineY}
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect x="30" y={baselineY} width="840" height="18" fill="#10b981" fillOpacity="0.2" />

              {/* ── 👑 LÍNEA HORIZONTAL DE LA MODA Y SU DATO EN EL EXTREMO DERECHO (Pestaña Moda) ── */}
              {activeTab === 'moda' && stats.modalVals.length > 0 && (() => {
                const yMo = getHeadY(stats.modalVals[0])
                const tagY = yMo - 13

                return (
                  <g className="animate-in fade-in duration-300">
                    <line
                      x1="60"
                      y1={yMo}
                      x2="865"
                      y2={yMo}
                      stroke="#ef4444"
                      strokeWidth="3.5"
                    />
                    {/* Cartelito rojo de Moda al EXTREMO DERECHO (fuera del área de personas) */}
                    <rect x="690" y={tagY} width="165" height="26" rx="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="772.5" y={tagY + 17} textAnchor="middle" className="font-mono text-[11px] font-black fill-white">
                      👑 Moda (Mo) = {stats.modalVals[0].toFixed(2)} {currentSit.unitShort}
                    </text>
                  </g>
                )
              })()}

              {/* ── ⚖️ LÍNEA HORIZONTAL DE LA MEDIA Y SU DATO EN EL EXTREMO DERECHO (Pestaña Media) ── */}
              {activeTab === 'media' && (() => {
                const yMedia = getHeadY(stats.media)
                const tagY = yMedia - 13

                return (
                  <g className="animate-in fade-in duration-300">
                    <line
                      x1="60"
                      y1={yMedia}
                      x2="865"
                      y2={yMedia}
                      stroke="#ec4899"
                      strokeWidth="3.5"
                      strokeDasharray="6 3"
                    />
                    {/* Cartelito rosa de Media al EXTREMO DERECHO (fuera del área de personas) */}
                    <rect x="690" y={tagY} width="165" height="26" rx="6" fill="#ec4899" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="772.5" y={tagY + 17} textAnchor="middle" className="font-mono text-[11px] font-black fill-white">
                      ⚖️ Media (x̄) ≈ {stats.media.toFixed(2)} {currentSit.unitShort}
                    </text>
                  </g>
                )
              })()}

              {/* ── 🎯 LÍNEA HORIZONTAL DE LA MEDIANA Y SU DATO EN EL EXTREMO DERECHO (Pestaña Mediana) ── */}
              {activeTab === 'mediana' && (() => {
                const yMediana = getHeadY(stats.mediana)
                const tagY = yMediana - 13

                return (
                  <g className="animate-in fade-in duration-300">
                    <line
                      x1="60"
                      y1={yMediana}
                      x2="865"
                      y2={yMediana}
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeDasharray="8 4"
                    />
                    {/* Cartelito verde esmeralda de Mediana al EXTREMO DERECHO */}
                    <rect x="690" y={tagY} width="165" height="26" rx="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="772.5" y={tagY + 17} textAnchor="middle" className="font-mono text-[11px] font-black fill-white">
                      🎯 Mediana (Me) = {stats.mediana.toFixed(2)} {currentSit.unitShort}
                    </text>
                  </g>
                )
              })()}

              {/* ── 📊 LAS 3 LÍNEAS SIMULTÁNEAS Y SUS ETIQUETAS DESACOPLADAS (Pestaña Comparativa) ── */}
              {activeTab === 'comparativa' && compTags.map((tag) => (
                <g key={`comp-line-group-${tag.id}`} className="animate-in fade-in duration-300">
                  {/* Línea horizontal continua o punteada según la medida */}
                  <line
                    x1="60"
                    y1={tag.rawY}
                    x2="685"
                    y2={tag.rawY}
                    stroke={tag.color}
                    strokeWidth="3.5"
                    strokeDasharray={tag.lineStyle === 'solid' ? undefined : tag.lineStyle}
                  />
                  {/* Conector suave si el tag fue espaciado para evitar choques */}
                  {Math.abs(tag.tagY + 13 - tag.rawY) > 1 && (
                    <line
                      x1="685"
                      y1={tag.rawY}
                      x2="690"
                      y2={tag.tagY + 13}
                      stroke={tag.color}
                      strokeWidth="1.8"
                      strokeDasharray="2 2"
                      strokeOpacity="0.85"
                    />
                  )}
                  {/* Cartelito al extremo derecho con su color oficial */}
                  <rect
                    x="690"
                    y={tag.tagY}
                    width="165"
                    height="26"
                    rx="6"
                    fill={tag.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x="772.5"
                    y={tag.tagY + 17}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-black fill-white"
                  >
                    {tag.label}
                  </text>
                </g>
              ))}

              {/* ── 👥 DIBUJO DE LAS 7 PERSONAS (CABELLO COMPLETO ILUSTRADO Y DESPLAZAMIENTO SUAVE) ── */}
              {currentSit.people.map((person) => {
                // Cálculo de la posición en el eje X según si está ordenado o desordenado
                const initialIdx = currentSit.people.findIndex((p) => p.id === person.id)
                const sortedIdx = sortedPeople.findIndex((p) => p.id === person.id)
                const currentSlotIdx = isOrdered ? sortedIdx : initialIdx
                const targetX = xSlots[currentSlotIdx]

                const headY = getHeadY(person.val)
                const personHeight = baselineY - headY

                // Resaltados interactivos
                const isModalPerson = (activeTab === 'moda' || activeTab === 'comparativa') && stats.modalVals.includes(person.val)
                const isMedianPerson = (activeTab === 'mediana' || activeTab === 'comparativa') && isOrdered && sortedIdx === stats.midIdx

                // Proporciones corporales armoniosas
                const headR = Math.max(13, Math.min(16, personHeight * 0.088))
                const headCy = headY + headR
                const torsoTop = headCy + headR + 2
                const torsoH = personHeight * 0.38
                const legsTop = torsoTop + torsoH
                const legsH = baselineY - legsTop

                return (
                  <g
                    key={`person-slot-group-${person.id}`}
                    style={{
                      transform: `translate(${targetX}px, 0px)`,
                      transition: 'transform 1.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {/* Anillo / Halo Oval alrededor de la persona */}
                    {(isModalPerson || isMedianPerson) && (
                      <ellipse
                        cx="0"
                        cy={headY + personHeight / 2}
                        rx="36"
                        ry={personHeight / 2 + 14}
                        fill="none"
                        stroke={isModalPerson ? '#ef4444' : '#10b981'}
                        strokeWidth="3.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Placa amarilla / roja / verde sobre la cabeza con su valor */}
                    <g transform={`translate(0, ${headY - 22})`}>
                      <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="20"
                        rx="5"
                        fill={isModalPerson ? '#ef4444' : isMedianPerson ? '#10b981' : '#fef08a'}
                        stroke={isModalPerson ? '#b91c1c' : isMedianPerson ? '#059669' : '#ca8a04'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        className={`font-mono text-[10.5px] font-black ${
                          isModalPerson || isMedianPerson ? 'fill-white' : 'fill-slate-900'
                        }`}
                      >
                        {person.displayVal}
                      </text>
                    </g>

                    {/* Sombra en los pies */}
                    <ellipse cx="0" cy={baselineY} rx="18" ry="4" fill="#000000" fillOpacity="0.25" />

                    {/* Cuerpo de la Persona */}
                    <g filter="url(#avatar-shadow)">
                      {/* 1. Melena posterior (para pelo largo o bob de niñas) */}
                      {person.hairStyle === 'long-elena' && (
                        <path
                          d={`M ${-headR - 5} ${headCy} C ${-headR - 5} ${headY - 7}, ${headR + 5} ${headY - 7}, ${headR + 5} ${headCy} L ${headR + 7} ${headCy + 38} Q 0 ${headCy + 42} ${-headR - 7} ${headCy + 38} Z`}
                          fill={person.hairColor}
                        />
                      )}
                      {(person.hairStyle === 'bob-sofia' || person.hairStyle === 'bob-valeria') && (
                        <ellipse cx="0" cy={headCy + 4} rx={headR + 5} ry={headR + 8} fill={person.hairColor} />
                      )}
                      {person.hairStyle === 'pigtails-lucia' && (
                        <g>
                          <circle cx={-headR - 5} cy={headCy - 1} r="6" fill={person.hairColor} />
                          <circle cx={headR + 5} cy={headCy - 1} r="6" fill={person.hairColor} />
                          <ellipse cx={-headR - 1} cy={headCy - 3} rx="3.5" ry="2.2" fill="#ec4899" />
                          <ellipse cx={headR + 1} cy={headCy - 3} rx="3.5" ry="2.2" fill="#ec4899" />
                        </g>
                      )}

                      {/* 2. Piernas / Falda / Pantalón */}
                      {person.hairStyle === 'pigtails-lucia' ? (
                        // Vestido entero con piernas cortas (Lucía)
                        <g>
                          <rect x="-7" y={legsTop} width="5" height={legsH - 2} rx="2" fill={person.skinColor} />
                          <rect x="2" y={legsTop} width="5" height={legsH - 2} rx="2" fill={person.skinColor} />
                          <rect x="-7.5" y={baselineY - 8} width="6" height="5" fill="#ffffff" rx="1" />
                          <rect x="1.5" y={baselineY - 8} width="6" height="5" fill="#ffffff" rx="1" />
                          <ellipse cx="-4.5" cy={baselineY - 1} rx="5" ry="3" fill="#db2777" />
                          <ellipse cx="4.5" cy={baselineY - 1} rx="5" ry="3" fill="#db2777" />
                        </g>
                      ) : person.hairStyle === 'long-elena' ? (
                        // Falda larga de Elena
                        <g>
                          <path
                            d={`M -15 ${torsoTop + torsoH - 4} L 15 ${torsoTop + torsoH - 4} L 18 ${baselineY - 6} L -18 ${baselineY - 6} Z`}
                            fill={person.bottomColor}
                          />
                          <ellipse cx="-6" cy={baselineY - 1} rx="5" ry="3" fill="#1e1b4b" />
                          <ellipse cx="6" cy={baselineY - 1} rx="5" ry="3" fill="#1e1b4b" />
                        </g>
                      ) : person.gender === 'girl' ? (
                        // Falda corta y piernas (Sofía / Valeria)
                        <g>
                          <path
                            d={`M -14 ${torsoTop + torsoH - 4} L 14 ${torsoTop + torsoH - 4} L 16 ${torsoTop + torsoH + 16} L -16 ${torsoTop + torsoH + 16} Z`}
                            fill={person.bottomColor}
                          />
                          <rect x="-7" y={torsoTop + torsoH + 16} width="5" height={legsH - 18} rx="2" fill={person.skinColor} />
                          <rect x="2" y={torsoTop + torsoH + 16} width="5" height={legsH - 18} rx="2" fill={person.skinColor} />
                          <ellipse cx="-4.5" cy={baselineY - 1} rx="5" ry="3" fill="#78350f" />
                          <ellipse cx="4.5" cy={baselineY - 1} rx="5" ry="3" fill="#78350f" />
                        </g>
                      ) : (
                        // Pantalón / Shorts de niños (Mateo, Carlos, Diego)
                        <g>
                          <path
                            d={`M -14 ${torsoTop + torsoH - 4} L 14 ${torsoTop + torsoH - 4} L 15 ${legsTop + legsH * 0.55} L 2 ${legsTop + legsH * 0.55} L 0 ${legsTop + 5} L -2 ${legsTop + legsH * 0.55} L -15 ${legsTop + legsH * 0.55} Z`}
                            fill={person.bottomColor}
                          />
                          <rect x="-8" y={legsTop + legsH * 0.55} width="5" height={legsH * 0.38} fill={person.skinColor} />
                          <rect x="3" y={legsTop + legsH * 0.55} width="5" height={legsH * 0.38} fill={person.skinColor} />
                          <ellipse cx="-5.5" cy={baselineY - 1} rx="6" ry="3.5" fill="#0f172a" />
                          <ellipse cx="5.5" cy={baselineY - 1} rx="6" ry="3.5" fill="#0f172a" />
                        </g>
                      )}

                      {/* 3. Torso / Camiseta */}
                      <rect
                        x="-14"
                        y={torsoTop}
                        width="28"
                        height={torsoH}
                        rx="5"
                        fill={person.shirtColor}
                      />
                      <path
                        d={`M -6 ${torsoTop} Q 0 ${torsoTop + 6} 6 ${torsoTop}`}
                        fill={person.skinColor}
                      />
                      {/* Brazos */}
                      <rect x="-20" y={torsoTop + 2} width="6" height={torsoH * 0.75} rx="3" fill={person.shirtColor} />
                      <rect x="-19.5" y={torsoTop + torsoH * 0.75} width="5" height={torsoH * 0.3} rx="2" fill={person.skinColor} />
                      <rect x="14" y={torsoTop + 2} width="6" height={torsoH * 0.75} rx="3" fill={person.shirtColor} />
                      <rect x="14.5" y={torsoTop + torsoH * 0.75} width="5" height={torsoH * 0.3} rx="2" fill={person.skinColor} />

                      {/* Cuello base */}
                      <rect x="-3.5" y={headCy + headR - 3} width="7" height="6" fill={person.skinColor} />

                      {/* Orejas */}
                      <circle cx={-headR + 1} cy={headCy + 1} r="3.5" fill={person.skinColor} />
                      <circle cx={headR - 1} cy={headCy + 1} r="3.5" fill={person.skinColor} />

                      {/* 4. Cabeza (Rostro redondo) */}
                      <circle cx="0" cy={headCy} r={headR} fill={person.skinColor} />

                      {/* Ojos expresivos */}
                      <circle cx="-5" cy={headCy} r="2" fill="#0f172a" />
                      <circle cx="5" cy={headCy} r="2" fill="#0f172a" />
                      <circle cx="-4.2" cy={headCy - 0.7} r="0.7" fill="#ffffff" />
                      <circle cx="5.8" cy={headCy - 0.7} r="0.7" fill="#ffffff" />

                      {/* Sonrisa simpática */}
                      <path
                        d={`M -4 ${headCy + 5} Q 0 ${headCy + 9} 4 ${headCy + 5}`}
                        fill="none"
                        stroke="#b91c1c"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />

                      {/* Mejillas sonrosadas */}
                      <circle cx="-8" cy={headCy + 4} r="2.5" fill="#f43f5e" fillOpacity="0.45" />
                      <circle cx="8" cy={headCy + 4} r="2.5" fill="#f43f5e" fillOpacity="0.45" />

                      {/* 5. 💇 CABELLO ILUSTRADO COMPLETO (CUBRE TODA LA PARTE SUPERIOR DEL CRÁNEO) */}
                      {person.hairStyle === 'short-mateo' && (
                        // Mateo: cabello corto juvenil envolviendo toda la cúpula superior
                        <path
                          d={`M ${-headR - 2} ${headCy + 2} C ${-headR - 2} ${headY - 6}, ${headR + 2} ${headY - 6}, ${headR + 2} ${headCy + 2} L ${headR - 1} ${headCy - 3} Q ${headR * 0.5} ${headCy - 1} 0 ${headCy - 4} Q ${-headR * 0.5} ${headCy - 1} ${-headR + 1} ${headCy - 3} Z`}
                          fill={person.hairColor}
                        />
                      )}

                      {person.hairStyle === 'short-carlos' && (
                        // Carlos: cabello corto moderno peinado con textura frontal
                        <path
                          d={`M ${-headR - 2} ${headCy + 2} C ${-headR - 3} ${headY - 7}, ${headR + 3} ${headY - 7}, ${headR + 2} ${headCy + 2} L ${headR - 1} ${headCy - 4} Q 4 ${headCy - 6} -2 ${headCy - 2} Q -8 ${headCy - 4} ${-headR + 1} ${headCy - 3} Z`}
                          fill={person.hairColor}
                        />
                      )}

                      {person.hairStyle === 'short-diego' && (
                        // Diego: cabello castaño peinado hacia un lado
                        <path
                          d={`M ${-headR - 2} ${headCy + 2} C ${-headR - 2} ${headY - 6}, ${headR + 2} ${headY - 6}, ${headR + 2} ${headCy + 2} L ${headR - 1} ${headCy - 3} Q 2 ${headCy - 3} -4 ${headCy - 5} Q ${-headR * 0.6} ${headCy - 2} ${-headR + 1} ${headCy - 3} Z`}
                          fill={person.hairColor}
                        />
                      )}

                      {(person.hairStyle === 'bob-sofia' || person.hairStyle === 'bob-valeria') && (
                        // Melena bob niñas (Sofía y Valeria): cubre cráneo arriba y cae enmarcando la cara
                        <path
                          d={`M ${-headR - 3} ${headCy + 10} L ${-headR - 3} ${headCy} C ${-headR - 4} ${headY - 6}, ${headR + 4} ${headY - 6}, ${headR + 3} ${headCy} L ${headR + 3} ${headCy + 10} L ${headR + 1} ${headCy + 7} L ${headR - 1} ${headCy - 2} Q 0 ${headCy - 5} ${-headR + 1} ${headCy - 2} L ${-headR - 1} ${headCy + 7} Z`}
                          fill={person.hairColor}
                        />
                      )}

                      {person.hairStyle === 'long-elena' && (
                        // Elena: melena larga frontal cayendo por los hombros
                        <path
                          d={`M ${-headR - 3} ${headCy + 26} L ${-headR - 3} ${headCy} C ${-headR - 3} ${headY - 6}, ${headR + 3} ${headY - 6}, ${headR + 3} ${headCy} L ${headR + 3} ${headCy + 26} Q ${headR + 1} ${headCy + 18} ${headR - 2} ${headCy - 1} Q 0 ${headCy - 5} ${-headR + 2} ${headCy - 1} Q ${-headR - 1} ${headCy + 18} ${-headR - 3} ${headCy + 26} Z`}
                          fill={person.hairColor}
                        />
                      )}

                      {person.hairStyle === 'pigtails-lucia' && (
                        // Lucía: flequillo superior y moñitos
                        <path
                          d={`M ${-headR - 2} ${headCy + 2} C ${-headR - 2} ${headY - 5}, ${headR + 2} ${headY - 5}, ${headR + 2} ${headCy + 2} L ${headR} ${headCy - 3} Q 0 ${headCy - 4} ${-headR} ${headCy - 3} Z`}
                          fill={person.hairColor}
                        />
                      )}
                    </g>

                    {/* Nombre del estudiante debajo de los pies */}
                    <text
                      x="0"
                      y={baselineY + 28}
                      textAnchor="middle"
                      className={`text-[11.5px] font-black tracking-tight ${isDark ? 'fill-slate-100' : 'fill-slate-900'}`}
                    >
                      {person.name}
                    </text>

                    {/* Badge especial de Mediana */}
                    {isMedianPerson && (
                      <g transform={`translate(0, ${baselineY + 44})`}>
                        <rect x="-42" y="-9" width="84" height="18" rx="4" fill="#10b981" />
                        <text x="0" y="3.5" textAnchor="middle" className="font-mono text-[9px] font-black fill-white uppercase tracking-tighter">
                          ¡Mediana! (50%)
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* ── 4. MODAL DIDÁCTICO DE INFORMACIÓN, FÓRMULAS Y PROCEDIMIENTOS (showDetailModal) ── */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className={`max-w-md w-full rounded-2xl border p-4 shadow-2xl relative flex flex-col justify-between max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {activeTab === 'moda' ? '👑' : activeTab === 'media' ? '⚖️' : activeTab === 'mediana' ? '🎯' : '📊'}
                </span>
                <h3 className="font-black text-sm lg:text-base">
                  {activeTab === 'moda' && 'Moda (Mo): La estatura que más se repite'}
                  {activeTab === 'media' && 'Media Aritmética (x̄): El promedio'}
                  {activeTab === 'mediana' && 'Mediana (Me): El lugar central ordenado'}
                  {activeTab === 'comparativa' && 'Comparativa de las 3 Medidas'}
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

            {/* Contenido según la medida activa */}
            <div className="space-y-3 text-xs">
              {/* MODA */}
              {activeTab === 'moda' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed opacity-90">
                    La <strong>Moda</strong> es la medida de tendencia central que representa el valor que aparece con mayor frecuencia en la muestra.
                  </p>
                  <div className={`p-3 rounded-xl border space-y-1 ${
                    isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <span className="font-bold text-blue-600 dark:text-blue-400 block text-xs">
                      👥 Personas con la misma medida modal ({stats.modalVals[0].toFixed(2)} {currentSit.unitShort}):
                    </span>
                    <p className="opacity-90">
                      <strong>{modalNames}</strong> tienen exactamente el mismo valor. Este valor se repite <strong>{stats.maxF} veces</strong>, siendo el más frecuente de la muestra.
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center font-mono ${
                    isDark ? 'bg-blue-600/20 border-blue-500/40' : 'bg-white border-blue-300 shadow-xs'
                  }`}>
                    <span className="text-[11px] opacity-70 block mb-0.5 font-bold uppercase">
                      Resultado de la Moda
                    </span>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      Moda (Mo) = {stats.modalVals[0].toFixed(2)} {currentSit.unitShort}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 italic">
                    💡 En el gráfico, la línea roja horizontal conecta milimétricamente las cabezas de las estaturas modales coincidentes, con su cartel ubicado en el extremo derecho.
                  </p>
                </div>
              )}

              {/* MEDIA */}
              {activeTab === 'media' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed opacity-90">
                    La <strong>Media Aritmética</strong> representa el valor promedio o centro de gravedad equitativo. Sumamos todas las estaturas y dividimos entre el número total de personas ($N = 7$):
                  </p>
                  {/* Fórmula Vertical 2D */}
                  <div className={`p-3 rounded-xl border text-center font-mono space-y-2 ${
                    isDark ? 'bg-pink-500/10 border-pink-500/20' : 'bg-pink-50 border-pink-200'
                  }`}>
                    <div className="flex items-center justify-center text-xs">
                      <MathFraction
                        prefix={<span className="text-pink-600 dark:text-pink-400 font-bold mr-1.5">x̄ =</span>}
                        numerator={<span className="text-[10px] font-bold">{currentSit.people.map((p) => p.val.toFixed(2)).join(' + ')}</span>}
                        denominator={<span className="font-black text-pink-600 dark:text-pink-400">7</span>}
                      />
                    </div>
                    <div className="pt-2 border-t border-pink-500/20 flex items-center justify-center gap-2">
                      <MathFraction
                        prefix={<span className="text-pink-600 dark:text-pink-400 mr-1">=</span>}
                        numerator={<span className="text-amber-500 font-bold">{stats.sum.toFixed(2)}</span>}
                        denominator={<span className="text-pink-600 dark:text-pink-400 font-bold">7</span>}
                        suffix={
                          <span className="text-pink-600 dark:text-pink-400 font-black text-base ml-2">
                            ≈ {stats.media.toFixed(2)} {currentSit.unitShort}
                          </span>
                        }
                      />
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center font-mono ${
                    isDark ? 'bg-pink-600/20 border-pink-500/40' : 'bg-white border-pink-300 shadow-xs'
                  }`}>
                    <span className="text-[11px] opacity-70 block mb-0.5 font-bold uppercase">
                      Resultado de la Media
                    </span>
                    <span className="text-xl font-black text-pink-600 dark:text-pink-400">
                      Media (x̄) ≈ {stats.media.toFixed(2)} {currentSit.unitShort}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 italic">
                    💡 La línea rosa punteada en el plano marca el nivel de equilibrio: las personas más altas compensan a las más bajas.
                  </p>
                </div>
              )}

              {/* MEDIANA */}
              {activeTab === 'mediana' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed opacity-90">
                    La <strong>Mediana</strong> es el valor que ocupa la posición central una vez que los datos han sido ordenados de menor a mayor.
                  </p>
                  <div className={`p-3 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Posición Central (N = 7):</span>
                      <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-bold">
                        (N + 1) ÷ 2 = 8 ÷ 2 = 4° término
                      </span>
                    </div>
                    <p className="opacity-90 leading-snug">
                      Al formarse de menor a mayor, exactamente <strong>3 quedan a la izquierda</strong> y <strong>3 a la derecha</strong>. La persona central (4°) es <strong>{sortedPeople[stats.midIdx].name}</strong> con <strong>{stats.mediana.toFixed(2)} {currentSit.unitShort}</strong>.
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center font-mono ${
                    isDark ? 'bg-emerald-600/20 border-emerald-500/40' : 'bg-white border-emerald-300 shadow-xs'
                  }`}>
                    <span className="text-[11px] opacity-70 block mb-0.5 font-bold uppercase">
                      Resultado de la Mediana
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      Mediana (Me) = {stats.mediana.toFixed(2)} {currentSit.unitShort}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 italic">
                    💡 La Mediana no se ve afectada si un estudiante fuera gigante (dato atípico), ya que solo depende del orden del centro.
                  </p>
                </div>
              )}

              {/* COMPARATIVA */}
              {activeTab === 'comparativa' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className={`p-2 rounded-xl border ${
                      isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">👑 Moda</span>
                      <span className="text-sm font-black text-blue-700 dark:text-blue-300">{stats.modalVals[0].toFixed(2)}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      isDark ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-50 border-pink-200 text-pink-900'
                    }`}>
                      <span className="text-[10px] text-pink-600 dark:text-pink-400 block font-bold">⚖️ Media</span>
                      <span className="text-sm font-black text-pink-700 dark:text-pink-300">≈ {stats.media.toFixed(2)}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">🎯 Mediana</span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{stats.mediana.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs uppercase mb-1">
                      📌 Conclusión Pedagógica:
                    </span>
                    {Math.abs(stats.media - stats.mediana) < 0.03 && stats.mediana === stats.modalVals[0] ? (
                      <p className="leading-snug opacity-90">
                        En este caso particular, la Media ($\approx {stats.media.toFixed(2)}$), Mediana (${stats.mediana.toFixed(2)}$) y Moda (${stats.modalVals[0].toFixed(2)}$) coinciden. Esto ocurre cuando la distribución es <strong>perfectamente simétrica</strong>.
                      </p>
                    ) : (
                      <p className="leading-snug opacity-90">
                        Observa cómo las 3 medidas difieren: la <strong>Moda = {stats.modalVals[0].toFixed(2)}</strong> (el dato más repetido), la <strong>Mediana = {stats.mediana.toFixed(2)}</strong> (el dato central al ordenarlos) y la <strong>Media ≈ {stats.media.toFixed(2)}</strong> (el promedio de equilibrio). Cada una interpreta el "centro" con un criterio matemático distinto.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
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
        title="Medidas de Tendencia Central con Personas y Estaturas"
        buttonColor="bg-blue-600 hover:bg-blue-500"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            Esta vista interactiva ilustra el significado físico y geométrico de las tres medidas de tendencia central:
          </p>
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
            <strong className="text-blue-400">1. Moda (Mo):</strong>
            <p>Es la estatura que más se repite. La línea roja horizontal en el plano conecta directamente las cabezas de las personas con la misma medida.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 space-y-1">
            <strong className="text-pink-400">2. Media Aritmética (x̄):</strong>
            <p>Es el punto de equilibrio físico. La línea horizontal punteada rosa indica el nivel promedio donde los más altos compensan a los más bajos.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <strong className="text-emerald-400">3. Mediana (Me):</strong>
            <p>Es el valor de la persona en el centro una vez ordenados de menor a mayor. Presiona el botón <strong>«Ordenar»</strong> para ver cómo se desplazan a sus lugares.</p>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
