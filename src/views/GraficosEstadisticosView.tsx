import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  PieChart,
  TrendingUp,
  HelpCircle,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Info,
  Plus,
  Minus,
  Activity,
  Layers
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ChartType = 'barras' | 'circular' | 'histograma' | 'poligono' | 'lineas'
export type VariableKind = 'cualitativa_nominal' | 'cualitativa_ordinal' | 'cuantitativa_discreta' | 'cuantitativa_continua' | 'serie_temporal'
export type ExerciseMode = 'explorar' | 'reto'

interface DataItem {
  id: string
  label: string // Categoría o intervalo
  shortLabel?: string
  val?: number // Valor numérico central si aplica
  xi?: number // Marca de clase si es continuo
  li?: number // Límite inferior si aplica
  ls?: number // Límite superior si aplica
  fi: number // Frecuencia absoluta
  color: string
}

interface Situation {
  id: string
  title: string
  variableName: string
  variableKind: VariableKind
  variableKindLabel: string
  unit?: string
  description: string
  optimalCharts: ChartType[]
  acceptableCharts: ChartType[]
  wrongCharts: ChartType[]
  explanations: Record<ChartType, { status: 'optimal' | 'acceptable' | 'wrong'; text: string }>
  data: DataItem[]
}

interface RetoQuestion {
  id: string
  situationTitle: string
  variableKindLabel: string
  question: string
  context: string
  correctChart: ChartType
  explanation: string
  options: { type: ChartType; label: string }[]
}

// ─── Paleta de colores didáctica ──────────────────────────────────────────────
const PALETTE = [
  '#0284c7', // Sky-600
  '#0d9488', // Teal-600
  '#d97706', // Amber-600
  '#7c3aed', // Violet-600
  '#e11d48', // Rose-600
  '#059669', // Emerald-600
  '#ea580c'  // Orange-600
]

// ─── Situaciones Didácticas según Currículo Nacional ──────────────────────────
const SITUATIONS: Situation[] = [
  {
    id: 'deportes',
    title: 'Deporte Favorito',
    variableName: 'Deporte preferido',
    variableKind: 'cualitativa_nominal',
    variableKindLabel: 'Cualitativa Nominal',
    description: 'Preferencia de 30 estudiantes. Las categorías no tienen orden jerárquico ni valor numérico.',
    optimalCharts: ['barras'],
    acceptableCharts: ['circular'],
    wrongCharts: ['histograma', 'poligono', 'lineas'],
    explanations: {
      barras: {
        status: 'optimal',
        text: '¡Excelente! El Gráfico de Barras es el estándar para variables cualitativas. Las barras van separadas para indicar que no hay continuidad numérica entre deportes.'
      },
      circular: {
        status: 'acceptable',
        text: 'Uso aceptable: El Gráfico Circular muestra bien la proporción (porcentajes) del total cuando hay pocas categorías (4 a 6 deportes).'
      },
      histograma: {
        status: 'wrong',
        text: 'Incorrecto: El Histograma solo se usa con datos agrupados en intervalos numéricos continuos. Pegar las barras aquí implicaría falsamente que el fútbol se "convierte" en vóley.'
      },
      poligono: {
        status: 'wrong',
        text: 'Incorrecto: El Polígono de Frecuencias une marcas de clase numéricas. Unir deportes con una línea no tiene sentido matemático.'
      },
      lineas: {
        status: 'wrong',
        text: 'Incorrecto: El Gráfico de Líneas se usa para tendencias temporales o valores continuos, no para categorías de texto sin orden.'
      }
    },
    data: [
      { id: 'fut', label: 'Fútbol', shortLabel: 'Fútbol', fi: 12, color: PALETTE[0] },
      { id: 'vol', label: 'Vóley', shortLabel: 'Vóley', fi: 8, color: PALETTE[1] },
      { id: 'bas', label: 'Básquet', shortLabel: 'Básquet', fi: 6, color: PALETTE[2] },
      { id: 'nat', label: 'Natación', shortLabel: 'Natación', fi: 4, color: PALETTE[3] }
    ]
  },
  {
    id: 'estaturas',
    title: 'Estatura de Estudiantes',
    variableName: 'Estatura (cm) agrupada',
    variableKind: 'cuantitativa_continua',
    variableKindLabel: 'Cuantitativa Continua (Intervalos)',
    unit: 'cm',
    description: 'Medición de 30 alumnos agrupados en intervalos continuos [Li - Ls) de amplitud 6 cm.',
    optimalCharts: ['histograma', 'poligono'],
    acceptableCharts: ['barras'],
    wrongCharts: ['circular', 'lineas'],
    explanations: {
      histograma: {
        status: 'optimal',
        text: '¡Perfecto! El Histograma es el gráfico por excelencia para variables continuas agrupadas. Las barras van unidas sin espacio, reflejando la continuidad métrica.'
      },
      poligono: {
        status: 'optimal',
        text: '¡Excelente! El Polígono de Frecuencias une las marcas de clase (Xi) de cada intervalo y cierra en cero, mostrando la forma de la distribución (campana).'
      },
      barras: {
        status: 'acceptable',
        text: 'Aceptable pero no ideal: Un gráfico de barras separadas hace perder la noción visual de continuidad entre intervalos adyacentes.'
      },
      circular: {
        status: 'wrong',
        text: 'No recomendado: En un círculo los intervalos pierden su eje numérico métrico y es difícil comparar la forma de la dispersión de las estaturas.'
      },
      lineas: {
        status: 'wrong',
        text: 'Incorrecto: Una línea simple no considera los anchos de los intervalos ni las marcas de clase cerradas como exige un polígono de frecuencias.'
      }
    },
    data: [
      { id: 'e1', label: '[142 - 148)', shortLabel: '142-148', li: 142, ls: 148, xi: 145, fi: 3, color: PALETTE[0] },
      { id: 'e2', label: '[148 - 154)', shortLabel: '148-154', li: 148, ls: 154, xi: 151, fi: 6, color: PALETTE[1] },
      { id: 'e3', label: '[154 - 160)', shortLabel: '154-160', li: 154, ls: 160, xi: 157, fi: 12, color: PALETTE[2] },
      { id: 'e4', label: '[160 - 166)', shortLabel: '160-166', li: 160, ls: 166, xi: 163, fi: 6, color: PALETTE[3] },
      { id: 'e5', label: '[166 - 172]', shortLabel: '166-172', li: 166, ls: 172, xi: 169, fi: 3, color: PALETTE[4] }
    ]
  },
  {
    id: 'temperatura',
    title: 'Temperatura Mensual',
    variableName: 'Temperatura promedio (°C)',
    variableKind: 'serie_temporal',
    variableKindLabel: 'Serie Temporal (Tiempo)',
    unit: '°C',
    description: 'Evolución mensual de la temperatura a lo largo del primer semestre del año.',
    optimalCharts: ['lineas'],
    acceptableCharts: ['barras'],
    wrongCharts: ['circular', 'histograma', 'poligono'],
    explanations: {
      lineas: {
        status: 'optimal',
        text: '¡Exacto! El Gráfico de Líneas es ideal para series temporales. Permite observar tendencias de aumento, descenso o estabilidad a lo largo de los meses.'
      },
      barras: {
        status: 'acceptable',
        text: 'Aceptable: Permite comparar cada mes de forma aislada, aunque resalta menos la continuidad del flujo temporal que una línea.'
      },
      circular: {
        status: 'wrong',
        text: 'Incorrecto: Un gráfico circular no tiene sentido para series temporales porque no existe una secuencia cronológica en un círculo cerrado.'
      },
      histograma: {
        status: 'wrong',
        text: 'Incorrecto: Los meses no son intervalos de una variable continua agrupada, son momentos temporales discretos ordenados.'
      },
      poligono: {
        status: 'wrong',
        text: 'Incorrecto: El polígono requiere marcas de clase en un eje continuo cerrado a cero en ambos extremos.'
      }
    },
    data: [
      { id: 'ene', label: 'Enero', shortLabel: 'Ene', val: 1, fi: 26, color: PALETTE[0] },
      { id: 'feb', label: 'Febrero', shortLabel: 'Feb', val: 2, fi: 28, color: PALETTE[1] },
      { id: 'mar', label: 'Marzo', shortLabel: 'Mar', val: 3, fi: 25, color: PALETTE[2] },
      { id: 'abr', label: 'Abril', shortLabel: 'Abr', val: 4, fi: 21, color: PALETTE[3] },
      { id: 'may', label: 'Mayo', shortLabel: 'May', val: 5, fi: 18, color: PALETTE[4] },
      { id: 'jun', label: 'Junio', shortLabel: 'Jun', val: 6, fi: 15, color: PALETTE[5] }
    ]
  },
  {
    id: 'mascotas',
    title: 'Cantidad de Mascotas',
    variableName: 'N.° de mascotas por familia',
    variableKind: 'cuantitativa_discreta',
    variableKindLabel: 'Cuantitativa Discreta',
    description: 'Número exacto de animales domésticos en 40 hogares encuestados (0, 1, 2, 3, 4).',
    optimalCharts: ['barras'],
    acceptableCharts: ['circular'],
    wrongCharts: ['histograma', 'lineas', 'poligono'],
    explanations: {
      barras: {
        status: 'optimal',
        text: '¡Muy bien! Las variables discretas toman números enteros aislados (0, 1, 2...). Las barras separadas muestran la frecuencia de cada valor exacto.'
      },
      circular: {
        status: 'acceptable',
        text: 'Aceptable: Muestra la proporción de hogares que tienen determinada cantidad de mascotas respecto al 100%.'
      },
      histograma: {
        status: 'wrong',
        text: 'Incorrecto: El histograma pega las barras para variables continuas. No existen 1.5 o 2.7 mascotas, por lo que no debe haber continuidad visual.'
      },
      lineas: {
        status: 'wrong',
        text: 'Incorrecto: No es una evolución en el tiempo. Unir los puntos con líneas sugeriría que hay valores intermedios.'
      },
      poligono: {
        status: 'wrong',
        text: 'Incorrecto: Se reserva para tablas de frecuencias con intervalos de clase agrupados.'
      }
    },
    data: [
      { id: 'm0', label: '0 mascotas', shortLabel: '0', val: 0, fi: 8, color: PALETTE[0] },
      { id: 'm1', label: '1 mascota', shortLabel: '1', val: 1, fi: 16, color: PALETTE[1] },
      { id: 'm2', label: '2 mascotas', shortLabel: '2', val: 2, fi: 10, color: PALETTE[2] },
      { id: 'm3', label: '3 mascotas', shortLabel: '3', val: 3, fi: 4, color: PALETTE[3] },
      { id: 'm4', label: '4 mascotas', shortLabel: '4', val: 4, fi: 2, color: PALETTE[4] }
    ]
  },
  {
    id: 'satisfaccion',
    title: 'Satisfacción Escolar',
    variableName: 'Nivel de satisfacción',
    variableKind: 'cualitativa_ordinal',
    variableKindLabel: 'Cualitativa Ordinal',
    description: 'Opinión jerarquizada de 50 estudiantes sobre el comedor escolar.',
    optimalCharts: ['barras'],
    acceptableCharts: ['circular'],
    wrongCharts: ['histograma', 'lineas', 'poligono'],
    explanations: {
      barras: {
        status: 'optimal',
        text: '¡Correcto! En variables cualitativas ordinales, las barras ordenadas de menor a mayor categoría reflejan con claridad la jerarquía de respuestas.'
      },
      circular: {
        status: 'acceptable',
        text: 'Aceptable: Permite apreciar la distribución porcentual de las opiniones en una sola vista de sectores.'
      },
      histograma: {
        status: 'wrong',
        text: 'Incorrecto: Aunque hay un orden cualitativo, no hay una escala métrica numérica continua. Las barras deben permanecer separadas.'
      },
      lineas: {
        status: 'wrong',
        text: 'Incorrecto: Una línea sugiere una función matemática o trayectoria en el tiempo que no corresponde a opiniones ordinales.'
      },
      poligono: {
        status: 'wrong',
        text: 'Incorrecto: No existen marcas de clase ni límites métricos para construir un polígono.'
      }
    },
    data: [
      { id: 's1', label: 'Muy Malo', shortLabel: 'M. Malo', fi: 3, color: PALETTE[4] },
      { id: 's2', label: 'Malo', shortLabel: 'Malo', fi: 7, color: PALETTE[6] },
      { id: 's3', label: 'Regular', shortLabel: 'Regular', fi: 15, color: PALETTE[2] },
      { id: 's4', label: 'Bueno', shortLabel: 'Bueno', fi: 18, color: PALETTE[0] },
      { id: 's5', label: 'Excelente', shortLabel: 'Excelente', fi: 7, color: PALETTE[5] }
    ]
  }
]

// ─── Preguntas del Modo Reto ──────────────────────────────────────────────────
const RETO_QUESTIONS: RetoQuestion[] = [
  {
    id: 'r1',
    situationTitle: 'Ventas de una librería escolar por mes',
    variableKindLabel: 'Serie Temporal (12 meses)',
    context: 'El administrador desea observar cómo subieron o bajaron las ventas de cuadernos de enero a diciembre para planificar las compras del próximo año.',
    question: '¿Qué gráfico estadístico refleja mejor la tendencia temporal de subida y bajada a lo largo del año?',
    correctChart: 'lineas',
    explanation: 'El Gráfico de Líneas une los puntos en el orden cronológico de los meses, permitiendo identificar de un vistazo las temporadas altas, bajas y la tendencia anual.',
    options: [
      { type: 'lineas', label: 'Gráfico de Líneas' },
      { type: 'circular', label: 'Gráfico Circular' },
      { type: 'histograma', label: 'Histograma' },
      { type: 'poligono', label: 'Polígono' }
    ]
  },
  {
    id: 'r2',
    situationTitle: 'Pesos de 60 estudiantes agrupados en [40-45), [45-50)...',
    variableKindLabel: 'Cuantitativa Continua con Intervalos',
    context: 'El docente de educación física registró el peso de 60 alumnos en kilogramos y agrupó los datos en 5 intervalos continuos.',
    question: '¿Qué gráfico debe presentar con barras pegadas (sin separación) que representen la continuidad de los intervalos?',
    correctChart: 'histograma',
    explanation: 'El Histograma es el gráfico adecuado para variables continuas agrupadas; sus barras van unidas sobre el eje horizontal para indicar que el límite superior de una clase es el inicio de la siguiente.',
    options: [
      { type: 'barras', label: 'Barras separadas' },
      { type: 'histograma', label: 'Histograma (barras pegadas)' },
      { type: 'circular', label: 'Gráfico Circular' },
      { type: 'lineas', label: 'Gráfico de Líneas' }
    ]
  },
  {
    id: 'r3',
    situationTitle: 'Distribución porcentual de las áreas de un presupuesto escolar',
    variableKindLabel: 'Proporciones Parte-Todo (4 áreas: 100%)',
    context: 'La dirección del colegio necesita mostrar a los padres de familia cómo se distribuyó el 100% de los fondos escolares en 4 rubros: Infraestructura, Biblioteca, Deportes y Tecnología.',
    question: '¿Qué gráfico representa de forma más intuitiva qué porción de la totalidad (100%) corresponde a cada rubro?',
    correctChart: 'circular',
    explanation: 'El Gráfico Circular (de sectores) divide el círculo de 360° en proporciones exactas según el porcentaje de cada rubro respecto al todo (100%).',
    options: [
      { type: 'circular', label: 'Gráfico Circular (Sectores)' },
      { type: 'histograma', label: 'Histograma' },
      { type: 'lineas', label: 'Gráfico de Líneas' },
      { type: 'poligono', label: 'Polígono' }
    ]
  },
  {
    id: 'r4',
    situationTitle: 'Idiomas extranjeros que prefieren aprender los alumnos',
    variableKindLabel: 'Cualitativa Nominal (Inglés, Francés, Quechua, Portugués)',
    context: 'Se realizó una encuesta a 80 alumnos sobre qué idioma optativo prefieren. Las opciones son nombres de idiomas sin relación de orden ni medición continua.',
    question: '¿Qué gráfico estándar debe usarse con barras separadas para comparar la preferencia de cada idioma?',
    correctChart: 'barras',
    explanation: 'El Gráfico de Barras con espacios de separación es el más indicado para variables cualitativas nominales, ya que no existe continuidad ni jerarquía entre un idioma y otro.',
    options: [
      { type: 'barras', label: 'Gráfico de Barras' },
      { type: 'histograma', label: 'Histograma' },
      { type: 'lineas', label: 'Gráfico de Líneas' },
      { type: 'poligono', label: 'Polígono' }
    ]
  },
  {
    id: 'r5',
    situationTitle: 'Curva de distribución uniendo marcas de clase de tiempos de carrera',
    variableKindLabel: 'Cuantitativa Continua (Marcas de clase Xi)',
    context: 'En un estudio de tiempos de velocidad en 100 metros planos, se desea trazar la curva poligonal que une las marcas de clase de cada intervalo para verificar si se aproxima a una campana simétrica.',
    question: '¿Cómo se denomina este gráfico que une los puntos medios de las bases de los intervalos y se cierra en el eje horizontal?',
    correctChart: 'poligono',
    explanation: 'El Polígono de Frecuencias se forma uniendo con segmentos las marcas de clase (Xi, fi) de cada intervalo del histograma y cerrando a frecuencia cero en los extremos.',
    options: [
      { type: 'poligono', label: 'Polígono de Frecuencias' },
      { type: 'barras', label: 'Barras' },
      { type: 'circular', label: 'Gráfico Circular' },
      { type: 'lineas', label: 'Líneas temporales' }
    ]
  }
]

export default function GraficosEstadisticosView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // Modo de ejercicio: Explorar vs Reto
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('explorar')
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // Situación activa y datos en modo Explorar
  const [situationIndex, setSituationIndex] = useState<number>(0)
  const currentSituation = SITUATIONS[situationIndex]
  const [chartData, setChartData] = useState<DataItem[]>(currentSituation.data)
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('barras')
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)

  // Estado del Modo Reto
  const [retoIndex, setRetoIndex] = useState<number>(0)
  const [retosCompleted, setRetosCompleted] = useState<number>(0)
  const [retoSelectedOption, setRetoSelectedOption] = useState<ChartType | null>(null)
  const [retoFeedback, setRetoFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null)

  // Actualizar datos al cambiar de situación (preservando el tipo de gráfico elegido por el usuario)
  const handleSelectSituation = useCallback((index: number) => {
    setSituationIndex(index)
    const sit = SITUATIONS[index]
    setChartData(sit.data)
    setHoveredItemId(null)
  }, [])

  // Modificar frecuencia (+1 / -1) en la tabla
  const handleModifyFrequency = useCallback((id: string, delta: number) => {
    setChartData((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const nextFi = Math.max(1, item.fi + delta)
        return { ...item, fi: nextFi }
      })
    )
  }, [])

  // Restablecer datos originales
  const handleResetData = useCallback(() => {
    setChartData(currentSituation.data)
    setHoveredItemId(null)
  }, [currentSituation])

  // Cálculos estadísticos derivados: N, hi, hi%, ángulos para gráfico circular
  const totalN = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.fi, 0)
  }, [chartData])

  const maxFi = useMemo(() => {
    return Math.max(...chartData.map((d) => d.fi), 1)
  }, [chartData])

  const tableRows = useMemo(() => {
    return chartData.map((item) => {
      const hi = totalN > 0 ? item.fi / totalN : 0
      const hiPct = hi * 100
      const angleDeg = hi * 360
      return {
        ...item,
        hi,
        hiPct,
        angleDeg
      }
    })
  }, [chartData, totalN])

  // Evaluación pedagógica del gráfico seleccionado para la situación actual
  const chartDiagnosis = useMemo(() => {
    return currentSituation.explanations[selectedChartType] || {
      status: 'acceptable' as const,
      text: 'Evalúa si las características de la variable coinciden con este tipo de gráfico.'
    }
  }, [currentSituation, selectedChartType])

  // Manejo de respuesta en Modo Reto
  const handleAnswerReto = useCallback((type: ChartType) => {
    const currentQ = RETO_QUESTIONS[retoIndex]
    setRetoSelectedOption(type)
    const isCorrect = type === currentQ.correctChart

    if (isCorrect) {
      setRetosCompleted((prev) => prev + 1)
      setRetoFeedback({
        isCorrect: true,
        text: `¡Correcto! ${currentQ.explanation}`
      })
    } else {
      setRetoFeedback({
        isCorrect: false,
        text: `No es el más adecuado. ${currentQ.explanation}`
      })
    }
  }, [retoIndex])

  const handleNextReto = useCallback(() => {
    setRetoSelectedOption(null)
    setRetoFeedback(null)
    setRetoIndex((prev) => (prev + 1) % RETO_QUESTIONS.length)
  }, [])

  // ─── Renderizadores SVG de Gráficos Estadísticos ──────────────────────────────

  // 1. Gráfico de Barras (Separadas)
  const renderBarChart = () => {
    const width = 460
    const height = 240
    const paddingLeft = 42
    const paddingBottom = 45
    const paddingTop = 25
    const paddingRight = 15

    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom
    const barWidth = Math.min(48, Math.max(22, (plotWidth / tableRows.length) * 0.65))
    const gap = (plotWidth - barWidth * tableRows.length) / (tableRows.length + 1)

    // Eje Y: líneas de cuadrícula
    const yTicks = [0, Math.ceil(maxFi / 2), maxFi]

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
        {/* Grid horizontal */}
        {yTicks.map((tick) => {
          const yPos = paddingTop + plotHeight - (tick / maxFi) * plotHeight
          return (
            <g key={`ytick-${tick}`}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={width - paddingRight}
                y2={yPos}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={paddingLeft - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className={`font-mono text-[9px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Eje Y Label */}
        <text
          x={12}
          y={paddingTop + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${paddingTop + plotHeight / 2})`}
          className="font-bold text-[8.5px] fill-sky-500 uppercase tracking-wider"
        >
          Frecuencia (fi)
        </text>

        {/* Barras separadas */}
        {tableRows.map((item, idx) => {
          const xPos = paddingLeft + gap + idx * (barWidth + gap)
          const barHeight = (item.fi / maxFi) * plotHeight
          const yPos = paddingTop + plotHeight - barHeight
          const isHovered = hoveredItemId === item.id

          return (
            <g
              key={item.id}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => setHoveredItemId(item.id)}
            >
              {/* Barra */}
              <rect
                x={xPos}
                y={yPos}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx={3}
                fill={item.color}
                fillOpacity={hoveredItemId && !isHovered ? 0.35 : 0.9}
                stroke={isHovered ? '#ffffff' : item.color}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-200"
              />

              {/* Valor fi sobre la barra */}
              <text
                x={xPos + barWidth / 2}
                y={yPos - 5}
                textAnchor="middle"
                className={`font-mono text-[9.5px] font-black ${
                  isHovered ? 'fill-white' : isDark ? 'fill-slate-200' : 'fill-slate-800'
                }`}
              >
                {item.fi}
              </text>

              {/* Etiqueta X debajo de la barra */}
              <text
                x={xPos + barWidth / 2}
                y={paddingTop + plotHeight + 14}
                textAnchor="middle"
                className={`text-[9px] font-bold ${
                  isHovered ? 'fill-sky-400 font-black' : isDark ? 'fill-slate-300' : 'fill-slate-700'
                }`}
              >
                {item.shortLabel || item.label}
              </text>

              {/* Porcentaje en segunda línea del eje */}
              <text
                x={xPos + barWidth / 2}
                y={paddingTop + plotHeight + 25}
                textAnchor="middle"
                className="font-mono text-[8px] fill-slate-400 font-semibold"
              >
                {item.hiPct.toFixed(0)}%
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  // 2. Gráfico Circular (Sectores / Torta)
  const renderPieChart = () => {
    const width = 460
    const height = 240
    const cx = 150
    const cy = 120
    const radius = 85

    // Calcular ángulos acumulados
    let startAngle = 0
    const slices = tableRows.map((item) => {
      const angle = (item.fi / totalN) * 360
      const sAngle = startAngle
      const eAngle = startAngle + angle
      startAngle = eAngle

      // Coordenadas del arco SVG
      const radStart = ((sAngle - 90) * Math.PI) / 180
      const radEnd = ((eAngle - 90) * Math.PI) / 180

      const x1 = cx + radius * Math.cos(radStart)
      const y1 = cy + radius * Math.sin(radStart)
      const x2 = cx + radius * Math.cos(radEnd)
      const y2 = cy + radius * Math.sin(radEnd)

      const largeArcFlag = angle > 180 ? 1 : 0
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

      // Punto central del sector para ubicar etiqueta de %
      const midAngle = ((sAngle + angle / 2 - 90) * Math.PI) / 180
      const labelRadius = radius * 0.65
      const lx = cx + labelRadius * Math.cos(midAngle)
      const ly = cy + labelRadius * Math.sin(midAngle)

      return {
        ...item,
        pathData,
        lx,
        ly,
        angle
      }
    })

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
        {/* Sectores circulares */}
        {slices.map((slice) => {
          const isHovered = hoveredItemId === slice.id
          return (
            <g
              key={slice.id}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredItemId(slice.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => setHoveredItemId(slice.id)}
            >
              <path
                d={slice.pathData}
                fill={slice.color}
                fillOpacity={hoveredItemId && !isHovered ? 0.35 : 0.9}
                stroke={isDark ? '#0f172a' : '#ffffff'}
                strokeWidth={isHovered ? 3 : 1.5}
                className="transition-all duration-200"
              />
              {/* Porcentaje dentro del sector (si el ángulo es lo bastante grande) */}
              {slice.angle > 18 && (
                <text
                  x={slice.lx}
                  y={slice.ly + 3.5}
                  textAnchor="middle"
                  className="font-mono text-[9px] font-black fill-white drop-shadow-md pointer-events-none"
                >
                  {slice.hiPct.toFixed(0)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Leyenda lateral interactiva con grados y porcentaje */}
        <g transform="translate(265, 30)">
          <text
            x={0}
            y={0}
            className={`font-bold text-[10px] uppercase tracking-wide ${isDark ? 'fill-slate-300' : 'fill-slate-700'}`}
          >
            Sectores (360° total)
          </text>
          {tableRows.map((item, idx) => {
            const isHovered = hoveredItemId === item.id
            const yOffset = 18 + idx * 26
            return (
              <g
                key={`leg-${item.id}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                onClick={() => setHoveredItemId(item.id)}
              >
                <rect
                  x={0}
                  y={yOffset}
                  width={12}
                  height={12}
                  rx={2}
                  fill={item.color}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={1.5}
                />
                <text
                  x={18}
                  y={yOffset + 10}
                  className={`text-[9.5px] font-bold ${
                    isHovered ? 'fill-sky-400 font-black' : isDark ? 'fill-slate-200' : 'fill-slate-800'
                  }`}
                >
                  {item.label}
                </text>
                <text
                  x={18}
                  y={yOffset + 20}
                  className="font-mono text-[8px] fill-slate-400"
                >
                  fi: {item.fi} • {item.hiPct.toFixed(1)}% ({item.angleDeg.toFixed(0)}°)
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    )
  }

  // 3. Histograma (Barras Unidas sin Espacio para Datos Continuos)
  const renderHistogram = () => {
    const width = 460
    const height = 240
    const paddingLeft = 42
    const paddingBottom = 45
    const paddingTop = 25
    const paddingRight = 20

    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom
    const barWidth = plotWidth / tableRows.length

    const yTicks = [0, Math.ceil(maxFi / 2), maxFi]

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
        {/* Grid horizontal */}
        {yTicks.map((tick) => {
          const yPos = paddingTop + plotHeight - (tick / maxFi) * plotHeight
          return (
            <g key={`h-ytick-${tick}`}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={width - paddingRight}
                y2={yPos}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={paddingLeft - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className={`font-mono text-[9px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Eje Y Label */}
        <text
          x={12}
          y={paddingTop + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${paddingTop + plotHeight / 2})`}
          className="font-bold text-[8.5px] fill-emerald-500 uppercase tracking-wider"
        >
          Frecuencia (fi)
        </text>

        {/* Barras PEGADAS (sin espacio intermedio) */}
        {tableRows.map((item, idx) => {
          const xPos = paddingLeft + idx * barWidth
          const barHeight = (item.fi / maxFi) * plotHeight
          const yPos = paddingTop + plotHeight - barHeight
          const isHovered = hoveredItemId === item.id

          return (
            <g
              key={item.id}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => setHoveredItemId(item.id)}
            >
              <rect
                x={xPos}
                y={yPos}
                width={barWidth}
                height={Math.max(2, barHeight)}
                fill={item.color}
                fillOpacity={hoveredItemId && !isHovered ? 0.35 : 0.85}
                stroke={isHovered ? '#ffffff' : isDark ? '#0f172a' : '#ffffff'}
                strokeWidth={isHovered ? 2 : 1.5}
              />

              {/* Frecuencia fi sobre la barra */}
              <text
                x={xPos + barWidth / 2}
                y={yPos - 5}
                textAnchor="middle"
                className={`font-mono text-[9.5px] font-black ${
                  isHovered ? 'fill-white' : isDark ? 'fill-slate-200' : 'fill-slate-800'
                }`}
              >
                {item.fi}
              </text>

              {/* Límites de intervalo en el eje X */}
              {idx === 0 && item.li !== undefined && (
                <text
                  x={xPos}
                  y={paddingTop + plotHeight + 14}
                  textAnchor="middle"
                  className="font-mono text-[8.5px] font-bold fill-slate-400"
                >
                  {item.li}
                </text>
              )}
              {item.ls !== undefined && (
                <text
                  x={xPos + barWidth}
                  y={paddingTop + plotHeight + 14}
                  textAnchor="middle"
                  className="font-mono text-[8.5px] font-bold fill-slate-400"
                >
                  {item.ls}
                </text>
              )}

              {/* Marca de clase Xi en el centro */}
              {item.xi !== undefined && (
                <text
                  x={xPos + barWidth / 2}
                  y={paddingTop + plotHeight + 26}
                  textAnchor="middle"
                  className={`font-mono text-[8px] font-bold ${
                    isHovered ? 'fill-emerald-400' : 'fill-slate-400'
                  }`}
                >
                  Xi={item.xi}
                </text>
              )}
            </g>
          )
        })}

        {/* Eje X Leyenda */}
        <text
          x={paddingLeft + plotWidth / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-[9px] font-bold fill-slate-400"
        >
          Intervalos continuos {currentSituation.unit ? `[${currentSituation.unit}]` : ''} (Barras unidas)
        </text>
      </svg>
    )
  }

  // 4. Polígono de Frecuencias (Unión de Marcas de Clase Xi)
  const renderPolygonChart = () => {
    const width = 460
    const height = 240
    const paddingLeft = 42
    const paddingBottom = 45
    const paddingTop = 25
    const paddingRight = 20

    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom
    const barWidth = plotWidth / tableRows.length

    // Puntos del polígono: (x, y) en las marcas de clase de cada barra
    const points = tableRows.map((item, idx) => {
      const cx = paddingLeft + idx * barWidth + barWidth / 2
      const cy = paddingTop + plotHeight - (item.fi / maxFi) * plotHeight
      return { cx, cy, ...item }
    })

    // Cerrar el polígono en los extremos a frecuencia cero (regla pedagógica estándar)
    const firstCx = points[0] ? points[0].cx - barWidth : paddingLeft
    const lastCx = points[points.length - 1] ? points[points.length - 1].cx + barWidth : width - paddingRight
    const zeroY = paddingTop + plotHeight

    const fullPointsPath = [
      { cx: firstCx, cy: zeroY },
      ...points,
      { cx: lastCx, cy: zeroY }
    ]

    const pathData = fullPointsPath.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ')
    const areaData = `${pathData} Z`

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
        {/* Fondo sutil del histograma para dar contexto didáctico */}
        {tableRows.map((item, idx) => {
          const xPos = paddingLeft + idx * barWidth
          const barHeight = (item.fi / maxFi) * plotHeight
          const yPos = paddingTop + plotHeight - barHeight
          return (
            <rect
              key={`bg-bar-${item.id}`}
              x={xPos}
              y={yPos}
              width={barWidth}
              height={Math.max(2, barHeight)}
              fill={item.color}
              fillOpacity={0.12}
              stroke={item.color}
              strokeOpacity={0.25}
              strokeDasharray="2 2"
            />
          )
        })}

        {/* Eje horizontal */}
        <line
          x1={paddingLeft}
          y1={zeroY}
          x2={width - paddingRight}
          y2={zeroY}
          stroke={isDark ? '#475569' : '#94a3b8'}
          strokeWidth={1.5}
        />

        {/* Área sombreada bajo el polígono */}
        <path d={areaData} fill="url(#polyGrad)" fillOpacity={0.35} />

        <defs>
          <linearGradient id="polyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Línea poligonal continua */}
        <path
          d={pathData}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos sobre las marcas de clase */}
        {points.map((p) => {
          const isHovered = hoveredItemId === p.id
          return (
            <g
              key={`poly-pt-${p.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItemId(p.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => setHoveredItemId(p.id)}
            >
              {/* Línea vertical tenue hacia el eje */}
              <line
                x1={p.cx}
                y1={p.cy}
                x2={p.cx}
                y2={zeroY}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeWidth={1}
                opacity={0.4}
              />

              <circle
                cx={p.cx}
                cy={p.cy}
                r={isHovered ? 6 : 4.5}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-200"
              />

              {/* Frecuencia fi */}
              <text
                x={p.cx}
                y={p.cy - 9}
                textAnchor="middle"
                className={`font-mono text-[9px] font-black ${
                  isHovered ? 'fill-emerald-400' : isDark ? 'fill-slate-200' : 'fill-slate-800'
                }`}
              >
                {p.fi}
              </text>

              {/* Etiqueta de la marca de clase en el eje X */}
              <text
                x={p.cx}
                y={zeroY + 14}
                textAnchor="middle"
                className={`font-mono text-[8.5px] font-bold ${
                  isHovered ? 'fill-emerald-400 font-black' : 'fill-slate-400'
                }`}
              >
                {p.xi !== undefined ? `X=${p.xi}` : p.shortLabel}
              </text>
            </g>
          )
        })}

        {/* Leyenda explicativa al pie */}
        <text
          x={paddingLeft + plotWidth / 2}
          y={height - 6}
          textAnchor="middle"
          className="text-[9px] font-bold fill-emerald-500"
        >
          Polígono de frecuencias (Puntos medios Xi cerrados a fi=0 en los extremos)
        </text>
      </svg>
    )
  }

  // 5. Gráfico de Líneas (Tendencias Temporales)
  const renderLineChart = () => {
    const width = 460
    const height = 240
    const paddingLeft = 42
    const paddingBottom = 45
    const paddingTop = 25
    const paddingRight = 20

    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom
    const step = plotWidth / (tableRows.length - 1 || 1)

    const points = tableRows.map((item, idx) => {
      const cx = paddingLeft + idx * step
      const cy = paddingTop + plotHeight - (item.fi / maxFi) * plotHeight
      return { cx, cy, ...item }
    })

    const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ')
    const zeroY = paddingTop + plotHeight
    const areaData = `${pathData} L ${points[points.length - 1]?.cx || width} ${zeroY} L ${paddingLeft} ${zeroY} Z`

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
        {/* Grid horizontal */}
        {[0, Math.ceil(maxFi / 2), maxFi].map((tick) => {
          const yPos = paddingTop + plotHeight - (tick / maxFi) * plotHeight
          return (
            <g key={`l-ytick-${tick}`}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={width - paddingRight}
                y2={yPos}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={paddingLeft - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className={`font-mono text-[9px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-600'}`}
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Área suave bajo la curva */}
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#lineAreaGrad)" />

        {/* Línea de tendencia */}
        <path
          d={pathData}
          fill="none"
          stroke="#0284c7"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos y valores */}
        {points.map((p) => {
          const isHovered = hoveredItemId === p.id
          return (
            <g
              key={`line-pt-${p.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredItemId(p.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => setHoveredItemId(p.id)}
            >
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isHovered ? 6 : 4.5}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-200"
              />
              <text
                x={p.cx}
                y={p.cy - 8}
                textAnchor="middle"
                className={`font-mono text-[9.5px] font-black ${
                  isHovered ? 'fill-sky-400' : isDark ? 'fill-slate-200' : 'fill-slate-800'
                }`}
              >
                {p.fi}{currentSituation.unit ? currentSituation.unit : ''}
              </text>
              <text
                x={p.cx}
                y={zeroY + 14}
                textAnchor="middle"
                className={`text-[9px] font-bold ${
                  isHovered ? 'fill-sky-400 font-black' : isDark ? 'fill-slate-300' : 'fill-slate-700'
                }`}
              >
                {p.shortLabel || p.label}
              </text>
            </g>
          )
        })}

        <text
          x={paddingLeft + plotWidth / 2}
          y={height - 6}
          textAnchor="middle"
          className="text-[9px] font-bold fill-sky-400"
        >
          Eje de tiempo cronológico continuo
        </text>
      </svg>
    )
  }

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-900'}`}>
      {/* ── 1. CABECERA PRINCIPAL (36-44px) ── */}
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
          <span className="text-xs lg:text-sm">📈</span>
          <h1 className="text-[12px] lg:text-[14px] font-black tracking-tight truncate">
            Gráficos Estadísticos y Tipos de Variables
          </h1>
        </div>

        {/* Selector de Modo: Explorar vs Reto + Ayuda */}
        <div className="flex items-center gap-1 lg:gap-2">
          <div className={`flex items-center p-0.5 rounded-lg border text-[10px] lg:text-[11px] font-bold ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
            <button
              type="button"
              onClick={() => setExerciseMode('explorar')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                exerciseMode === 'explorar'
                  ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Explorar
            </button>
            <button
              type="button"
              onClick={() => setExerciseMode('reto')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-all flex items-center gap-1 ${
                exerciseMode === 'reto'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="h-2.5 w-2.5" />
              <span>Modo Reto</span>
              {retosCompleted > 0 && (
                <span className="ml-0.5 px-1 rounded-full bg-slate-900 text-amber-300 text-[8.5px]">
                  {retosCompleted}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className={`p-1 lg:p-1.5 rounded-lg border cursor-pointer transition-all ${
              isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Guía pedagógica de gráficos"
          >
            <HelpCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* ── 2. BARRAS DE CONTROL EN DOS FILAS (Situación + Gráfico) ── */}
      {exerciseMode === 'explorar' ? (
        <div className={`shrink-0 flex flex-col border-b text-[10px] lg:text-xs ${
          isDark ? 'bg-[#0d1424] border-white/5 divide-y divide-white/5' : 'bg-slate-50 border-slate-200 divide-y divide-slate-200'
        }`}>
          {/* Fila 1: Selector de Situación didáctica */}
          <div className="flex items-center gap-1.5 px-2 lg:px-4 py-1 overflow-x-auto no-scrollbar">
            <span className="font-bold text-slate-400 text-[9px] lg:text-[10px] uppercase tracking-wide shrink-0">
              Situación:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {SITUATIONS.map((sit, idx) => (
                <button
                  key={sit.id}
                  type="button"
                  onClick={() => handleSelectSituation(idx)}
                  className={`px-2 py-0.5 rounded font-bold text-[9.5px] lg:text-[10.5px] whitespace-nowrap cursor-pointer transition-all ${
                    situationIndex === idx
                      ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  {sit.title}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 2: Selector de Tipo de Gráfico */}
          <div className="flex items-center gap-1.5 px-2 lg:px-4 py-1 overflow-x-auto no-scrollbar">
            <span className="font-bold text-slate-400 text-[9px] lg:text-[10px] uppercase tracking-wide shrink-0">
              Gráfico:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'barras', label: 'Barras (Separadas)', icon: BarChart3 },
                { id: 'circular', label: 'Circular (Sectores)', icon: PieChart },
                { id: 'histograma', label: 'Histograma (Unidas)', icon: Layers },
                { id: 'poligono', label: 'Polígono (Marcas Xi)', icon: Activity },
                { id: 'lineas', label: 'Líneas (Tendencia)', icon: TrendingUp }
              ].map((g) => {
                const Icon = g.icon
                const isSelected = selectedChartType === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedChartType(g.id as ChartType)}
                    className={`px-2 py-0.5 rounded font-bold text-[9.5px] lg:text-[10.5px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    <Icon className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                    <span>{g.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Barra de control para Modo Reto */
        <div className={`relative shrink-0 flex items-center justify-between gap-1.5 border-b px-2 lg:px-4 py-1.5 text-[10px] lg:text-xs overflow-x-auto no-scrollbar ${
          isDark ? 'bg-[#0d1424] border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black text-[10px]">
              Reto {retoIndex + 1} de {RETO_QUESTIONS.length}
            </span>
            <span className="text-[10.5px] font-bold text-slate-300 truncate">
              {RETO_QUESTIONS[retoIndex].situationTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextReto}
            className="px-2.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] cursor-pointer"
          >
            Siguiente Reto →
          </button>
        </div>
      )}

      {/* ── 3. ÁREA DE TRABAJO PRINCIPAL (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch p-1 sm:p-2 lg:p-3 gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">
        {exerciseMode === 'explorar' ? (
          <>
            {/* ── PANEL IZQUIERDO: FICHA + TABLA DE FRECUENCIA INTERACTIVA ── */}
            <div className={`w-full md:w-[45%] lg:w-[42%] shrink-0 flex flex-col justify-between p-1.5 lg:p-2.5 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              {/* Encabezado de situación y variable */}
              <div className="shrink-0 mb-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-extrabold text-xs lg:text-[13px] text-sky-400">
                    {currentSituation.title}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full font-mono text-[8px] sm:text-[8.5px] font-black uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {currentSituation.variableKindLabel}
                  </span>
                </div>
                <p className="text-[8.5px] sm:text-[9px] text-slate-400 line-clamp-2 leading-tight">
                  {currentSituation.description}
                </p>
              </div>

              {/* Tabla de Frecuencias estilo Excel */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar rounded-lg border border-white/10 my-1">
                <table className="w-full text-[9px] sm:text-[10px] border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold ${isDark ? 'bg-slate-900/90 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      <th className="py-1 px-1.5 text-left font-bold">
                        {currentSituation.variableKind === 'cuantitativa_continua' ? 'Intervalo' : 'Categoría (xi)'}
                      </th>
                      {currentSituation.variableKind === 'cuantitativa_continua' && (
                        <th className="py-1 px-1 text-center font-bold text-emerald-400" title="Marca de clase">Xi</th>
                      )}
                      <th className="py-1 px-1 text-center font-bold text-sky-400" title="Frecuencia absoluta">fi</th>
                      <th className="py-1 px-1 text-center font-bold" title="Frecuencia relativa">hi</th>
                      <th className="py-1 px-1 text-center font-bold text-amber-400" title="Porcentaje">hi %</th>
                      {selectedChartType === 'circular' && (
                        <th className="py-1 px-1 text-center font-bold text-purple-400" title="Ángulo en grados">Ángulo (α)</th>
                      )}
                      <th className="py-1 px-1 text-center font-bold text-slate-400" title="Ajustar">±</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      const isHovered = hoveredItemId === row.id
                      return (
                        <tr
                          key={row.id}
                          onMouseEnter={() => setHoveredItemId(row.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          onClick={() => setHoveredItemId(row.id)}
                          className={`border-b cursor-pointer transition-colors ${
                            isDark ? 'border-white/5' : 'border-slate-100'
                          } ${
                            isHovered
                              ? isDark
                                ? 'bg-sky-500/20 text-white font-bold'
                                : 'bg-sky-100 text-slate-900 font-bold'
                              : isDark
                              ? 'hover:bg-white/5 text-slate-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {/* Categoría / Intervalo con indicador de color */}
                          <td className="py-1 px-1.5 flex items-center gap-1 font-sans">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="truncate max-w-[120px]">{row.label}</span>
                          </td>

                          {/* Marca de clase Xi (si aplica) */}
                          {currentSituation.variableKind === 'cuantitativa_continua' && (
                            <td className="py-1 px-1 text-center font-bold text-emerald-400">
                              {row.xi}
                            </td>
                          )}

                          {/* Frecuencia fi */}
                          <td className="py-1 px-1 text-center font-black text-sky-400">
                            {row.fi}
                          </td>

                          {/* Frecuencia relativa hi */}
                          <td className="py-1 px-1 text-center opacity-80">
                            {row.hi.toFixed(2)}
                          </td>

                          {/* Porcentaje hi% */}
                          <td className="py-1 px-1 text-center font-bold text-amber-400">
                            {row.hiPct.toFixed(0)}%
                          </td>

                          {/* Ángulo en grados si es gráfico circular */}
                          {selectedChartType === 'circular' && (
                            <td className="py-1 px-1 text-center font-bold text-purple-400">
                              {row.angleDeg.toFixed(0)}°
                            </td>
                          )}

                          {/* Botones de ajuste manual (+ / -) */}
                          <td className="py-0.5 px-0.5 text-center">
                            <div className="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleModifyFrequency(row.id, -1)
                                }}
                                className="w-3.5 h-3.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-black flex items-center justify-center cursor-pointer transition-all active:scale-95"
                                title="Disminuir frecuencia"
                              >
                                <Minus className="h-2 w-2" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleModifyFrequency(row.id, 1)
                                }}
                                className="w-3.5 h-3.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-black flex items-center justify-center cursor-pointer transition-all active:scale-95"
                                title="Aumentar frecuencia"
                              >
                                <Plus className="h-2 w-2" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Fila Total (Σ) */}
                  <tfoot>
                    <tr className={`font-black border-t-2 ${isDark ? 'bg-slate-900/90 text-white border-white/20' : 'bg-slate-100 text-slate-900 border-slate-300'}`}>
                      <td className="py-1 px-1.5 uppercase font-sans">TOTAL (Σ)</td>
                      {currentSituation.variableKind === 'cuantitativa_continua' && <td className="py-1 px-1 text-center">—</td>}
                      <td className="py-1 px-1 text-center text-sky-400">N = {totalN}</td>
                      <td className="py-1 px-1 text-center">1.00</td>
                      <td className="py-1 px-1 text-center text-amber-400">100%</td>
                      {selectedChartType === 'circular' && (
                        <td className="py-1 px-1 text-center text-purple-400">360°</td>
                      )}
                      <td className="py-1 px-0.5 text-center">
                        <button
                          type="button"
                          onClick={handleResetData}
                          className="text-[7.5px] px-1 py-0.2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"
                          title="Restablecer frecuencias originales"
                        >
                          ↺
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Caja Pedagógica: ¿Por qué esta variable? */}
              <div className={`p-1.5 lg:p-2 rounded-lg border text-[8.5px] sm:text-[9px] shrink-0 leading-tight ${
                isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-1 font-bold text-sky-400 mb-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Regla matemática de selección:</span>
                </div>
                <div>
                  {currentSituation.variableKind === 'cualitativa_nominal' && 'Las categorías no tienen orden. Las barras separadas evitan sugerir una falsa escala continua.'}
                  {currentSituation.variableKind === 'cualitativa_ordinal' && 'Las categorías poseen jerarquía cualitativa. Las barras deben ordenarse secuencialmente.'}
                  {currentSituation.variableKind === 'cuantitativa_discreta' && 'Valores numéricos exactos (enteros). Cada barra aislada representa un número concreto.'}
                  {currentSituation.variableKind === 'cuantitativa_continua' && 'Datos agrupados en intervalos métricos. Las barras del histograma van pegadas para reflejar continuidad.'}
                  {currentSituation.variableKind === 'serie_temporal' && 'Evolución cronológica. El gráfico de líneas une momentos temporales para mostrar tendencias.'}
                </div>
              </div>
            </div>

            {/* ── PANEL DERECHO: VISUALIZADOR DE GRÁFICO DINÁMICO + DIAGNÓSTICO ── */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between p-1.5 lg:p-2.5 rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              {/* Cabecera del gráfico con diagnóstico pedagógico */}
              <div className="shrink-0 flex items-center justify-between gap-1.5 pb-1 border-b border-white/10">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs lg:text-[13px] capitalize">
                    {selectedChartType === 'barras' && '📊 Gráfico de Barras'}
                    {selectedChartType === 'circular' && '🥧 Gráfico Circular (Sectores)'}
                    {selectedChartType === 'histograma' && '📶 Histograma (Barras Unidas)'}
                    {selectedChartType === 'poligono' && '📈 Polígono de Frecuencias'}
                    {selectedChartType === 'lineas' && '📉 Gráfico de Líneas (Tendencia)'}
                  </span>
                </div>

                {/* Badge de diagnóstico: Óptimo / Aceptable / Incorrecto */}
                <div className={`px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-black flex items-center gap-1 ${
                  chartDiagnosis.status === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : chartDiagnosis.status === 'acceptable'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {chartDiagnosis.status === 'optimal' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {chartDiagnosis.status === 'acceptable' && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                  {chartDiagnosis.status === 'wrong' && <XCircle className="h-3 w-3 text-rose-400" />}
                  <span>
                    {chartDiagnosis.status === 'optimal' && 'Gráfico Óptimo'}
                    {chartDiagnosis.status === 'acceptable' && 'Uso Aceptable'}
                    {chartDiagnosis.status === 'wrong' && 'No Recomendado'}
                  </span>
                </div>
              </div>

              {/* Área del Gráfico SVG (Centrado y Reactivo) */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-1 relative">
                {selectedChartType === 'barras' && renderBarChart()}
                {selectedChartType === 'circular' && renderPieChart()}
                {selectedChartType === 'histograma' && renderHistogram()}
                {selectedChartType === 'poligono' && renderPolygonChart()}
                {selectedChartType === 'lineas' && renderLineChart()}
              </div>

              {/* Explicación Pedagógica del Diagnóstico (Abajo) */}
              <div className={`p-1.5 lg:p-2 rounded-lg border text-[9px] sm:text-[9.5px] lg:text-[10px] leading-tight shrink-0 transition-all ${
                chartDiagnosis.status === 'optimal'
                  ? isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : chartDiagnosis.status === 'acceptable'
                  ? isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                  : isDark ? 'bg-rose-500/10 border-rose-500/25 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>{chartDiagnosis.text}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── MODO RETO: ¿QUÉ GRÁFICO USARÍAS? ── */
          <div className="flex-1 min-w-0 flex flex-col md:flex-row gap-2 lg:gap-3 overflow-hidden">
            {/* Tarjeta de la Pregunta y Situación */}
            <div className={`w-full md:w-1/2 flex flex-col justify-between p-2 lg:p-3 rounded-xl border ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {RETO_QUESTIONS[retoIndex].variableKindLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Puntos acumulados: {retosCompleted}
                  </span>
                </div>

                <h3 className="font-black text-sm lg:text-base text-white">
                  {RETO_QUESTIONS[retoIndex].situationTitle}
                </h3>

                <div className={`p-2 rounded-lg border text-xs leading-relaxed ${
                  isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                }`}>
                  <p className="font-semibold text-slate-400 text-[10px] uppercase mb-1">Contexto del Estudio:</p>
                  <p>{RETO_QUESTIONS[retoIndex].context}</p>
                </div>

                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold text-xs lg:text-sm">
                  ❓ {RETO_QUESTIONS[retoIndex].question}
                </div>
              </div>

              {/* Feedback del Reto */}
              {retoFeedback && (
                <div className={`p-2 rounded-lg border text-xs leading-relaxed shrink-0 my-1 animate-in fade-in duration-200 ${
                  retoFeedback.isCorrect
                    ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : isDark ? 'bg-rose-500/15 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    {retoFeedback.isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                    <span>{retoFeedback.isCorrect ? '¡Respuesta Correcta!' : 'Intenta comprender por qué:'}</span>
                  </div>
                  <p className="text-[11px]">{retoFeedback.text}</p>
                </div>
              )}
            </div>

            {/* Opciones de Gráficos para Elegir */}
            <div className={`w-full md:w-1/2 flex flex-col justify-between p-2 lg:p-3 rounded-xl border ${
              isDark ? 'bg-[#0b101f] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div>
                <span className="font-bold text-xs text-slate-400 uppercase tracking-wide block mb-2">
                  Selecciona la mejor opción:
                </span>
                <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                  {RETO_QUESTIONS[retoIndex].options.map((opt) => {
                    const isSelected = retoSelectedOption === opt.type
                    const isCorrect = opt.type === RETO_QUESTIONS[retoIndex].correctChart
                    const hasAnswered = retoSelectedOption !== null

                    let btnStyle = isDark ? 'bg-slate-800/80 hover:bg-slate-700/80 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                    if (hasAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500/25 border-emerald-500 text-emerald-300 font-black'
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/25 border-rose-500 text-rose-300'
                      } else {
                        btnStyle = 'opacity-40 border-slate-700'
                      }
                    }

                    return (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleAnswerReto(opt.type)}
                        className={`p-2 lg:p-3 rounded-lg border text-left font-bold text-xs lg:text-sm flex items-center justify-between cursor-pointer transition-all ${btnStyle}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>
                            {opt.type === 'barras' && '📊'}
                            {opt.type === 'circular' && '🥧'}
                            {opt.type === 'histograma' && '📶'}
                            {opt.type === 'poligono' && '📈'}
                            {opt.type === 'lineas' && '📉'}
                          </span>
                          <span>{opt.label}</span>
                        </span>
                        {hasAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        {hasAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-rose-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {retoFeedback && (
                <button
                  type="button"
                  onClick={handleNextReto}
                  className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer mt-2 shadow-xs active:scale-95 transition-all"
                >
                  Continuar al Siguiente Reto →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DE AYUDA PEDAGÓGICA (ModalHelp) ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cuándo usar cada tipo de gráfico estadístico?"
        buttonColor="bg-sky-600 hover:bg-sky-500"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <h2 className="text-base font-black text-sky-400 flex items-center gap-1.5">
            <span>📈</span>
            <span>¿Cuándo usar cada tipo de gráfico estadístico?</span>
          </h2>

          <div className="space-y-2 text-[11px]">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <strong className="text-sky-300 block mb-0.5">1. Gráfico de Barras (Separadas):</strong>
              <p>
                Para variables <strong>cualitativas</strong> (nominales u ordinales) o <strong>cuantitativas discretas</strong>. Las barras van separadas para indicar que no hay continuidad numérica entre una opción y otra.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <strong className="text-purple-300 block mb-0.5">2. Gráfico Circular (de Sectores):</strong>
              <p>
                Para mostrar la <strong>proporción del total (100%)</strong>. Es ideal cuando hay pocas categorías (3 a 5). Cada sector se calcula con su ángulo: <code>Ángulo = hi × 360°</code>.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <strong className="text-emerald-300 block mb-0.5">3. Histograma:</strong>
              <p>
                <strong>Exclusivo para variables cuantitativas continuas</strong> con datos agrupados en intervalos <code>[Li - Ls)</code>. Las barras van <strong>completamente unidas</strong> para reflejar la continuidad matemática.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <strong className="text-teal-300 block mb-0.5">4. Polígono de Frecuencias:</strong>
              <p>
                Se traza uniendo con rectas los puntos medios (marcas de clase <code>Xi</code>) en el tope de cada barra del histograma, y cerrando en cero en ambos extremos.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <strong className="text-amber-300 block mb-0.5">5. Gráfico de Líneas (Series Temporales):</strong>
              <p>
                Para variables cuantitativas que cambian en el <strong>tiempo</strong> (días, meses, años). Permite visualizar tendencias de crecimiento o caída.
              </p>
            </div>
          </div>
        </div>
      </ModalHelp>
    </div>
  )
}
