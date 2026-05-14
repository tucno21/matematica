import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
type CoinLocation = 'table' | 'left' | 'right' | 'safe'
type ScaleState = 'idle' | 'balanced' | 'left-lighter' | 'right-lighter'
type GamePhase = 'setup' | 'result' | 'gameover'

interface Coin {
    id: number
    location: CoinLocation
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function MonedaFalsaView() {
    const navigate = useNavigate()

    const [coins, setCoins] = useState<Coin[]>([])
    const [fakeId, setFakeId] = useState<number>(1)
    const [selectedCoin, setSelectedCoin] = useState<number | null>(null)
    const [scaleState, setScaleState] = useState<ScaleState>('idle')
    const [weighingsUsed, setWeighingsUsed] = useState(0)
    const [phase, setPhase] = useState<GamePhase>('setup')
    const [toast, setToast] = useState<{ msg: string; type: 'error' | 'info' | 'success' } | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [modalConfig, setModalConfig] = useState<{ emoji: string; title: string; body: string } | null>(null)

    useEffect(() => { initGame() }, [])

    const initGame = () => {
        const randomFake = Math.floor(Math.random() * 9) + 1
        setFakeId(randomFake)
        setCoins(Array.from({ length: 9 }, (_, i) => ({ id: i + 1, location: 'table' })))
        setScaleState('idle')
        setWeighingsUsed(0)
        setPhase('setup')
        setSelectedCoin(null)
        setShowModal(false)
        setModalConfig(null)
    }

    const getCoinsByLocation = (loc: CoinLocation) => coins.filter(c => c.location === loc)

    const showToast = (msg: string, type: 'error' | 'info' | 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    // ── Interactions ────────────────────────────────────────────────────────
    const handleCoinTap = (id: number) => {
        if (phase === 'result' || phase === 'gameover') return
        setSelectedCoin(prev => prev === id ? null : id)
    }

    const handleDrop = (target: 'left' | 'right') => {
        if (!selectedCoin || phase !== 'setup') return
        setCoins(prev => prev.map(c => c.id === selectedCoin ? { ...c, location: target } : c))
        setSelectedCoin(null)
    }

    const handleReturnToTable = (id: number) => {
        if (phase !== 'setup') return
        setCoins(prev => prev.map(c => c.id === id ? { ...c, location: 'table' } : c))
    }

    // ── NARRATIVE WEIGHING LOGIC ────────────────────────────────────────────
    const handleWeigh = () => {
        if (phase !== 'setup') return

        const leftPan = getCoinsByLocation('left')
        const rightPan = getCoinsByLocation('right')

        if (leftPan.length === 0 || rightPan.length === 0) {
            showToast('Coloca monedas en ambos platillos.', 'error')
            return
        }

        if (leftPan.length !== rightPan.length) {
            showToast('Debes poner la misma cantidad de monedas en cada lado para este juego.', 'error')
            return
        }

        let currentFakeId = fakeId
        const numPerSide = leftPan.length

        // Cantidad de monedas que aún siguen siendo sospechosas (no descartadas a 'safe')
        const suspectCount = leftPan.length + rightPan.length + getCoinsByLocation('table').length

        // Funciones auxiliares para forzar la narrativa moviendo el ID de la moneda falsa
        const forceBalance = () => {
            const fakeCoin = coins.find(c => c.id === currentFakeId)!
            // Si la falsa está en la balanza, la movemos a la mesa (o a safe como fallback)
            if (fakeCoin.location === 'left' || fakeCoin.location === 'right') {
                let newFake = coins.find(c => c.location === 'table' && c.id !== currentFakeId)
                if (!newFake) newFake = coins.find(c => c.location === 'safe' && c.id !== currentFakeId)
                if (newFake) currentFakeId = newFake.id
            }
        }

        const forceTilt = () => {
            const fakeCoin = coins.find(c => c.id === currentFakeId)!
            // Si la falsa NO está en la balanza, la metemos obligatoriamente a uno de los platillos
            if (fakeCoin.location !== 'left' && fakeCoin.location !== 'right') {
                const newFake = coins.find(c => (c.location === 'left' || c.location === 'right') && c.id !== currentFakeId)
                if (newFake) currentFakeId = newFake.id
            }
        }

        // --- LÓGICA DE CORRECCIÓN NARRATIVA ---

        if (numPerSide === 1) {
            // CASO 1: 1vs1. Las primeras pesadas (mientras haya más de 3 sospechosas en juego) 
            // siempre quedan en equilibrio. Luego la física real decide.
            if (suspectCount > 3) {
                forceBalance()
            }
        }
        else if (numPerSide === 2) {
            // CASO 2: 2vs2.
            if (weighingsUsed === 0) {
                // Primera pesada 2vs2 siempre en equilibrio.
                forceBalance()
            } else {
                // Segunda o posteriores siempre se inclinan (la sobrante nunca es falsa).
                forceTilt()
            }
        }
        else if (numPerSide === 4) {
            // CASO 3: 4vs4. Siempre se inclina, la sobrante descartada nunca es falsa.
            forceTilt()
        }
        else if (numPerSide === 3) {
            // CASO 4: 3vs3. 50/50 narrativo en la primera pesada.
            if (weighingsUsed === 0) {
                const shouldTilt = Math.random() > 0.5
                if (shouldTilt) forceTilt()
                else forceBalance()
            }
        }

        // Actualizar el ID falso si la narrativa lo exigió
        if (currentFakeId !== fakeId) setFakeId(currentFakeId)

        // --- CALCULAR RESULTADO VISUAL ---
        // Ya con el ID de la moneda falsa ajustado, resolvemos la física de la balanza
        const leftWeight = leftPan.filter(c => c.id !== currentFakeId).length
        const rightWeight = rightPan.filter(c => c.id !== currentFakeId).length

        let resultState: ScaleState
        if (leftWeight < rightWeight) resultState = 'left-lighter'
        else if (rightWeight < leftWeight) resultState = 'right-lighter'
        else resultState = 'balanced'

        setScaleState(resultState)

        const newWeighings = weighingsUsed + 1
        setWeighingsUsed(newWeighings)
        setPhase('result')

        // Mostrar advertencia si supera 2 pesadas
        if (newWeighings > 2) {
            showToast('Se excedió el límite ideal de 2 pesadas', 'info')
        }
    }

    // ── Post-Weigh Classification ───────────────────────────────────────────
    const handleClassify = (pan: 'left' | 'right', target: 'safe' | 'table') => {
        setCoins(prev => prev.map(c => c.location === pan ? { ...c, location: target } : c))
    }

    const handleClassifyTableToSafe = () => {
        setCoins(prev => prev.map(c => c.location === 'table' ? { ...c, location: 'safe' } : c))
    }

    const finishResultPhase = () => {
        if (getCoinsByLocation('left').length > 0 || getCoinsByLocation('right').length > 0) {
            showToast('Clasifica las monedas de la balanza antes de seguir.', 'error')
            return
        }
        setScaleState('idle')
        setPhase('setup')
    }

    // ── Accusation ──────────────────────────────────────────────────────────
    const handleAccuse = () => {
        if (!selectedCoin || coins.find(c => c.id === selectedCoin)?.location !== 'table') {
            showToast('Selecciona una moneda sospechosa de la mesa para acusar.', 'error')
            return
        }

        setPhase('gameover')
        if (selectedCoin === fakeId) {
            setModalConfig({
                emoji: '🎉',
                title: '¡Correcto!',
                body: `La moneda falsa era la <strong>${selectedCoin}</strong>.<br>¡Resolviste el misterio en ${weighingsUsed} pesada(s)!`
            })
        } else {
            setModalConfig({
                emoji: '😱',
                title: '¡Oh no!',
                body: `Esa moneda era real. La falsa era la <strong>${fakeId}</strong>.`
            })
        }
        setShowModal(true)
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    const leftPanCoins = getCoinsByLocation('left')
    const rightPanCoins = getCoinsByLocation('right')
    const tableCoins = getCoinsByLocation('table')

    return (
        <div className="min-h-dvh flex flex-col bg-amber-50" style={{ fontFamily: "'Nunito',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
                @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
                @keyframes popIn { from { transform:scale(0.7); opacity:0; } to { transform:scale(1); opacity:1; } }
                @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } }
                
                .coin { 
                    width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(135deg, #fbbf24, #d97706); color: #78350f; font-weight: 800; font-size: 1.1rem;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s;
                    user-select: none; border: 3px solid #b45309; z-index: 10; position: relative;
                }
                .coin.safe { background: linear-gradient(135deg, #9ca3af, #6b7280); border-color: #4b5563; color: #1f2937; cursor: default; opacity: 0.6; transform: scale(0.9); }
                .coin.selected { transform: scale(1.15); border-color: #fef3c7; animation: pulse 1.5s infinite; }
                .coin:active { transform: scale(0.95); }

                .pan-zone { 
                    min-height: 80px; border: 3px dashed rgba(120, 53, 15, 0.2); border-radius: 12px; 
                    display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-items: center;
                    padding: 8px; transition: all 0.3s; background: rgba(255,255,255,0.1);
                }
                .pan-zone.active-target { border-color: #f59e0b; background: rgba(245, 158, 11, 0.15); }

                /* ANIMACIÓN DE LA BALANZA */
                .scale-beam {
                    transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
                    transform-origin: 50% 0%;
                }
                .scale-beam.left-lighter { transform: rotate(-12deg); }
                .scale-beam.right-lighter { transform: rotate(12deg); }
                
                /* Mantener los platillos relativamente verticales cuando la viga se inclina */
                .pan-group {
                    transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .left-lighter .pan-group.left-group { transform: rotate(12deg) translateY(-10px); }
                .left-lighter .pan-group.right-group { transform: rotate(12deg) translateY(10px); }
                .right-lighter .pan-group.left-group { transform: rotate(-12deg) translateY(10px); }
                .right-lighter .pan-group.right-group { transform: rotate(-12deg) translateY(-10px); }
            `}</style>

            {/* ── Header ── */}
            <header className="px-4 py-3 bg-amber-100 border-b-4 border-amber-300 flex items-center justify-between shrink-0 z-10">
                <button onClick={() => navigate(-1)} className="text-amber-800 font-bold text-sm flex items-center gap-1 hover:bg-amber-200 px-3 py-2 rounded-lg active:scale-95">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg> Volver
                </button>
                <h1 className="font-['Fredoka_One',cursive] text-xl text-amber-900">🏺 La Moneda Falsa</h1>
                <div className="font-['Fredoka_One',cursive] text-amber-800 bg-amber-200 px-3 py-1 rounded-full text-sm border-2 border-amber-400">
                    Pesadas: {weighingsUsed}/2
                </div>
            </header>

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white rounded-xl px-6 py-3 font-bold text-sm max-w-[90%] text-center shadow-2xl z-50 border-l-4" style={{ animation: 'popIn 0.3s ease-out', borderColor: toast.type === 'error' ? '#EF4444' : toast.type === 'info' ? '#3B82F6' : '#10B981', color: toast.type === 'error' ? '#991B1B' : toast.type === 'info' ? '#1E40AF' : '#065F46' }}>
                    {toast.msg}
                </div>
            )}

            {/* ── Game Area ── */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full overflow-hidden">

                {/* ── Scale Section ── */}
                <div className="flex-1 flex flex-col items-center bg-amber-100/50 rounded-3xl p-4 border-4 border-amber-200 relative">

                    {/* Estructura Visual de la Balanza */}
                    <div className="relative w-full max-w-lg h-64 flex justify-center items-end mb-4">
                        <div className="absolute bottom-0 w-24 h-5 bg-amber-900 rounded-b-lg shadow-md"></div>
                        <div className="absolute bottom-5 w-3 h-32 bg-amber-800 rounded-t-lg left-1/2 -translate-x-1/2"></div>
                        <div className="absolute bottom-[140px] w-10 h-10 bg-amber-800 rounded-full left-1/2 -translate-x-1/2 border-4 border-amber-900 z-10 shadow-md"></div>

                        <div className={`scale-beam absolute bottom-[160px] w-[90%] h-3 bg-amber-700 rounded-full shadow-md ${scaleState}`}>
                            <div className="pan-group left-group absolute left-0 top-0 w-[45%] flex flex-col items-center">
                                <div className="w-0.5 h-16 bg-amber-900 mt-1 shadow-md"></div>
                                <div className="w-full bg-amber-800 h-3 rounded-b-lg shadow-md"></div>
                                <div className={`pan-zone w-full mt-1 ${phase === 'setup' && selectedCoin ? 'active-target' : ''}`} onClick={() => handleDrop('left')}>
                                    {leftPanCoins.length === 0 ? <span className="text-amber-400 font-bold text-xs">Izquierdo</span> :
                                        leftPanCoins.map(c => <div key={c.id} className="coin" onClick={(e) => { e.stopPropagation(); if (phase === 'setup') handleReturnToTable(c.id) }}>{c.id}</div>)
                                    }
                                </div>
                            </div>

                            <div className="pan-group right-group absolute right-0 top-0 w-[45%] flex flex-col items-center">
                                <div className="w-0.5 h-16 bg-amber-900 mt-1 shadow-md"></div>
                                <div className="w-full bg-amber-800 h-3 rounded-b-lg shadow-md"></div>
                                <div className={`pan-zone w-full mt-1 ${phase === 'setup' && selectedCoin ? 'active-target' : ''}`} onClick={() => handleDrop('right')}>
                                    {rightPanCoins.length === 0 ? <span className="text-amber-400 font-bold text-xs">Derecho</span> :
                                        rightPanCoins.map(c => <div key={c.id} className="coin" onClick={(e) => { e.stopPropagation(); if (phase === 'setup') handleReturnToTable(c.id) }}>{c.id}</div>)
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="mt-8 flex flex-col items-center gap-3 w-full">
                        {phase === 'setup' && (
                            <button onClick={handleWeigh} disabled={leftPanCoins.length === 0 || rightPanCoins.length === 0} className="font-['Fredoka_One',cursive] text-xl bg-amber-600 text-white border-b-4 border-amber-800 rounded-full px-8 py-3 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-700 active:scale-95 transition-all shadow-lg w-full max-w-xs">
                                ⚖️ Pesar
                            </button>
                        )}

                        {phase === 'result' && (
                            <div className="flex flex-col items-center gap-4 w-full" style={{ animation: 'fadeIn 0.3s' }}>
                                <div className="bg-white p-3 rounded-xl shadow-md border-l-4 border-blue-500 w-full max-w-xs text-blue-800 font-bold text-center text-sm">
                                    {scaleState === 'balanced' ? '¡Equilibrio! La falsa no está en la balanza.' :
                                        scaleState === 'left-lighter' ? '¡El platillo IZQUIERDO sube! La falsa está ahí.' :
                                            '¡El platillo DERECHO sube! La falsa está ahí.'}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs justify-center">
                                    {scaleState === 'balanced' && (
                                        <>
                                            <button onClick={() => handleClassify('left', 'safe')} className="flex-1 bg-green-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">Izq ➡️ Seguras</button>
                                            <button onClick={() => handleClassify('right', 'safe')} className="flex-1 bg-green-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">Der ➡️ Seguras</button>
                                        </>
                                    )}
                                    {scaleState === 'left-lighter' && (
                                        <>
                                            <button onClick={() => handleClassify('left', 'table')} className="flex-1 bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">⚠️ Izq ➡️ Mesa</button>
                                            <button onClick={() => handleClassify('right', 'safe')} className="flex-1 bg-green-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">✅ Der ➡️ Seguras</button>
                                        </>
                                    )}
                                    {scaleState === 'right-lighter' && (
                                        <>
                                            <button onClick={() => handleClassify('left', 'safe')} className="flex-1 bg-green-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">✅ Izq ➡️ Seguras</button>
                                            <button onClick={() => handleClassify('right', 'table')} className="flex-1 bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-full shadow active:scale-95">⚠️ Der ➡️ Mesa</button>
                                        </>
                                    )}
                                </div>

                                {(scaleState === 'left-lighter' || scaleState === 'right-lighter') && tableCoins.length > 0 && (
                                    <button onClick={handleClassifyTableToSafe} className="bg-gray-400 text-white font-bold text-xs px-4 py-2 rounded-full shadow active:scale-95 transition-all hover:bg-gray-500">
                                        💡 Mover monedas de la mesa a Seguras
                                    </button>
                                )}

                                <button onClick={finishResultPhase} className="font-['Fredoka_One',cursive] text-lg bg-blue-600 text-white border-b-4 border-blue-800 rounded-full px-8 py-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg w-full max-w-xs">
                                    👉 Continuar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Side Section (Mesa y Seguros) ── */}
                <div className="lg:w-80 flex flex-col gap-6">

                    {/* Safe Zone */}
                    <div className="bg-gray-200/50 rounded-3xl p-4 border-4 border-dashed border-gray-400 min-h-[100px]">
                        <h3 className="font-['Fredoka_One',cursive] text-gray-600 text-center mb-3 text-lg">🔒 Monedas Seguras</h3>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {getCoinsByLocation('safe').map(c => <div key={c.id} className="coin safe">{c.id}</div>)}
                            {getCoinsByLocation('safe').length === 0 && <span className="text-gray-400 font-bold text-sm">Ninguna por ahora</span>}
                        </div>
                    </div>

                    {/* Table Zone */}
                    <div className="bg-amber-800 rounded-3xl p-4 border-4 border-amber-900 shadow-inner flex-1 flex flex-col">
                        <h3 className="font-['Fredoka_One',cursive] text-amber-200 text-center mb-4 text-lg">🪙 Mesa (Sospechosas)</h3>
                        <div className="flex flex-wrap gap-3 justify-center flex-1 items-start content-start">
                            {tableCoins.map(c => <div key={c.id} className={`coin ${selectedCoin === c.id ? 'selected' : ''}`} onClick={() => handleCoinTap(c.id)}>{c.id}</div>)}
                            {tableCoins.length === 0 && <span className="text-amber-400 font-bold text-sm italic">Mesa vacía</span>}
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                            <button onClick={handleAccuse} disabled={!selectedCoin || coins.find(c => c.id === selectedCoin)?.location !== 'table'} className="font-['Fredoka_One',cursive] text-base bg-red-600 text-white border-b-4 border-red-800 rounded-full px-6 py-2 w-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 active:scale-95 transition-all shadow-md">
                                🚨 ¡Denunciar Moneda Falsa!
                            </button>
                            <button onClick={initGame} className="font-['Fredoka_One',cursive] text-sm bg-amber-600 text-white border-b-4 border-amber-800 rounded-full px-6 py-2 w-full hover:bg-amber-700 active:scale-95 transition-all shadow-md">
                                ↺ Reiniciar Juego
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Modal ── */}
            {showModal && modalConfig && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md p-4" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <span className="block text-6xl mb-4">{modalConfig.emoji}</span>
                        <h2 className={`font-['Fredoka_One',cursive] text-3xl mb-3 ${modalConfig.emoji === '🎉' ? 'text-green-600' : 'text-red-600'}`}>{modalConfig.title}</h2>
                        <p className="text-gray-600 text-base leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: modalConfig.body }} />
                        <button onClick={initGame} className="font-['Fredoka_One',cursive] text-lg bg-amber-600 text-white border-b-4 border-amber-800 rounded-full px-8 py-3 hover:bg-amber-700 active:scale-95 transition-all shadow-md w-full">
                            ↺ Jugar de nuevo
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}