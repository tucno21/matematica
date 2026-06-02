import { useState, useEffect, useRef, useCallback } from "react";
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
}: FractionBarProps) => {
    const num = coloredCount(bar);
    const den = bar.parts;

    return (
        <div className="w-full space-y-2">
            {/* ── Header ── */}
            <div className="flex items-center gap-2 flex-wrap min-h-8">
                {/* Label pill */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${accentColor} border`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="font-bold text-xs tracking-wide uppercase">{label}</span>
                </div>

                {showScaleControls && snap && (
                    <button
                        onClick={() => {
                            const m = bar.parts / snap.denominator;
                            if (m > 1 && onScale) onScale(snap.denominator * (m - 1));
                        }}
                        disabled={disabled || bar.parts / snap.denominator <= 1}
                        className="w-7 h-7 rounded-lg border border-gray-300 bg-white text-rose-500 font-bold text-sm flex items-center justify-center active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation shadow-sm"
                    >
                        ÷
                    </button>
                )}

                <div className="flex items-center gap-1.5">
                    <FractionDisplay
                        numerator={showScaleControls && snap ? snap.numerator : num}
                        denominator={showScaleControls && snap ? snap.denominator : den}
                        color="text-gray-800"
                    />
                </div>

                {showScaleControls && snap && (
                    <button
                        onClick={() => {
                            if (onScale) onScale(snap.denominator * (bar.parts / snap.denominator + 1));
                        }}
                        disabled={disabled}
                        className="w-7 h-7 rounded-lg border border-gray-300 bg-white text-indigo-500 font-bold text-sm flex items-center justify-center active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation shadow-sm"
                    >
                        ×
                    </button>
                )}

                {showScaleControls && snap && snap.denominator !== den && (
                    <div className="flex items-center gap-1.5 text-xs font-medium bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 ml-1">
                        <div className="inline-flex flex-col items-center leading-none select-none font-bold">
                            <span>{snap.numerator} <span className="text-violet-500">× {den / snap.denominator}</span></span>
                            <span className="w-full h-px bg-violet-300 my-0.5" />
                            <span>{snap.denominator} <span className="text-violet-500">× {den / snap.denominator}</span></span>
                        </div>
                        <span className="font-bold text-violet-400">=</span>
                        <FractionDisplay numerator={num} denominator={den} color="text-violet-700" size="small" />
                    </div>
                )}
                {showScaleControls && snap && snap.denominator === den && (
                    <span className="text-xs text-gray-400 italic ml-1">fracción original</span>
                )}
            </div>

            {/* ── Bar row ── */}
            <div className="flex items-center gap-2">
                {/* Setup − button */}
                {onChangePartsSetup && (
                    <button
                        onClick={() => onChangePartsSetup(-1)}
                        disabled={setupPartsDisabled || bar.parts <= 2}
                        className="w-9 h-9 rounded-xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:border-gray-400 hover:text-gray-700 select-none"
                        aria-label="Reducir partes"
                    >
                        −
                    </button>
                )}

                {/* Bar */}
                <div className="flex-1">
                    <div
                        className="flex w-full rounded-2xl overflow-hidden border-2 border-gray-800 shadow-inner"
                        style={{ minHeight: 52 }}
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
                                        "flex-1 border-r-2 last:border-r-0 border-gray-800/40 transition-all duration-150 select-none",
                                        filled
                                            ? isDimmed
                                                ? `${colorClass} opacity-20`
                                                : `${colorClass}`
                                            : "bg-gray-100",
                                        tapable
                                            ? "cursor-pointer hover:brightness-110 active:scale-y-90"
                                            : onToggleCell && !disabled
                                                ? "cursor-pointer hover:opacity-80"
                                                : "cursor-default",
                                        "touch-manipulation",
                                    ].join(" ")}
                                    style={{ minHeight: 52 }}
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
                        className="w-9 h-9 rounded-xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation shadow-sm hover:border-gray-400 hover:text-gray-700 select-none"
                        aria-label="Aumentar partes"
                    >
                        +
                    </button>
                )}
            </div>

            {/* Parts count */}
            {onChangePartsSetup && (
                <div className="text-xs text-gray-400 font-medium pl-11">
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
            className="flex w-full rounded-2xl overflow-hidden border-2 border-gray-800 shadow-inner"
            style={{ minHeight: 52 }}
        >
            {bar.filled.map((f, i) => {
                const isEliminating = eliminatingCells.has(`${index}-${i}`);
                return (
                    <div
                        key={i}
                        className={[
                            "flex-1 border-r-2 last:border-r-0 border-gray-800/40 transition-all duration-300",
                            isEliminating
                                ? "bg-red-500"
                                : f
                                    ? "bg-gradient-to-b from-emerald-400 to-emerald-500"
                                    : "bg-emerald-50",
                        ].join(" ")}
                        style={{
                            minHeight: 52,
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
    <span className="text-2xl md:text-3xl font-bold text-gray-300 mx-1.5 select-none">
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
            highlight ? "bg-violet-50 border border-violet-200/60" : "bg-gray-50 border border-gray-200/60",
        ].join(" ")}
    >
        <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mr-1 shadow-sm">
            {label}
        </span>
        {children}
    </div>
);

// ─── SectionCard ─────────────────────────────────────────────────────────────

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 ${className}`}>
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
        const setter = bar === "A" ? setBarA : setBarB;
        const snap = bar === "A" ? snapA : snapB;
        if (!snap) return;
        setter(() => {
            const newNum = (snap.numerator * newParts) / snap.denominator;
            return {
                parts: newParts,
                colored: Array(newParts)
                    .fill(false)
                    .map((_, i) => i < newNum),
            };
        });
    };

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

    // ── Homogeneous: tap cell to move ─────────────────────────────────────────

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
    const getInstruction = (): { text: string; tone: string } => {
        if (phase === "setup") {
            return {
                text: operation === "sum"
                    ? "Ajusta las barras con +/− y toca las celdas para colorearlas. Cuando estés listo presiona Resolver."
                    : "Colorea más partes en la Barra A que en la Barra B. Luego presiona Resolver.",
                tone: "blue",
            };
        }
        if (phase === "solving") {
            if (isHeterogeneous) {
                if (!denominatorsMatch)
                    return {
                        text: "Las partes son de distinto tamaño. Usa los botones × y ÷ para ampliar o reducir cada barra hasta que ambas tengan el mismo denominador.",
                        tone: "amber",
                    };
                if (!heteroJoined)
                    return {
                        text: operation === "sum"
                            ? "¡Denominadores iguales! Pulsa «Juntar» para combinar las partes en el resultado."
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
                        : "Ahora toca las partes de la Barra B — se eliminarán del resultado.",
                    tone: "blue",
                };
            return { text: "¡Listo! Pulsa «Comprobar» para verificar tu respuesta.", tone: "green" };
        }
        return { text: "¡Operación completada correctamente!", tone: "emerald" };
    };

    const { text: instrText, tone: instrTone } = getInstruction();

    const instrStyles: Record<string, string> = {
        amber: "bg-amber-50 border-amber-200 text-amber-800",
        green: "bg-emerald-50 border-emerald-200 text-emerald-800",
        emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
        blue: "bg-sky-50 border-sky-200 text-sky-800",
    };
    const instrClass = instrStyles[instrTone] ?? instrStyles.blue;

    // ── Math steps ────────────────────────────────────────────────────────────
    const renderMathSteps = () => {
        if (!snapA || !snapB) return null;
        const opSym = operation === "sum" ? "+" : "−";

        if (!isHeterogeneous) {
            return (
                <div className="space-y-2.5 text-center">
                    <MathStep label="1">
                        <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                        <OpSign op={opSym} />
                        <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                        <OpSign op="=" />
                        <span className="text-2xl font-bold text-gray-300">?</span>
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
                            <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-violet-600" />
                            <span className="text-xs text-gray-400 ml-1">(simplificado)</span>
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
            <div className="space-y-2.5 text-center">
                <MathStep label="1">
                    <FractionDisplay numerator={snapA.numerator} denominator={snapA.denominator} size="large" />
                    <OpSign op={opSym} />
                    <FractionDisplay numerator={snapB.numerator} denominator={snapB.denominator} size="large" />
                    <OpSign op="=" />
                    <span className="text-2xl font-bold text-gray-300">?</span>
                </MathStep>
                <MathStep label="2">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-2xl text-teal-600">
                                <span>{snapA.numerator} <span className="text-indigo-500 text-base">× {multA}</span></span>
                                <span className="w-full h-0.5 bg-teal-600 my-1 rounded" />
                                <span>{snapA.denominator} <span className="text-indigo-500 text-base">× {multA}</span></span>
                            </div>
                            <span className="text-gray-400 font-bold">=</span>
                            <FractionDisplay numerator={eqNumA} denominator={eqDen} size="large" color="text-teal-600" />
                        </div>
                        <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <div className="inline-flex flex-col items-center leading-none select-none font-bold text-2xl text-amber-600">
                                <span>{snapB.numerator} <span className="text-indigo-500 text-base">× {multB}</span></span>
                                <span className="w-full h-0.5 bg-amber-600 my-1 rounded" />
                                <span>{snapB.denominator} <span className="text-indigo-500 text-base">× {multB}</span></span>
                            </div>
                            <span className="text-gray-400 font-bold">=</span>
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
                        <FractionDisplay numerator={simplified.num} denominator={simplified.den} size="large" color="text-violet-600" />
                        <span className="text-xs text-gray-400 ml-1">(simplificado)</span>
                    </MathStep>
                )}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <ConfettiOverlay active={showConfetti} />

            {/* ── Header ── */}
            <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-all touch-manipulation"
                >
                    ← Volver
                </button>

                <div className="flex-1 flex items-center justify-center gap-1.5">
                    <h1 className=" font-bold text-gray-800 tracking-tight">
                        Operaciones con Fracciones
                    </h1>
                    {phase !== "setup" && (
                        <span className={[
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                            phase === "complete"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-indigo-50 text-indigo-500 border-indigo-200",
                        ].join(" ")}>
                            {phase === "complete" ? "¡Completado!" : "Resolviendo"}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setShowHelp(true)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    ?
                </button>
            </header>

            <main className="flex-1 px-3 py-3 max-w-5xl mx-auto w-full space-y-3 pb-8">

                {/* ── Operation selector ── */}
                {phase === "setup" && (
                    <div className="flex gap-2 p-1 bg-gray-200/60 rounded-xl">
                        {(["sum", "sub"] as Operation[]).map((op) => (
                            <button
                                key={op}
                                onClick={() => setOperation(op)}
                                className={[
                                    "flex-1 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2",
                                    operation === op
                                        ? op === "sum"
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "bg-white text-rose-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700",
                                ].join(" ")}
                            >
                                <span className={[
                                    "w-6 h-6 rounded-full flex items-center justify-center text-white text-base font-bold",
                                    operation === op
                                        ? op === "sum" ? "bg-indigo-500" : "bg-rose-500"
                                        : "bg-gray-400",
                                ].join(" ")}>
                                    {op === "sum" ? "+" : "−"}
                                </span>
                                {op === "sum" ? "Suma" : "Resta"}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Instruction banner ── */}
                <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium border ${instrClass}`}>
                    <span className="mt-0.5 flex-shrink-0">
                        {instrTone === "amber" ? "⚡" : instrTone === "green" ? "✓" : instrTone === "emerald" ? "🎉" : "💡"}
                    </span>
                    <span>{instrText}</span>
                </div>

                {/* ── Alerts ── */}
                {(alertMsg || subtractionAlert) && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium bg-red-50 border border-red-200 text-red-700">
                        <span>⚠️</span>
                        <span>{alertMsg ?? "No puedes restar más de lo que hay en la Barra A."}</span>
                    </div>
                )}

                {/* ── Bars card ── */}
                <SectionCard>
                    <div className="space-y-2">
                        {/* Bar A */}
                        <FractionBar
                            bar={barA}
                            label="Barra A"
                            colorClass="bg-gradient-to-b from-teal-400 to-teal-500"
                            dotColor="bg-teal-500"
                            accentColor="bg-teal-50 text-teal-700 border-teal-200"
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
                        />

                        {/* Divider with operation */}
                        <div className="flex items-center">
                            <div className="flex-1 h-px bg-gray-100" />
                            <div className={[
                                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-base select-none shadow-sm mx-2",
                                operation === "sum" ? "bg-indigo-500" : "bg-rose-500",
                            ].join(" ")}>
                                {operation === "sum" ? "+" : "−"}
                            </div>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        {/* Bar B */}
                        <FractionBar
                            bar={barB}
                            label="Barra B"
                            colorClass="bg-gradient-to-b from-amber-400 to-amber-500"
                            dotColor="bg-amber-500"
                            accentColor="bg-amber-50 text-amber-700 border-amber-200"
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
                        />
                    </div>
                </SectionCard>

                {/* ── Progress tracker (homogeneous solving) ── */}
                {phase === "solving" && !isHeterogeneous && (
                    <SectionCard className="py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Partes trasladadas</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 font-bold">
                                    A: {movedA.size}/{totalAColored}
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                                    B: {movedB.size}/{totalBColored}
                                </span>
                                <span className="text-sm font-bold text-indigo-600 ml-1">
                                    {movedA.size + movedB.size}/{totalAColored + totalBColored}
                                </span>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${((movedA.size + movedB.size) / (totalAColored + totalBColored)) * 100}%` }}
                            />
                        </div>
                    </SectionCard>
                )}

                {/* ── Resolver button ── */}
                {phase === "setup" && (
                    <button
                        onClick={handleResolve}
                        disabled={!canResolve}
                        className={[
                            "w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-[0.98] touch-manipulation",
                            canResolve
                                ? "bg-indigo-500 text-white shadow-md hover:bg-indigo-600"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed",
                        ].join(" ")}
                    >
                        Resolver →
                    </button>
                )}

                {/* ── Result bars ── */}
                {(phase === "solving" || phase === "complete") &&
                    resultBars.length > 0 &&
                    resultBars[0].parts > 0 && (
                        <SectionCard className="border-emerald-200/60">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Resultado
                                </div>
                                {phase === "complete" && (
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <FractionDisplay numerator={resultNumerator} denominator={resultDenominator} color="text-emerald-600" />
                                        {needsSimplify && (
                                            <>
                                                <span className="text-gray-400 font-bold text-lg">=</span>
                                                <FractionDisplay numerator={simplified.num} denominator={simplified.den} color="text-violet-600" />
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
                        </SectionCard>
                    )}

                {/* ── Hetero join/eliminate ── */}
                {phase === "solving" && isHeterogeneous && denominatorsMatch && !heteroJoined && (
                    <button
                        onClick={handleHeteroJoin}
                        className="w-full py-3.5 rounded-xl font-bold text-base bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all touch-manipulation"
                    >
                        {operation === "sum" ? "🤝 Juntar" : "✂️ Eliminar"}
                    </button>
                )}

                {/* ── Comprobar ── */}
                {(canCheck || canCheckHetero) && (
                    <button
                        onClick={handleCheck}
                        className="w-full py-3.5 rounded-xl font-bold text-base bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all touch-manipulation"
                    >
                        ✓ Comprobar
                    </button>
                )}

                {/* ── Complete ── */}
                {phase === "complete" && (
                    <div className="space-y-3">
                        {/* Success card */}
                        <SectionCard className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-center py-6">
                            <div className="text-4xl mb-2">🎉</div>
                            <div className="text-2xl font-black text-white tracking-tight">¡Correcto!</div>
                            <div className="text-sm text-white/80 mt-1">Has completado la operación</div>
                        </SectionCard>

                        <button
                            onClick={() => setShowMath((s) => !s)}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-[0.98] transition-all touch-manipulation"
                        >
                            {showMath ? "Ocultar la matemática" : "📐 Ver la matemática"}
                        </button>

                        {showMath && (
                            <SectionCard className="border-indigo-200/50">
                                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4 text-center">
                                    Pasos matemáticos
                                </h3>
                                {renderMathSteps()}
                            </SectionCard>
                        )}

                        <button
                            onClick={handleReset}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-white text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all touch-manipulation border border-gray-200"
                        >
                            🔄 Empezar de nuevo
                        </button>
                    </div>
                )}
            </main>

            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo sumar y restar fracciones?"
                bgColor="#f8fafc"
                titleColor="#1e293b"
                buttonColor="bg-indigo-500 hover:bg-indigo-400"
            >
                <ol className="space-y-3 text-gray-600 text-sm leading-relaxed list-decimal list-inside">
                    <li>Elige la operación: <strong className="text-indigo-600">Suma</strong> o <strong className="text-rose-500">Resta</strong>.</li>
                    <li>Ajusta la <strong className="text-teal-600">Barra A</strong> y la <strong className="text-amber-600">Barra B</strong> usando los botones <strong>+</strong> y <strong>−</strong> para cambiar el número de partes, y toca las celdas para colorearlas.</li>
                    <li>Presiona <strong className="text-indigo-600">Resolver</strong> para comenzar.</li>
                    <li>Si ambas barras tienen el <strong>mismo denominador</strong>, toca las partes coloreadas de la Barra A y luego de la Barra B para trasladarlas al resultado.</li>
                    <li>Si tienen <strong>distinto denominador</strong>, usa los botones <strong className="text-indigo-500">×</strong> y <strong className="text-rose-400">÷</strong> para ampliar o reducir cada barra hasta igualar los denominadores. Luego pulsa <strong className="text-emerald-600">Juntar</strong> o <strong className="text-rose-500">Eliminar</strong>.</li>
                    <li>Pulsa <strong className="text-emerald-600">Comprobar</strong> para verificar tu respuesta.</li>
                    <li>Al completar, pulsa <strong>📐 Ver la matemática</strong> para ver los pasos detallados.</li>
                </ol>
            </ModalHelp>
        </div>
    );
}