import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// ─── Tipos y Modelos ──────────────────────────────────────────────────────────
export type ProbabilidadTab = 'descubrir' | 'laplace'
export type ExperimentId = 'dado' | 'monedas' | 'ruleta' | 'urna'

export interface SampleItem {
  id: string
  label: string
  value: number | string
  sublabel?: string
  color: string
}

export interface ProbEvent {
  id: string
  name: string
  description: string
  targetValue?: string | number
  condition: (item: SampleItem) => boolean
}

export interface DiscoveryChallenge {
  id: string
  title: string
  question: string
  isFavorable: (item: SampleItem) => boolean
  explanation: string
  conclusion: string
}

export interface ExperimentDef {
  id: ExperimentId
  title: string
  shortTitle: string
  icon: string
  description: string
  sampleSpace: SampleItem[]
  events: ProbEvent[]
  unitName: string
  defaultRetoTarget: string | number
  retoQuestion: string
  challenges: DiscoveryChallenge[]
}

// ─── Catálogo de Experimentos Didácticos ───────────────────────────────────────
const EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'dado',
    title: 'Lanzamiento de un Dado de 6 Caras',
    shortTitle: 'Dado (6 caras)',
    icon: '🎲',
    description: 'Un dado clásico de 6 caras con puntos del 1 al 6.',
    unitName: 'caras',
    defaultRetoTarget: 4,
    retoQuestion: '¿Cuál es la probabilidad de que al lanzar el dado salga el 4?',
    challenges: [
      {
        id: 'dado-c1',
        title: 'Ejercicio 1',
        question: '¿Cuál es la probabilidad de que al lanzar el dado salga el 4?',
        isFavorable: (it) => it.value === 4,
        explanation: 'Solo 1 cara cumple la condición (la cara 4) de las 6 caras posibles.',
        conclusion: 'Cada cara tiene exactamente la misma probabilidad: 1 de 6 (16.7%). Por eso decimos que es un experimento justo y equiprobable.'
      },
      {
        id: 'dado-c2',
        title: 'Ejercicio 2',
        question: '¿Cuál es la probabilidad de que al lanzar el dado salga un número mayor que 4?',
        isFavorable: (it) => typeof it.value === 'number' && it.value > 4,
        explanation: '2 caras cumplen la condición (el 5 y el 6) de las 6 caras posibles.',
        conclusion: 'Hay 2 casos favorables entre 6 casos posibles: P(A) = 2/6 = 1/3 (33.3%). ¡La probabilidad aumenta al haber más casos a favor!'
      }
    ],
    sampleSpace: [
      { id: 'd-1', label: 'Cara 1', value: 1, sublabel: '1 Punto', color: '#0284c7' },
      { id: 'd-2', label: 'Cara 2', value: 2, sublabel: '2 Puntos', color: '#059669' },
      { id: 'd-3', label: 'Cara 3', value: 3, sublabel: '3 Puntos', color: '#d97706' },
      { id: 'd-4', label: 'Cara 4', value: 4, sublabel: '4 Puntos', color: '#7c3aed' },
      { id: 'd-5', label: 'Cara 5', value: 5, sublabel: '5 Puntos', color: '#db2777' },
      { id: 'd-6', label: 'Cara 6', value: 6, sublabel: '6 Puntos', color: '#0891b2' }
    ],
    events: [
      {
        id: 'cuatro',
        name: 'Sacar el 4',
        description: 'Obtener exactamente la cara con 4 puntos',
        targetValue: 4,
        condition: (it) => it.value === 4
      },
      {
        id: 'par',
        name: 'Sacar número Par',
        description: 'Obtener 2, 4 o 6',
        condition: (it) => typeof it.value === 'number' && it.value % 2 === 0
      },
      {
        id: 'impar',
        name: 'Sacar número Impar',
        description: 'Obtener 1, 3 o 5',
        condition: (it) => typeof it.value === 'number' && it.value % 2 !== 0
      },
      {
        id: 'mayor4',
        name: 'Sacar Mayor que 4',
        description: 'Obtener el 5 o el 6',
        condition: (it) => typeof it.value === 'number' && it.value > 4
      }
    ]
  },
  {
    id: 'monedas',
    title: 'Lanzamiento de Dos Monedas al Aire',
    shortTitle: '2 Monedas (4 resultados)',
    icon: '🪙',
    description: 'Se lanzan dos monedas al aire. Cada moneda puede caer en Cara (C) o Sello (S).',
    unitName: 'combinaciones',
    defaultRetoTarget: 'CC',
    retoQuestion: '¿Cuál es la probabilidad de que ambas monedas salgan Cara?',
    challenges: [
      {
        id: 'monedas-c1',
        title: 'Ejercicio 1',
        question: '¿Cuál es la probabilidad de que ambas monedas salgan Cara?',
        isFavorable: (it) => it.value === 'CC',
        explanation: 'Solo 1 combinación cumple la condición (CC) de las 4 posibles.',
        conclusion: 'Cada una de las 4 combinaciones tiene la misma probabilidad: 1 de 4 (25.0%).'
      },
      {
        id: 'monedas-c2',
        title: 'Ejercicio 2',
        question: '¿Cuál es la probabilidad de obtener una Cara y un Sello?',
        isFavorable: (it) => it.value === 'CS' || it.value === 'SC',
        explanation: '2 combinaciones cumplen la condición (CS y SC) de las 4 posibles.',
        conclusion: 'Hay 2 casos favorables entre 4 posibles: P(A) = 2/4 = 1/2 (50.0%). ¡Es el doble de probable que sacar dos caras!'
      }
    ],
    sampleSpace: [
      { id: 'm-cc', label: 'Cara - Cara', value: 'CC', sublabel: '2 Caras', color: '#d97706' },
      { id: 'm-cs', label: 'Cara - Sello', value: 'CS', sublabel: '1 Cara, 1 Sello', color: '#059669' },
      { id: 'm-sc', label: 'Sello - Cara', value: 'SC', sublabel: '1 Sello, 1 Cara', color: '#0284c7' },
      { id: 'm-ss', label: 'Sello - Sello', value: 'SS', sublabel: '2 Sellos', color: '#7c3aed' }
    ],
    events: [
      {
        id: 'dos_caras',
        name: 'Exactamente dos Caras (CC)',
        description: 'Ambas monedas caen en Cara al mismo tiempo',
        targetValue: 'CC',
        condition: (it) => it.value === 'CC'
      },
      {
        id: 'al_menos_una_cara',
        name: 'Al menos una Cara',
        description: 'Obtener 1 o 2 caras (CC, CS o SC)',
        condition: (it) => String(it.value).includes('C')
      },
      {
        id: 'distintas',
        name: 'Una Cara y un Sello',
        description: 'Resultados combinados: CS o SC',
        condition: (it) => it.value === 'CS' || it.value === 'SC'
      }
    ]
  },
  {
    id: 'ruleta',
    title: 'Ruleta de Sectores Iguales (8 Partes)',
    shortTitle: 'Ruleta (8 sectores)',
    icon: '🎡',
    description: 'Una ruleta dividida en 8 sectores del mismo tamaño: 4 Azules, 3 Naranjas y 1 Dorado especial.',
    unitName: 'sectores',
    defaultRetoTarget: 8,
    retoQuestion: '¿Cuál es la probabilidad de que la ruleta se detenga en el Sector Dorado?',
    challenges: [
      {
        id: 'ruleta-c1',
        title: 'Ejercicio 1',
        question: '¿Cuál es la probabilidad de que la ruleta se detenga en el Sector Dorado?',
        isFavorable: (it) => it.sublabel === 'Dorado',
        explanation: 'Solo 1 sector cumple la condición (Sector 8) de los 8 sectores posibles.',
        conclusion: 'Cada uno de los 8 sectores tiene la misma probabilidad: 1 de 8 (12.5%).'
      },
      {
        id: 'ruleta-c2',
        title: 'Ejercicio 2',
        question: '¿Cuál es la probabilidad de que la ruleta se detenga en un Sector Naranja?',
        isFavorable: (it) => it.sublabel === 'Naranja',
        explanation: '3 sectores cumplen la condición (sectores 2, 4 y 6) de los 8 posibles.',
        conclusion: 'Al haber 3 sectores naranjas de 8 posibles: P(A) = 3/8 (37.5%). ¡Tiene el triple de chance que el sector dorado!'
      }
    ],
    sampleSpace: [
      { id: 'r-1', label: 'Sector 1 (Azul)', value: 1, sublabel: 'Azul', color: '#0284c7' },
      { id: 'r-2', label: 'Sector 2 (Naranja)', value: 2, sublabel: 'Naranja', color: '#ea580c' },
      { id: 'r-3', label: 'Sector 3 (Azul)', value: 3, sublabel: 'Azul', color: '#0284c7' },
      { id: 'r-4', label: 'Sector 4 (Naranja)', value: 4, sublabel: 'Naranja', color: '#ea580c' },
      { id: 'r-5', label: 'Sector 5 (Azul)', value: 5, sublabel: 'Azul', color: '#0284c7' },
      { id: 'r-6', label: 'Sector 6 (Naranja)', value: 6, sublabel: 'Naranja', color: '#ea580c' },
      { id: 'r-7', label: 'Sector 7 (Azul)', value: 7, sublabel: 'Azul', color: '#0284c7' },
      { id: 'r-8', label: 'Sector 8 (Dorado ⭐)', value: 8, sublabel: 'Dorado', color: '#ca8a04' }
    ],
    events: [
      {
        id: 'dorado',
        name: 'Caer en sector Dorado ⭐',
        description: 'El sector premio de la ruleta: Sector 8',
        targetValue: 8,
        condition: (it) => it.sublabel === 'Dorado'
      },
      {
        id: 'azul',
        name: 'Caer en sector Azul',
        description: 'La aguja se detiene en los sectores 1, 3, 5 o 7',
        condition: (it) => it.sublabel === 'Azul'
      },
      {
        id: 'naranja',
        name: 'Caer en sector Naranja',
        description: 'La aguja se detiene en los sectores 2, 4 o 6',
        condition: (it) => it.sublabel === 'Naranja'
      }
    ]
  },
  {
    id: 'urna',
    title: 'Extracción a Ciegas de una Urna (10 Bolas)',
    shortTitle: 'Urna (10 bolas)',
    icon: '🎱',
    description: 'Una urna contiene 10 esferas idénticas al tacto: 5 Celestes, 3 Verdes y 2 Amarillas.',
    unitName: 'bolas',
    defaultRetoTarget: 'Amarilla',
    retoQuestion: '¿Cuál es la probabilidad de meter la mano y sacar una Bola Amarilla?',
    challenges: [
      {
        id: 'urna-c1',
        title: 'Ejercicio 1',
        question: '¿Cuál es la probabilidad de meter la mano y sacar una Bola Amarilla?',
        isFavorable: (it) => it.sublabel === 'Amarilla',
        explanation: '2 bolas cumplen la condición (las 2 amarillas) de las 10 bolas posibles.',
        conclusion: 'Hay 2 bolas amarillas entre 10 posibles: P(A) = 2/10 = 1/5 (20.0%).'
      },
      {
        id: 'urna-c2',
        title: 'Ejercicio 2',
        question: '¿Cuál es la probabilidad de meter la mano y sacar una Bola Verde?',
        isFavorable: (it) => it.sublabel === 'Verde',
        explanation: '3 bolas cumplen la condición (las 3 verdes) de las 10 bolas posibles.',
        conclusion: 'Como hay 3 bolas verdes de 10 totales: P(A) = 3/10 (30.0%). ¡Sacar verde es más probable que sacar amarilla!'
      }
    ],
    sampleSpace: [
      { id: 'u-c1', label: 'Bola Celeste 1', value: 'C1', sublabel: 'Celeste', color: '#0284c7' },
      { id: 'u-c2', label: 'Bola Celeste 2', value: 'C2', sublabel: 'Celeste', color: '#0284c7' },
      { id: 'u-c3', label: 'Bola Celeste 3', value: 'C3', sublabel: 'Celeste', color: '#0284c7' },
      { id: 'u-c4', label: 'Bola Celeste 4', value: 'C4', sublabel: 'Celeste', color: '#0284c7' },
      { id: 'u-c5', label: 'Bola Celeste 5', value: 'C5', sublabel: 'Celeste', color: '#0284c7' },
      { id: 'u-v1', label: 'Bola Verde 1', value: 'V1', sublabel: 'Verde', color: '#059669' },
      { id: 'u-v2', label: 'Bola Verde 2', value: 'V2', sublabel: 'Verde', color: '#059669' },
      { id: 'u-v3', label: 'Bola Verde 3', value: 'V3', sublabel: 'Verde', color: '#059669' },
      { id: 'u-a1', label: 'Bola Amarilla 1', value: 'A1', sublabel: 'Amarilla', color: '#ca8a04' },
      { id: 'u-a2', label: 'Bola Amarilla 2', value: 'A2', sublabel: 'Amarilla', color: '#ca8a04' }
    ],
    events: [
      {
        id: 'amarilla',
        name: 'Extraer bola Amarilla',
        description: 'La mano saca cualquiera de las 2 bolas amarillas',
        targetValue: 'Amarilla',
        condition: (it) => it.sublabel === 'Amarilla'
      },
      {
        id: 'celeste',
        name: 'Extraer bola Celeste',
        description: 'La mano saca cualquiera de las 5 bolas celestes',
        condition: (it) => it.sublabel === 'Celeste'
      },
      {
        id: 'verde',
        name: 'Extraer bola Verde',
        description: 'La mano saca cualquiera de las 3 bolas verdes',
        condition: (it) => it.sublabel === 'Verde'
      }
    ]
  }
]

// ─── Función para Simplificar Fracciones ─────────────────────────────────────
function simplifyFraction(numerator: number, denominator: number): { num: number; den: number } {
  if (denominator === 0) return { num: 0, den: 1 }
  if (numerator === 0) return { num: 0, den: 1 }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator))
  return {
    num: numerator / divisor,
    den: denominator / divisor
  }
}

// ─── Componente SVG de Cara de Dado con Puntos Reales (100% visible) ──────────
function DieFace({
  value,
  size = 'md',
  className = ''
}: {
  value: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const pixelSize = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 74,
    xl: 100
  }[size]

  const pipsMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[26, 26], [74, 74]],
    3: [[26, 26], [50, 50], [74, 74]],
    4: [[26, 26], [74, 26], [26, 74], [74, 74]],
    5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
    6: [[26, 24], [74, 24], [26, 50], [74, 50], [26, 76], [74, 76]]
  }

  const pips = pipsMap[value] || pipsMap[1]
  const radius = size === 'sm' ? 8.5 : 9

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      className={`select-none shrink-0 drop-shadow-md transition-transform ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <radialGradient id={`dieBg-${size}-${value}`} cx="25%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        <radialGradient id="diePipGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="60%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
      </defs>

      {/* Cuerpo del dado */}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="18"
        ry="18"
        fill={`url(#dieBg-${size}-${value})`}
        stroke="#475569"
        strokeWidth="3.5"
      />

      {/* Brillo interno */}
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="15"
        ry="15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* Puntos (Pips) */}
      {pips.map(([cx, cy], idx) => (
        <circle
          key={`die-pip-${idx}`}
          cx={cx}
          cy={cy}
          r={radius}
          fill="url(#diePipGrad)"
          stroke="#0f172a"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  )
}

// ─── Componente SVG de Moneda Real con Relieve y Giro en 3D ───────────────────
function CoinFace({
  side,
  size = 'md',
  className = ''
}: {
  side: 'C' | 'S'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const isCara = side === 'C'
  const pixelSize = {
    xs: 22,
    sm: 32,
    md: 48,
    lg: 72,
    xl: 90
  }[size]

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      className={`select-none shrink-0 drop-shadow-md ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        {/* Degradados dorados para CARA */}
        <radialGradient id={`goldOuter-${size}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id={`goldInner-${size}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>

        {/* Degradados plateados para SELLO */}
        <radialGradient id={`silverOuter-${size}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
        <radialGradient id={`silverInner-${size}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>

      {/* Borde exterior acanalado */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill={isCara ? `url(#goldOuter-${size})` : `url(#silverOuter-${size})`}
        stroke={isCara ? '#78350f' : '#334155'}
        strokeWidth="2.5"
      />

      {/* Anillo interior */}
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke={isCara ? '#fef3c7' : '#f8fafc'}
        strokeWidth="1.5"
        strokeDasharray="2.5, 3"
      />

      {/* Superficie central */}
      <circle
        cx="50"
        cy="50"
        r="36"
        fill={isCara ? `url(#goldInner-${size})` : `url(#silverInner-${size})`}
      />

      {isCara ? (
        <g>
          <circle cx="50" cy="42" r="13" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <circle cx="50" cy="42" r="9" fill="#f59e0b" />
          <circle cx="47" cy="40" r="1.3" fill="#78350f" />
          <circle cx="53" cy="40" r="1.3" fill="#78350f" />
          <path d="M 46 45 Q 50 49 54 45" fill="none" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
          <text
            x="50"
            y="72"
            textAnchor="middle"
            fill="#78350f"
            fontWeight="900"
            fontSize="12"
            fontFamily="sans-serif"
            letterSpacing="0.8"
          >
            CARA
          </text>
        </g>
      ) : (
        <g>
          <path
            d="M 38 30 L 62 30 L 62 45 C 62 55 50 61 50 61 C 50 61 38 55 38 45 Z"
            fill="#f8fafc"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fill="#0f172a"
            fontWeight="900"
            fontSize="15"
            fontFamily="monospace"
          >
            1
          </text>
          <text
            x="50"
            y="74"
            textAnchor="middle"
            fill="#0f172a"
            fontWeight="900"
            fontSize="11"
            fontFamily="sans-serif"
            letterSpacing="0.6"
          >
            SELLO
          </text>
        </g>
      )}
    </svg>
  )
}

// ─── Componente SVG del Brazo y Mano que Entra a la Urna ──────────────────────
function HandArmSVG({
  state,
  extractedBall
}: {
  state: 'idle' | 'reaching' | 'holding'
  extractedBall: SampleItem | null
}) {
  return (
    <div className="flex flex-col items-center">
      <svg width="48" height="54" viewBox="0 0 48 54" className="drop-shadow-md">
        <rect x="15" y="0" width="18" height="14" rx="2" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.2" />
        <rect x="17" y="12" width="14" height="16" fill="#fcd34d" stroke="#b45309" strokeWidth="1.2" />

        {state === 'holding' ? (
          <g>
            <circle cx="24" cy="36" r="10" fill="#fcd34d" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="20" cy="36" r="3.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="24" cy="38" r="3.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="28" cy="36" r="3.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <ellipse cx="16" cy="32" rx="2.5" ry="4" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" transform="rotate(-15 16 32)" />
          </g>
        ) : (
          <g>
            <circle cx="24" cy="32" r="8" fill="#fcd34d" stroke="#b45309" strokeWidth="1.2" />
            <rect x="16" y="34" width="3" height="11" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <rect x="20" y="36" width="3" height="13" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <rect x="24" y="36" width="3" height="12" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <rect x="28" y="34" width="3" height="10" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <ellipse cx="14" cy="30" rx="2" ry="5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" transform="rotate(-30 14 30)" />
          </g>
        )}
      </svg>

      {state === 'holding' && extractedBall && (
        <div
          className="w-7 h-7 rounded-full border border-white shadow-lg animate-bounce -mt-2 flex items-center justify-center font-black text-[10px] text-white"
          style={{ backgroundColor: extractedBall.color }}
        >
          {extractedBall.value}
        </div>
      )}
    </div>
  )
}

// ─── Componente Principal de la Vista ─────────────────────────────────────────
export default function ProbabilidadLaplaceView() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  // ── Modales y Pestaña Activa
  const [activeTab, setActiveTab] = useState<ProbabilidadTab>('descubrir')
  const [selectedExpId, setSelectedExpId] = useState<ExperimentId>('dado')

  // ── Nivel de Descubrimiento Guiado (Pestaña 1)
  // 0 = Objeto solo
  // 1 = Espacio muestral revelado (solo las caras limpias)
  // 2 = Reto formulado y cara resaltada
  // 3 = Fórmula revelada (Casos Favorables / Casos Totales = 1/6)
  // 4 = Conclusión de equiprobabilidad (todas las caras valen lo mismo)
  const [discoveryStage, setDiscoveryStage] = useState<number>(0)
  // Índice del Reto activo en Pestaña 1 (0 = Ejercicio 1, 1 = Ejercicio 2 / Otro ejercicio)
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0)
  // Estados para revelación secuencial uno a uno del Espacio Muestral
  const [revealedSampleCount, setRevealedSampleCount] = useState<number>(0)
  const [isRevealingSampleSpace, setIsRevealingSampleSpace] = useState<boolean>(false)
  const revealTimeoutRef = useRef<number | null>(null)
  const revealIntervalRef = useRef<number | null>(null)

  // Suceso elegido en pestaña 2 (Regla de Laplace)
  const [selectedEventId, setSelectedEventId] = useState<string>('cuatro')

  const [showHelp, setShowHelp] = useState<boolean>(false)

  // ── Estados de Animación Física
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [latestResult, setLatestResult] = useState<SampleItem | null>(null)

  // Dado
  const [rollingDiceValue, setRollingDiceValue] = useState<number>(1)
  const [isDiceRolling, setIsDiceRolling] = useState<boolean>(false)

  // Monedas
  const [coinFlipping, setCoinFlipping] = useState<boolean>(false)
  const [coinTossSides, setCoinTossSides] = useState<['C' | 'S', 'C' | 'S']>(['C', 'C'])

  // Ruleta
  const [rouletteAngle, setRouletteAngle] = useState<number>(0)

  // Urna con Mano
  const [handState, setHandState] = useState<'idle' | 'reaching' | 'holding'>('idle')
  const [extractedBall, setExtractedBall] = useState<SampleItem | null>(null)

  const experiment = useMemo(() => {
    return EXPERIMENTS.find((e) => e.id === selectedExpId) || EXPERIMENTS[0]
  }, [selectedExpId])

  // Detener cualquier animación de revelación en curso
  const stopRevealingAnimation = useCallback(() => {
    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = null
    }
    if (revealIntervalRef.current !== null) {
      window.clearInterval(revealIntervalRef.current)
      revealIntervalRef.current = null
    }
    setIsRevealingSampleSpace(false)
    setIsDiceRolling(false)
    setCoinFlipping(false)
  }, [])

  // Iniciar revelación secuencial paso a paso con el giro del dado (1 al 6)
  const startSampleSpaceDiscovery = useCallback(() => {
    stopRevealingAnimation()
    setDiscoveryStage(1)
    setRevealedSampleCount(0)
    setIsRevealingSampleSpace(true)

    const items = experiment.sampleSpace
    let currentIdx = 0

    const stepNext = () => {
      if (currentIdx >= items.length) {
        setIsRevealingSampleSpace(false)
        setIsDiceRolling(false)
        setCoinFlipping(false)
        return
      }

      const item = items[currentIdx]

      // 1. DADO: Gira en 3D y se asienta en la cara 1, 2, 3, 4, 5, 6 una por una
      if (experiment.id === 'dado') {
        setIsDiceRolling(true)
        const targetValue = Number(item.value) // 1, 2, 3, 4, 5, 6
        let tick = 0

        revealIntervalRef.current = window.setInterval(() => {
          setRollingDiceValue(Math.floor(Math.random() * 6) + 1)
          tick++
          if (tick >= 5) {
            if (revealIntervalRef.current !== null) {
              window.clearInterval(revealIntervalRef.current)
              revealIntervalRef.current = null
            }
            // El dado se detiene exactamente en esta cara
            setRollingDiceValue(targetValue)
            setIsDiceRolling(false)
            setLatestResult(item)
            currentIdx++
            setRevealedSampleCount(currentIdx)

            // Pausa breve para que el estudiante observe la cara antes de la siguiente
            revealTimeoutRef.current = window.setTimeout(stepNext, 550)
          }
        }, 70)
      } else if (experiment.id === 'monedas') {
        setCoinFlipping(true)
        const strVal = String(item.value)
        let tick = 0

        revealIntervalRef.current = window.setInterval(() => {
          const r1: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
          const r2: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
          setCoinTossSides([r1, r2])
          tick++
          if (tick >= 5) {
            if (revealIntervalRef.current !== null) {
              window.clearInterval(revealIntervalRef.current)
              revealIntervalRef.current = null
            }
            setCoinTossSides([strVal[0] as 'C' | 'S', strVal[1] as 'C' | 'S'])
            setCoinFlipping(false)
            setLatestResult(item)
            currentIdx++
            setRevealedSampleCount(currentIdx)
            revealTimeoutRef.current = window.setTimeout(stepNext, 550)
          }
        }, 70)
      } else if (experiment.id === 'ruleta') {
        const sliceAngle = 360 / 8
        const targetAngle = 360 - currentIdx * sliceAngle - sliceAngle / 2
        setRouletteAngle((prev) => prev + 360 + (targetAngle - (prev % 360)))
        revealTimeoutRef.current = window.setTimeout(() => {
          setLatestResult(item)
          currentIdx++
          setRevealedSampleCount(currentIdx)
          revealTimeoutRef.current = window.setTimeout(stepNext, 450)
        }, 550)
      } else if (experiment.id === 'urna') {
        setHandState('reaching')
        revealTimeoutRef.current = window.setTimeout(() => {
          setExtractedBall(item)
          setHandState('holding')
          setLatestResult(item)
          currentIdx++
          setRevealedSampleCount(currentIdx)
          revealTimeoutRef.current = window.setTimeout(() => {
            setHandState('idle')
            revealTimeoutRef.current = window.setTimeout(stepNext, 250)
          }, 350)
        }, 400)
      }
    }

    stepNext()
  }, [experiment, stopRevealingAnimation])

  // Reset al cambiar de experimento
  useEffect(() => {
    stopRevealingAnimation()
    setDiscoveryStage(0)
    setCurrentChallengeIndex(0)
    setRevealedSampleCount(0)
    setLatestResult(null)
    setHandState('idle')
    setExtractedBall(null)
    if (experiment.events.length > 0) {
      setSelectedEventId(experiment.events[0].id)
    }
  }, [experiment, stopRevealingAnimation])

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopRevealingAnimation()
    }
  }, [stopRevealingAnimation])

  const activeChallenge = useMemo(() => {
    const list = experiment.challenges || []
    return list[currentChallengeIndex] || list[0]
  }, [experiment, currentChallengeIndex])

  const challengeStats = useMemo(() => {
    if (!activeChallenge) {
      return {
        totalFavorables: 1,
        totalPosibles: experiment.sampleSpace.length,
        simplified: { num: 1, den: experiment.sampleSpace.length },
        percentage: ((1 / experiment.sampleSpace.length) * 100).toFixed(1)
      }
    }
    const totalFavorables = experiment.sampleSpace.filter((it) => activeChallenge.isFavorable(it)).length
    const totalPosibles = experiment.sampleSpace.length
    const simplified = simplifyFraction(totalFavorables, totalPosibles)
    const percentage = totalPosibles > 0 ? ((totalFavorables / totalPosibles) * 100).toFixed(1) : '0.0'
    return {
      totalFavorables,
      totalPosibles,
      simplified,
      percentage
    }
  }, [experiment, activeChallenge])

  const activeEvent = useMemo(() => {
    return (
      experiment.events.find((ev) => ev.id === selectedEventId) ||
      experiment.events[0]
    )
  }, [experiment, selectedEventId])

  // Cálculo de Laplace
  const laplaceCalculation = useMemo(() => {
    const totalPosibles = experiment.sampleSpace.length
    const favorables = experiment.sampleSpace.filter((it) => activeEvent.condition(it))
    const totalFavorables = favorables.length
    const probDecimal = totalPosibles > 0 ? totalFavorables / totalPosibles : 0
    const probPercentage = Number((probDecimal * 100).toFixed(1))
    const simplified = simplifyFraction(totalFavorables, totalPosibles)

    return {
      totalPosibles,
      favorables,
      totalFavorables,
      probDecimal: Number(probDecimal.toFixed(3)),
      probPercentage,
      simplified
    }
  }, [experiment, activeEvent])

  // Disparador de Experimento Físico con Animación Real
  const triggerSingleExperiment = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)

    // 1. DADO RODANDO FÍSICAMENTE
    if (experiment.id === 'dado') {
      setIsDiceRolling(true)
      let rollsCount = 0
      const interval = setInterval(() => {
        setRollingDiceValue(Math.floor(Math.random() * 6) + 1)
        rollsCount++
        if (rollsCount > 12) {
          clearInterval(interval)
          const chosenIndex = Math.floor(Math.random() * experiment.sampleSpace.length)
          const picked = experiment.sampleSpace[chosenIndex]
          setRollingDiceValue(Number(picked.value))
          setLatestResult(picked)
          setIsDiceRolling(false)
          setIsAnimating(false)
        }
      }, 65)
      return
    }

    // 2. MONEDAS GIRANDO EN EL AIRE EN 3D
    if (experiment.id === 'monedas') {
      setCoinFlipping(true)
      let spinCount = 0
      const spinInterval = setInterval(() => {
        const r1: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
        const r2: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
        setCoinTossSides([r1, r2])
        spinCount++
        if (spinCount > 11) {
          clearInterval(spinInterval)
          const side1: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
          const side2: 'C' | 'S' = Math.random() < 0.5 ? 'C' : 'S'
          const key = `${side1}${side2}`
          const picked = experiment.sampleSpace.find((it) => it.value === key) || experiment.sampleSpace[0]
          setCoinTossSides([side1, side2])
          setLatestResult(picked)
          setCoinFlipping(false)
          setIsAnimating(false)
        }
      }, 70)
      return
    }

    // 3. RULETA
    if (experiment.id === 'ruleta') {
      const chosenIndex = Math.floor(Math.random() * 8)
      const picked = experiment.sampleSpace[chosenIndex]
      const extraSpins = 4 * 360
      const sliceAngle = 360 / 8
      const targetAngle = 360 - chosenIndex * sliceAngle - sliceAngle / 2
      const newTotalAngle = rouletteAngle + extraSpins + (targetAngle - (rouletteAngle % 360))
      setRouletteAngle(newTotalAngle)

      const timer = setTimeout(() => {
        setLatestResult(picked)
        setIsAnimating(false)
      }, 1000)
      return () => clearTimeout(timer)
    }

    // 4. URNA: MANO QUE DESCIENDE Y EXTRAE ESFERA
    if (experiment.id === 'urna') {
      setHandState('reaching')
      const chosenIndex = Math.floor(Math.random() * experiment.sampleSpace.length)
      const picked = experiment.sampleSpace[chosenIndex]

      setTimeout(() => {
        setExtractedBall(picked)
        setHandState('holding')
        setLatestResult(picked)
        setIsAnimating(false)
      }, 850)
    }
  }, [experiment, isAnimating, rouletteAngle])

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden select-none font-sans ${
        isDark ? 'bg-[#080c18] text-white' : 'bg-slate-100 text-slate-800'
      }`}
    >
      {/* ── ESTILOS DE ANIMACIÓN FÍSICA PERSONALIZADA ── */}
      <style>{`
        @keyframes dieTumbleRoll {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
          }
          20% {
            transform: translateY(-40px) translateX(-20px) rotate(-140deg) scale(1.15);
          }
          45% {
            transform: translateY(-60px) translateX(25px) rotate(220deg) scale(1.22);
          }
          70% {
            transform: translateY(-25px) translateX(-10px) rotate(520deg) scale(1.08);
          }
          85% {
            transform: translateY(-8px) translateX(5px) rotate(680deg) scale(0.96);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(720deg) scale(1);
          }
        }

        @keyframes coinSpin3DLeft {
          0% {
            transform: translateY(0) rotateX(0deg) rotateZ(0deg) scale(1);
          }
          25% {
            transform: translateY(-55px) rotateX(720deg) rotateZ(-15deg) scale(1.18);
          }
          50% {
            transform: translateY(-80px) rotateX(1440deg) rotateZ(-8deg) scale(1.25);
          }
          75% {
            transform: translateY(-35px) rotateX(2160deg) rotateZ(5deg) scale(1.1);
          }
          90% {
            transform: translateY(-6px) rotateX(2700deg) rotateZ(0deg) scale(0.95);
          }
          100% {
            transform: translateY(0) rotateX(2880deg) rotateZ(0deg) scale(1);
          }
        }

        @keyframes coinSpin3DRight {
          0% {
            transform: translateY(0) rotateX(0deg) rotateZ(0deg) scale(1);
          }
          25% {
            transform: translateY(-60px) rotateX(720deg) rotateZ(15deg) scale(1.18);
          }
          50% {
            transform: translateY(-85px) rotateX(1440deg) rotateZ(8deg) scale(1.25);
          }
          75% {
            transform: translateY(-40px) rotateX(2160deg) rotateZ(-5deg) scale(1.1);
          }
          90% {
            transform: translateY(-6px) rotateX(2700deg) rotateZ(0deg) scale(0.95);
          }
          100% {
            transform: translateY(0) rotateX(2880deg) rotateZ(0deg) scale(1);
          }
        }
      `}</style>

      {/* ── 1. CABECERA (Header) ── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${
          isDark ? 'bg-[#0a0f1d] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`flex h-7 px-2 items-center gap-1 rounded-md border text-xs font-bold cursor-pointer transition-all active:scale-95 ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Volver al menú de inicio"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-base lg:text-lg">🎲</span>
            <h1 className="text-xs sm:text-[13px] lg:text-[15px] font-black truncate max-w-[210px] sm:max-w-md">
              Probabilidad Clásica y Regla de Laplace
            </h1>
          </div>
        </div>

        {/* Selector de Experimento y Modales */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1">
            <span className="hidden md:inline text-[11px] font-bold opacity-75">
              Experimento:
            </span>
            <select
              value={selectedExpId}
              onChange={(e) => setSelectedExpId(e.target.value as ExperimentId)}
              className={`h-7 px-2 rounded-md border text-xs font-bold cursor-pointer transition-all ${
                isDark
                  ? 'bg-slate-800 border-white/10 text-white'
                  : 'bg-white border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              {EXPERIMENTS.map((exp) => (
                <option key={`exp-${exp.id}`} value={exp.id}>
                  {exp.icon} {exp.shortTitle}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border cursor-pointer transition-all active:scale-95 ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Ayuda de la vista"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. PESTAÑAS PRINCIPALES DEL FLUJO DE APRENDIZAJE ── */}
      <div
        className={`shrink-0 flex items-center justify-between border-b px-2 lg:px-4 py-1 gap-1 sm:gap-2 ${
          isDark ? 'bg-[#0d1424] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('descubrir')}
            className={`h-7 px-2.5 rounded-md border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
              activeTab === 'descubrir'
                ? isDark
                  ? 'bg-blue-500/20 text-blue-300 border-blue-400'
                  : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : isDark
                ? 'bg-slate-800/60 text-slate-300 border-white/10 hover:bg-slate-700'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>1. Descubrir la Probabilidad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('laplace')}
            className={`h-7 px-2.5 rounded-md border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
              activeTab === 'laplace'
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                  : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : isDark
                ? 'bg-slate-800/60 text-slate-300 border-white/10 hover:bg-slate-700'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>2. Regla de Laplace</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono font-bold">
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            Paso {discoveryStage + 1} de 5
          </span>
        </div>
      </div>

      {/* ── 3. ÁREA DE TRABAJO DINÁMICA (CERO SCROLL) ── */}
      <div className="flex-1 min-h-0 p-1.5 sm:p-2 lg:p-3 overflow-hidden flex flex-col">
        <div
          className={`flex-1 min-h-0 flex flex-col justify-between rounded-xl border p-2 lg:p-3 overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700/60' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {/* ════════════════════════════════════════════════════════════════════
              PESTAÑA 1: DESCUBRIR LA PROBABILIDAD (PASO A PASO DESDE CERO)
          ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'descubrir' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
              {/* Barra superior de guía didáctica paso a paso */}
              <div
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🧭</span>
                  <p className="text-[11.5px] leading-tight font-medium">
                    {discoveryStage === 0 && 'Comienza observando el objeto. ¿Qué saldrá al lanzarlo?'}
                    {discoveryStage === 1 && (currentChallengeIndex === 0 ? '¡Descubriste el Espacio Muestral! Mira todas las opciones posibles.' : activeChallenge.question)}
                    {discoveryStage === 2 && activeChallenge.question}
                    {discoveryStage === 3 && '¡Nace la Regla de Laplace! Compara los casos favorables con el total.'}
                    {discoveryStage >= 4 && activeChallenge.conclusion}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      stopRevealingAnimation()
                      setDiscoveryStage(0)
                      setCurrentChallengeIndex(0)
                      setRevealedSampleCount(0)
                    }}
                    className={`h-6 px-2 rounded border text-[10.5px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                    }`}
                    title="Reiniciar exploración desde el inicio"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reiniciar</span>
                  </button>
                </div>
              </div>

              {/* ESCENARIO DE EXPLORACIÓN Y DESCUBRIMIENTO EN DOS LADOS (SIEMPRE LADO A LADO) */}
              <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 overflow-hidden">
                {/* 1. LADO IZQUIERDO: EL OBJETO INTERACTIVO (Dado, Monedas, Ruleta o Urna) */}
                <div
                  className={`col-span-5 flex flex-col items-center justify-between p-2 rounded-xl border ${
                    isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className={`text-[11px] lg:text-xs font-bold uppercase tracking-wider text-center truncate w-full ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {experiment.shortTitle || experiment.title}
                  </span>

                  {/* Escenario de Simulación Física */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 w-full relative">
                    {/* DADO */}
                    {experiment.id === 'dado' && (
                      <div
                        onClick={triggerSingleExperiment}
                        className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                        title="¡Toca el dado para lanzarlo y ver cómo gira!"
                      >
                        <div
                          className="group-hover:scale-105 transition-transform"
                          style={{
                            animation: isDiceRolling ? 'dieTumbleRoll 0.85s cubic-bezier(0.25, 1, 0.5, 1) infinite' : 'none'
                          }}
                        >
                          <DieFace value={rollingDiceValue} size="lg" />
                        </div>

                        <span className={`text-[10px] sm:text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border shadow-xs text-center ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}>
                          {isRevealingSampleSpace
                            ? `🎲 Cara ${revealedSampleCount || 1} de 6`
                            : isDiceRolling
                            ? '¡Rodando...!'
                            : latestResult
                            ? `¡Salió ${latestResult.value}!`
                            : '👉 Toca para lanzar'}
                        </span>
                      </div>
                    )}

                    {/* MONEDAS */}
                    {experiment.id === 'monedas' && (
                      <div
                        onClick={triggerSingleExperiment}
                        className="flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                        title="¡Toca las monedas para lanzarlas al aire!"
                      >
                        <div className="flex items-center gap-3 group-hover:scale-105 transition-transform" style={{ perspective: '800px' }}>
                          <div
                            style={{
                              animation: coinFlipping ? 'coinSpin3DLeft 0.85s cubic-bezier(0.25, 1, 0.5, 1) infinite' : 'none'
                            }}
                          >
                            <CoinFace side={coinTossSides[0]} size="md" />
                          </div>
                          <div
                            style={{
                              animation: coinFlipping ? 'coinSpin3DRight 0.85s cubic-bezier(0.25, 1, 0.5, 1) infinite' : 'none'
                            }}
                          >
                            <CoinFace side={coinTossSides[1]} size="md" />
                          </div>
                        </div>

                        <span className={`text-[10px] sm:text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border shadow-xs text-center ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}>
                          {coinFlipping
                            ? '¡Girando...!'
                            : latestResult
                            ? `¡Salió: ${latestResult.label}!`
                            : '👉 Toca para lanzar'}
                        </span>
                      </div>
                    )}

                    {/* RULETA */}
                    {experiment.id === 'ruleta' && (
                      <div
                        onClick={triggerSingleExperiment}
                        className="relative flex flex-col items-center justify-center cursor-pointer group"
                        title="¡Toca la ruleta para girarla!"
                      >
                        <div className="absolute -top-1 z-10 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[10px] border-t-red-600 drop-shadow-sm" />
                        <svg
                          viewBox="0 0 160 160"
                          className="w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-1000 ease-out group-hover:scale-105"
                          style={{ transform: `rotate(${rouletteAngle}deg)` }}
                        >
                          <circle cx="80" cy="80" r="76" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
                          {experiment.sampleSpace.map((it, idx) => {
                            const angle = (idx * 360) / 8
                            const rad = (angle * Math.PI) / 180
                            const nextRad = ((angle + 45) * Math.PI) / 180
                            const x1 = 80 + 74 * Math.cos(rad)
                            const y1 = 80 + 74 * Math.sin(rad)
                            const x2 = 80 + 74 * Math.cos(nextRad)
                            const y2 = 80 + 74 * Math.sin(nextRad)
                            return (
                              <g key={`roul-slice-${it.id}`}>
                                <path
                                  d={`M 80 80 L ${x1} ${y1} A 74 74 0 0 1 ${x2} ${y2} Z`}
                                  fill={it.color}
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                />
                                <text
                                  x={80 + 48 * Math.cos(((angle + 22.5) * Math.PI) / 180)}
                                  y={80 + 48 * Math.sin(((angle + 22.5) * Math.PI) / 180)}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="font-mono text-[10px] font-black fill-white select-none"
                                >
                                  {it.value}
                                </text>
                              </g>
                            )
                          })}
                          <circle cx="80" cy="80" r="8" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                        <span className={`text-[10px] font-bold font-mono mt-1 text-center px-2 py-0.5 rounded-full border shadow-xs ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {isAnimating ? '¡Girando...!' : latestResult ? `¡Sector ${latestResult.label}!` : '👉 Toca para girar'}
                        </span>
                      </div>
                    )}

                    {/* URNA */}
                    {experiment.id === 'urna' && (
                      <div
                        onClick={triggerSingleExperiment}
                        className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                        title="¡Toca la urna para meter la mano y sacar una bola!"
                      >
                        <div className="relative w-36 h-28 flex flex-col items-center justify-end select-none">
                          <div
                            className={`absolute z-20 transition-all duration-700 flex flex-col items-center ${
                              handState === 'idle'
                                ? '-top-1 group-hover:translate-y-1'
                                : handState === 'reaching'
                                ? 'top-6 scale-90'
                                : '-top-3'
                            }`}
                          >
                            <HandArmSVG state={handState} extractedBall={extractedBall} />
                          </div>

                          <div
                            className={`w-32 h-20 rounded-b-2xl rounded-t-lg border border-dashed flex flex-wrap items-center justify-center gap-1 p-2 relative transition-all shadow-inner ${
                              isDark
                                ? 'bg-sky-950/30 border-sky-400/50 group-hover:border-sky-300'
                                : 'bg-sky-50/80 border-sky-400 group-hover:border-sky-500 shadow-xs'
                            }`}
                          >
                            <div className="absolute -top-2 w-20 h-2 rounded-full border border-sky-400 bg-sky-200/40" />
                            {experiment.sampleSpace.map((b) => (
                              <div
                                key={`ball-inside-${b.id}`}
                                className={`w-3.5 h-3.5 rounded-full border border-white shadow-xs transition-transform duration-300 ${
                                  handState === 'reaching' ? 'animate-bounce' : ''
                                }`}
                                style={{ backgroundColor: b.color }}
                              />
                            ))}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border shadow-xs ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {handState === 'reaching'
                            ? '🖐️ Buscando...'
                            : handState === 'holding' && extractedBall
                            ? `🎯 ¡Sacaste ${extractedBall.sublabel}!`
                            : '👉 Toca para meter mano'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botón de acción */}
                  <button
                    type="button"
                    disabled={isAnimating || isRevealingSampleSpace}
                    onClick={triggerSingleExperiment}
                    className={`px-3 py-1 sm:py-1.5 rounded-md border font-bold text-[11px] sm:text-xs cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1 ${
                      isAnimating || isRevealingSampleSpace
                        ? 'opacity-60 cursor-not-allowed bg-slate-600 text-white border-transparent'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    }`}
                  >
                    <span>
                      {isRevealingSampleSpace
                        ? 'Animando caras...'
                        : experiment.id === 'dado'
                        ? 'Lanzar Dado'
                        : experiment.id === 'monedas'
                        ? 'Lanzar Monedas'
                        : experiment.id === 'ruleta'
                        ? 'Girar Ruleta'
                        : 'Meter Mano'}
                    </span>
                  </button>
                </div>

                {/* 2. LADO DERECHO: DESCUBRIMIENTO SECUENCIAL PASO A PASO */}
                <div
                  className={`col-span-7 flex flex-col justify-between p-2 sm:p-2.5 rounded-xl border overflow-hidden ${
                    isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-inherit shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 ${
                        isDark ? 'text-slate-100' : 'text-slate-800'
                      }`}>
                        <span>💡</span> Descubrimiento:
                      </span>
                      {discoveryStage >= 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentChallengeIndex(0)
                              setDiscoveryStage(1)
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                              currentChallengeIndex === 0
                                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                : isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
                            }`}
                            title="Ver el primer reto"
                          >
                            Ejercicio 1
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentChallengeIndex(1)
                              setDiscoveryStage(1)
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                              currentChallengeIndex === 1
                                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                : isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
                            }`}
                            title="Ver el segundo reto"
                          >
                            Ejercicio 2
                          </button>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-blue-300' : 'bg-white border-slate-300 text-blue-700'
                    }`}>
                      {discoveryStage === 0 && 'Paso 1: ¿Qué sale?'}
                      {discoveryStage === 1 && (isRevealingSampleSpace ? `Paso 2: Cara ${revealedSampleCount}/${experiment.sampleSpace.length}` : 'Paso 2: Espacio Ω')}
                      {discoveryStage === 2 && 'Paso 3: Favorable'}
                      {discoveryStage === 3 && 'Paso 4: Fórmula'}
                      {discoveryStage >= 4 && 'Paso 5: Conclusión'}
                    </span>
                  </div>

                  {/* Contenedor central del paso activo en el lado derecho */}
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 overflow-y-auto">
                    {/* PASO 0: BOTÓN PARA VER EL ESPACIO MUESTRAL */}
                    {discoveryStage === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 text-center max-w-sm animate-in fade-in zoom-in duration-300">
                        <span className="text-2xl sm:text-3xl">📦</span>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-xs sm:text-sm">
                            ¿Qué resultados pueden salir?
                          </h3>
                          <p className="text-[11px] opacity-75 leading-tight">
                            Antes de calcular probabilidades, descubramos la lista de todas las opciones posibles de este objeto.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startSampleSpaceDiscovery}
                          className="px-3.5 py-1.5 sm:py-2 rounded-lg border font-black text-xs cursor-pointer transition-all active:scale-95 bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm flex items-center gap-1.5 mt-0.5"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Ver Espacio Muestral</span>
                        </button>
                      </div>
                    )}

                    {/* PASO 1 O SUPERIOR: APARECEN LAS CARAS LIMPIAS AL LADO DERECHO */}
                    {discoveryStage >= 1 && (
                      <div className="w-full flex flex-col items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Contenedor de las caras limpias del dado/monedas/ruleta/urna */}
                        <div className="flex flex-col items-center gap-1 w-full">
                          <div className="flex items-center justify-between w-full px-1">
                            <span className="text-[10.5px] sm:text-xs font-bold opacity-80">
                              {isRevealingSampleSpace
                                ? `Descubriendo cara ${revealedSampleCount} de ${experiment.sampleSpace.length}...`
                                : `${experiment.sampleSpace.length} resultados posibles en total (Espacio Muestral Ω):`}
                            </span>

                            {isRevealingSampleSpace ? (
                              <button
                                type="button"
                                onClick={() => {
                                  stopRevealingAnimation()
                                  setRevealedSampleCount(experiment.sampleSpace.length)
                                }}
                                className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                                title="Mostrar todas las caras inmediatamente"
                              >
                                Omitir ⏩
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={startSampleSpaceDiscovery}
                                className={`h-5 px-1.5 rounded border text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-0.5 ${
                                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-600'
                                }`}
                                title="Repetir animación del dado generando cada cara"
                              >
                                <RotateCcw className="h-2.5 w-2.5" />
                                <span>Repetir</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap py-0.5 min-h-[48px]">
                            {experiment.sampleSpace.map((item, idx) => {
                              const isRevealed = idx < revealedSampleCount || (!isRevealingSampleSpace && discoveryStage >= 1)
                              const isTarget = discoveryStage >= 2 && activeChallenge.isFavorable(item)

                              if (!isRevealed) {
                                return (
                                  <div
                                    key={`disc-placeholder-${item.id}`}
                                    className={`p-1 rounded-lg border border-dashed flex flex-col items-center justify-center transition-all duration-300 opacity-30 ${
                                      isDark ? 'bg-slate-800/30 border-slate-700 text-slate-500' : 'bg-slate-100/70 border-slate-300 text-slate-400'
                                    }`}
                                    style={{
                                      width: experiment.id === 'dado' ? 44 : 48,
                                      height: experiment.id === 'dado' ? 44 : 48
                                    }}
                                    title={`Cara ${idx + 1} por descubrir`}
                                  >
                                    <span className="text-[10px] font-mono font-bold">?</span>
                                  </div>
                                )
                              }

                              return (
                                <div
                                  key={`disc-face-${item.id}`}
                                  className={`p-1 rounded-lg border flex flex-col items-center justify-center transition-all duration-300 animate-in zoom-in-75 duration-300 ${
                                    isTarget
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 scale-105 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-200'
                                      : discoveryStage >= 2
                                      ? 'opacity-40 grayscale border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'
                                      : idx === revealedSampleCount - 1 && isRevealingSampleSpace
                                      ? 'border-blue-500 bg-blue-50 text-blue-900 scale-105 shadow-xs dark:bg-blue-950/70 dark:text-blue-200'
                                      : isDark
                                      ? 'bg-slate-800 border-slate-700 text-white'
                                      : 'bg-white border-slate-300 text-slate-800 shadow-xs'
                                  }`}
                                >
                                  {experiment.id === 'dado' ? (
                                    <DieFace value={Number(item.value)} size="sm" />
                                  ) : experiment.id === 'monedas' ? (
                                    <div className="flex gap-0.5 items-center justify-center">
                                      <CoinFace side={String(item.value)[0] as 'C' | 'S'} size="sm" />
                                      <CoinFace side={String(item.value)[1] as 'C' | 'S'} size="sm" />
                                    </div>
                                  ) : (
                                    <div
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-black text-[10px] text-white border border-white/80 shadow-xs"
                                      style={{ backgroundColor: item.color }}
                                    >
                                      {item.value}
                                    </div>
                                  )}

                                  {isTarget && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-0.5">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      <span>Favorable</span>
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* ACCIONES DIDÁCTICAS SEGÚN LA ETAPA */}
                        {discoveryStage === 1 && (
                          <div className="flex flex-col items-center gap-1.5 mt-0.5 text-center">
                            {isRevealingSampleSpace ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 py-1">
                                <span className="animate-spin">🔄</span>
                                <span>Observa cómo el dado revela cada cara una por una...</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-tight">
                                  {activeChallenge.question}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDiscoveryStage(2)}
                                  className="px-4 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xs flex items-center gap-1.5"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>Descubrir</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {discoveryStage === 2 && (
                          <div className="flex flex-col items-center gap-1.5 mt-0.5 text-center">
                            <span className="text-[11px] font-medium leading-tight">
                              {activeChallenge.explanation}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDiscoveryStage(3)}
                              className="px-3.5 py-1.5 rounded-lg border font-black text-[11px] cursor-pointer transition-all active:scale-95 bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-xs flex items-center gap-1"
                            >
                              <span>Ver Fórmula de la Probabilidad</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {discoveryStage >= 3 && (
                          <div className="flex flex-col items-center gap-2 mt-0.5 animate-in fade-in zoom-in duration-300">
                            {/* Fórmula Fraccionaria Dinámica */}
                            <div
                              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 sm:gap-3 font-mono ${
                                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-300 shadow-xs'
                              }`}
                            >
                              <div className="font-black text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                P(A) =
                              </div>

                              <div className="flex flex-col items-center text-center">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Favorables ({challengeStats.totalFavorables})
                                </span>
                                <div className={`w-24 sm:w-28 h-0.5 my-0.5 ${isDark ? 'bg-white/40' : 'bg-slate-700'}`} />
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  Totales ({challengeStats.totalPosibles})
                                </span>
                              </div>

                              <span className="font-bold text-xs opacity-40">=</span>

                              <div className="flex flex-col items-center px-1.5 py-0.5 rounded-md border border-inherit">
                                <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {challengeStats.totalFavorables}
                                </span>
                                <div className={`w-5 h-0.5 my-0.5 ${isDark ? 'bg-white/40' : 'bg-slate-700'}`} />
                                <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                                  {challengeStats.totalPosibles}
                                </span>
                              </div>

                              {challengeStats.simplified.den !== challengeStats.totalPosibles && (
                                <>
                                  <span className="font-bold text-xs opacity-40">=</span>
                                  <div className="flex flex-col items-center px-1.5 py-0.5 rounded-md border border-inherit">
                                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                                      {challengeStats.simplified.num}
                                    </span>
                                    <div className={`w-5 h-0.5 my-0.5 ${isDark ? 'bg-white/40' : 'bg-slate-700'}`} />
                                    <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                                      {challengeStats.simplified.den}
                                    </span>
                                  </div>
                                </>
                              )}

                              <span className="font-bold text-xs opacity-40">=</span>

                              <div className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-black text-xs">
                                {challengeStats.percentage}%
                              </div>
                            </div>

                            {/* Botón hacia la conclusión */}
                            {discoveryStage === 3 && (
                              <button
                                type="button"
                                onClick={() => setDiscoveryStage(4)}
                                className="px-3 py-1 rounded-lg border font-bold text-[11px] cursor-pointer transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-xs flex items-center gap-1"
                              >
                                <span>Ver Conclusión</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {discoveryStage >= 4 && (
                              <div
                                className={`px-3 py-2 rounded-lg border text-xs text-center max-w-sm leading-relaxed ${
                                  isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                                }`}
                              >
                                <strong>🎉 ¡Conclusión!</strong> {activeChallenge.conclusion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              PESTAÑA 2: REGLA DE LAPLACE (SUCESOS Y RETOS COMPUESTOS)
          ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'laplace' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5 overflow-hidden">
              {/* Barra superior de Selección del Suceso */}
              <div
                className={`shrink-0 px-2 sm:px-3 py-1 rounded-lg border flex items-center justify-between gap-1.5 overflow-x-auto ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[11px] sm:text-xs font-bold flex items-center gap-1 ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    🎯 Suceso:
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {experiment.events.map((ev) => (
                      <button
                        key={`ev-btn-${ev.id}`}
                        type="button"
                        onClick={() => setSelectedEventId(ev.id)}
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold cursor-pointer border transition-all active:scale-95 ${
                          selectedEventId === ev.id
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : isDark
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                        }`}
                      >
                        {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-[10px] sm:text-[11px] font-mono font-bold opacity-75">
                  {laplaceCalculation.totalFavorables} de {laplaceCalculation.totalPosibles}
                </span>
              </div>

              {/* Contenido Principal en 2 Columnas Responsivas */}
              <div className="flex-1 min-h-0 grid grid-cols-12 gap-1.5 sm:gap-2 overflow-hidden">
                {/* Panel Izquierdo: Fichas clasificadas */}
                <div
                  className={`col-span-5 flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border overflow-hidden ${
                    isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-inherit">
                    <span className={`text-[10.5px] sm:text-xs font-bold truncate max-w-[120px] sm:max-w-[180px] ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                      "{activeEvent.description}"
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {laplaceCalculation.totalFavorables} cumplen
                    </span>
                  </div>

                  {/* Fichas clasificadas */}
                  <div className="flex-1 min-h-0 flex items-center justify-center py-1 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 w-full">
                      {experiment.sampleSpace.map((item) => {
                        const isFav = activeEvent.condition(item)
                        return (
                          <div
                            key={`lap-chip-${item.id}`}
                            className={`p-1 sm:p-1.5 rounded-lg border flex flex-col items-center justify-between text-center transition-all ${
                              isFav
                                ? isDark
                                  ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
                                  : 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                                : isDark
                                ? 'bg-slate-800/40 border-slate-700/60 opacity-40 grayscale'
                                : 'bg-slate-100 border-slate-200 opacity-40 grayscale'
                            }`}
                          >
                            <div className="h-6 sm:h-7 flex items-center justify-center">
                              {experiment.id === 'dado' ? (
                                <DieFace value={Number(item.value)} size="xs" />
                              ) : experiment.id === 'monedas' ? (
                                <div className="flex gap-0.5">
                                  <CoinFace side={String(item.value)[0] as 'C' | 'S'} size="xs" />
                                  <CoinFace side={String(item.value)[1] as 'C' | 'S'} size="xs" />
                                </div>
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[8.5px] text-white shrink-0 border border-white/60"
                                  style={{ backgroundColor: item.color }}
                                >
                                  {item.value}
                                </div>
                              )}
                            </div>

                            <span className="text-[9.5px] sm:text-[10px] font-bold leading-tight truncate max-w-full">
                              {item.label}
                            </span>

                            <span className="text-[8.5px] font-bold flex items-center gap-0.5 mt-0.5">
                              {isFav ? (
                                <>
                                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">Cumple</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-2.5 w-2.5 text-slate-400" />
                                  <span className="text-slate-400">No</span>
                                </>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    className={`p-1 rounded-md border text-[10px] sm:text-[11px] font-mono flex items-center justify-around ${
                      isDark ? 'bg-slate-950/70 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div>
                      Fav: <strong className="text-emerald-500">{laplaceCalculation.totalFavorables}</strong>
                    </div>
                    <div className="opacity-40">|</div>
                    <div>
                      Total: <strong className="text-blue-500">{laplaceCalculation.totalPosibles}</strong>
                    </div>
                  </div>
                </div>

                {/* Panel Derecho: Cálculo Fraccionario, Decimal, Porcentaje y Termómetro */}
                <div
                  className={`col-span-7 flex flex-col justify-between p-1.5 sm:p-2.5 rounded-xl border overflow-hidden ${
                    isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-h-0 flex flex-col justify-around gap-1.5 sm:gap-2">
                    {/* Ecuación Fraccionaria */}
                    <div
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                        Fórmula de Laplace
                      </span>

                      <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2.5 font-mono">
                        <div className={`font-black text-xs sm:text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          P(A) =
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {laplaceCalculation.totalFavorables} Fav.
                          </span>
                          <div className={`w-16 sm:w-20 h-0.5 my-0.5 ${isDark ? 'bg-white/40' : 'bg-slate-700'}`} />
                          <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                            {laplaceCalculation.totalPosibles} Posibles
                          </span>
                        </div>

                        <span className="font-bold text-xs opacity-50">=</span>

                        {/* Fracción simplificada */}
                        <div className="flex flex-col items-center px-1.5 py-0.5 rounded border border-inherit">
                          <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {laplaceCalculation.simplified.num}
                          </span>
                          <div className={`w-6 h-0.5 my-0.5 ${isDark ? 'bg-white/40' : 'bg-slate-700'}`} />
                          <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                            {laplaceCalculation.simplified.den}
                          </span>
                        </div>

                        <span className="font-bold text-xs opacity-50">=</span>

                        <div className="font-black text-xs sm:text-sm">
                          {laplaceCalculation.probDecimal.toFixed(3)}
                        </div>

                        <span className="font-bold text-xs opacity-50">=</span>

                        <div className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-xs">
                          {laplaceCalculation.probPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Termómetro de Probabilidad de UN SOLO COLOR LIMPIO */}
                    <div
                      className={`p-2 rounded-xl border space-y-1 ${
                        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                        <span className="text-slate-500">📏 Escala:</span>
                        <span className={`font-mono ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          P = {laplaceCalculation.probDecimal} ({laplaceCalculation.probPercentage}%)
                        </span>
                      </div>

                      {/* Pista de un solo color */}
                      <div
                        className={`relative h-2.5 sm:h-3 rounded-full border overflow-hidden ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-200 border-slate-300'
                        }`}
                      >
                        <div
                          className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.max(2, Math.min(100, laplaceCalculation.probPercentage))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] font-bold opacity-80">
                        <span>0 (0% Imposible)</span>
                        <span>0.5 (50% Equiprobable)</span>
                        <span>1.0 (100% Seguro)</span>
                      </div>
                    </div>

                    {/* Tarjeta de Conclusión Didáctica */}
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg border text-[10px] sm:text-[11px] flex items-center gap-1.5 ${
                        isDark ? 'bg-slate-950/60 border-slate-700 text-slate-200' : 'bg-blue-50/80 border-blue-200 text-slate-800'
                      }`}
                    >
                      <span className="text-sm shrink-0">💡</span>
                      <p className="leading-tight">
                        <strong>Conclusión:</strong> Hay <strong>{laplaceCalculation.totalFavorables}</strong> de <strong>{laplaceCalculation.totalPosibles}</strong> posibilidades: <strong>{laplaceCalculation.probPercentage}%</strong> de probabilidad.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DE AYUDA GENERAL ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo usar esta vista de Probabilidad?"
      >
        <div className="space-y-2 text-xs leading-relaxed">
          <p>
            Sigue estos 2 pasos para dominar la probabilidad:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>1. Descubrir la Probabilidad:</strong> Observa el experimento, descubre el espacio muestral completo y comprende paso a paso cómo se construye la fórmula a partir de los casos favorables.</li>
            <li><strong>2. Regla de Laplace:</strong> Aplica la fórmula general a diferentes sucesos y observa su cálculo en fracción, decimal, porcentaje y en la escala de probabilidad.</li>
          </ol>
        </div>
      </ModalHelp>
    </div>
  )
}
