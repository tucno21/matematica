import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
type Location = 'left' | 'right' | 'boat'

interface Character {
    emoji: string
    name: string
    id: 'fox' | 'chicken' | 'grain'
}

interface GameState {
    fox: Location
    chicken: Location
    grain: Location
    boatSide: 'left' | 'right'
    moves: number
    gameOver: boolean
}

interface ModalProps {
    emoji: string
    title: string
    body: string
    onReset: () => void
    onHint: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHARS: Record<'fox' | 'chicken' | 'grain', Character> = {
    fox: { emoji: '🦊', name: 'Zorro', id: 'fox' },
    chicken: { emoji: '🐔', name: 'Gallina', id: 'chicken' },
    grain: { emoji: '🌽', name: 'Maíz', id: 'grain' }
}

const OPTIMAL_MOVES = 7

// ─── Modal Component ───────────────────────────────────────────────────────────
function Modal({ emoji, title, body, onReset, onHint }: ModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md p-4" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <span className="block text-6xl sm:text-7xl mb-3" style={{ animation: 'float 3s ease-in-out infinite' }}>{emoji}</span>
                <h2 className={`font-['Fredoka_One',cursive] text-2xl sm:text-3xl mb-2 ${emoji === '🎉' ? 'text-green-600' : 'text-red-600'}`}>
                    {title}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: body }} />
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onReset}
                        className="font-['Fredoka_One',cursive] text-lg border-none rounded-full px-8 py-3 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#4CAF50,#2E7D32)', color: '#fff' }}
                    >
                        ↺ Jugar de nuevo
                    </button>
                    <button
                        onClick={onHint}
                        className="font-['Fredoka_One',cursive] text-lg bg-gray-100 text-gray-700 border-none rounded-full px-8 py-3 cursor-pointer transition-all hover:bg-gray-200 active:scale-95"
                    >
                        💡 Ver pista
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function GranjeroRioView() {
    const navigate = useNavigate()

    const [state, setState] = useState<GameState>({
        fox: 'left',
        chicken: 'left',
        grain: 'left',
        boatSide: 'left',
        moves: 0,
        gameOver: false
    })

    const [selectedChar, setSelectedChar] = useState<'fox' | 'chicken' | 'grain' | null>(null)
    const [hintVisible, setHintVisible] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalConfig, setModalConfig] = useState<{ emoji: string; title: string; body: string } | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

    // ── Rules & Actions ───────────────────────────────────────────────────────
    const checkWin = (newState: GameState) => {
        return Object.keys(CHARS).every(id => newState[id as keyof GameState] === 'right')
    }

    const resetGame = () => {
        setState({ fox: 'left', chicken: 'left', grain: 'left', boatSide: 'left', moves: 0, gameOver: false })
        setSelectedChar(null)
        setShowModal(false)
        setModalConfig(null)
    }

    const showToast = (msg: string, type: 'error' | 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 2500)
    }

    // ── Unified Interaction Logic (Tap & Drop) ──────────────────────────────
    const handleCharSelect = (charId: 'fox' | 'chicken' | 'grain') => {
        if (state.gameOver) return
        const charLoc = state[charId]

        if (charLoc === 'boat') {
            disembark(charId)
        } else if (charLoc === state.boatSide) {
            embark(charId)
        } else {
            showToast('El granjero está en la otra orilla.', 'error')
        }
    }

    const embark = (charId: 'fox' | 'chicken' | 'grain') => {
        const passenger = Object.keys(CHARS).find(id => state[id as keyof GameState] === 'boat')
        if (passenger) {
            if (passenger === charId) { setSelectedChar(null); return; }
            showToast('¡El bote solo lleva 1 pasajero!', 'error')
            return
        }

        setState(prev => ({ ...prev, [charId]: 'boat' }))
        setSelectedChar(null)
    }

    const disembark = (charId: 'fox' | 'chicken' | 'grain') => {
        if (state[charId] !== 'boat') return

        const side = state.boatSide
        const newState = { ...state, [charId]: side }

        if (checkWin(newState)) {
            setState({ ...newState, gameOver: true })
            const optimal = newState.moves <= OPTIMAL_MOVES
            setModalConfig({
                emoji: '🎉',
                title: '¡Completado!',
                body: `Cruzaste a todos en <strong>${newState.moves} viajes</strong>.<br>${optimal ? '✅ <strong>¡Solución óptima!</strong>' : '⏱️ El mínimo posible son <strong>7 viajes</strong>.'
                    }`
            })
            setShowModal(true)
        } else {
            setState(newState)
        }
        setSelectedChar(null)
    }

    const crossRiver = () => {
        if (state.gameOver) return

        const fromSide = state.boatSide
        const toSide = fromSide === 'left' ? 'right' : 'left'
        const strandedOnFrom = Object.keys(CHARS).filter(id => state[id as keyof GameState] === fromSide) as Array<'fox' | 'chicken' | 'grain'>

        if (strandedOnFrom.includes('fox') && strandedOnFrom.includes('chicken')) {
            triggerLose('🦊 Dejaste al zorro y la gallina solos. ¡El zorro se la comió!')
            return
        }

        if (strandedOnFrom.includes('chicken') && strandedOnFrom.includes('grain')) {
            triggerLose('🐔 Dejaste a la gallina y el maíz solos. ¡La gallina se lo comió!')
            return
        }

        setState(prev => ({
            ...prev,
            boatSide: toSide,
            moves: prev.moves + 1
        }))
        setSelectedChar(null)
    }

    const triggerLose = (reason: string) => {
        setState(prev => ({ ...prev, gameOver: true }))
        setModalConfig({
            emoji: '😱',
            title: '¡Oh no!',
            body: `<strong>${reason}</strong><br>Solo el zorro y el maíz pueden estar juntos sin el granjero.`
        })
        setShowModal(true)
    }

    // Drag handlers (Desktop fallback)
    const handleDragStart = (e: React.DragEvent, charId: 'fox' | 'chicken' | 'grain') => {
        if (state.gameOver) { e.preventDefault(); return }
        setSelectedChar(charId)
        e.dataTransfer.effectAllowed = 'move'
        const img = new Image()
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
        e.dataTransfer.setDragImage(img, 0, 0)
    }

    const handleDrop = (target: 'boat' | 'left' | 'right') => {
        if (!selectedChar) return
        if (target === 'boat') embark(selectedChar)
        else disembark(selectedChar)
        setSelectedChar(null)
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh flex flex-col bg-sky-100" style={{ fontFamily: "'Nunito',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
                
                @keyframes wave {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes idle {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-2px) scale(1.02); }
                }
                @keyframes fadeIn {
                    from { opacity:0; transform: translateY(10px); }
                    to { opacity:1; transform: translateY(0); }
                }
                @keyframes popIn {
                    from { transform:scale(0.7); opacity:0; }
                    to { transform:scale(1); opacity:1; }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 10px rgba(255, 255, 0, 0.4); }
                    50% { box-shadow: 0 0 20px rgba(255, 255, 0, 0.8); }
                }

                .char-slot {
                    cursor: pointer;
                    user-select: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    animation: idle 3s ease-in-out infinite;
                    padding: 8px;
                    border-radius: 16px;
                    border: 3px solid transparent;
                    transition: all 0.2s;
                }

                .char-slot:hover {
                    transform: translateY(-8px) scale(1.05);
                    background: rgba(255,255,255,0.2);
                }
                
                .char-slot:active {
                    transform: scale(0.95);
                }

                .char-slot.selected {
                    background: rgba(255,255,255,0.4);
                    border-color: #FFD54F;
                    animation: glow 1.5s ease-in-out infinite;
                    transform: translateY(-8px) scale(1.1);
                }

                .drop-zone {
                    transition: all 0.3s ease;
                    border: 3px dashed transparent;
                }

                .drop-zone.active {
                    background: rgba(255, 255, 0, 0.15);
                    border-color: #FFD54F;
                }

                .boat-container {
                    transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            {/* ── Header ── */}
            <header className="px-4 py-3 sm:py-4 shrink-0 flex items-center gap-4 bg-sky-200/50 backdrop-blur-sm border-b border-sky-300/50 z-10">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 bg-white/30 text-sky-800 hover:bg-white/50"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>
                <div className="flex-1 text-center">
                    <h1 className="font-['Fredoka_One',cursive] text-2xl sm:text-3xl text-sky-900 drop-shadow-sm">
                        🌾 El Granjero y el Río
                    </h1>
                    <p className="text-sm sm:text-base text-sky-800 font-semibold mt-1">Cruza el río sin que nadie se coma a nadie</p>
                </div>
                <div className="w-20 sm:w-24"></div>
            </header>

            {/* ── Rules & HUD ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 max-w-6xl mx-auto w-full">
                <div className="flex gap-2 flex-wrap justify-center">
                    <div className="bg-white border-2 border-sky-200 rounded-full px-3 py-1 text-xs font-bold text-sky-800 shadow-sm">🚣 Solo 1 personaje</div>
                    <div className="bg-white border-2 border-red-200 rounded-full px-3 py-1 text-xs font-bold text-red-600 shadow-sm">🦊🐔 ❌ Se come</div>
                    <div className="bg-white border-2 border-red-200 rounded-full px-3 py-1 text-xs font-bold text-red-600 shadow-sm">🐔🌽 ❌ Se come</div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border-2 border-orange-400 rounded-full px-4 py-1.5 text-sm font-extrabold text-orange-700 shadow-sm">
                        🌊 Viajes: {state.moves}
                    </div>
                    <button onClick={() => setHintVisible(!hintVisible)} className="bg-yellow-100 text-yellow-800 border-2 border-yellow-300 rounded-full py-1.5 px-3 font-bold text-sm hover:bg-yellow-200 active:scale-95 transition-all">
                        💡
                    </button>
                    <button onClick={resetGame} className="bg-red-50 text-red-700 border-2 border-red-200 rounded-full py-1.5 px-3 font-bold text-sm hover:bg-red-100 active:scale-95 transition-all">
                        ↺
                    </button>
                </div>
            </div>

            {hintVisible && (
                <div className="mx-4 sm:mx-auto max-w-4xl bg-yellow-50 border-2 border-yellow-400 rounded-xl p-3 text-sm text-yellow-800 font-bold mb-2 shadow-md" style={{ animation: 'fadeIn 0.3s' }}>
                    💡 <strong>Pista:</strong> La gallina siempre cruza primero. Luego regresa con algo. Deja la gallina atrás y lleva el otro. ¡Último viaje: recoge la gallina!
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white rounded-full px-6 py-3 font-bold text-sm max-w-[90%] text-center shadow-2xl z-40 border-l-4" style={{ animation: 'popIn 0.3s ease-out', borderColor: toast.type === 'error' ? '#EF5350' : '#4CAF50', color: toast.type === 'error' ? '#B71C1C' : '#1B5E20' }}>
                    {toast.msg}
                </div>
            )}

            {/* ── Game World ── */}
            <div className="flex-1 flex flex-col lg:flex-row w-full max-w-6xl mx-auto p-2 sm:p-4 gap-4 lg:gap-0 h-full justify-center">

                {/* ── Orilla Izquierda ── */}
                <div
                    className={`flex-1 lg:w-[250px] xl lg:w-[280px] rounded-3xl flex flex-col items-center justify-center p-4 relative bg-gradient-to-b from-green-400 to-green-600 shadow-xl border-4 border-green-700 min-h-[180px] lg:min-h-0 drop-zone ${selectedChar && state[selectedChar] === 'left' ? 'active' : ''}`}
                    onClick={() => { if (selectedChar && state[selectedChar] === 'boat' && state.boatSide === 'left') disembark(selectedChar) }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={() => handleDrop('left')}
                >
                    <span className="absolute top-2 left-4 font-['Fredoka_One',cursive] text-sm text-white/80 drop-shadow-md">🏠 Partida</span>
                    <div className="flex flex-col gap-4 sm:gap-6 items-center">
                        {Object.keys(CHARS).filter(id => state[id as keyof GameState] === 'left').map(charId => (
                            <div key={charId} className={`char-slot ${selectedChar === charId ? 'selected' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleCharSelect(charId as any) }}
                                draggable onDragStart={(e) => handleDragStart(e, charId as any)}
                            >
                                <div className="text-4xl sm:text-6xl drop-shadow-lg">{CHARS[charId as keyof typeof CHARS].emoji}</div>
                                <div className="font-['Fredoka_One',cursive] text-sm text-white bg-black/20 rounded-lg px-2 py-1 drop-shadow-md">{CHARS[charId as keyof typeof CHARS].name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Río y Bote ── */}
                <div className="flex-1 lg:flex-initial lg:w-[400px] xl lg:w-[500px] rounded-3xl relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-blue-400 to-blue-600 shadow-xl border-4 border-blue-700 my-2 lg:my-0 lg:mx-4 min-h-[220px] lg:min-h-0">
                    {/* Olas */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-0 right-0 h-[30px] w-[200%] opacity-30" style={{ background: "url('data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 30'%3E%3Cpath d='M0,15 C100,0 200,30 300,15 C400,0 500,30 600,15 C700,0 800,30 800,15 L800,30 L0,30Z' fill='white'/%3E%3C/svg%3E') repeat-x", animation: 'wave 4s linear infinite' }} />
                    </div>

                    {/* ── Bote ── */}
                    <div className="boat-container absolute top-1/2 -translate-y-1/2 w-[140px] sm:w-[160px]"
                        style={{ left: state.boatSide === 'left' ? '10%' : '55%', transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                        <svg className="w-full drop-shadow-2xl" viewBox="0 0 120 55">
                            <path d="M8 28 Q10 48 60 50 Q110 48 112 28 Z" fill="#6D4C41" />
                            <path d="M8 28 Q10 44 60 46 Q110 44 112 28 Z" fill="#8D6E63" />
                            <rect x="6" y="24" width="108" height="8" rx="4" fill="#A1887F" />
                            <line x1="20" y1="26" x2="18" y2="44" stroke="#795548" strokeWidth="1.5" opacity="0.5" />
                            <line x1="60" y1="26" x2="60" y2="47" stroke="#795548" strokeWidth="1.5" opacity="0.5" />
                            <line x1="100" y1="26" x2="102" y2="44" stroke="#795548" strokeWidth="1.5" opacity="0.5" />
                            <line x1="18" y1="28" x2="2" y2="42" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
                            <ellipse cx="2" cy="43" rx="5" ry="3" fill="#5D4037" transform="rotate(-30 2 43)" />
                            <line x1="102" y1="28" x2="118" y2="42" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
                            <ellipse cx="118" cy="43" rx="5" ry="3" fill="#5D4037" transform="rotate(30 118 43)" />
                        </svg>

                        {/* Granjero */}
                        <div className="absolute bottom-[55%] left-1/2 -translate-x-1/2 text-3xl sm:text-4xl drop-shadow-md pointer-events-none" style={{ animation: 'float 2s ease-in-out infinite' }}>
                            👨‍🌾
                        </div>

                        {/* Pasajero en bote */}
                        {(() => {
                            const passengerId = Object.keys(CHARS).find(id => state[id as keyof GameState] === 'boat')
                            if (!passengerId) return null
                            return (
                                <div className={`absolute bottom-[85%] left-1/2 -translate-x-1/2 char-slot ${selectedChar === passengerId ? 'selected' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleCharSelect(passengerId as any) }}
                                    draggable onDragStart={(e) => handleDragStart(e, passengerId as any)}
                                    style={{ animation: 'float 2s ease-in-out infinite' }}
                                >
                                    <div className="text-4xl sm:text-5xl drop-shadow-lg leading-none">{CHARS[passengerId as keyof typeof CHARS].emoji}</div>
                                    <div className="font-['Fredoka_One',cursive] text-xs text-white bg-black/30 rounded-md px-2 py-0.5 drop-shadow-md whitespace-nowrap">{CHARS[passengerId as keyof typeof CHARS].name}</div>
                                </div>
                            )
                        })()}
                    </div>

                    {/* Botón cruzar */}
                    <button
                        onClick={crossRiver}
                        disabled={state.gameOver}
                        className="absolute bottom-4 z-20 font-['Fredoka_One',cursive] text-base sm:text-lg border-none rounded-full px-6 py-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-default disabled:transform-none shadow-md"
                        style={{ background: 'linear-gradient(135deg,#FF9800,#F57C00)', color: '#fff' }}
                    >
                        {state.boatSide === 'left' ? 'Cruzar → 🚣' : '🚣 ← Regresar'}
                    </button>
                </div>

                {/* ── Orilla Derecha ── */}
                <div
                    className={`flex-1 lg:w-[250px] xl lg:w-[280px] rounded-3xl flex flex-col items-center justify-center p-4 relative bg-gradient-to-b from-green-400 to-green-600 shadow-xl border-4 border-green-700 min-h-[180px] lg:min-h-0 drop-zone ${selectedChar && state[selectedChar] === 'right' ? 'active' : ''}`}
                    onClick={() => { if (selectedChar && state[selectedChar] === 'boat' && state.boatSide === 'right') disembark(selectedChar) }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={() => handleDrop('right')}
                >
                    <span className="absolute top-2 left-4 font-['Fredoka_One',cursive] text-sm text-white/80 drop-shadow-md">🏡 Llegada</span>
                    <div className="flex flex-col gap-4 sm:gap-6 items-center">
                        {Object.keys(CHARS).filter(id => state[id as keyof GameState] === 'right').map(charId => (
                            <div key={charId} className={`char-slot ${selectedChar === charId ? 'selected' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleCharSelect(charId as any) }}
                                draggable onDragStart={(e) => handleDragStart(e, charId as any)}
                            >
                                <div className="text-4xl sm:text-6xl drop-shadow-lg">{CHARS[charId as keyof typeof CHARS].emoji}</div>
                                <div className="font-['Fredoka_One',cursive] text-sm text-white bg-black/20 rounded-lg px-2 py-1 drop-shadow-md">{CHARS[charId as keyof typeof CHARS].name}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ── Modal ── */}
            {showModal && modalConfig && (
                <Modal emoji={modalConfig.emoji} title={modalConfig.title} body={modalConfig.body} onReset={resetGame} onHint={() => { setHintVisible(true); setShowModal(false); }} />
            )}
        </div>
    )
}