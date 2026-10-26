import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FracData {
    id: number;
    type: "proper" | "improper" | "mixed" | "negative";
    num: number;
    den: number;
    whole: number;
    value: number;
    color: string;
    label: string;
}

interface DragState {
    active: boolean;
    fracId: number | null;
    origin: "card" | "line";
    startX: number;
    currentX: number;
    currentY: number;
    offsetY: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_MIN = -3;
const LINE_MAX = 3;
const LINE_RANGE = LINE_MAX - LINE_MIN;
const CARD_COLORS = ["#38bdf8", "#f59e0b", "#10b981", "#ec4899"];
const MIN_DIVISIONS = 1;
const MAX_DIVISIONS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
}

function fracLabel(num: number, den: number, whole: number, type: string): string {
    if (type === "mixed") return `${whole} ${num}/${den}`;
    return `${num}/${den}`;
}

function generateFractions(): FracData[] {
    const results: FracData[] = [];
    const usedValues = new Set<number>();
    const ensureTypes = ["proper", "improper", "negative"] as const;
    const shuffled = [...ensureTypes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 3; i++) {
        let attempts = 0;
        while (attempts < 200) {
            attempts++;
            const den = 2 + Math.floor(Math.random() * 7);
            let num: number, value: number, type: string;

            if (shuffled[i] === "proper") {
                num = 1 + Math.floor(Math.random() * (den - 1));
                value = num / den;
                type = "proper";
            } else if (shuffled[i] === "improper") {
                const w = Math.floor(Math.random() * 2) + 1; // 1..2
                const rem = 1 + Math.floor(Math.random() * (den - 1));
                value = w + rem / den;
                num = w * den + rem;
                type = "improper";
            } else {
                const w = Math.floor(Math.random() * 2) + 1;
                const rem = 1 + Math.floor(Math.random() * (den - 1));
                value = -(w + rem / den);
                num = -(w * den + rem);
                type = "negative";
            }

            if (value <= LINE_MIN || value >= LINE_MAX) continue;
            if (usedValues.has(value)) continue;
            if (Math.abs(value - Math.round(value)) < 0.01) continue;

            let tooClose = false;
            for (const uv of usedValues) {
                if (Math.abs(uv - value) < 0.28) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            usedValues.add(value);
            const absNum = Math.abs(num);
            const s = absNum > 0 ? gcd(absNum, den) : 1;
            const sn = (num < 0 ? -1 : 1) * (absNum / s);
            const sd = den / s;
            results.push({
                id: i,
                type: type as FracData["type"],
                num: sn,
                den: sd,
                whole: 0,
                value,
                color: CARD_COLORS[i],
                label: fracLabel(sn, sd, 0, type),
            });
            break;
        }
    }

    while (results.length < 4) {
        let attempts = 0;
        while (attempts < 200) {
            attempts++;
            const den = 2 + Math.floor(Math.random() * 7);
            const sign = Math.random() < 0.5 ? 1 : -1;
            const w = Math.floor(Math.random() * 2);
            const rem = 1 + Math.floor(Math.random() * (den - 1));
            const value = sign * (w + rem / den);
            const absNum = w * den + rem;

            if (value <= LINE_MIN || value >= LINE_MAX) continue;
            if (usedValues.has(value)) continue;
            if (Math.abs(value - Math.round(value)) < 0.01) continue;

            let tooClose = false;
            for (const uv of usedValues) {
                if (Math.abs(uv - value) < 0.28) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            usedValues.add(value);
            const s = absNum > 0 ? gcd(absNum, den) : 1;
            const sn = sign * (absNum / s);
            const sd = den / s;
            const type: FracData["type"] = value < 0 ? "negative" : absNum > den ? "improper" : "proper";
            results.push({
                id: results.length,
                type,
                num: sn,
                den: sd,
                whole: 0,
                value,
                color: CARD_COLORS[results.length],
                label: fracLabel(sn, sd, 0, type),
            });
            break;
        }
    }

    return results;
}

function valueToLineX(value: number, width: number): number {
    return ((value - LINE_MIN) / LINE_RANGE) * width;
}

function lineXToValue(x: number, width: number): number {
    if (width <= 0) return 0;
    return LINE_MIN + (x / width) * LINE_RANGE;
}

// ─── FractionCard ─────────────────────────────────────────────────────────────

const FractionCard: React.FC<{
    frac: FracData;
    placed: boolean;
    checking: boolean;
    correct: boolean | null;
    onPointerDown: (e: React.PointerEvent, id: number) => void;
}> = ({ frac, placed, checking, correct, onPointerDown }) => {
    const displayNum = Math.abs(frac.num);
    const parts = frac.label.split(" ");

    let borderStyle = "border-white/15 bg-white/5";
    if (checking) {
        if (correct === true) borderStyle = "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-xs shadow-emerald-500/30";
        else if (correct === false) borderStyle = "border-rose-400 bg-rose-500/20 text-rose-300 shadow-xs shadow-rose-500/30";
    }

    return (
        <div
            onPointerDown={(e) => {
                if (checking && correct === true) return;
                onPointerDown(e, frac.id);
            }}
            className={`relative flex items-center justify-center rounded-xl border-2 px-3 py-1.5 sm:px-4 sm:py-2 select-none transition-all duration-200 ${borderStyle} ${
                placed
                    ? "opacity-25 scale-95 cursor-default"
                    : "cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 shadow-sm"
            }`}
            style={{
                backgroundColor: placed ? "transparent" : frac.color + "18",
                borderColor: placed ? "rgba(255,255,255,0.1)" : checking ? undefined : frac.color + "55",
                minWidth: 70,
                touchAction: "none",
            }}
        >
            {frac.type === "mixed" && parts.length === 2 ? (
                <div className="flex items-baseline gap-1">
                    <span className="text-white font-black text-sm lg:text-base font-mono">{parts[0]}</span>
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-xs lg:text-sm leading-none font-mono">{Math.abs(frac.num)}</span>
                        <div className="w-full h-px bg-white/70 my-0.5" />
                        <span className="text-white font-bold text-xs lg:text-sm leading-none font-mono">{frac.den}</span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-0.5">
                    {frac.num < 0 && (
                        <span className="text-rose-300 font-black text-sm lg:text-base leading-none mr-0.5">−</span>
                    )}
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-xs lg:text-sm leading-none font-mono">{displayNum}</span>
                        <div className="w-full h-px bg-white/70 my-0.5" />
                        <span className="text-white font-bold text-xs lg:text-sm leading-none font-mono">{frac.den}</span>
                    </div>
                </div>
            )}

            {/* Checkmark or error mini-badge when checking */}
            {checking && correct !== null && (
                <div
                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-xs ${
                        correct ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"
                    }`}
                >
                    {correct ? "✓" : "✕"}
                </div>
            )}
        </div>
    );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RectaNumericaFraccionesView() {
    const navigate = useNavigate();
    const lineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [lineWidth, setLineWidth] = useState(0);

    const [fractions, setFractions] = useState<FracData[]>(() => generateFractions());
    const [placed, setPlaced] = useState<Map<number, number>>(new Map());
    const [divisions, setDivisions] = useState(1);
    const [dragState, setDragState] = useState<DragState>({
        active: false,
        fracId: null,
        origin: "card",
        startX: 0,
        currentX: 0,
        currentY: 0,
        offsetY: 0,
    });

    const [checking, setChecking] = useState(false);
    const [results, setResults] = useState<Map<number, boolean>>(new Map());
    const [celebration, setCelebration] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [incorrectIds, setIncorrectIds] = useState<Set<number>>(new Set());
    const [cursorLineX, setCursorLineX] = useState<number | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // ── Measure line width ──
    useEffect(() => {
        const measure = () => {
            if (lineRef.current) {
                setLineWidth(lineRef.current.offsetWidth);
            }
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    // ── Drag handlers ──
    const handleCardPointerDown = useCallback(
        (e: React.PointerEvent, id: number) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setDragState({
                active: true,
                fracId: id,
                origin: placed.has(id) ? "line" : "card",
                startX: e.clientX,
                currentX: e.clientX,
                currentY: e.clientY,
                offsetY: rect.top,
            });
        },
        [placed]
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragState.active) return;
            e.preventDefault();
            setDragState((prev) => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));

            if (lineWidth > 0 && lineRef.current) {
                const lineRect = lineRef.current.getBoundingClientRect();
                const x = e.clientX - lineRect.left;
                if (x < -24 || x > lineWidth + 24) {
                    setCursorLineX(null);
                } else {
                    setCursorLineX(Math.max(0, Math.min(lineWidth, x)));
                }
            }
        },
        [dragState.active, lineWidth]
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!dragState.active || dragState.fracId === null) {
                setDragState((prev) => ({ ...prev, active: false }));
                setCursorLineX(null);
                return;
            }

            const lineEl = lineRef.current;
            if (!lineEl || lineWidth === 0) {
                setDragState({ active: false, fracId: null, origin: "card", startX: 0, currentX: 0, currentY: 0, offsetY: 0 });
                setCursorLineX(null);
                return;
            }

            const lineRect = lineEl.getBoundingClientRect();
            const dropX = e.clientX - lineRect.left;

            // Tolerancia de soltado sobre la recta (incluye zona superior e inferior)
            const dropY = e.clientY - lineRect.top;
            const inLineVerticalZone = dropY >= -60 && dropY <= 140;

            if (inLineVerticalZone && dropX >= -24 && dropX <= lineWidth + 24) {
                let targetX = Math.max(0, Math.min(lineWidth, dropX));

                // Imantado magnético inteligente a la subdivisión o entero más cercano
                const rawVal = lineXToValue(targetX, lineWidth);
                const step = 1 / divisions;
                const nearestTickVal = Math.round(rawVal / step) * step;
                if (nearestTickVal >= LINE_MIN && nearestTickVal <= LINE_MAX) {
                    const tickX = valueToLineX(nearestTickVal, lineWidth);
                    if (Math.abs(targetX - tickX) < 18) {
                        targetX = tickX;
                    }
                }

                setPlaced((prev) => {
                    const next = new Map(prev);
                    next.set(dragState.fracId!, targetX);
                    return next;
                });
                setIncorrectIds((prev) => {
                    const next = new Set(prev);
                    next.delete(dragState.fracId!);
                    return next;
                });
            } else {
                if (dragState.origin === "line") {
                    setPlaced((prev) => {
                        const next = new Map(prev);
                        next.delete(dragState.fracId!);
                        return next;
                    });
                    setIncorrectIds((prev) => {
                        const next = new Set(prev);
                        next.delete(dragState.fracId!);
                        return next;
                    });
                }
            }

            setDragState({ active: false, fracId: null, origin: "card", startX: 0, currentX: 0, currentY: 0, offsetY: 0 });
            setCursorLineX(null);
        },
        [dragState.active, dragState.fracId, dragState.origin, lineWidth, divisions]
    );

    // ── Check ──
    const handleCheck = useCallback(() => {
        if (placed.size < 4) return;

        const cellSize = lineWidth > 0 ? (1 / (divisions * LINE_RANGE)) * lineWidth : 0;
        const tolerance = Math.max(cellSize / 2, lineWidth * 0.016);

        const newResults = new Map<number, boolean>();
        let allCorrect = true;
        const wrongIds: number[] = [];

        for (const frac of fractions) {
            const lineX = placed.get(frac.id);
            if (lineX === undefined) continue;
            const correctX = valueToLineX(frac.value, lineWidth);
            const isCorrect = Math.abs(lineX - correctX) <= tolerance;
            newResults.set(frac.id, isCorrect);
            if (!isCorrect) {
                allCorrect = false;
                wrongIds.push(frac.id);
            }
        }

        setResults(newResults);
        setChecking(true);

        if (allCorrect) {
            setCelebration(true);
            setErrorMsg(null);
            setIncorrectIds(new Set());
        } else {
            const wrongFracs = fractions.filter((f) => wrongIds.includes(f.id));
            const names = wrongFracs.map((f) => f.label).join(" y ");
            setErrorMsg(`Revisa la ubicación de: ${names}`);
            setIncorrectIds(new Set(wrongIds));
        }
    }, [placed, fractions, divisions, lineWidth]);

    // ── New fractions ──
    const handleNewSet = useCallback(() => {
        if (placed.size > 0 && !celebration) return;
        setFractions(generateFractions());
        setPlaced(new Map());
        setDivisions(1);
        setChecking(false);
        setResults(new Map());
        setCelebration(false);
        setErrorMsg(null);
        setIncorrectIds(new Set());
    }, [placed.size, celebration]);

    // ── Reset ──
    const handleReset = useCallback(() => {
        setPlaced(new Map());
        setDivisions(1);
        setChecking(false);
        setResults(new Map());
        setCelebration(false);
        setErrorMsg(null);
        setIncorrectIds(new Set());
    }, []);

    // ── Computed ──
    const allPlaced = placed.size === 4;
    const canRandomize = placed.size === 0 || celebration;

    const dragFrac = dragState.active && dragState.fracId !== null
        ? fractions.find((f) => f.id === dragState.fracId)
        : null;

    return (
        <div
            ref={containerRef}
            className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ fontFamily: "'Nunito', sans-serif", touchAction: "none" }}
        >
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
                        Fracciones en la Recta Numérica
                    </h1>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                        {placed.size}/4 ubicadas
                    </span>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white active:scale-95 transition-all border border-white/10 font-bold text-xs"
                        title="Ayuda didáctica"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* 2. Bandeja Superior de Fracciones (Dock de tarjetas arrastrables) */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/5 bg-[#0d1424] px-2 sm:px-4 py-1.5 lg:py-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 flex-1 justify-center sm:justify-start">
                    {fractions.map((f) => (
                        <FractionCard
                            key={f.id}
                            frac={f}
                            placed={placed.has(f.id)}
                            checking={checking}
                            correct={results.get(f.id) ?? null}
                            onPointerDown={handleCardPointerDown}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNewSet}
                    disabled={!canRandomize}
                    className={`h-8 px-2.5 lg:h-9 lg:px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        canRandomize
                            ? "border-sky-400/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 active:scale-95 cursor-pointer shadow-xs"
                            : "border-white/5 bg-white/5 text-white/20 cursor-not-allowed"
                    }`}
                    title={canRandomize ? "Generar nuevo conjunto de fracciones" : "Reinicia para generar nuevas fracciones"}
                >
                    <span>🎲</span>
                    <span className="hidden sm:inline">Nuevas</span>
                </button>
            </div>

            {/* 3. Área Central: Instrumento de Recta Numérica */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 relative w-full overflow-hidden">
                {/* Micro-guía superior */}
                <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                        Arrastra las tarjetas sobre la recta numérica
                    </span>
                </div>

                <div
                    ref={lineRef}
                    className="relative w-full max-w-5xl"
                    style={{ height: 160 }}
                >
                    {/* Marcadores de fracciones colocadas en la recta */}
                    {fractions.map((f) => {
                        const lx = placed.get(f.id);
                        if (lx === undefined) return null;
                        const isDraggingThis = dragState.active && dragState.fracId === f.id;
                        if (isDraggingThis) return null;

                        let markerColor = f.color;
                        if (checking) {
                            const res = results.get(f.id);
                            if (res === true) markerColor = "#10b981";
                            else if (res === false) markerColor = "#f43f5e";
                        }
                        if (incorrectIds.has(f.id) && !checking) markerColor = "#f43f5e";

                        return (
                            <div
                                key={`m-${f.id}`}
                                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing z-20 transition-transform hover:scale-110"
                                style={{
                                    left: lx,
                                    transform: "translateX(-50%)",
                                    top: 14,
                                    touchAction: "none",
                                }}
                                onPointerDown={(e) => {
                                    if (checking && results.get(f.id) === true) return;
                                    handleCardPointerDown(e, f.id);
                                }}
                            >
                                <div
                                    className="px-2 py-0.5 rounded-lg text-xs font-black shadow-md border border-white/20 flex items-center gap-1 select-none"
                                    style={{ backgroundColor: markerColor, color: "#fff" }}
                                >
                                    <span>{f.label}</span>
                                    {checking && results.get(f.id) !== undefined && (
                                        <span className="text-[10px] leading-none">
                                            {results.get(f.id) ? "✓" : "✕"}
                                        </span>
                                    )}
                                </div>
                                {/* Línea conectora */}
                                <div
                                    className="w-0.5 rounded-full"
                                    style={{ height: 42, backgroundColor: markerColor }}
                                />
                                {/* Pinpoint dot */}
                                <div
                                    className="w-3 h-3 rounded-full border-2 border-[#080c18] shadow-sm -mt-0.5"
                                    style={{ backgroundColor: markerColor }}
                                />
                            </div>
                        );
                    })}

                    {/* Guía vertical translúcida al arrastrar */}
                    {cursorLineX !== null && (
                        <div
                            className="absolute z-10 pointer-events-none"
                            style={{
                                left: cursorLineX,
                                top: 18,
                                bottom: 20,
                                width: 2,
                                borderLeft: "2px dashed rgba(56,189,248,0.7)",
                            }}
                        />
                    )}

                    {/* Ticks de Números Enteros */}
                    <div className="absolute w-full pointer-events-none" style={{ top: 62 }}>
                        {Array.from({ length: LINE_RANGE + 1 }, (_, i) => LINE_MIN + i).map((n) => {
                            const x = valueToLineX(n, lineWidth);
                            const isZero = n === 0;
                            return (
                                <div
                                    key={`t-${n}`}
                                    className={`absolute rounded-full -translate-x-1/2 ${
                                        isZero ? "bg-cyan-300 w-1 h-7 z-10 shadow-xs shadow-cyan-300/50" : "bg-white/80 w-[3px] h-6"
                                    }`}
                                    style={{ left: x }}
                                />
                            );
                        })}
                    </div>

                    {/* Ticks de Subdivisión (Partes por entero) */}
                    {divisions > 1 && (
                        <div className="absolute w-full pointer-events-none" style={{ top: 68 }}>
                            {Array.from({ length: LINE_RANGE }, (_, seg) => LINE_MIN + seg).map((base) => {
                                const ticks: React.ReactNode[] = [];
                                for (let d = 1; d < divisions; d++) {
                                    const val = base + d / divisions;
                                    const x = valueToLineX(val, lineWidth);
                                    ticks.push(
                                        <div
                                            key={`sub-${base}-${d}`}
                                            className="absolute w-[2px] h-3.5 bg-amber-400 rounded-full -translate-x-1/2 opacity-85"
                                            style={{ left: x }}
                                        />
                                    );
                                }
                                return <React.Fragment key={`seg-${base}`}>{ticks}</React.Fragment>;
                            })}
                        </div>
                    )}

                    {/* Línea horizontal principal */}
                    <div className="absolute w-full pointer-events-none" style={{ top: 82, height: 6 }}>
                        <div className="w-full h-1.5 bg-linear-to-r from-rose-500/40 via-cyan-400/80 to-blue-500/40 rounded-full shadow-sm" />
                    </div>

                    {/* Etiquetas numéricas de enteros */}
                    <div className="absolute w-full pointer-events-none" style={{ top: 96 }}>
                        {Array.from({ length: LINE_RANGE + 1 }, (_, i) => LINE_MIN + i).map((n) => {
                            const x = valueToLineX(n, lineWidth);
                            const isZero = n === 0;
                            return (
                                <span
                                    key={n}
                                    className={`absolute font-mono font-black -translate-x-1/2 text-sm lg:text-base ${
                                        isZero ? "text-cyan-300 font-extrabold scale-110" : n < 0 ? "text-rose-300/80" : "text-blue-300/80"
                                    }`}
                                    style={{ left: x }}
                                >
                                    {n}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 4. Barra Inferior de Acción y Feedback (40-48px) */}
            <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
                {/* Control de subdivisiones */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="text-[10px] lg:text-[11px] font-bold text-white/50 hidden xs:inline">
                        Subdivisiones:
                    </span>
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => setDivisions((d) => Math.max(MIN_DIVISIONS, d - 1))}
                            disabled={divisions <= MIN_DIVISIONS}
                            className="w-6 h-6 lg:w-7 lg:h-7 rounded bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-20 text-xs font-black flex items-center justify-center transition-all"
                            title="Disminuir divisiones"
                        >
                            −
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs lg:text-sm text-amber-300">
                            {divisions}
                        </span>
                        <button
                            onClick={() => setDivisions((d) => Math.min(MAX_DIVISIONS, d + 1))}
                            disabled={divisions >= MAX_DIVISIONS}
                            className="w-6 h-6 lg:w-7 lg:h-7 rounded bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-20 text-xs font-black flex items-center justify-center transition-all"
                            title="Aumentar divisiones"
                        >
                            +
                        </button>
                    </div>
                    <span className="text-[10px] text-amber-300/70 font-mono hidden md:inline">
                        (1/{divisions})
                    </span>
                </div>

                {/* Mensaje de feedback central en ranura fija para evitar desplazamientos */}
                <div className="flex-1 min-w-0 text-center px-1">
                    {celebration && (
                        <p className="text-[11px] lg:text-xs font-black text-emerald-400 truncate animate-pulse">
                            🎉 ¡Excelente! Todas las fracciones están en el lugar correcto.
                        </p>
                    )}
                    {!celebration && errorMsg && (
                        <p className="text-[10px] lg:text-xs font-bold text-rose-400 truncate">
                            ⚠️ {errorMsg}
                        </p>
                    )}
                    {!celebration && !errorMsg && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            {allPlaced
                                ? "¡Todas las fracciones están ubicadas! Presiona Comprobar."
                                : `Ubica las ${4 - placed.size} fracciones restantes arrastrándolas.`}
                        </p>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={handleReset}
                        className="h-7 px-2.5 lg:h-8 lg:px-3 text-[11px] lg:text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 active:scale-95 transition-all"
                    >
                        Reiniciar
                    </button>

                    {celebration ? (
                        <button
                            onClick={handleNewSet}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
                        >
                            Nuevo Reto 🎲
                        </button>
                    ) : (
                        <button
                            onClick={handleCheck}
                            disabled={!allPlaced}
                            className={`h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg transition-all ${
                                allPlaced
                                    ? "bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 shadow-sm shadow-teal-500/20 cursor-pointer"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                            }`}
                        >
                            Comprobar
                        </button>
                    )}
                </div>
            </footer>

            {/* Fantasma flotante al arrastrar */}
            {dragState.active && dragFrac && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: dragState.currentX - 35,
                        top: dragState.currentY - 26,
                        transform: "scale(1.12)",
                        opacity: 0.95,
                        filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6))",
                    }}
                >
                    <div
                        className="flex items-center gap-0.5 rounded-xl border-2 px-3 py-1.5 bg-[#0a0f1d] shadow-2xl"
                        style={{ borderColor: dragFrac.color }}
                    >
                        {dragFrac.num < 0 && (
                            <span className="text-rose-300 font-bold text-xs leading-none mr-0.5">−</span>
                        )}
                        <div className="flex flex-col items-center">
                            <span className="text-white font-bold text-xs leading-none font-mono">
                                {Math.abs(dragFrac.num)}
                            </span>
                            <div className="w-full h-px bg-white/80 my-0.5" />
                            <span className="text-white font-bold text-xs leading-none font-mono">
                                {dragFrac.den}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ayuda didáctica */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo ubicar fracciones en la recta?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <ol className="space-y-2.5 text-white/80 text-xs leading-relaxed list-decimal list-inside">
                    <li>
                        <strong className="text-white">Observa</strong> las tarjetas de fracciones que aparecen en la bandeja superior.
                    </li>
                    <li>
                        <strong className="text-white">Arrastra</strong> cada tarjeta hacia la recta numérica y suéltala en la posición que consideras correcta.
                    </li>
                    <li>
                        Usa los botones <strong className="text-amber-400">−</strong> y <strong className="text-amber-400">+</strong> para dividir cada entero en más partes y ubicar las fracciones con mayor precisión gracias al imán inteligente.
                    </li>
                    <li>
                        Puedes <strong className="text-white">volver a arrastrar</strong> una fracción ya colocada en la recta para reajustar su posición, o soltarla fuera para devolverla a la bandeja.
                    </li>
                    <li>
                        Cuando las 4 fracciones estén colocadas, pulsa <strong className="text-teal-400">Comprobar</strong> para verificar tus respuestas.
                    </li>
                    <li>
                        Si todas son correctas, ¡celebra y prueba otro reto! Si no, revisa las tarjetas marcadas en rojo para corregirlas.
                    </li>
                    <li>
                        Usa <strong className="text-white">Reiniciar</strong> para quitar todas las fracciones de la recta, o 🎲 para generar nuevas fracciones.
                    </li>
                </ol>
            </ModalHelp>
        </div>
    );
}
