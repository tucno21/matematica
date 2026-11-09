import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '../store/useThemeStore'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Jarra {
    capacidad: number
    actual: number
    nombre: string
}

interface RegistroPaso {
    paso: number
    accion: string
    jarraA: number
    jarraB: number
    jarraC: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const JARRAS_INICIALES: Jarra[] = [
    { capacidad: 8, actual: 8, nombre: 'A' },
    { capacidad: 5, actual: 0, nombre: 'B' },
    { capacidad: 3, actual: 0, nombre: 'C' }
]

const SOLUCION = [
    { paso: 1, accion: 'Vacía A → B (llena B completa)', estado: [3, 5, 0] },
    { paso: 2, accion: 'Vacía B → C (llena C completa)', estado: [3, 2, 3] },
    { paso: 3, accion: 'Vacía C → A', estado: [6, 2, 0] },
    { paso: 4, accion: 'Vacía B → C', estado: [6, 0, 2] },
    { paso: 5, accion: 'Vacía A → B (llena B completa)', estado: [1, 5, 2] },
    { paso: 6, accion: 'Vacía B → C (llena C completa)', estado: [1, 4, 3] },
    { paso: 7, accion: 'Vacía C → A', estado: [4, 4, 0] }
]

// ─── Jug SVG Configuration ───────────────────────────────────────────────────
const JUG_CONFIG: Record<number, {
    w: number; h: number;
    bx: number; by: number; bw: number; bh: number; br: number;
    handle: string; rimW: number;
    capY: number;
}> = {
    8: {
        w: 130, h: 224,
        bx: 28, by: 22, bw: 92, bh: 162, br: 8,
        handle: 'M28 54 C6 54 2 78 2 100 C2 122 6 150 28 150',
        rimW: 98, capY: 212
    },
    5: {
        w: 110, h: 194,
        bx: 25, by: 19, bw: 76, bh: 132, br: 7,
        handle: 'M25 44 C6 44 2 64 2 83 C2 102 6 126 25 126',
        rimW: 82, capY: 184
    },
    3: {
        w: 92, h: 166,
        bx: 23, by: 16, bw: 62, bh: 108, br: 6,
        handle: 'M23 36 C5 36 1 52 1 68 C1 84 5 104 23 104',
        rimW: 68, capY: 156
    }
}

// ─── SVG Jug Component ───────────────────────────────────────────────────────
function JarraSVG({
    capacidad,
    actual,
    nombre,
    dragging,
    dropTarget,
    isValidTarget,
    isSelected,
    isWinner,
    idx,
    isDark,
    onClick,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onTouchStart,
    onTouchMove,
    onTouchEnd
}: {
    capacidad: number
    actual: number
    nombre: string
    dragging: boolean
    dropTarget: boolean
    isValidTarget: boolean
    isSelected: boolean
    isWinner: boolean
    idx: number
    isDark: boolean
    onClick: () => void
    onDragStart: () => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onTouchStart: () => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
}) {
    const c = JUG_CONFIG[capacidad]
    if (!c) return null

    const ratio = actual / capacidad
    const waterH = c.bh * ratio
    const waterY = c.by + c.bh - waterH
    const rimX = c.bx + (c.bw - c.rimW) / 2
    const rimY = c.by - 5

    const strokeColor = isWinner ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#3b82f6' : '#0284c7')
    const markStroke = isWinner ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#3b82f6' : '#0284c7')
    const markText = isWinner ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#60a5fa' : '#0369a1')
    const labelColor = isWinner ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#60a5fa' : '#0369a1')

    // Wave path calculation
    const waveAmp = actual > 0 ? 3 : 0
    const waveY = waterY
    const wx1 = c.bx
    const wx2 = c.bx + c.bw * 0.25
    const wx3 = c.bx + c.bw * 0.5
    const wx4 = c.bx + c.bw * 0.75
    const wx5 = c.bx + c.bw

    const waveD1 = `M${wx1} ${waveY} C${wx2} ${waveY - waveAmp} ${wx3 - c.bw * 0.1} ${waveY + waveAmp} ${wx3} ${waveY} C${wx3 + c.bw * 0.1} ${waveY - waveAmp} ${wx4} ${waveY + waveAmp} ${wx5} ${waveY}`
    const waveD2 = `M${wx1} ${waveY} C${wx2} ${waveY + waveAmp} ${wx3 - c.bw * 0.1} ${waveY - waveAmp} ${wx3} ${waveY} C${wx3 + c.bw * 0.1} ${waveY + waveAmp} ${wx4} ${waveY - waveAmp} ${wx5} ${waveY}`

    const fillPercent = Math.round(ratio * 100)

    return (
        <div
            className={`jug-wrapper ${dragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${dropTarget ? 'is-drop-target' : ''} ${isValidTarget && !dropTarget && !dragging && !isSelected ? 'is-valid-target' : ''} ${isWinner ? 'is-winner' : ''}`}
            data-idx={idx}
            onClick={onClick}
            draggable
            onDragStart={() => onDragStart()}
            onDragOver={(e) => onDragOver(e)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e)}
            onTouchStart={() => onTouchStart()}
            onTouchMove={(e) => onTouchMove(e)}
            onTouchEnd={(e) => onTouchEnd(e)}
            style={{ touchAction: 'none' }}
        >
            {/* Drag / Select labels */}
            {dragging && <div className="jug-badge badge-origin">ORIGEN</div>}
            {isSelected && !dragging && <div className="jug-badge badge-origin">SELECCIONADA</div>}
            {dropTarget && <div className="jug-badge badge-destiny">DESTINO</div>}
            {isValidTarget && !dropTarget && !dragging && !isSelected && (
                <div className="jug-badge badge-hint">TOCA O SUELTA</div>
            )}

            {/* Jug name */}
            <div className="jug-name">JARRA {nombre}</div>

            {/* SVG Container */}
            <div className="jug-svg-container">
                <svg
                    width={c.w}
                    height={c.h}
                    viewBox={`0 0 ${c.w} ${c.h}`}
                    className="jug-svg"
                >
                    <defs>
                        {/* Clip for water inside jug body */}
                        <clipPath id={`clip-${capacidad}-${idx}`}>
                            <rect
                                x={c.bx + 1} y={c.by + 1}
                                width={c.bw - 2} height={c.bh - 2}
                                rx={c.br - 1}
                            />
                        </clipPath>

                        {/* Water gradient */}
                        <linearGradient id={`wg-${capacidad}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isDark ? "#67e8f9" : "#38bdf8"} />
                            <stop offset="40%" stopColor={isDark ? "#22d3ee" : "#0284c7"} />
                            <stop offset="100%" stopColor={isDark ? "#0e7490" : "#0369a1"} />
                        </linearGradient>

                        {/* Water shimmer */}
                        <linearGradient id={`ws-${capacidad}-${idx}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="50%" stopColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.35)"} />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>

                        {/* Body gradient */}
                        <linearGradient id={`bg-${capacidad}-${idx}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={isDark ? "rgba(30,58,95,0.6)" : "rgba(224,242,254,0.75)"} />
                            <stop offset="50%" stopColor={isDark ? "rgba(20,40,70,0.3)" : "rgba(240,249,255,0.4)"} />
                            <stop offset="100%" stopColor={isDark ? "rgba(30,58,95,0.6)" : "rgba(224,242,254,0.75)"} />
                        </linearGradient>

                        {/* Winner glow */}
                        <filter id={`glow-${idx}`}>
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Water body */}
                    {actual > 0 && (
                        <g clipPath={`url(#clip-${capacidad}-${idx})`}>
                            <rect
                                x={c.bx}
                                y={waterY}
                                width={c.bw}
                                height={waterH}
                                fill={`url(#wg-${capacidad}-${idx})`}
                                opacity="0.85"
                                className="water-body"
                            />
                            {/* Shimmer effect */}
                            <rect
                                x={c.bx}
                                y={waterY}
                                width={c.bw}
                                height={waterH}
                                fill={`url(#ws-${capacidad}-${idx})`}
                                opacity="0.6"
                                className="water-shimmer"
                            />
                            {/* Wave surface */}
                            {waterH > 6 && (
                                <path
                                    d={waveD1}
                                    fill="none"
                                    stroke={isDark ? "rgba(103, 232, 249, 0.5)" : "rgba(255, 255, 255, 0.9)"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <animate
                                        attributeName="d"
                                        values={`${waveD1};${waveD2};${waveD1}`}
                                        dur="2.8s"
                                        repeatCount="indefinite"
                                    />
                                </path>
                            )}
                        </g>
                    )}

                    {/* Jug body outline */}
                    <rect
                        x={c.bx} y={c.by}
                        width={c.bw} height={c.bh}
                        rx={c.br}
                        fill={`url(#bg-${capacidad}-${idx})`}
                        stroke={strokeColor}
                        strokeWidth={isWinner ? 2.5 : 2}
                        className="jug-body-outline"
                        filter={isWinner ? `url(#glow-${idx})` : undefined}
                    />

                    {/* Rim */}
                    <rect
                        x={rimX} y={rimY}
                        width={c.rimW} height={7}
                        rx={3.5}
                        fill={strokeColor}
                        opacity={isDark ? 0.9 : 1}
                    />

                    {/* Handle (Left side) */}
                    <path
                        d={c.handle}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                    />

                    {/* Capacity marks (Right side) - All measurement levels */}
                    {[...Array(capacidad)].map((_, idxFrom0) => {
                        const v = idxFrom0 + 1 // 1, 2, ..., capacidad
                        const markY = c.by + c.bh - (c.bh / capacidad) * v
                        const isMajor = v === capacidad || v === 4 || v === Math.round(capacidad / 2)
                        const tickLen = isMajor ? 13 : 8
                        const xRight = c.bx + c.bw
                        return (
                            <g key={v}>
                                <line
                                    x1={xRight - 1}
                                    y1={markY}
                                    x2={xRight - tickLen}
                                    y2={markY}
                                    stroke={markStroke}
                                    strokeWidth={isMajor ? 1.5 : 0.9}
                                    opacity={isDark ? (isMajor ? 0.9 : 0.6) : (isMajor ? 1 : 0.85)}
                                />
                                <text
                                    x={xRight - tickLen - 3}
                                    y={markY + 3.5}
                                    textAnchor="end"
                                    fill={v === 4 && (isWinner || actual === 4) ? (isDark ? '#fbbf24' : '#b45309') : markText}
                                    fontSize={isMajor ? "9.5" : "8.5"}
                                    fontWeight={isMajor ? "800" : "700"}
                                    fontFamily="Inter, sans-serif"
                                    opacity={isDark ? (isMajor ? 0.95 : 0.8) : 1}
                                >
                                    {v}
                                </text>
                            </g>
                        )
                    })}

                    {/* Glass reflection (Left side) */}
                    <rect
                        x={c.bx + 5}
                        y={c.by + 6}
                        width={8}
                        height={c.bh * 0.45}
                        rx={4}
                        fill="white"
                        opacity={isDark ? 0.06 : 0.25}
                    />

                    {/* Capacity label */}
                    <text
                        x={c.bx + c.bw / 2}
                        y={c.capY}
                        textAnchor="middle"
                        fill={labelColor}
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                        opacity={isDark ? 0.85 : 1}
                    >
                        {capacidad}L
                    </text>
                </svg>
            </div>

            {/* Amount display */}
            <div className={`jug-amount ${actual === capacidad ? 'is-full' : actual === 0 ? 'is-empty' : ''}`}>
                <span className="jug-amount-number">{actual}</span>
                <span className="jug-amount-unit">litros</span>
            </div>

            {/* Fill bar */}
            <div className="jug-fill-bar">
                <div
                    className="jug-fill-track"
                    style={{ width: `${fillPercent}%` }}
                />
            </div>
        </div>
    )
}

// ─── Step Card Component ─────────────────────────────────────────────────────
function StepCard({ paso, isInitial, isLast }: {
    paso: RegistroPaso
    isInitial: boolean
    isLast: boolean
}) {
    return (
        <div className={`step-card ${isInitial ? 'step-initial' : ''} ${isLast ? 'step-latest' : ''}`}>
            <div className="step-indicator">
                <div className="step-dot" />
                {!isLast && <div className="step-line" />}
            </div>
            <div className="step-content">
                <div className="step-header">
                    <span className="step-number">
                        {isInitial ? 'Inicio' : `Paso ${paso.paso}`}
                    </span>
                </div>
                <div className="step-action">{paso.accion}</div>
                <div className="step-state">
                    <span className="state-chip chip-a">A:{paso.jarraA}</span>
                    <span className="state-chip chip-b">B:{paso.jarraB}</span>
                    <span className="state-chip chip-c">C:{paso.jarraC}</span>
                </div>
            </div>
        </div>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function TresJarrasView() {
    const navigate = useNavigate()
    const isDark = useThemeStore((s) => s.theme === 'dark')

    const [jarras, setJarras] = useState<Jarra[]>(JARRAS_INICIALES)
    const [draggingJarra, setDraggingJarra] = useState<number | null>(null)
    const [dragOverJarra, setDragOverJarra] = useState<number | null>(null)
    const [selectedJarra, setSelectedJarra] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<'pasos' | 'solucion'>('pasos')
    const [showHelpModal, setShowHelpModal] = useState(false)
    const [movimientos, setMovimientos] = useState(0)
    const [registro, setRegistro] = useState<RegistroPaso[]>([
        { paso: 0, accion: 'Estado inicial', jarraA: 8, jarraB: 0, jarraC: 0 }
    ])
    const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'info' } | null>(null)

    const registroRef = useRef<HTMLDivElement>(null)
    const touchStartJarra = useRef<number | null>(null)

    // Derived state
    const isWon = jarras[0].actual === 4 && jarras[1].actual === 4
    const activeOrigin = draggingJarra !== null ? draggingJarra : selectedJarra
    const isValidTarget = (idx: number) => {
        if (activeOrigin === null || activeOrigin === idx) return false
        const from = jarras[activeOrigin]
        const to = jarras[idx]
        return from.actual > 0 && to.actual < to.capacidad
    }

    const handleJugClick = (idx: number) => {
        if (selectedJarra === null) {
            if (jarras[idx].actual > 0) {
                setSelectedJarra(idx)
            } else {
                setMensaje({ texto: `La Jarra ${jarras[idx].nombre} está vacía.`, tipo: 'info' })
                setTimeout(() => setMensaje(null), 2000)
            }
        } else if (selectedJarra === idx) {
            setSelectedJarra(null)
        } else {
            trasvasar(selectedJarra, idx)
            setSelectedJarra(null)
        }
    }

    // ── Core Actions ──────────────────────────────────────────────────────────
    const trasvasar = (fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) {
            setDraggingJarra(null)
            setDragOverJarra(null)
            return
        }

        const fromJarra = jarras[fromIdx]
        const toJarra = jarras[toIdx]

        if (fromJarra.actual === 0) {
            setMensaje({ texto: `La Jarra ${fromJarra.nombre} está vacía.`, tipo: 'info' })
            setTimeout(() => setMensaje(null), 2500)
            setDraggingJarra(null)
            setDragOverJarra(null)
            return
        }

        if (toJarra.actual === toJarra.capacidad) {
            setMensaje({ texto: `La Jarra ${toJarra.nombre} está llena.`, tipo: 'info' })
            setTimeout(() => setMensaje(null), 2500)
            setDraggingJarra(null)
            setDragOverJarra(null)
            return
        }

        const disponible = fromJarra.actual
        const espacio = toJarra.capacidad - toJarra.actual
        const trasvasado = Math.min(disponible, espacio)

        const newJarras = jarras.map((jarra, idx) => ({
            ...jarra,
            actual:
                idx === fromIdx
                    ? jarra.actual - trasvasado
                    : idx === toIdx
                        ? jarra.actual + trasvasado
                        : jarra.actual
        }))

        setJarras(newJarras)
        setDraggingJarra(null)
        setDragOverJarra(null)
        setSelectedJarra(null)

        const newMovimientos = movimientos + 1
        setMovimientos(newMovimientos)

        const nuevoPaso: RegistroPaso = {
            paso: newMovimientos,
            accion: `Jarra ${fromJarra.nombre} → Jarra ${toJarra.nombre} (${trasvasado}L)`,
            jarraA: newJarras[0].actual,
            jarraB: newJarras[1].actual,
            jarraC: newJarras[2].actual
        }
        setRegistro(prev => [...prev, nuevoPaso])

        setTimeout(() => {
            registroRef.current?.scrollTo({
                top: registroRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }, 120)

        if (newJarras[0].actual === 4 && newJarras[1].actual === 4) {
            setMensaje({
                texto: `🎉 ¡Lo lograste en ${newMovimientos} movimientos! La Jarra A y la Jarra B tienen exactamente 4 litros cada una.`,
                tipo: 'exito'
            })
        }
    }

    // ── Drag & Drop Handlers ──────────────────────────────────────────────────
    const handleDragStart = (idx: number) => {
        setDraggingJarra(idx)
    }

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault()
        if (draggingJarra !== null && draggingJarra !== idx) {
            setDragOverJarra(idx)
        }
    }

    const handleDragLeave = () => {
        setDragOverJarra(null)
    }

    const handleDrop = (e: React.DragEvent, toIdx: number) => {
        e.preventDefault()
        if (draggingJarra !== null && draggingJarra !== toIdx) {
            trasvasar(draggingJarra, toIdx)
        }
        setDraggingJarra(null)
        setDragOverJarra(null)
    }

    // ── Touch Handlers ────────────────────────────────────────────────────────
    const handleTouchStart = (idx: number) => {
        touchStartJarra.current = idx
        setDraggingJarra(idx)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault()
        const touch = e.touches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const jarraElement = element?.closest('.jug-wrapper')
        if (jarraElement) {
            const jarraIdx = parseInt(jarraElement.getAttribute('data-idx') || '-1')
            if (jarraIdx !== -1 && touchStartJarra.current !== null && jarraIdx !== touchStartJarra.current) {
                setDragOverJarra(jarraIdx)
            } else {
                setDragOverJarra(null)
            }
        } else {
            setDragOverJarra(null)
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touch = e.changedTouches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const jarraElement = element?.closest('.jug-wrapper')

        if (jarraElement && touchStartJarra.current !== null) {
            const toIdx = parseInt(jarraElement.getAttribute('data-idx') || '-1')
            if (toIdx !== -1 && toIdx !== touchStartJarra.current) {
                trasvasar(touchStartJarra.current, toIdx)
            }
        }

        setDraggingJarra(null)
        setDragOverJarra(null)
        touchStartJarra.current = null
    }

    // ── Game Controls ─────────────────────────────────────────────────────────
    const resetGame = () => {
        setJarras(JARRAS_INICIALES)
        setDraggingJarra(null)
        setDragOverJarra(null)
        setSelectedJarra(null)
        setMovimientos(0)
        setRegistro([{ paso: 0, accion: 'Estado inicial', jarraA: 8, jarraB: 0, jarraC: 0 }])
        setActiveTab('pasos')
        setMensaje(null)
        touchStartJarra.current = null
    }

    const toggleSolucion = () => {
        setActiveTab(prev => prev === 'solucion' ? 'pasos' : 'solucion')
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="game-root tres-jarras-root">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');

                :root {
                    --navy-900: #070d1a;
                    --navy-800: #0a1628;
                    --navy-700: #0f1f38;
                    --navy-600: #162d4d;
                    --navy-500: #1e3a5f;
                    --blue-400: #60a5fa;
                    --blue-500: #3b82f6;
                    --cyan-300: #67e8f9;
                    --cyan-400: #22d3ee;
                    --cyan-500: #06b6d4;
                    --cyan-600: #0891b2;
                    --amber-400: #fbbf24;
                    --amber-500: #f59e0b;
                    --emerald-400: #34d399;
                    --emerald-500: #10b981;
                    --red-400: #f87171;
                }

                .tres-jarras-root {
                    --tj-bg: linear-gradient(165deg, #070d1a 0%, #0a1628 40%, #0c1a30 100%);
                    --tj-text: #ffffff;
                    --tj-text-muted: rgba(255, 255, 255, 0.7);
                    --tj-text-dim: rgba(255, 255, 255, 0.45);
                    --tj-grid: rgba(59, 130, 246, 0.03);
                    --tj-card-bg: rgba(255, 255, 255, 0.03);
                    --tj-card-border: rgba(255, 255, 255, 0.08);
                    --tj-banner-bg: linear-gradient(135deg, rgba(245, 158, 11, 0.09), rgba(245, 158, 11, 0.04));
                    --tj-banner-border: rgba(245, 158, 11, 0.2);
                    --tj-banner-text: rgba(255, 255, 255, 0.85);
                    --tj-banner-strong: var(--amber-400);
                    --tj-btn-back-bg: rgba(255, 255, 255, 0.04);
                    --tj-btn-back-border: rgba(255, 255, 255, 0.08);
                    --tj-btn-back-text: rgba(255, 255, 255, 0.7);
                    --tj-btn-back-hover: #ffffff;
                    --tj-moves-bg: linear-gradient(135deg, var(--navy-600), var(--navy-700));
                    --tj-moves-border: rgba(96, 165, 250, 0.15);
                    --tj-moves-text: var(--blue-400);
                    --tj-moves-num: #ffffff;
                    --tj-jug-name: var(--blue-400);
                    --tj-jug-amount: var(--cyan-400);
                    --tj-jug-amount-empty: rgba(255, 255, 255, 0.25);
                    --tj-jug-track: rgba(255, 255, 255, 0.08);
                    --tj-btn-reset-bg: var(--navy-600);
                    --tj-btn-reset-text: var(--blue-400);
                    --tj-btn-reset-border: rgba(96, 165, 250, 0.2);
                    --tj-btn-reset-hover: var(--navy-500);
                    --tj-btn-sol-bg: linear-gradient(135deg, var(--amber-500), #d97706);
                    --tj-btn-sol-text: #1a0e00;
                    --tj-tab-active-bg: rgba(255, 255, 255, 0.1);
                    --tj-tab-active-text: #ffffff;
                    --tj-card-header: var(--amber-400);
                    --tj-step-num: var(--blue-400);
                    --tj-step-action: var(--cyan-300);
                    --tj-step-line: rgba(59, 130, 246, 0.15);
                    --tj-chip-a-bg: rgba(59, 130, 246, 0.12);
                    --tj-chip-a-text: var(--blue-400);
                    --tj-chip-a-border: rgba(59, 130, 246, 0.2);
                    --tj-chip-b-bg: rgba(6, 182, 212, 0.12);
                    --tj-chip-b-text: var(--cyan-400);
                    --tj-chip-b-border: rgba(6, 182, 212, 0.2);
                    --tj-chip-c-bg: rgba(245, 158, 11, 0.1);
                    --tj-chip-c-text: var(--amber-400);
                    --tj-chip-c-border: rgba(245, 158, 11, 0.15);
                    --tj-solution-header: var(--emerald-400);
                    --tj-solution-text: rgba(255, 255, 255, 0.7);
                    --tj-solution-state-bg: rgba(255, 255, 255, 0.04);
                    --tj-solution-state-text: rgba(255, 255, 255, 0.4);
                    --tj-solution-state-border: transparent;
                    --tj-solution-num-bg: rgba(16, 185, 129, 0.15);
                    --tj-solution-num-text: var(--emerald-400);
                    --tj-solution-succ-bg: rgba(16, 185, 129, 0.08);
                    --tj-solution-succ-border: rgba(16, 185, 129, 0.2);
                    --tj-solution-succ-text: var(--emerald-400);
                    --tj-scroll-thumb: rgba(255, 255, 255, 0.12);
                    --tj-win-card-bg: linear-gradient(145deg, var(--navy-700), var(--navy-800));
                    --tj-win-card-border: rgba(251, 191, 36, 0.25);
                    --tj-win-title: var(--amber-400);
                    --tj-win-text: rgba(255, 255, 255, 0.7);
                    --tj-win-moves-bg: rgba(251, 191, 36, 0.1);
                    --tj-win-moves-border: rgba(251, 191, 36, 0.2);
                    --tj-win-moves-num: var(--amber-400);
                    --tj-win-moves-label: rgba(255, 255, 255, 0.45);
                    --tj-progress-track: rgba(255, 255, 255, 0.08);
                    --tj-progress-label: rgba(255, 255, 255, 0.5);
                    --tj-progress-val: var(--cyan-400);
                    --tj-modal-bg: #0f1f38;
                    --tj-modal-border: rgba(255, 255, 255, 0.15);
                }

                html:not(.dark) .tres-jarras-root {
                    --tj-bg: linear-gradient(165deg, #f8fafc 0%, #f1f5f9 40%, #e2e8f0 100%);
                    --tj-text: #0f172a;
                    --tj-text-muted: #334155;
                    --tj-text-dim: #64748b;
                    --tj-grid: rgba(2, 132, 199, 0.04);
                    --tj-card-bg: #ffffff;
                    --tj-card-border: #cbd5e1;
                    --tj-banner-bg: linear-gradient(135deg, #fef9c3, #fef08a);
                    --tj-banner-border: #facc15;
                    --tj-banner-text: #713f12;
                    --tj-banner-strong: #854d0e;
                    --tj-btn-back-bg: #ffffff;
                    --tj-btn-back-border: #cbd5e1;
                    --tj-btn-back-text: #334155;
                    --tj-btn-back-hover: #0f172a;
                    --tj-moves-bg: #ffffff;
                    --tj-moves-border: #93c5fd;
                    --tj-moves-text: #0284c7;
                    --tj-moves-num: #0f172a;
                    --tj-jug-name: #0369a1;
                    --tj-jug-amount: #0284c7;
                    --tj-jug-amount-empty: #94a3b8;
                    --tj-jug-track: #e2e8f0;
                    --tj-btn-reset-bg: #ffffff;
                    --tj-btn-reset-text: #0284c7;
                    --tj-btn-reset-border: #cbd5e1;
                    --tj-btn-reset-hover: #f1f5f9;
                    --tj-btn-sol-bg: linear-gradient(135deg, #f59e0b, #d97706);
                    --tj-btn-sol-text: #ffffff;
                    --tj-tab-active-bg: #0284c7;
                    --tj-tab-active-text: #ffffff;
                    --tj-card-header: #b45309;
                    --tj-step-num: #0369a1;
                    --tj-step-action: #0f172a;
                    --tj-step-line: #cbd5e1;
                    --tj-chip-a-bg: #e0f2fe;
                    --tj-chip-a-text: #0369a1;
                    --tj-chip-a-border: #bae6fd;
                    --tj-chip-b-bg: #ecfeff;
                    --tj-chip-b-text: #0e7490;
                    --tj-chip-b-border: #a5f3fc;
                    --tj-chip-c-bg: #fef3c7;
                    --tj-chip-c-text: #b45309;
                    --tj-chip-c-border: #fde68a;
                    --tj-solution-header: #047857;
                    --tj-solution-text: #1e293b;
                    --tj-solution-state-bg: #f8fafc;
                    --tj-solution-state-text: #475569;
                    --tj-solution-state-border: #e2e8f0;
                    --tj-solution-num-bg: #dcfce7;
                    --tj-solution-num-text: #15803d;
                    --tj-solution-succ-bg: #dcfce7;
                    --tj-solution-succ-border: #86efac;
                    --tj-solution-succ-text: #166534;
                    --tj-scroll-thumb: #cbd5e1;
                    --tj-win-card-bg: #ffffff;
                    --tj-win-card-border: #f59e0b;
                    --tj-win-title: #b45309;
                    --tj-win-text: #334155;
                    --tj-win-moves-bg: #fef3c7;
                    --tj-win-moves-border: #fde68a;
                    --tj-win-moves-num: #b45309;
                    --tj-win-moves-label: #78350f;
                    --tj-progress-track: #e2e8f0;
                    --tj-progress-label: #475569;
                    --tj-progress-val: #0284c7;
                    --tj-modal-bg: #ffffff;
                    --tj-modal-border: #cbd5e1;
                }

                .tres-jarras-root {
                    height: 100dvh;
                    max-height: 100dvh;
                    overflow: hidden;
                    background: var(--tj-bg);
                    color: var(--tj-text);
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', system-ui, sans-serif;
                    position: relative;
                    user-select: none;
                    -webkit-user-select: none;
                }

                /* Subtle background grid */
                .tres-jarras-root::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background-image:
                        linear-gradient(var(--tj-grid) 1px, transparent 1px),
                        linear-gradient(90deg, var(--tj-grid) 1px, transparent 1px);
                    background-size: 48px 48px;
                    pointer-events: none;
                    z-index: 0;
                }

                .tres-jarras-root > * {
                    position: relative;
                    z-index: 1;
                }

                /* ─── Header (36-42px) ──────────────────── */
                .tres-jarras-root .game-header {
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 0 10px;
                    border-bottom: 1px solid var(--tj-card-border);
                    flex-shrink: 0;
                }
                @media (min-width: 1024px) {
                    .tres-jarras-root .game-header {
                        height: 44px;
                        padding: 0 16px;
                    }
                }

                .tres-jarras-root .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: var(--tj-btn-back-text);
                    background: var(--tj-btn-back-bg);
                    border: 1px solid var(--tj-btn-back-border);
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    height: 28px;
                }
                .tres-jarras-root .btn-back:hover {
                    color: var(--tj-btn-back-hover);
                    filter: brightness(0.95);
                }
                .tres-jarras-root .btn-back:active { transform: scale(0.96); }

                .tres-jarras-root .game-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 1rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    color: var(--tj-text);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                @media (min-width: 1024px) {
                    .tres-jarras-root .game-title {
                        font-size: 1.25rem;
                    }
                }

                .tres-jarras-root .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .tres-jarras-root .btn-help-header {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: var(--tj-banner-bg);
                    border: 1px solid var(--tj-banner-border);
                    color: var(--tj-banner-strong);
                    border-radius: 8px;
                    padding: 3px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    height: 28px;
                    transition: all 0.2s;
                }
                .tres-jarras-root .btn-help-header:hover {
                    filter: brightness(1.05);
                }

                .tres-jarras-root .moves-pill {
                    background: var(--tj-moves-bg);
                    border: 1px solid var(--tj-moves-border);
                    border-radius: 100px;
                    padding: 3px 10px;
                    font-size: 11px;
                    color: var(--tj-moves-text);
                    font-weight: 600;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    height: 28px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .tres-jarras-root .moves-pill strong {
                    color: var(--tj-moves-num);
                    font-size: 13px;
                }

                /* ─── Subheader / Objective Bar (28-32px) ── */
                .tres-jarras-root .objective-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 4px 10px;
                    background: var(--tj-banner-bg);
                    border-bottom: 1px solid var(--tj-banner-border);
                    flex-shrink: 0;
                    font-size: 11px;
                }
                @media (min-width: 1024px) {
                    .tres-jarras-root .objective-bar {
                        padding: 6px 16px;
                        font-size: 12px;
                    }
                }
                .tres-jarras-root .objective-target {
                    font-weight: 800;
                    color: var(--tj-banner-strong);
                }
                .tres-jarras-root .objective-hint {
                    color: var(--tj-text-muted);
                    font-size: 11px;
                }
                .tres-jarras-root .progress-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    color: var(--tj-text-muted);
                    font-size: 11px;
                    white-space: nowrap;
                }
                .tres-jarras-root .progress-mini-bar {
                    width: 55px;
                    height: 6px;
                    background: var(--tj-progress-track);
                    border-radius: 100px;
                    overflow: hidden;
                }
                .tres-jarras-root .progress-mini-fill {
                    height: 100%;
                    border-radius: 100px;
                    background: linear-gradient(90deg, #10b981, #34d399);
                    transition: width 0.4s ease;
                }

                /* ─── Message Alert ──────────────────────── */
                .tres-jarras-root .game-message {
                    max-width: 480px;
                    width: 95%;
                    margin: 4px auto;
                    padding: 6px 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 600;
                    text-align: center;
                    animation: msgIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
                    z-index: 10;
                }
                .tres-jarras-root .game-message.msg-success {
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.3);
                    color: var(--emerald-400);
                }
                .tres-jarras-root .game-message.msg-info {
                    background: rgba(6,182,212,0.1);
                    border: 1px solid rgba(6,182,212,0.25);
                    color: var(--cyan-300);
                }
                html:not(.dark) .tres-jarras-root .game-message.msg-info {
                    background: #e0f2fe;
                    border: 1px solid #7dd3fc;
                    color: #0369a1;
                }
                html:not(.dark) .tres-jarras-root .game-message.msg-success {
                    background: #dcfce7;
                    border: 1px solid #86efac;
                    color: #15803d;
                }

                @keyframes msgIn {
                    from { opacity: 0; transform: translateY(-4px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* ─── Workspace Layout ───────────────────── */
                .tres-jarras-root .game-layout {
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 6px 8px;
                    overflow: hidden;
                }

                /* Tablet landscape (809x506) & Laptop (>=1024) */
                @media (min-width: 680px) and (orientation: landscape), (min-width: 900px) {
                    .tres-jarras-root .game-layout {
                        flex-direction: row;
                        gap: 12px;
                        padding: 8px 12px;
                    }
                    .tres-jarras-root .game-left {
                        flex: 1;
                        min-width: 0;
                        height: 100%;
                    }
                    .tres-jarras-root .game-right {
                        width: 285px;
                        flex-shrink: 0;
                        height: 100%;
                    }
                }
                @media (min-width: 1200px) {
                    .tres-jarras-root .game-right {
                        width: 325px;
                    }
                }

                /* ─── Jugs Section (Left) ────────────────── */
                .tres-jarras-root .jugs-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }

                .tres-jarras-root .jugs-instruction {
                    text-align: center;
                    font-size: 11px;
                    color: var(--tj-text-dim);
                    line-height: 1.4;
                    padding: 3px 10px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.02);
                    flex-shrink: 0;
                    margin-bottom: 6px;
                }
                html:not(.dark) .tres-jarras-root .jugs-instruction {
                    background: rgba(15,23,42,0.03);
                    color: #475569;
                }
                @media (min-width: 1024px) {
                    .tres-jarras-root .jugs-instruction {
                        font-size: 13px;
                        padding: 5px 14px;
                        margin-bottom: 12px;
                    }
                }

                .tres-jarras-root .jugs-stage {
                    flex: 1;
                    min-height: 0;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .tres-jarras-root .jugs-row {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    align-items: flex-end;
                    width: 100%;
                    position: relative;
                }
                @media (min-width: 640px) {
                    .tres-jarras-root .jugs-row { gap: 20px; }
                }
                @media (min-width: 1024px) {
                    .tres-jarras-root .jugs-row { gap: 36px; }
                    .tres-jarras-root .jug-wrapper {
                        transform: scale(1.15);
                        transform-origin: center center;
                    }
                }
                @media (min-width: 1366px) {
                    .tres-jarras-root .jugs-row { gap: 48px; }
                    .tres-jarras-root .jug-wrapper {
                        transform: scale(1.25);
                        transform-origin: center center;
                    }
                }
                @media (min-width: 1600px) {
                    .tres-jarras-root .jugs-row { gap: 60px; }
                    .tres-jarras-root .jug-wrapper {
                        transform: scale(1.35);
                        transform-origin: center center;
                    }
                }

                /* ─── Jug Wrapper ────────────────────────── */
                .tres-jarras-root .jug-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    position: relative;
                    border-radius: 14px;
                    padding: 8px 4px 6px;
                    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    user-select: none;
                    background: transparent;
                }

                .tres-jarras-root .jug-wrapper:active { cursor: grabbing; }

                .tres-jarras-root .jug-wrapper.is-dragging,
                .tres-jarras-root .jug-wrapper.is-selected {
                    transform: scale(1.05) translateY(-3px);
                    background: rgba(245,158,11,0.08);
                    box-shadow:
                        0 0 0 2px var(--amber-500),
                        0 0 24px rgba(245,158,11,0.2);
                    z-index: 50;
                }

                .tres-jarras-root .jug-wrapper.is-drop-target {
                    background: rgba(6,182,212,0.1);
                    box-shadow:
                        0 0 0 2px var(--cyan-500),
                        0 0 20px rgba(6,182,212,0.25);
                    transform: scale(1.03);
                }

                .tres-jarras-root .jug-wrapper.is-valid-target {
                    background: rgba(6,182,212,0.04);
                    box-shadow: 0 0 0 1px rgba(6,182,212,0.3);
                    animation: targetPulse 1.5s ease-in-out infinite;
                }

                .tres-jarras-root .jug-wrapper.is-winner {
                    animation: winnerGlow 1.2s ease-in-out infinite alternate;
                }

                html:not(.dark) .tres-jarras-root .jug-wrapper.is-dragging,
                html:not(.dark) .tres-jarras-root .jug-wrapper.is-selected {
                    background: #fef3c7;
                    box-shadow: 0 0 0 2px #f59e0b, 0 8px 20px rgba(245,158,11,0.2);
                }
                html:not(.dark) .tres-jarras-root .jug-wrapper.is-drop-target {
                    background: #e0f2fe;
                    box-shadow: 0 0 0 2px #0284c7, 0 8px 20px rgba(2,132,199,0.2);
                }
                html:not(.dark) .tres-jarras-root .jug-wrapper.is-valid-target {
                    background: #f0fdf4;
                    box-shadow: 0 0 0 1px rgba(2,132,199,0.35);
                }

                @keyframes targetPulse {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(6,182,212,0.2); }
                    50% { box-shadow: 0 0 0 2px rgba(6,182,212,0.4), 0 0 12px rgba(6,182,212,0.15); }
                }

                @keyframes winnerGlow {
                    from { box-shadow: 0 0 0 1px rgba(251,191,36,0.3), 0 0 15px rgba(251,191,36,0.1); }
                    to { box-shadow: 0 0 0 2px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.2); }
                }

                /* ─── Jug Labels ─────────────────────────── */
                .tres-jarras-root .jug-badge {
                    position: absolute;
                    top: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 100px;
                    white-space: nowrap;
                    letter-spacing: 0.4px;
                    animation: badgePop 0.2s cubic-bezier(0.34,1.56,0.64,1);
                    z-index: 10;
                }
                .tres-jarras-root .badge-origin {
                    background: var(--amber-500);
                    color: #1a0e00;
                }
                .tres-jarras-root .badge-destiny {
                    background: var(--cyan-500);
                    color: #001a20;
                }
                .tres-jarras-root .badge-hint {
                    background: rgba(6,182,212,0.2);
                    color: var(--cyan-300);
                    border: 1px solid rgba(6,182,212,0.3);
                    font-weight: 700;
                    font-size: 8.5px;
                }
                html:not(.dark) .tres-jarras-root .badge-destiny {
                    background: #0284c7;
                    color: #ffffff;
                }
                html:not(.dark) .tres-jarras-root .badge-hint {
                    background: #e0f2fe;
                    color: #0369a1;
                    border-color: #7dd3fc;
                }

                @keyframes badgePop {
                    from { opacity: 0; transform: translateX(-50%) translateY(3px) scale(0.85); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }

                .tres-jarras-root .jug-name {
                    font-family: 'Playfair Display', serif;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--tj-jug-name);
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                }

                .tres-jarras-root .jug-svg-container {
                    filter: drop-shadow(0 6px 18px rgba(0,0,0,0.3));
                    transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
                }
                html:not(.dark) .tres-jarras-root .jug-svg-container {
                    filter: drop-shadow(0 4px 12px rgba(15,23,42,0.12));
                }
                .tres-jarras-root .jug-wrapper:hover .jug-svg-container {
                    transform: translateY(-2px);
                }

                .tres-jarras-root .water-body {
                    transition: y 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1);
                }
                .tres-jarras-root .water-shimmer {
                    transition: y 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1);
                }

                .tres-jarras-root .jug-amount {
                    display: flex;
                    align-items: baseline;
                    gap: 3px;
                    margin-top: 1px;
                }
                .tres-jarras-root .jug-amount-number {
                    font-family: 'Playfair Display', serif;
                    font-size: 24px;
                    font-weight: 900;
                    color: var(--tj-jug-amount);
                    line-height: 1;
                    transition: color 0.3s;
                }
                .tres-jarras-root .jug-amount.is-full .jug-amount-number {
                    color: var(--amber-500);
                }
                .tres-jarras-root .jug-amount.is-empty .jug-amount-number {
                    color: var(--tj-jug-amount-empty);
                }
                .tres-jarras-root .jug-amount-unit {
                    font-size: 10px;
                    color: var(--tj-text-dim);
                    font-weight: 500;
                }

                .tres-jarras-root .jug-fill-bar {
                    width: 55%;
                    height: 3px;
                    background: var(--tj-jug-track);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-top: 1px;
                }
                .tres-jarras-root .jug-fill-track {
                    height: 100%;
                    background: linear-gradient(90deg, var(--cyan-500), var(--cyan-300));
                    border-radius: 100px;
                    transition: width 0.45s cubic-bezier(0.4,0,0.2,1);
                }
                html:not(.dark) .tres-jarras-root .jug-fill-track {
                    background: linear-gradient(90deg, #0284c7, #38bdf8);
                }
                .tres-jarras-root .jug-amount.is-full + .jug-fill-bar .jug-fill-track {
                    background: linear-gradient(90deg, var(--amber-500), var(--amber-400));
                }

                /* Responsive scale down for short viewports (tablets landscape & mobile) */
                @media (max-height: 520px) {
                    .tres-jarras-root .jug-wrapper {
                        transform: scale(0.92);
                        transform-origin: bottom center;
                    }
                }
                @media (max-height: 440px) {
                    .tres-jarras-root .jug-wrapper {
                        transform: scale(0.82);
                        transform-origin: bottom center;
                    }
                }

                /* ─── Right Panel (Controls + Card) ──────── */
                .tres-jarras-root .game-right {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .tres-jarras-root .controls-row {
                    display: flex;
                    gap: 6px;
                    justify-content: stretch;
                }

                .tres-jarras-root .btn {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    white-space: nowrap;
                    height: 32px;
                }
                .tres-jarras-root .btn:active { transform: scale(0.96); }

                .tres-jarras-root .btn-reset {
                    background: var(--tj-btn-reset-bg);
                    color: var(--tj-btn-reset-text);
                    border: 1px solid var(--tj-btn-reset-border);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }
                .tres-jarras-root .btn-reset:hover {
                    background: var(--tj-btn-reset-hover);
                    filter: brightness(1.05);
                }

                .tres-jarras-root .btn-solution {
                    background: var(--tj-btn-sol-bg);
                    color: var(--tj-btn-sol-text);
                    box-shadow: 0 2px 10px rgba(245,158,11,0.2);
                }
                .tres-jarras-root .btn-solution:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(245,158,11,0.3);
                }
                .tres-jarras-root .btn-active-sol {
                    background: #10b981;
                    color: #ffffff;
                }

                /* ─── Integrated Glass Card with Tabs ────── */
                .tres-jarras-root .panel-card {
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    background: var(--tj-card-bg);
                    border: 1px solid var(--tj-card-border);
                    border-radius: 14px;
                    padding: 8px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);
                    overflow: hidden;
                }

                .tres-jarras-root .tabs-header {
                    display: flex;
                    gap: 4px;
                    background: rgba(0,0,0,0.1);
                    padding: 3px;
                    border-radius: 9px;
                    margin-bottom: 8px;
                    flex-shrink: 0;
                }
                html:not(.dark) .tres-jarras-root .tabs-header {
                    background: #f1f5f9;
                }

                .tres-jarras-root .tab-btn {
                    flex: 1;
                    padding: 5px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 7px;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                    text-align: center;
                    white-space: nowrap;
                    background: transparent;
                    color: var(--tj-text-dim);
                }
                .tres-jarras-root .tab-btn.is-active {
                    background: var(--tj-tab-active-bg);
                    color: var(--tj-tab-active-text);
                    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                }

                /* ─── Steps Timeline ─────────────────────── */
                .tres-jarras-root .steps-scroll {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding-right: 4px;
                    scroll-behavior: smooth;
                }
                .tres-jarras-root .steps-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .tres-jarras-root .steps-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .tres-jarras-root .steps-scroll::-webkit-scrollbar-thumb {
                    background: var(--tj-scroll-thumb);
                    border-radius: 100px;
                }

                .tres-jarras-root .step-card {
                    display: flex;
                    gap: 10px;
                    animation: stepIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
                }

                @keyframes stepIn {
                    from { opacity: 0; transform: translateX(-8px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .tres-jarras-root .step-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex-shrink: 0;
                    width: 14px;
                }
                .tres-jarras-root .step-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--tj-step-num);
                    border: 2px solid var(--tj-card-bg);
                    flex-shrink: 0;
                    margin-top: 4px;
                }
                .tres-jarras-root .step-initial .step-dot {
                    background: var(--cyan-500);
                }
                .tres-jarras-root .step-latest .step-dot {
                    background: var(--amber-400);
                    box-shadow: 0 0 6px rgba(251,191,36,0.4);
                }
                .tres-jarras-root .step-line {
                    width: 2px;
                    flex: 1;
                    min-height: 20px;
                    background: var(--tj-step-line);
                    margin: 2px 0;
                }

                .tres-jarras-root .step-content {
                    flex: 1;
                    padding-bottom: 10px;
                    min-width: 0;
                }

                .tres-jarras-root .step-header {
                    margin-bottom: 1px;
                }
                .tres-jarras-root .step-number {
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--tj-step-num);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .tres-jarras-root .step-initial .step-number {
                    color: var(--cyan-500);
                }
                .tres-jarras-root .step-latest .step-number {
                    color: var(--amber-500);
                }

                .tres-jarras-root .step-action {
                    font-size: 12px;
                    color: var(--tj-step-action);
                    font-weight: 600;
                    margin-bottom: 4px;
                    line-height: 1.35;
                }

                .tres-jarras-root .step-state {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }

                .tres-jarras-root .state-chip {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 1px 6px;
                    border-radius: 5px;
                    font-family: 'Inter', monospace;
                    letter-spacing: 0.3px;
                }
                .tres-jarras-root .chip-a {
                    background: var(--tj-chip-a-bg);
                    color: var(--tj-chip-a-text);
                    border: 1px solid var(--tj-chip-a-border);
                }
                .tres-jarras-root .chip-b {
                    background: var(--tj-chip-b-bg);
                    color: var(--tj-chip-b-text);
                    border: 1px solid var(--tj-chip-b-border);
                }
                .tres-jarras-root .chip-c {
                    background: var(--tj-chip-c-bg);
                    color: var(--tj-chip-c-text);
                    border: 1px solid var(--tj-chip-c-border);
                }

                /* ─── Solution Panel inside Tab ──────────── */
                .tres-jarras-root .solution-scroll {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .tres-jarras-root .solution-intro {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--tj-solution-header);
                    margin-bottom: 4px;
                }

                .tres-jarras-root .solution-step {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    padding: 5px 0;
                    border-bottom: 1px solid var(--tj-card-border);
                }
                .tres-jarras-root .solution-step:last-child { border-bottom: none; }

                .tres-jarras-root .solution-step-num {
                    width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    background: var(--tj-solution-num-bg);
                    color: var(--tj-solution-num-text);
                    font-size: 11px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .tres-jarras-root .solution-step-text {
                    flex: 1;
                    font-size: 11.5px;
                    color: var(--tj-solution-text);
                    line-height: 1.35;
                }
                .tres-jarras-root .solution-step-state {
                    font-size: 10px;
                    font-family: 'Inter', monospace;
                    color: var(--tj-solution-state-text);
                    background: var(--tj-solution-state-bg);
                    border: 1px solid var(--tj-solution-state-border);
                    padding: 2px 6px;
                    border-radius: 5px;
                    white-space: nowrap;
                    flex-shrink: 0;
                    font-weight: 600;
                }

                .tres-jarras-root .solution-success {
                    margin-top: 6px;
                    padding: 8px;
                    background: var(--tj-solution-succ-bg);
                    border: 1px solid var(--tj-solution-succ-border);
                    border-radius: 10px;
                    text-align: center;
                    font-size: 11px;
                    color: var(--tj-solution-succ-text);
                    font-weight: 600;
                }

                /* ─── Modal / Dialog Styles ──────────────── */
                .tres-jarras-root .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: overlayIn 0.25s ease;
                    padding: 16px;
                }

                .tres-jarras-root .modal-card {
                    background: var(--tj-modal-bg);
                    border: 1px solid var(--tj-modal-border);
                    border-radius: 20px;
                    padding: 20px;
                    max-width: 440px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.35);
                    animation: winCardIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .tres-jarras-root .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--tj-card-border);
                    padding-bottom: 10px;
                }
                .tres-jarras-root .modal-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 17px;
                    font-weight: 800;
                    color: var(--tj-banner-strong);
                    margin: 0;
                }
                .tres-jarras-root .modal-close-btn {
                    background: transparent;
                    border: none;
                    color: var(--tj-text-dim);
                    font-size: 18px;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 6px;
                }
                .tres-jarras-root .modal-close-btn:hover {
                    color: var(--tj-text);
                }

                .tres-jarras-root .modal-body {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .tres-jarras-root .modal-desc {
                    margin: 0;
                    color: var(--tj-text-muted);
                }

                .tres-jarras-root .modal-chips {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .tres-jarras-root .modal-chip {
                    background: var(--tj-banner-bg);
                    border: 1px solid var(--tj-banner-border);
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    color: var(--tj-banner-strong);
                }

                .tres-jarras-root .modal-rules {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--tj-card-border);
                    border-radius: 12px;
                    padding: 10px;
                }
                html:not(.dark) .tres-jarras-root .modal-rules {
                    background: #f8fafc;
                }
                .tres-jarras-root .modal-rule-title {
                    font-weight: 700;
                    color: var(--amber-500);
                    margin-bottom: 4px;
                }
                .tres-jarras-root .modal-rule-list {
                    margin: 0;
                    padding-left: 18px;
                    color: var(--tj-text-muted);
                    font-size: 12px;
                }

                .tres-jarras-root .modal-target {
                    background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.25);
                    border-radius: 10px;
                    padding: 8px 12px;
                    color: var(--emerald-400);
                    font-size: 12px;
                }
                html:not(.dark) .tres-jarras-root .modal-target {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                    color: #047857;
                }

                .tres-jarras-root .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 4px;
                }

                /* ─── Win Overlay ────────────────────────── */
                .tres-jarras-root .win-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.55);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: overlayIn 0.3s ease;
                    padding: 16px;
                }
                @keyframes overlayIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .tres-jarras-root .win-card {
                    background: var(--tj-win-card-bg);
                    border: 1px solid var(--tj-win-card-border);
                    border-radius: 20px;
                    padding: 24px;
                    text-align: center;
                    max-width: 380px;
                    width: 100%;
                    animation: winCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
                    box-shadow: 0 0 50px rgba(251,191,36,0.15), 0 20px 40px rgba(0,0,0,0.3);
                }
                @keyframes winCardIn {
                    from { opacity: 0; transform: scale(0.88) translateY(16px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .tres-jarras-root .win-emoji {
                    font-size: 40px;
                    margin-bottom: 8px;
                    animation: winBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
                }
                @keyframes winBounce {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                .tres-jarras-root .win-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 22px;
                    font-weight: 900;
                    color: var(--tj-win-title);
                    margin-bottom: 6px;
                }
                .tres-jarras-root .win-text {
                    font-size: 13px;
                    color: var(--tj-win-text);
                    line-height: 1.5;
                    margin-bottom: 16px;
                }
                .tres-jarras-root .win-moves {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 4px;
                    background: var(--tj-win-moves-bg);
                    border: 1px solid var(--tj-win-moves-border);
                    border-radius: 10px;
                    padding: 6px 16px;
                    margin-bottom: 16px;
                }
                .tres-jarras-root .win-moves-num {
                    font-family: 'Playfair Display', serif;
                    font-size: 24px;
                    font-weight: 900;
                    color: var(--tj-win-moves-num);
                }
                .tres-jarras-root .win-moves-label {
                    font-size: 11px;
                    color: var(--tj-win-moves-label);
                    font-weight: 500;
                }
                .tres-jarras-root .win-btn {
                    background: linear-gradient(135deg, var(--amber-500), #d97706);
                    color: #1a0e00;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 24px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tres-jarras-root .win-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 18px rgba(245,158,11,0.3);
                }
                .tres-jarras-root .win-btn:active { transform: scale(0.97); }
            `}</style>

            {/* 1. Header (38px) */}
            <header className="game-header">
                <button
                    onClick={() => navigate(-1)}
                    className="btn-back"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Volver</span>
                </button>

                <h1 className="game-title">🫙 Las Tres Jarras</h1>

                <div className="header-actions">
                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="btn-help-header"
                        title="Ver acertijo completo"
                    >
                        <span>❓</span>
                        <span className="hidden sm:inline">Reglas</span>
                    </button>
                    <div className="moves-pill">
                        Mov. <strong>{movimientos}</strong>
                    </div>
                </div>
            </header>

            {/* 2. Subheader Bar (28-32px) */}
            <div className="objective-bar">
                <div className="objective-text">
                    <span className="objective-target">🎯 Meta: 4L en Jarra A o B</span>
                    <span className="hidden md:inline text-dim"> · </span>
                    <span className="objective-hint hidden md:inline">Toca o arrastra una jarra sobre otra</span>
                </div>
                <div className="progress-pill">
                    <span>A={jarras[0].actual}L · B={jarras[1].actual}L</span>
                    <div className="progress-mini-bar">
                        <div
                            className="progress-mini-fill"
                            style={{
                                width: `${((jarras[0].actual === 4 ? 50 : 0) + (jarras[1].actual === 4 ? 50 : 0))}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Main Workspace Layout */}
            <div className="game-layout">
                {/* Left: Jugs Game Area */}
                <div className="game-left jugs-section">
                    {/* Message alert */}
                    {mensaje && mensaje.tipo === 'info' && (
                        <div className="game-message msg-info">
                            {mensaje.texto}
                        </div>
                    )}

                    {/* Micro-hint */}
                    <div className="jugs-instruction">
                        <span>
                            {selectedJarra !== null
                                ? `👉 Seleccionaste Jarra ${jarras[selectedJarra].nombre}: Toca otra jarra para trasvasar`
                                : `💡 Toca o arrastra una jarra con agua para trasvasar`}
                        </span>
                    </div>

                    {/* Jugs Row Stage (Vertically centered) */}
                    <div className="jugs-stage">
                        <div className="jugs-row">
                            {jarras.map((jarra, idx) => (
                                <JarraSVG
                                    key={idx}
                                    capacidad={jarra.capacidad}
                                    actual={jarra.actual}
                                    nombre={jarra.nombre}
                                    dragging={draggingJarra === idx}
                                    dropTarget={dragOverJarra === idx}
                                    isValidTarget={isValidTarget(idx)}
                                    isSelected={selectedJarra === idx}
                                    isWinner={isWon && (idx === 0 || idx === 1)}
                                    idx={idx}
                                    isDark={isDark}
                                    onClick={() => handleJugClick(idx)}
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    onTouchStart={() => handleTouchStart(idx)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Controls + Tabbed Steps/Solution Card */}
                <aside className="game-right">
                    {/* Top Controls Row */}
                    <div className="controls-row">
                        <button onClick={resetGame} className="btn btn-reset">
                            🔄 Reiniciar
                        </button>
                        <button
                            onClick={toggleSolucion}
                            className={`btn ${activeTab === 'solucion' ? 'btn-active-sol' : 'btn-solution'}`}
                        >
                            {activeTab === 'solucion' ? '📋 Ver pasos' : '💡 Ver solución'}
                        </button>
                    </div>

                    {/* Single Integrated Card with Tabs */}
                    <div className="glass-card panel-card">
                        <div className="tabs-header">
                            <button
                                className={`tab-btn ${activeTab === 'pasos' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('pasos')}
                            >
                                📋 Pasos ({registro.length - 1})
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'solucion' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('solucion')}
                            >
                                💡 Solución ({SOLUCION.length})
                            </button>
                        </div>

                        {activeTab === 'pasos' ? (
                            <div className="steps-scroll" ref={registroRef}>
                                {registro.map((paso, idx) => (
                                    <StepCard
                                        key={idx}
                                        paso={paso}
                                        isInitial={idx === 0}
                                        isLast={idx === registro.length - 1}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="steps-scroll solution-scroll">
                                <div className="solution-intro">
                                    Secuencia óptima de 7 pasos:
                                </div>
                                {SOLUCION.map((paso, idx) => (
                                    <div key={idx} className="solution-step">
                                        <div className="solution-step-num">{paso.paso}</div>
                                        <div className="solution-step-text">{paso.accion}</div>
                                        <div className="solution-step-state">
                                            A:{paso.estado[0]} B:{paso.estado[1]} C:{paso.estado[2]}
                                        </div>
                                    </div>
                                ))}
                                <div className="solution-success">
                                    🎉 Meta: Jarra A = <strong>4L</strong> y Jarra B = <strong>4L</strong>.
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* 4. Help / Rules Modal */}
            {showHelpModal && (
                <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">🫙 El Acertijo de las Tres Jarras</h3>
                            <button className="modal-close-btn" onClick={() => setShowHelpModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-desc">
                                Tienes tres jarras con distintas capacidades:
                            </p>
                            <div className="modal-chips">
                                <div className="modal-chip">Jarra A: <strong>8 Litros</strong> (Llena)</div>
                                <div className="modal-chip">Jarra B: <strong>5 Litros</strong> (Vacía)</div>
                                <div className="modal-chip">Jarra C: <strong>3 Litros</strong> (Vacía)</div>
                            </div>
                            <div className="modal-rules">
                                <div className="modal-rule-title">⚠️ Reglas del juego:</div>
                                <ul className="modal-rule-list">
                                    <li>Las jarras <strong>no tienen marcas intermedias</strong> para medir.</li>
                                    <li>Al trasvasar, debes llenar la jarra de destino o vaciar la jarra de origen.</li>
                                    <li>No se puede desperdiciar agua ni añadir agua externa.</li>
                                </ul>
                            </div>
                            <div className="modal-target">
                                🎯 <strong>Objetivo:</strong> Obtén exactamente <strong>4 litros</strong> en la <strong>Jarra A</strong> y <strong>4 litros</strong> en la <strong>Jarra B</strong>.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="win-btn" onClick={() => setShowHelpModal(false)}>
                                ¡Entendido, a jugar!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Win Overlay */}
            {isWon && mensaje?.tipo === 'exito' && (
                <div className="win-overlay" onClick={() => setMensaje(null)}>
                    <div className="win-card" onClick={(e) => e.stopPropagation()}>
                        <div className="win-emoji">🏆</div>
                        <div className="win-title">¡Excelente!</div>
                        <div className="win-text">
                            Lograste obtener exactamente 4 litros en la Jarra A y la Jarra B.
                        </div>
                        <div className="win-moves">
                            <span className="win-moves-num">{movimientos}</span>
                            <span className="win-moves-label">movimientos</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button className="win-btn" onClick={resetGame}>
                                🔄 Jugar de nuevo
                            </button>
                            <button
                                className="btn btn-reset"
                                onClick={() => setMensaje(null)}
                                style={{ padding: '10px 20px', flex: 'none' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}