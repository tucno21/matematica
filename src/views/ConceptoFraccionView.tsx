import { useState, useCallback, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'

type FigureType = 'bar' | 'circle' | 'hexagon' | 'square'

const FIGURES: FigureType[] = ['bar', 'circle', 'hexagon', 'square']

const FILLED = '#2dd4bf'
const EMPTY = '#1e293b'
const STROKE = '#475569'

const BREAKPOINT = 640

function subscribe() { return () => {} }

function useIsSmall() {
    return useSyncExternalStore(
        subscribe,
        () => typeof window !== 'undefined' ? window.innerWidth < BREAKPOINT : false,
        () => false
    )
}

function squareGrid(d: number): [number, number] {
    if (d <= 1) return [1, 1]
    for (let r = Math.floor(Math.sqrt(d)); r >= 1; r--) {
        if (d % r === 0) {
            const c = d / r
            if (c >= r) return [c, r]
        }
    }
    return [d, 1]
}

interface FigGroup {
    colored: number
    total: number
}

function getGroups(num: number, den: number): FigGroup[] {
    if (num === 0) return [{ colored: 0, total: den }]
    const groups: FigGroup[] = []
    const complete = Math.floor(num / den)
    const rem = num % den
    for (let i = 0; i < complete && groups.length < 4; i++) {
        groups.push({ colored: den, total: den })
    }
    if (rem > 0 && groups.length < 4) {
        groups.push({ colored: rem, total: den })
    }
    if (groups.length === 0) groups.push({ colored: 0, total: den })
    return groups
}

function Frac({ num, den, color, small }: { num: number; den: number; color?: string; small?: boolean }) {
    const c = color ?? '#fff'
    const sz = small ? 'text-sm' : 'text-xl'
    return (
        <div className="flex flex-col items-center min-w-[2rem]" style={{ color: c }}>
            <span className={`font-bold ${sz} leading-tight`}>{num}</span>
            <div className="w-full h-px" style={{ backgroundColor: c }} />
            <span className={`font-bold ${sz} leading-tight`}>{den}</span>
        </div>
    )
}

function FigureIcon({ type }: { type: FigureType }) {
    switch (type) {
        case 'bar':
            return <div className="w-8 h-4 rounded bg-current" />
        case 'circle':
            return <div className="w-6 h-6 rounded-full bg-current" />
        case 'hexagon':
            return (
                <svg width={28} height={28} viewBox="0 0 28 28">
                    <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="currentColor" />
                </svg>
            )
        case 'square':
            return <div className="w-6 h-6 rounded-sm bg-current" />
    }
}

function BarFigure({ parts, colored }: { parts: number; colored: number }) {
    if (parts <= 1) {
        return (
            <div
                className="w-full rounded-xl overflow-hidden border-2 border-teal-400/50 transition-all duration-300"
                style={{ minHeight: 60, background: colored > 0 ? FILLED : EMPTY }}
            />
        )
    }
    return (
        <div className="flex w-full rounded-xl overflow-hidden border-2 border-teal-400/50 transition-all duration-300" style={{ minHeight: 60 }}>
            {Array.from({ length: parts }, (_, i) => (
                <div
                    key={i}
                    className="flex-1 border-r-[3px] last:border-r-0 border-gray-600/80 transition-all duration-300"
                    style={{ minHeight: 60, background: i < colored ? FILLED : EMPTY }}
                />
            ))}
        </div>
    )
}

function CircleFigure({ parts, colored }: { parts: number; colored: number }) {
    const s = 200
    const cx = s / 2
    const cy = s / 2
    const r = s / 2 - 6

    if (parts <= 1) {
        return (
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
                <circle cx={cx} cy={cy} r={r} fill={colored > 0 ? FILLED : EMPTY} stroke={STROKE} strokeWidth={2.5} className="transition-all duration-300" />
            </svg>
        )
    }

    return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
            {Array.from({ length: parts }, (_, i) => {
                const a0 = (i * 2 * Math.PI) / parts - Math.PI / 2
                const a1 = ((i + 1) * 2 * Math.PI) / parts - Math.PI / 2
                const x0 = cx + r * Math.cos(a0)
                const y0 = cy + r * Math.sin(a0)
                const x1 = cx + r * Math.cos(a1)
                const y1 = cy + r * Math.sin(a1)
                const la = parts <= 2 ? 0 : (a1 - a0 > Math.PI ? 1 : 0)
                return (
                    <path
                        key={i}
                        d={`M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${la} 1 ${x1} ${y1}Z`}
                        fill={i < colored ? FILLED : EMPTY}
                        stroke={STROKE}
                        strokeWidth={2}
                        className="transition-all duration-300"
                    />
                )
            })}
        </svg>
    )
}

function HexagonFigure({ parts, colored, uid }: { parts: number; colored: number; uid: string }) {
    const s = 200
    const cx = s / 2
    const cy = s / 2
    const r = s / 2 - 6

    const hexPts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 - Math.PI / 6
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')

    if (parts <= 1) {
        return (
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
                <polygon points={hexPts} fill={colored > 0 ? FILLED : EMPTY} stroke={STROKE} strokeWidth={2.5} className="transition-all duration-300" />
            </svg>
        )
    }

    return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
            <defs>
                <clipPath id={`hc-${uid}`}>
                    <polygon points={hexPts} />
                </clipPath>
            </defs>
            <g clipPath={`url(#hc-${uid})`}>
                {Array.from({ length: parts }, (_, i) => {
                    const a0 = (i * 2 * Math.PI) / parts - Math.PI / 2
                    const a1 = ((i + 1) * 2 * Math.PI) / parts - Math.PI / 2
                    const x0 = cx + r * Math.cos(a0)
                    const y0 = cy + r * Math.sin(a0)
                    const x1 = cx + r * Math.cos(a1)
                    const y1 = cy + r * Math.sin(a1)
                    const la = parts <= 2 ? 0 : (a1 - a0 > Math.PI ? 1 : 0)
                    return (
                        <path
                            key={i}
                            d={`M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${la} 1 ${x1} ${y1}Z`}
                            fill={i < colored ? FILLED : EMPTY}
                            stroke={STROKE}
                            strokeWidth={2}
                            className="transition-all duration-300"
                        />
                    )
                })}
            </g>
            <polygon points={hexPts} fill="none" stroke={STROKE} strokeWidth={2.5} />
        </svg>
    )
}

function SquareFigure({ parts, colored }: { parts: number; colored: number }) {
    const s = 200
    if (parts <= 1) {
        return (
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
                <rect x={4} y={4} width={s - 8} height={s - 8} rx={4} fill={colored > 0 ? FILLED : EMPTY} stroke={STROKE} strokeWidth={2.5} className="transition-all duration-300" />
            </svg>
        )
    }

    const [cols, rows] = squareGrid(parts)
    const pad = 4
    const inner = s - pad * 2
    const cw = inner / cols
    const ch = inner / rows

    return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-auto">
            {Array.from({ length: parts }, (_, i) => {
                const col = i % cols
                const row = Math.floor(i / cols)
                return (
                    <rect
                        key={i}
                        x={pad + col * cw}
                        y={pad + row * ch}
                        width={cw}
                        height={ch}
                        fill={i < colored ? FILLED : EMPTY}
                        stroke={STROKE}
                        strokeWidth={2}
                        className="transition-all duration-300"
                    />
                )
            })}
        </svg>
    )
}

function FigureRender({ type, parts, colored, uid }: { type: FigureType; parts: number; colored: number; uid: string }) {
    switch (type) {
        case 'bar':
            return <BarFigure parts={parts} colored={colored} />
        case 'circle':
            return <CircleFigure parts={parts} colored={colored} />
        case 'hexagon':
            return <HexagonFigure parts={parts} colored={colored} uid={uid} />
        case 'square':
            return <SquareFigure parts={parts} colored={colored} />
    }
}

export default function ConceptoFraccionView() {
    const navigate = useNavigate()
    const [figType, setFigType] = useState<FigureType>('bar')
    const [num, setNum] = useState(1)
    const [den, setDen] = useState(1)
    const [uid] = useState(() => Math.random().toString(36).slice(2))

    const canDecDen = den > 1 && (den - 1) >= num
    const canIncDen = den < 20
    const canDecNum = num > 0
    const canIncNum = den > 1 && num < 4 * den

    const handleDecDen = useCallback(() => {
        setDen(prev => {
            if (prev <= 1) return prev
            const next = prev - 1
            setNum(n => Math.min(n, next))
            return next
        })
    }, [])

    const handleIncDen = useCallback(() => setDen(d => d + 1), [])
    const handleDecNum = useCallback(() => setNum(n => n - 1), [])
    const handleIncNum = useCallback(() => setNum(n => n + 1), [])

    const groups = getGroups(num, den)
    const whole = Math.floor(num / den)
    const rem = num % den

    const isSmall = useIsSmall()

    const figureButtons = (
        <>
            {FIGURES.map(type => (
                <button
                    key={type}
                    onClick={() => setFigType(type)}
                    className={[
                        'p-2.5 rounded-xl border-2 transition-all duration-300',
                        type === figType
                            ? 'border-teal-400 bg-teal-500/20 shadow-lg shadow-teal-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 active:scale-95',
                    ].join(' ')}
                >
                    <FigureIcon type={type} />
                </button>
            ))}
            <div className={isSmall ? 'w-8 h-px bg-white/10 mx-1' : 'w-8 h-px bg-white/10 my-1'} />
            <button
                onClick={() => { setNum(1); setDen(1) }}
                className="p-2.5 rounded-xl border-2 border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 active:scale-90 transition-all"
                title="Reiniciar a 1/1"
            >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
            </button>
        </>
    )

    return (
        <div className="min-h-dvh bg-[#080c18] text-white flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
                >
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">¿Qué es una Fracción?</h1>
            </div>

            {isSmall && (
                <div className="flex gap-2 justify-center px-4 py-2 flex-wrap">
                    {figureButtons}
                </div>
            )}

            {!isSmall && (
                <div className="absolute right-0 top-2 bottom-0 flex flex-col items-center gap-3 pt-2 pb-4 px-2 z-10">
                    {figureButtons}
                </div>
            )}

            <div className="flex flex-col items-center flex-1">
                <div className="flex justify-center px-4 py-4">
                    <div className="flex flex-col items-center bg-white/5 rounded-2xl border border-white/10 px-8 py-5">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleDecNum}
                                disabled={!canDecNum}
                                className="w-12 h-12 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none"
                            >−</button>
                            <span className="w-10 text-center font-mono font-bold text-3xl transition-all duration-300">{num}</span>
                            <button
                                onClick={handleIncNum}
                                disabled={!canIncNum}
                                className="w-12 h-12 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none"
                            >+</button>
                            <span className="text-teal-400/70 text-sm font-semibold flex items-center gap-1 ml-2">← <span className="italic">numerador</span></span>
                        </div>
                        <span className="text-[10px] text-white/40 tracking-wide uppercase mt-1">partes coloreadas</span>

                        <div className="w-full h-px bg-white/30 my-2" />

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleDecDen}
                                disabled={!canDecDen}
                                className="w-12 h-12 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none"
                            >−</button>
                            <span className="w-10 text-center font-mono font-bold text-3xl transition-all duration-300">{den}</span>
                            <button
                                onClick={handleIncDen}
                                disabled={!canIncDen}
                                className="w-12 h-12 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none"
                            >+</button>
                            <span className="text-amber-400/70 text-sm font-semibold flex items-center gap-1 ml-2">← <span className="italic">denominador</span></span>
                        </div>
                        <span className="text-[10px] text-white/40 tracking-wide uppercase mt-1">partes totales</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center py-3 w-full">
                    <div className="flex gap-3 justify-center flex-wrap w-[95%] sm:w-[85%]">
                        {groups.map((g, i) => (
                            <div
                                key={`${figType}-${i}`}
                                className="flex flex-col items-center gap-2 transition-all duration-500"
                                style={figType === 'bar' ? { width: '100%' } : { width: `${100 / Math.min(groups.length, 4)}%`, maxWidth: '220px' }}
                            >
                                <div className="w-full">
                                    <FigureRender type={figType} parts={g.total} colored={g.colored} uid={`${uid}-${i}`} />
                                </div>
                                <Frac num={g.colored} den={g.total} color="#2dd4bf" small />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                        <Frac num={num} den={den} color="#2dd4bf" />

                        {num === 0 && (
                            <>
                                <span className="text-white/40 text-xl">·</span>
                                <span className="text-white/50 text-lg">ninguna parte</span>
                            </>
                        )}

                        {num > 0 && num === den && (
                            <>
                                <span className="text-white/40 text-xl">=</span>
                                <span className="text-teal-400 font-bold text-xl">1 entero completo</span>
                            </>
                        )}

                        {num > den && rem === 0 && (
                            <>
                                <span className="text-white/40 text-xl">=</span>
                                <span className="text-teal-400 font-bold text-2xl">{whole}</span>
                            </>
                        )}

                        {num > den && rem > 0 && (
                            <>
                                <span className="text-white/40 text-xl">=</span>
                                <span className="text-teal-400 font-bold text-2xl">{whole}</span>
                                <span className="text-white/40 text-xl">+</span>
                                <Frac num={rem} den={den} color="#2dd4bf" />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
