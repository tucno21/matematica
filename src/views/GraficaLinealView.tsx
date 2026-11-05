import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  TrendingUp,
  Sliders,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Sparkles
} from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import ModalHelp from '../components/ModalHelp'

// Conversión precisa e inmune al resize/aspect-ratio del SVG
function getSvgCoordinates(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM()
  if (ctm) {
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }
  const rect = svg.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * svg.viewBox.baseVal.width,
    y: ((clientY - rect.top) / rect.height) * svg.viewBox.baseVal.height
  }
}

export default function GraficaLinealView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // Estado inicial requerido: y = 5x + 7 (m = 5, b = 7)
  const [slopeM, setSlopeM] = useState<number>(5)
  const [interceptB, setInterceptB] = useState<number>(7)

  // Opciones visuales y pedagógicas (desactivadas por defecto)
  const [showSlopeTriangle, setShowSlopeTriangle] = useState<boolean>(false)
  const [showBaseLine, setShowBaseLine] = useState<boolean>(false)
  const [showIntegerPoints, setShowIntegerPoints] = useState<boolean>(false)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [showHelp, setShowHelp] = useState<boolean>(false)

  // Desplazamiento y arrastre del plano (pan-and-drag)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null)

  // Cursor interactivo y dimensiones dinámicas del plano
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 700, height: 500 })

  // Observador de resize para adaptar el SVG al 100% del contenedor real
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 50 && rect.height > 50) {
        setDims({ width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Geometría reactiva que llena todo el ancho y alto del contenedor
  const SVG_W = Math.max(300, dims.width)
  const SVG_H = Math.max(300, dims.height)
  const PAD_LEFT = 36
  const PAD_RIGHT = 18
  const PAD_TOP = 14
  const PAD_BOTTOM = 24
  const PLOT_W = Math.max(100, SVG_W - PAD_LEFT - PAD_RIGHT)
  const PLOT_H = Math.max(100, SVG_H - PAD_TOP - PAD_BOTTOM)

  // ── ESCALA ORTONORMAL ISOTRÓPICA (1 unidad X = 1 unidad Y = unitPx) ──
  // Base: en vertical se muestran aproximadamente 22 unidades a zoom 1x
  const baseSpanY = 22 / zoomLevel
  const unitPx = PLOT_H / baseSpanY

  // Origen (0, 0) centrado con ligero offset hacia abajo para ver cómodamente y = 5x + 7
  const initialCenterOffsetY = 2.5 * unitPx
  const originSvgX = PAD_LEFT + PLOT_W / 2 + panOffset.x
  const originSvgY = PAD_TOP + PLOT_H / 2 + panOffset.y + initialCenterOffsetY

  // Límites matemáticos visibles exactamente en pantalla (100% independientes de m y b)
  const minX = Math.floor((PAD_LEFT - originSvgX) / unitPx)
  const maxX = Math.ceil((PAD_LEFT + PLOT_W - originSvgX) / unitPx)
  const minY = Math.floor((originSvgY - (PAD_TOP + PLOT_H)) / unitPx)
  const maxY = Math.ceil((originSvgY - PAD_TOP) / unitPx)

  const toSvgX = useCallback(
    (x: number) => originSvgX + x * unitPx,
    [originSvgX, unitPx]
  )

  const toSvgY = useCallback(
    (y: number) => originSvgY - y * unitPx,
    [originSvgY, unitPx]
  )

  const fromSvgCoords = useCallback(
    (svgX: number, svgY: number) => {
      const mathX = (svgX - originSvgX) / unitPx
      const mathY = (originSvgY - svgY) / unitPx
      return {
        x: Math.round(mathX * 10) / 10,
        y: Math.round(mathY * 10) / 10,
        intX: Math.round(mathX),
        intY: Math.round(mathY)
      }
    },
    [originSvgX, originSvgY, unitPx]
  )

  // Paso idéntico para ambos ejes para garantizar cuadrículas 100% cuadradas
  const gridStep = useMemo(() => {
    if (unitPx >= 28) return 1
    if (unitPx >= 14) return 2
    if (unitPx >= 7) return 5
    return 10
  }, [unitPx])

  // Manejo de arrastre interactivo (drag-to-pan)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.clientX
      const dy = e.clientY - dragStartRef.current.clientY
      setPanOffset({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      })
      return
    }
    if (!svgRef.current) return
    const svgCoords = getSvgCoordinates(svgRef.current, e.clientX, e.clientY)
    const { intX, intY } = fromSvgCoords(svgCoords.x, svgCoords.y)
    if (intX >= minX && intX <= maxX && intY >= minY && intY <= maxY) {
      setHoverCoord({ x: intX, y: intY })
    } else {
      setHoverCoord(null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false)
    dragStartRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverCoord(null)
    }
  }

  // Puntos enteros notables sobre la recta para mostrar en la cuadrícula
  const sampleIntegerPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let x = minX; x <= maxX; x++) {
      const y = slopeM * x + interceptB
      if (y >= minY && y <= maxY) {
        pts.push({ x, y })
      }
    }
    return pts
  }, [minX, maxX, minY, maxY, slopeM, interceptB])

  // Restablecer a la función inicial y = 5x + 7 y centrar plano
  const handleReset = () => {
    setSlopeM(5)
    setInterceptB(7)
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setShowSlopeTriangle(false)
    setShowBaseLine(false)
    setShowIntegerPoints(false)
    setHoverCoord(null)
  }

  // Colores dinámicos según el tema
  const c = {
    bg: isDark ? 'bg-[#080c18]' : 'bg-slate-50',
    headerBg: isDark ? 'bg-[#0a0f1d]' : 'bg-white',
    cardBg: isDark ? 'bg-[#10172b]' : 'bg-white',
    cardBorder: isDark ? 'border-white/10' : 'border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    textMuted: isDark ? 'text-white/60' : 'text-slate-500',
    gridLine: isDark ? '#334155' : '#cbd5e1',
    gridSubLine: isDark ? '#1e293b' : '#f1f5f9',
    axisLine: isDark ? '#38bdf8' : '#0284c7',
    axisNumColor: isDark ? '#f8fafc' : '#0f172a',
    svgBg: isDark ? '#090e1f' : '#ffffff',
    lineGlow: isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(147, 51, 234, 0.25)',
    lineColor: '#a855f7'
  }

  // Fórmulas matemáticas formateadas limpiamente
  const formattedEquation = useMemo(() => {
    if (slopeM === 0) {
      return {
        prefix: 'y =',
        mPart: '',
        bPart: `${interceptB}`,
        label: 'Función Constante'
      }
    }
    const mStr = slopeM === 1 ? '' : slopeM === -1 ? '-' : `${slopeM}`
    const bStr =
      interceptB === 0
        ? ''
        : interceptB > 0
        ? `+ ${interceptB}`
        : `- ${Math.abs(interceptB)}`
    return {
      prefix: 'y =',
      mPart: `${mStr}x`,
      bPart: bStr,
      label: interceptB === 0 ? 'Función Lineal (pasa por el origen)' : 'Función Afín (ordenada b ≠ 0)'
    }
  }, [slopeM, interceptB])

  return (
    <div className={`flex h-dvh flex-col overflow-hidden select-none ${c.bg} ${c.text}`}>
      {/* ── 1. Header (36-44px) ────────────────────────────────────────────── */}
      <header
        className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${c.headerBg} ${c.cardBorder}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <h1 className="text-xs lg:text-sm font-bold tracking-tight truncate flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Gráfica Lineal:</span>
            <span className="font-mono text-cyan-400 font-extrabold hidden xs:inline">y = 5x + 7</span>
          </h1>
        </div>

        {/* Badge pedagógico central en pantallas grandes */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>y = mx + b</span>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className={`flex h-7 px-2 items-center gap-1 rounded-lg border text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
              isDark
                ? 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Restablecer a y = 5x + 7"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Restablecer</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            title="Guía Pedagógica"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── 2. Área de Trabajo Principal (flex-1 min-h-0) ───────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch overflow-hidden p-1 sm:p-1.5 lg:p-2 gap-1.5 lg:gap-2">
        {/* ══════════════════════════════════════════════════════════════════════
            SECCIÓN IZQUIERDA: La Función y los dos Deslizadores (m y b)
        ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className={`w-full md:w-[250px] lg:w-[270px] xl:w-[290px] shrink-0 flex flex-col justify-between rounded-xl border p-2 overflow-y-auto max-h-[35vh] md:max-h-none ${c.cardBg} ${c.cardBorder}`}
        >
          <div className="flex flex-col gap-2.5">
            {/* ── 1. Tarjeta Superior: La Función ── */}
            <div
              className={`rounded-xl border p-2.5 sm:p-3 text-center transition-all ${
                isDark ? 'bg-purple-950/30 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  isDark ? 'text-purple-300' : 'text-purple-800'
                }`}>
                  Ecuación de la Función
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded font-semibold ${
                  slopeM > 0
                    ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                    : slopeM < 0
                    ? isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-800'
                    : isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  {slopeM > 0 ? 'Creciente ↗' : slopeM < 0 ? 'Decreciente ↘' : 'Constante →'}
                </span>
              </div>

              {/* Modelo canónico y = mx + b */}
              <div className={`mt-1 font-mono text-xs sm:text-sm font-bold ${
                isDark ? 'text-purple-200/80' : 'text-purple-900/80'
              }`}>
                y = <span className="text-cyan-500">m</span>x + <span className="text-amber-500">b</span>
              </div>

              {/* Ecuación dinámica evaluada con valores vivos */}
              <div className="mt-1 pt-1 border-t border-purple-500/20 font-mono text-xl sm:text-2xl font-black tracking-wide">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  {formattedEquation.prefix}{' '}
                  {formattedEquation.mPart && (
                    <span className="text-cyan-500">{formattedEquation.mPart}</span>
                  )}{' '}
                  {formattedEquation.bPart && (
                    <span className="text-amber-500">{formattedEquation.bPart}</span>
                  )}
                </span>
              </div>

              {/* Píldora de clasificación didáctica */}
              <div className={`mt-1.5 text-[10px] sm:text-[11px] font-semibold ${
                isDark ? 'text-white/70' : 'text-slate-600'
              }`}>
                {formattedEquation.label}
              </div>
            </div>

            {/* ── 2. Debajo de la función: Los dos Deslizadores ── */}
            <div className="flex flex-col gap-2">
              {/* Deslizador 1: Pendiente (m) */}
              <div
                className={`rounded-xl border p-2.5 transition-all ${
                  isDark ? 'bg-slate-900/60 border-cyan-500/30' : 'bg-white border-cyan-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-500 flex items-center gap-1">
                    <Sliders className="h-3 w-3" />
                    <span>Pendiente (m):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSlopeM(prev => Math.max(-10, Math.round((prev - 0.5) * 10) / 10))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Disminuir pendiente"
                    >
                      -
                    </button>
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded min-w-[42px] text-center ${
                      isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                    }`}>
                      {slopeM > 0 ? `+${slopeM}` : slopeM}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlopeM(prev => Math.min(10, Math.round((prev + 0.5) * 10) / 10))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Aumentar pendiente"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Input Slider */}
                <div className="mt-2 flex items-center">
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={slopeM}
                    onChange={e => setSlopeM(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 rounded-lg bg-slate-300 dark:bg-white/20"
                  />
                </div>

                <div className={`mt-1.5 flex justify-between text-[9px] font-semibold ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}>
                  <span>-10 (Baja)</span>
                  <span>0 (Horizontal)</span>
                  <span>+10 (Sube)</span>
                </div>
              </div>

              {/* Deslizador 2: Intercepto con el eje Y (b) */}
              <div
                className={`rounded-xl border p-2.5 transition-all ${
                  isDark ? 'bg-slate-900/60 border-amber-500/30' : 'bg-white border-amber-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Sliders className="h-3 w-3" />
                    <span>Intercepto (b):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInterceptB(prev => Math.max(-15, prev - 1))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Disminuir intercepto"
                    >
                      -
                    </button>
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded min-w-[42px] text-center ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {interceptB > 0 ? `+${interceptB}` : interceptB}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInterceptB(prev => Math.min(15, prev + 1))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Aumentar intercepto"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Input Slider */}
                <div className="mt-2 flex items-center">
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={interceptB}
                    onChange={e => setInterceptB(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer h-2 rounded-lg bg-slate-300 dark:bg-white/20"
                  />
                </div>

                <div className={`mt-1.5 flex justify-between text-[9px] font-semibold ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}>
                  <span>-15 (Baja)</span>
                  <span>b=0 (Origen)</span>
                  <span>+15 (Sube)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Toggles Visuales en la parte inferior del panel izquierdo ── */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => setShowSlopeTriangle(prev => !prev)}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showSlopeTriangle
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar u ocultar el triángulo de pendiente Δx y Δy"
            >
              {showSlopeTriangle ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Triángulo Δy/Δx</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBaseLine(prev => !prev)}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showBaseLine
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Comparar con la recta proporcional base y = mx que pasa por el origen"
            >
              {showBaseLine ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Recta base y=mx</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIntegerPoints(prev => !prev)}
              className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showIntegerPoints
                  ? 'bg-purple-500 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar puntos con coordenadas enteras sobre la recta"
            >
              {showIntegerPoints ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Puntos enteros</span>
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════════
            SECCIÓN DERECHA: El Plano Cartesiano Interactivo (SVG)
        ══════════════════════════════════════════════════════════════════════ */}
        <main
          className={`flex-1 min-w-0 min-h-0 flex flex-col rounded-xl border overflow-hidden ${c.cardBg} ${c.cardBorder}`}
        >
          {/* Barra superior de herramientas del plano */}
          <div
            className={`flex h-7 shrink-0 items-center justify-between px-2 sm:px-2.5 border-b text-[11px] ${
              isDark ? 'border-white/10 bg-[#0d1424]' : 'border-slate-200 bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold flex items-center gap-1 text-cyan-400">
                <span>Plano Cartesiano</span>
              </span>
              {hoverCoord && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  Cursor: ({hoverCoord.x}; {hoverCoord.y})
                </span>
              )}
            </div>

            {/* Controles de Zoom y Centrado */}
            <div className="flex items-center gap-1">
              <span className={`text-[10px] hidden sm:inline mr-1 ${c.textMuted}`}>
                Escala X: [{minX}, {maxX}] Y: [{minY}, {maxY}]
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(2.5, Math.round((prev + 0.25) * 100) / 100))}
                className={`h-5 w-5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-200 text-slate-700'
                }`}
                title="Alejar (ver mayor rango)"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1)
                  setPanOffset({ x: 0, y: 0 })
                }}
                className={`h-5 px-1.5 rounded flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-200 text-slate-700'
                }`}
                title="Restablecer vista centrada y zoom normal"
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, Math.round((prev - 0.2) * 100) / 100))}
                className={`h-5 w-5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-200 text-slate-700'
                }`}
                title="Acercar (ver detalle)"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Contenedor responsivo del SVG - Ocupa 100% de ancho y alto disponible */}
          <div ref={containerRef} className="flex-1 min-h-0 min-w-0 relative w-full h-full overflow-hidden p-0">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className={`w-full h-full transition-colors block select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            >
              <defs>
                {/* Área de recorte para que la recta no se desborde fuera del marco */}
                <clipPath id="graphPlotArea">
                  <rect
                    x={PAD_LEFT}
                    y={PAD_TOP}
                    width={PLOT_W}
                    height={PLOT_H}
                    rx="4"
                  />
                </clipPath>

                {/* Marcadores de flecha para los ejes */}
                <marker
                  id="arrowX"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill={c.axisLine} />
                </marker>
                <marker
                  id="arrowY"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill={c.axisLine} />
                </marker>
              </defs>

              {/* Fondo del área de graficación */}
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={PLOT_W}
                height={PLOT_H}
                fill={c.svgBg}
                rx="6"
              />

              {/* ── CUADRÍCULA VERTICAL (X) - Celdas 100% cuadradas ── */}
              {(() => {
                const lines = []
                const startX = Math.floor(minX / gridStep) * gridStep
                const endX = Math.ceil(maxX / gridStep) * gridStep
                const axisYPos = toSvgY(0)
                const labelYPos = Math.max(PAD_TOP + 14, Math.min(PAD_TOP + PLOT_H - 6, axisYPos + 14))

                for (let x = startX; x <= endX; x += gridStep) {
                  const sx = toSvgX(x)
                  if (sx < PAD_LEFT - 1 || sx > PAD_LEFT + PLOT_W + 1) continue
                  const isMain = x === 0
                  lines.push(
                    <g key={`grid-x-${x}`}>
                      {!isMain && (
                        <line
                          x1={sx}
                          y1={PAD_TOP}
                          x2={sx}
                          y2={PAD_TOP + PLOT_H}
                          stroke={c.gridLine}
                          strokeWidth="1"
                          strokeDasharray={x % (gridStep * 2) === 0 ? undefined : '2,2'}
                          opacity={isDark ? 0.35 : 0.45}
                        />
                      )}
                      {/* Ticks y etiquetas del eje X */}
                      {axisYPos >= PAD_TOP && axisYPos <= PAD_TOP + PLOT_H && (
                        <line
                          x1={sx}
                          y1={axisYPos - 3}
                          x2={sx}
                          y2={axisYPos + 3}
                          stroke={c.axisLine}
                          strokeWidth="1.5"
                        />
                      )}
                      {x !== 0 && (
                        <text
                          x={sx}
                          y={labelYPos}
                          textAnchor="middle"
                          fontSize="9"
                          fill={c.axisNumColor}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {x}
                        </text>
                      )}
                    </g>
                  )
                }
                return lines
              })()}

              {/* ── CUADRÍCULA HORIZONTAL (Y) - Celdas 100% cuadradas ── */}
              {(() => {
                const lines = []
                const startY = Math.floor(minY / gridStep) * gridStep
                const endY = Math.ceil(maxY / gridStep) * gridStep
                const axisXPos = toSvgX(0)
                const labelXPos = Math.max(PAD_LEFT + 14, Math.min(PAD_LEFT + PLOT_W - 6, axisXPos - 6))

                for (let y = startY; y <= endY; y += gridStep) {
                  const sy = toSvgY(y)
                  if (sy < PAD_TOP - 1 || sy > PAD_TOP + PLOT_H + 1) continue
                  const isMain = y === 0
                  lines.push(
                    <g key={`grid-y-${y}`}>
                      {!isMain && (
                        <line
                          x1={PAD_LEFT}
                          y1={sy}
                          x2={PAD_LEFT + PLOT_W}
                          y2={sy}
                          stroke={c.gridLine}
                          strokeWidth="1"
                          strokeDasharray={y % (gridStep * 2) === 0 ? undefined : '2,2'}
                          opacity={isDark ? 0.35 : 0.45}
                        />
                      )}
                      {/* Ticks y etiquetas del eje Y */}
                      {axisXPos >= PAD_LEFT && axisXPos <= PAD_LEFT + PLOT_W && (
                        <line
                          x1={axisXPos - 3}
                          y1={sy}
                          x2={axisXPos + 3}
                          y2={sy}
                          stroke={c.axisLine}
                          strokeWidth="1.5"
                        />
                      )}
                      {y !== 0 && (
                        <text
                          x={labelXPos}
                          y={sy + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill={c.axisNumColor}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          {y}
                        </text>
                      )}
                    </g>
                  )
                }
                return lines
              })()}

              {/* ── EJES CARTESIANOS PRINCIPALES (X e Y) ── */}
              {/* Eje X (si está dentro del área visible) */}
              {toSvgY(0) >= PAD_TOP && toSvgY(0) <= PAD_TOP + PLOT_H && (
                <g>
                  <line
                    x1={PAD_LEFT}
                    y1={toSvgY(0)}
                    x2={PAD_LEFT + PLOT_W}
                    y2={toSvgY(0)}
                    stroke={c.axisLine}
                    strokeWidth="2"
                    markerEnd="url(#arrowX)"
                  />
                  <text
                    x={PAD_LEFT + PLOT_W + 12}
                    y={toSvgY(0) + 4}
                    fontSize="12"
                    fontWeight="black"
                    fill={c.axisLine}
                    textAnchor="middle"
                    fontFamily="Nunito, sans-serif"
                  >
                    X
                  </text>
                </g>
              )}

              {/* Eje Y (si está dentro del área visible) */}
              {toSvgX(0) >= PAD_LEFT && toSvgX(0) <= PAD_LEFT + PLOT_W && (
                <g>
                  <line
                    x1={toSvgX(0)}
                    y1={PAD_TOP + PLOT_H}
                    x2={toSvgX(0)}
                    y2={PAD_TOP}
                    stroke={c.axisLine}
                    strokeWidth="2"
                    markerEnd="url(#arrowY)"
                  />
                  <text
                    x={toSvgX(0)}
                    y={PAD_TOP - 8}
                    fontSize="12"
                    fontWeight="black"
                    fill={c.axisLine}
                    textAnchor="middle"
                    fontFamily="Nunito, sans-serif"
                  >
                    Y
                  </text>
                </g>
              )}

              {/* Origen (0,0) */}
              {toSvgX(0) >= PAD_LEFT &&
                toSvgX(0) <= PAD_LEFT + PLOT_W &&
                toSvgY(0) >= PAD_TOP &&
                toSvgY(0) <= PAD_TOP + PLOT_H && (
                  <text
                    x={toSvgX(0) - 8}
                    y={toSvgY(0) + 12}
                    fontSize="9"
                    fill={c.axisLine}
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    0
                  </text>
                )}

              {/* ── RECTA BASE DE COMPARACIÓN: y = mx (pasa por el origen) ── */}
              {showBaseLine && interceptB !== 0 && (
                <g clipPath="url(#graphPlotArea)" opacity="0.65">
                  <line
                    x1={toSvgX(minX - 3)}
                    y1={toSvgY(slopeM * (minX - 3))}
                    x2={toSvgX(maxX + 3)}
                    y2={toSvgY(slopeM * (maxX + 3))}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                  />
                  <text
                    x={toSvgX(Math.max(minX + 1, Math.min(maxX - 2, 2)))}
                    y={toSvgY(slopeM * Math.max(minX + 1, Math.min(maxX - 2, 2))) - 6}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    y = {slopeM === 1 ? '' : slopeM === -1 ? '-' : slopeM}x (Base lineal en origen)
                  </text>
                </g>
              )}

              {/* ── TRIÁNGULO DE PENDIENTE (Δx = 1, Δy = m) ── */}
              {showSlopeTriangle && slopeM !== 0 && (
                <g clipPath="url(#graphPlotArea)">
                  {(() => {
                    // Seleccionar un valor entero x cómodo dentro del rango visible
                    let triX = 0
                    if (slopeM > 0) {
                      triX = Math.max(minX + 1, Math.min(maxX - 2, 0))
                    } else {
                      triX = Math.max(minX + 1, Math.min(maxX - 2, -1))
                    }

                    const triY = slopeM * triX + interceptB
                    const nextX = triX + 1
                    const nextY = slopeM * nextX + interceptB

                    const x1 = toSvgX(triX)
                    const y1 = toSvgY(triY)
                    const x2 = toSvgX(nextX)
                    const y2 = toSvgY(nextY)

                    return (
                      <g>
                        {/* Relleno translúcido del triángulo rectángulo */}
                        <polygon
                          points={`${x1},${y1} ${x2},${y1} ${x2},${y2}`}
                          fill={slopeM > 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(244, 63, 94, 0.18)'}
                          stroke="none"
                        />
                        {/* Base horizontal Δx = 1 */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y1}
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <text
                          x={(x1 + x2) / 2}
                          y={y1 + (slopeM >= 0 ? 12 : -6)}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#38bdf8"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Δx = 1
                        </text>

                        {/* Altura vertical Δy = m */}
                        <line
                          x1={x2}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#c084fc"
                          strokeWidth="2"
                        />
                        <text
                          x={x2 + 7}
                          y={(y1 + y2) / 2 + 3}
                          textAnchor="start"
                          fontSize="9"
                          fill="#c084fc"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          Δy = {slopeM > 0 ? `+${slopeM}` : slopeM}
                        </text>
                      </g>
                    )
                  })()}
                </g>
              )}

              {/* ── TRAZADO DE LA RECTA DINÁMICA y = mx + b ── */}
              <g clipPath="url(#graphPlotArea)">
                {/* Glow / Resplandor de fondo */}
                <line
                  x1={toSvgX(minX - 6)}
                  y1={toSvgY(slopeM * (minX - 6) + interceptB)}
                  x2={toSvgX(maxX + 6)}
                  y2={toSvgY(slopeM * (maxX + 6) + interceptB)}
                  stroke="#a855f7"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.3"
                />

                {/* Línea nítida principal */}
                <line
                  x1={toSvgX(minX - 6)}
                  y1={toSvgY(slopeM * (minX - 6) + interceptB)}
                  x2={toSvgX(maxX + 6)}
                  y2={toSvgY(slopeM * (maxX + 6) + interceptB)}
                  stroke="#c084fc"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Etiqueta flotante sobre la recta */}
                {(() => {
                  let labelX = slopeM === 0 ? Math.round((minX + maxX) / 2) : 1
                  let labelY = slopeM * labelX + interceptB
                  if (labelY < minY + 2 || labelY > maxY - 2) {
                    labelX = slopeM < 0 ? Math.round(minX / 2) : Math.round(maxX / 2)
                    labelY = slopeM * labelX + interceptB
                  }
                  const clampedX = Math.max(minX + 1, Math.min(maxX - 1, labelX))
                  const clampedY = slopeM * clampedX + interceptB

                  return (
                    <text
                      x={toSvgX(clampedX)}
                      y={toSvgY(clampedY) - 10}
                      fill="#e9d5ff"
                      fontSize="11"
                      fontWeight="black"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {slopeM === 0
                        ? `y = ${interceptB}`
                        : `y = ${slopeM === 1 ? '' : slopeM === -1 ? '-' : slopeM}x ${
                            interceptB > 0 ? `+ ${interceptB}` : interceptB < 0 ? `- ${Math.abs(interceptB)}` : ''
                          }`}
                    </text>
                  )
                })()}

                {/* ── PUNTOS ENTEROS DE MUESTRA ── */}
                {showIntegerPoints &&
                  sampleIntegerPoints.map(pt => {
                    const isYIntercept = pt.x === 0
                    if (isYIntercept) return null // Se dibuja con estilo especial abajo
                    return (
                      <g key={`pt-${pt.x}-${pt.y}`}>
                        <circle
                          cx={toSvgX(pt.x)}
                          cy={toSvgY(pt.y)}
                          r="3.5"
                          fill="#38bdf8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </g>
                    )
                  })}

                {/* ── PUNTO INTERCEPTO CON EL EJE Y (0, b) ── */}
                {interceptB >= minY && interceptB <= maxY && (
                  <g>
                    {/* Anillo de resplandor */}
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(interceptB)}
                      r="9"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      opacity="0.6"
                    />
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(interceptB)}
                      r="5.5"
                      fill="#fbbf24"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={toSvgX(0) + 12}
                      y={toSvgY(interceptB) + 4}
                      fill="#f59e0b"
                      fontSize="10"
                      fontWeight="black"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      (0; {interceptB})
                    </text>
                  </g>
                )}
              </g>

              {/* Borde del marco del plano */}
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={PLOT_W}
                height={PLOT_H}
                fill="none"
                stroke={c.cardBorder}
                strokeWidth="1"
                rx="6"
              />
            </svg>
          </div>
        </main>
      </div>

      {/* ── MODAL DE AYUDA PEDAGÓGICA (ModalHelp) ────────────────────────── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Guía: Gráfica de la Función Lineal y Afín (y = mx + b)"
        bgColor={isDark ? '#0a1020' : '#ffffff'}
        titleColor={isDark ? '#ffffff' : '#0f172a'}
        maxWidth="max-w-md"
        buttonColor="bg-purple-500 hover:bg-purple-400 text-white font-bold"
      >
        <div className={`space-y-4 text-xs sm:text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}>
              1. La Pendiente (m): Inclinación y Razón de Cambio
            </h4>
            <p>
              La pendiente <strong>m</strong> indica cuánto sube o baja la recta por cada unidad que avanzas hacia la derecha en el eje X:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
              <li><strong>m &gt; 0 (positiva)</strong>: La recta es creciente ↗.</li>
              <li><strong>m &lt; 0 (negativa)</strong>: La recta es decreciente ↘.</li>
              <li><strong>m = 0 (cero)</strong>: La recta es completamente horizontal → (función constante).</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}>
              2. El Intercepto (b): Desplazamiento Vertical
            </h4>
            <p>
              El término <strong>b</strong> es la ordenada al origen:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
              <li>La recta cruza al eje vertical Y exactamente en el punto <strong>(0; b)</strong>.</li>
              <li>Si <strong>b = 0</strong>, la recta pasa por el origen <strong>(0; 0)</strong> y es una <em>Función Lineal pura</em>.</li>
              <li>Si <strong>b ≠ 0</strong>, la recta está trasladada verticalmente hacia arriba o abajo (<em>Función Afín</em>).</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}>
              3. Cómo explorar en este laboratorio
            </h4>
            <p>
              Mueve los deslizadores de <strong>Pendiente (m)</strong> e <strong>Intercepto (b)</strong> en el panel izquierdo. Observa en tiempo real cómo la recta gira y se traslada en el plano cartesiano.
            </p>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
