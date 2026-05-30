import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

type ObjectType = 'star' | 'circle' | 'square' | 'triangle' | 'heart'
type ViewMode = 'free' | 'exercise'

const OBJECT_TYPES: ObjectType[] = ['star', 'circle', 'square', 'triangle', 'heart']
const QUANTITIES = [6, 8, 9, 10, 12, 15, 16, 18, 20, 24]

const COLOR_NEUTRAL = '#334155'
const COLOR_SELECTED = '#2dd4bf'
const COLOR_DEN = '#fbbf24'
const COLOR_NUM = '#2dd4bf'
const COLOR_RESULT = '#34d399'

function getDivisors(n: number): number[] {
    const d: number[] = []
    for (let i = 1; i <= n; i++) {
        if (n % i === 0) d.push(i)
    }
    return d
}

function bestGrid(n: number): [number, number] {
    if (n <= 1) return [1, 1]
    for (let r = Math.floor(Math.sqrt(n)); r >= 1; r--) {
        if (n % r === 0) return [n / r, r]
    }
    return [n, 1]
}

interface Exercise {
    quantity: number
    num: number
    den: number
    level: number
    targetResult?: number
}

function generateExercise(level: number): Exercise {
    switch (level) {
        case 1: {
            const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)]
            const divs = getDivisors(q).filter(d => d > 1 && d < q)
            const den = divs[Math.floor(Math.random() * divs.length)]
            return { quantity: q, num: 1, den, level }
        }
        case 2: {
            const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)]
            const divs = getDivisors(q).filter(d => d > 1 && d < q)
            const den = divs[Math.floor(Math.random() * divs.length)]
            const num = 2 + Math.floor(Math.random() * (den - 2))
            return { quantity: q, num: den > 2 ? num : 1, den, level }
        }
        case 3: {
            const lq = QUANTITIES.filter(q => q >= 15)
            const q = lq[Math.floor(Math.random() * lq.length)]
            const divs = getDivisors(q).filter(d => d > 1 && d < q)
            const den = divs[Math.floor(Math.random() * divs.length)]
            const num = 1 + Math.floor(Math.random() * (den - 1))
            return { quantity: q, num, den, level }
        }
        case 4: {
            const q = 20
            const den = [4, 5][Math.floor(Math.random() * 2)]
            const num = 1 + Math.floor(Math.random() * (den - 1))
            return { quantity: q, num, den, level }
        }
        case 5: {
            const q = 24
            const divs = getDivisors(q).filter(d => d > 1 && d < q)
            const den = divs[Math.floor(Math.random() * divs.length)]
            const num = 1 + Math.floor(Math.random() * (den - 1))
            return { quantity: q, num: 0, den: 1, level, targetResult: (q / den) * num }
        }
        default:
            return generateExercise(1)
    }
}

function ObjIcon({ type, color, size = 28 }: { type: ObjectType; color: string; size?: number }) {
    switch (type) {
        case 'star':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
        case 'circle':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="10" /></svg>
        case 'square':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="2" y="2" width="20" height="20" rx="3" /></svg>
        case 'triangle':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12,2 22,22 2,22" /></svg>
        case 'heart':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
    }
}

function Frac({ num, den, color }: { num: number; den: number; color?: string }) {
    const c = color ?? '#fff'
    return (
        <div className="flex flex-col items-center min-w-[1.5rem]" style={{ color: c }}>
            <span className="font-bold text-lg leading-tight">{num}</span>
            <div className="w-full h-px" style={{ backgroundColor: c }} />
            <span className="font-bold text-lg leading-tight">{den}</span>
        </div>
    )
}

export default function FraccionConjuntoView() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<ViewMode>('free')
    const [level, setLevel] = useState(1)
    const [objectType, setObjectType] = useState<ObjectType>('star')
    const [quantity, setQuantity] = useState(12)
    const [denominator, setDenominator] = useState(1)
    const [numerator, setNumerator] = useState(1)
    const [showMath, setShowMath] = useState(true)
    const [shake, setShake] = useState(false)
    const [exercise, setExercise] = useState<Exercise | null>(null)
    const [checked, setChecked] = useState(false)

    const divisors = getDivisors(quantity)
    const groupSize = denominator > 0 ? quantity / denominator : quantity
    const selectedCount = numerator * groupSize
    const isExercise = mode === 'exercise' && exercise !== null
    const locked = isExercise && exercise.level !== 5

    const triggerShake = useCallback(() => {
        setShake(true)
        setTimeout(() => setShake(false), 400)
    }, [])

    const resetAll = useCallback((q: number) => {
        setQuantity(q)
        setDenominator(1)
        setNumerator(1)
        setChecked(false)
    }, [])

    const handleIncDen = useCallback(() => {
        const idx = divisors.indexOf(denominator)
        if (idx < divisors.length - 1) {
            setDenominator(divisors[idx + 1])
        } else {
            triggerShake()
        }
    }, [divisors, denominator, triggerShake])

    const handleDecDen = useCallback(() => {
        const idx = divisors.indexOf(denominator)
        if (idx > 0) {
            const next = divisors[idx - 1]
            setDenominator(next)
            setNumerator(n => Math.min(n, next))
        }
    }, [divisors, denominator])

    const handleIncNum = useCallback(() => {
        if (denominator > 1 && numerator < denominator) {
            setNumerator(n => n + 1)
        }
    }, [denominator, numerator])

    const handleDecNum = useCallback(() => {
        if (numerator > 0) setNumerator(n => n - 1)
    }, [numerator])

    const handleDice = useCallback(() => {
        const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)]
        const divs = getDivisors(q).filter(d => d > 1 && d < q)
        const den = divs[Math.floor(Math.random() * divs.length)]
        const num = 1 + Math.floor(Math.random() * den)
        setQuantity(q)
        setDenominator(den)
        setNumerator(num)
        setChecked(false)
    }, [])

    const handleStartExercise = useCallback((lvl: number) => {
        const ex = generateExercise(lvl)
        setExercise(ex)
        setLevel(lvl)
        setQuantity(ex.quantity)
        setDenominator(ex.den)
        setNumerator(ex.num)
        setChecked(false)
        setShowMath(true)
    }, [])

    const toggleMode = useCallback(() => {
        if (mode === 'free') {
            setMode('exercise')
            handleStartExercise(level)
        } else {
            setMode('free')
            setExercise(null)
            setChecked(false)
        }
    }, [mode, level, handleStartExercise])

    const [groupCols] = bestGrid(denominator)
    const [innerCols] = bestGrid(groupSize)

    const canIncDen = divisors.indexOf(denominator) < divisors.length - 1
    const canDecDen = denominator > 1
    const canIncNum = denominator > 1 && numerator < denominator
    const canDecNum = numerator > 0

    const qtyIdx = QUANTITIES.indexOf(quantity)
    const canIncQty = qtyIdx < QUANTITIES.length - 1
    const canDecQty = qtyIdx > 0

    const showResult = mode === 'free' || checked
    const isLevel5 = isExercise && exercise.level === 5

    return (
        <div className="min-h-dvh bg-[#080c18] text-white flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button onClick={() => navigate(-1)} className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all">
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">Fracción de un Conjunto</h1>
                <button onClick={toggleMode} className="absolute right-4 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95" style={{
                    background: mode === 'free' ? 'rgba(251,191,36,0.15)' : 'rgba(45,212,191,0.15)',
                    border: mode === 'free' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(45,212,191,0.3)',
                    color: mode === 'free' ? '#fbbf24' : '#2dd4bf'
                }}>
                    {mode === 'free' ? 'Libre' : 'Ejercicio'}
                </button>
            </div>

            {mode === 'exercise' && (
                <div className="flex items-center justify-center gap-2 px-4 py-2">
                    {Array.from({ length: 5 }, (_, i) => i + 1).map(l => (
                        <button key={l} onClick={() => handleStartExercise(l)} className={[
                            'w-8 h-8 rounded-lg font-bold text-sm transition-all',
                            l === level ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'bg-white/10 text-white/50 hover:bg-white/20'
                        ].join(' ')}>{l}</button>
                    ))}
                    <button onClick={() => handleStartExercise(level)} className="ml-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 active:scale-95 transition-all">
                        Nuevo
                    </button>
                </div>
            )}

            <div className="flex flex-col items-center gap-3 px-4 py-2">
                {isLevel5 ? (
                    <div className="flex items-center gap-2 text-lg font-bold flex-wrap justify-center">
                        <span className="text-white/60">¿Qué fracción de</span>
                        <span className="text-xl" style={{ color: COLOR_DEN }}>{quantity}</span>
                        <span className="text-white/60">da</span>
                        <span className="text-xl" style={{ color: COLOR_RESULT }}>{exercise.targetResult}</span>
                        <span className="text-white/60">?</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-lg font-bold flex-wrap justify-center">
                        <span className="text-white/60">¿Cuánto es</span>
                        <Frac num={numerator} den={denominator} color={COLOR_NUM} />
                        <span className="text-white/60">de</span>
                        <span className="text-xl" style={{ color: COLOR_DEN }}>{quantity}</span>
                        <span className="text-white/60">?</span>
                    </div>
                )}

                {mode === 'free' && (
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        <div className="flex gap-1.5 bg-white/5 rounded-xl border border-white/10 p-1.5">
                            {OBJECT_TYPES.map(t => (
                                <button key={t} onClick={() => setObjectType(t)} className={[
                                    'p-1.5 rounded-lg transition-all',
                                    t === objectType ? 'bg-white/15 scale-110' : 'hover:bg-white/5'
                                ].join(' ')}>
                                    <ObjIcon type={t} color={t === objectType ? '#2dd4bf' : '#64748b'} size={20} />
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                            <span className="text-white/50 text-xs">Cantidad</span>
                            <button onClick={() => canDecQty && resetAll(QUANTITIES[qtyIdx - 1])} disabled={!canDecQty} className="w-7 h-7 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none text-sm">−</button>
                            <span className="w-6 text-center font-mono font-bold text-sm">{quantity}</span>
                            <button onClick={() => canIncQty && resetAll(QUANTITIES[qtyIdx + 1])} disabled={!canIncQty} className="w-7 h-7 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none text-sm">+</button>
                        </div>

                        <button onClick={handleDice} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90 transition-all" title="Aleatorio">
                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-amber-400">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className={`flex-1 flex flex-col items-center px-4 py-2 transition-all ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}>
                <div className="grid gap-3 transition-all duration-500" style={{ gridTemplateColumns: `repeat(${groupCols}, auto)` }}>
                    {Array.from({ length: denominator }, (_, gi) => {
                        const isSelected = gi < numerator
                        return (
                            <div key={gi} className={[
                                'grid gap-1 p-2 rounded-xl border-2 transition-all duration-300',
                                isSelected
                                    ? 'border-teal-400/60 bg-teal-500/10'
                                    : 'border-white/10 bg-white/[0.03]'
                            ].join(' ')} style={{ gridTemplateColumns: `repeat(${innerCols}, auto)` }}>
                                {Array.from({ length: groupSize }, (_, oi) => (
                                    <ObjIcon key={oi} type={objectType} color={isSelected ? COLOR_SELECTED : COLOR_NEUTRAL} size={28} />
                                ))}
                            </div>
                        )
                    })}
                </div>

                {denominator > 1 && (
                    <span className="mt-2 text-white/40 text-sm">{groupSize} en cada grupo</span>
                )}
                {numerator > 0 && numerator === denominator && (
                    <span className="text-teal-400/70 text-sm font-semibold">tomaste todo el conjunto</span>
                )}
            </div>

            <div className="flex justify-center gap-4 px-4 py-3 flex-wrap">
                <div className="flex flex-col items-center bg-white/5 rounded-xl border border-white/10 px-4 py-3">
                    <span className="text-[10px] text-white/40 uppercase tracking-wide mb-1 text-center">¿En cuántos grupos divides?</span>
                    <div className="flex items-center gap-3">
                        <button onClick={handleDecDen} disabled={!canDecDen || locked} className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none">−</button>
                        <span className="w-8 text-center font-mono font-bold text-2xl" style={{ color: COLOR_DEN }}>{denominator}</span>
                        <button onClick={handleIncDen} disabled={!canIncDen || locked} className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none">+</button>
                    </div>
                    <span className="text-amber-400/50 text-xs mt-1">denominador</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 rounded-xl border border-white/10 px-4 py-3">
                    <span className="text-[10px] text-white/40 uppercase tracking-wide mb-1 text-center">¿Cuántos grupos tomas?</span>
                    <div className="flex items-center gap-3">
                        <button onClick={handleDecNum} disabled={!canDecNum || locked} className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none">−</button>
                        <span className="w-8 text-center font-mono font-bold text-2xl" style={{ color: COLOR_NUM }}>{numerator}</span>
                        <button onClick={handleIncNum} disabled={!canIncNum || locked} className="w-10 h-10 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none">+</button>
                    </div>
                    <span className="text-teal-400/50 text-xs mt-1">numerador</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 px-4 py-3">
                {showResult && numerator > 0 && (
                    <span className="text-lg">
                        <span className="font-bold" style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                        <span className="text-white/50"> objetos seleccionados</span>
                    </span>
                )}

                {isExercise && !checked && (
                    <button onClick={() => setChecked(true)} className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30">
                        Comprobar
                    </button>
                )}

                {isLevel5 && checked && (
                    <span className={`font-bold text-lg ${selectedCount === exercise.targetResult ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedCount === exercise.targetResult ? '¡Correcto!' : `Incorrecto, era ${exercise.targetResult}`}
                    </span>
                )}

                {denominator > 1 && numerator > 0 && showResult && showMath && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <Frac num={numerator} den={denominator} color={COLOR_NUM} />
                            <span className="text-white/50">de</span>
                            <span className="font-bold" style={{ color: COLOR_DEN }}>{quantity}</span>
                            <span className="text-white/50">=</span>
                            <span className="font-bold text-xl" style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                        </div>

                        <div className="flex flex-col items-center gap-0.5 mt-2 text-sm">
                            <div className="flex items-center gap-1 text-white/60">
                                <span className="text-white/40">Paso 1:</span>
                                <span className="font-bold" style={{ color: COLOR_DEN }}>{quantity}</span>
                                <span>÷</span>
                                <span className="font-bold" style={{ color: COLOR_DEN }}>{denominator}</span>
                                <span>=</span>
                                <span className="font-bold text-white/80">{groupSize}</span>
                                <span className="text-white/40">→ cada grupo tiene {groupSize}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/60">
                                <span className="text-white/40">Paso 2:</span>
                                <span className="font-bold" style={{ color: COLOR_NUM }}>{groupSize}</span>
                                <span>×</span>
                                <span className="font-bold" style={{ color: COLOR_NUM }}>{numerator}</span>
                                <span>=</span>
                                <span className="font-bold" style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                                <span className="text-white/40">→ tomaste {numerator} grupo{numerator > 1 ? 's' : ''} de {groupSize}</span>
                            </div>
                        </div>

                        <button onClick={() => setShowMath(false)} className="mt-1 text-white/30 text-xs hover:text-white/50 transition-colors">
                            ocultar matemática
                        </button>
                    </div>
                )}

                {!showMath && denominator > 1 && numerator > 0 && showResult && (
                    <button onClick={() => setShowMath(true)} className="text-white/30 text-xs hover:text-white/50 transition-colors">
                        mostrar matemática
                    </button>
                )}

                {numerator === 0 && denominator > 1 && (
                    <span className="text-white/50">0 objetos</span>
                )}
            </div>
        </div>
    )
}
