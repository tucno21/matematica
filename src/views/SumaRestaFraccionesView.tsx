import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
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

/** Redistribute colored cells proportionally when denominator changes (exact fractions only) */
const scaleBar = (bar: BarState, newParts: number): BarState => {
    const num = coloredCount(bar);
    const den = bar.parts;
    // new numerator = num * (newParts / den) — only call this when it's exact
    const newNum = (num * newParts) / den;
    return {
        parts: newParts,
        colored: Array(newParts)
            .fill(false)
            .map((_, i) => i < newNum),
    };
};

const CONFETTI_COLORS = ["#14b8a6", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#f97316"];

// ─── FractionDisplay ─────────────────────────────────────────────────────────

const FractionDisplay = ({
    numerator,
    denominator,
    color = "text-gray-800",
    size = "normal",
}: {
    numerator: number;
    denominator: number;
    color?: string;
    size?: "normal" | "large" | "small";
}) => {
    const textSize =
        size === "large"
            ? "text-2xl md:text-3xl"
            : size === "small"
                ? "text-xs"
                : "text-base md:text-lg";
    const lineH = size === "large" ? "h-0.5 my-1" : "h-px my-0.5";
    return (
        <div
            className={`inline-flex flex-col items-center font-bold ${color} ${textSize} leading-none select-none`}
        >
            <span>{numerator}</span>
            <span className={`w-full bg-current ${lineH} rounded`} />
            <span>{denominator}</span>
        </div>
    );
};

// ─── ConfettiOverlay ──────────────────────────────────────────────────────────

const ConfettiOverlay = ({ active }: { active: boolean }) => {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    useEffect(() => {
        if (active) {
            setPieces(
                Array.from({ length: 60 }, (_, i) => ({
                    id: i,
                    x: Math.random() * 100,
                    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                    delay: Math.random() * 0.5,
                    duration: 1.5 + Math.random() * 1.5,
                    size: 6 + Math.random() * 10,
                }))
            );
        } else {
            setPieces([]);
        }
    }, [active]);

    if (!active) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="absolute top-0 rounded-sm opacity-0"
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
    colorClass: string;        // e.g. "bg-teal-400"
    dotColor: string;          // e.g. "bg-teal-400"
    // Setup
    onToggleCell?: (i: number) => void;
    onChangePartsSetup?: (delta: number) => void;
    // Solving homogeneous
    onCellTap?: (i: number) => void;
    dimmedIndices?: Set<number>;
    highlightMode?: boolean;
    // Solving heterogeneous
    snap?: FractionSnapshot;
    onScale?: (newParts: number) => void;
    showScaleControls?: boolean;
    // General
    disabled?: boolean;
    setupPartsDisabled?: boolean;
}

const FractionBar = ({
    bar,
    label,
    colorClass,
    dotColor,
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
}: FractionBarProps) => {
    const num = coloredCount(bar);
    const den = bar.parts;

    return (
        <div className="w-full space-y-2">
            {/* ── Header ── */}
            <div className="flex items-center gap-2 flex-wrap min-h-7">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <span className="font-semibold text-gray-700 text-sm md:text-base">{label}</span>
                {showScaleControls && snap && (
                    <button
                        onClick={() => {
                            const m = bar.parts / snap.denominator;
                            if (m > 1 && onScale) onScale(snap.denominator * (m - 1));
                        }}
                        disabled={disabled || bar.parts / snap.denominator <= 1}
                        className="w-7 h-7 rounded-lg border border-gray-400 bg-white text-rose-400 font-bold text-sm flex items-center justify-center active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation"
                    >
                        ÷
                    </button>
                )}
                <FractionDisplay
                    numerator={showScaleControls && snap ? snap.numerator : num}
                    denominator={showScaleControls && snap ? snap.denominator : den}
                    color="text-gray-800"
                />
                {showScaleControls && snap && (
                    <button
                        onClick={() => {
                            if (onScale) onScale(snap.denominator * (bar.parts / snap.denominator + 1));
                        }}
                        disabled={disabled}
                        className="w-7 h-7 rounded-lg border border-gray-400 bg-white text-indigo-500 font-bold text-sm flex items-center justify-center active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation"
                    >
                        ×
                    </button>
                )}
                {showScaleControls && snap && snap.denominator !== den && (
                    <div className="flex items-center gap-2 text-xs font-medium bg-indigo-50/80 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200/60 ml-1">
                        <div className="inline-flex flex-col items-center leading-none select-none font-bold">
                            <span>{snap.numerator} <span className="text-indigo-500">× {den / snap.denominator}</span></span>
                            <span className="w-full h-px bg-indigo-300 my-0.5" />
                            <span>{snap.denominator} <span className="text-indigo-500">× {den / snap.denominator}</span></span>
                        </div>
                        <span className="font-bold text-sm text-indigo-400">=</span>
                        <FractionDisplay numerator={num} denominator={den} color="text-indigo-700" size="small" />
                    </div>
                )}
                {showScaleControls && snap && snap.denominator === den && (
                    <div className="text-xs text-gray-400 ml-1">fracción original</div>
                )}
            </div>

            {/* ── Bar row ── */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Setup − button */}
                {onChangePartsSetup && (
                    <button
                        onClick={() => onChangePartsSetup(-1)}
                        disabled={setupPartsDisabled || bar.parts <= 2}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-xl border border-gray-300 bg-white text-gray-500 font-bold text-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 select-none"
                        aria-label="Reducir partes"
                    >
                        −
                    </button>
                )}

                {/* Bar */}
                <div className="flex-1">
                    <div
                        className="flex w-full rounded-xl overflow-hidden border-2 border-gray-700 shadow-md"
                        style={{ minHeight: 54 }}
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
                                        "flex-1 border-r last:border-r-0 border-gray-700 transition-all duration-150 select-none",
                                        filled
                                            ? isDimmed
                                                ? `${colorClass} opacity-25`
                                                : `${colorClass}`
                                            : "bg-slate-100",
                                        tapable
                                            ? "cursor-pointer hover:brightness-110 active:scale-y-90"
                                            : onToggleCell && !disabled
                                                ? "cursor-pointer hover:opacity-80"
                                                : "cursor-default",
                                        "touch-manipulation",
                                    ].join(" ")}
                                    style={{ minHeight: 54 }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Setup + button */}
                {onChangePartsSetup && (
                    <button
                        onClick={() => onChangePartsSetup(1)}
                        disabled={setupPartsDisabled || bar.parts >= 12}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-xl border border-gray-300 bg-white text-gray-500 font-bold text-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 select-none"
                        aria-label="Aumentar partes"
                    >
                        +
                    </button>
                )}
            </div>

            {/* Parts count */}
            {onChangePartsSetup && (
                <div className="text-xs text-gray-400 font-medium ml-12">
                    {den} partes
                </div>
            )}
        </div>
    );
};

// ─── ResultBarRow ─────────────────────────────────────────────────────────────

const ResultBarRow = ({ bar, index, eliminatingCells }: { bar: ResultBar; index: number; eliminatingCells: Set<string> }) => (
    <div className="w-full space-y-1">
        {index > 0 && (
            <div className="text-center text-xs text-gray-400 font-medium">
                barra {index + 1}
            </div>
        )}
        <div
            className="flex w-full rounded-xl overflow-hidden border-2 border-emerald-400/60 shadow-md"
            style={{ minHeight: 54 }}
        >
            {bar.filled.map((f, i) => {
                const isEliminating = eliminatingCells.has(`${index}-${i}`);
                return (
                    <div
                        key={i}
                        className={[
                            "flex-1 border-r last:border-r-0 border-gray-700 transition-all duration-300",
                            isEliminating
                                ? "bg-red-500"
                                : f
                                    ? "bg-gradient-to-b from-emerald-400 to-emerald-500"
                                    : "bg-emerald-50/70",
                        ].join(" ")}
                        style={{
                            minHeight: 54,
                            ...(isEliminating ? { animation: "eliminateCell 0.45s ease-in forwards" } : {}),
                        }}
                    />
                );
            })}
        </div>
        <style>{`
            @keyframes eliminateCell {
                0%   { transform: scaleY(1); opacity: 1; }
                40%  { transform: scaleY(1); opacity: 1; background-color: #ef4444; }
                100% { transform: scaleY(0.3); opacity: 0; }
            }
        `}</style>
    </div>
);

// ─── OpSign / MathStep ───────────────────────────────────────────────────────

const OpSign = ({ op }: { op: string }) => (
    <span className="text-2xl md:text-3xl font-bold text-gray-300 mx-2 select-none">
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
            "flex items-center justify-center flex-wrap gap-2 p-3 rounded-xl",
            highlight ? "bg-purple-50/80 border border-purple-200/60" : "bg-gray-50/80 border border-gray-200/50",
        ].join(" ")}
    >
        <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mr-1 shadow-sm">
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

    // Snapshots (saved when Resolver is pressed)
    const [snapA, setSnapA] = useState<FractionSnapshot | null>(null);
    const [snapB, setSnapB] = useState<FractionSnapshot | null>(null);

    // Solving
    const [subPhase, setSubPhase] = useState<SubPhase>("moveA");
    const [movedA, setMovedA] = useState<Set<number>>(new Set());
    const [movedB, setMovedB] = useState<Set<number>>(new Set());
    const [resultBars, setResultBars] = useState<ResultBar[]>([]);
    const [eliminatingCells, setEliminatingCells] = useState<Set<string>>(new Set());
    const eliminatingLockRef = useRef(false);

    // Heterogeneous
    const [isHeterogeneous, setIsHeterogeneous] = useState(false);
    const [heteroJoined, setHeteroJoined] = useState(false);

    // Alerts
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [subtractionAlert, setSubtractionAlert] = useState(false);
    const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Complete
    const [showConfetti, setShowConfetti] = useState(false);
    const [showMath, setShowMath] = useState(false);

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

    // ── Heterogeneous: scale a bar by multiplier ─────────────────────────────────
    const handleScaleBar = (bar: "A" | "B", newParts: number) => {
        const setter = bar === "A" ? setBarA : setBarB;
        const snap = bar === "A" ? snapA : snapB;
        if (!snap) return;
        setter(() => {
            // numerator scales exactly
            const newNum = (snap.numerator * newParts) / snap.denominator;
            return {
                parts: newParts,
                colored: Array(newParts)
                    .fill(false)
                    .map((_, i) => i < newNum),
            };
        });
    };

    // Update result bar preview when denoms match (hetero)
    const denominatorsMatch =
        isHeterogeneous && barA.parts === barB.parts && barA.parts > 1;

    useEffect(() => {
        if (phase === "solving" && isHeterogeneous && !heteroJoined) {
            if (denominatorsMatch) {
                const den = barA.parts;
                setResultBars([{ parts: den, filled: Array(den).fill(false) }]);
            } else {
                setResultBars([{ parts: barA.parts, filled: [] }]);
            }
        }
    }, [barA.parts, barB.parts, phase, isHeterogeneous, heteroJoined, denominatorsMatch]);

    // ── Homogeneous: tap cell to move ─────────────────────────────────────────────

    const findLastFilled = (bars: ResultBar[]): [number, number] | null => {
        for (let bi = bars.length - 1; bi >= 0; bi--) {
            for (let ci = bars[bi].filled.length - 1; ci >= 0; ci--) {
                if (bars[bi].filled[ci]) return [bi, ci];
            }
        }
        return null;
    };
    const handleCellTap = (bar: "A" | "B", cellIndex: number) => {
        if (isHeterogeneous) {
            if (!denominatorsMatch) {
                showAlert(
                    "Las piezas son de distinto tamaño. Necesitas hacerlas iguales primero."
                );
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

            // Add one filled cell to result bars
            setResultBars((prev) => addOneToResult(prev));

            // Check if ALL of A is now moved
            const totalAColored = barA.colored.filter(Boolean).length;
            if (newMovedA.size >= totalAColored) {
                setSubPhase("moveB");
            }
        } else {
            // Bar B
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

    const addOneToResult = (prev: ResultBar[]): ResultBar[] => {
        const bars = prev.map((b) => ({ ...b, filled: [...b.filled] }));
        for (const rb of bars) {
            const idx = rb.filled.indexOf(false);
            if (idx !== -1) {
                rb.filled[idx] = true;
                return bars;
            }
        }
        // All bars full — add a new one
        const den = bars[0]?.parts ?? 1;
        const newBar: ResultBar = {
            parts: den,
            filled: Array(den)
                .fill(false)
                .map((_, i) => i === 0),
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

    // ── canCheck ─────────────────────────────────────────────────────────────────
    const totalAColored = barA.colored.filter(Boolean).length;
    const totalBColored = barB.colored.filter(Boolean).length;
    const allAMoved = movedA.size >= totalAColored;
    const allBMoved = movedB.size >= totalBColored;

    const canCheck =
        phase === "solving" && !isHeterogeneous && allAMoved && allBMoved;
    const canCheckHetero = phase === "solving" && isHeterogeneous && heteroJoined;

    // ── Hetero join/eliminate ────────────────────────────────────────────────────
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
            filled: Array(den)
                .fill(false)
                .map((_, ci) => bi * den + ci < finalNum),
        }));

        setResultBars(newBars);
        setHeteroJoined(true);
        setSubPhase("done");
    };

    // ── Comprobar ──────────────────────────────────────────────────────────────
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
    const getInstruction = (): { text: string; tone: string } => {
        if (phase === "setup") {
            return {
                text:
                    operation === "sum"
                        ? "Ajusta las barras con +/− y toca las celdas para colorearlas. Cuando estés listo presiona Resolver."
                        : "Colorea más partes en la Barra A que en la Barra B. Luego presiona Resolver.",
                tone: "blue",
            };
        }
        if (phase === "solving") {
            if (isHeterogeneous) {
                if (!denominatorsMatch)
                    return {
                        text: "Las partes son de distinto tamaño. Usa los botones ×n para ampliar y ÷n para reducir cada barra hasta que ambas tengan el mismo denominador.",
                        tone: "amber",
                    };
                if (!heteroJoined)
                    return {
                        text:
                            operation === "sum"
                                ? "¡Denominadores iguales! Pulsa «Juntar» para combinar las partes en el resultado."
                                : "¡Denominadores iguales! Pulsa «Eliminar» para restar las partes del resultado.",
                        tone: "green",
                    };
                return {
                    text: "¡Listo! Pulsa «Comprobar» para verificar tu respuesta.",
                    tone: "green",
                };
            }
            if (subPhase === "moveA")
                return {
                    text: "Toca las partes coloreadas de la Barra A para trasladarlas al resultado.",
                    tone: "blue",
                };
            if (subPhase === "moveB")
                return {
                    text:
                        operation === "sum"
                            ? "Ahora toca las partes coloreadas de la Barra B para sumarlas."
                            : "Ahora toca las partes de la Barra B — se eliminarán del resultado.",
                    tone: "blue",
                };
            return {
                text: "¡Listo! Pulsa «Comprobar» para verificar tu respuesta.",
                tone: "green",
            };
        }
        return {
            text: "¡Operación completada correctamente!",
            tone: "emerald",
        };
    };

    const { text: instrText, tone: instrTone } = getInstruction();
    const instrClass =
        instrTone === "amber"
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : instrTone === "green"
                ? "bg-green-50 border-green-200 text-green-800"
                : instrTone === "emerald"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border-blue-200 text-blue-800";

    // ── Math steps ────────────────────────────────────────────────────────────
    const renderMathSteps = () => {
        if (!snapA || !snapB) return null;
        const opSym = operation === "sum" ? "+" : "−";

        if (!isHeterogeneous) {
            return (
                <div className="space-y-3 text-center">
                    <MathStep label="1">
                        <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                        <OpSign op={opSym} />
                        <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                        <OpSign op="=" />
                        <span className="text-2xl font-bold text-gray-400">?</span>
                    </MathStep>
                    <MathStep label="2">
                        <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" color="text-teal-600" />
                        <OpSign op={opSym} />
                        <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" color="text-amber-600" />
                        <OpSign op="=" />
                        <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-600" />
                    </MathStep>
                    {needsSimplify && (
                        <MathStep label="3" highlight>
                            <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-600" />
                            <OpSign op="=" />
                            <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-purple-600" />
                            <span className="text-xs text-gray-400 ml-1">(simplificado)</span>
                        </MathStep>
                    )}
                </div>
            );
        }

        // Heterogeneous
        const multA = barA.parts / snapA.denominator;
        const multB = barB.parts / snapB.denominator;
        const eqNumA = snapA.numerator * multA;
        const eqNumB = snapB.numerator * multB;
        const eqDen = barA.parts;

        return (
            <div className="space-y-3 text-center">
                <MathStep label="1">
                    <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                    <OpSign op={opSym} />
                    <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                    <OpSign op="=" />
                    <span className="text-2xl font-bold text-gray-400">?</span>
                </MathStep>
                <MathStep label="2">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-2xl md:text-3xl text-teal-600">
                                <span>{snapA.numerator} <span className="text-indigo-500 text-base">× {multA}</span></span>
                                <span className="w-full h-0.5 bg-teal-600 my-1 rounded" />
                                <span>{snapA.denominator} <span className="text-indigo-500 text-base">× {multA}</span></span>
                            </div>
                            <span className="text-lg font-bold text-gray-400">=</span>
                            <FractionDisplay numerator={eqNumA} denominator={eqDen} size="large" color="text-teal-600" />
                        </div>
                        <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-2xl md:text-3xl text-amber-600">
                                <span>{snapB.numerator} <span className="text-indigo-500 text-base">× {multB}</span></span>
                                <span className="w-full h-0.5 bg-amber-600 my-1 rounded" />
                                <span>{snapB.denominator} <span className="text-indigo-500 text-base">× {multB}</span></span>
                            </div>
                            <span className="text-lg font-bold text-gray-400">=</span>
                            <FractionDisplay numerator={eqNumB} denominator={eqDen} size="large" color="text-amber-600" />
                        </div>
                    </div>
                </MathStep>
                <MathStep label="3">
                    <FractionDisplay numerator={eqNumA} denominator={eqDen} size="large" color="text-teal-600" />
                    <OpSign op={opSym} />
                    <FractionDisplay numerator={eqNumB} denominator={eqDen} size="large" color="text-amber-600" />
                    <OpSign op="=" />
                    <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-600" />
                </MathStep>
                {needsSimplify && (
                    <MathStep label="4" highlight>
                        <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} size="large" color="text-emerald-600" />
                        <OpSign op="=" />
                        <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-purple-600" />
                        <span className="text-xs text-gray-400 ml-1">(simplificado)</span>
                    </MathStep>
                )}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-blue-100/60 flex flex-col">
            <ConfettiOverlay active={showConfetti} />

            {/* ── Header ── */}
            <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 active:scale-95 transition-all touch-manipulation"
                >
                    ← Volver
                </button>
                <h1 className="text-base md:text-lg font-bold text-gray-800 tracking-tight flex-1 text-center">
                    Operaciones con Fracciones
                </h1>
                {phase !== "setup" && (
                    <span
                        className={[
                            "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                            phase === "complete"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-indigo-50 text-indigo-500 border-indigo-200",
                        ].join(" ")}
                    >
                        {phase === "complete" ? "¡Completado!" : "Resolviendo"}
                    </span>
                )}
            </header>

            <main className="flex-1 px-3 py-4 max-w-5xl mx-auto w-full space-y-3 pb-16">

                {/* ── Operation selector (setup only) ── */}
                {phase === "setup" && (
                    <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/80 shadow-sm">
                        {(["sum", "sub"] as Operation[]).map((op) => (
                            <button
                                key={op}
                                onClick={() => setOperation(op)}
                                className={[
                                    "flex-1 py-1.5 rounded-lg font-bold text-sm transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5",
                                    operation === op
                                        ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200/60"
                                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
                                ].join(" ")}
                            >
                                <span className="text-base">{op === "sum" ? "+" : "−"}</span>
                                <span>{op === "sum" ? "Suma" : "Resta"}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Instruction ── */}
                <div className={`rounded-xl px-3 py-2 text-xs font-medium border backdrop-blur-sm ${instrClass}`}>
                    {instrText}
                </div>

                {/* ── Alerts ── */}
                {alertMsg && (
                    <div className="rounded-xl px-4 py-2.5 text-sm font-medium bg-red-50/90 backdrop-blur-sm border border-red-200/80 text-red-700 animate-pulse">
                        ⚠ {alertMsg}
                    </div>
                )}
                {subtractionAlert && (
                    <div className="rounded-xl px-4 py-2.5 text-sm font-medium bg-red-50/90 backdrop-blur-sm border border-red-200/80 text-red-700 animate-pulse">
                        ⚠ No puedes restar más de lo que hay en la Barra A.
                    </div>
                )}

                {/* ── Bars card ── */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-200/40 p-4 md:p-5 space-y-5">

                    {/* Bar A */}
                    <FractionBar
                        bar={barA}
                        label="Barra A"
                        colorClass="bg-gradient-to-b from-teal-400 to-teal-500"
                        dotColor="bg-teal-500"
                        // Setup
                        onToggleCell={phase === "setup" ? (i) => handleToggleCell("A", i) : undefined}
                        onChangePartsSetup={phase === "setup" ? (d) => handleChangePartsSetup("A", d) : undefined}
                        setupPartsDisabled={phase !== "setup"}
                        // Solving homogeneous tap
                        onCellTap={
                            phase === "solving" && !isHeterogeneous
                                ? (i) => handleCellTap("A", i)
                                : undefined
                        }
                        dimmedIndices={phase === "solving" && !isHeterogeneous ? movedA : undefined}
                        highlightMode={phase === "solving" && !isHeterogeneous && subPhase === "moveA"}
                        // Solving heterogeneous
                        showScaleControls={phase === "solving" && isHeterogeneous && !heteroJoined}
                        snap={snapA ?? undefined}
                        onScale={
                            phase === "solving" && isHeterogeneous && !heteroJoined
                                ? (n) => handleScaleBar("A", n)
                                : undefined
                        }
                        disabled={phase === "complete" || (phase === "solving" && isHeterogeneous && heteroJoined)}
                    />

                    {/* Operation symbol */}
                    <div className="flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-b from-indigo-100 to-indigo-50 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-600 text-xl select-none shadow-sm">
                            {operation === "sum" ? "+" : "−"}
                        </div>
                    </div>

                    {/* Bar B */}
                    <FractionBar
                        bar={barB}
                        label="Barra B"
                        colorClass="bg-gradient-to-b from-amber-400 to-amber-500"
                        dotColor="bg-amber-500"
                        onToggleCell={phase === "setup" ? (i) => handleToggleCell("B", i) : undefined}
                        onChangePartsSetup={phase === "setup" ? (d) => handleChangePartsSetup("B", d) : undefined}
                        setupPartsDisabled={phase !== "setup"}
                        onCellTap={
                            phase === "solving" && !isHeterogeneous
                                ? (i) => handleCellTap("B", i)
                                : undefined
                        }
                        dimmedIndices={phase === "solving" && !isHeterogeneous ? movedB : undefined}
                        highlightMode={phase === "solving" && !isHeterogeneous && subPhase === "moveB"}
                        showScaleControls={phase === "solving" && isHeterogeneous && !heteroJoined}
                        snap={snapB ?? undefined}
                        onScale={
                            phase === "solving" && isHeterogeneous && !heteroJoined
                                ? (n) => handleScaleBar("B", n)
                                : undefined
                        }
                        disabled={phase === "complete" || (phase === "solving" && isHeterogeneous && heteroJoined)}
                    />
                </div>

                {/* ── Progress bar (homogeneous solving) ── */}
                {phase === "solving" && !isHeterogeneous && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-md px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                            <div className="text-xs font-semibold text-gray-500">Partes trasladadas</div>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">
                                    A: {movedA.size}/{totalAColored}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                    {operation === "sub" ? "Eliminadas" : ""} B: {movedB.size}/{totalBColored}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400">Total</div>
                            <div className="font-bold text-indigo-600 text-lg">
                                {movedA.size + movedB.size}/{totalAColored + totalBColored}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Resolver button ── */}
                {phase === "setup" && (
                    <button
                        onClick={handleResolve}
                        disabled={!canResolve}
                        className={[
                            "w-full py-3.5 rounded-xl font-bold text-lg transition-all active:scale-[0.98] touch-manipulation",
                            canResolve
                                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed",
                        ].join(" ")}
                    >
                        Resolver →
                    </button>
                )}

                {/* ── Result bars ── */}
                {(phase === "solving" || phase === "complete") &&
                    resultBars.length > 0 &&
                    resultBars[0].parts > 0 && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-300/60 shadow-lg shadow-emerald-100/40 p-4 md:p-5 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="font-semibold text-gray-700 text-sm md:text-base">Resultado</span>
                                {phase === "complete" && (
                                    <div className="ml-1 flex items-center gap-1.5">
                                        <FractionDisplay
                                            numerator={resultNumerator}
                                            denominator={resultDenominator}
                                            color="text-emerald-600"
                                        />
                                        {needsSimplify && (
                                            <>
                                                <span className="text-gray-400 font-bold text-lg">=</span>
                                                <FractionDisplay
                                                    numerator={simplified.num}
                                                    denominator={simplified.den}
                                                    color="text-purple-600"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                {resultBars.map((rb, idx) => (
                                    <ResultBarRow key={idx} bar={rb} index={idx} eliminatingCells={eliminatingCells} />
                                ))}
                            </div>
                        </div>
                    )}

                {/* ── Hetero join/eliminate ── */}
                {phase === "solving" && isHeterogeneous && denominatorsMatch && !heteroJoined && (
                    <button
                        onClick={handleHeteroJoin}
                        className="w-full py-3.5 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200/60 hover:shadow-xl active:scale-[0.98] transition-all touch-manipulation"
                    >
                        {operation === "sum" ? "🤝 Juntar" : "✂️ Eliminar"}
                    </button>
                )}

                {/* ── Comprobar ── */}
                {(canCheck || canCheckHetero) && (
                    <button
                        onClick={handleCheck}
                        className="w-full py-3.5 rounded-xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/60 hover:shadow-xl active:scale-[0.98] transition-all touch-manipulation"
                    >
                        ✓ Comprobar
                    </button>
                )}

                {/* ── Complete ── */}
                {phase === "complete" && (
                    <div className="space-y-3">
                        <div className="bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl px-6 py-5 text-center text-white shadow-xl shadow-emerald-200/50">
                            <div className="text-4xl mb-1">🎉</div>
                            <div className="text-2xl font-black tracking-tight">¡Correcto!</div>
                            <div className="text-sm opacity-90 mt-1">Has completado la operación</div>
                        </div>

                        <button
                            onClick={() => setShowMath((s) => !s)}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 border border-indigo-200/80 hover:bg-indigo-100 active:scale-[0.98] transition-all touch-manipulation shadow-sm"
                        >
                            {showMath ? "Ocultar la matemática" : "📐 Ver la matemática"}
                        </button>

                        {showMath && (
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-indigo-200/50 shadow-lg shadow-indigo-100/30 p-5">
                                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4 text-center">
                                    Pasos matemáticos
                                </h3>
                                {renderMathSteps()}
                            </div>
                        )}

                        <button
                            onClick={handleReset}
                            className="w-full py-3.5 rounded-xl font-bold text-base bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] transition-all touch-manipulation border border-gray-200 shadow-sm"
                        >
                            🔄 Empezar de nuevo
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}