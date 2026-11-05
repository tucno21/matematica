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

export default function GraficaCuadraticaView() {
  const navigate = useNavigate()
  const isDark = useThemeStore(s => s.theme === 'dark')

  // Estado inicial estándar: y = x² - 2x - 3 (a = 1, b = -2, c = -3)
  const [coefA, setCoefA] = useState<number>(1)
  const [coefB, setCoefB] = useState<number>(-2)
  const [coefC, setCoefC] = useState<number>(-3)

  // Opciones visuales y pedagógicas (desactivadas por defecto)
  const [showVertex, setShowVertex] = useState<boolean>(false)
  const [showAxisOfSymmetry, setShowAxisOfSymmetry] = useState<boolean>(false)
  const [showRoots, setShowRoots] = useState<boolean>(false)
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

  // ResizeObserver para ocupar el 100% real del contenedor
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

  // Geometría reactiva del SVG
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

  // Origen (0, 0) centrado con offset vertical hacia arriba para mostrar cómodamente el vértice inicial V(1, -4)
  const initialCenterOffsetY = -1.5 * unitPx
  const originSvgX = PAD_LEFT + PLOT_W / 2 + panOffset.x
  const originSvgY = PAD_TOP + PLOT_H / 2 + panOffset.y + initialCenterOffsetY

  // Límites matemáticos visibles exactamente en pantalla (100% independientes de a, b y c)
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

  // Vértice de la parábola: V(h, k)
  const vertex = useMemo(() => {
    if (coefA === 0) return null
    const h = Math.round((-coefB / (2 * coefA)) * 100) / 100
    const k = Math.round((coefA * h * h + coefB * h + coefC) * 100) / 100
    return { h, k }
  }, [coefA, coefB, coefC])

  // Discriminante: Δ = b² - 4ac
  const discriminant = useMemo(() => {
    return Math.round((coefB * coefB - 4 * coefA * coefC) * 100) / 100
  }, [coefA, coefB, coefC])

  // Raíces reales (si existen)
  const roots = useMemo(() => {
    if (coefA === 0) {
      if (coefB === 0) return []
      return [Math.round((-coefC / coefB) * 100) / 100]
    }
    if (discriminant < 0) return []
    if (discriminant === 0) {
      return [Math.round((-coefB / (2 * coefA)) * 100) / 100]
    }
    const sqrtDisc = Math.sqrt(discriminant)
    const r1 = Math.round(((-coefB - sqrtDisc) / (2 * coefA)) * 100) / 100
    const r2 = Math.round(((-coefB + sqrtDisc) / (2 * coefA)) * 100) / 100
    return [Math.min(r1, r2), Math.max(r1, r2)]
  }, [coefA, coefB, coefC, discriminant])

  // Puntos enteros notables sobre la parábola
  const sampleIntegerPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let x = minX; x <= maxX; x++) {
      const y = coefA * x * x + coefB * x + coefC
      if (y >= minY && y <= maxY) {
        pts.push({ x, y })
      }
    }
    return pts
  }, [minX, maxX, minY, maxY, coefA, coefB, coefC])

  // Trayectoria continua de la parábola generada por muestreo denso
  const parabolaPathData = useMemo(() => {
    const samples = 140
    const step = (maxX - minX + 2) / samples
    let path = ''

    for (let i = 0; i <= samples; i++) {
      const x = minX - 1 + i * step
      const y = coefA * x * x + coefB * x + coefC
      const sx = toSvgX(x)
      const sy = toSvgY(y)

      if (i === 0) {
        path += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`
      } else {
        path += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`
      }
    }
    return path
  }, [minX, maxX, coefA, coefB, coefC, toSvgX, toSvgY])

  // Restablecer a la función inicial y centrar plano
  const handleReset = () => {
    setCoefA(1)
    setCoefB(-2)
    setCoefC(-3)
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setShowVertex(false)
    setShowAxisOfSymmetry(false)
    setShowRoots(false)
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
    axisLine: isDark ? '#38bdf8' : '#0284c7',
    axisNumColor: isDark ? '#f8fafc' : '#0f172a',
    svgBg: isDark ? '#090e1f' : '#ffffff'
  }

  // Formato matemático impecable para y = ax² + bx + c
  const formattedEquation = useMemo(() => {
    if (coefA === 0 && coefB === 0) {
      return {
        prefix: 'y =',
        aPart: '',
        bPart: '',
        cPart: `${coefC}`,
        label: 'Función Constante'
      }
    }
    if (coefA === 0) {
      const bStr = coefB === 1 ? 'x' : coefB === -1 ? '-x' : `${coefB}x`
      const cStr = coefC === 0 ? '' : coefC > 0 ? `+ ${coefC}` : `- ${Math.abs(coefC)}`
      return {
        prefix: 'y =',
        aPart: '',
        bPart: bStr,
        cPart: cStr,
        label: 'Función Lineal (a = 0)'
      }
    }

    const aStr = coefA === 1 ? 'x²' : coefA === -1 ? '-x²' : `${coefA}x²`
    const bStr =
      coefB === 0
        ? ''
        : coefB === 1
        ? '+ x'
        : coefB === -1
        ? '- x'
        : coefB > 0
        ? `+ ${coefB}x`
        : `- ${Math.abs(coefB)}x`
    const cStr = coefC === 0 ? '' : coefC > 0 ? `+ ${coefC}` : `- ${Math.abs(coefC)}`

    const concavityLabel =
      coefA > 0 ? 'Cóncava hacia arriba ∪' : 'Cóncava hacia abajo ∩'

    return {
      prefix: 'y =',
      aPart: aStr,
      bPart: bStr,
      cPart: cStr,
      label: `Función Cuadrática (${concavityLabel})`
    }
  }, [coefA, coefB, coefC])

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
            <TrendingUp className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Gráfica Cuadrática:</span>
            <span className="font-mono text-purple-400 font-extrabold hidden xs:inline">
              y = ax² + bx + c
            </span>
          </h1>
        </div>

        {/* Badge pedagógico central en pantallas grandes */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Parábola y = ax² + bx + c</span>
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
            title="Restablecer a y = x² - 2x - 3"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Restablecer</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer"
            title="Guía Pedagógica"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── 2. Área de Trabajo Principal (flex-1 min-h-0) ───────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch overflow-hidden p-1 sm:p-1.5 lg:p-2 gap-1.5 lg:gap-2">
        {/* ══════════════════════════════════════════════════════════════════════
            SECCIÓN IZQUIERDA: La Función y los tres Deslizadores (a, b, c)
        ══════════════════════════════════════════════════════════════════════ */}
        <aside
          className={`w-full md:w-[260px] lg:w-[280px] xl:w-[300px] shrink-0 flex flex-col justify-between rounded-xl border p-2 overflow-y-auto max-h-[38vh] md:max-h-none ${c.cardBg} ${c.cardBorder}`}
        >
          <div className="flex flex-col gap-2">
            {/* ── 1. Tarjeta Superior: La Función ── */}
            <div
              className={`rounded-xl border p-2 text-center transition-all ${
                isDark ? 'bg-purple-950/30 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  isDark ? 'text-purple-300' : 'text-purple-800'
                }`}>
                  Ecuación Cuadrática
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded font-semibold ${
                  coefA > 0
                    ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                    : coefA < 0
                    ? isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-800'
                    : isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  {coefA > 0 ? 'Abierta arriba ∪' : coefA < 0 ? 'Abierta abajo ∩' : 'Lineal'}
                </span>
              </div>

              {/* Modelo canónico y = ax² + bx + c */}
              <div className={`mt-0.5 font-mono text-xs font-bold ${
                isDark ? 'text-purple-200/80' : 'text-purple-900/80'
              }`}>
                y = <span className="text-purple-400">a</span>x² +{' '}
                <span className="text-cyan-400">b</span>x +{' '}
                <span className="text-amber-400">c</span>
              </div>

              {/* Ecuación dinámica evaluada con valores vivos */}
              <div className="mt-0.5 pt-0.5 border-t border-purple-500/20 font-mono text-lg sm:text-xl font-black tracking-wide">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  {formattedEquation.prefix}{' '}
                  {formattedEquation.aPart && (
                    <span className="text-purple-400">{formattedEquation.aPart}</span>
                  )}{' '}
                  {formattedEquation.bPart && (
                    <span className="text-cyan-400">{formattedEquation.bPart}</span>
                  )}{' '}
                  {formattedEquation.cPart && (
                    <span className="text-amber-400">{formattedEquation.cPart}</span>
                  )}
                </span>
              </div>

              {/* Vértice y discriminante en pastilla compacta */}
              {vertex && (
                <div className={`mt-1 flex items-center justify-around text-[10px] font-mono font-bold pt-1 border-t border-purple-500/20 ${
                  isDark ? 'text-white/80' : 'text-slate-700'
                }`}>
                  <span title="Coordenadas del vértice">
                    Vértice: <span className="text-amber-400">({vertex.h}; {vertex.k})</span>
                  </span>
                  <span title="Discriminante">
                    Δ = <span className={discriminant >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{discriminant}</span>
                  </span>
                </div>
              )}
            </div>

            {/* ── 2. Los Tres Deslizadores (a, b, c) ── */}
            <div className="flex flex-col gap-1.5">
              {/* Deslizador 1: Coeficiente cuadrático (a) */}
              <div
                className={`rounded-xl border p-2 transition-all ${
                  isDark ? 'bg-slate-900/60 border-purple-500/30' : 'bg-white border-purple-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-400 flex items-center gap-1">
                    <Sliders className="h-3 w-3" />
                    <span>Apertura (a):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCoefA(prev => Math.max(-4, Math.round((prev - 0.25) * 100) / 100))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Disminuir coeficiente a"
                    >
                      -
                    </button>
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded min-w-[42px] text-center ${
                      isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}>
                      {coefA > 0 ? `+${coefA}` : coefA}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoefA(prev => Math.min(4, Math.round((prev + 0.25) * 100) / 100))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Aumentar coeficiente a"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex items-center">
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.25"
                    value={coefA}
                    onChange={e => setCoefA(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 rounded-lg bg-slate-300 dark:bg-white/20"
                  />
                </div>

                <div className={`mt-0.5 flex justify-between text-[9px] font-semibold ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}>
                  <span>-4 (Abajo ∩)</span>
                  <span>0</span>
                  <span>+4 (Arriba ∪)</span>
                </div>
              </div>

              {/* Deslizador 2: Coeficiente lineal (b) */}
              <div
                className={`rounded-xl border p-2 transition-all ${
                  isDark ? 'bg-slate-900/60 border-cyan-500/30' : 'bg-white border-cyan-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <Sliders className="h-3 w-3" />
                    <span>Desplazamiento (b):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCoefB(prev => Math.max(-8, Math.round((prev - 0.5) * 10) / 10))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Disminuir coeficiente b"
                    >
                      -
                    </button>
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded min-w-[42px] text-center ${
                      isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                    }`}>
                      {coefB > 0 ? `+${coefB}` : coefB}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoefB(prev => Math.min(8, Math.round((prev + 0.5) * 10) / 10))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Aumentar coeficiente b"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex items-center">
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.5"
                    value={coefB}
                    onChange={e => setCoefB(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 rounded-lg bg-slate-300 dark:bg-white/20"
                  />
                </div>

                <div className={`mt-0.5 flex justify-between text-[9px] font-semibold ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}>
                  <span>-8 (Derecha)</span>
                  <span>b=0 (Simétrica)</span>
                  <span>+8 (Izquierda)</span>
                </div>
              </div>

              {/* Deslizador 3: Término independiente (c) */}
              <div
                className={`rounded-xl border p-2 transition-all ${
                  isDark ? 'bg-slate-900/60 border-amber-500/30' : 'bg-white border-amber-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Sliders className="h-3 w-3" />
                    <span>Intercepto (c):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCoefC(prev => Math.max(-12, prev - 1))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Disminuir intercepto c"
                    >
                      -
                    </button>
                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded min-w-[42px] text-center ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {coefC > 0 ? `+${coefC}` : coefC}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoefC(prev => Math.min(12, prev + 1))}
                      className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs cursor-pointer ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                      title="Aumentar intercepto c"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex items-center">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={coefC}
                    onChange={e => setCoefC(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 rounded-lg bg-slate-300 dark:bg-white/20"
                  />
                </div>

                <div className={`mt-0.5 flex justify-between text-[9px] font-semibold ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}>
                  <span>-12 (Baja)</span>
                  <span>c=0 (Origen)</span>
                  <span>+12 (Sube)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Toggles Visuales en la parte inferior ── */}
          <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setShowVertex(prev => !prev)}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showVertex
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar u ocultar el punto del vértice"
            >
              {showVertex ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Vértice V</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAxisOfSymmetry(prev => !prev)}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showAxisOfSymmetry
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar eje de simetría x = h"
            >
              {showAxisOfSymmetry ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Eje Simetría</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRoots(prev => !prev)}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showRoots
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar raíces reales en el eje X"
            >
              {showRoots ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Raíces</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIntegerPoints(prev => !prev)}
              className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                showIntegerPoints
                  ? 'bg-purple-500 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-white/5 text-white/60 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mostrar puntos enteros"
            >
              {showIntegerPoints ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Puntos</span>
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
              <span className="font-bold flex items-center gap-1 text-purple-400">
                <span>Plano Cartesiano</span>
              </span>
              {vertex && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/25">
                  V({vertex.h}; {vertex.k})
                </span>
              )}
              {hoverCoord && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
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
                {/* Área de recorte para que la parábola no se desborde fuera del marco */}
                <clipPath id="parabolaPlotArea">
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
                  id="arrowXQuad"
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
                  id="arrowYQuad"
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
                    markerEnd="url(#arrowXQuad)"
                  />
                  <text
                    x={PAD_LEFT + PLOT_W + 10}
                    y={toSvgY(0) + 4}
                    fontSize="11"
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
                    markerEnd="url(#arrowYQuad)"
                  />
                  <text
                    x={toSvgX(0)}
                    y={PAD_TOP - 6}
                    fontSize="11"
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

              {/* ── EJE DE SIMETRÍA: x = h ── */}
              {showAxisOfSymmetry && vertex && (
                <g clipPath="url(#parabolaPlotArea)" opacity="0.65">
                  <line
                    x1={toSvgX(vertex.h)}
                    y1={PAD_TOP}
                    x2={toSvgX(vertex.h)}
                    y2={PAD_TOP + PLOT_H}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="5,4"
                  />
                  <text
                    x={toSvgX(vertex.h) + 4}
                    y={PAD_TOP + 14}
                    fill="#38bdf8"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    x = {vertex.h}
                  </text>
                </g>
              )}

              {/* ── TRAZADO CONTINUO DE LA PARÁBOLA ── */}
              <g clipPath="url(#parabolaPlotArea)">
                {/* Resplandor de fondo */}
                <path
                  d={parabolaPathData}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.3"
                />

                {/* Línea nítida principal */}
                <path
                  d={parabolaPathData}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Puntos enteros de muestra */}
                {showIntegerPoints &&
                  sampleIntegerPoints.map(pt => {
                    return (
                      <circle
                        key={`pt-${pt.x}-${pt.y}`}
                        cx={toSvgX(pt.x)}
                        cy={toSvgY(pt.y)}
                        r="3.5"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )
                  })}

                {/* Intercepto con el eje Y: (0, c) */}
                {coefC >= minY && coefC <= maxY && (
                  <g>
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(coefC)}
                      r="7.5"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      opacity="0.6"
                    />
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(coefC)}
                      r="4.5"
                      fill="#fbbf24"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* Raíces reales sobre el eje X */}
                {showRoots &&
                  roots.map((rVal, idx) => {
                    if (rVal < minX || rVal > maxX) return null
                    return (
                      <g key={`root-${idx}`}>
                        <circle
                          cx={toSvgX(rVal)}
                          cy={toSvgY(0)}
                          r="5"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x={toSvgX(rVal)}
                          y={toSvgY(0) - 7}
                          fill="#10b981"
                          fontSize="9"
                          fontWeight="black"
                          fontFamily="JetBrains Mono, monospace"
                          textAnchor="middle"
                        >
                          ({rVal}; 0)
                        </text>
                      </g>
                    )
                  })}

                {/* Vértice destacado: V(h, k) */}
                {showVertex && vertex && vertex.h >= minX && vertex.h <= maxX && vertex.k >= minY && vertex.k <= maxY && (
                  <g>
                    <circle
                      cx={toSvgX(vertex.h)}
                      cy={toSvgY(vertex.k)}
                      r="9"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                    <circle
                      cx={toSvgX(vertex.h)}
                      cy={toSvgY(vertex.k)}
                      r="5.5"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={toSvgX(vertex.h)}
                      y={toSvgY(vertex.k) + (coefA > 0 ? 16 : -10)}
                      fill="#fbbf24"
                      fontSize="10"
                      fontWeight="black"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      V({vertex.h}; {vertex.k})
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
        title="Guía: Función Cuadrática y Parábola (y = ax² + bx + c)"
        bgColor={isDark ? '#0a1020' : '#ffffff'}
        titleColor={isDark ? '#ffffff' : '#0f172a'}
        maxWidth="max-w-md"
        buttonColor="bg-purple-500 hover:bg-purple-400 text-white font-bold"
      >
        <div className={`space-y-4 text-xs sm:text-sm ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}>
              1. Coeficiente Cuadrático (a): Concavidad y Apertura
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
              <li><strong>a &gt; 0</strong>: La parábola es cóncava hacia arriba (forma de ∪), su vértice es un punto mínimo.</li>
              <li><strong>a &lt; 0</strong>: La parábola es cóncava hacia abajo (forma de ∩), su vértice es un punto máximo.</li>
              <li>Cuanto mayor es |a|, más cerrada y estrecha es la curva.</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-cyan-300' : 'text-cyan-700'
            }`}>
              2. Coeficiente Lineal (b) y Vértice V(h; k)
            </h4>
            <p>
              El vértice se ubica en <strong>h = -b / (2a)</strong> y <strong>k = f(h)</strong>.
              El eje de simetría es la recta vertical <strong>x = h</strong>.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className={`font-bold text-sm flex items-center gap-1 ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}>
              3. Término Independiente (c) y Discriminante (Δ)
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-xs pl-2">
              <li><strong>c</strong> es el punto de cruce con el eje vertical: <strong>(0; c)</strong>.</li>
              <li><strong>Δ = b² - 4ac</strong>: si Δ &gt; 0 hay 2 raíces reales (cruza dos veces al eje X), si Δ = 0 toca al eje X en un solo punto, y si Δ &lt; 0 no cruza el eje X.</li>
            </ul>
          </section>
        </div>
      </ModalHelp>
    </div>
  )
}
