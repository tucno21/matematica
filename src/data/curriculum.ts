import {
    BarChart3,
    Calculator,
    Gamepad2,
    Scale,
    Shapes,
    type LucideIcon,
} from 'lucide-react'
import type { Accent, Competency, CompetencyId, Topic } from '../types'

const PATHS: Record<CompetencyId, string> = {
    cantidad: '/competencia/cantidad',
    regularidad: '/competencia/regularidad',
    forma: '/competencia/forma',
    datos: '/competencia/datos',
    recreativa: '/competencia/recreativa',
}

/**
 * Competencias del área de Matemática según el Currículo Nacional (MINEDU),
 * más una sección extra de actividades recreativas.
 */
export const competencies: Competency[] = [
    {
        id: 'cantidad',
        path: PATHS.cantidad,
        title: 'Resuelve problemas de cantidad',
        shortTitle: 'Cantidad',
        description:
            'Números enteros, operaciones y fracciones para resolver situaciones de la vida diaria.',
        cardHint: 'Números, operaciones y fracciones',
        capacities: [
            'Traduce cantidades a expresiones numéricas',
            'Comunica su comprensión sobre los números y las operaciones',
            'Usa estrategias y procedimientos de estimación y cálculo',
            'Argumenta afirmaciones sobre las relaciones numéricas y las operaciones',
        ],
        accent: 'teal',
    },
    {
        id: 'regularidad',
        path: PATHS.regularidad,
        title: 'Resuelve problemas de regularidad, equivalencia y cambio',
        shortTitle: 'Regularidad y cambio',
        description:
            'Patrones, igualdades y ecuaciones para describir cómo cambian las cantidades.',
        cardHint: 'Patrones, igualdades y ecuaciones',
        capacities: [
            'Traduce datos y condiciones a expresiones algebraicas y gráficas',
            'Comunica su comprensión sobre las relaciones algebraicas',
            'Usa estrategias y procedimientos para encontrar equivalencias y reglas generales',
            'Argumenta afirmaciones sobre relaciones de cambio y equivalencia',
        ],
        accent: 'violet',
    },
    {
        id: 'forma',
        path: PATHS.forma,
        title: 'Resuelve problemas de forma, movimiento y localización',
        shortTitle: 'Forma y espacio',
        description:
            'Figuras geométricas, medidas y desplazamientos para ubicarse en el espacio.',
        cardHint: 'Figuras, medidas y ubicación',
        capacities: [
            'Modela objetos con formas geométricas y sus transformaciones',
            'Comunica su comprensión sobre las formas y relaciones geométricas',
            'Usa estrategias y procedimientos para orientarse en el espacio',
            'Argumenta afirmaciones sobre relaciones geométricas',
        ],
        accent: 'amber',
    },
    {
        id: 'datos',
        path: PATHS.datos,
        title: 'Resuelve problemas de gestión de datos e incertidumbre',
        shortTitle: 'Datos e incertidumbre',
        description:
            'Recolecta, organiza e interpreta datos para tomar decisiones y estimar probabilidades.',
        cardHint: 'Estadística y probabilidad',
        capacities: [
            'Representa datos con gráficos y medidas estadísticas o probabilísticas',
            'Comunica la comprensión de los conceptos estadísticos y probabilísticos',
            'Usa estrategias y procedimientos para recopilar y procesar datos',
            'Sustenta conclusiones o decisiones a partir de la información obtenida',
        ],
        accent: 'sky',
    },
    {
        id: 'recreativa',
        path: PATHS.recreativa,
        title: 'Actividad recreativa',
        shortTitle: 'Recreativa',
        description:
            'Juegos de lógica y pensamiento: aprende matemática resolviendo retos divertidos.',
        cardHint: 'Juegos de lógica y pensamiento',
        capacities: [],
        accent: 'rose',
    },
]

export const recreativa: Competency = competencies[competencies.length - 1]

export const competencyIcons: Record<CompetencyId, LucideIcon> = {
    cantidad: Calculator,
    regularidad: Scale,
    forma: Shapes,
    datos: BarChart3,
    recreativa: Gamepad2,
}

export const accents: Record<
    Accent,
    {
        text: string
        bg: string
        border: string
        gradient: string
        shadow: string
        solid: string
        ring: string
    }
> = {
    teal: {
        text: 'text-teal-300',
        bg: 'bg-teal-400/10',
        border: 'border-teal-400/25',
        gradient: 'from-teal-400/15',
        shadow: 'hover:shadow-teal-500/20',
        solid: 'bg-teal-400',
        ring: 'focus:ring-teal-400',
    },
    violet: {
        text: 'text-violet-300',
        bg: 'bg-violet-400/10',
        border: 'border-violet-400/25',
        gradient: 'from-violet-400/15',
        shadow: 'hover:shadow-violet-500/20',
        solid: 'bg-violet-400',
        ring: 'focus:ring-violet-400',
    },
    amber: {
        text: 'text-amber-300',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/25',
        gradient: 'from-amber-400/15',
        shadow: 'hover:shadow-amber-500/20',
        solid: 'bg-amber-400',
        ring: 'focus:ring-amber-400',
    },
    sky: {
        text: 'text-sky-300',
        bg: 'bg-sky-400/10',
        border: 'border-sky-400/25',
        gradient: 'from-sky-400/15',
        shadow: 'hover:shadow-sky-500/20',
        solid: 'bg-sky-400',
        ring: 'focus:ring-sky-400',
    },
    rose: {
        text: 'text-rose-300',
        bg: 'bg-rose-400/10',
        border: 'border-rose-400/25',
        gradient: 'from-rose-400/15',
        shadow: 'hover:shadow-rose-500/20',
        solid: 'bg-rose-400',
        ring: 'focus:ring-rose-400',
    },
}

export const topics: Topic[] = [
    // ── Cantidad ─────────────────────────────────────────────────────────────
    { id: 'intro', competency: 'cantidad', path: '/intro-enteros', title: 'Introducción a Enteros', description: 'Números positivos y negativos', available: true },
    { id: 'recta', competency: 'cantidad', path: '/recta-numerica', title: 'Recta Numérica Enteros', description: 'Ubicación en la recta', available: true },
    { id: 'suma', competency: 'cantidad', path: '/suma-enteros', title: 'Suma de Enteros', description: 'Operaciones básicas enteros', available: true },
    { id: 'resta', competency: 'cantidad', path: '/resta-enteros', title: 'Resta de Enteros', description: 'Operaciones básicas enteros', available: true },
    { id: 'producto', competency: 'cantidad', path: '/producto-enteros', title: 'Multiplicación de Enteros', description: 'Operaciones básicas enteros', available: true },
    { id: 'division', competency: 'cantidad', path: '/division-enteros', title: 'División de Enteros', description: 'Operaciones básicas enteros', available: true },
    { id: 'concepto-fraccion', competency: 'cantidad', path: '/concepto-fraccion', title: '¿Qué es una Fracción?', description: 'Explora fracciones libremente', available: true },
    { id: 'regleta-fracciones', competency: 'cantidad', path: '/regleta-fracciones', title: 'Regleta de Fracciones', description: 'Fracciones interactivas', available: true },
    { id: 'recta-numerica-fracciones', competency: 'cantidad', path: '/recta-numerica-fracciones', title: 'Fracciones en la Recta', description: 'Ubica fracciones en la recta numérica', available: true },
    { id: 'suma-resta-fracciones', competency: 'cantidad', path: '/suma-resta-fracciones', title: 'Suma y Resta de Fracciones', description: 'Operaciones con fracciones', available: true },
    { id: 'multiplicar-fracciones', competency: 'cantidad', path: '/multiplicar-fracciones', title: 'Multiplicar Fracciones', description: 'Multiplicación visual de fracciones', available: true },
    { id: 'division-fracciones', competency: 'cantidad', path: '/division-fracciones', title: 'Dividir Fracciones', description: 'División visual de fracciones', available: true },
    { id: 'fraccion-conjunto', competency: 'cantidad', path: '/fraccion-conjunto', title: 'Fracción de un Conjunto', description: 'Parte de un grupo de objetos', available: true },

    // ── Forma, movimiento y localización ─────────────────────────────────────
    { id: 'geoplano', competency: 'forma', path: '/geoplano', title: 'Geoplano', description: 'Figuras con ligas y retos', available: true },

    // ── Regularidad, equivalencia y cambio ───────────────────────────────────
    { id: 'igualdad-balanza', competency: 'regularidad', path: '/igualdad-balanza', title: 'Igualdad con Balanza', description: 'Propiedades de la igualdad', available: true },
    { id: 'balanza-ecuacion', competency: 'regularidad', path: '/balanza-ecuacion', title: 'Balanza de Ecuaciones', description: 'Resuelve ecuaciones de primer grado', available: true },

    // ── Recreativa ───────────────────────────────────────────────────────────
    { id: 'tres-jarras', competency: 'recreativa', path: '/tres-jarras', title: 'Las Tres Jarras', description: 'Pensamiento lógico', available: true },
    { id: 'tres-pescados', competency: 'recreativa', path: '/tres-pescados', title: 'Los Tres Pescados', description: 'Pensamiento lógico', available: true },
    { id: 'granjero-rio', competency: 'recreativa', path: '/granjero-rio', title: 'El Granjero y el Río', description: 'Pensamiento lógico', available: true },
    { id: 'moneda-falsa', competency: 'recreativa', path: '/moneda-falsa', title: 'La Moneda Falsa', description: 'Pensamiento lógico', available: true },
]

export function getCompetency(id: string | undefined): Competency | undefined {
    return competencies.find((competency) => competency.id === id)
}

export function getTopicsByCompetency(id: CompetencyId): Topic[] {
    return topics.filter((topic) => topic.competency === id)
}
