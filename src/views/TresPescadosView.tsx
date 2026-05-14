import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Fish {
    id: number
    faceA: boolean
    faceB: boolean
    flipped: boolean
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
const MIN_PER_FACE = 60
const OPTIMAL_TIME = 180

// ─── Fish SVG ────────────────────────────────────────────────────────────────
function FishSVG({ fish, size = 'md' }: { fish: Fish; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
    const sizeMap = {
        xs: 'w-[40px] h-auto',
        sm: 'w-[50px] h-auto',
        md: 'w-[80px] h-auto',
        lg: 'w-[130px] h-auto',
        xl: 'w-[80px] h-auto'
    }

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
        <svg viewBox="-14 -26 96 52" xmlns="http://www.w3.org/2000/svg" className={sizeMap[size]} overflow="visible">
            <polygon points="-14,-13 -14,13 -26,19 -26,-19" fill={finColor} opacity="0.9" />
            <ellipse cx="26" cy="0" rx="38" ry="17" fill={bodyColor} />
            <ellipse cx="28" cy="5" rx="27" ry="9" fill={bellyColor} opacity="0.65" />
            <polygon points="8,-19 30,-19 19,-29" fill={finColor} opacity="0.85" />
            <ellipse cx="18" cy="8" rx="11" ry="4.5" fill={finColor} opacity="0.7" transform="rotate(18 18 8)" />
            <g dangerouslySetInnerHTML={{ __html: grillMarks }} />
            <circle cx="52" cy="-3" r="5" fill="rgba(255,255,255,0.85)" />
            <circle cx="53" cy="-3" r="3" fill={eyeColor} />
            <circle cx="54" cy="-4.5" r="1.1" fill="white" opacity="0.5" />
            <path d="M66 2 Q68 5 66 7" stroke={eyeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
    )
}

// ─── Face Indicator ──────────────────────────────────────────────────────────
function FaceIndicator({ fish, compact = false }: { fish: Fish; compact?: boolean }) {
    return (
        <div className={`face-indicator ${compact ? 'face-compact' : ''}`}>
            <div className="face-side">
                <div className={`face-dot ${fish.faceA ? 'dot-cooked' : 'dot-raw'}`} />
                {!compact && <span className="face-label">A</span>}
            </div>
            <div className="face-divider" />
            <div className="face-side">
                <div className={`face-dot ${fish.faceB ? 'dot-cooked' : 'dot-raw'}`} />
                {!compact && <span className="face-label">B</span>}
            </div>
        </div>
    )
}

// ─── Cooking Progress Ring ───────────────────────────────────────────────────
function CookingRing({ progress, isCooking }: { progress: number; isCooking: boolean }) {
    const circumference = 2 * Math.PI * 46
    const offset = circumference - circumference * Math.min(progress, 1)

    return (
        <svg className="cooking-ring-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
            {isCooking && progress > 0 && (
                <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke={progress >= 1 ? '#4caf50' : '#f0a500'}
                    strokeWidth="3.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="cooking-ring-progress"
                />
            )}
            {progress >= 1 && (
                <text x="50" y="54" textAnchor="middle" fill="#4caf50" fontSize="16" fontWeight="800">✓</text>
            )}
        </svg>
    )
}

// ─── Flames SVG ──────────────────────────────────────────────────────────────
function FlamesSVG({ active }: { active: boolean }) {
    if (!active) return null

    return (
        <svg className="flames-svg" viewBox="0 0 240 36" preserveAspectRatio="xMidYMid meet">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <g key={i}>
                    <path
                        d={`M${20 + i * 32} 36 Q${24 + i * 32} ${20 + (i % 3) * 3} ${28 + i * 32} 36`}
                        fill="#ff6a00"
                        opacity="0.85"
                    >
                        <animate
                            attributeName="d"
                            values={`
                                M${20 + i * 32} 36 Q${24 + i * 32} ${20 + (i % 3) * 3} ${28 + i * 32} 36;
                                M${20 + i * 32} 36 Q${24 + i * 32} ${14 + (i % 2) * 4} ${28 + i * 32} 36;
                                M${20 + i * 32} 36 Q${24 + i * 32} ${20 + (i % 3) * 3} ${28 + i * 32} 36
                            `}
                            dur={`${0.3 + i * 0.07}s`}
                            repeatCount="indefinite"
                        />
                    </path>
                    <path
                        d={`M${23 + i * 32} 36 Q${25 + i * 32} ${26 + (i % 2) * 2} ${27 + i * 32} 36`}
                        fill="#ffcc00"
                        opacity="0.9"
                    >
                        <animate
                            attributeName="d"
                            values={`
                                M${23 + i * 32} 36 Q${25 + i * 32} ${26 + (i % 2) * 2} ${27 + i * 32} 36;
                                M${23 + i * 32} 36 Q${25 + i * 32} ${20 + (i % 3) * 2} ${27 + i * 32} 36;
                                M${23 + i * 32} 36 Q${25 + i * 32} ${26 + (i % 2) * 2} ${27 + i * 32} 36
                            `}
                            dur={`${0.25 + i * 0.05}s`}
                            repeatCount="indefinite"
                        />
                    </path>
                </g>
            ))}
        </svg>
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
    const [showWin, setShowWin] = useState(false)

    const timerRef = useRef<number | null>(null)

    // Ref inteligente para diferenciar entre arrastre y doble toque en móviles
    const touchState = useRef({
        fishId: null as number | null,
        startX: 0,
        startY: 0,
        isDragging: false,
        lastTapTime: 0
    })

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // ── Core Actions ──────────────────────────────────────────────────────────
    const startCooking = () => {
        if (isCooking) return

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
        setShowWin(false)
        setFish([
            { id: 0, faceA: false, faceB: false, flipped: false, location: 'raw' as const },
            { id: 1, faceA: false, faceB: false, flipped: false, location: 'raw' as const },
            { id: 2, faceA: false, faceB: false, flipped: false, location: 'raw' as const }
        ])
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

    const flipFish = (id: number) => {
        if (isCooking) {
            setMensaje({ texto: '¡Espera a que termine de cocinar!', tipo: 'info' })
            return
        }

        const f = fish[id]
        if (!f.location.startsWith('pan')) return

        const slot = parseInt(f.location.split('-')[1])
        cookFace(id, slot)

        const newFace = !f.flipped ? 'B' : 'A'

        setFish(fish.map(fi => fi.id === id ? { ...fi, flipped: !fi.flipped } : fi))
        setPanTimers(prev => {
            const newTimers = [...prev]
            newTimers[slot] = {
                fishId: id,
                faceStart: secondsElapsed,
                side: newFace as 'A' | 'B'
            }
            return newTimers
        })

        setMensaje({ texto: `Pescado ${id + 1} volteado 🔄`, tipo: 'info' })
        setTimeout(() => {
            setMensaje(m => (m?.tipo !== 'exito' ? null : m))
        }, 1400)
    }

    // ── Drag & Drop (Mouse) ───────────────────────────────────────────────────
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

            if (f.location === loc) return
            if (fish.some(fi => fi.location === loc)) {
                setMensaje({ texto: '¡Ese espacio está ocupado!', tipo: 'error' })
                setDraggingFishId(null)
                setDropTarget(null)
                return
            }

            const inPan = fish.filter(fi => fi.location.startsWith('pan')).length
            if (!f.location.startsWith('pan') && inPan >= 2) {
                setMensaje({ texto: '¡La sartén solo tiene 2 espacios!', tipo: 'error' })
                setDraggingFishId(null)
                setDropTarget(null)
                return
            }

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
                setDraggingFishId(null)
                setDropTarget(null)
                return
            }

            if (f.location.startsWith('pan')) {
                const s = parseInt(f.location.split('-')[1])
                setPanTimers(prev => {
                    const newTimers = [...prev]
                    newTimers[s] = null
                    return newTimers
                })
            }

            setFish(fish.map(fi => fi.id === draggingFishId ? { ...fi, location: 'done' as Fish['location'] } : fi))

        } else if (target === 'raw') {
            if (!f.location.startsWith('pan')) return

            const s = parseInt(f.location.split('-')[1])
            cookFace(draggingFishId, s)
            setPanTimers(prev => {
                const newTimers = [...prev]
                newTimers[s] = null
                return newTimers
            })

            setFish(fish.map(fi => fi.id === draggingFishId ? { ...fi, location: 'raw' as Fish['location'] } : fi))
        }

        setDraggingFishId(null)
        setDropTarget(null)
    }

    // ── Touch Handlers (Smart Drag vs Double Tap) ────────────────────────────
    const handleTouchStart = (e: React.TouchEvent, id: number) => {
        if (isCooking) {
            setMensaje({ texto: '¡Espera a que termine de cocinar!', tipo: 'info' })
            return
        }
        const touch = e.touches[0]
        touchState.current = {
            fishId: id,
            startX: touch.clientX,
            startY: touch.clientY,
            isDragging: false,
            lastTapTime: touchState.current.lastTapTime // Mantener el tiempo del último toque
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault()
        if (touchState.current.fishId === null) return

        const touch = e.touches[0]
        const dx = touch.clientX - touchState.current.startX
        const dy = touch.clientY - touchState.current.startY

        // Si nos movemos más de 8px, consideramos que es un arrastre, no un toque
        if (!touchState.current.isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            touchState.current.isDragging = true
            setDraggingFishId(touchState.current.fishId)
        }

        if (touchState.current.isDragging) {
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
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault()
        const currentId = touchState.current.fishId

        if (touchState.current.isDragging) {
            // Ejecutar lógica de soltar arrastre
            const touch = e.changedTouches[0]
            const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
            const target = element?.closest('[data-drop-target]')

            if (target && currentId !== null) {
                const targetType = target.getAttribute('data-drop-target')
                const slotStr = target.getAttribute('data-slot')
                const slot = slotStr ? parseInt(slotStr) : undefined

                if (targetType === 'pan' && slot !== undefined) handleDrop(e as any, 'pan', slot)
                else if (targetType === 'done') handleDrop(e as any, 'done')
                else if (targetType === 'raw') handleDrop(e as any, 'raw')
            }
        } else {
            // Fue un toque (tap). Verificar doble toque.
            const now = Date.now()
            if (now - touchState.current.lastTapTime < 300 && currentId !== null) {
                flipFish(currentId)
                touchState.current.lastTapTime = 0 // Resetear para evitar triples toques
            } else {
                touchState.current.lastTapTime = now
            }
        }

        // Limpiar estado visual
        setDraggingFishId(null)
        setDropTarget(null)
        touchState.current.fishId = null
        touchState.current.isDragging = false
    }

    // ── Timer Effect ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isCooking) return

        const currentMinute = Math.floor(secondsElapsed / 60)
        const nextMinuteTarget = (currentMinute + 1) * 60

        timerRef.current = window.setInterval(() => {
            setSecondsElapsed(prev => {
                const newSeconds = prev + 1

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

                if (newSeconds >= nextMinuteTarget) {
                    setIsCooking(false)
                    if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                    }
                }

                return newSeconds
            })
        }, 117)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isCooking, panTimers])

    // ── Check Win ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (fish.every(f => f.location === 'done')) {
            if (timerRef.current) clearInterval(timerRef.current)

            const time = formatTime(secondsElapsed)
            const optimal = secondsElapsed <= OPTIMAL_TIME

            setMensaje({
                texto: `🎉 ¡Listo! Tiempo: ${time} ${optimal ? '— ¡Tiempo óptimo! ✅' : '— El mínimo posible es 3:00. ¡Inténtalo de nuevo!'}`,
                tipo: 'exito'
            })
            setShowWin(true)
        }
    }, [fish])

    // ── Derived State ─────────────────────────────────────────────────────────
    const totalFaces = 6
    const cookedFaces = fish.reduce((sum, f) => (f.faceA ? 1 : 0) + (f.faceB ? 1 : 0) + sum, 0)
    const progressPercent = (cookedFaces / totalFaces) * 100
    const timeStr = formatTime(secondsElapsed)
    const isWon = fish.every(f => f.location === 'done')

    const getCookingProgress = (slot: number) => {
        const t = panTimers[slot]
        if (!t || t.fishId === null) return 0
        return Math.min(1, (secondsElapsed - t.faceStart) / MIN_PER_FACE)
    }

    const isValidDropTarget = (target: string) => {
        if (draggingFishId === null) return false
        const f = fish[draggingFishId]

        if (target.startsWith('pan-')) {
            const slot = parseInt(target.split('-')[1])
            const loc = `pan-${slot}` as Fish['location']
            if (f.location === loc) return false
            if (fish.some(fi => fi.location === loc)) return false
            const inPan = fish.filter(fi => fi.location.startsWith('pan')).length
            if (!f.location.startsWith('pan') && inPan >= 2) return false
            return true
        }
        if (target === 'done') {
            return f.faceA && f.faceB
        }
        if (target === 'raw') {
            return f.location.startsWith('pan')
        }
        return false
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="game-root">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');

                :root {
                    --bg-900: #0f0a04;
                    --bg-800: #1a1208;
                    --bg-700: #261c0e;
                    --bg-600: #332614;
                    --bg-500: #40301a;
                    --amber-300: #fcd34d;
                    --amber-400: #fbbf24;
                    --amber-500: #f59e0b;
                    --amber-600: #d97706;
                    --amber-700: #b45309;
                    --orange-500: #f97316;
                    --red-400: #f87171;
                    --emerald-400: #34d399;
                    --emerald-500: #10b981;
                    --cream: #f5e6c8;
                    --cream-dim: #b89a60;
                }

                .game-root {
                    min-height: 100dvh;
                    background: linear-gradient(170deg, var(--bg-900) 0%, var(--bg-800) 50%, #150e06 100%);
                    color: var(--cream);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 12px;
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow-x: hidden;
                    position: relative;
                }

                .game-root::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background-image:
                        radial-gradient(circle at 20% 80%, rgba(245,158,11,0.03) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(249,115,22,0.02) 0%, transparent 50%);
                    pointer-events: none;
                    z-index: 0;
                }

                .game-root > * { position: relative; z-index: 1; width: 100%; max-width: 1200px; }

                /* ─── Header ────────────────────────────── */
                .game-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }

                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: rgba(255,255,255,0.4);
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 7px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .btn-back:hover { color: white; background: rgba(255,255,255,0.08); }
                .btn-back:active { transform: scale(0.96); }

                .game-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--amber-400);
                    flex: 1;
                    text-align: center;
                    min-width: 0;
                }

                /* ─── Timer Circle ──────────────────────── */
                .timer-circle-wrap {
                    flex-shrink: 0;
                    width: 72px;
                    height: 72px;
                    position: relative;
                }

                .timer-svg {
                    width: 100%;
                    height: 100%;
                    transform: rotate(-90deg);
                }

                .timer-track {
                    fill: none;
                    stroke: rgba(255,255,255,0.06);
                    stroke-width: 4;
                }

                .timer-progress {
                    fill: none;
                    stroke: var(--amber-500);
                    stroke-width: 4;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 0.15s linear, stroke 0.3s;
                }

                .timer-progress.over-time {
                    stroke: var(--red-400);
                }

                .timer-text {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .timer-value {
                    font-family: 'Playfair Display', serif;
                    font-size: 16px;
                    font-weight: 900;
                    color: var(--amber-400);
                    line-height: 1;
                    transition: color 0.3s;
                }

                .timer-value.over-time { color: var(--red-400); }

                .timer-label {
                    font-size: 8px;
                    color: var(--cream-dim);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                    opacity: 0.6;
                }

                /* ─── Rules ─────────────────────────────── */
                .rules-row {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    justify-content: center;
                    margin-bottom: 10px;
                }

                .rule-chip {
                    background: var(--bg-700);
                    border: 1px solid rgba(245,158,11,0.12);
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 11px;
                    color: var(--cream-dim);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    white-space: nowrap;
                }
                .rule-chip strong { color: var(--amber-400); font-weight: 700; }

                /* ─── Progress Bar ──────────────────────── */
                .progress-section {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                    padding: 0 4px;
                }

                .progress-label {
                    font-size: 11px;
                    color: var(--cream-dim);
                    font-weight: 500;
                    white-space: nowrap;
                }

                .progress-track {
                    flex: 1;
                    height: 5px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 100px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 100px;
                    background: linear-gradient(90deg, var(--amber-600), var(--amber-400));
                    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
                }
                .progress-fill.complete {
                    background: linear-gradient(90deg, var(--emerald-500), var(--emerald-400));
                }

                .progress-count {
                    font-size: 12px;
                    font-weight: 800;
                    color: var(--amber-400);
                    min-width: 32px;
                    text-align: right;
                }

                /* ─── Message ────────────────────────────── */
                .game-message {
                    max-width: 600px;
                    width: 100%;
                    margin: 0 auto 8px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                    animation: msgPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
                }
                .msg-success { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: var(--emerald-400); }
                .msg-error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: var(--red-400); }
                .msg-info { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: var(--amber-400); }

                @keyframes msgPop {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* ─── Game Area ──────────────────────────── */
                .game-area {
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 8px;
                    flex: 1;
                    width: 100%;
                    padding-top: 16px;
                }

                @media (min-width: 640px) {
                    .game-area { gap: 50px; }
                }

                /* ─── Plate ─────────────────────────────── */
                .plate-zone {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .plate-label {
                    font-size: 10px;
                    color: var(--cream-dim);
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    text-align: center;
                }

                .plate {
                    width: 130px;
                    height: 130px;
                    border-radius: 50%;
                    background: radial-gradient(ellipse at 40% 35%, #f0ebe0, #d8d0c0 60%, #c8bfA8);
                    box-shadow:
                        0 4px 20px rgba(0,0,0,0.5),
                        inset 0 2px 8px rgba(255,255,255,0.15),
                        inset 0 -2px 6px rgba(0,0,0,0.1);
                    border: 3px solid #bfaf98;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    padding: 14px;
                    transition: box-shadow 0.25s, transform 0.25s;
                    position: relative;
                }

                .plate::after {
                    content: '';
                    position: absolute;
                    inset: 6px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(0,0,0,0.06);
                    pointer-events: none;
                }

                .plate.drop-active {
                    box-shadow:
                        0 0 0 3px var(--emerald-500),
                        0 0 24px rgba(16,185,129,0.25),
                        0 4px 20px rgba(0,0,0,0.5);
                    transform: scale(1.04);
                }

                .plate.valid-target {
                    box-shadow:
                        0 0 0 2px rgba(16,185,129,0.3),
                        0 0 12px rgba(16,185,129,0.1),
                        0 4px 20px rgba(0,0,0,0.5);
                    animation: platePulse 1.5s ease-in-out infinite;
                }

                @keyframes platePulse {
                    0%, 100% { box-shadow: 0 0 0 2px rgba(16,185,129,0.2), 0 4px 20px rgba(0,0,0,0.5); }
                    50% { box-shadow: 0 0 0 3px rgba(16,185,129,0.4), 0 0 16px rgba(16,185,129,0.15), 0 4px 20px rgba(0,0,0,0.5); }
                }

                @media (min-width: 640px) {
                    .plate { width: 200px; height: 200px; padding: 22px; }
                }
                @media (min-width: 1024px) {
                    .plate { width: 230px; height: 230px; padding: 26px; }
                }

                .plate-empty-text {
                    font-size: 10px;
                    color: rgba(0,0,0,0.15);
                    font-weight: 600;
                    text-align: center;
                    pointer-events: none;
                }

                /* ─── Pan Zone ───────────────────────────── */
                .pan-zone {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    min-width: 0;
                    max-width: 420px;
                }

                .pan-container {
                    position: relative;
                    width: 100%;
                }

                .pan-svg {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .pan-glow {
                    transition: filter 0.5s;
                }
                .pan-glow.cooking {
                    filter: drop-shadow(0 0 20px rgba(245,158,11,0.15));
                }

                .flames-svg {
                    position: absolute;
                    bottom: -8px;
                    left: 10%;
                    width: 80%;
                    height: 30px;
                    pointer-events: none;
                    z-index: -1;
                }

                .pan-slots {
                    position: absolute;
                    top: 15%;
                    left: 8%;
                    width: 68%;
                    height: 60%;
                    display: flex;
                    gap: 4%;
                    align-items: center;
                    justify-content: center;
                }

                .pan-slot {
                    flex: 1;
                    height: 100%;
                    border-radius: 40%;
                    border: 2px dashed rgba(255,255,255,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.25s;
                    position: relative;
                }

                .pan-slot.occupied {
                    border-color: transparent;
                }

                .pan-slot.drop-active {
                    border-color: var(--amber-400);
                    background: rgba(245,158,11,0.1);
                    box-shadow: 0 0 16px rgba(245,158,11,0.15);
                }

                .pan-slot.valid-target {
                    border-color: rgba(245,158,11,0.3);
                    animation: slotPulse 1.5s ease-in-out infinite;
                }

                @keyframes slotPulse {
                    0%, 100% { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.03); }
                    50% { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08); }
                }

                .slot-number {
                    position: absolute;
                    bottom: 4px;
                    right: 6px;
                    font-size: 9px;
                    color: rgba(255,255,255,0.12);
                    font-weight: 700;
                    pointer-events: none;
                }

                .pan-hint {
                    font-size: 10px;
                    color: var(--cream-dim);
                    opacity: 0.5;
                    text-align: center;
                    margin-top: 2px;
                }

                /* ─── Fish Wrapper ────────────────────────── */
                .fish-wrapper {
                    cursor: grab;
                    user-select: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s;
                    padding: 4px;
                }

                .fish-wrapper:hover { transform: scale(1.08); }
                .fish-wrapper:active { cursor: grabbing; }

                .fish-wrapper.is-dragging {
                    opacity: 0.3;
                    transform: scale(0.9);
                }

                .fish-wrapper.in-pan {
                    padding: 2px;
                }

                /* ─── Cooking Ring ────────────────────────── */
                .cooking-ring-svg {
                    position: absolute;
                    inset: -6px;
                    width: calc(100% + 12px);
                    height: calc(100% + 12px);
                    pointer-events: none;
                }

                .cooking-ring-progress {
                    transition: stroke-dashoffset 0.2s linear;
                }

                /* ─── Face Indicator ─────────────────────── */
                .face-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 3px;
                }

                .face-compact { gap: 3px; }

                .face-side {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .face-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid rgba(0,0,0,0.2);
                    transition: background 0.3s, box-shadow 0.3s;
                }
                .face-compact .face-dot { width: 10px; height: 10px; }

                .dot-raw { background: #f4c080; }
                .dot-cooked {
                    background: #8B4513;
                    box-shadow: 0 0 4px rgba(139,69,19,0.3);
                }

                .face-label {
                    font-size: 9px;
                    color: var(--cream-dim);
                    font-weight: 700;
                }

                .face-divider {
                    width: 1px;
                    height: 10px;
                    background: rgba(255,255,255,0.1);
                }

                .face-status {
                    font-size: 8px;
                    font-weight: 700;
                    margin-top: 1px;
                }
                .face-status.all-cooked { color: var(--emerald-400); }
                .face-status.partial { color: var(--amber-400); }

                /* ─── Flip Button ────────────────────────── */
                .flip-btn {
                    position: absolute;
                    bottom: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.75);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 5px 14px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    z-index: 10;
                    transition: background 0.2s, transform 0.2s;
                    font-family: 'Inter', sans-serif;
                    white-space: nowrap;
                }
                .flip-btn:hover {
                    background: rgba(245,158,11,0.8);
                    color: #1a0e00;
                    transform: translateX(-50%) scale(1.05);
                }
                .flip-btn:active {
                    transform: translateX(-50%) scale(0.95);
                }

                /* ─── Controls ────────────────────────────── */
                .controls-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 8px;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 9px 18px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    white-space: nowrap;
                    font-family: 'Inter', sans-serif;
                }
                .btn:active { transform: scale(0.96); }
                .btn:disabled { opacity: 0.45; cursor: default; transform: none; }

                .btn-cook {
                    background: linear-gradient(135deg, var(--amber-500), var(--amber-700));
                    color: #1a0e00;
                    box-shadow: 0 2px 12px rgba(245,158,11,0.2);
                }
                .btn-cook:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 20px rgba(245,158,11,0.3);
                }

                .btn-reset {
                    background: var(--bg-600);
                    color: var(--cream-dim);
                    border: 1px solid rgba(245,158,11,0.15);
                }
                .btn-reset:hover { background: var(--bg-500); color: var(--cream); }

                /* ─── Win Overlay ────────────────────────── */
                .win-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    animation: overlayIn 0.3s ease;
                }
                @keyframes overlayIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .win-card {
                    background: linear-gradient(145deg, var(--bg-700), var(--bg-800));
                    border: 1px solid rgba(245,158,11,0.2);
                    border-radius: 24px;
                    padding: 28px 32px;
                    text-align: center;
                    max-width: 380px;
                    width: 100%;
                    animation: winPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
                    box-shadow: 0 0 60px rgba(245,158,11,0.08), 0 25px 50px rgba(0,0,0,0.5);
                }
                @keyframes winPop {
                    from { opacity: 0; transform: scale(0.85) translateY(16px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                .win-emoji {
                    font-size: 44px;
                    margin-bottom: 8px;
                    animation: winBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
                }
                @keyframes winBounce {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }

                .win-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 22px;
                    font-weight: 900;
                    color: var(--amber-400);
                    margin-bottom: 6px;
                }

                .win-text {
                    font-size: 13px;
                    color: rgba(255,255,255,0.5);
                    margin-bottom: 16px;
                    line-height: 1.5;
                }

                .win-time-badge {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 4px;
                    background: rgba(245,158,11,0.1);
                    border: 1px solid rgba(245,158,11,0.2);
                    border-radius: 12px;
                    padding: 8px 20px;
                    margin-bottom: 16px;
                }
                .win-time-num {
                    font-family: 'Playfair Display', serif;
                    font-size: 26px;
                    font-weight: 900;
                    color: var(--amber-400);
                }
                .win-time-label {
                    font-size: 11px;
                    color: rgba(255,255,255,0.4);
                }

                .win-optimal {
                    display: inline-block;
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.25);
                    color: var(--emerald-400);
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    margin-bottom: 16px;
                }

                .win-not-optimal {
                    display: inline-block;
                    background: rgba(245,158,11,0.1);
                    border: 1px solid rgba(245,158,11,0.2);
                    color: var(--amber-400);
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    margin-bottom: 16px;
                }

                .win-btns {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }

                .btn-win-primary {
                    background: linear-gradient(135deg, var(--amber-500), var(--amber-700));
                    color: #1a0e00;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 24px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: 'Inter', sans-serif;
                }
                .btn-win-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(245,158,11,0.3); }
                .btn-win-primary:active { transform: scale(0.97); }

                .btn-win-secondary {
                    background: var(--bg-600);
                    color: var(--cream-dim);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 10px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: 'Inter', sans-serif;
                }
                .btn-win-secondary:hover { background: var(--bg-500); color: var(--cream); }

                /* ─── Mobile adjustments ─────────────────── */
                @media (max-width: 480px) {
                    .game-root { padding: 8px; }
                    .game-title { font-size: 1rem; }
                    .plate { width: 100px; height: 100px; padding: 10px; }
                    .timer-circle-wrap { width: 58px; height: 58px; }
                    .timer-value { font-size: 13px; }
                    .rule-chip { font-size: 10px; padding: 3px 7px; }
                    .btn { padding: 7px 14px; font-size: 12px; }
                    .flip-btn { font-size: 10px; padding: 4px 10px; bottom: 6px; }
                }
            `}</style>

            {/* Header */}
            <header className="game-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <h1 className="game-title">🐟 Los Tres Pescados</h1>

                <div className="timer-circle-wrap">
                    <svg className="timer-svg" viewBox="0 0 72 72">
                        <circle className="timer-track" cx="36" cy="36" r="30" />
                        <circle
                            className={`timer-progress ${secondsElapsed > OPTIMAL_TIME ? 'over-time' : ''}`}
                            cx="36" cy="36" r="30"
                            strokeDasharray={2 * Math.PI * 30}
                            strokeDashoffset={2 * Math.PI * 30 - 2 * Math.PI * 30 * ((secondsElapsed % 60) / 60)}
                        />
                    </svg>
                    <div className="timer-text">
                        <div className={`timer-value ${secondsElapsed > OPTIMAL_TIME ? 'over-time' : ''}`}>
                            {timeStr}
                        </div>
                        <div className="timer-label">tiempo</div>
                    </div>
                </div>
            </header>

            {/* Rules */}
            <div className="rules-row">
                <div className="rule-chip">🍳 Máx. <strong>2</strong> en sartén</div>
                <div className="rule-chip">⏱️ <strong>1 min</strong> por cara</div>
                <div className="rule-chip">↕️ <strong>Voltear</strong> en sartén</div>
                <div className="rule-chip">↔️ <strong>Arrastrar</strong> mover</div>
            </div>

            {/* Progress */}
            <div className="progress-section">
                <span className="progress-label">Caras fritas</span>
                <div className="progress-track">
                    <div
                        className={`progress-fill ${cookedFaces === totalFaces ? 'complete' : ''}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <span className="progress-count">{cookedFaces}/{totalFaces}</span>
            </div>

            {/* Controls */}
            <div className="controls-row">
                <button
                    onClick={startCooking}
                    disabled={isCooking}
                    className="btn btn-cook"
                >
                    🍳 Cocinar
                </button>
                <button onClick={resetGame} className="btn btn-reset">
                    ↺ Reiniciar
                </button>
            </div>

            {/* Message */}
            {mensaje && (
                <div className={`game-message ${mensaje.tipo === 'exito' ? 'msg-success' :
                    mensaje.tipo === 'error' ? 'msg-error' : 'msg-info'
                    }`}>
                    {mensaje.texto}
                </div>
            )}

            {/* Game Area */}
            <div className="game-area">
                {/* Raw Plate */}
                <div className="plate-zone">
                    <div className="plate-label">🐟 Sin freír</div>
                    <div
                        className={`plate ${dropTarget === 'raw' ? 'drop-active' :
                            isValidDropTarget('raw') ? 'valid-target' : ''
                            }`}
                        data-drop-target="raw"
                        onDragOver={(e) => handleDragOver(e, 'raw')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'raw')}
                    >
                        {fish.filter(f => f.location === 'raw').length === 0 && (
                            <span className="plate-empty-text">vacío</span>
                        )}
                        {fish.filter(f => f.location === 'raw').map(f => (
                            <div
                                key={f.id}
                                className={`fish-wrapper ${draggingFishId === f.id ? 'is-dragging' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(f.id)}
                                onDragEnd={() => setDraggingFishId(null)}
                                onTouchStart={(e) => handleTouchStart(e, f.id)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onDoubleClick={() => flipFish(f.id)}
                                style={{ touchAction: 'none' }}
                            >
                                <FishSVG fish={f} size="xl" />
                                <FaceIndicator fish={f} compact />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pan */}
                <div className="pan-zone">
                    <div className="plate-label">🍳 Sartén</div>
                    <div className="pan-container">
                        <FlamesSVG active={isCooking} />

                        <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={`pan-svg pan-glow ${isCooking ? 'cooking' : ''}`}>
                            <rect x="242" y="90" width="54" height="20" rx="10" fill="#111" />
                            <rect x="244" y="92" width="50" height="16" rx="8" fill="#222" />
                            <rect x="246" y="94" width="46" height="12" rx="6" fill="#1a1a1a" />
                            <ellipse cx="148" cy="108" rx="128" ry="88" fill="rgba(0,0,0,0.35)" />
                            <ellipse cx="145" cy="100" rx="126" ry="86" fill="#252525" />
                            <ellipse cx="145" cy="100" rx="126" ry="86" fill="none" stroke="#3a3a3a" strokeWidth="5" />
                            <ellipse cx="145" cy="100" rx="108" ry="72" fill="#1a1a1a" />
                            <ellipse cx="118" cy="82" rx="36" ry="14" fill="rgba(255,200,80,0.04)" transform="rotate(-12 118 82)" />
                            <ellipse cx="175" cy="110" rx="22" ry="9" fill="rgba(255,200,80,0.03)" transform="rotate(8 175 110)" />

                            {isCooking && (
                                <>
                                    <ellipse cx="145" cy="100" rx="90" ry="58" fill="rgba(255,150,50,0.03)">
                                        <animate attributeName="opacity" values="0.03;0.06;0.03" dur="1.5s" repeatCount="indefinite" />
                                    </ellipse>
                                    <g stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
                                        <path d="M75 35 Q80 22 75 10">
                                            <animate attributeName="opacity" values="0;0.5;0" dur="2.2s" begin="0s" repeatCount="indefinite" />
                                        </path>
                                        <path d="M145 24 Q150 12 145 0">
                                            <animate attributeName="opacity" values="0;0.5;0" dur="2.2s" begin="0.8s" repeatCount="indefinite" />
                                        </path>
                                        <path d="M205 35 Q210 22 205 10">
                                            <animate attributeName="opacity" values="0;0.5;0" dur="2.2s" begin="1.6s" repeatCount="indefinite" />
                                        </path>
                                    </g>
                                </>
                            )}
                        </svg>

                        {/* Pan Slots */}
                        <div className="pan-slots">
                            {[0, 1].map(slot => {
                                const f = fish.find(fi => fi.location === `pan-${slot}`)
                                const progress = getCookingProgress(slot)
                                const isActive = dropTarget === `pan-${slot}`
                                const isValid = isValidDropTarget(`pan-${slot}`)

                                return (
                                    <div
                                        key={slot}
                                        className={`pan-slot ${f ? 'occupied' : ''} ${isActive ? 'drop-active' : ''} ${isValid && !isActive ? 'valid-target' : ''}`}
                                        data-drop-target="pan"
                                        data-slot={slot}
                                        onDragOver={(e) => handleDragOver(e, `pan-${slot}`)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'pan', slot)}
                                    >
                                        {!f && <span className="slot-number">{slot + 1}</span>}
                                        {f && (
                                            <div
                                                className={`fish-wrapper in-pan ${draggingFishId === f.id ? 'is-dragging' : ''}`}
                                                draggable
                                                onDragStart={() => handleDragStart(f.id)}
                                                onDragEnd={() => setDraggingFishId(null)}
                                                onTouchStart={(e) => handleTouchStart(e, f.id)}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                                onDoubleClick={() => flipFish(f.id)}
                                                style={{ touchAction: 'none' }}
                                            >
                                                <CookingRing progress={progress} isCooking={isCooking} />
                                                <FishSVG fish={f} size="lg" />
                                                <FaceIndicator fish={f} />
                                                {f.faceA && f.faceB && (
                                                    <div className="face-status all-cooked">¡Listo!</div>
                                                )}
                                                {!(f.faceA && f.faceB) && (f.faceA || f.faceB) && (
                                                    <div className="face-status partial">1/2</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Botón infalible para voltear en pantallas táctiles y PC */}
                                        {f && !isCooking && (
                                            <button
                                                className="flip-btn"
                                                onClick={() => flipFish(f.id)}
                                                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); flipFish(f.id); }}
                                            >
                                                ↕ Voltear
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="pan-hint">
                        Arrastra a la sartén · Toca el botón para voltear
                    </div>
                </div>

                {/* Done Plate */}
                <div className="plate-zone">
                    <div className="plate-label">✅ Listos</div>
                    <div
                        className={`plate ${dropTarget === 'done' ? 'drop-active' :
                            isValidDropTarget('done') ? 'valid-target' : ''
                            }`}
                        data-drop-target="done"
                        onDragOver={(e) => handleDragOver(e, 'done')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'done')}
                    >
                        {fish.filter(f => f.location === 'done').length === 0 && (
                            <span className="plate-empty-text">vacío</span>
                        )}
                        {fish.filter(f => f.location === 'done').map(f => (
                            <div key={f.id} className="fish-wrapper">
                                <FishSVG fish={f} size="xl" />
                                <FaceIndicator fish={f} compact />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Win Overlay */}
            {showWin && isWon && (
                <div className="win-overlay" onClick={() => setShowWin(false)}>
                    <div className="win-card" onClick={e => e.stopPropagation()}>
                        <div className="win-emoji">🏆</div>
                        <div className="win-title">¡Excelente!</div>
                        <div className="win-text">
                            Los 3 pescados están perfectamente fritos por ambos lados.
                        </div>
                        <div className="win-time-badge">
                            <span className="win-time-num">{timeStr}</span>
                            <span className="win-time-label">tiempo</span>
                        </div>
                        <div>
                            {secondsElapsed <= OPTIMAL_TIME ? (
                                <div className="win-optimal">✅ ¡Tiempo óptimo!</div>
                            ) : (
                                <div className="win-not-optimal">El mínimo es 3:00. ¡Inténtalo de nuevo!</div>
                            )}
                        </div>
                        <div className="win-btns">
                            <button className="btn-win-primary" onClick={resetGame}>
                                🔄 Jugar de nuevo
                            </button>
                            <button className="btn-win-secondary" onClick={() => setShowWin(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}