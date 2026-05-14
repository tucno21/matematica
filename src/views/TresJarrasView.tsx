import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

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
        bx: 18, by: 22, bw: 92, bh: 162, br: 8,
        handle: 'M110 54 C132 54 136 78 136 100 C136 122 132 150 110 150',
        rimW: 98, capY: 212
    },
    5: {
        w: 110, h: 194,
        bx: 15, by: 19, bw: 76, bh: 132, br: 7,
        handle: 'M91 44 C110 44 114 64 114 83 C114 102 110 126 91 126',
        rimW: 82, capY: 184
    },
    3: {
        w: 90, h: 166,
        bx: 12, by: 16, bw: 62, bh: 108, br: 6,
        handle: 'M74 36 C92 36 96 52 96 68 C96 84 92 104 74 104',
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
    isWinner,
    idx,
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
    isWinner: boolean
    idx: number
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
            className={`jug-wrapper ${dragging ? 'is-dragging' : ''} ${dropTarget ? 'is-drop-target' : ''} ${isValidTarget && !dropTarget && !dragging ? 'is-valid-target' : ''} ${isWinner ? 'is-winner' : ''}`}
            data-idx={idx}
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
            {/* Drag labels */}
            {dragging && <div className="jug-badge badge-origin">ORIGEN</div>}
            {dropTarget && <div className="jug-badge badge-destiny">DESTINO</div>}
            {isValidTarget && !dropTarget && !dragging && (
                <div className="jug-badge badge-hint">SOLTAR AQUÍ</div>
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
                            <stop offset="0%" stopColor="#67e8f9" />
                            <stop offset="40%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#0e7490" />
                        </linearGradient>

                        {/* Water shimmer */}
                        <linearGradient id={`ws-${capacidad}-${idx}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>

                        {/* Body gradient */}
                        <linearGradient id={`bg-${capacidad}-${idx}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(30,58,95,0.6)" />
                            <stop offset="50%" stopColor="rgba(20,40,70,0.3)" />
                            <stop offset="100%" stopColor="rgba(30,58,95,0.6)" />
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
                                    stroke="rgba(103, 232, 249, 0.5)"
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
                        stroke={isWinner ? '#fbbf24' : '#3b82f6'}
                        strokeWidth={isWinner ? 2.5 : 2}
                        className="jug-body-outline"
                        filter={isWinner ? `url(#glow-${idx})` : undefined}
                    />

                    {/* Rim */}
                    <rect
                        x={rimX} y={rimY}
                        width={c.rimW} height={7}
                        rx={3.5}
                        fill={isWinner ? '#fbbf24' : '#3b82f6'}
                        opacity="0.9"
                    />

                    {/* Handle */}
                    <path
                        d={c.handle}
                        fill="none"
                        stroke={isWinner ? '#fbbf24' : '#3b82f6'}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Capacity marks */}
                    {[...Array(capacidad + 1)].map((_, i) => {
                        const markY = c.by + (c.bh / capacidad) * i
                        const isMajor = i === 0 || i === capacidad || i === Math.floor(capacidad / 2)
                        return (
                            <g key={i}>
                                <line
                                    x1={c.bx + 1}
                                    y1={markY}
                                    x2={c.bx + (isMajor ? 16 : 10)}
                                    y2={markY}
                                    stroke={isWinner ? '#fbbf24' : '#3b82f6'}
                                    strokeWidth={isMajor ? 1.5 : 0.8}
                                    opacity={isMajor ? 0.7 : 0.35}
                                />
                                {isMajor && i > 0 && i < capacidad && (
                                    <text
                                        x={c.bx + 20}
                                        y={markY + 3.5}
                                        fill={isWinner ? '#fbbf24' : '#60a5fa'}
                                        fontSize="8"
                                        fontFamily="Inter, sans-serif"
                                        opacity="0.6"
                                    >
                                        {capacidad - i}
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {/* Glass reflection */}
                    <rect
                        x={c.bx + 5}
                        y={c.by + 6}
                        width={8}
                        height={c.bh * 0.45}
                        rx={4}
                        fill="white"
                        opacity="0.06"
                    />

                    {/* Capacity label */}
                    <text
                        x={c.w / 2}
                        y={c.capY}
                        textAnchor="middle"
                        fill={isWinner ? '#fbbf24' : '#60a5fa'}
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                        opacity="0.8"
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

    const [jarras, setJarras] = useState<Jarra[]>(JARRAS_INICIALES)
    const [draggingJarra, setDraggingJarra] = useState<number | null>(null)
    const [dragOverJarra, setDragOverJarra] = useState<number | null>(null)
    const [movimientos, setMovimientos] = useState(0)
    const [registro, setRegistro] = useState<RegistroPaso[]>([
        { paso: 0, accion: 'Estado inicial', jarraA: 8, jarraB: 0, jarraC: 0 }
    ])
    const [solucionVisible, setSolucionVisible] = useState(false)
    const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'info' } | null>(null)

    const registroRef = useRef<HTMLDivElement>(null)
    const touchStartJarra = useRef<number | null>(null)

    // Derived state
    const isWon = jarras[0].actual === 4 && jarras[1].actual === 4
    const isValidTarget = (idx: number) => {
        if (draggingJarra === null || draggingJarra === idx) return false
        const from = jarras[draggingJarra]
        const to = jarras[idx]
        return from.actual > 0 && to.actual < to.capacidad
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
        setMovimientos(0)
        setRegistro([{ paso: 0, accion: 'Estado inicial', jarraA: 8, jarraB: 0, jarraC: 0 }])
        setSolucionVisible(false)
        setMensaje(null)
        touchStartJarra.current = null
    }

    const toggleSolucion = () => {
        setSolucionVisible(!solucionVisible)
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="game-root">
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

                .game-root {
                    min-height: 100dvh;
                    background: linear-gradient(165deg, var(--navy-900) 0%, var(--navy-800) 40%, #0c1a30 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    padding: 16px;
                    font-family: 'Inter', system-ui, sans-serif;
                    position: relative;
                    overflow-x: hidden;
                }

                /* Subtle background grid */
                .game-root::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
                    background-size: 48px 48px;
                    pointer-events: none;
                    z-index: 0;
                }

                .game-root > * {
                    position: relative;
                    z-index: 1;
                }

                /* ─── Header ────────────────────────────── */
                .game-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: rgba(255,255,255,0.5);
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 8px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .btn-back:hover {
                    color: white;
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.15);
                }
                .btn-back:active { transform: scale(0.96); }

                .game-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.35rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    flex: 1;
                }

                .moves-pill {
                    background: linear-gradient(135deg, var(--navy-600), var(--navy-700));
                    border: 1px solid rgba(96,165,250,0.15);
                    border-radius: 100px;
                    padding: 6px 16px;
                    font-size: 13px;
                    color: var(--blue-400);
                    font-weight: 600;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .moves-pill strong {
                    color: white;
                    font-size: 15px;
                }

                /* ─── Objective Banner ───────────────────── */
                .objective-banner {
                    background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03));
                    border: 1px solid rgba(245,158,11,0.15);
                    border-left: 3px solid var(--amber-500);
                    border-radius: 12px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                }
                .objective-banner p {
                    color: rgba(255,255,255,0.65);
                    font-size: 13px;
                    line-height: 1.6;
                    margin: 0;
                }
                .objective-banner strong {
                    color: var(--amber-400);
                    font-weight: 700;
                }

                /* ─── Message ────────────────────────────── */
                .game-message {
                    max-width: 640px;
                    width: 100%;
                    margin: 0 auto 16px;
                    padding: 14px 20px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 600;
                    text-align: center;
                    animation: msgIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
                }
                .game-message.msg-success {
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.3);
                    color: var(--emerald-400);
                }
                .game-message.msg-info {
                    background: rgba(6,182,212,0.1);
                    border: 1px solid rgba(6,182,212,0.25);
                    color: var(--cyan-300);
                }

                @keyframes msgIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* ─── Main Layout ────────────────────────── */
                .game-layout {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                @media (min-width: 1024px) {
                    .game-layout {
                        flex-direction: row;
                        gap: 32px;
                    }
                    .game-left { width: 58%; }
                    .game-right { width: 42%; }
                }

                /* ─── Jugs Section ───────────────────────── */
                .jugs-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .jugs-instruction {
                    text-align: center;
                    margin-bottom: 24px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                    line-height: 1.5;
                }
                .jugs-instruction .highlight {
                    color: var(--amber-400);
                    font-weight: 700;
                }

                .jugs-row {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    align-items: flex-end;
                    margin-bottom: 20px;
                    width: 100%;
                }

                @media (min-width: 640px) {
                    .jugs-row { gap: 28px; }
                }
                @media (min-width: 1024px) {
                    .jugs-row { gap: 36px; }
                }

                /* ─── Jug Wrapper ────────────────────────── */
                .jug-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    position: relative;
                    border-radius: 16px;
                    padding: 12px 8px 10px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: grab;
                    user-select: none;
                    background: transparent;
                }

                .jug-wrapper:active { cursor: grabbing; }

                .jug-wrapper.is-dragging {
                    transform: scale(1.06) translateY(-4px);
                    background: rgba(245,158,11,0.06);
                    box-shadow:
                        0 0 0 2px var(--amber-500),
                        0 0 30px rgba(245,158,11,0.15),
                        0 20px 50px rgba(0,0,0,0.4);
                    z-index: 100;
                }

                .jug-wrapper.is-drop-target {
                    background: rgba(6,182,212,0.08);
                    box-shadow:
                        0 0 0 2px var(--cyan-500),
                        0 0 25px rgba(6,182,212,0.2);
                    transform: scale(1.03);
                }

                .jug-wrapper.is-valid-target {
                    background: rgba(6,182,212,0.04);
                    box-shadow: 0 0 0 1px rgba(6,182,212,0.2);
                    animation: targetPulse 1.5s ease-in-out infinite;
                }

                .jug-wrapper.is-winner {
                    animation: winnerGlow 1.2s ease-in-out infinite alternate;
                }

                @keyframes targetPulse {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(6,182,212,0.15); }
                    50% { box-shadow: 0 0 0 2px rgba(6,182,212,0.35), 0 0 15px rgba(6,182,212,0.1); }
                }

                @keyframes winnerGlow {
                    from { box-shadow: 0 0 0 1px rgba(251,191,36,0.3), 0 0 15px rgba(251,191,36,0.1); }
                    to { box-shadow: 0 0 0 2px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.2); }
                }

                /* ─── Jug Labels ─────────────────────────── */
                .jug-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    font-weight: 800;
                    padding: 3px 12px;
                    border-radius: 100px;
                    white-space: nowrap;
                    letter-spacing: 0.5px;
                    animation: badgePop 0.25s cubic-bezier(0.34,1.56,0.64,1);
                    z-index: 10;
                }
                .badge-origin {
                    background: var(--amber-500);
                    color: #1a0e00;
                }
                .badge-destiny {
                    background: var(--cyan-500);
                    color: #001a20;
                }
                .badge-hint {
                    background: rgba(6,182,212,0.2);
                    color: var(--cyan-300);
                    border: 1px solid rgba(6,182,212,0.3);
                    font-weight: 600;
                    font-size: 9px;
                }

                @keyframes badgePop {
                    from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.8); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }

                .jug-name {
                    font-family: 'Playfair Display', serif;
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--blue-400);
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }

                .jug-svg-container {
                    filter: drop-shadow(0 8px 24px rgba(0,0,0,0.4));
                    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
                }
                .jug-wrapper:hover .jug-svg-container {
                    transform: translateY(-3px);
                }
                .jug-wrapper.is-dragging .jug-svg-container {
                    transform: translateY(-6px);
                }

                .water-body {
                    transition: y 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1);
                }
                .water-shimmer {
                    transition: y 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1);
                }

                .jug-amount {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                    margin-top: 2px;
                }
                .jug-amount-number {
                    font-family: 'Playfair Display', serif;
                    font-size: 26px;
                    font-weight: 900;
                    color: var(--cyan-400);
                    line-height: 1;
                    transition: color 0.3s;
                }
                .jug-amount.is-full .jug-amount-number {
                    color: var(--amber-400);
                }
                .jug-amount.is-empty .jug-amount-number {
                    color: rgba(255,255,255,0.25);
                }
                .jug-amount-unit {
                    font-size: 11px;
                    color: rgba(255,255,255,0.35);
                    font-weight: 400;
                }

                .jug-fill-bar {
                    width: 60%;
                    height: 3px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-top: 2px;
                }
                .jug-fill-track {
                    height: 100%;
                    background: linear-gradient(90deg, var(--cyan-500), var(--cyan-300));
                    border-radius: 100px;
                    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
                }
                .jug-amount.is-full + .jug-fill-bar .jug-fill-track {
                    background: linear-gradient(90deg, var(--amber-500), var(--amber-400));
                }

                /* ─── Sidebar ────────────────────────────── */
                .game-right {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .controls-row {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }
                @media (min-width: 1024px) {
                    .controls-row { justify-content: flex-end; }
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    white-space: nowrap;
                }
                .btn:active { transform: scale(0.96); }

                .btn-reset {
                    background: var(--navy-600);
                    color: var(--blue-400);
                    border: 1px solid rgba(96,165,250,0.2);
                }
                .btn-reset:hover {
                    background: var(--navy-500);
                    color: white;
                    border-color: rgba(96,165,250,0.35);
                }

                .btn-solution {
                    background: linear-gradient(135deg, var(--amber-500), #d97706);
                    color: #1a0e00;
                    box-shadow: 0 2px 12px rgba(245,158,11,0.2);
                }
                .btn-solution:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 20px rgba(245,158,11,0.3);
                }

                /* ─── Glass Card ─────────────────────────── */
                .glass-card {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px;
                    padding: 16px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .card-header {
                    font-family: 'Playfair Display', serif;
                    font-size: 15px;
                    font-weight: 700;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: sticky;
                    top: 0;
                    padding-bottom: 8px;
                    z-index: 2;
                }

                /* ─── Steps Timeline ─────────────────────── */
                .steps-scroll {
                    max-height: 360px;
                    overflow-y: auto;
                    padding-right: 4px;
                    scroll-behavior: smooth;
                }
                .steps-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .steps-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .steps-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 100px;
                }

                .step-card {
                    display: flex;
                    gap: 12px;
                    animation: stepIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
                }

                @keyframes stepIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .step-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex-shrink: 0;
                    width: 16px;
                }
                .step-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--blue-500);
                    border: 2px solid var(--navy-700);
                    flex-shrink: 0;
                    margin-top: 4px;
                }
                .step-initial .step-dot {
                    background: var(--cyan-500);
                }
                .step-latest .step-dot {
                    background: var(--amber-400);
                    box-shadow: 0 0 8px rgba(251,191,36,0.4);
                }
                .step-line {
                    width: 2px;
                    flex: 1;
                    min-height: 24px;
                    background: rgba(59,130,246,0.15);
                    margin: 2px 0;
                }

                .step-content {
                    flex: 1;
                    padding-bottom: 14px;
                    min-width: 0;
                }

                .step-header {
                    margin-bottom: 2px;
                }
                .step-number {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--blue-400);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .step-initial .step-number {
                    color: var(--cyan-400);
                }
                .step-latest .step-number {
                    color: var(--amber-400);
                }

                .step-action {
                    font-size: 13px;
                    color: var(--cyan-300);
                    font-weight: 500;
                    margin-bottom: 6px;
                    line-height: 1.4;
                }

                .step-state {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .state-chip {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-family: 'Inter', monospace;
                    letter-spacing: 0.3px;
                }
                .chip-a {
                    background: rgba(59,130,246,0.12);
                    color: var(--blue-400);
                    border: 1px solid rgba(59,130,246,0.2);
                }
                .chip-b {
                    background: rgba(6,182,212,0.12);
                    color: var(--cyan-400);
                    border: 1px solid rgba(6,182,212,0.2);
                }
                .chip-c {
                    background: rgba(245,158,11,0.1);
                    color: var(--amber-400);
                    border: 1px solid rgba(245,158,11,0.15);
                }

                /* ─── Solution Panel ─────────────────────── */
                .solution-panel {
                    animation: solutionIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
                }

                @keyframes solutionIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .solution-step {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .solution-step:last-child { border-bottom: none; }

                .solution-step-num {
                    width: 24px;
                    height: 24px;
                    border-radius: 8px;
                    background: rgba(16,185,129,0.15);
                    color: var(--emerald-400);
                    font-size: 12px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .solution-step-text {
                    flex: 1;
                    font-size: 13px;
                    color: rgba(255,255,255,0.7);
                    line-height: 1.5;
                }
                .solution-step-state {
                    font-size: 11px;
                    font-family: 'Inter', monospace;
                    color: rgba(255,255,255,0.35);
                    background: rgba(255,255,255,0.04);
                    padding: 3px 8px;
                    border-radius: 6px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .solution-success {
                    margin-top: 12px;
                    padding: 12px;
                    background: rgba(16,185,129,0.08);
                    border: 1px solid rgba(16,185,129,0.2);
                    border-radius: 12px;
                    text-align: center;
                    font-size: 13px;
                    color: var(--emerald-400);
                    font-weight: 600;
                }

                /* ─── Progress Indicator ─────────────────── */
                .progress-section {
                    margin-bottom: 8px;
                }
                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: rgba(255,255,255,0.35);
                    margin-bottom: 6px;
                    font-weight: 500;
                }
                .progress-label span:last-child {
                    color: var(--cyan-400);
                    font-weight: 700;
                }
                .progress-bar {
                    height: 4px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 100px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    border-radius: 100px;
                    transition: width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.3s;
                }

                /* ─── Win Overlay ────────────────────────── */
                .win-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: overlayIn 0.3s ease;
                    padding: 20px;
                }
                @keyframes overlayIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .win-card {
                    background: linear-gradient(145deg, var(--navy-700), var(--navy-800));
                    border: 1px solid rgba(251,191,36,0.2);
                    border-radius: 24px;
                    padding: 32px;
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                    animation: winCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
                    box-shadow: 0 0 60px rgba(251,191,36,0.1), 0 25px 50px rgba(0,0,0,0.5);
                }
                @keyframes winCardIn {
                    from { opacity: 0; transform: scale(0.85) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .win-emoji {
                    font-size: 48px;
                    margin-bottom: 12px;
                    animation: winBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
                }
                @keyframes winBounce {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                .win-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 24px;
                    font-weight: 900;
                    color: var(--amber-400);
                    margin-bottom: 8px;
                }
                .win-text {
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                    line-height: 1.6;
                    margin-bottom: 20px;
                }
                .win-moves {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 4px;
                    background: rgba(251,191,36,0.1);
                    border: 1px solid rgba(251,191,36,0.2);
                    border-radius: 12px;
                    padding: 8px 20px;
                    margin-bottom: 20px;
                }
                .win-moves-num {
                    font-family: 'Playfair Display', serif;
                    font-size: 28px;
                    font-weight: 900;
                    color: var(--amber-400);
                }
                .win-moves-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                    font-weight: 500;
                }
                .win-btn {
                    background: linear-gradient(135deg, var(--amber-500), #d97706);
                    color: #1a0e00;
                    border: none;
                    border-radius: 14px;
                    padding: 12px 32px;
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .win-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 24px rgba(245,158,11,0.3);
                }
                .win-btn:active { transform: scale(0.97); }

                /* ─── Mobile spacing fix ─────────────────── */
                @media (max-width: 639px) {
                    .game-root { padding: 12px; }
                    .game-title { font-size: 1.1rem; }
                    .moves-pill { padding: 5px 12px; font-size: 12px; }
                    .moves-pill strong { font-size: 13px; }
                    .jug-wrapper { padding: 10px 4px 8px; }
                    .jug-amount-number { font-size: 22px; }
                    .jug-name { font-size: 12px; }
                    .objective-banner { padding: 10px 14px; }
                    .objective-banner p { font-size: 12px; }
                }

                @media (min-width: 640px) and (max-width: 1023px) {
                    .game-root { padding: 20px; }
                }
            `}</style>

            {/* Header */}
            <header className="game-header">
                <button
                    onClick={() => navigate(-1)}
                    className="btn-back"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <h1 className="game-title">🫙 Las Tres Jarras</h1>

                <div className="moves-pill">
                    Mov. <strong>{movimientos}</strong>
                </div>
            </header>

            {/* Objective */}
            <div className="objective-banner">
                <p>
                    Se tiene una jarra de <strong>8 litros</strong> (llena),
                    una de <strong>5 litros</strong> y una de <strong>3 litros</strong>
                    (ambas vacías). Sin marcas de medida, ¿cuántos pasos necesitas para obtener <strong>4 litros</strong>?
                </p>
            </div>

            {/* Main Layout */}
            <div className="game-layout">
                {/* Left: Game Area */}
                <div className="game-left jugs-section">
                    {/* Message */}
                    {mensaje && mensaje.tipo === 'info' && (
                        <div className="game-message msg-info">
                            {mensaje.texto}
                        </div>
                    )}

                    {/* Instruction */}
                    <div className="jugs-instruction">
                        <span className="highlight">Arrastra</span> una jarra sobre otra para trasvasar ·
                        Funciona con <span className="highlight">tocar y arrastrar</span> en tablets
                    </div>

                    {/* Progress */}
                    <div className="progress-section" style={{ width: '100%', maxWidth: 420 }}>
                        <div className="progress-label">
                            <span>Progreso hacia la meta</span>
                            <span>
                                {jarras[0].actual === 4 ? '✓ A=4' : `A=${jarras[0].actual}`}
                                {' · '}
                                {jarras[1].actual === 4 ? '✓ B=4' : `B=${jarras[1].actual}`}
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${((jarras[0].actual === 4 ? 50 : 0) + (jarras[1].actual === 4 ? 50 : 0))}%`,
                                    background: isWon
                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                        : 'linear-gradient(90deg, #0891b2, #22d3ee)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Jugs */}
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
                                isWinner={isWon && (idx === 0 || idx === 1)}
                                idx={idx}
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

                {/* Right: Controls + Log + Solution */}
                <aside className="game-right">
                    {/* Controls */}
                    <div className="controls-row">
                        <button onClick={resetGame} className="btn btn-reset">
                            🔄 Reiniciar
                        </button>
                        <button onClick={toggleSolucion} className="btn btn-solution">
                            💡 {solucionVisible ? 'Ocultar' : 'Ver'} solución
                        </button>
                    </div>

                    {/* Log */}
                    <div className="glass-card" style={{ flex: 1 }}>
                        <div className="card-header" style={{ color: 'var(--amber-400)' }}>
                            📋 Registro de pasos
                        </div>
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
                    </div>

                    {/* Solution */}
                    {solucionVisible && (
                        <div className="glass-card solution-panel">
                            <div className="card-header" style={{ color: 'var(--emerald-400)' }}>
                                ✅ Solución óptima (7 pasos)
                            </div>
                            <div>
                                {SOLUCION.map((paso, idx) => (
                                    <div key={idx} className="solution-step">
                                        <div className="solution-step-num">{paso.paso}</div>
                                        <div className="solution-step-text">{paso.accion}</div>
                                        <div className="solution-step-state">
                                            A:{paso.estado[0]} B:{paso.estado[1]} C:{paso.estado[2]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="solution-success">
                                🎉 Jarra A = <strong>4L</strong> y Jarra B = <strong>4L</strong>. ¡Misión cumplida!
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* Win Overlay */}
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
                                style={{ padding: '12px 24px' }}
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