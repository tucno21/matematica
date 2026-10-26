import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────

type Operation = "sum" | "sub";
type Phase = "setup" | "solving" | "complete";
type SubPhase = "moveA" | "moveB" | "done";

interface BarState {
    parts: number;
    colored: boolean[];
}

interface FractionSnapshot {
    numerator: number;
    denominator: number;
}

interface ResultBar {
    parts: number;
    filled: boolean[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const simplify = (num: number, den: number) => {
    if (num === 0) return { num: 0, den: 1 };
    const g = gcd(Math.abs(num), Math.abs(den));
    return { num: num / g, den: den / g };
};

const initBar = (parts: number): BarState => ({
    parts,
    colored: Array(parts).fill(false),
});

const coloredCount = (bar: BarState): number => bar.colored.filter(Boolean).length;

const scaleBar = (bar: BarState, newParts: number): BarState => {
    const num = coloredCount(bar);
    const den = bar.parts;
    const newNum = (num * newParts) / den;
    return {
        parts: newParts,
        colored: Array(newParts)
            .fill(false)
            .map((_, i) => i < newNum),
    };
};

const CONFETTI_COLORS = ["#14b8a6", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#38bdf8"];

const CONFETTI_PIECES = Array.from({ length: 45 }, (_, i) => ({
    id: i,
    x: (i * 22) % 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: (i % 6) * 0.12,
    duration: 1.4 + (i % 4) * 0.25,
    size: 7 + (i % 7) * 1.5,
}));

// ─── FractionDisplay ─────────────────────────────────────────────────────────

const FractionDisplay = ({
    numerator,
    denominator,
    color = "text-white",
    size = "normal",
}: {
    numerator: number;
    denominator: number;
    color?: string;
    size?: "normal" | "large" | "small";
}) => {
    const textSize =
        size === "large"
            ? "text-base lg:text-xl"
            : size === "small"
                ? "text-[10px] lg:text-xs"
                : "text-xs lg:text-sm";
    const lineH = size === "large" ? "h-0.5 my-0.5" : "h-px my-0.5";
    return (
        <div className={`inline-flex flex-col items-center font-bold ${color} ${textSize} leading-none select-none`}>
            <span>{numerator}</span>
            <span className={`w-full bg-current ${lineH} rounded`} />
            <span>{denominator}</span>
        </div>
    );
};

// ─── ConfettiOverlay ──────────────────────────────────────────────────────────

const ConfettiOverlay = ({ active }: { active: boolean }) => {
    if (!active) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {CONFETTI_PIECES.map((p) => (
                <div
                    key={p.id}
                    className="absolute top-0 rounded-xs opacity-0"
                    style={{
                        left: `${p.x}%`,
                        width: p.size,
                        height: p.size * 0.6,
                        backgroundColor: p.color,
                        animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
                    }}
                />
            ))}
            <style>{`
                @keyframes confettiFall {
                    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// ─── FractionBar ─────────────────────────────────────────────────────────────

interface FractionBarProps {
    bar: BarState;
    label: string;
    colorClass: string;
    dotColor: string;
    accentColor: string;
    onToggleCell?: (i: number) => void;
    onChangePartsSetup?: (delta: number) => void;
    onCellTap?: (i: number) => void;
    dimmedIndices?: Set<number>;
    highlightMode?: boolean;
    snap?: FractionSnapshot;
    onScale?: (newParts: number) => void;
    showScaleControls?: boolean;
    disabled?: boolean;
    setupPartsDisabled?: boolean;
    compact?: boolean;
}

const FractionBar = ({
    bar,
    label,
    colorClass,
    dotColor,
    accentColor,
    onToggleCell,
    onChangePartsSetup,
    onCellTap,
    dimmedIndices,
    highlightMode,
    snap,
    onScale,
    showScaleControls,
    disabled,
    setupPartsDisabled,
    compact = false,
}: FractionBarProps) => {
    const num = coloredCount(bar);
    const den = bar.parts;
    const barH = compact ? "h-6 sm:h-7" : "h-7 sm:h-8 lg:h-9";

    return (
        <div className="w-full space-y-1">
            {/* Header info */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {/* Label pill */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${accentColor} border`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="font-bold text-[10px] lg:text-xs tracking-wide uppercase">{label}</span>
                    </div>

                    {/* Scale down button */}
                    {showScaleControls && snap && (
                        <button
                            onClick={() => {
                                const m = bar.parts / snap.denominator;
                                if (m > 1 && onScale) onScale(snap.denominator * (m - 1));
                            }}
                            disabled={disabled || bar.parts / snap.denominator <= 1}
                            className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-md border border-rose-500/40 bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation"
                            title="Reducir ampliación"
                        >
                            ÷
                        </button>
                    )}

                    {/* Fraction display */}
                    <div className="flex items-center px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                        <FractionDisplay
                            numerator={showScaleControls && snap ? snap.numerator : num}
                            denominator={showScaleControls && snap ? snap.denominator : den}
                            color="text-white"
                        />
                    </div>

                    {/* Scale up button */}
                    {showScaleControls && snap && (
                        <button
                            onClick={() => {
                                if (onScale) onScale(snap.denominator * (bar.parts / snap.denominator + 1));
                            }}
                            disabled={disabled || bar.parts >= 24}
                            className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-md border border-indigo-500/40 bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation"
                            title="Aumentar ampliación"
                        >
                            ×
                        </button>
                    )}

                    {/* Equivalent fraction display */}
                    {showScaleControls && snap && snap.denominator !== den && (
                        <div className="flex items-center gap-1 text-[10px] lg:text-xs font-semibold bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-500/30">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold">
                                <span>{snap.numerator} <span className="text-violet-400">×{den / snap.denominator}</span></span>
                                <span className="w-full h-px bg-violet-400/50 my-0.5" />
                                <span>{snap.denominator} <span className="text-violet-400">×{den / snap.denominator}</span></span>
                            </div>
                            <span className="font-bold text-violet-400">=</span>
                            <FractionDisplay numerator={num} denominator={den} color="text-violet-200" size="small" />
                        </div>
                    )}

                    {showScaleControls && snap && snap.denominator === den && (
                        <span className="text-[10px] text-white/40 italic">original</span>
                    )}
                </div>

                {/* Setup parts label */}
                {onChangePartsSetup && (
                    <span className="text-[10px] lg:text-xs text-white/50 font-medium">
                        {den} partes
                    </span>
                )}
            </div>

            {/* Bar Row with + / - controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {onChangePartsSetup && (
                    <button
                        onClick={() => onChangePartsSetup(-1)}
                        disabled={setupPartsDisabled || bar.parts <= 2}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation select-none"
                        aria-label="Reducir partes"
                    >
                        −
                    </button>
                )}

                <div className="flex-1">
                    <div
                        className={`flex w-full rounded-xl overflow-hidden border-2 border-white/40 bg-slate-900/90 shadow-inner ${barH}`}
                    >
                        {bar.colored.map((filled, i) => {
                            const isDimmed = dimmedIndices?.has(i);
                            const tapable =
                                !disabled &&
                                onCellTap &&
                                filled &&
                                !isDimmed &&
                                highlightMode;
                            return (
                                <div
                                    key={i}
                                    onClick={() => {
                                        if (disabled) return;
                                        if (onCellTap && filled && !isDimmed) {
                                            onCellTap(i);
                                        } else if (onToggleCell) {
                                            onToggleCell(i);
                                        }
                                    }}
                                    className={[
                                        "flex-1 border-r-2 last:border-r-0 border-black transition-all duration-150 select-none",
                                        filled
                                            ? isDimmed
                                                ? `${colorClass} opacity-20`
                                                : `${colorClass}`
                                            : "bg-slate-800/80 hover:bg-slate-700/80",
                                        tapable
                                            ? "cursor-pointer hover:brightness-125 active:scale-y-90"
                                            : onToggleCell && !disabled
                                                ? "cursor-pointer hover:opacity-80"
                                                : "cursor-default",
                                        "touch-manipulation",
                                    ].join(" ")}
                                />
                            );
                        })}
                    </div>
                </div>

                {onChangePartsSetup && (
                    <button
                        onClick={() => onChangePartsSetup(1)}
                        disabled={setupPartsDisabled || bar.parts >= 12}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation select-none"
                        aria-label="Aumentar partes"
                    >
                        +
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── ResultBarRow ─────────────────────────────────────────────────────────────

interface ResultBarRowProps {
    bar: ResultBar;
    index: number;
    totalBars: number;
    eliminatingCells: Set<string>;
    compact?: boolean;
}

const ResultBarRow = ({
    bar,
    index,
    totalBars,
    eliminatingCells,
    compact = false,
}: ResultBarRowProps) => {
    const barH = compact ? "h-6 sm:h-7" : "h-7 sm:h-8 lg:h-9";
    return (
        <div className="w-full flex items-center gap-1.5">
            {totalBars > 1 && (
                <span className="text-[10px] font-mono font-bold text-white/50 shrink-0 w-5 text-right">
                    #{index + 1}
                </span>
            )}
            <div
                className={`flex-1 flex rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-900/90 shadow-inner ${barH}`}
            >
                {bar.filled.map((f, i) => {
                    const isEliminating = eliminatingCells.has(`${index}-${i}`);
                    return (
                        <div
                            key={i}
                            className={[
                                "flex-1 border-r-2 last:border-r-0 border-black transition-all duration-300",
                                isEliminating
                                    ? "bg-rose-500"
                                    : f
                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                        : "bg-slate-800/80",
                            ].join(" ")}
                            style={isEliminating ? { animation: "eliminateCell 0.45s ease-in forwards" } : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// ─── OpSign / MathStep ───────────────────────────────────────────────────────

const OpSign = ({ op }: { op: string }) => (
    <span className="text-lg lg:text-2xl font-bold text-white/40 mx-1 select-none">
        {op}
    </span>
);

const MathStep = ({
    label,
    highlight,
    children,
}: {
    label: string;
    highlight?: boolean;
    children: React.ReactNode;
}) => (
    <div
        className={[
            "flex items-center justify-center flex-wrap gap-2 p-2.5 rounded-xl border",
            highlight
                ? "bg-violet-500/15 border-violet-500/30"
                : "bg-white/5 border-white/10",
        ].join(" ")}
    >
        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
            {label}
        </span>
        {children}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SumaRestaFraccionesView() {
    const navigate = useNavigate();

    // ── Core state ──────────────────────────────────────────────────────────────
    const [operation, setOperation] = useState<Operation>("sum");
    const [phase, setPhase] = useState<Phase>("setup");
    const [barA, setBarA] = useState<BarState>(initBar(4));
    const [barB, setBarB] = useState<BarState>(initBar(4));

    const [snapA, setSnapA] = useState<FractionSnapshot | null>(null);
    const [snapB, setSnapB] = useState<FractionSnapshot | null>(null);

    const [subPhase, setSubPhase] = useState<SubPhase>("moveA");
    const [movedA, setMovedA] = useState<Set<number>>(new Set());
    const [movedB, setMovedB] = useState<Set<number>>(new Set());
    const [resultBars, setResultBars] = useState<ResultBar[]>([]);
    const [eliminatingCells, setEliminatingCells] = useState<Set<string>>(new Set());
    const eliminatingLockRef = useRef(false);

    const [isHeterogeneous, setIsHeterogeneous] = useState(false);
    const [heteroJoined, setHeteroJoined] = useState(false);

    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [subtractionAlert, setSubtractionAlert] = useState(false);
    const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [showConfetti, setShowConfetti] = useState(false);
    const [showMath, setShowMath] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ── Alert helper ────────────────────────────────────────────────────────────
    const showAlert = useCallback((msg: string) => {
        setAlertMsg(msg);
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setAlertMsg(null), 2500);
    }, []);

    // ── Setup handlers ──────────────────────────────────────────────────────────
    const handleToggleCell = (bar: "A" | "B", i: number) => {
        const setter = bar === "A" ? setBarA : setBarB;
        setter((prev) => {
            const c = [...prev.colored];
            c[i] = !c[i];
            return { ...prev, colored: c };
        });
    };

    const handleChangePartsSetup = (bar: "A" | "B", delta: number) => {
        const setter = bar === "A" ? setBarA : setBarB;
        setter((prev) => {
            const newParts = Math.max(2, Math.min(12, prev.parts + delta));
            if (newParts === prev.parts) return prev;
            return scaleBar(prev, newParts);
        });
    };

    // ── Resolver ─────────────────────────────────────────────────────────────────
    const numA = coloredCount(barA);
    const numB = coloredCount(barB);
    const canResolve =
        numA > 0 &&
        numB > 0 &&
        !(operation === "sub" && numB > numA);

    const handleResolve = () => {
        if (!canResolve) {
            if (operation === "sub" && numB > numA) {
                setSubtractionAlert(true);
                setTimeout(() => setSubtractionAlert(false), 2500);
            }
            return;
        }

        const het = barA.parts !== barB.parts;

        setSnapA({ numerator: numA, denominator: barA.parts });
        setSnapB({ numerator: numB, denominator: barB.parts });
        setIsHeterogeneous(het);
        setHeteroJoined(false);
        setMovedA(new Set());
        setMovedB(new Set());
        setSubPhase("moveA");
        setShowMath(false);

        if (!het) {
            const den = barA.parts;
            setResultBars([{ parts: den, filled: Array(den).fill(false) }]);
        } else {
            setResultBars([{ parts: barA.parts, filled: [] }]);
        }

        setPhase("solving");
    };

    // ── Heterogeneous: scale a bar by multiplier ──────────────────────────────
    const handleScaleBar = (bar: "A" | "B", newParts: number) => {
        const snap = bar === "A" ? snapA : snapB;
        if (!snap) return;

        const newNum = (snap.numerator * newParts) / snap.denominator;
        const newBarState: BarState = {
            parts: newParts,
            colored: Array(newParts)
                .fill(false)
                .map((_, i) => i < newNum),
        };

        if (bar === "A") {
            setBarA(newBarState);
            if (newParts === barB.parts) {
                setResultBars([{ parts: newParts, filled: Array(newParts).fill(false) }]);
            } else {
                setResultBars([{ parts: newParts, filled: [] }]);
            }
        } else {
            setBarB(newBarState);
            if (newParts === barA.parts) {
                setResultBars([{ parts: newParts, filled: Array(newParts).fill(false) }]);
            } else {
                setResultBars([{ parts: barA.parts, filled: [] }]);
            }
        }
    };

    const denominatorsMatch =
        isHeterogeneous && barA.parts === barB.parts && barA.parts > 1;

    // ── Homogeneous: tap cell to move ─────────────────────────────────────────
    const findLastFilled = (bars: ResultBar[]): [number, number] | null => {
        for (let bi = bars.length - 1; bi >= 0; bi--) {
            for (let ci = bars[bi].filled.length - 1; ci >= 0; ci--) {
                if (bars[bi].filled[ci]) return [bi, ci];
            }
        }
        return null;
    };

    const addOneToResult = (prev: ResultBar[]): ResultBar[] => {
        const bars = prev.map((b) => ({ ...b, filled: [...b.filled] }));
        for (const rb of bars) {
            const idx = rb.filled.indexOf(false);
            if (idx !== -1) {
                rb.filled[idx] = true;
                return bars;
            }
        }
        const den = bars[0]?.parts ?? 1;
        const newBar: ResultBar = {
            parts: den,
            filled: Array(den).fill(false).map((_, i) => i === 0),
        };
        return [...bars, newBar];
    };

    const removeOneFromResult = (prev: ResultBar[]): ResultBar[] => {
        const bars = prev.map((b) => ({ ...b, filled: [...b.filled] }));
        for (let bi = bars.length - 1; bi >= 0; bi--) {
            for (let ci = bars[bi].filled.length - 1; ci >= 0; ci--) {
                if (bars[bi].filled[ci]) {
                    bars[bi].filled[ci] = false;
                    return bars;
                }
            }
        }
        return bars;
    };

    const handleCellTap = (bar: "A" | "B", cellIndex: number) => {
        if (isHeterogeneous) {
            if (!denominatorsMatch) {
                showAlert("Las piezas son de distinto tamaño. Necesitas hacerlas iguales primero.");
            }
            return;
        }

        if (bar === "A") {
            if (subPhase !== "moveA") return;
            if (movedA.has(cellIndex)) return;
            if (!barA.colored[cellIndex]) return;

            const newMovedA = new Set(movedA);
            newMovedA.add(cellIndex);
            setMovedA(newMovedA);
            setResultBars((prev) => addOneToResult(prev));

            const totalAColored = barA.colored.filter(Boolean).length;
            if (newMovedA.size >= totalAColored) {
                setSubPhase("moveB");
            }
        } else {
            if (subPhase !== "moveB") return;
            if (movedB.has(cellIndex)) return;
            if (!barB.colored[cellIndex]) return;

            const newMovedB = new Set(movedB);
            newMovedB.add(cellIndex);
            setMovedB(newMovedB);

            if (operation === "sum") {
                setResultBars((prev) => addOneToResult(prev));
            } else {
                if (eliminatingLockRef.current) return;
                const target = findLastFilled(resultBars);
                if (!target) return;
                const [bi, ci] = target;
                const key = `${bi}-${ci}`;
                eliminatingLockRef.current = true;
                setEliminatingCells((prev) => new Set(prev).add(key));
                setTimeout(() => {
                    setResultBars((prev) => removeOneFromResult(prev));
                    setEliminatingCells((prev) => {
                        const next = new Set(prev);
                        next.delete(key);
                        return next;
                    });
                    eliminatingLockRef.current = false;
                }, 450);
            }
        }
    };

    // ── canCheck ─────────────────────────────────────────────────────────────────
    const totalAColored = barA.colored.filter(Boolean).length;
    const totalBColored = barB.colored.filter(Boolean).length;
    const allAMoved = movedA.size >= totalAColored;
    const allBMoved = movedB.size >= totalBColored;

    const canCheck = phase === "solving" && !isHeterogeneous && allAMoved && allBMoved;
    const canCheckHetero = phase === "solving" && isHeterogeneous && heteroJoined;

    // ── Hetero join/eliminate ─────────────────────────────────────────────────
    const handleHeteroJoin = () => {
        if (!denominatorsMatch) return;
        const den = barA.parts;
        const nA = coloredCount(barA);
        const nB = coloredCount(barB);
        let finalNum = operation === "sum" ? nA + nB : nA - nB;
        if (finalNum < 0) finalNum = 0;

        const barsNeeded = Math.max(1, Math.ceil(finalNum / den));
        const newBars: ResultBar[] = Array.from({ length: barsNeeded }, (_, bi) => ({
            parts: den,
            filled: Array(den).fill(false).map((_, ci) => bi * den + ci < finalNum),
        }));

        setResultBars(newBars);
        setHeteroJoined(true);
        setSubPhase("done");
    };

    // ── Comprobar ─────────────────────────────────────────────────────────────
    const handleCheck = () => {
        setPhase("complete");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
    };

    // ── Result fraction values ────────────────────────────────────────────────
    const resultNumerator = resultBars.reduce(
        (acc, rb) => acc + rb.filled.filter(Boolean).length,
        0
    );
    const resultDenominator = resultBars[0]?.parts ?? 1;
    const simplified = simplify(resultNumerator, resultDenominator);
    const needsSimplify =
        simplified.num !== resultNumerator || simplified.den !== resultDenominator;

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setPhase("setup");
        setBarA(initBar(4));
        setBarB(initBar(4));
        setSnapA(null);
        setSnapB(null);
        setResultBars([]);
        setMovedA(new Set());
        setMovedB(new Set());
        setSubPhase("moveA");
        setIsHeterogeneous(false);
        setHeteroJoined(false);
        setShowMath(false);
        setShowConfetti(false);
        setAlertMsg(null);
        setSubtractionAlert(false);
        setEliminatingCells(new Set());
        eliminatingLockRef.current = false;
    };

    // ── Instruction text ──────────────────────────────────────────────────────
    const getInstruction = (): { text: string; tone: "blue" | "amber" | "green" | "emerald" } => {
        if (phase === "setup") {
            return {
                text: operation === "sum"
                    ? "Ajusta las partes con +/− y toca las celdas para colorearlas. Luego pulsa Resolver."
                    : "Colorea más partes en la Barra A que en la Barra B. Luego pulsa Resolver.",
                tone: "blue",
            };
        }
        if (phase === "solving") {
            if (isHeterogeneous) {
                if (!denominatorsMatch)
                    return {
                        text: "Partes de distinto tamaño. Usa × y ÷ para igualar los denominadores de ambas barras.",
                        tone: "amber",
                    };
                if (!heteroJoined)
                    return {
                        text: operation === "sum"
                            ? "¡Denominadores iguales! Pulsa «Juntar» para sumar las partes en el resultado."
                            : "¡Denominadores iguales! Pulsa «Eliminar» para restar las partes del resultado.",
                        tone: "green",
                    };
                return { text: "¡Listo! Pulsa «Comprobar» para verificar tu respuesta.", tone: "green" };
            }
            if (subPhase === "moveA")
                return { text: "Toca las partes coloreadas de la Barra A para trasladarlas al resultado.", tone: "blue" };
            if (subPhase === "moveB")
                return {
                    text: operation === "sum"
                        ? "Ahora toca las partes coloreadas de la Barra B para sumarlas."
                        : "Ahora toca las partes de la Barra B: se restarán del resultado.",
                    tone: "blue",
                };
            return { text: "¡Listo! Pulsa «Comprobar» para verificar tu respuesta.", tone: "green" };
        }
        return { text: "¡Operación completada correctamente!", tone: "emerald" };
    };

    const { text: instrText, tone: instrTone } = getInstruction();

    const instrStyles = {
        amber: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        green: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        blue: "bg-sky-500/15 border-sky-500/30 text-sky-300",
    };
    const instrClass = instrStyles[instrTone];

    // ── Math steps ────────────────────────────────────────────────────────────
    const renderMathSteps = () => {
        if (!snapA || !snapB) return null;
        const opSym = operation === "sum" ? "+" : "−";

        if (!isHeterogeneous) {
            return (
                <div className="space-y-2 text-center text-white">
                    <MathStep label="1">
                        <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                        <OpSign op={opSym} />
                        <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                        <OpSign op="=" />
                        <span className="text-xl font-bold text-white/40">?</span>
                    </MathStep>
                    <MathStep label="2">
                        <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" color="text-teal-400" />
                        <OpSign op={opSym} />
                        <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" color="text-amber-400" />
                        <OpSign op="=" />
                        <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-400" />
                    </MathStep>
                    {needsSimplify && (
                        <MathStep label="3" highlight>
                            <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-400" />
                            <OpSign op="=" />
                            <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-violet-400" />
                            <span className="text-xs text-white/60 ml-1">(simplificado)</span>
                        </MathStep>
                    )}
                </div>
            );
        }

        const multA = barA.parts / snapA.denominator;
        const multB = barB.parts / snapB.denominator;
        const eqNumA = snapA.numerator * multA;
        const eqNumB = snapB.numerator * multB;
        const eqDen = barA.parts;

        return (
            <div className="space-y-2 text-center text-white">
                <MathStep label="1">
                    <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                    <OpSign op={opSym} />
                    <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                    <OpSign op="=" />
                    <span className="text-xl font-bold text-white/40">?</span>
                </MathStep>
                <MathStep label="2">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-base lg:text-lg text-teal-300">
                                <span>{snapA.numerator} <span className="text-indigo-400 text-xs">×{multA}</span></span>
                                <span className="w-full h-0.5 bg-teal-400 my-0.5 rounded" />
                                <span>{snapA.denominator} <span className="text-indigo-400 text-xs">×{multA}</span></span>
                            </div>
                            <span className="text-white/40 font-bold">=</span>
                            <FractionDisplay numerator={eqNumA} denominator={eqDen} size="large" color="text-teal-400" />
                        </div>
                        <div className="w-px h-6 bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-base lg:text-lg text-amber-300">
                                <span>{snapB.numerator} <span className="text-indigo-400 text-xs">×{multB}</span></span>
                                <span className="w-full h-0.5 bg-amber-400 my-0.5 rounded" />
                                <span>{snapB.denominator} <span className="text-indigo-400 text-xs">×{multB}</span></span>
                            </div>
                            <span className="text-white/40 font-bold">=</span>
                            <FractionDisplay numerator={eqNumB} denominator={eqDen} size="large" color="text-amber-400" />
                        </div>
                    </div>
                </MathStep>
                <MathStep label="3">
                    <FractionDisplay numerator={eqNumA} denominator={eqDen} size="large" color="text-teal-400" />
                    <OpSign op={opSym} />
                    <FractionDisplay numerator={eqNumB} denominator={eqDen} size="large" color="text-amber-400" />
                    <OpSign op="=" />
                    <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-400" />
                </MathStep>
                {needsSimplify && (
                    <MathStep label="4" highlight>
                        <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-400" />
                        <OpSign op="=" />
                        <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-violet-400" />
                        <span className="text-xs text-white/60 ml-1">(simplificado)</span>
                    </MathStep>
                )}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none">
            <ConfettiOverlay active={showConfetti} />

            {/* 1. Header (34-44px) */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-7 px-2 lg:h-8 lg:px-3 items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white/80 active:scale-95 transition-all"
                >
                    ← <span className="hidden xs:inline">Volver</span>
                </button>

                <div className="flex items-center gap-1.5 truncate px-1">
                    <h1 className="text-[13px] lg:text-[15px] font-bold text-white truncate">
                        Suma y Resta de Fracciones
                    </h1>
                    {phase !== "setup" && (
                        <span className={[
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0",
                            phase === "complete"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
                        ].join(" ")}>
                            {phase === "complete" ? "¡Completado!" : "Resolviendo"}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setShowHelp(true)}
                    className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs lg:text-sm active:scale-95 transition-all"
                    title="Ayuda"
                >
                    ?
                </button>
            </header>

            {/* 2. Barra de entrada o control superior (32-38px) */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs">
                {/* Selector de operación en setup */}
                {phase === "setup" ? (
                    <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 shrink-0">
                        <button
                            onClick={() => setOperation("sum")}
                            className={[
                                "px-2 py-0.5 rounded-md font-bold text-[11px] lg:text-xs transition-all active:scale-95 flex items-center gap-1",
                                operation === "sum"
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-white/60 hover:text-white/90",
                            ].join(" ")}
                        >
                            <span>+</span>
                            <span>Suma</span>
                        </button>
                        <button
                            onClick={() => setOperation("sub")}
                            className={[
                                "px-2 py-0.5 rounded-md font-bold text-[11px] lg:text-xs transition-all active:scale-95 flex items-center gap-1",
                                operation === "sub"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-white/60 hover:text-white/90",
                            ].join(" ")}
                        >
                            <span>−</span>
                            <span>Resta</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={[
                            "w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs text-white",
                            operation === "sum" ? "bg-indigo-600" : "bg-rose-600",
                        ].join(" ")}>
                            {operation === "sum" ? "+" : "−"}
                        </span>
                        <span className="font-bold text-white/80 text-[11px] lg:text-xs">
                            {operation === "sum" ? "Suma" : "Resta"}
                        </span>
                    </div>
                )}

                {/* Banner de instrucción / Alerta */}
                <div className="flex-1 min-w-0 flex items-center justify-end">
                    {(alertMsg || subtractionAlert) ? (
                        <div className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] lg:text-xs font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-300 truncate">
                            <span>⚠️</span>
                            <span className="truncate">{alertMsg ?? "No puedes restar más de lo que hay en la Barra A."}</span>
                        </div>
                    ) : (
                        <div className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] lg:text-xs font-medium border ${instrClass} truncate`}>
                            <span className="shrink-0">
                                {instrTone === "amber" ? "⚡" : instrTone === "green" ? "✓" : instrTone === "emerald" ? "🎉" : "💡"}
                            </span>
                            <span className="truncate">{instrText}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Área de trabajo central (flex-1 min-h-0) */}
            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4 overflow-hidden relative">
                <div className={`w-full max-w-2xl bg-[#0d1424]/90 border border-white/10 rounded-2xl shadow-xl flex flex-col justify-center transition-all ${
                    resultBars.length > 1
                        ? "p-2 sm:p-2.5 lg:p-3 gap-1.5 lg:gap-2"
                        : "p-2.5 sm:p-3 lg:p-4 gap-2 lg:gap-3"
                }`}>
                    {/* Barra A */}
                    <FractionBar
                        bar={barA}
                        label="Barra A"
                        colorClass="bg-gradient-to-r from-teal-500 to-teal-400"
                        dotColor="bg-teal-400"
                        accentColor="bg-teal-500/15 text-teal-300 border-teal-500/30"
                        onToggleCell={phase === "setup" ? (i) => handleToggleCell("A", i) : undefined}
                        onChangePartsSetup={phase === "setup" ? (d) => handleChangePartsSetup("A", d) : undefined}
                        setupPartsDisabled={phase !== "setup"}
                        onCellTap={phase === "solving" && !isHeterogeneous ? (i) => handleCellTap("A", i) : undefined}
                        dimmedIndices={phase === "solving" && !isHeterogeneous ? movedA : undefined}
                        highlightMode={phase === "solving" && !isHeterogeneous && subPhase === "moveA"}
                        showScaleControls={phase === "solving" && isHeterogeneous && !heteroJoined}
                        snap={snapA ?? undefined}
                        onScale={phase === "solving" && isHeterogeneous && !heteroJoined ? (n) => handleScaleBar("A", n) : undefined}
                        disabled={phase === "complete" || (phase === "solving" && isHeterogeneous && heteroJoined)}
                        compact={resultBars.length > 1}
                    />

                    {/* Divisor con signo de operación */}
                    <div className="flex items-center justify-center my-0.5 relative">
                        <div className="w-full h-px bg-white/10" />
                        <div className={[
                            "absolute rounded-full flex items-center justify-center font-black text-white shadow-md transition-all",
                            resultBars.length > 1 ? "w-5 h-5 text-[10px]" : "w-6 h-6 lg:w-7 lg:h-7 text-xs lg:text-sm",
                            operation === "sum" ? "bg-indigo-600" : "bg-rose-600",
                        ].join(" ")}>
                            {operation === "sum" ? "+" : "−"}
                        </div>
                    </div>

                    {/* Barra B */}
                    <FractionBar
                        bar={barB}
                        label="Barra B"
                        colorClass="bg-gradient-to-r from-amber-500 to-amber-400"
                        dotColor="bg-amber-400"
                        accentColor="bg-amber-500/15 text-amber-300 border-amber-500/30"
                        onToggleCell={phase === "setup" ? (i) => handleToggleCell("B", i) : undefined}
                        onChangePartsSetup={phase === "setup" ? (d) => handleChangePartsSetup("B", d) : undefined}
                        setupPartsDisabled={phase !== "setup"}
                        onCellTap={phase === "solving" && !isHeterogeneous ? (i) => handleCellTap("B", i) : undefined}
                        dimmedIndices={phase === "solving" && !isHeterogeneous ? movedB : undefined}
                        highlightMode={phase === "solving" && !isHeterogeneous && subPhase === "moveB"}
                        showScaleControls={phase === "solving" && isHeterogeneous && !heteroJoined}
                        snap={snapB ?? undefined}
                        onScale={phase === "solving" && isHeterogeneous && !heteroJoined ? (n) => handleScaleBar("B", n) : undefined}
                        disabled={phase === "complete" || (phase === "solving" && isHeterogeneous && heteroJoined)}
                        compact={resultBars.length > 1}
                    />

                    {/* Barra de Resultado (durante resolución o al completar) */}
                    {(phase === "solving" || phase === "complete") &&
                        resultBars.length > 0 &&
                        resultBars[0].parts > 0 && (
                            <div className="pt-1.5 border-t border-white/10 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] lg:text-xs font-bold uppercase tracking-wide">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>Resultado</span>
                                    </div>
                                    {phase === "complete" && (
                                        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                            <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} color="text-emerald-300" />
                                            {needsSimplify && (
                                                <>
                                                    <span className="text-white/50 font-bold text-xs">=</span>
                                                    <FractionDisplay numerator={simplified.num} denominator={simplified.den} color="text-violet-300" />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {resultBars.map((rb, idx) => (
                                        <ResultBarRow
                                            key={idx}
                                            bar={rb}
                                            index={idx}
                                            totalBars={resultBars.length}
                                            eliminatingCells={eliminatingCells}
                                            compact={resultBars.length > 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                </div>
            </main>

            {/* 4. Barra inferior de acción y feedback (40-48px) */}
            <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
                {/* Feedback / Progreso a la izquierda */}
                <div className="flex items-center gap-2 min-w-0">
                    {phase === "setup" && (
                        <div className="text-[10px] sm:text-[11px] lg:text-xs text-white/50 truncate font-mono">
                            A: {numA}/{barA.parts} · B: {numB}/{barB.parts}
                        </div>
                    )}
                    {phase === "solving" && !isHeterogeneous && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] lg:text-xs font-bold">
                            <span className="text-white/60">Trasladadas:</span>
                            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                A: {movedA.size}/{totalAColored}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                B: {movedB.size}/{totalBColored}
                            </span>
                        </div>
                    )}
                    {phase === "solving" && isHeterogeneous && (
                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] lg:text-xs font-bold">
                            <span className="text-white/60">Denominadores:</span>
                            <span className={denominatorsMatch ? "text-emerald-400" : "text-amber-400"}>
                                {denominatorsMatch ? "¡Coinciden!" : "Distintos"}
                            </span>
                        </div>
                    )}
                    {phase === "complete" && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] lg:text-xs font-bold text-emerald-400">
                            <span>🎉 ¡Operación correcta!</span>
                        </div>
                    )}
                </div>

                {/* Botón principal de acción a la derecha */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {phase === "setup" && (
                        <button
                            onClick={handleResolve}
                            disabled={!canResolve}
                            className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 disabled:cursor-not-allowed text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                        >
                            Resolver →
                        </button>
                    )}

                    {phase === "solving" && isHeterogeneous && denominatorsMatch && !heteroJoined && (
                        <button
                            onClick={handleHeteroJoin}
                            className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                        >
                            {operation === "sum" ? "🤝 Juntar" : "✂️ Eliminar"}
                        </button>
                    )}

                    {phase === "solving" && (canCheck || canCheckHetero) && (
                        <button
                            onClick={handleCheck}
                            className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                        >
                            ✓ Comprobar
                        </button>
                    )}

                    {phase === "complete" && (
                        <>
                            <button
                                onClick={() => setShowMath(true)}
                                className="h-7 px-2.5 lg:h-8 lg:px-4 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] lg:text-xs font-bold text-indigo-300 border border-indigo-500/30 transition-all active:scale-95"
                            >
                                📐 Ver matemática
                            </button>
                            <button
                                onClick={handleReset}
                                className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                            >
                                🔄 Nuevo
                            </button>
                        </>
                    )}
                </div>
            </footer>

            {/* Modal de Pasos Matemáticos */}
            {showMath && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="w-full max-w-lg bg-[#0d1424] border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-base">📐</span>
                                <h3 className="text-sm font-bold text-white">Pasos Matemáticos Detallados</h3>
                            </div>
                            <button
                                onClick={() => setShowMath(false)}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white font-bold text-xs transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto py-3 pr-1 flex-1 min-h-0">
                            {renderMathSteps()}
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowMath(false)}
                                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ayuda */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo sumar y restar fracciones?"
                bgColor="#0d1424"
                titleColor="#f8fafc"
                buttonColor="bg-indigo-600 hover:bg-indigo-500"
            >
                <ol className="space-y-2.5 text-white/80 text-xs sm:text-sm leading-relaxed list-decimal list-inside">
                    <li>Elige la operación: <strong className="text-indigo-400">Suma</strong> o <strong className="text-rose-400">Resta</strong>.</li>
                    <li>Ajusta la <strong className="text-teal-400">Barra A</strong> y la <strong className="text-amber-400">Barra B</strong> usando los botones <strong>+</strong> y <strong>−</strong> para cambiar el número de partes, y toca las celdas para colorearlas.</li>
                    <li>Presiona <strong className="text-indigo-400">Resolver</strong> para comenzar la interactividad.</li>
                    <li>Si tienen el <strong>mismo denominador</strong>, toca las partes de la Barra A y luego de la Barra B para trasladarlas o restarlas en el resultado.</li>
                    <li>Si tienen <strong>distinto denominador</strong>, usa los botones <strong className="text-indigo-400">×</strong> y <strong className="text-rose-400">÷</strong> para ampliar o reducir cada barra hasta igualar los denominadores. Luego pulsa <strong className="text-emerald-400">Juntar</strong> o <strong className="text-rose-400">Eliminar</strong>.</li>
                    <li>Pulsa <strong className="text-emerald-400">Comprobar</strong> para verificar tu respuesta.</li>
                    <li>Al completar, pulsa <strong className="text-indigo-300">📐 Ver matemática</strong> para consultar la resolución paso a paso.</li>
                </ol>
            </ModalHelp>
        </div>
    );
}
