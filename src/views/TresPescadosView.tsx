import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Fish {
    id: number
    faceA: boolean // true = cocinada
    faceB: boolean // true = cocinada
    flipped: boolean // false = faceA arriba, true = faceB arriba
    location: 'raw' | 'pan-0' | 'pan-1' | 'done'
}

interface PanTimer {
    fishId: number | null
    faceStart: number
    side: 'A' | 'B'
}

interface Mensaje {
    texto: string
    tipo: 'exito' | 'info' | 'error'
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_PER_FACE = 60 // segundos por cara (1 minuto)
const OPTIMAL_TIME = 180 // segundos (3 minutos)

// ─── Fish SVG Component ─────────────────────────────────────────────────────
function FishSVG({ fish, size = 'md' }: { fish: Fish; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        xs: 'w-[45px] h-auto',
        sm: 'w-[53px] h-auto',
        md: 'w-[95px] h-auto',
        lg: 'w-[190px] h-auto'
    }

    // faceA = la cara que está abajo cuando flipped=false
    // faceB = la cara que está abajo cuando flipped=true
    const downCooked = !fish.flipped ? fish.faceA : fish.faceB
    const upCooked = !fish.flipped ? fish.faceB : fish.faceA

    const bodyColor = downCooked ? '#7a3a10' : upCooked ? '#b06030' : '#f0b870'
    const bellyColor = downCooked ? '#9a4a1a' : upCooked ? '#c87040' : '#e09858'
    const finColor = downCooked ? '#5a2a08' : '#d08040'
    const eyeColor = '#2a1500'

    const grillMarks = downCooked
        ? `<line x1="5" y1="-5" x2="42" y2="7" stroke="rgba(0,0,0,0.22)" stroke-width="2.8" stroke-linecap="round"/>
           <line x1="12" y1="-9" x2="48" y2="3" stroke="rgba(0,0,0,0.14)" stroke-width="1.8" stroke-linecap="round"/>`
        : ''

    return (
        <svg viewBox="-14 -26 96 52" xmlns="http://www.w3.org/2000/svg" className={sizeClasses[size]} overflow-visible>
            {/* Aleta trasera */}
            <polygon points="-14,-13 -14,13 -26,19 -26,-19" fill={finColor} opacity="0.9" />

            {/* Cuerpo */}
            <ellipse cx="26" cy="0" rx="38" ry="17" fill={bodyColor} />
            <ellipse cx="28" cy="5" rx="27" ry="9" fill={bellyColor} opacity="0.65" />

            {/* Aleta superior */}
            <polygon points="8,-19 30,-19 19,-29" fill={finColor} opacity="0.85" />

            {/* Aleta inferior */}
            <ellipse cx="18" cy="8" rx="11" ry="4.5" fill={finColor} opacity="0.7" transform="rotate(18 18 8)" />

            {/* Marcas de parrilla */}
            <g dangerouslySetInnerHTML={{ __html: grillMarks }} />

            {/* Ojo */}
            <circle cx="52" cy="-3" r="5" fill="rgba(255,255,255,0.85)" />
            <circle cx="53" cy="-3" r="3" fill={eyeColor} />
            <circle cx="54" cy="-4.5" r="1.1" fill="white" opacity="0.5" />

            {/* Cola */}
            <path d="M66 2 Q68 5 66 7" stroke={eyeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
    )
}

function FaceDots({ fish }: { fish: Fish }) {
    return (
        <div className="flex gap-2 mt-1">
            <div
                className={`w-3 h-3 rounded-full border-2 border-black/25 ${fish.faceA ? 'bg-[#8B4513]' : 'bg-[#f4c080]'}`}
                title="Cara A"
            />
            <div
                className={`w-3 h-3 rounded-full border-2 border-black/25 ${fish.faceB ? 'bg-[#8B4513]' : 'bg-[#f4c080]'}`}
                title="Cara B"
            />
        </div>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function TresPescadosView() {
    const navigate = useNavigate()

    const [fish, setFish] = useState<Fish[]>([
        { id: 0, faceA: false, faceB: false, flipped: false, location: 'raw' },
        { id: 1, faceA: false, faceB: false, flipped: false, location: 'raw' },
        { id: 2, faceA: false, faceB: false, flipped: false, location: 'raw' }
    ])

    const [panTimers, setPanTimers] = useState<(PanTimer | null)[]>([null, null])
    const [secondsElapsed, setSecondsElapsed] = useState(0)
    const [isCooking, setIsCooking] = useState(false)
    const [draggingFishId, setDraggingFishId] = useState<number | null>(null)
    const [dropTarget, setDropTarget] = useState<string | null>(null)
    const [mensaje, setMensaje] = useState<Mensaje | null>(null)

    const timerRef = useRef<number | null>(null)
    const touchStartFishRef = useRef<number | null>(null)

    // ── Actions ───────────────────────────────────────────────────────────────
    const startCooking = () => {
        if (isCooking) return

        // Verificar que haya al menos un pescado en la sartén
        const inPan = fish.filter(fi => fi.location.startsWith('pan'))
        if (inPan.length === 0) {
            setMensaje({ texto: '¡Coloca al menos un pescado en la sartén!', tipo: 'info' })
            return
        }

        setIsCooking(true)
        setMensaje(null)
    }

    const resetGame = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        setSecondsElapsed(0)
        setIsCooking(false)
        setPanTimers([null, null])
        setDraggingFishId(null)
        setDropTarget(null)
        setMensaje(null)
        setFish([
            { id: 0, faceA: false, faceB: false, flipped: false, location: 'raw' as const },
            { id: 1, faceA: false, faceB: false, flipped: false, location: 'raw' as const },
            { id: 2, faceA: false, faceB: false, flipped: false, location: 'raw' as const }
        ])
    }

    const flipFish = (id: number) => {
        if (isCooking) {
            setMensaje({ texto: '¡Espera a que termine de cocinar!', tipo: 'info' })
            return
        }

        const f = fish[id]
        if (!f.location.startsWith('pan')) return

        const slot = parseInt(f.location.split('-')[1])
        cookFace(id, slot)

        setFish(fish.map(fi => fi.id === id ? { ...fi, flipped: !fi.flipped } : fi))
        setPanTimers(prev => {
            const newTimers = [...prev]
            newTimers[slot] = {
                fishId: id,
                faceStart: secondsElapsed,
                side: !f.flipped ? 'B' : 'A'
            }
            return newTimers
        })

        setMensaje({ texto: `Pescado ${id + 1} volteado 🔄`, tipo: 'info' })
        setTimeout(() => {
            setMensaje(m => (m?.tipo !== 'exito' ? null : m))
        }, 1400)
    }

    const cookFace = (fishId: number, slot: number) => {
        const t = panTimers[slot]
        if (!t || t.fishId === null || t.fishId !== fishId) return

        const elapsed = secondsElapsed - t.faceStart
        if (elapsed >= MIN_PER_FACE) {
            const f = fish[fishId]
            if (!f.flipped) {
                setFish(prevFish => prevFish.map(fi => fi.id === fishId ? { ...fi, faceA: true } : fi))
            } else {
                setFish(prevFish => prevFish.map(fi => fi.id === fishId ? { ...fi, faceB: true } : fi))
            }
        }
    }

    const handleDragStart = (id: number) => {
        if (isCooking) {
            setMensaje({ texto: '¡Espera a que termine de cocinar!', tipo: 'info' })
            return
        }
        setDraggingFishId(id)
    }

    const handleDragOver = (e: React.DragEvent, target: string) => {
        e.preventDefault()
        if (draggingFishId !== null) {
            setDropTarget(target)
        }
    }

    const handleDragLeave = () => {
        setDropTarget(null)
    }

    const handleDrop = (e: React.DragEvent, target: string, slot?: number) => {
        e.preventDefault()
        if (draggingFishId === null) return

        const f = fish[draggingFishId]

        if (target === 'pan' && slot !== undefined) {
            const loc: 'pan-0' | 'pan-1' = `pan-${slot}` as 'pan-0' | 'pan-1'

            // Verificar si está ocupado
            if (f.location === loc) return
            if (fish.some(fi => fi.location === loc)) {
                setMensaje({ texto: '¡Ese espacio está ocupado!', tipo: 'error' })
                return
            }

            // Verificar máximo 2 en sartén
            const inPan = fish.filter(fi => fi.location.startsWith('pan')).length
            if (!f.location.startsWith('pan') && inPan >= 2) {
                setMensaje({ texto: '¡La sartén solo tiene 2 espacios!', tipo: 'error' })
                return
            }

            // Si ya estaba en sartén, cocinar la cara que estaba abajo
            if (f.location.startsWith('pan')) {
                const oldSlot = parseInt(f.location.split('-')[1])
                cookFace(draggingFishId, oldSlot)
                setPanTimers(prev => {
                    const newTimers = [...prev]
                    newTimers[oldSlot] = null
                    return newTimers
                })
            }

            setFish(fish.map(fi => fi.id === draggingFishId ? { ...fi, location: loc as Fish['location'] } : fi))
            setPanTimers(prev => {
                const newTimers = [...prev]
                newTimers[slot] = {
                    fishId: draggingFishId,
                    faceStart: secondsElapsed,
                    side: f.flipped ? 'B' : 'A'
                }
                return newTimers
            })
        } else if (target === 'done') {
            if (!f.faceA || !f.faceB) {
                setMensaje({ texto: '¡Aún le falta una cara por freír!', tipo: 'error' })
                return
            }

            if (f.location.startsWith('pan')) {
                const slot = parseInt(f.location.split('-')[1])
                setPanTimers(prev => {
                    const newTimers = [...prev]
                    newTimers[slot] = null
                    return newTimers
                })
            }

            setFish(fish.map(fi => fi.id === draggingFishId ? { ...fi, location: 'done' as Fish['location'] } : fi))
        } else if (target === 'raw') {
            if (!f.location.startsWith('pan')) return

            const slot = parseInt(f.location.split('-')[1])
            cookFace(draggingFishId, slot)
            setPanTimers(prev => {
                const newTimers = [...prev]
                newTimers[slot] = null
                return newTimers
            })

            setFish(fish.map(fi => fi.id === draggingFishId ? { ...fi, location: 'raw' as Fish['location'] } : fi))
        }

        setDraggingFishId(null)
        setDropTarget(null)
    }

    const handleTouchStart = (id: number) => {
        if (isCooking) {
            setMensaje({ texto: '¡Espera a que termine de cocinar!', tipo: 'info' })
            return
        }
        touchStartFishRef.current = id
        setDraggingFishId(id)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault()
        const touch = e.touches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const target = element?.closest('[data-drop-target]')

        if (target) {
            const targetType = target.getAttribute('data-drop-target')
            const slotStr = target.getAttribute('data-slot')
            const slot = slotStr ? parseInt(slotStr) : undefined
            if (targetType) {
                setDropTarget(targetType + (slot !== undefined ? `-${slot}` : ''))
            }
        } else {
            setDropTarget(null)
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault()
        const touch = e.changedTouches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
        const target = element?.closest('[data-drop-target]')

        if (target && draggingFishId !== null) {
            const targetType = target.getAttribute('data-drop-target')
            const slotStr = target.getAttribute('data-slot')
            const slot = slotStr ? parseInt(slotStr) : undefined

            if (targetType === 'pan' && slot !== undefined) {
                handleDrop(e as any, 'pan', slot)
            } else if (targetType === 'done') {
                handleDrop(e as any, 'done')
            } else if (targetType === 'raw') {
                handleDrop(e as any, 'raw')
            }
        }

        setDraggingFishId(null)
        setDropTarget(null)
        touchStartFishRef.current = null
    }

    // ── Timer Effect ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isCooking) return

        const currentMinute = Math.floor(secondsElapsed / 60)
        const nextMinuteTarget = (currentMinute + 1) * 60

        // Timer acelerado: 60 segundos de juego = 7 segundos reales
        // Intervalo de 117ms = ~8.57 veces más rápido que 1000ms
        timerRef.current = window.setInterval(() => {
            setSecondsElapsed(prev => {
                const newSeconds = prev + 1

                // Auto-cook faces cuando se completa un minuto
                for (let slot = 0; slot < 2; slot++) {
                    const t = panTimers[slot]
                    if (t && t.fishId !== null) {
                        const elapsed = newSeconds - t.faceStart
                        if (elapsed >= MIN_PER_FACE) {
                            const f = fish[t.fishId]
                            if (!f.flipped) {
                                setFish(fi => fi.map(fi2 => fi2.id === t.fishId ? { ...fi2, faceA: true } : fi2))
                            } else {
                                setFish(fi => fi.map(fi2 => fi2.id === t.fishId ? { ...fi2, faceB: true } : fi2))
                            }
                        }
                    }
                }

                // Detener cuando llega al siguiente minuto completo
                if (newSeconds >= nextMinuteTarget) {
                    setIsCooking(false)
                    if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                    }
                }

                return newSeconds
            })
        }, 117) // 1000ms / 8.57 ≈ 117ms para acelerar ~8.6x

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isCooking, panTimers])

    // ── Check Win ─────────────────────────────────────────────────────────
    const checkWin = () => {
        if (fish.every(f => f.location === 'done')) {
            if (timerRef.current) clearInterval(timerRef.current)

            const m = Math.floor(secondsElapsed / 60)
            const s = secondsElapsed % 60
            const time = `${m}:${s.toString().padStart(2, '0')}`
            const optimal = secondsElapsed <= OPTIMAL_TIME

            setMensaje({
                texto: `🎉 ¡Listo! Tiempo: ${time} ${optimal ? '— ¡Tiempo óptimo! ✅' : '— El mínimo posible es 3:00. ¡Inténtalo de nuevo!'}`,
                tipo: 'exito'
            })
        }
    }

    useEffect(() => {
        checkWin()
    }, [fish])

    // ── Progress Calculation ─────────────────────────────────────────────────
    const totalFaces = 6
    const cookedFaces = fish.reduce((sum, f) => (f.faceA ? 1 : 0) + (f.faceB ? 1 : 0) + sum, 0)
    const progressPercent = (cookedFaces / totalFaces) * 100

    // ── Time Format ───────────────────────────────────────────────────────────
    const m = Math.floor(secondsElapsed / 60)
    const s = secondsElapsed % 60
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh bg-[#1a1200] text-[#f5e6c8] flex flex-col px-6 py-3">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap');

                .fish-wrapper {
                    cursor: grab;
                    user-select: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    transition: transform 0.15s;
                }

                .fish-wrapper:hover {
                    transform: scale(1.1);
                }

                .fish-wrapper:active {
                    cursor: grabbing;
                }

                .fish-wrapper.dragging {
                    opacity: 0.35;
                }

                .fish-wrapper.selected {
                    box-shadow: 0 0 0 2px #f0a500, 0 0 20px rgba(240,165,0,0.25);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .nuevo {
                    animation: fadeIn 0.35s ease;
                }
            `}</style>

            {/* Header con botón Volver y título */}
            <header className="px-4 pt-4 pb-3 shrink-0 flex items-center">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="flex-1 text-center pr-16">
                    <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-black text-[#f0a500]">
                        🐟 El Reto de los Tres Pescados
                    </h1>
                    <p className="text-[#b89a60] text-sm mt-1 font-light">
                        Fríe los 3 pescados en el menor tiempo posible
                    </p>
                </div>
            </header>

            {/* Reglas */}
            <div className="flex gap-1.5 flex-wrap justify-center p-2 max-w-4xl mx-auto w-full mb-3">
                <div className="bg-[#241a04] border border-[#2e2008] rounded-lg px-2.5 py-1 text-[#b89a60] text-xs flex items-center gap-1">
                    🍳 <span className="text-[#f0a500] font-bold">Máx. 2</span> en la sartén
                </div>
                <div className="bg-[#241a04] border border-[#2e2008] rounded-lg px-2.5 py-1 text-[#b89a60] text-xs flex items-center gap-1">
                    ⏱️ <span className="text-[#f0a500] font-bold">1 min</span> por cara
                </div>
                <div className="bg-[#241a04] border border-[#2e2008] rounded-lg px-2.5 py-1 text-[#b89a60] text-xs flex items-center gap-1">
                    ↕️ <span className="text-[#f0a500] font-bold">Doble clic</span> para voltear
                </div>
                <div className="bg-[#241a04] border border-[#2e2008] rounded-lg px-2.5 py-1 text-[#b89a60] text-xs flex items-center gap-1">
                    ↔️ <span className="text-[#f0a500] font-bold">Arrastrar</span> para mover / sacar
                </div>
            </div>

            {/* HUD */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 p-2 w-full flex-wrap">
                {/* Timer */}
                <div className="flex flex-col items-center bg-[#241a04] border-2 border-[#c07800] rounded-xl px-4 py-1 min-w-[90px]">
                    <div className="text-xs text-[#b89a60] tracking-widest uppercase">Tiempo</div>
                    <div className={`font-['Playfair_Display',serif] text-2xl font-black text-[#f0a500] leading-none tabular-nums transition-colors ${secondsElapsed > OPTIMAL_TIME ? 'text-[#e05030]' : ''}`}>
                        {timeStr}
                    </div>
                </div>

                {/* Controles */}
                <div className="flex flex-col items-center gap-1.5">
                    <div className="flex gap-2">
                        <button
                            onClick={startCooking}
                            disabled={isCooking}
                            className="bg-linear-to-r from-[#f0a500] to-[#c07800] text-[#1a0e00] border-none rounded-lg px-4 py-2 text-sm font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#f0a500]/30 disabled:opacity-50 disabled:cursor-default disabled:transform-none disabled:shadow-none"
                        >
                            🍳 Cocinar
                        </button>
                        <button
                            onClick={resetGame}
                            className="bg-[#2e2008] text-[#b89a60] border border-[#444] rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer transition-all hover:bg-[#3a2a10] hover:text-[#f5e6c8]"
                        >
                            ↺ Reiniciar
                        </button>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex flex-col items-center gap-0.5">
                    <div className="text-xs text-[#b89a60] tracking-widest uppercase">Caras fritas</div>
                    <div className="w-32 h-1.5 bg-[#2e2008] rounded-full overflow-hidden mt-1">
                        <div
                            className="h-full bg-linear-to-r from-[#4caf50] to-[#8bc34a] rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="text-sm text-[#b89a60]">
                        {cookedFaces} / {totalFaces}
                    </div>
                </div>
            </div>

            {/* Mensaje */}
            {mensaje && (
                <div className={`max-w-xl w-full mx-auto p-2.5 rounded-lg text-sm font-bold text-center mb-2 ${mensaje.tipo === 'exito'
                    ? 'bg-[#4caf50]/15 border border-[#4caf50] text-[#4caf50]'
                    : mensaje.tipo === 'error'
                        ? 'bg-[#e05030]/10 border border-[#e05030] text-[#e05030]'
                        : 'bg-[#f0a500]/8 border border-[#c07800] text-[#f0a500]'
                    }`}>
                    {mensaje.texto}
                </div>
            )}

            {/* Game Area */}
            <div className="mt-5 flex gap-0.5 sm:gap-2 items-start justify-center w-full max-w-[1400px] mx-auto">
                {/* Plato Sin Freír */}
                <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-[#b89a60] font-bold tracking-widest uppercase">🐟 Sin freír</div>
                    <div
                        className={`w-[154px] sm:w-[266px] h-[154px] sm:h-[266px] rounded-full bg-radial-gradient from-[#e8e0d0] to-[#d0c8b8] shadow-[0_4px_18px_rgba(0,0,0,0.5)] border-3 border-[#c8b890] relative flex flex-wrap items-center justify-center gap-1 p-3.5 transition-shadow ${dropTarget === 'raw' ? 'shadow-[0_0_0_3px_#4caf50,0_4px_18px_rgba(76,175,80,0.25)]' : ''
                            }`}
                        data-drop-target="raw"
                        onDragOver={(e) => handleDragOver(e, 'raw')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'raw')}
                    >
                        {fish.filter(f => f.location === 'raw').map(f => (
                            <div
                                key={f.id}
                                className="fish-wrapper"
                                draggable
                                onDragStart={() => handleDragStart(f.id)}
                                onDragEnd={() => setDraggingFishId(null)}
                                onTouchStart={() => handleTouchStart(f.id)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={(e) => handleTouchEnd(e)}
                                onDoubleClick={() => flipFish(f.id)}
                                style={{ touchAction: 'none' }}
                            >
                                <FishSVG fish={f} size="md" />
                                <FaceDots fish={f} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sartén */}
                <div className="flex flex-col items-center gap-1 flex-1 min-w-[220px] sm:min-w-[440px]">
                    <div className="text-xs text-[#b89a60] font-bold tracking-widest uppercase">🍳 Sartén</div>
                    <div className="relative w-full flex justify-center">
                        <div className="w-[266px] sm:w-[518px] relative">
                            {/* SVG Sartén */}
                            <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                                {/* Mango */}
                                <rect x="242" y="90" width="54" height="20" rx="10" fill="#111" />
                                <rect x="244" y="92" width="50" height="16" rx="8" fill="#222" />

                                {/* Sombra */}
                                <ellipse cx="148" cy="106" rx="126" ry="86" fill="rgba(0,0,0,0.3)" />

                                {/* Exterior */}
                                <ellipse cx="145" cy="100" rx="126" ry="86" fill="#252525" />
                                <ellipse cx="145" cy="100" rx="126" ry="86" fill="none" stroke="#3a3a3a" strokeWidth="5" />

                                {/* Interior */}
                                <ellipse cx="145" cy="100" rx="108" ry="72" fill="#1a1a1a" />

                                {/* Brillo aceite */}
                                <ellipse cx="118" cy="82" rx="36" ry="14" fill="rgba(255,200,80,0.05)" transform="rotate(-12 118 82)" />
                                <ellipse cx="175" cy="110" rx="22" ry="9" fill="rgba(255,200,80,0.04)" transform="rotate(8 175 110)" />

                                {/* Vapor */}
                                {isCooking && (
                                    <g stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" fill="none">
                                        <path d="M75 35 Q80 22 75 10">
                                            <animate attributeName="opacity" values="0;0.7;0" dur="2.2s" begin="0s" repeatCount="indefinite" />
                                        </path>
                                        <path d="M145 24 Q150 12 145 0">
                                            <animate attributeName="opacity" values="0;0.7;0" dur="2.2s" begin="0.8s" repeatCount="indefinite" />
                                        </path>
                                        <path d="M205 35 Q210 22 205 10">
                                            <animate attributeName="opacity" values="0;0.7;0" dur="2.2s" begin="1.6s" repeatCount="indefinite" />
                                        </path>
                                    </g>
                                )}
                            </svg>

                            {/* Slots */}
                            <div className="absolute top-[17%] left-[11%] w-[78%] h-[63%] flex gap-[5%] items-center justify-center">
                                {[0, 1].map(slot => {
                                    const f = fish.find(fi => fi.location === `pan-${slot}`)
                                    return (
                                        <div
                                            key={slot}
                                            className={`flex-1 h-full rounded-[40%] border-2 border-dashed border-white/10 flex items-center justify-center transition-all relative ${dropTarget === `pan-${slot}` ? 'border-[#f0a500] bg-[#f0a500]/10' : ''
                                                } ${f ? 'border-solid border-transparent' : ''}`}
                                            data-drop-target="pan"
                                            data-slot={slot}
                                            onDragOver={(e) => handleDragOver(e, `pan-${slot}`)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'pan', slot)}
                                        >
                                            {f ? (
                                                <div
                                                    className="fish-wrapper"
                                                    draggable
                                                    onDragStart={() => handleDragStart(f.id)}
                                                    onDragEnd={() => setDraggingFishId(null)}
                                                    onTouchStart={() => handleTouchStart(f.id)}
                                                    onTouchMove={handleTouchMove}
                                                    onTouchEnd={(e) => handleTouchEnd(e)}
                                                    onDoubleClick={() => flipFish(f.id)}
                                                    style={{ touchAction: 'none' }}
                                                >
                                                    <FishSVG fish={f} size="lg" />
                                                    <FaceDots fish={f} />
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-[#b89a60] text-center opacity-65 mt-0.5">
                        Arrastra un pescado a la sartén · Doble clic para voltear · Arrastra fuera para sacar
                    </div>
                </div>

                {/* Plato Listos */}
                <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-[#b89a60] font-bold tracking-widest uppercase">✅ Listos</div>
                    <div
                        className={`w-[154px] sm:w-[266px] h-[154px] sm:h-[266px] rounded-full bg-radial-gradient from-[#e8e0d0] to-[#d0c8b8] shadow-[0_4px_18px_rgba(0,0,0,0.5)] border-3 border-[#c8b890] relative flex flex-wrap items-center justify-center gap-1 p-3.5 transition-shadow ${dropTarget === 'done' ? 'shadow-[0_0_0_3px_#4caf50,0_4px_18px_rgba(76,175,80,0.25)]' : ''
                            }`}
                        data-drop-target="done"
                        onDragOver={(e) => handleDragOver(e, 'done')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'done')}
                    >
                        {fish.filter(f => f.location === 'done').map(f => (
                            <div
                                key={f.id}
                                className="fish-wrapper"
                            >
                                <FishSVG fish={f} size="md" />
                                <FaceDots fish={f} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}