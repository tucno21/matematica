import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  BarChart3,
  Shuffle,
  Play,
  Pause,
  ArrowUpDown,
  Sparkles,
  Trophy,
  CheckCircle2,
  Table as TableIcon,
  Calculator,
  Crown
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type VariableType = 'cualitativa' | 'cuantitativa'
type ViewMode = 'split' | 'conteo' | 'tabla' | 'grafico'
type ExerciseMode = 'explorar' | 'reto'
type TableStage = 'conteo' | 'calcular_hi' | 'calcular_hipct'

interface CategoryDef {
  key: string
  label: string
  icon: string
  color: {
    bg: string
    border: string
    text: string
    darkBg: string
    darkBorder: string
    darkText: string
    hex: string
  }
}

interface DatasetPreset {
  id: string
  title: string
  variableName: string
  type: VariableType
  categories: CategoryDef[]
}

interface DataItem {
  id: number
  categoryKey: string
  counted: boolean
}

// ─── Paleta de colores para categorías ───────────────────────────────────────
const COLOR_PALETTES = [
  {
    bg: 'bg-sky-100',
    border: 'border-sky-300',
    text: 'text-sky-700',
    darkBg: 'bg-sky-500/20',
    darkBorder: 'border-sky-500/40',
    darkText: 'text-sky-300',
    hex: '#0284c7'
  },
  {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    darkBg: 'bg-emerald-500/20',
    darkBorder: 'border-emerald-500/40',
    darkText: 'text-emerald-300',
    hex: '#059669'
  },
  {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-800',
    darkBg: 'bg-amber-500/20',
    darkBorder: 'border-amber-500/40',
    darkText: 'text-amber-300',
    hex: '#d97706'
  },
  {
    bg: 'bg-rose-100',
    border: 'border-rose-300',
    text: 'text-rose-700',
    darkBg: 'bg-rose-500/20',
    darkBorder: 'border-rose-500/40',
    darkText: 'text-rose-300',
    hex: '#e11d48'
  },
  {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
    darkBg: 'bg-purple-500/20',
    darkBorder: 'border-purple-500/40',
    darkText: 'text-purple-300',
    hex: '#9333ea'
  }
]

// ─── Datasets Prediseñados ────────────────────────────────────────────────────
const DATASETS: DatasetPreset[] = [
  // ── Cualitativas ──
  {
    id: 'deportes',
    title: 'Deporte favorito de 20 estudiantes',
    variableName: 'Deporte',
    type: 'cualitativa',
    categories: [
      { key: 'futbol', label: 'Fútbol', icon: '⚽', color: COLOR_PALETTES[0] },
      { key: 'voley', label: 'Vóley', icon: '🏐', color: COLOR_PALETTES[1] },
      { key: 'basquet', label: 'Básquet', icon: '🏀', color: COLOR_PALETTES[2] },
      { key: 'natacion', label: 'Natación', icon: '🏊', color: COLOR_PALETTES[3] }
    ]
  },
  {
    id: 'frutas',
    title: 'Fruta preferida en el refrigerio escolar',
    variableName: 'Fruta',
    type: 'cualitativa',
    categories: [
      { key: 'manzana', label: 'Manzana', icon: '🍎', color: COLOR_PALETTES[3] },
      { key: 'platano', label: 'Plátano', icon: '🍌', color: COLOR_PALETTES[2] },
      { key: 'fresa', label: 'Fresa', icon: '🍓', color: COLOR_PALETTES[4] },
      { key: 'naranja', label: 'Naranja', icon: '🍊', color: COLOR_PALETTES[0] }
    ]
  },
  {
    id: 'mascotas',
    title: 'Mascota preferida en casa',
    variableName: 'Mascota',
    type: 'cualitativa',
    categories: [
      { key: 'perro', label: 'Perro', icon: '🐶', color: COLOR_PALETTES[0] },
      { key: 'gato', label: 'Gato', icon: '🐱', color: COLOR_PALETTES[1] },
      { key: 'loro', label: 'Loro', icon: '🦜', color: COLOR_PALETTES[2] },
      { key: 'conejo', label: 'Conejo', icon: '🐰', color: COLOR_PALETTES[4] }
    ]
  },
  {
    id: 'colores',
    title: 'Color favorito para el uniforme deportivo',
    variableName: 'Color',
    type: 'cualitativa',
    categories: [
      { key: 'azul', label: 'Azul', icon: '🔵', color: COLOR_PALETTES[0] },
      { key: 'rojo', label: 'Rojo', icon: '🔴', color: COLOR_PALETTES[3] },
      { key: 'verde', label: 'Verde', icon: '🟢', color: COLOR_PALETTES[1] },
      { key: 'amarillo', label: 'Amarillo', icon: '🟡', color: COLOR_PALETTES[2] }
    ]
  },

  // ── Cuantitativas Discretas ──
  {
    id: 'hermanos',
    title: 'Número de hermanos por familia',
    variableName: 'N.° de Hermanos (xi)',
    type: 'cuantitativa',
    categories: [
      { key: 'h0', label: '0 hermanos', icon: '0', color: COLOR_PALETTES[0] },
      { key: 'h1', label: '1 hermano', icon: '1', color: COLOR_PALETTES[1] },
      { key: 'h2', label: '2 hermanos', icon: '2', color: COLOR_PALETTES[2] },
      { key: 'h3', label: '3 hermanos', icon: '3', color: COLOR_PALETTES[3] },
      { key: 'h4', label: '4 a más', icon: '4+', color: COLOR_PALETTES[4] }
    ]
  },
  {
    id: 'mascotas_casa',
    title: 'Cantidad de mascotas que tienen en el hogar',
    variableName: 'N.° de Mascotas (xi)',
    type: 'cuantitativa',
    categories: [
      { key: 'm0', label: '0 mascotas', icon: '0', color: COLOR_PALETTES[0] },
      { key: 'm1', label: '1 mascota', icon: '1', color: COLOR_PALETTES[1] },
      { key: 'm2', label: '2 mascotas', icon: '2', color: COLOR_PALETTES[2] },
      { key: 'm3', label: '3 a más', icon: '3+', color: COLOR_PALETTES[3] }
    ]
  },
  {
    id: 'horas_estudio',
    title: 'Horas diarias dedicadas al estudio o tareas',
    variableName: 'Horas (xi)',
    type: 'cuantitativa',
    categories: [
      { key: 'he1', label: '1 hora', icon: '1h', color: COLOR_PALETTES[0] },
      { key: 'he2', label: '2 horas', icon: '2h', color: COLOR_PALETTES[1] },
      { key: 'he3', label: '3 horas', icon: '3h', color: COLOR_PALETTES[2] },
      { key: 'he4', label: '4 horas', icon: '4h', color: COLOR_PALETTES[3] }
    ]
  },
  {
    id: 'goles',
    title: 'Goles anotados por partido en el campeonato',
    variableName: 'Goles (xi)',
    type: 'cuantitativa',
    categories: [
      { key: 'g0', label: '0 goles', icon: '0', color: COLOR_PALETTES[0] },
      { key: 'g1', label: '1 gol', icon: '1', color: COLOR_PALETTES[1] },
      { key: 'g2', label: '2 goles', icon: '2', color: COLOR_PALETTES[2] },
      { key: 'g3', label: '3 goles', icon: '3', color: COLOR_PALETTES[3] },
      { key: 'g4', label: '4 o más', icon: '4+', color: COLOR_PALETTES[4] }
    ]
  }
]

const SAMPLE_SIZE = 20

// Generador aleatorio de muestra de 20 datos garantizando variedad
function generateSample(categories: CategoryDef[], size = SAMPLE_SIZE): DataItem[] {
  const catCount = categories.length
  const items: DataItem[] = []

  // Asegurar al menos 1 o 2 de cada categoría para que no quede vacía ninguna fila
  categories.forEach((cat) => {
    const minGuaranteed = 2
    for (let i = 0; i < minGuaranteed; i++) {
      items.push({
        id: items.length,
        categoryKey: cat.key,
        counted: false
      })
    }
  })

  // Completar el resto al azar
  while (items.length < size) {
    const randomCat = categories[Math.floor(Math.random() * catCount)]
    items.push({
      id: items.length,
      categoryKey: randomCat.key,
      counted: false
    })
  }

  // Mezclar (Fisher-Yates) para que los datos estén completamente desorganizados
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }

  // Reasignar IDs correlativos
  return items.map((it, idx) => ({ ...it, id: idx }))
}

// ─── Componente SVG para Palotes (Tally Marks de 5 en 5 estilo MINEDU) ────────
function TallyMarks({ count, colorHex }: { count: number; colorHex: string }) {
  if (count <= 0) {
    return <span className="text-slate-400 text-xs italic">Sin conteo</span>
  }

  const bundles = Math.floor(count / 5)
  const remainder = count % 5

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Grupos completos de 5 palotes */}
      {Array.from({ length: bundles }).map((_, bIdx) => (
        <svg
          key={`b-${bIdx}`}
          viewBox="0 0 28 20"
          className="w-7 h-5 shrink-0"
          aria-label="Grupo de 5 palotes"
        >
          <title>Grupo de 5 palotes</title>
          {/* 4 palotes verticales */}
          <line x1="4" y1="2" x2="4" y2="18" stroke={colorHex} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="10" y1="2" x2="10" y2="18" stroke={colorHex} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="16" y1="2" x2="16" y2="18" stroke={colorHex} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="22" y1="2" x2="22" y2="18" stroke={colorHex} strokeWidth="2.4" strokeLinecap="round" />
          {/* 1 palote transversal que agrupa los 5 */}
          <line x1="1" y1="17" x2="25" y2="3" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      ))}

      {/* Palotes sobrantes (1 a 4) */}
      {remainder > 0 && (
        <svg
          viewBox={`0 0 ${remainder * 6 + 4} 20`}
          style={{ width: `${remainder * 6 + 4}px` }}
          className="h-5 shrink-0"
          aria-label={`${remainder} palotes`}
        >
          <title>{`${remainder} palote${remainder > 1 ? 's' : ''}`}</title>
          {Array.from({ length: remainder }).map((_, rIdx) => (
            <line
              key={`r-${rIdx}`}
              x1={4 + rIdx * 6}
              y1="2"
              x2={4 + rIdx * 6}
              y2="18"
              stroke={colorHex}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TablaFrecuenciasView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Estado general
  const [activeVarType, setActiveVarType] = useState<VariableType>('cualitativa')
  const [datasetId, setDatasetId] = useState<string>('deportes')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('explorar')
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [showCumulative, setShowCumulative] = useState<boolean>(false)
  const [isSorted, setIsSorted] = useState<boolean>(false)
  const [tableStage, setTableStage] = useState<TableStage>('conteo')
  // Categoría seleccionada para la explicación visual Parte-Todo en el panel izquierdo
  const [selectedCatKey, setSelectedCatKey] = useState<string>(DATASETS[0].categories[0].key)

  // Dataset activo
  const currentDataset = useMemo(() => {
    return DATASETS.find((d) => d.id === datasetId) || DATASETS[0]
  }, [datasetId])

  // Datos de la muestra
  const [sampleData, setSampleData] = useState<DataItem[]>(() =>
    generateSample(DATASETS[0].categories)
  )

  // Categoría resaltada momentáneamente al interactuar
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)

  // Auto-conteo animado paso a paso
  const [isAutoCounting, setIsAutoCounting] = useState<boolean>(false)
  const autoCountTimerRef = useRef<number | null>(null)

  // Estado de inputs para Modo Reto y Celda Activa para Teclado Virtual
  const [retoInputs, setRetoInputs] = useState<Record<string, { fi: string; hi: string; hiPct: string }>>({})
  const [retoFeedback, setRetoFeedback] = useState<{ checked: boolean; correctCount: number; totalFields: number } | null>(null)
  const [activeRetoCell, setActiveRetoCell] = useState<{
    catKey: string
    field: 'fi' | 'hi' | 'hiPct'
  } | null>(null)

  // Cambiar dataset
  const handleSelectDataset = useCallback((id: string) => {
    const ds = DATASETS.find((d) => d.id === id)
    if (!ds) return
    setDatasetId(id)
    setActiveVarType(ds.type)
    const newItems = generateSample(ds.categories)
    setSampleData(newItems)
    setIsSorted(false)
    setIsAutoCounting(false)
    setActiveAutoCountId(null)
    setTableStage('conteo')
    setSelectedCatKey(ds.categories[0].key)
    if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
    setRetoInputs({})
    setRetoFeedback(null)
    setActiveRetoCell({ catKey: ds.categories[0].key, field: 'fi' })
  }, [])

  // Cambiar tipo de variable (Cualitativa vs Cuantitativa)
  const handleSelectType = useCallback((type: VariableType) => {
    setActiveVarType(type)
    const firstMatching = DATASETS.find((d) => d.type === type)
    if (firstMatching) {
      handleSelectDataset(firstMatching.id)
    }
  }, [handleSelectDataset])

  // Generar nueva muestra aleatoria
  const handleNewSample = useCallback(() => {
    const newItems = generateSample(currentDataset.categories)
    setSampleData(newItems)
    setIsSorted(false)
    setIsAutoCounting(false)
    setActiveAutoCountId(null)
    setTableStage('conteo')
    setSelectedCatKey(currentDataset.categories[0].key)
    if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
    setRetoInputs({})
    setRetoFeedback(null)
    setActiveRetoCell({ catKey: currentDataset.categories[0].key, field: 'fi' })
  }, [currentDataset])

  // Reiniciar solo el conteo de la muestra actual
  const handleResetCount = useCallback(() => {
    setSampleData((prev) => prev.map((item) => ({ ...item, counted: false })))
    setIsAutoCounting(false)
    setActiveAutoCountId(null)
    setTableStage('conteo')
    setSelectedCatKey(currentDataset.categories[0].key)
    if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
    setRetoInputs({})
    setRetoFeedback(null)
    setActiveRetoCell({ catKey: currentDataset.categories[0].key, field: 'fi' })
  }, [currentDataset])

  // Auto-conteo secuencial animado pausado y pedagógico
  const [autoCountSpeed, setAutoCountSpeed] = useState<'lento' | 'medio'>('lento')
  const [activeAutoCountId, setActiveAutoCountId] = useState<number | null>(null)

  // Tachar / Destachar un dato individual
  const toggleItemCount = useCallback((id: number) => {
    setSampleData((prev) => {
      const target = prev.find((it) => it.id === id)
      if (!target) return prev
      const newStatus = !target.counted
      if (newStatus) {
        setHighlightedCategory(target.categoryKey)
        setTimeout(() => setHighlightedCategory(null), 800)
      }
      return prev.map((it) => (it.id === id ? { ...it, counted: newStatus } : it))
    })
  }, [])

  // Auto-conteo secuencial animado a ritmo lento y claro
  const toggleAutoCount = useCallback(() => {
    if (isAutoCounting) {
      setIsAutoCounting(false)
      setActiveAutoCountId(null)
      if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
      return
    }

    setIsAutoCounting(true)
    const intervalMs = autoCountSpeed === 'lento' ? 1300 : 800

    autoCountTimerRef.current = window.setInterval(() => {
      setSampleData((prev) => {
        const nextUncounted = prev.find((it) => !it.counted)
        if (!nextUncounted) {
          setIsAutoCounting(false)
          setActiveAutoCountId(null)
          if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
          return prev
        }
        setActiveAutoCountId(nextUncounted.id)
        setHighlightedCategory(nextUncounted.categoryKey)
        setTimeout(() => {
          setActiveAutoCountId(null)
          setHighlightedCategory(null)
        }, Math.floor(intervalMs * 0.75))
        return prev.map((it) => (it.id === nextUncounted.id ? { ...it, counted: true } : it))
      })
    }, intervalMs)
  }, [isAutoCounting, autoCountSpeed])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
    }
  }, [])

  // Datos ordenados o desordenados según el toggle
  const displayedItems = useMemo(() => {
    if (!isSorted) return sampleData
    // Si está ordenado, agrupar por el orden de categorías del dataset
    return [...sampleData].sort((a, b) => {
      const idxA = currentDataset.categories.findIndex((c) => c.key === a.categoryKey)
      const idxB = currentDataset.categories.findIndex((c) => c.key === b.categoryKey)
      return idxA - idxB
    })
  }, [sampleData, isSorted, currentDataset])

  // Contadores y frecuencias calculadas a partir de la muestra
  const stats = useMemo(() => {
    const totalCounted = sampleData.filter((it) => it.counted).length
    const isComplete = totalCounted === SAMPLE_SIZE

    let cumulativeFi = 0

    const rows = currentDataset.categories.map((cat) => {
      const totalInCategory = sampleData.filter((it) => it.categoryKey === cat.key).length
      const countedInCategory = sampleData.filter((it) => it.categoryKey === cat.key && it.counted).length

      // En modo explorar guiado, usamos los contados hasta el momento (o el total si no ha empezado)
      const fi = countedInCategory
      const hi = totalCounted > 0 ? fi / SAMPLE_SIZE : 0
      const hiPct = hi * 100

      cumulativeFi += fi

      return {
        category: cat,
        totalReal: totalInCategory,
        fi,
        hi,
        hiPct,
        Fi: cumulativeFi
      }
    })

    // Identificar la Moda (Mo): la categoría con mayor frecuencia real
    const maxFi = Math.max(...rows.map((r) => r.fi))
    const modes = rows.filter((r) => r.fi === maxFi && r.fi > 0)

    const sumFi = rows.reduce((acc, r) => acc + r.fi, 0)
    const sumHi = rows.reduce((acc, r) => acc + r.hi, 0)
    const sumHiPct = rows.reduce((acc, r) => acc + r.hiPct, 0)

    return {
      totalCounted,
      isComplete,
      rows,
      modes,
      maxFi,
      sumFi,
      sumHi,
      sumHiPct
    }
  }, [sampleData, currentDataset])

  // Datos de la categoría activa seleccionada en el visualizador
  const activeCategoryData = useMemo(() => {
    return stats.rows.find((r) => r.category.key === selectedCatKey) || stats.rows[0]
  }, [stats, selectedCatKey])

  // Secuencia de celdas para navegación en Modo Reto
  const cellSequence = useMemo(() => {
    const seq: { catKey: string; field: 'fi' | 'hi' | 'hiPct' }[] = []
    currentDataset.categories.forEach((c) => {
      seq.push({ catKey: c.key, field: 'fi' })
      seq.push({ catKey: c.key, field: 'hi' })
      seq.push({ catKey: c.key, field: 'hiPct' })
    })
    return seq
  }, [currentDataset])

  // Celda activa efectiva (con fallback al primer campo de la primera categoría)
  const currentActiveRetoCell = useMemo(() => {
    if (activeRetoCell) return activeRetoCell
    if (cellSequence.length > 0) return cellSequence[0]
    return null
  }, [activeRetoCell, cellSequence])

  // Categoría de la celda activa
  const activeRetoCategory = useMemo(() => {
    const key = currentActiveRetoCell?.catKey || currentDataset.categories[0].key
    return currentDataset.categories.find((c) => c.key === key) || currentDataset.categories[0]
  }, [currentActiveRetoCell, currentDataset])

  // Valor actual de la celda activa
  const currentRetoValue = useMemo(() => {
    if (!currentActiveRetoCell) return ''
    return retoInputs[currentActiveRetoCell.catKey]?.[currentActiveRetoCell.field] || ''
  }, [currentActiveRetoCell, retoInputs])

  // Navegación: Celda siguiente
  const goToNextRetoCell = useCallback(() => {
    setActiveRetoCell((current) => {
      const active = current || cellSequence[0]
      if (!active) return null
      const idx = cellSequence.findIndex(
        (c) => c.catKey === active.catKey && c.field === active.field
      )
      if (idx >= 0 && idx < cellSequence.length - 1) {
        return cellSequence[idx + 1]
      }
      return active
    })
  }, [cellSequence])

  // Navegación: Celda anterior
  const goToPrevRetoCell = useCallback(() => {
    setActiveRetoCell((current) => {
      const active = current || cellSequence[0]
      if (!active) return null
      const idx = cellSequence.findIndex(
        (c) => c.catKey === active.catKey && c.field === active.field
      )
      if (idx > 0) {
        return cellSequence[idx - 1]
      }
      return active
    })
  }, [cellSequence])

  // Manejador del Teclado Virtual Numérico
  const handleVirtualKey = useCallback((key: string) => {
    setActiveRetoCell((current) => {
      const active = current || cellSequence[0]
      if (!active) return current

      const { catKey, field } = active
      setRetoInputs((prev) => {
        const rowVal = prev[catKey] || { fi: '', hi: '', hiPct: '' }
        const cur = rowVal[field] || ''
        let nextVal = cur

        if (key === 'BACKSPACE') {
          nextVal = cur.slice(0, -1)
        } else if (key === 'CLEAR') {
          nextVal = ''
        } else if (key === '.') {
          if (!cur.includes('.')) {
            nextVal = cur === '' ? '0.' : cur + '.'
          }
        } else if (key === '%') {
          if (field === 'hiPct' && !cur.includes('%')) {
            nextVal = cur + '%'
          }
        } else if (/^[0-9]$/.test(key)) {
          if (cur.length < 6) {
            nextVal = cur + key
          }
        }

        return {
          ...prev,
          [catKey]: {
            ...rowVal,
            [field]: nextVal
          }
        }
      })

      return active
    })
  }, [cellSequence])

  // Escuchar teclado físico (para laptops y desktop)
  useEffect(() => {
    if (exerciseMode !== 'reto') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input que no sea de reto
      if (e.target instanceof HTMLInputElement && !e.target.readOnly) return

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        handleVirtualKey(e.key)
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault()
        handleVirtualKey('.')
      } else if (e.key === '%') {
        e.preventDefault()
        handleVirtualKey('%')
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleVirtualKey('BACKSPACE')
      } else if (e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault()
        handleVirtualKey('CLEAR')
      } else if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        goToNextRetoCell()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevRetoCell()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exerciseMode, handleVirtualKey, goToNextRetoCell, goToPrevRetoCell])

  // Totales calculados a partir de los inputs del usuario en Modo Reto
  const userTotals = useMemo(() => {
    let sumFi = 0
    let sumHi = 0
    let sumHiPct = 0
    let hasAnyInput = false

    currentDataset.categories.forEach((c) => {
      const input = retoInputs[c.key]
      if (input) {
        if (input.fi) {
          sumFi += parseInt(input.fi, 10) || 0
          hasAnyInput = true
        }
        if (input.hi) {
          sumHi += parseFloat(input.hi.replace(',', '.')) || 0
          hasAnyInput = true
        }
        if (input.hiPct) {
          sumHiPct += parseFloat(input.hiPct.replace('%', '').replace(',', '.')) || 0
          hasAnyInput = true
        }
      }
    })

    return { sumFi, sumHi, sumHiPct, hasAnyInput }
  }, [currentDataset, retoInputs])

  // Clase de resaltado para las celdas de la tabla en Modo Reto
  const getRetoInputClass = useCallback(
    (catKey: string, field: 'fi' | 'hi' | 'hiPct') => {
      const isActive =
        currentActiveRetoCell?.catKey === catKey && currentActiveRetoCell?.field === field
      const val = (retoInputs[catKey]?.[field] || '').trim()

      if (retoFeedback?.checked) {
        const row = stats.rows.find((r) => r.category.key === catKey)
        if (!row) return ''
        let isCorrect = false
        if (field === 'fi') {
          isCorrect = parseInt(val, 10) === row.totalReal
        } else if (field === 'hi') {
          const parsed = parseFloat(val.replace(',', '.'))
          isCorrect = !isNaN(parsed) && Math.abs(parsed - row.totalReal / SAMPLE_SIZE) < 0.02
        } else {
          const parsed = parseFloat(val.replace('%', '').replace(',', '.'))
          isCorrect = !isNaN(parsed) && Math.abs(parsed - (row.totalReal / SAMPLE_SIZE) * 100) < 0.5
        }

        return isCorrect
          ? 'border-emerald-500 bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-500 font-bold'
          : 'border-rose-500 bg-rose-500/25 text-rose-300 ring-2 ring-rose-500 font-bold animate-pulse'
      }

      if (isActive) {
        return 'ring-2 ring-amber-400 border-amber-400 bg-amber-500/30 text-amber-200 font-black shadow-md'
      }

      return isDark
        ? 'bg-slate-800/90 border-white/20 text-white hover:border-amber-400/50'
        : 'bg-white border-slate-300 text-slate-900 hover:border-amber-500/50 shadow-xs'
    },
    [currentActiveRetoCell, retoInputs, retoFeedback, stats.rows, isDark]
  )

  // Verificar respuestas del reto
  const handleCheckReto = useCallback(() => {
    let correct = 0
    let total = 0

    stats.rows.forEach((r) => {
      const input = retoInputs[r.category.key] || { fi: '', hi: '', hiPct: '' }

      // Verificar fi
      total++
      if (parseInt(input.fi.trim(), 10) === r.totalReal) correct++

      // Verificar hi (fracción o decimal con tolerancia)
      total++
      const expectedHi = r.totalReal / SAMPLE_SIZE
      const parsedHi = parseFloat(input.hi.replace(',', '.').trim())
      if (!isNaN(parsedHi) && Math.abs(parsedHi - expectedHi) < 0.02) correct++

      // Verificar hi%
      total++
      const expectedPct = (r.totalReal / SAMPLE_SIZE) * 100
      const parsedPct = parseFloat(input.hiPct.replace('%', '').replace(',', '.').trim())
      if (!isNaN(parsedPct) && Math.abs(parsedPct - expectedPct) < 0.5) correct++
    })

    setRetoFeedback({ checked: true, correctCount: correct, totalFields: total })
  }, [stats.rows, retoInputs])

  // Diccionario rápido de categorías
  const catMap = useMemo(() => {
    const map = new Map<string, CategoryDef>()
    currentDataset.categories.forEach((c) => map.set(c.key, c))
    return map
  }, [currentDataset])

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden select-none font-sans ${
        isDark ? 'bg-[#080c18] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── 1. Header Principal (h-9 a lg:h-11) ──────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? 'bg-white/10 text-white/80 hover:bg-white/15'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-base lg:text-lg">📊</span>
            <h1 className="text-xs lg:text-sm font-black tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              Tablas de Frecuencias
            </h1>
            <span
              className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                activeVarType === 'cualitativa'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              Datos No Agrupados
            </span>
          </div>
        </div>

        {/* Selector de modo y botones de ayuda */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          {/* Alternador de Modo: Explorar vs Reto */}
          <div
            className={`flex items-center p-0.5 rounded-lg border text-[11px] font-bold ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                setExerciseMode('explorar')
                setRetoFeedback(null)
                setActiveRetoCell(null)
              }}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                exerciseMode === 'explorar'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                  : isDark
                  ? 'text-white/60 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo interactivo con conteo automático de palotes y frecuencias"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Guiado</span>
            </button>
            <button
              onClick={() => {
                setExerciseMode('reto')
                setRetoFeedback(null)
                setActiveRetoCell({ catKey: currentDataset.categories[0].key, field: 'fi' })
                if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
                setIsAutoCounting(false)
              }}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                exerciseMode === 'reto'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : isDark
                  ? 'text-white/60 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Poner a prueba: calcula tú mismo las frecuencias y completa la tabla con el teclado virtual"
            >
              <Trophy className="h-3 w-3" />
              <span className="hidden sm:inline">Reto</span>
            </button>
          </div>

          {/* Botón de Ayuda Pedagógica */}
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-all cursor-pointer"
            title="Guía conceptual y fórmulas de tablas de frecuencia"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Barra de Control y Configuración (h-7 a lg:h-9) ────────────────── */}
      <div
        className={`flex shrink-0 items-center justify-between gap-1 lg:gap-2.5 border-b px-2 lg:px-4 py-0.5 lg:py-1 text-[10px] lg:text-xs overflow-x-auto no-scrollbar ${
          isDark ? 'bg-[#0d1424] border-white/5' : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        {/* Selector de Tipo de Variable */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold opacity-60 mr-0.5">Tipo:</span>
          <button
            onClick={() => handleSelectType('cualitativa')}
            className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
              activeVarType === 'cualitativa'
                ? 'bg-sky-600 text-white shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/70 hover:bg-white/10'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Cualitativa
          </button>
          <button
            onClick={() => handleSelectType('cuantitativa')}
            className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
              activeVarType === 'cuantitativa'
                ? 'bg-amber-600 text-white shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/70 hover:bg-white/10'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Cuantitativa
          </button>
        </div>

        {/* Selector de Situación / Contexto */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold opacity-60 mr-0.5 hidden sm:inline">Tema:</span>
          <div className="flex items-center gap-1">
            {DATASETS.filter((d) => d.type === activeVarType).map((ds) => {
              const isSelected = datasetId === ds.id
              const isCual = activeVarType === 'cualitativa'
              return (
                <button
                  key={ds.id}
                  onClick={() => handleSelectDataset(ds.id)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] lg:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? isCual
                        ? isDark
                          ? 'bg-sky-500/30 text-sky-200 font-black ring-1 ring-sky-400/50'
                          : 'bg-sky-600 text-white font-black shadow-xs ring-1 ring-sky-600'
                        : isDark
                          ? 'bg-amber-500/30 text-amber-200 font-black ring-1 ring-amber-400/50'
                          : 'bg-amber-600 text-white font-black shadow-xs ring-1 ring-amber-600'
                      : isDark
                      ? 'bg-white/5 text-white/70 hover:bg-white/10'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-xs'
                  }`}
                  style={isSelected && !isDark ? { color: '#ffffff' } : undefined}
                >
                  <span>{ds.categories[0].icon}</span>
                  <span>{ds.variableName.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Acciones de la Muestra */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Alternador de Vista (Solo en pantallas chicas/móvil o para cambiar enfoque) */}
          <div className={`flex items-center rounded-md border p-0.5 gap-0.5 lg:hidden ${isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-300 bg-slate-100'}`}>
            <button
              onClick={() => setViewMode('split')}
              className={`px-1 py-0.5 rounded text-[9px] ${viewMode === 'split' ? 'bg-sky-500 text-slate-950 font-bold' : isDark ? 'text-white/60' : 'text-slate-600'}`}
              title="Vista dual combinada"
            >
              Dual
            </button>
            <button
              onClick={() => setViewMode('conteo')}
              className={`px-1 py-0.5 rounded text-[9px] ${viewMode === 'conteo' ? 'bg-sky-500 text-slate-950 font-bold' : isDark ? 'text-white/60' : 'text-slate-600'}`}
              title="Ver solo datos desorganizados y conteo"
            >
              Datos
            </button>
            <button
              onClick={() => setViewMode('tabla')}
              className={`p-0.5 rounded ${viewMode === 'tabla' ? 'bg-sky-500 text-slate-950 font-bold' : isDark ? 'text-white/60' : 'text-slate-600'}`}
              title="Ver tabla de frecuencias"
            >
              <TableIcon className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode('grafico')}
              className={`p-0.5 rounded ${viewMode === 'grafico' ? 'bg-sky-500 text-slate-950 font-bold' : isDark ? 'text-white/60' : 'text-slate-600'}`}
              title="Ver gráfico de barras"
            >
              <BarChart3 className="h-3 w-3" />
            </button>
          </div>

          {/* Toggle Frecuencia Acumulada para cuantitativa */}
          {activeVarType === 'cuantitativa' && (
            <button
              onClick={() => setShowCumulative((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded text-[9.5px] lg:text-[10px] font-bold transition-all cursor-pointer hidden md:flex items-center gap-1 ${
                showCumulative
                  ? 'bg-purple-600 text-white'
                  : isDark
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}
              title="Mostrar u ocultar la columna de Frecuencia Absoluta Acumulada (Fi)"
            >
              <span>Fi acum.</span>
            </button>
          )}

          {/* Botón Ordenar / Desordenar */}
          <button
            onClick={() => setIsSorted((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded-md text-[10px] lg:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isSorted
                ? 'bg-emerald-600 text-white'
                : isDark
                ? 'bg-white/10 text-white/80 hover:bg-white/15'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title={isSorted ? 'Ver en desorden original' : 'Ordenar fichas por categorías para verificar el conteo'}
          >
            <ArrowUpDown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden xl:inline">{isSorted ? 'Desordenar' : 'Ordenar'}</span>
          </button>

          {/* Botón Nueva Muestra */}
          <button
            onClick={handleNewSample}
            className={`px-1.5 py-0.5 rounded-md text-[10px] lg:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30'
                : 'bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-200'
            }`}
            title="Generar 20 datos nuevos al azar"
          >
            <Shuffle className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden xl:inline">Nueva</span>
          </button>

          {/* Botón Reiniciar Conteo */}
          <button
            onClick={handleResetCount}
            className={`p-1 lg:px-1.5 lg:py-0.5 rounded-md text-[10px] lg:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200'
            }`}
            title="Volver a contar las mismas fichas desde cero"
          >
            <RotateCcw className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden xl:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* ── 3. Área de Trabajo Central (CERO SCROLL) ────────────────────────── */}
      <main className="flex-1 min-h-0 flex flex-col p-1.5 lg:p-3 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-1.5 lg:gap-3 overflow-hidden">
          {/* ════════════════════════════════════════════════════════════════════
              PANEL IZQUIERDO: DINÁMICO SEGÚN EL PASO ACTIVO
              - Paso 1: Datos desorganizados y conteo interactivo con palotes
              - Paso 2: Visualizador Parte-Todo y obtención decimal de hi
              - Paso 3: Visualizador de Porcentaje sobre 100 (hi%)
          ════════════════════════════════════════════════════════════════════ */}
          <section
            className={`flex-1 min-w-0 min-h-0 rounded-xl border flex flex-col overflow-hidden transition-all ${
              viewMode === 'tabla' || viewMode === 'grafico' ? 'hidden md:flex' : 'flex'
            } ${
              isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* ── MODO RETO: TECLADO VIRTUAL NUMÉRICO Y MINI MUESTRA ── */}
            {exerciseMode === 'reto' ? (
              <div className="flex-1 min-h-0 flex flex-col justify-between p-1.5 lg:p-2.5 overflow-hidden gap-1 lg:gap-1.5">
                {/* 1. Cabecera del Panel Reto */}
                <div
                  className={`px-2 py-0.5 lg:py-1 rounded-md border shrink-0 flex items-center justify-between text-[10.5px] lg:text-xs ${
                    isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-amber-500" />
                    <span className="font-black text-amber-500 text-[10.5px] lg:text-xs">Modo Reto: Teclado Numérico</span>
                  </div>
                  <span className="text-[9.5px] lg:text-[10px] opacity-70 hidden sm:inline">
                    Llena la tabla usando este teclado
                  </span>
                </div>

                {/* 2. Mini Muestra de 20 datos en 10 columnas x 2 filas (Ultra Compacta: CERO SCROLL) */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <div className="flex items-center justify-between text-[9px] lg:text-[10px] font-semibold opacity-70 px-0.5">
                    <span>Muestra (20 datos) • Toca para tachar al contar:</span>
                    <span className="font-mono">
                      {displayedItems.filter((it) => it.counted).length}/20 tachados
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-0.5 lg:gap-1 p-0.5 lg:p-1 rounded-md border bg-slate-950/20 border-white/5">
                    {displayedItems.map((item) => {
                      const cat = catMap.get(item.categoryKey)
                      if (!cat) return null
                      const isTargetCat = currentActiveRetoCell?.catKey === item.categoryKey

                      return (
                        <button
                          key={`reto-grid-${item.id}`}
                          onClick={() => toggleItemCount(item.id)}
                          className={`relative h-6 lg:h-7 rounded border text-center transition-all cursor-pointer flex flex-col items-center justify-center p-0.5 ${
                            item.counted
                              ? 'opacity-40 grayscale'
                              : isTargetCat
                              ? 'ring-1.5 ring-amber-400 scale-[1.04] shadow-xs'
                              : 'opacity-85'
                          } ${
                            isDark ? `${cat.color.darkBg} ${cat.color.darkBorder}` : `${cat.color.bg} ${cat.color.border}`
                          }`}
                          style={{ touchAction: 'manipulation' }}
                          title={item.counted ? `Contado: ${cat.label} (pulsa para reactivar)` : `${cat.label} (pulsa para tachar)`}
                        >
                          <span className="text-xs lg:text-sm leading-none">{cat.icon}</span>
                          {item.counted && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-[85%] h-[2px] bg-rose-500 rounded-full rotate-[-25deg]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Visor de la Celda Activa (Display LCD) */}
                <div
                  className={`px-2 py-0.5 lg:py-1 rounded-md border flex items-center justify-between font-mono shrink-0 ${
                    isDark
                      ? 'bg-slate-950/80 border-amber-500/30'
                      : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm lg:text-base">{activeRetoCategory.icon}</span>
                    <span className="text-[10px] lg:text-xs font-black truncate">{activeRetoCategory.label}</span>
                    <span
                      className={`text-[8px] lg:text-[9px] px-1 py-0.2 rounded font-black uppercase tracking-wider ${
                        currentActiveRetoCell?.field === 'fi'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : currentActiveRetoCell?.field === 'hi'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {currentActiveRetoCell?.field === 'fi'
                        ? 'fi (conteo)'
                        : currentActiveRetoCell?.field === 'hi'
                        ? 'hi = fi/20'
                        : 'hi% = hi×100'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pl-1">
                    <div
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded border min-w-[55px] justify-end ${
                        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'
                      }`}
                    >
                      <span className="text-xs lg:text-sm font-black font-mono text-amber-500">
                        {currentRetoValue || <span className="opacity-30 text-[9px] font-normal">?</span>}
                      </span>
                      <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* 4. Teclado Virtual Numérico (Touch friendly, 4 columnas x 4 filas) */}
                <div className="w-full shrink-0">
                  <div className="grid grid-cols-4 gap-1 lg:gap-1.5 w-full">
                    {/* Fila 1 */}
                    <button
                      onClick={() => handleVirtualKey('7')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      7
                    </button>
                    <button
                      onClick={() => handleVirtualKey('8')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      8
                    </button>
                    <button
                      onClick={() => handleVirtualKey('9')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      9
                    </button>
                    <button
                      onClick={() => handleVirtualKey('BACKSPACE')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/30' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title="Borrar último dígito"
                    >
                      ⌫
                    </button>

                    {/* Fila 2 */}
                    <button
                      onClick={() => handleVirtualKey('4')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      4
                    </button>
                    <button
                      onClick={() => handleVirtualKey('5')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      5
                    </button>
                    <button
                      onClick={() => handleVirtualKey('6')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      6
                    </button>
                    <button
                      onClick={() => handleVirtualKey('CLEAR')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title="Limpiar casilla"
                    >
                      C
                    </button>

                    {/* Fila 3 */}
                    <button
                      onClick={() => handleVirtualKey('1')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      1
                    </button>
                    <button
                      onClick={() => handleVirtualKey('2')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      2
                    </button>
                    <button
                      onClick={() => handleVirtualKey('3')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      3
                    </button>
                    <button
                      onClick={goToPrevRetoCell}
                      className={`h-7 lg:h-9 rounded-md font-bold text-[11px] lg:text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title="Casilla anterior"
                    >
                      ⬅ Ant.
                    </button>

                    {/* Fila 4 */}
                    <button
                      onClick={() => handleVirtualKey('0')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-bold text-xs lg:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleVirtualKey('.')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-black text-sm lg:text-base flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title="Punto decimal"
                    >
                      .
                    </button>
                    <button
                      onClick={() => handleVirtualKey('%')}
                      className={`h-7 lg:h-9 rounded-md font-mono font-black text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-xs border ${
                        isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-white/10' : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title="Símbolo de porcentaje"
                    >
                      %
                    </button>
                    <button
                      onClick={goToNextRetoCell}
                      className="h-7 lg:h-9 rounded-md font-black text-[11px] lg:text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none shadow-md bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950"
                      style={{ touchAction: 'manipulation' }}
                      title="Avanzar a la siguiente casilla"
                    >
                      Sig. ➜
                    </button>
                  </div>
                </div>

                {/* 5. Acciones al pie: Comprobar / Feedback */}
                <div className="shrink-0 flex items-center justify-between gap-1.5 pt-0.5 border-t border-white/5">
                  <button
                    onClick={() => {
                      setRetoInputs({})
                      setRetoFeedback(null)
                      if (cellSequence.length > 0) setActiveRetoCell(cellSequence[0])
                    }}
                    className="px-2 py-0.5 rounded text-[9.5px] lg:text-[10px] font-bold opacity-60 hover:opacity-100 transition-all cursor-pointer"
                    title="Borrar todas las respuestas del reto"
                  >
                    Limpiar todo
                  </button>

                  <button
                    onClick={handleCheckReto}
                    className="flex-1 py-1 px-2.5 rounded-md text-[11px] lg:text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                    <span>Comprobar Respuestas</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── ESTADO A: PASO 1 - DATOS DESORGANIZADOS Y CONTEO ── */}
                {tableStage === 'conteo' && (
              <>
                {/* Cabecera del Panel de Conteo */}
                <div
                  className={`px-2.5 py-1.5 border-b shrink-0 flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-sky-500 uppercase tracking-wider text-[11px]">
                      1. Datos Desorganizados
                    </span>
                    <span className="text-[11px] opacity-60 truncate">
                      ({currentDataset.title})
                    </span>
                  </div>

                  {/* Botón de auto-conteo animado paso a paso y control de velocidad */}
                  {exerciseMode === 'explorar' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleAutoCount}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isAutoCounting
                            ? 'bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-300'
                            : stats.isComplete
                            ? 'opacity-40 cursor-not-allowed bg-slate-700 text-slate-300'
                            : isDark
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'
                        }`}
                        disabled={stats.isComplete && !isAutoCounting}
                        title={isAutoCounting ? 'Pausar el proceso' : 'Iniciar conteo paso a paso a ritmo pausado'}
                      >
                        {isAutoCounting ? (
                          <>
                            <Pause className="h-3 w-3" /> <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> <span>Paso a paso</span>
                          </>
                        )}
                      </button>

                      {/* Selector de velocidad pausada */}
                      <button
                        onClick={() => {
                          const nextSpeed = autoCountSpeed === 'lento' ? 'medio' : 'lento'
                          setAutoCountSpeed(nextSpeed)
                          if (isAutoCounting) {
                            if (autoCountTimerRef.current) clearInterval(autoCountTimerRef.current)
                            setIsAutoCounting(false)
                            setActiveAutoCountId(null)
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          autoCountSpeed === 'lento'
                            ? isDark
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                            : isDark
                            ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                            : 'bg-sky-50 border-sky-200 text-sky-800'
                        }`}
                        title="Alternar velocidad del conteo paso a paso"
                      >
                        {autoCountSpeed === 'lento' ? '🐢 Lento (1.3s)' : '🐇 Medio (0.8s)'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-barra de progreso del conteo */}
                <div
                  className={`px-3 py-1 border-b shrink-0 flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-100/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">Progreso de conteo:</span>
                    <span
                      className={`font-mono font-black ${
                        stats.isComplete ? 'text-emerald-500' : 'text-sky-500'
                      }`}
                    >
                      {stats.totalCounted} de {SAMPLE_SIZE} datos
                    </span>
                    {stats.isComplete && (
                      <span className="inline-flex items-center text-emerald-500 font-bold gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> ¡Completado!
                      </span>
                    )}
                  </div>

                  <div className="w-24 sm:w-32 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(stats.totalCounted / SAMPLE_SIZE) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Rejilla de Fichas de Datos Desorganizados (4 filas x 5 columnas = 20 datos) */}
                <div className="flex-1 min-h-0 p-1 lg:p-2.5 overflow-hidden flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-1 lg:gap-1.5 w-full max-w-[480px]">
                    {displayedItems.map((item) => {
                      const cat = catMap.get(item.categoryKey)
                      if (!cat) return null
                      const isCurrentlyTargeted = activeAutoCountId === item.id
                      const isHighlighted = highlightedCategory === item.categoryKey

                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItemCount(item.id)}
                          className={`relative flex flex-col items-center justify-center p-0.5 lg:p-1.5 rounded-md border text-center transition-all cursor-pointer active:scale-95 ${
                            item.counted
                              ? isDark
                                ? 'bg-slate-900/60 border-white/5 opacity-40 scale-95'
                                : 'bg-slate-100 border-slate-200 opacity-45 scale-95'
                              : isDark
                              ? `${cat.color.darkBg} ${cat.color.darkBorder} hover:scale-105 shadow-xs`
                              : `${cat.color.bg} ${cat.color.border} hover:scale-105 shadow-xs`
                          } ${
                            isCurrentlyTargeted
                              ? 'ring-2 ring-amber-400 scale-105 shadow-lg z-10 animate-bounce'
                              : isHighlighted && item.counted
                              ? 'ring-1.5 ring-emerald-400 ring-offset-1 ring-offset-slate-900 scale-105'
                              : ''
                          }`}
                          style={{ touchAction: 'manipulation' }}
                          title={item.counted ? 'Dato ya contado. Pulsa para destachar' : `Dato sin contar: ${cat.label}. Pulsa para tachar y sumar al conteo`}
                        >
                          {/* Icono del dato */}
                          <span className="text-sm lg:text-xl leading-none mb-0.5 filter drop-shadow-xs">
                            {cat.icon}
                          </span>

                          {/* Etiqueta del dato */}
                          <span
                            className={`text-[8px] lg:text-[10px] font-bold leading-tight truncate w-full ${
                              isDark ? cat.color.darkText : cat.color.text
                            }`}
                          >
                            {cat.label}
                          </span>

                          {/* Marca visual de tachado / contada */}
                          {item.counted && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              {/* Línea diagonal de tachado */}
                              <div className="absolute w-[80%] h-[1.5px] lg:h-[2.5px] bg-rose-500 rounded-full rotate-[-25deg] shadow-xs" />
                              {/* Badge de check pequeño en esquina */}
                              <div className="absolute top-0.5 right-0.5 bg-emerald-500 text-slate-950 rounded-full w-3 h-3 lg:w-3.5 lg:h-3.5 flex items-center justify-center text-[7.5px] lg:text-[9px] font-black">
                                ✓
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mini Guía y Acciones al pie del panel de conteo */}
                <div
                  className={`p-1 lg:p-1.5 border-t shrink-0 flex items-center justify-between text-[9.5px] lg:text-[11px] ${
                    isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 opacity-70">
                    <span>💡</span>
                    <span>Toca cada dato para tacharlo y registrar su palote en la tabla.</span>
                  </div>

                  {!stats.isComplete && (
                    <button
                      onClick={() =>
                        setSampleData((prev) => prev.map((it) => ({ ...it, counted: true })))
                      }
                      className={`px-1.5 py-0.5 rounded text-[8.5px] lg:text-[10px] font-bold transition-all cursor-pointer ${
                        isDark
                          ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                          : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                      }`}
                      title="Marcar todos los datos como contados de inmediato"
                    >
                      Tachar todos
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── ESTADO B: PASO 2 - VISUALIZADOR PARTE - TODO (hi) ── */}
            {tableStage === 'calcular_hi' && (
              <>
                {/* Cabecera del Paso 2 */}
                <div
                  className={`px-2.5 py-1.5 border-b shrink-0 flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-emerald-400 text-xs">
                      Paso 2: Relación Parte - Todo (hi)
                    </span>
                  </div>
                  <button
                    onClick={() => setTableStage('conteo')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/15 text-slate-300 transition-all cursor-pointer"
                  >
                    ⬅ Ver Conteo
                  </button>
                </div>

                {/* Selector de Categoría a Analizar */}
                <div
                  className={`px-2 py-1 border-b shrink-0 flex items-center gap-1 overflow-x-auto no-scrollbar ${
                    isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-60 shrink-0">Ver:</span>
                  {stats.rows.map((r) => (
                    <button
                      key={r.category.key}
                      onClick={() => setSelectedCatKey(r.category.key)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        selectedCatKey === r.category.key
                          ? isDark
                            ? `${r.category.color.darkBg} ${r.category.color.darkBorder} ${r.category.color.darkText} ring-2 ring-emerald-400 font-black scale-105`
                            : `${r.category.color.bg} ${r.category.color.border} ${r.category.color.text} ring-2 ring-emerald-500 font-black scale-105`
                          : isDark
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{r.category.icon}</span>
                      <span>{r.category.label}</span>
                      <span className="font-mono text-[10px] px-1 rounded bg-black/20 dark:bg-white/20">
                        {r.fi}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Cuerpo del Visualizador: Las 20 fichas reales con solo la categoría activa encendida */}
                <div className="flex-1 min-h-0 p-2 sm:p-3 flex flex-col justify-between overflow-y-auto">
                  {/* Rejilla de las 20 fichas de la muestra */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[420px]">
                      {displayedItems.map((item) => {
                        const cat = catMap.get(item.categoryKey)
                        if (!cat) return null
                        const isActive = item.categoryKey === selectedCatKey

                        return (
                          <div
                            key={`step2-item-${item.id}`}
                            className={`relative flex flex-col items-center justify-center p-0.5 lg:p-1.5 rounded-md border text-center transition-all duration-300 ${
                              isActive
                                ? isDark
                                  ? `${cat.color.darkBg} ${cat.color.darkBorder} ${cat.color.darkText} ring-2 ring-emerald-400 scale-105 shadow-md z-10 opacity-100 font-black`
                                  : `${cat.color.bg} ${cat.color.border} ${cat.color.text} ring-2 ring-emerald-500 scale-105 shadow-md z-10 opacity-100 font-black`
                                : isDark
                                ? 'bg-slate-900/40 border-white/5 opacity-25 grayscale scale-95'
                                : 'bg-slate-100 border-slate-200 opacity-25 grayscale scale-95'
                            }`}
                          >
                            <span className="text-sm lg:text-xl leading-none mb-0.5">
                              {cat.icon}
                            </span>
                            <span className="text-[8px] lg:text-[10px] font-bold leading-tight truncate w-full">
                              {cat.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tarjeta Limpia de la Fracción Vertical Parte / Todo */}
                  <div
                    className={`mt-1 lg:mt-2 p-1.5 lg:p-2.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                      isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 lg:gap-5 py-0.5">
                      {/* Fracción con etiquetas Parte / Todo */}
                      <div className="flex flex-col items-center text-[10px] lg:text-xs font-bold font-sans">
                        <span className="text-emerald-400 font-black leading-none">
                          Parte ({activeCategoryData.category.label})
                        </span>
                        <div className="w-16 lg:w-24 h-[1.5px] bg-slate-400 dark:bg-slate-500 my-0.5"></div>
                        <span className="text-slate-400 leading-none">
                          Todo (Total)
                        </span>
                      </div>

                      <span className="text-sm lg:text-lg font-bold opacity-40 font-sans">=</span>

                      {/* Fracción numérica con fi / N */}
                      <div className="flex flex-col items-center font-mono font-black text-xs lg:text-sm">
                        <span className="text-sky-400 leading-tight">
                          {activeCategoryData.fi}
                        </span>
                        <div className="w-8 lg:w-12 h-[1.5px] bg-slate-400 dark:bg-slate-500 my-0.5"></div>
                        <span className="text-slate-300 leading-tight">
                          {SAMPLE_SIZE}
                        </span>
                      </div>

                      <span className="text-sm lg:text-lg font-bold opacity-40 font-sans">=</span>

                      {/* Resultado decimal hi */}
                      <div className="flex flex-col items-center">
                        <span className="text-xs lg:text-sm font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                          {activeCategoryData.hi.toFixed(2)}
                        </span>
                        <span className="text-[8px] lg:text-[9px] text-emerald-400 font-sans font-bold mt-0.5">
                          hi (decimal)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie del Paso 2 con botones de avance */}
                <div
                  className={`p-2 border-t shrink-0 flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => {
                      const currIdx = stats.rows.findIndex((r) => r.category.key === selectedCatKey)
                      const nextIdx = (currIdx + 1) % stats.rows.length
                      setSelectedCatKey(stats.rows[nextIdx].category.key)
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Siguiente categoría</span>
                    <span>➜</span>
                  </button>

                  <button
                    onClick={() => setTableStage('calcular_hipct')}
                    className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Paso 3: Convertir a Porcentaje (hi %)</span>
                    <span>👉</span>
                  </button>
                </div>
              </>
            )}

            {/* ── ESTADO C: PASO 3 - VISUALIZADOR DE PORCENTAJE (hi %) ── */}
            {tableStage === 'calcular_hipct' && (
              <>
                {/* Cabecera del Paso 3 */}
                <div
                  className={`px-2.5 py-1.5 border-b shrink-0 flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-amber-400 text-xs">
                      Paso 3: Frecuencia Porcentual (hi %)
                    </span>
                  </div>
                  <button
                    onClick={() => setTableStage('calcular_hi')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/15 text-slate-300 transition-all cursor-pointer"
                  >
                    ⬅ Paso 2 (hi)
                  </button>
                </div>

                {/* Selector de Categoría en Paso 3 */}
                <div
                  className={`px-2 py-1 border-b shrink-0 flex items-center gap-1 overflow-x-auto no-scrollbar ${
                    isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-60 shrink-0">Ver:</span>
                  {stats.rows.map((r) => (
                    <button
                      key={r.category.key}
                      onClick={() => setSelectedCatKey(r.category.key)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        selectedCatKey === r.category.key
                          ? isDark
                            ? `${r.category.color.darkBg} ${r.category.color.darkBorder} ${r.category.color.darkText} ring-2 ring-amber-400 font-black scale-105`
                            : `${r.category.color.bg} ${r.category.color.border} ${r.category.color.text} ring-2 ring-amber-500 font-black scale-105`
                          : isDark
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{r.category.icon}</span>
                      <span>{r.category.label}</span>
                      <span className="font-mono text-[10px] px-1 rounded bg-black/20 dark:bg-white/20">
                        {r.hiPct.toFixed(0)}%
                      </span>
                    </button>
                  ))}
                </div>

                {/* Cuerpo del Visualizador: Las 20 fichas reales con solo la categoría activa encendida */}
                <div className="flex-1 min-h-0 p-2 sm:p-3 flex flex-col justify-between overflow-y-auto">
                  {/* Rejilla de las 20 fichas de la muestra */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <div className="grid grid-cols-5 gap-1 lg:gap-1.5 w-full max-w-[420px]">
                      {displayedItems.map((item) => {
                        const cat = catMap.get(item.categoryKey)
                        if (!cat) return null
                        const isActive = item.categoryKey === selectedCatKey

                        return (
                          <div
                            key={`step3-item-${item.id}`}
                            className={`relative flex flex-col items-center justify-center p-0.5 lg:p-1.5 rounded-md border text-center transition-all duration-300 ${
                              isActive
                                ? isDark
                                  ? `${cat.color.darkBg} ${cat.color.darkBorder} ${cat.color.darkText} ring-2 ring-amber-400 scale-105 shadow-md z-10 opacity-100 font-black`
                                  : `${cat.color.bg} ${cat.color.border} ${cat.color.text} ring-2 ring-amber-500 scale-105 shadow-md z-10 opacity-100 font-black`
                                : isDark
                                ? 'bg-slate-900/40 border-white/5 opacity-25 grayscale scale-95'
                                : 'bg-slate-100 border-slate-200 opacity-25 grayscale scale-95'
                            }`}
                          >
                            <span className="text-sm lg:text-xl leading-none mb-0.5">
                              {cat.icon}
                            </span>
                            <span className="text-[8px] lg:text-[10px] font-bold leading-tight truncate w-full">
                              {cat.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tarjeta Limpia de la Fracción Vertical x 100 = Porcentaje */}
                  <div
                    className={`mt-1 lg:mt-2 p-1.5 lg:p-2.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                      isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 lg:gap-5 py-0.5">
                      {/* Fracción con etiquetas Parte / Todo */}
                      <div className="flex flex-col items-center text-[10px] lg:text-xs font-bold font-sans">
                        <span className="text-amber-400 font-black leading-none">
                          Parte ({activeCategoryData.category.label})
                        </span>
                        <div className="w-16 lg:w-24 h-[1.5px] bg-slate-400 dark:bg-slate-500 my-0.5"></div>
                        <span className="text-slate-400 leading-none">
                          Todo (Total)
                        </span>
                      </div>

                      <span className="text-sm lg:text-lg font-bold opacity-40 font-sans">=</span>

                      {/* Fracción numérica con fi / N multiplicada por 100 */}
                      <div className="flex items-center gap-1 font-mono font-black text-xs lg:text-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-sky-400 leading-tight">
                            {activeCategoryData.fi}
                          </span>
                          <div className="w-8 lg:w-12 h-[1.5px] bg-slate-400 dark:bg-slate-500 my-0.5"></div>
                          <span className="text-slate-300 leading-tight">
                            {SAMPLE_SIZE}
                          </span>
                        </div>
                        <span className="text-xs lg:text-sm font-bold opacity-75">× 100</span>
                      </div>

                      <span className="text-sm lg:text-lg font-bold opacity-40 font-sans">=</span>

                      {/* Resultado Porcentual hi % */}
                      <div className="flex flex-col items-center">
                        <span className="text-xs lg:text-sm font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                          {activeCategoryData.hiPct.toFixed(0)}%
                        </span>
                        <span className="text-[8px] lg:text-[9px] text-amber-400 font-sans font-bold mt-0.5">
                          hi % (porcentaje)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie del Paso 3 */}
                <div
                  className={`p-2 border-t shrink-0 flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-slate-900/80 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => {
                      const currIdx = stats.rows.findIndex((r) => r.category.key === selectedCatKey)
                      const nextIdx = (currIdx + 1) % stats.rows.length
                      setSelectedCatKey(stats.rows[nextIdx].category.key)
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Siguiente categoría</span>
                    <span>➜</span>
                  </button>

                  <div className="flex items-center gap-1 font-bold text-amber-400 text-xs">
                    <Crown className="h-3.5 w-3.5" />
                    <span>
                      Moda: {stats.modes.map((m) => m.category.label).join(', ')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </section>

          {/* ════════════════════════════════════════════════════════════════════
              PANEL DERECHO: TABLA DE FRECUENCIAS Y GRÁFICO DINÁMICO
          ════════════════════════════════════════════════════════════════════ */}
          <section
            className={`flex-1 min-w-0 min-h-0 rounded-xl border flex flex-col overflow-hidden transition-all ${
              viewMode === 'conteo' ? 'hidden md:flex' : 'flex'
            } ${
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
                  2. Tabla de Frecuencias
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 font-mono">
                  N = {SAMPLE_SIZE}
                </span>
              </div>

              {/* Stepper de Pasos Pedagógicos (Modo Guiado) o botón de comprobación (Modo Reto) */}
              <div className="flex items-center gap-1">
                {exerciseMode === 'reto' ? (
                  <button
                    onClick={handleCheckReto}
                    className="px-2.5 py-0.5 rounded text-[11px] font-black bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Comprobar</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <button
                      onClick={() => setTableStage('conteo')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                        tableStage === 'conteo'
                          ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                          : isDark
                          ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Paso 1: Conteo con palotes y frecuencia absoluta (fi)"
                    >
                      1. Conteo fi
                    </button>
                    <button
                      onClick={() => {
                        if (stats.isComplete) setTableStage('calcular_hi')
                      }}
                      disabled={!stats.isComplete}
                      className={`px-1.5 py-0.5 rounded transition-all ${
                        tableStage === 'calcular_hi'
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-xs cursor-pointer'
                          : stats.isComplete
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed bg-slate-700/20 text-slate-400'
                      }`}
                      title={stats.isComplete ? 'Paso 2: Calcular frecuencia relativa (hi)' : 'Completa el conteo de los 20 datos primero'}
                    >
                      2. Relativa hi
                    </button>
                    <button
                      onClick={() => {
                        if (stats.isComplete && tableStage !== 'conteo') setTableStage('calcular_hipct')
                      }}
                      disabled={!stats.isComplete || tableStage === 'conteo'}
                      className={`px-1.5 py-0.5 rounded transition-all ${
                        tableStage === 'calcular_hipct'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs cursor-pointer'
                          : stats.isComplete && tableStage !== 'conteo'
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed bg-slate-700/20 text-slate-400'
                      }`}
                      title={stats.isComplete ? 'Paso 3: Convertir a porcentaje (hi %)' : 'Calcula hi primero'}
                    >
                      3. Porcentaje hi %
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Banner explicativo pedagógico entre pasos */}
            {exerciseMode === 'explorar' && (
              <div
                className={`px-2 py-1 shrink-0 border-b ${
                  isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {tableStage === 'conteo' && !stats.isComplete && (
                  <div className="flex items-center justify-between text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                    <span>
                      <strong>Paso 1:</strong> Tacha los datos sueltos para registrar los palotes y la frecuencia absoluta (<strong>fi</strong>).
                    </span>
                    <span className="font-mono font-bold text-xs shrink-0 ml-1">
                      {stats.totalCounted}/{SAMPLE_SIZE}
                    </span>
                  </div>
                )}

                {tableStage === 'conteo' && stats.isComplete && (
                  <div className="flex items-center justify-between text-[11px] animate-pulse">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                      🎉 <strong>¡Conteo finalizado (N = {SAMPLE_SIZE})!</strong> Ahora calcula <strong>hi</strong> (frecuencia relativa):
                    </span>
                    <button
                      onClick={() => setTableStage('calcular_hi')}
                      className="ml-2 px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      Paso 2: Calcular hi 👉
                    </button>
                  </div>
                )}

                {tableStage === 'calcular_hi' && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
                      💡 <strong>hi = fi ÷ N:</strong> Dividimos cada <strong>fi</strong> entre <strong>{SAMPLE_SIZE}</strong>. ¡La suma total siempre da <strong>1.00</strong>!
                    </span>
                    <button
                      onClick={() => setTableStage('calcular_hipct')}
                      className="ml-2 px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      Paso 3: Convertir a hi % 👉
                    </button>
                  </div>
                )}

                {tableStage === 'calcular_hipct' && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                      ✨ <strong>hi % = hi × 100:</strong> Multiplicamos cada <strong>hi</strong> por 100. ¡La suma total siempre es <strong>100%</strong>!
                    </span>
                    <span className="font-mono font-bold text-amber-500 dark:text-amber-300 text-xs shrink-0 ml-2">
                      Σ hi % = 100% ✓
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Contenido: Tabla de Frecuencias con CERO SCROLL estilo Hoja de Cálculo Excel */}
            <div className="flex-1 min-h-0 overflow-y-auto p-1 lg:p-2 flex flex-col justify-between">
              <div className={`overflow-x-auto w-full no-scrollbar rounded-md border shadow-xs ${isDark ? 'border-white/20' : 'border-slate-400'}`}>
                <table className="excel-table w-full border-collapse text-left text-[10px] lg:text-xs">
                  {/* Encabezados de Columna (Estilo Excel) */}
                  <thead>
                    <tr className="text-[9.5px] lg:text-[11px] font-bold">
                      <th className={`py-1 px-1.5 lg:px-2 font-bold ${isDark ? 'bg-slate-800/90 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
                        Variable ({currentDataset.variableName.split(' ')[0]})
                      </th>
                      <th className={`py-1 px-1.5 lg:px-2 min-w-[60px] lg:min-w-[75px] font-bold text-center sm:text-left ${isDark ? 'bg-slate-800/90 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
                        Conteo
                      </th>
                      <th
                        className={`py-1 px-1 lg:px-2 text-center font-bold ${isDark ? 'bg-sky-950/40' : 'bg-sky-100/90'}`}
                        title="Frecuencia Absoluta: cantidad de veces que aparece el dato"
                      >
                        <span className="text-sky-600 dark:text-sky-400 font-mono font-bold lowercase">fi</span>
                      </th>
                      {showCumulative && activeVarType === 'cuantitativa' && (
                        <th
                          className={`py-1 px-1 lg:px-2 text-center font-bold ${isDark ? 'bg-purple-950/40' : 'bg-purple-100/90'}`}
                          title="Frecuencia Absoluta Acumulada"
                        >
                          <span className="text-purple-600 dark:text-purple-400 font-mono font-bold lowercase">Fi</span>
                        </th>
                      )}
                      <th
                        className={`py-1 px-1 lg:px-2 text-center font-bold ${isDark ? 'bg-emerald-950/40' : 'bg-emerald-100/90'}`}
                        title="Frecuencia Relativa: hi = fi / N"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold lowercase">hi</span>
                      </th>
                      <th
                        className={`py-1 px-1 lg:px-2 text-center font-bold ${isDark ? 'bg-amber-950/40' : 'bg-amber-100/90'}`}
                        title="Frecuencia Porcentual: hi% = hi * 100"
                      >
                        <span className="text-amber-600 dark:text-amber-400 font-mono font-bold lowercase">hi %</span>
                      </th>
                    </tr>
                  </thead>

                  {/* Filas de la Tabla (Celdas cuadriculadas tipo Excel) */}
                  <tbody>
                    {stats.rows.map((row) => {
                      const isHighlighted = highlightedCategory === row.category.key
                      const isMode = stats.modes.some((m) => m.category.key === row.category.key) && stats.isComplete

                      return (
                        <tr
                          key={row.category.key}
                          onClick={() => setSelectedCatKey(row.category.key)}
                          className={`transition-colors duration-150 cursor-pointer ${
                            selectedCatKey === row.category.key && tableStage !== 'conteo'
                              ? isDark
                                ? 'bg-emerald-500/20'
                                : 'bg-emerald-100/90 font-medium'
                              : isHighlighted
                              ? isDark
                                ? 'bg-sky-500/25'
                                : 'bg-sky-100/90 font-medium'
                              : isMode
                              ? isDark
                                ? 'bg-amber-500/15'
                                : 'bg-amber-100/90 font-medium'
                              : isDark
                              ? 'hover:bg-white/5'
                              : 'bg-white hover:bg-slate-100/70'
                          }`}
                          title="Toca para ver su desglose en el visualizador izquierdo"
                        >
                          {/* Columna 1: Variable (xi) */}
                          <td className="py-0.5 lg:py-1 px-1.5 lg:px-2 whitespace-nowrap">
                            <div className="flex items-center gap-1 lg:gap-1.5">
                              <span className="text-xs lg:text-base leading-none">{row.category.icon}</span>
                              <span className="font-bold text-[10.5px] lg:text-xs text-slate-800 dark:text-slate-100">{row.category.label}</span>
                              {isMode && (
                                <span
                                  className="inline-flex items-center text-[9px] lg:text-[10px] font-black text-amber-500 gap-0.5"
                                  title="¡Es la Moda! (Dato con mayor frecuencia)"
                                >
                                  <Crown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Columna 2: Conteo (Palotes de 5 en 5) */}
                          <td className="py-0.5 lg:py-1 px-1.5 lg:px-2">
                            {exerciseMode === 'reto' ? (
                              (() => {
                                const userFi = parseInt(retoInputs[row.category.key]?.fi || '0', 10)
                                return userFi > 0 ? (
                                  <div className="scale-75 lg:scale-100 origin-left">
                                    <TallyMarks count={userFi} colorHex={row.category.color.hex} />
                                  </div>
                                ) : (
                                  <span className="text-[10px] lg:text-xs opacity-30 italic font-mono">—</span>
                                )
                              })()
                            ) : (
                              <div className="scale-75 lg:scale-100 origin-left">
                                <TallyMarks count={row.fi} colorHex={row.category.color.hex} />
                              </div>
                            )}
                          </td>

                          {/* Columna 3: Frecuencia Absoluta (fi) */}
                          <td className="py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-black text-xs lg:text-sm">
                            {exerciseMode === 'reto' ? (
                              <input
                                type="text"
                                readOnly
                                inputMode="none"
                                onFocus={(e) => e.target.blur()}
                                onClick={() => setActiveRetoCell({ catKey: row.category.key, field: 'fi' })}
                                value={retoInputs[row.category.key]?.fi || ''}
                                placeholder="?"
                                className={`w-7 lg:w-9 h-5.5 lg:h-6.5 text-center py-0 rounded font-mono font-bold text-[10px] lg:text-xs border cursor-pointer select-none transition-all ${
                                  getRetoInputClass(row.category.key, 'fi')
                                }`}
                              />
                            ) : (
                              <span className={row.fi > 0 ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'opacity-40'}>
                                {row.fi}
                              </span>
                            )}
                          </td>

                          {/* Columna Opcional: Frecuencia Acumulada (Fi) */}
                          {showCumulative && activeVarType === 'cuantitativa' && (
                            <td className="py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-bold text-[10px] lg:text-xs text-purple-600 dark:text-purple-400">
                              {row.Fi}
                            </td>
                          )}

                          {/* Columna 4: Frecuencia Relativa (hi = fi / N) */}
                          <td className="py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono text-[10px] lg:text-xs">
                            {exerciseMode === 'reto' ? (
                              <input
                                type="text"
                                readOnly
                                inputMode="none"
                                onFocus={(e) => e.target.blur()}
                                onClick={() => setActiveRetoCell({ catKey: row.category.key, field: 'hi' })}
                                value={retoInputs[row.category.key]?.hi || ''}
                                placeholder="0.00"
                                className={`w-10 lg:w-12 h-5.5 lg:h-6.5 text-center py-0 rounded font-mono font-bold text-[10px] lg:text-xs border cursor-pointer select-none transition-all ${
                                  getRetoInputClass(row.category.key, 'hi')
                                }`}
                              />
                            ) : tableStage === 'conteo' ? (
                              <span
                                className="text-slate-400 font-mono text-[10px] lg:text-xs italic opacity-60"
                                title="Se calcula al terminar el conteo de los 20 datos"
                              >
                                —
                              </span>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                                  {row.hi.toFixed(2)}
                                </span>
                                <span className="text-[8px] lg:text-[9px] opacity-60 leading-none">
                                  {row.fi}/{SAMPLE_SIZE}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Columna 5: Frecuencia Porcentual (hi%) */}
                          <td className="py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-black text-[10px] lg:text-xs">
                            {exerciseMode === 'reto' ? (
                              <input
                                type="text"
                                readOnly
                                inputMode="none"
                                onFocus={(e) => e.target.blur()}
                                onClick={() => setActiveRetoCell({ catKey: row.category.key, field: 'hiPct' })}
                                value={retoInputs[row.category.key]?.hiPct || ''}
                                placeholder="%"
                                className={`w-9 lg:w-11 h-5.5 lg:h-6.5 text-center py-0 rounded font-mono font-bold text-[10px] lg:text-xs border cursor-pointer select-none transition-all ${
                                  getRetoInputClass(row.category.key, 'hiPct')
                                }`}
                              />
                            ) : tableStage === 'conteo' || tableStage === 'calcular_hi' ? (
                              <span
                                className="text-slate-400 font-mono text-[10px] lg:text-xs italic opacity-60"
                                title="Se calcula después de obtener hi"
                              >
                                —
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                {row.hiPct.toFixed(0)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>

                  {/* Fila de Totales (Σ estilo Excel) */}
                  <tfoot>
                    <tr
                      className={`border-t-2 font-black ${
                        isDark
                          ? 'border-white/30 bg-slate-900/90 text-white'
                          : 'border-slate-500 bg-slate-200/90 text-slate-900'
                      }`}
                    >
                      <td className="py-0.5 lg:py-1 px-1.5 lg:px-2 uppercase text-[9.5px] lg:text-[11px] font-black">
                        Total (Σ)
                      </td>
                      <td className="py-0.5 lg:py-1 px-1.5 lg:px-2 font-mono text-[9px] lg:text-[11px] text-slate-500 dark:text-slate-400">
                        {exerciseMode === 'reto'
                          ? userTotals.hasAnyInput
                            ? `${userTotals.sumFi} p.`
                            : '—'
                          : `${stats.totalCounted} p.`}
                      </td>
                      <td
                        className={`py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-black text-xs lg:text-sm ${
                          exerciseMode === 'reto'
                            ? userTotals.sumFi === SAMPLE_SIZE
                              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
                              : 'text-amber-500 dark:text-amber-400'
                            : stats.sumFi === SAMPLE_SIZE
                            ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                            : ''
                        }`}
                      >
                        {exerciseMode === 'reto'
                          ? userTotals.hasAnyInput
                            ? userTotals.sumFi
                            : '—'
                          : stats.sumFi}
                      </td>
                      {showCumulative && activeVarType === 'cuantitativa' && (
                        <td className="py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono text-[10px] opacity-50">
                          -
                        </td>
                      )}
                      <td
                        className={`py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-black text-[10px] lg:text-xs ${
                          exerciseMode === 'reto'
                            ? Math.abs(userTotals.sumHi - 1.0) < 0.02
                              ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                              : 'text-amber-500 dark:text-amber-400'
                            : tableStage !== 'conteo'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 opacity-60'
                        }`}
                      >
                        {exerciseMode === 'reto'
                          ? userTotals.hasAnyInput
                            ? userTotals.sumHi.toFixed(2)
                            : '—'
                          : tableStage !== 'conteo'
                          ? stats.sumHi.toFixed(2)
                          : '—'}
                      </td>
                      <td
                        className={`py-0.5 lg:py-1 px-1 lg:px-2 text-center font-mono font-black text-[10px] lg:text-xs ${
                          exerciseMode === 'reto'
                            ? Math.abs(userTotals.sumHiPct - 100) < 1
                              ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                              : 'text-amber-500 dark:text-amber-400'
                            : tableStage === 'calcular_hipct'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 opacity-60'
                        }`}
                      >
                        {exerciseMode === 'reto'
                          ? userTotals.hasAnyInput
                            ? `${userTotals.sumHiPct.toFixed(0)}%`
                            : '—'
                          : tableStage === 'calcular_hipct'
                          ? `${stats.sumHiPct.toFixed(0)}%`
                          : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Mini Gráfico de Barras y Análisis Estadístico Integrado ── */}
              <div
                className={`mt-1 lg:mt-2 p-1 lg:p-2 rounded-md border flex flex-col shrink-0 ${
                  isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9.5px] lg:text-[11px] pb-0.5 border-b border-white/5 mb-0.5">
                  <div className="flex items-center gap-1 font-bold text-sky-500">
                    <BarChart3 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                    <span>Gráfico de Barras Dinámico</span>
                  </div>

                  {stats.isComplete && stats.modes.length > 0 && (
                    <div className="flex items-center gap-1 text-[9px] lg:text-[10px] font-bold text-amber-500">
                      <Crown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                      <span>
                        Moda (Mo):{' '}
                        {stats.modes.map((m) => `${m.category.label} (${m.fi})`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barras dinámicas */}
                <div className="flex items-end justify-around gap-1.5 lg:gap-2 h-9 lg:h-14 pt-0.5 px-1 lg:px-2">
                  {stats.rows.map((row) => {
                    const displayedFi =
                      exerciseMode === 'reto'
                        ? parseInt(retoInputs[row.category.key]?.fi || '0', 10)
                        : row.fi
                    const heightPercent =
                      SAMPLE_SIZE > 0 ? (displayedFi / (stats.maxFi || 1)) * 100 : 0
                    const isMode =
                      stats.modes.some((m) => m.category.key === row.category.key) &&
                      (exerciseMode === 'reto' ? retoFeedback?.checked : stats.isComplete)

                    return (
                      <div
                        key={`bar-${row.category.key}`}
                        className="flex-1 flex flex-col items-center h-full justify-end group"
                      >
                        {/* Valor sobre la barra */}
                        <span className="text-[8px] lg:text-[9.5px] font-mono font-bold leading-none mb-0.5 opacity-80">
                          {displayedFi > 0 ? displayedFi : ''}
                        </span>

                        {/* Barra animada */}
                        <div className="w-full max-w-[22px] lg:max-w-[32px] bg-slate-200/70 dark:bg-slate-800/60 rounded-t h-full flex items-end overflow-hidden border border-slate-300/40 dark:border-white/5">
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              isMode ? 'ring-1.5 ring-amber-400' : ''
                            }`}
                            style={{
                              height: `${Math.max(4, heightPercent)}%`,
                              backgroundColor: row.category.color.hex
                            }}
                          />
                        </div>

                        {/* Icono al pie de la barra */}
                        <span className="text-[10px] lg:text-xs mt-0.5 leading-none" title={row.category.label}>
                          {row.category.icon}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Feedback del Reto si está activo */}
              {exerciseMode === 'reto' && retoFeedback?.checked && (
                <div
                  className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                    retoFeedback.correctCount === retoFeedback.totalFields
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {retoFeedback.correctCount === retoFeedback.totalFields ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Trophy className="h-4 w-4 text-amber-400" />
                    )}
                    <span>
                      {retoFeedback.correctCount === retoFeedback.totalFields
                        ? '¡Excelente trabajo! Has completado todas las frecuencias correctamente.'
                        : `Obtuviste ${retoFeedback.correctCount} de ${retoFeedback.totalFields} respuestas correctas. Revisa las casillas en rojo.`}
                    </span>
                  </div>

                  {retoFeedback.correctCount !== retoFeedback.totalFields && (
                    <button
                      onClick={() => setRetoFeedback(null)}
                      className="text-[10px] underline cursor-pointer ml-2"
                    >
                      Seguir intentando
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── 4. Barra Inferior de Fórmulas y Feedback (h-9 a lg:h-11) ─────────── */}
      <footer
        className={`h-9 lg:h-11 shrink-0 border-t px-2 lg:px-4 flex items-center justify-between gap-2 text-xs ${
          isDark ? 'bg-[#0a0f1d] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calculator className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <div className="flex items-center gap-2 text-[11px] truncate">
            <span className="font-semibold hidden sm:inline">Fórmulas clave:</span>
            <span className="font-mono bg-sky-500/10 text-sky-400 px-1 rounded">
              hi = fi / N
            </span>
            <span className="font-mono bg-amber-500/10 text-amber-400 px-1 rounded">
              hi % = hi × 100
            </span>
            <span className="font-mono bg-emerald-500/10 text-emerald-400 px-1 rounded hidden md:inline">
              Σ fi = {SAMPLE_SIZE}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0 font-bold">
          {stats.isComplete ? (
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>100% analizado</span>
            </span>
          ) : (
            <span className="text-amber-500">
              Faltan {SAMPLE_SIZE - stats.totalCounted} datos por contar
            </span>
          )}
        </div>
      </footer>

      {/* ── 5. Modal de Ayuda Pedagógica ────────────────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo construir una Tabla de Frecuencias de Datos No Agrupados?"
        bgColor={isDark ? '#0f172a' : '#ffffff'}
        titleColor={isDark ? '#38bdf8' : '#0369a1'}
      >
        <div
          className={`space-y-4 text-xs leading-relaxed ${
            isDark ? 'text-slate-200' : 'text-slate-700'
          }`}
        >
          {/* Sección 1: Qué es */}
          <div
            className={`p-3 rounded-xl border ${
              isDark ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-50 border-sky-200'
            }`}
          >
            <h3 className="font-bold text-sm text-sky-600 dark:text-sky-300 mb-1 flex items-center gap-1.5">
              <span>📋</span> ¿Qué son los datos desorganizados?
            </h3>
            <p>
              Cuando realizamos una encuesta o tomamos mediciones, los datos se obtienen
              desordenados (en bruto). Para poder analizarlos, los organizamos mediante el{' '}
              <strong>conteo sistemático</strong> (tachando cada ficha y registrando un palote).
            </p>
          </div>

          {/* Sección 2: Fórmulas y Columnas */}
          <div>
            <h3 className="font-bold text-sm mb-2">Columnas de la Tabla de Frecuencias:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-sky-400">1. Frecuencia Absoluta (fi)</div>
                <p className="mt-0.5 text-[11px]">
                  Es el número total de veces que se repite un dato en la muestra.
                </p>
                <div className="font-mono text-[10px] mt-1 text-slate-400">
                  Regla: La suma de todas las fi debe ser igual a N (Σ fi = N).
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-emerald-400">2. Frecuencia Relativa (hi)</div>
                <p className="mt-0.5 text-[11px]">
                  Representa la proporción o fracción respecto al total:
                </p>
                <div className="font-mono text-[11px] font-bold text-emerald-300 mt-1">
                  hi = fi ÷ N
                </div>
                <div className="font-mono text-[10px] mt-0.5 text-slate-400">
                  Regla: La suma de todas las hi siempre es 1.00 (Σ hi = 1).
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-amber-400">3. Frecuencia Porcentual (hi %)</div>
                <p className="mt-0.5 text-[11px]">
                  Es la frecuencia relativa expresada en porcentaje (por cada 100):
                </p>
                <div className="font-mono text-[11px] font-bold text-amber-300 mt-1">
                  hi % = hi × 100
                </div>
                <div className="font-mono text-[10px] mt-0.5 text-slate-400">
                  Regla: La suma de todos los porcentajes siempre es 100% (Σ hi% = 100%).
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-purple-400">4. La Moda (Mo)</div>
                <p className="mt-0.5 text-[11px]">
                  Es el valor o categoría que tiene la <strong>mayor frecuencia absoluta (fi)</strong>; es decir, el dato más popular o que más se repite.
                </p>
              </div>
            </div>
          </div>

          {/* Sección 3: Tipos de Variables */}
          <div
            className={`p-3 rounded-xl border ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <h3 className="font-bold text-sm text-amber-600 dark:text-amber-300 mb-1">
              Variables Cualitativas vs Cuantitativas
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>
                <strong>Cualitativa:</strong> Expresa una cualidad, preferencia o categoría
                (ej. deporte favorito, fruta, color). No son números que se sumen.
              </li>
              <li>
                <strong>Cuantitativa Discreta:</strong> Expresa una cantidad contable con números
                enteros (ej. número de hermanos: 0, 1, 2, 3; goles anotados). Permite calcular
                frecuencias acumuladas (Fi).
              </li>
            </ul>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
