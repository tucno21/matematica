import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ModalHelp from '../components/ModalHelp'

type FigureType = 'bar' | 'circle' | 'hexagon' | 'square'

const FIGURES: FigureType[] = ['bar', 'circle', 'hexagon', 'square']

const FILLED = '#2dd4bf'
const EMPTY = '#1e293b'
const STROKE = '#475569'

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
    const sz = small ? 'text-xs lg:text-sm' : 'text-lg lg:text-2xl'
    return (
        <div className="flex flex-col items-center min-w-[1.6rem] lg:min-w-[2.2rem]" style={{ color: c }}>
            <span className={`font-bold ${sz} leading-none font-mono`}>{num}</span>
            <div className="w-full h-0.5 my-0.5" style={{ backgroundColor: c }} />
            <span className={`font-bold ${sz} leading-none font-mono`}>{den}</span>
        </div>
    )
}

function FigureIcon({ type }: { type: FigureType }) {
    switch (type) {
        case 'bar':
            return <div className="w-6 h-3 rounded bg-current" />
        case 'circle':
            return <div className="w-5 h-5 rounded-full bg-current" />
        case 'hexagon':
            return (
                <svg width={20} height={20} viewBox="0 0 28 28">
                    <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="currentColor" />
                </svg>
            )
        case 'square':
            return <div className="w-5 h-5 rounded-xs bg-current" />
    }
}

function BarFigure({ parts, colored }: { parts: number; colored: number }) {
    if (parts <= 1) {
        return (
            <div
                className="w-full h-7 sm:h-9 lg:h-11 rounded-lg sm:rounded-xl overflow-hidden border-2 border-teal-400/50 transition-all duration-300"
                style={{ background: colored > 0 ? FILLED : EMPTY }}
            />
        )
    }
    return (
        <div className="flex w-full h-7 sm:h-9 lg:h-11 rounded-lg sm:rounded-xl overflow-hidden border-2 border-teal-400/50 transition-all duration-300">
            {Array.from({ length: parts }, (_, i) => (
                <div
                    key={i}
                    className="flex-1 border-r-[2px] sm:border-r-[3px] last:border-r-0 border-gray-600/80 transition-all duration-300"
                    style={{ background: i < colored ? FILLED : EMPTY }}
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
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
                <circle cx={cx} cy={cy} r={r} fill={colored > 0 ? FILLED : EMPTY} stroke={STROKE} strokeWidth={2.5} className="transition-all duration-300" />
            </svg>
        )
    }

    return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
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
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
                <polygon points={hexPts} fill={colored > 0 ? FILLED : EMPTY} stroke={STROKE} strokeWidth={2.5} className="transition-all duration-300" />
            </svg>
        )
    }

    return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
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
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
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
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full max-h-[min(30vh,140px)] sm:max-h-[min(35vh,170px)] lg:max-h-[220px] aspect-square">
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
    const [showHelp, setShowHelp] = useState(false)

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

    const figureToolbar = (
        <div className="flex items-center gap-1.5 justify-center flex-wrap">
            {FIGURES.map(type => (
                <button
                    key={type}
                    onClick={() => setFigType(type)}
                    className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-xl border flex items-center justify-center transition-all ${
                        type === figType
                            ? 'border-teal-400 bg-teal-500/25 text-teal-300 shadow-sm shadow-teal-500/30'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 active:scale-95'
                    }`}
                    title={`Figura: ${type}`}
                >
                    <FigureIcon type={type} />
                </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-0.5" />
            <button
                onClick={() => { setNum(1); setDen(1) }}
                className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 active:scale-90 transition-all flex items-center justify-center text-amber-400"
                title="Reiniciar a 1/1"
            >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
            </button>
        </div>
    )

    const fractionCard = (
        <div className="flex flex-col items-center bg-white/5 rounded-2xl border border-white/10 p-2 sm:p-3 lg:p-4 w-full">
            {/* Numerator row */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={handleDecNum}
                        disabled={!canDecNum}
                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg sm:rounded-xl bg-white/10 text-white font-bold text-base lg:text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                    >−</button>
                    <span className="w-8 sm:w-9 text-center font-mono font-bold text-xl sm:text-2xl lg:text-3xl transition-all duration-300 text-teal-300">
                        {num}
                    </span>
                    <button
                        onClick={handleIncNum}
                        disabled={!canIncNum}
                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg sm:rounded-xl bg-white/10 text-white font-bold text-base lg:text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                    >+</button>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-teal-400 font-bold text-xs lg:text-sm">← <span className="italic">numerador</span></span>
                    <span className="text-[9px] lg:text-[10px] text-white/40 uppercase tracking-wider">partes coloreadas</span>
                </div>
            </div>

            <div className="w-full h-px bg-white/20 my-1.5 sm:my-2" />

            {/* Denominator row */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={handleDecDen}
                        disabled={!canDecDen}
                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg sm:rounded-xl bg-white/10 text-white font-bold text-base lg:text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                    >−</button>
                    <span className="w-8 sm:w-9 text-center font-mono font-bold text-xl sm:text-2xl lg:text-3xl transition-all duration-300 text-amber-300">
                        {den}
                    </span>
                    <button
                        onClick={handleIncDen}
                        disabled={!canIncDen}
                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg sm:rounded-xl bg-white/10 text-white font-bold text-base lg:text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                    >+</button>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-amber-400 font-bold text-xs lg:text-sm">← <span className="italic">denominador</span></span>
                    <span className="text-[9px] lg:text-[10px] text-white/40 uppercase tracking-wider">partes totales</span>
                </div>
            </div>
        </div>
    )

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* 1. Header (34-44px) */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/70 hover:text-white shrink-0 border border-white/10"
                        title="Volver"
                    >
                        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-[12px] sm:text-[13px] lg:text-[15px] font-bold text-white truncate">
                        ¿Qué es una Fracción?
                    </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white active:scale-95 transition-all border border-white/10 font-bold text-xs"
                        title="Ayuda didáctica"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* 2. Área Central Adaptable (Responsive para Portrait y Landscape en Tablets y Escritorio) */}
            <div className="flex-1 min-h-0 flex flex-col landscape:flex-row items-stretch p-1 sm:p-2 lg:p-3 gap-2 lg:gap-3 overflow-hidden">
                {/* Panel de Controles: Columna lateral en landscape, superior en portrait */}
                <div className="shrink-0 flex flex-col justify-between gap-1.5 sm:gap-2 w-full landscape:w-[260px] sm:landscape:w-[280px] lg:landscape:w-[330px] bg-[#0a0f1d] border border-white/10 rounded-2xl p-2 lg:p-3">
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 text-center">
                            Selecciona representación
                        </span>
                        {figureToolbar}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {fractionCard}
                    </div>

                    <div className="hidden landscape:block bg-teal-500/10 border border-teal-500/20 rounded-xl px-2.5 py-1.5 text-center">
                        <p className="text-[11px] text-teal-300 font-bold leading-tight">
                            El denominador divide el todo
                        </p>
                        <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                            El numerador indica cuántas partes tomas
                        </p>
                    </div>
                </div>

                {/* Lienzo Visual de Figuras y Ecuación */}
                <div className="flex-1 min-w-0 flex flex-col justify-between items-center bg-[#060a14] border border-white/10 rounded-2xl p-2 lg:p-3 overflow-hidden">
                    {/* Contenedor de figuras */}
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
                        <div className="flex gap-2 lg:gap-4 justify-center items-center flex-wrap w-full max-w-4xl max-h-full overflow-hidden p-1">
                            {groups.map((g, i) => (
                                <div
                                    key={`${figType}-${i}`}
                                    className="flex flex-col items-center justify-center gap-1.5 transition-all duration-300 min-h-0"
                                    style={
                                        figType === 'bar'
                                            ? { width: '100%', maxWidth: '420px' }
                                            : {
                                                  width: `${Math.floor(100 / Math.min(groups.length, 4)) - 2}%`,
                                                  maxWidth: groups.length === 1 ? '170px' : '140px',
                                              }
                                    }
                                >
                                    <div className="w-full flex items-center justify-center min-h-0">
                                        <FigureRender
                                            type={figType}
                                            parts={g.total}
                                            colored={g.colored}
                                            uid={`${uid}-${i}`}
                                        />
                                    </div>
                                    <Frac num={g.colored} den={g.total} color="#2dd4bf" small />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Barra de interpretación y equivalencia matemática (nunca se corta) */}
                    <div className="h-10 lg:h-12 shrink-0 border-t border-white/10 w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap px-2 text-sm sm:text-base lg:text-lg">
                        <Frac num={num} den={den} color="#2dd4bf" />

                        {num === 0 && (
                            <>
                                <span className="text-white/40">·</span>
                                <span className="text-white/60 font-semibold text-xs sm:text-sm lg:text-base">ninguna parte</span>
                            </>
                        )}

                        {num > 0 && num === den && (
                            <>
                                <span className="text-white/40">=</span>
                                <span className="text-teal-400 font-bold text-xs sm:text-sm lg:text-base">1 entero completo</span>
                            </>
                        )}

                        {num > den && rem === 0 && (
                            <>
                                <span className="text-white/40">=</span>
                                <span className="text-teal-400 font-bold text-base sm:text-lg lg:text-xl font-mono">{whole}</span>
                                <span className="text-white/50 text-xs sm:text-sm">enteros</span>
                            </>
                        )}

                        {num > den && rem > 0 && (
                            <>
                                <span className="text-white/40">=</span>
                                <span className="text-teal-400 font-bold text-base sm:text-lg lg:text-xl font-mono">{whole}</span>
                                <span className="text-white/40">+</span>
                                <Frac num={rem} den={den} color="#2dd4bf" />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Ayuda */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo graficar fracciones?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside">
                    <li>
                        <strong className="text-white">Elige una figura:</strong> barra, círculo, hexágono o cuadrado.
                    </li>
                    <li>
                        Aumenta o disminuye el <strong className="text-teal-400">numerador</strong> (partes coloreadas) con los botones <strong>+</strong> y <strong>−</strong>.
                    </li>
                    <li>
                        Aumenta o disminuye el <strong className="text-amber-400">denominador</strong> (partes totales) con los botones <strong>+</strong> y <strong>−</strong>.
                    </li>
                    <li>
                        Observa cómo la figura se divide y colorea según la fracción que armaste.
                    </li>
                    <li>
                        Si el numerador es mayor que el denominador, verás <strong className="text-white">varias figuras</strong> representando la fracción mixta.
                    </li>
                    <li>
                        Usa el botón de <strong className="text-amber-400">reiniciar</strong> para volver a 1/1.
                    </li>
                </ol>
            </ModalHelp>
        </div>
    )
}
