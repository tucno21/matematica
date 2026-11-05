import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Box,
  Layers,
  Sparkles,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Maximize2
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// Paletas de color por cada capa de cubos (de abajo hacia arriba)
const LAYER_PALETTES = [
  { name: 'Esmeralda', top: '#34d399', left: '#059669', right: '#047857', border: '#a7f3d0', badge: 'bg-emerald-500' }, // Capa 1
  { name: 'Cian', top: '#38bdf8', left: '#0284c7', right: '#0369a1', border: '#bae6fd', badge: 'bg-cyan-500' },          // Capa 2
  { name: 'Índigo', top: '#818cf8', left: '#4f46e5', right: '#3730a3', border: '#c7d2fe', badge: 'bg-indigo-500' },      // Capa 3
  { name: 'Púrpura', top: '#c084fc', left: '#9333ea', right: '#7e22ce', border: '#e9d5ff', badge: 'bg-purple-500' },     // Capa 4
  { name: 'Rosa', top: '#f472b6', left: '#db2777', right: '#be185d', border: '#fbcfe8', badge: 'bg-pink-500' },          // Capa 5
  { name: 'Ámbar', top: '#fbbf24', left: '#d97706', right: '#b45309', border: '#fde68a', badge: 'bg-amber-500' },         // Capa 6
]

const UNIFORM_PALETTE = {
  top: '#60a5fa',
  left: '#2563eb',
  right: '#1d4ed8',
  border: '#bfdbfe',
  badge: 'bg-blue-500'
}

interface CubeData {
  x: number
  y: number
  z: number
  layer: number
  index: number
}

export default function VolumenPrismaView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // ── Dimensiones del Prisma ──
  const [baseType, setBaseType] = useState<'rectangular' | 'cuadrada'>('rectangular')
  const [lengthX, setLengthX] = useState<number>(3) // Largo (X)
  const [widthY, setWidthY] = useState<number>(2)   // Ancho (Y)
  const [heightZ, setHeightZ] = useState<number>(4) // Altura máxima (Z)

  // ── Modo de Llenado: 'layers' (por capas) o 'cubes' (cubo a cubo) ──
  const [fillMode, setFillMode] = useState<'layers' | 'cubes'>('layers')

  // Deslizador de llenado: inicia en 0
  const [filledLayers, setFilledLayers] = useState<number>(0)
  const [filledCubes, setFilledCubes] = useState<number>(0)

  // ── Opciones Visuales Pedagógicas ──
  const [showGhostBox, setShowGhostBox] = useState<boolean>(true)
  const [showBaseGrid, setShowBaseGrid] = useState<boolean>(true)
  const [showDimensions, setShowDimensions] = useState<boolean>(true)
  const [colorByLayer, setColorByLayer] = useState<boolean>(true)
  const [showCubeNumbers, setShowCubeNumbers] = useState<boolean>(false)
  const [viewAngleOffset, setViewAngleOffset] = useState<number>(0)
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // Cursor hover para inspeccionar un cubo específico
  const [hoveredCube, setHoveredCube] = useState<CubeData | null>(null)

  // Referencias para el deslizador vertical interactivo (Drag-and-Slide)
  const sliderTrackRef = useRef<HTMLDivElement | null>(null)
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false)

  // Dimensiones del contenedor del SVG
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 700, height: 480 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 50 && rect.height > 50) {
        setDims({ width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Sincronización de Base Cuadrada ──
  const handleSetBaseType = (type: 'rectangular' | 'cuadrada') => {
    setBaseType(type)
    if (type === 'cuadrada') {
      setWidthY(lengthX)
      if (fillMode === 'cubes') {
        setFilledCubes(0)
      }
    }
  }

  const handleLengthChange = (val: number) => {
    const clamped = Math.max(1, Math.min(6, val))
    setLengthX(clamped)
    if (baseType === 'cuadrada') {
      setWidthY(clamped)
    }
    const newMaxCubes = clamped * (baseType === 'cuadrada' ? clamped : widthY) * heightZ
    setFilledCubes(prev => Math.min(prev, newMaxCubes))
  }

  const handleWidthChange = (val: number) => {
    const clamped = Math.max(1, Math.min(6, val))
    setWidthY(clamped)
    if (baseType === 'cuadrada') {
      setLengthX(clamped)
    }
    const newMaxCubes = (baseType === 'cuadrada' ? clamped : lengthX) * clamped * heightZ
    setFilledCubes(prev => Math.min(prev, newMaxCubes))
  }

  const handleHeightChange = (val: number) => {
    const clamped = Math.max(1, Math.min(6, val))
    setHeightZ(clamped)
    setFilledLayers(prev => Math.min(prev, clamped))
    const newMaxCubes = lengthX * widthY * clamped
    setFilledCubes(prev => Math.min(prev, newMaxCubes))
  }

  // ── Cálculos de Volumen ──
  const baseArea = lengthX * widthY
  const totalVolume = baseArea * heightZ

  // Cantidad efectiva de cubos visibles
  const visibleCubesCount = useMemo(() => {
    if (fillMode === 'layers') {
      return filledLayers * baseArea
    }
    return Math.min(filledCubes, totalVolume)
  }, [fillMode, filledLayers, baseArea, filledCubes, totalVolume])

  // Porcentaje de llenado (0 a 100)
  const fillPercentage = useMemo(() => {
    if (fillMode === 'layers') {
      return heightZ > 0 ? (filledLayers / heightZ) * 100 : 0
    }
    return totalVolume > 0 ? (visibleCubesCount / totalVolume) * 100 : 0
  }, [fillMode, filledLayers, heightZ, visibleCubesCount, totalVolume])

  const isComplete = visibleCubesCount === totalVolume && totalVolume > 0

  // Cambiar entre modos de llenado
  const handleToggleFillMode = (mode: 'layers' | 'cubes') => {
    setFillMode(mode)
    if (mode === 'layers') {
      const layersFromCubes = Math.min(heightZ, Math.round(filledCubes / baseArea))
      setFilledLayers(layersFromCubes)
    } else {
      setFilledCubes(filledLayers * baseArea)
    }
  }

  // ── Lógica del Deslizador Vertical Interactivo Real ──
  const updateSliderFromClientY = useCallback(
    (clientY: number) => {
      if (!sliderTrackRef.current) return
      const rect = sliderTrackRef.current.getBoundingClientRect()
      if (rect.height <= 0) return
      // Fracción de 0 (abajo) a 1 (arriba)
      const fraction = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height))
      if (fillMode === 'layers') {
        const layer = Math.round(fraction * heightZ)
        setFilledLayers(layer)
      } else {
        const cubes = Math.round(fraction * totalVolume)
        setFilledCubes(cubes)
      }
    },
    [fillMode, heightZ, totalVolume]
  )

  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSlider(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateSliderFromClientY(e.clientY)
  }

  const handleSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      updateSliderFromClientY(e.clientY)
    }
  }

  const handleSliderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSlider(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  // Llenar todo o vaciar
  const handleFillAll = () => {
    if (fillMode === 'layers') {
      setFilledLayers(heightZ)
    } else {
      setFilledCubes(totalVolume)
    }
  }

  const handleClear = () => {
    setFilledLayers(0)
    setFilledCubes(0)
    setHoveredCube(null)
  }

  const handleStepUp = () => {
    if (fillMode === 'layers') {
      setFilledLayers(prev => Math.min(heightZ, prev + 1))
    } else {
      setFilledCubes(prev => Math.min(totalVolume, prev + 1))
    }
  }

  const handleStepDown = () => {
    if (fillMode === 'layers') {
      setFilledLayers(prev => Math.max(0, prev - 1))
    } else {
      setFilledCubes(prev => Math.max(0, prev - 1))
    }
  }

  // Restablecer valores
  const handleReset = () => {
    setBaseType('rectangular')
    setLengthX(3)
    setWidthY(2)
    setHeightZ(4)
    setFillMode('layers')
    setFilledLayers(0)
    setFilledCubes(0)
    setShowGhostBox(true)
    setShowBaseGrid(true)
    setShowDimensions(true)
    setColorByLayer(true)
    setShowCubeNumbers(false)
    setViewAngleOffset(0)
    setHoveredCube(null)
  }

  // ── Generación de Lista Total de Cubos ──
  const allCubes = useMemo(() => {
    const list: CubeData[] = []
    let idx = 1
    for (let z = 0; z < heightZ; z++) {
      for (let y = 0; y < widthY; y++) {
        for (let x = 0; x < lengthX; x++) {
          list.push({
            x,
            y,
            z,
            layer: z + 1,
            index: idx++
          })
        }
      }
    }
    return list
  }, [lengthX, widthY, heightZ])

  const visibleCubes = useMemo(() => {
    return allCubes.slice(0, visibleCubesCount)
  }, [allCubes, visibleCubesCount])

  // Algoritmo del pintor para renderizado 3D sin solapamientos erróneos
  const sortedVisibleCubes = useMemo(() => {
    return [...visibleCubes].sort((a, b) => {
      if (a.z !== b.z) return a.z - b.z
      const distA = a.x + a.y
      const distB = b.x + b.y
      if (distA !== distB) return distA - distB
      return a.x - b.x
    })
  }, [visibleCubes])

  // ── Parámetros Isométricos ──
  const SVG_W = Math.max(280, dims.width)
  const SVG_H = Math.max(260, dims.height)

  const angleRad = ((30 + viewAngleOffset) * Math.PI) / 180
  const cosA = Math.cos(angleRad)
  const sinA = Math.sin(angleRad)

  // Tamaño de arista de cubo adaptativo y generoso para tablets del gobierno
  // Reserva margen limpio para cotas L, A y H (con sus badges de texto) evitando recortes
  const cubeSize = useMemo(() => {
    const spanW = (lengthX + widthY) * cosA
    const spanH = (lengthX + widthY) * sinA + heightZ
    // Reservar 90px horizontales para cotas laterales y 60px verticales para márgenes superior/inferior
    const fitW = (SVG_W - 90) / spanW
    const fitH = (SVG_H - 60) / spanH
    return Math.max(18, Math.min(52, Math.floor(Math.min(fitW, fitH) * 0.95)))
  }, [lengthX, widthY, heightZ, cosA, sinA, SVG_W, SVG_H])

  const s = cubeSize

  // Centro de proyección exacto: compensa cotas laterales e invierte offset vertical para centrado milimétrico
  const cx = SVG_W / 2 - ((lengthX - widthY) / 2) * s * cosA - 18
  const cy = SVG_H / 2 - (((lengthX + widthY) * sinA - heightZ) / 2) * s - 8

  const project = useCallback(
    (x: number, y: number, z: number) => {
      const px = cx + (x - y) * s * cosA
      const py = cy + (x + y) * s * sinA - z * s
      return { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 }
    },
    [cx, cy, s, cosA, sinA]
  )

  const ghostCorners = useMemo(() => {
    return {
      c000: project(0, 0, 0),
      c100: project(lengthX, 0, 0),
      c110: project(lengthX, widthY, 0),
      c010: project(0, widthY, 0),
      c001: project(0, 0, heightZ),
      c101: project(lengthX, 0, heightZ),
      c111: project(lengthX, widthY, heightZ),
      c011: project(0, widthY, heightZ)
    }
  }, [project, lengthX, widthY, heightZ])

  // Colores dinámicos (Colores 100% sólidos, sin opacidades ni alphas para máxima compatibilidad GPU en tablets)
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    cardBg: isDark ? 'bg-[#10172b]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    textMuted: isDark ? 'text-white/60' : 'text-slate-500',
    svgBg: isDark ? '#090e1f' : '#ffffff',
    gridFloor: isDark ? '#0d1527' : '#f1f5f9',
    gridFloorLine: isDark ? '#1a2744' : '#cbd5e1',
    ghostLine: isDark ? '#38bdf8' : '#0284c7',
    ghostLineBack: isDark ? '#1a2b47' : '#94a3b8',
    badgeBg: isDark ? '#0a0f1d' : '#ffffff',
    shadowBase: isDark ? '#040711' : '#e2e8f0'
  }

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${c.bg} ${c.text}`}>
      {/* ── 1. Header (36-44px) ────────────────────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${c.headerBg} ${c.cardBorder}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Volver</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <h1 className="text-xs sm:text-sm lg:text-base font-bold tracking-tight truncate flex items-center gap-1.5">
            <Box className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Volumen del Prisma</span>
            <span className="font-mono text-cyan-400 font-black hidden sm:inline">
              ({lengthX} × {widthY} × {heightZ} u)
            </span>
          </h1>
        </div>

        {/* Badge pedagógico central */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>V = Área Base × Altura</span>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Restablecer dimensiones y vaciar cubos"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Restablecer</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center h-7 w-7 lg:h-8 lg:w-8 rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer"
            title="Guía pedagógica de volumen"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Barra de Control Superior Compacta (34-38px) ────────────────── */}
      <div
        className={`shrink-0 flex items-center justify-between gap-1.5 sm:gap-3 border-b px-2 lg:px-4 py-1 text-xs overflow-x-auto ${
          isDark ? 'border-white/5 bg-[#0d1424]' : 'border-slate-200 bg-slate-100'
        }`}
      >
        {/* Selector de Tipo de Base */}
        <div className="flex items-center gap-1 shrink-0">
          <span className={`font-bold text-[11px] mr-0.5 hidden xs:inline ${c.textMuted}`}>Base:</span>
          <button
            onClick={() => handleSetBaseType('rectangular')}
            className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
              baseType === 'rectangular'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            Rectangular
          </button>
          <button
            onClick={() => handleSetBaseType('cuadrada')}
            className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
              baseType === 'cuadrada'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            Cuadrada
          </button>
        </div>

        {/* Selector de Modo de Llenado */}
        <div className="flex items-center gap-1 shrink-0">
          <span className={`font-bold text-[11px] mr-0.5 hidden md:inline ${c.textMuted}`}>Modo:</span>
          <button
            onClick={() => handleToggleFillMode('layers')}
            className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
              fillMode === 'layers'
                ? 'bg-purple-500 text-white shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Llenar por capas completas (Área de la Base × Altura)"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Por Capas</span>
          </button>
          <button
            onClick={() => handleToggleFillMode('cubes')}
            className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
              fillMode === 'cubes'
                ? 'bg-purple-500 text-white shadow-xs'
                : isDark
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Llenar y contar cubo por cubo"
          >
            <Box className="h-3.5 w-3.5" />
            <span>Cubo a Cubo</span>
          </button>
        </div>

        {/* Acciones Rápidas: Vaciar y Llenar Todo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleClear}
            disabled={visibleCubesCount === 0}
            className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
              visibleCubesCount === 0
                ? 'opacity-30 cursor-not-allowed'
                : isDark
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
            }`}
          >
            Vaciar (0)
          </button>
          <button
            onClick={handleFillAll}
            disabled={isComplete}
            className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition-all ${
              isComplete
                ? 'opacity-30 cursor-not-allowed'
                : isDark
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
            }`}
          >
            Llenar Todo
          </button>
        </div>
      </div>

      {/* ── 3. Área Principal de Trabajo (CERO SCROLL) ────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1 sm:gap-2 lg:gap-3">
        {/* ══════════════════════════════════════════════════════════════════════
            PANEL DE CONTROLES: Dimensiones del Prisma y Deducción de Volumen
            En tablet vertical (<sm:) se compacta arriba en una tira horizontal;
            En tablet horizontal (≥sm:) es una columna lateral izquierda limpia.
        ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className={`shrink-0 sm:w-[220px] lg:w-[260px] flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 overflow-hidden ${c.cardBg} ${c.cardBorder}`}
        >
          <div className="flex flex-col gap-1.5 sm:gap-2 overflow-y-auto">
            {/* Título de sección de dimensiones */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="text-xs font-bold text-cyan-400">DIMENSIONES</span>
              <span className="text-xs font-mono font-black text-amber-300">
                {lengthX} × {widthY} × {heightZ} u
              </span>
            </div>

            {/* Controles de Dimensiones: L, A, H con botones táctiles grandes de 28px */}
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-1 sm:gap-1.5">
              {/* Dimensión 1: Largo (L) */}
              <div
                className={`rounded-lg border p-1.5 transition-all ${
                  isDark ? 'bg-slate-900/60 border-cyan-500/30' : 'bg-slate-50 border-cyan-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-400">
                    {baseType === 'cuadrada' ? 'Lado (L):' : 'Largo (L):'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleLengthChange(lengthX - 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Disminuir largo"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 min-w-[32px] text-center">
                      {lengthX}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLengthChange(lengthX + 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Aumentar largo"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Dimensión 2: Ancho (A) */}
              <div
                className={`rounded-lg border p-1.5 transition-all ${
                  baseType === 'cuadrada' ? 'opacity-50' : ''
                } ${
                  isDark ? 'bg-slate-900/60 border-emerald-500/30' : 'bg-slate-50 border-emerald-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">
                    {baseType === 'cuadrada' ? 'Ancho (=L):' : 'Ancho (A):'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={baseType === 'cuadrada'}
                      onClick={() => handleWidthChange(widthY - 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Disminuir ancho"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 min-w-[32px] text-center">
                      {widthY}
                    </span>
                    <button
                      type="button"
                      disabled={baseType === 'cuadrada'}
                      onClick={() => handleWidthChange(widthY + 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Aumentar ancho"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Dimensión 3: Altura total (H) */}
              <div
                className={`rounded-lg border p-1.5 transition-all ${
                  isDark ? 'bg-slate-900/60 border-purple-500/30' : 'bg-slate-50 border-purple-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-400">Altura (H):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleHeightChange(heightZ - 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Disminuir altura"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 min-w-[32px] text-center">
                      {heightZ}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleHeightChange(heightZ + 1)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center font-black text-sm cursor-pointer active:scale-90 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="Aumentar altura"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Conteo de Cubos */}
            <div
              className={`rounded-lg border p-2 text-xs hidden sm:block ${
                isDark ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-bold text-amber-400 text-[11px] uppercase tracking-wider mb-1">
                Conteo por Capas
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={c.textMuted}>Área base:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {lengthX} × {widthY} = {baseArea} cubos
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={c.textMuted}>Capas:</span>
                  <span className="font-mono font-bold text-purple-400">
                    {fillMode === 'layers' ? filledLayers : (filledCubes / baseArea).toFixed(1)} de {heightZ}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-white/10">
                  <span className="font-bold">Volumen total:</span>
                  <span className="font-mono font-black text-amber-300 text-sm">
                    {totalVolume} u³
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Opciones Visuales en la base */}
          <div className="pt-1.5 border-t border-white/10 flex flex-wrap gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setShowGhostBox(prev => !prev)}
              className={`px-2 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showGhostBox
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : isDark
                  ? 'bg-white/5 text-white/50'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span>Guía Prisma</span>
            </button>

            <button
              type="button"
              onClick={() => setColorByLayer(prev => !prev)}
              className={`px-2 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                colorByLayer
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : isDark
                  ? 'bg-white/5 text-white/50'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span>Color Capas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCubeNumbers(prev => !prev)}
              className={`px-2 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                showCubeNumbers
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : isDark
                  ? 'bg-white/5 text-white/50'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span># Números</span>
            </button>

            <button
              type="button"
              onClick={() => setViewAngleOffset(prev => (prev === 0 ? 15 : prev === 15 ? -15 : 0))}
              className={`px-2 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewAngleOffset !== 0
                  ? 'bg-white/20 text-white'
                  : isDark
                  ? 'bg-white/5 text-white/50'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Maximize2 className="h-3 w-3" />
              <span>Girar</span>
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════════
            ESPACIO CENTRAL: El Lienzo 3D + El Deslizador Vertical Real
        ══════════════════════════════════════════════════════════════════════ */}
        <main
          className={`flex-1 min-w-0 min-h-0 flex flex-col rounded-xl border overflow-hidden relative ${c.cardBg} ${c.cardBorder}`}
        >
          {/* Barra superior de estado del lienzo */}
          <div
            className={`flex h-7 shrink-0 items-center justify-between px-2 sm:px-3 border-b text-xs ${
              isDark ? 'border-white/10 bg-[#0d1424]' : 'border-slate-200 bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-400">Prisma Tridimensional</span>
              {hoveredCube && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  Cubo #{hoveredCube.index} en Capa {hoveredCube.layer}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs ${c.textMuted}`}>
                1 cubo = <strong className="text-white font-mono">1 u³</strong>
              </span>
              {isComplete && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>¡Lleno!</span>
                </span>
              )}
            </div>
          </div>

          {/* Contenedor central: SVG 3D a la izquierda + Deslizador Vertical Real a la derecha */}
          <div className="flex-1 min-h-0 min-w-0 flex items-stretch relative overflow-hidden">
            {/* ── 3D SVG ISOMÉTRICO (Optimizado para GPUs de tablets: Cero filtros feDropShadow ni gradientes pesados) ── */}
            <div
              ref={containerRef}
              className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden p-0"
              style={{ transform: 'translateZ(0)', isolation: 'isolate' }}
            >
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-full block"
                style={{ touchAction: 'none' }}
              >
                <rect x="0" y="0" width={SVG_W} height={SVG_H} fill={c.svgBg} />

                {/* Sombra base poligonal vectorial 100% sólida para GPU móvil */}
                {visibleCubesCount > 0 && (
                  <polygon
                    points={`${ghostCorners.c000.x + 8},${ghostCorners.c000.y + 8} ${ghostCorners.c100.x + 8},${ghostCorners.c100.y + 8} ${ghostCorners.c110.x + 8},${ghostCorners.c110.y + 8} ${ghostCorners.c010.x + 8},${ghostCorners.c010.y + 8}`}
                    fill={c.shadowBase}
                  />
                )}

                {/* Malla del piso base z = 0 (Líneas vectoriales sólidas directas, sin dash ni opacidad) */}
                {showBaseGrid && (
                  <g>
                    {/* Piso base sólido */}
                    <polygon
                      points={`${ghostCorners.c000.x},${ghostCorners.c000.y} ${ghostCorners.c100.x},${ghostCorners.c100.y} ${ghostCorners.c110.x},${ghostCorners.c110.y} ${ghostCorners.c010.x},${ghostCorners.c010.y}`}
                      fill={c.gridFloor}
                      stroke={c.gridFloorLine}
                      strokeWidth="1.5"
                    />
                    {/* Líneas internas de la cuadrícula del piso */}
                    {Array.from({ length: lengthX - 1 }, (_, i) => i + 1).map(x => {
                      const pA = project(x, 0, 0)
                      const pB = project(x, widthY, 0)
                      return (
                        <line
                          key={`grid-x-${x}`}
                          x1={pA.x}
                          y1={pA.y}
                          x2={pB.x}
                          y2={pB.y}
                          stroke={c.gridFloorLine}
                          strokeWidth="1"
                        />
                      )
                    })}
                    {Array.from({ length: widthY - 1 }, (_, i) => i + 1).map(y => {
                      const pA = project(0, y, 0)
                      const pB = project(lengthX, y, 0)
                      return (
                        <line
                          key={`grid-y-${y}`}
                          x1={pA.x}
                          y1={pA.y}
                          x2={pB.x}
                          y2={pB.y}
                          stroke={c.gridFloorLine}
                          strokeWidth="1"
                        />
                      )
                    })}
                  </g>
                )}

                {/* Aristas traseras de la caja envolvente (Líneas sólidas sin dash) */}
                {showGhostBox && visibleCubesCount < totalVolume && (
                  <g>
                    <line
                      x1={ghostCorners.c000.x}
                      y1={ghostCorners.c000.y}
                      x2={ghostCorners.c001.x}
                      y2={ghostCorners.c001.y}
                      stroke={c.ghostLineBack}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={ghostCorners.c000.x}
                      y1={ghostCorners.c000.y}
                      x2={ghostCorners.c100.x}
                      y2={ghostCorners.c100.y}
                      stroke={c.ghostLineBack}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={ghostCorners.c000.x}
                      y1={ghostCorners.c000.y}
                      x2={ghostCorners.c010.x}
                      y2={ghostCorners.c010.y}
                      stroke={c.ghostLineBack}
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* Renderizado de Cubos Visibles en Orden del Pintor (Vectorial puro) */}
                <g>
                  {sortedVisibleCubes.map(cube => {
                    const { x, y, z, layer, index } = cube
                    const isHovered = hoveredCube?.index === index
                    const palette = colorByLayer
                      ? LAYER_PALETTES[(layer - 1) % LAYER_PALETTES.length]
                      : UNIFORM_PALETTE

                    const p0 = project(x, y, z + 1)
                    const p1 = project(x + 1, y, z + 1)
                    const p2 = project(x + 1, y + 1, z + 1)
                    const p3 = project(x, y + 1, z + 1)
                    const p5 = project(x + 1, y, z)
                    const p6 = project(x + 1, y + 1, z)
                    const p7 = project(x, y + 1, z)

                    return (
                      <g
                        key={`cube-${x}-${y}-${z}`}
                        onPointerEnter={() => setHoveredCube(cube)}
                        onPointerLeave={() => setHoveredCube(null)}
                        className="cursor-pointer"
                      >
                        {/* Cara Frontal-Izquierda */}
                        <polygon
                          points={`${p3.x},${p3.y} ${p2.x},${p2.y} ${p6.x},${p6.y} ${p7.x},${p7.y}`}
                          fill={isHovered ? '#0284c7' : palette.left}
                          stroke={isHovered ? '#ffffff' : palette.border}
                          strokeWidth={isHovered ? 2.5 : 1.2}
                          strokeLinejoin="round"
                        />

                        {/* Cara Frontal-Derecha */}
                        <polygon
                          points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p6.x},${p6.y} ${p5.x},${p5.y}`}
                          fill={isHovered ? '#0369a1' : palette.right}
                          stroke={isHovered ? '#ffffff' : palette.border}
                          strokeWidth={isHovered ? 2.5 : 1.2}
                          strokeLinejoin="round"
                        />

                        {/* Cara Superior */}
                        <polygon
                          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                          fill={isHovered ? '#38bdf8' : palette.top}
                          stroke={isHovered ? '#ffffff' : palette.border}
                          strokeWidth={isHovered ? 2.5 : 1.2}
                          strokeLinejoin="round"
                        />

                        {/* Número consecutivo si está activado (renderizado limpio) */}
                        {showCubeNumbers && s >= 24 && (
                          <text
                            x={(p0.x + p2.x) / 2}
                            y={(p0.y + p2.y) / 2 + 3.5}
                            textAnchor="middle"
                            fontSize={s >= 34 ? '11' : '9'}
                            fontWeight="bold"
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth="1.5"
                            paintOrder="stroke fill"
                            fontFamily="JetBrains Mono, monospace"
                            pointerEvents="none"
                          >
                            {index}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* Estructura alámbrica frontal del prisma (Líneas vectoriales 100% sólidas sin polígonos translúcidos ni dash) */}
                {showGhostBox && visibleCubesCount < totalVolume && (
                  <g pointerEvents="none">
                    {/* Pilares verticales frontales */}
                    <line
                      x1={ghostCorners.c110.x}
                      y1={ghostCorners.c110.y}
                      x2={ghostCorners.c111.x}
                      y2={ghostCorners.c111.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c010.x}
                      y1={ghostCorners.c010.y}
                      x2={ghostCorners.c011.x}
                      y2={ghostCorners.c011.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c100.x}
                      y1={ghostCorners.c100.y}
                      x2={ghostCorners.c101.x}
                      y2={ghostCorners.c101.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />

                    {/* Aristas superiores del prisma */}
                    <line
                      x1={ghostCorners.c001.x}
                      y1={ghostCorners.c001.y}
                      x2={ghostCorners.c101.x}
                      y2={ghostCorners.c101.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c001.x}
                      y1={ghostCorners.c001.y}
                      x2={ghostCorners.c011.x}
                      y2={ghostCorners.c011.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c101.x}
                      y1={ghostCorners.c101.y}
                      x2={ghostCorners.c111.x}
                      y2={ghostCorners.c111.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c011.x}
                      y1={ghostCorners.c011.y}
                      x2={ghostCorners.c111.x}
                      y2={ghostCorners.c111.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />

                    {/* Aristas inferiores frontales */}
                    <line
                      x1={ghostCorners.c010.x}
                      y1={ghostCorners.c010.y}
                      x2={ghostCorners.c110.x}
                      y2={ghostCorners.c110.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                    <line
                      x1={ghostCorners.c100.x}
                      y1={ghostCorners.c100.y}
                      x2={ghostCorners.c110.x}
                      y2={ghostCorners.c110.y}
                      stroke={c.ghostLine}
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* Cotas de medidas L, A, H (Todas exteriores al prisma con colores y líneas 100% sólidas) */}
                {showDimensions && (
                  <g pointerEvents="none" fontSize="11" fontWeight="bold" fontFamily="Nunito, sans-serif">
                    {/* Cota Largo (L) - Exterior en arista inferior derecha */}
                    {(() => {
                      const p1 = ghostCorners.c110
                      const p2 = ghostCorners.c100
                      const midX = (p1.x + p2.x) / 2 + 16
                      const midY = (p1.y + p2.y) / 2 + 16
                      return (
                        <g>
                          <rect
                            x={midX - 30}
                            y={midY - 11}
                            width={60}
                            height={22}
                            rx={5}
                            fill={c.badgeBg}
                            stroke="#38bdf8"
                            strokeWidth="1.2"
                          />
                          <text
                            x={midX}
                            y={midY + 4}
                            fill="#38bdf8"
                            textAnchor="middle"
                            className="font-mono font-black"
                            fontSize="11"
                          >
                            L = {lengthX} u
                          </text>
                        </g>
                      )
                    })()}

                    {/* Cota Ancho (A) - Exterior en arista inferior izquierda */}
                    {(() => {
                      const p1 = ghostCorners.c010
                      const p2 = ghostCorners.c110
                      const midX = (p1.x + p2.x) / 2 - 16
                      const midY = (p1.y + p2.y) / 2 + 16
                      return (
                        <g>
                          <rect
                            x={midX - 30}
                            y={midY - 11}
                            width={60}
                            height={22}
                            rx={5}
                            fill={c.badgeBg}
                            stroke="#34d399"
                            strokeWidth="1.2"
                          />
                          <text
                            x={midX}
                            y={midY + 4}
                            fill="#34d399"
                            textAnchor="middle"
                            className="font-mono font-black"
                            fontSize="11"
                          >
                            A = {widthY} u
                          </text>
                        </g>
                      )
                    })()}

                    {/* Cota Altura (H) - Arista vertical exterior derecha */}
                    {(() => {
                      const xEdge = ghostCorners.c100.x
                      const yBottom = ghostCorners.c100.y
                      const yTop = ghostCorners.c101.y
                      const xLine = xEdge + 16
                      const midY = (yBottom + yTop) / 2
                      return (
                        <g>
                          {/* Línea guía de cota vertical sólida */}
                          <line
                            x1={xLine}
                            y1={yBottom}
                            x2={xLine}
                            y2={yTop}
                            stroke="#c084fc"
                            strokeWidth="1.5"
                          />
                          {/* Ticks en los extremos */}
                          <line x1={xLine - 4} y1={yBottom} x2={xLine + 6} y2={yBottom} stroke="#c084fc" strokeWidth="1.5" />
                          <line x1={xLine - 4} y1={yTop} x2={xLine + 6} y2={yTop} stroke="#c084fc" strokeWidth="1.5" />
                          {/* Badge de Altura legible y sólido */}
                          <rect
                            x={xLine + 8}
                            y={midY - 11}
                            width={60}
                            height={22}
                            rx={5}
                            fill={c.badgeBg}
                            stroke="#c084fc"
                            strokeWidth="1.2"
                          />
                          <text
                            x={xLine + 38}
                            y={midY + 4}
                            fill="#c084fc"
                            textAnchor="middle"
                            className="font-mono font-black"
                            fontSize="11"
                          >
                            H = {heightZ} u
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                )}
              </svg>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                EL VERDADERO DESLIZADOR VERTICAL (Range Slider Touch Interactivo)
                Requerimiento explícito: "tiene que ser deslizador, no botones"
            ══════════════════════════════════════════════════════════════════ */}
            <div
              className={`w-[74px] sm:w-[84px] lg:w-[94px] shrink-0 border-l flex flex-col items-center justify-between py-2 px-1.5 ${
                isDark ? 'border-white/10 bg-[#0d1424]' : 'border-slate-200 bg-slate-100'
              }`}
            >
              {/* Botón táctil para subir 1 nivel */}
              <button
                type="button"
                onClick={handleStepUp}
                disabled={isComplete}
                className={`w-full h-8 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                  isComplete
                    ? 'opacity-30 cursor-not-allowed'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95 shadow-xs font-black'
                }`}
                title={fillMode === 'layers' ? 'Subir 1 capa' : 'Agregar 1 cubo'}
              >
                <ChevronUp className="h-4 w-4" />
                <span className="text-[11px]">+1</span>
              </button>

              {/* CONTENEDOR DEL DESLIZADOR VERTICAL REAL */}
              <div
                ref={sliderTrackRef}
                onPointerDown={handleSliderPointerDown}
                onPointerMove={handleSliderPointerMove}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                className="flex-1 w-full my-2 relative flex items-center justify-center cursor-pointer select-none"
                style={{ touchAction: 'none' }}
                title="Arrastra verticalmente para aumentar o disminuir los cubos del prisma"
              >
                {/* Riel Vertical de Fondo */}
                <div className="absolute inset-y-1 w-4 sm:w-5 rounded-full bg-slate-800/80 border-2 border-white/20 overflow-hidden flex flex-col justify-end">
                  {/* Relleno dinámico sólido según el porcentaje de llenado (sin gradiente a petición del usuario) */}
                  <div
                    className="w-full bg-cyan-500"
                    style={{ height: `${fillPercentage}%` }}
                  />
                </div>

                {/* Marcas de Niveles a lo largo del riel */}
                <div className="absolute inset-y-1 left-0 right-0 pointer-events-none flex flex-col justify-between items-center py-2">
                  {Array.from({ length: heightZ + 1 }, (_, i) => heightZ - i).map(lvl => {
                    const isCurrent = fillMode === 'layers' ? filledLayers === lvl : false
                    return (
                      <div
                        key={`tick-${lvl}`}
                        className="w-full flex items-center justify-between px-1"
                      >
                        <span
                          className={`text-[10px] font-mono font-black ${
                            isCurrent ? 'text-amber-300 scale-110' : lvl <= filledLayers ? 'text-cyan-300' : 'text-white/40'
                          }`}
                        >
                          {lvl === 0 ? '0' : `C${lvl}`}
                        </span>
                        <div
                          className={`h-0.5 w-2 rounded-full ${
                            lvl <= filledLayers ? 'bg-cyan-400' : 'bg-white/20'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* BOTÓN DESLIZADOR (Thumb / Manija de Arrastre Táctil) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 border-2 border-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing active:scale-110 z-20"
                  style={{
                    bottom: `calc(${fillPercentage}% - 16px)`
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                </div>
              </div>

              {/* Botón táctil para bajar 1 nivel */}
              <button
                type="button"
                onClick={handleStepDown}
                disabled={visibleCubesCount === 0}
                className={`w-full h-8 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                  visibleCubesCount === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-400 text-white active:scale-95 shadow-xs font-black'
                }`}
                title={fillMode === 'layers' ? 'Bajar 1 capa' : 'Quitar 1 cubo'}
              >
                <span className="text-[11px]">-1</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback Pedagógico (40-48px) ───── */}
      <footer
        className={`h-10 lg:h-12 shrink-0 border-t px-2 sm:px-3 lg:px-4 flex items-center justify-between gap-2 text-xs lg:text-sm ${c.headerBg} ${c.cardBorder}`}
      >
        {/* Fórmula interactiva viva */}
        <div className="flex items-center gap-2 sm:gap-3 truncate">
          <div className="flex items-center gap-1 font-mono font-black text-cyan-400 text-xs sm:text-sm">
            <span>V = A_base × h</span>
            <span>=</span>
            <span>({lengthX} × {widthY}) × {fillMode === 'layers' ? filledLayers : (visibleCubesCount / baseArea).toFixed(1)}</span>
            <span>=</span>
            <span className="text-amber-300 text-sm sm:text-base font-black px-1.5 py-0.2 rounded bg-amber-500/20">
              {visibleCubesCount} u³
            </span>
          </div>

          <span className="hidden md:inline text-white/30">•</span>

          {/* Explicación pedagógica guiada */}
          <span className={`hidden md:inline text-xs font-medium truncate ${c.textMuted}`}>
            {visibleCubesCount === 0
              ? 'Mueve el deslizador vertical hacia arriba para colocar la primera capa de cubos.'
              : visibleCubesCount < totalVolume
              ? `Cada capa tiene ${baseArea} cubos (${lengthX}×${widthY}). Van ${visibleCubesCount} cubos en total.`
              : `¡Prisma completo! Se llenaron las ${heightZ} capas. El volumen total es ${totalVolume} cubos (${totalVolume} u³).`}
          </span>
        </div>

        {/* Contador de estado */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            <span className="text-white/60">Cubos:</span>
            <span className="text-cyan-300 font-bold">{visibleCubesCount}</span>
            <span className="text-white/40">/</span>
            <span className="text-amber-300 font-bold">{totalVolume}</span>
          </div>
        </div>
      </footer>

      {/* ── MODAL DE AYUDA PEDAGÓGICA (ModalHelp) ────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía: Volumen de Prismas Rectangulares y Cuadrangulares"
        bgColor={isDark ? '#0a1020' : '#ffffff'}
        titleColor={isDark ? '#ffffff' : '#0f172a'}
        maxWidth="max-w-md"
        buttonColor="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
      >
        <div className={`space-y-4 text-xs sm:text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}>
              1. ¿Qué es el volumen?
            </h4>
            <p>
              El <strong>volumen</strong> es la cantidad de espacio tridimensional que ocupa un cuerpo. Se mide contando cuántos <strong>cubos unidad</strong> (1 u³) caben exactamente en su interior.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-emerald-300' : 'text-emerald-700'
            }`}>
              2. La Base: Cubos en el primer piso
            </h4>
            <p>
              Para llenar el prisma, primero colocamos una capa que cubra toda la base:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
              <li><strong>Área de la base (A_b)</strong> = Largo × Ancho.</li>
              <li>Si el largo es {lengthX} y el ancho es {widthY}, en el piso caben <strong>{baseArea} cubos</strong>.</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}>
              3. La Altura: Apilar capas iguales
            </h4>
            <p>
              Cada piso adicional tiene exactamente la misma cantidad de cubos. Por eso multiplicamos el área de la base por la altura:
            </p>
            <p className="mt-1 font-bold text-amber-400">
              Volumen = Área de la Base × Altura = (Largo × Ancho) × Altura
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}>
              4. Cómo usar el deslizador
            </h4>
            <p>
              Arrastra el <strong>deslizador vertical</strong> de la derecha hacia arriba. Observa cómo se van colocando los cubos piso por piso y cómo aumenta el volumen total.
            </p>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
