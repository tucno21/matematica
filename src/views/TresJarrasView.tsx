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

// ─── SVG Water Component ─────────────────────────────────────────────────────
function JarraSVG({
    capacidad,
    actual,
    nombre,
    dragging,
    dropTarget,
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
    idx: number
    onDragStart: () => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onTouchStart: () => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
}) {
    const config = {
        8: { width: 120, height: 204, waterTop: 14, waterHeight: 154, capY: 194 },
        5: { width: 101, height: 174, waterTop: 12, waterHeight: 126, capY: 166 },
        3: { width: 82, height: 146, waterTop: 10, waterHeight: 101, capY: 138 }
    }

    const svgConfig = config[capacidad as keyof typeof config]

    if (!svgConfig) return null

    const ratio = actual / capacidad
    const waterH = svgConfig.waterHeight * ratio
    const waterY = svgConfig.waterTop + svgConfig.waterHeight - waterH

    return (
        <div
            className={`jarra-wrapper ${dragging ? 'selected dragging' : ''} ${dropTarget ? 'drop-target' : ''}`}
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
            <div className="select-hint">ORIGEN ✓</div>
            <div className="jarra-label">JARRA {nombre}</div>
            <div className="jarra-svg-wrap">
                <svg width={svgConfig.width} height={svgConfig.height} viewBox={`0 0 ${svgConfig.width} ${svgConfig.height}`}>
                    <defs>
                        <clipPath id={`clip${capacidad}`}>
                            <rect
                                x={capacidad === 8 ? 16 : capacidad === 5 ? 13 : 11}
                                y={capacidad === 8 ? 14 : capacidad === 5 ? 12 : 10}
                                width={capacidad === 8 ? 89 : capacidad === 5 ? 75 : 60}
                                height={capacidad === 8 ? 154 : capacidad === 5 ? 126 : 101}
                                rx={capacidad === 8 ? 6 : 5}
                            />
                        </clipPath>
                        <linearGradient id={`wg${capacidad}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7fd4f0" />
                            <stop offset="100%" stopColor="#1e8bb5" />
                        </linearGradient>
                    </defs>
                    <rect
                        id={`water-${capacidad}`}
                        x={capacidad === 8 ? 17 : capacidad === 5 ? 14 : 12}
                        y={waterY}
                        width={capacidad === 8 ? 86 : capacidad === 5 ? 72 : 58}
                        height={waterH}
                        fill={`url(#wg${capacidad})`}
                        clipPath={`url(#clip${capacidad})`}
                        opacity="0.88"
                        style={{ transition: 'y 0.45s cubic-bezier(.4,0,.2,1), height 0.45s cubic-bezier(.4,0,.2,1)' }}
                    />
                    <rect
                        x={capacidad === 8 ? 16 : capacidad === 5 ? 13 : 11}
                        y={capacidad === 8 ? 14 : capacidad === 5 ? 12 : 10}
                        width={capacidad === 8 ? 89 : capacidad === 5 ? 75 : 60}
                        height={capacidad === 8 ? 154 : capacidad === 5 ? 126 : 101}
                        rx={capacidad === 8 ? 6 : 5}
                        fill="rgba(20,50,80,0.3)"
                        stroke="#4a7fa8"
                        strokeWidth="3"
                    />
                    {/* Handle */}
                    <path
                        d={capacidad === 8
                            ? "M104 46 Q127 46 127 91 Q127 136 104 136"
                            : capacidad === 5
                                ? "M88 36 Q108 36 108 74 Q108 112 88 112"
                                : "M71 29 Q89 29 89 60 Q89 91 71 91"
                        }
                        fill="none"
                        stroke="#4a7fa8"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    {/* Marks */}
                    {[...Array(capacidad)].map((_, i) => {
                        const markY = svgConfig.waterTop + (svgConfig.waterHeight / capacidad) * i
                        const isEdge = i === 0 || i === capacidad
                        return (
                            <line
                                key={i}
                                x1={capacidad === 8 ? 16 : capacidad === 5 ? 13 : 11}
                                y1={markY}
                                x2={isEdge
                                    ? (capacidad === 8 ? 26 : capacidad === 5 ? 24 : 20)
                                    : (capacidad === 8 ? 24 : capacidad === 5 ? 23 : 19)
                                }
                                y2={markY}
                                stroke="#4a7fa8"
                                strokeWidth={isEdge ? 1.4 : 1}
                                opacity={isEdge ? 1 : 0.5}
                            />
                        )
                    })}
                    {/* Shine effect */}
                    <rect
                        x={capacidad === 8 ? 20 : capacidad === 5 ? 18 : 16}
                        y={capacidad === 8 ? 19 : capacidad === 5 ? 17 : 14}
                        width={capacidad === 8 ? 10 : capacidad === 5 ? 8 : 7}
                        height={svgConfig.waterHeight * 0.5}
                        rx={capacidad === 8 ? 5 : capacidad === 5 ? 4 : 3.5}
                        fill="white"
                        opacity="0.05"
                    />
                    <text
                        x={svgConfig.width / 2}
                        y={svgConfig.capY}
                        textAnchor="middle"
                        fill="#4a7fa8"
                        fontSize="11"
                        fontFamily="Lato, sans-serif"
                    >
                        cap. {capacidad} L
                    </text>
                </svg>
            </div>
            <div className={`litros-display ${actual === capacidad ? 'llena' : actual === 0 ? 'vacia' : ''}`}>
                {actual}
            </div>
            <div className="capacidad-display">litros</div>
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
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: 'exito' | 'info' } | null>(null)

    const registroRef = useRef<HTMLDivElement>(null)
    const touchStartJarra = useRef<number | null>(null)

    // ── Actions ───────────────────────────────────────────────────────────────
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
            setTimeout(() => setMensaje(null), 2200)
            setDraggingJarra(null)
            setDragOverJarra(null)
            return
        }

        if (toJarra.actual === toJarra.capacidad) {
            setMensaje({ texto: `La Jarra ${toJarra.nombre} está llena.`, tipo: 'info' })
            setTimeout(() => setMensaje(null), 2200)
            setDraggingJarra(null)
            setDragOverJarra(null)
            return
        }

        const disponible = fromJarra.actual
        const espacio = toJarra.capacidad - toJarra.actual
        const trasvasado = Math.min(disponible, espacio)

        const newJarras = jarras.map((jarra, idx) => ({
            ...jarra,
            actual: idx === fromIdx ? jarra.actual - trasvasado : idx === toIdx ? jarra.actual + trasvasado : jarra.actual
        }))

        setJarras(newJarras)
        setDraggingJarra(null)
        setDragOverJarra(null)

        const newMovimientos = movimientos + 1
        setMovimientos(newMovimientos)

        const nuevoPaso: RegistroPaso = {
            paso: newMovimientos,
            accion: `Jarra ${fromJarra.nombre} → Jarra ${toJarra.nombre} (${trasvasado} L)`,
            jarraA: newJarras[0].actual,
            jarraB: newJarras[1].actual,
            jarraC: newJarras[2].actual
        }
        setRegistro(prev => [...prev, nuevoPaso])

        // Scroll to bottom of registro
        setTimeout(() => {
            registroRef.current?.scrollTo({
                top: registroRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }, 100)

        // Check win condition
        if (newJarras[0].actual === 4 && newJarras[1].actual === 4) {
            setMensaje({
                texto: `🎉 ¡Lo lograste en ${newMovimientos} movimientos! La Jarra A y la Jarra B tienen exactamente 4 litros cada una.`,
                tipo: 'exito'
            })
        }
    }

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

    const handleTouchStart = (idx: number) => {
        touchStartJarra.current = idx
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault()
        const touch = e.touches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const jarraElement = element?.closest('.jarra-wrapper')
        if (jarraElement) {
            const jarraIdx = parseInt(jarraElement.getAttribute('data-idx') || '-1')
            if (jarraIdx !== -1 && touchStartJarra.current !== null && jarraIdx !== touchStartJarra.current) {
                setDragOverJarra(jarraIdx)
            }
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touch = e.changedTouches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const jarraElement = element?.closest('.jarra-wrapper')

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
        <div className="min-h-dvh bg-[#0e1a2b] text-white flex flex-col px-4 py-6 sm:px-6 sm:py-8">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap');

                .jarra-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                    border-radius: 12px;
                    padding: 8px;
                    transition: box-shadow 0.2s, transform 0.2s ease-out, opacity 0.2s ease-out;
                    cursor: grab;
                    user-select: none;
                }

                .jarra-wrapper:active {
                    cursor: grabbing;
                }

                .jarra-wrapper.selected {
                    box-shadow: 0 0 0 2px #f0a500, 0 0 20px rgba(240,165,0,0.25);
                }

                .jarra-wrapper.dragging {
                    transform: scale(1.08);
                    box-shadow: 0 0 0 3px #f0a500, 0 0 30px rgba(240,165,0,0.35), 0 15px 40px rgba(0,0,0,0.5);
                    z-index: 100;
                    opacity: 0.9;
                }

                .jarra-wrapper.drop-target {
                    box-shadow: 0 0 0 2px #3ab5e0, 0 0 20px rgba(58,181,224,0.25);
                }

                .jarra-label {
                    font-family: 'Playfair Display', serif;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #8aadcc;
                    letter-spacing: 1px;
                }

                .jarra-svg-wrap {
                    filter: drop-shadow(0 6px 18px rgba(0,0,0,0.4));
                    transition: transform 0.2s;
                }

                .jarra-wrapper:hover .jarra-svg-wrap {
                    transform: translateY(-3px);
                }

                .litros-display {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.6rem;
                    font-weight: 900;
                    color: #3ab5e0;
                    transition: color 0.3s, transform 0.2s;
                }

                .litros-display.llena {
                    color: #f0a500;
                }

                .litros-display.vacia {
                    color: #8aadcc;
                }

                .capacidad-display {
                    font-size: 0.72rem;
                    color: #8aadcc;
                    font-weight: 300;
                }

                .select-hint {
                    position: absolute;
                    top: -28px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #f0a500;
                    color: #1a1000;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 10px;
                    border-radius: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                }

                .jarra-wrapper.selected .select-hint {
                    opacity: 1;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-6px); }
                    to { opacity: 1; }
                }

                .nuevo {
                    animation: fadeIn 0.35s ease;
                }
            `}</style>

            {/* Header */}
            <header className="flex items-center gap-3 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 text-sm font-bold border border-white/10 shrink-0 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                        🫙 Las Tres Jarras
                    </h1>
                </div>
            </header>

            {/* Objetivo */}
            <div className="bg-[#162236] border-l-4 border-[#f0a500] rounded-xl p-1.5 w-full mb-2">
                <p className="text-[#8aadcc] text-xs sm:text-sm leading-relaxed">
                    Se tiene una jarra de <strong className="text-[#f0a500]">8 litros</strong> (llena),
                    una de <strong className="text-[#f0a500]">5 litros</strong> y una de <strong className="text-[#f0a500]">3 litros</strong>
                    (ambas vacías) ninguna tiene marcas de medida, ¿Cuántos pasos es necesario para obtener 4 litros?
                </p>
            </div>


            {/* Container principal con layout responsive */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Columna izquierda: Juego */}
                <div className="w-full lg:w-[60%] flex flex-col">

                    {/* Instrucciones */}
                    <div className="w-full text-center mb-5 sm:mb-6">
                        <p className="text-[#8aadcc] text-xs">
                            <span className="text-[#f0a500] font-bold">Arrastra</span> una jarra y suéltala sobre otra para trasvasar el agua.
                            También puedes <span className="text-[#f0a500] font-bold">tocar y arrastrar</span> en dispositivos táctiles.
                        </p>
                    </div>
                    {/* Mensaje */}
                    {mensaje && (
                        <div className={`max-w-3xl w-full mb-5 p-4 rounded-xl text-sm font-bold text-center ${mensaje.tipo === 'exito'
                            ? 'bg-[#2ecc71]/15 border border-[#2ecc71] text-[#2ecc71]'
                            : 'bg-[#3ab5e0]/10 border border-[#3ab5e0] text-[#7fd4f0]'
                            }`}>
                            {mensaje.texto}
                        </div>
                    )}

                    {/* Jarras */}
                    <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 justify-between mb-5 sm:mb-6">
                        {jarras.map((jarra, idx) => (
                            <JarraSVG
                                key={idx}
                                capacidad={jarra.capacidad}
                                actual={jarra.actual}
                                nombre={jarra.nombre}
                                dragging={draggingJarra === idx}
                                dropTarget={dragOverJarra === idx}
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

                    {/* Movimientos */}
                    <div className="bg-[#1e3050] rounded-full px-5 py-2 text-sm text-[#8aadcc] mb-5 sm:mb-6 text-center">
                        Movimientos: <strong className="text-white">{movimientos}</strong>
                    </div>
                </div>

                {/* Columna derecha: Controles, Registro y Solución */}
                <aside className="w-full lg:w-[40%] flex flex-col gap-5">
                    {/* Controles */}
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
                        <button
                            onClick={resetGame}
                            className="px-5 py-2.5 rounded-xl bg-[#1e3050] text-[#8aadcc] border border-[#4a7fa8] text-sm font-bold hover:bg-[#2a4a6a] hover:text-white transition-all active:scale-95"
                        >
                            🔄 Reiniciar
                        </button>
                        <button
                            onClick={toggleSolucion}
                            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-[#f0a500] to-[#e07b00] text-[#1a1000] text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#f0a500]/30 transition-all active:scale-95"
                        >
                            💡 Ver solución
                        </button>
                    </div>

                    {/* Registro - Visible en móvil y pantallas grandes */}
                    <div
                        ref={registroRef}
                        className="bg-[#162236] border border-[#1e3050] rounded-xl p-4 sm:p-5 lg:max-h-96 overflow-y-auto"
                    >
                        <div className="font-bold text-[#f0a500] mb-3 font-['Playfair_Display',serif] text-sm sm:text-base sticky top-0 bg-[#162236] pb-2">
                            📋 Registro de pasos
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-[#8aadcc] font-bold p-2 text-center border-b border-[#1e3050] text-[10px] sm:text-xs tracking-wider">
                                            Paso
                                        </th>
                                        <th className="text-[#8aadcc] font-bold p-2 text-center border-b border-[#1e3050] text-[10px] sm:text-xs tracking-wider">
                                            Acción
                                        </th>
                                        <th className="text-[#8aadcc] font-bold p-2 text-center border-b border-[#1e3050] text-[10px] sm:text-xs tracking-wider">
                                            Jarra A (8L)
                                        </th>
                                        <th className="text-[#8aadcc] font-bold p-2 text-center border-b border-[#1e3050] text-[10px] sm:text-xs tracking-wider">
                                            Jarra B (5L)
                                        </th>
                                        <th className="text-[#8aadcc] font-bold p-2 text-center border-b border-[#1e3050] text-[10px] sm:text-xs tracking-wider">
                                            Jarra C (3L)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registro.map((paso, idx) => (
                                        <tr key={idx} className={idx > 0 ? 'nuevo' : ''}>
                                            <td className="p-2 text-center border-b border-white/4 text-[10px] sm:text-xs font-bold text-[#8aadcc]">
                                                {paso.paso}
                                            </td>
                                            <td className="p-2 text-center border-b border-white/4 text-[#7fd4f0]">
                                                {paso.accion}
                                            </td>
                                            <td className="p-2 text-center border-b border-white/4">
                                                {paso.jarraA}
                                            </td>
                                            <td className="p-2 text-center border-b border-white/4">
                                                {paso.jarraB}
                                            </td>
                                            <td className="p-2 text-center border-b border-white/4">
                                                {paso.jarraC}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Solución */}
                    {solucionVisible && (
                        <div className="bg-[#162236] border border-[#1e3050] rounded-xl p-4 sm:p-5 animate-[fadeIn_0.4s_ease]">
                            <div className="font-bold text-[#2ecc71] mb-3 font-['Playfair_Display',serif] text-sm sm:text-base sticky top-0 bg-[#162236] pb-2">
                                ✅ Solución paso a paso
                            </div>
                            <div className="space-y-2">
                                {SOLUCION.map((paso, idx) => (
                                    <div key={idx} className="flex gap-3 items-center p-1.5 text-xs sm:text-sm border-b border-white/4 last:border-0">
                                        <span className="text-[#8aadcc] font-bold min-w-4.5">{paso.paso}.</span>
                                        <span className="text-[#7fd4f0] flex-1">{paso.accion}</span>
                                        <span className="text-[#8aadcc] text-[10px] sm:text-xs font-mono bg-[#1e3050] px-2 py-1 rounded">
                                            A:{paso.estado[0]} B:{paso.estado[1]} C:{paso.estado[2]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-3 bg-[#2ecc71]/10 rounded-lg text-xs sm:text-sm text-[#2ecc71] text-center">
                                🎉 Jarra A = <strong>4L</strong> y Jarra B = <strong>4L</strong>. ¡Misión cumplida!
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    )
}