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
const CARD_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];
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
                const w = Math.floor(Math.random() * 3);
                num = 1 + Math.floor(Math.random() * (den - 1));
                value = w + num / den;
                num = w * den + num;
                type = "improper";
            } else {
                const w = 1 + Math.floor(Math.random() * 2);
                num = 1 + Math.floor(Math.random() * (den - 1));
                value = -(w + num / den);
                num = w * den + num;
                type = "negative";
            }

            if (value <= LINE_MIN || value >= LINE_MAX) continue;
            if (usedValues.has(value)) continue;
            if (Math.abs(value - Math.round(value)) < 0.01) continue;

            let tooClose = false;
            for (const uv of usedValues) {
                if (Math.abs(uv - value) < 0.25) { tooClose = true; break; }
            }
            if (tooClose) continue;

            usedValues.add(value);
            const s = num > 0 ? gcd(num, den) : 1;
            const sn = num / s;
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
            const w = Math.floor(Math.random() * 3);
            const num = 1 + Math.floor(Math.random() * (den - 1));
            const value = sign * (w + num / den);
            const absNum = w * den + num;

            if (value <= LINE_MIN || value >= LINE_MAX) continue;
            if (usedValues.has(value)) continue;
            if (Math.abs(value - Math.round(value)) < 0.01) continue;

            let tooClose = false;
            for (const uv of usedValues) {
                if (Math.abs(uv - value) < 0.25) { tooClose = true; break; }
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
                label: fracLabel(sn, sd, 0, type === "negative" ? "negative" : type),
            });
            break;
        }
    }

    return results;
}

function valueToLineX(value: number, width: number): number {
    return ((value - LINE_MIN) / LINE_RANGE) * width;
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

    const borderColor =
        checking
            ? correct === true
                ? "border-green-400"
                : correct === false
                    ? "border-red-400"
                    : "border-white/20"
            : "border-white/20";

    return (
        <div
            onPointerDown={(e) => {
                if (checking && correct === true) return;
                onPointerDown(e, frac.id);
            }}
            className={[
                "relative flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 select-none transition-all duration-200",
                borderColor,
                placed
                    ? "opacity-30 scale-90 cursor-default"
                    : "cursor-grab active:cursor-grabbing hover:scale-105",
            ].join(" ")}
            style={{
                backgroundColor: placed ? "transparent" : frac.color + "22",
                minWidth: 80,
                touchAction: "none",
            }}
        >
            {frac.type === "mixed" && parts.length === 2 ? (
                <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-lg">{parts[0]}</span>
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-sm leading-tight">{Math.abs(frac.num)}</span>
                        <div className="w-full h-px bg-white/80" />
                        <span className="text-white font-bold text-sm leading-tight">{frac.den}</span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-0.5">
                    {frac.type === "negative" && (
                        <span className="text-white/70 font-bold text-sm leading-tight">−</span>
                    )}
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-sm leading-tight">{displayNum}</span>
                        <div className="w-full h-px bg-white/80" />
                        <span className="text-white font-bold text-sm leading-tight">{frac.den}</span>
                    </div>
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
                if (x < -20 || x > lineWidth + 20) {
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

            if (dropX >= -20 && dropX <= lineWidth + 20) {
                const clampedX = Math.max(0, Math.min(lineWidth, dropX));
                setPlaced((prev) => {
                    const next = new Map(prev);
                    next.set(dragState.fracId!, clampedX);
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
        [dragState.active, dragState.fracId, dragState.origin, lineWidth]
    );

    // ── Check ──
    const handleCheck = useCallback(() => {
        if (placed.size < 4) return;

        const cellSize = lineWidth > 0 ? 1 / (divisions * LINE_RANGE) * lineWidth : 0;
        const tolerance = Math.max(cellSize / 2, lineWidth * 0.015);

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
            setErrorMsg(`Las fracciones ${names} no están en el lugar correcto.`);
            setIncorrectIds(new Set(wrongIds));
        }
    }, [placed, fractions, divisions, lineWidth]);

    // ── New fractions ──
    const handleNewSet = useCallback(() => {
        if (placed.size > 0) return;
        setFractions(generateFractions());
        setDivisions(1);
        setChecking(false);
        setResults(new Map());
        setCelebration(false);
        setErrorMsg(null);
        setIncorrectIds(new Set());
    }, [placed.size]);

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
    const canRandomize = placed.size === 0;

    const dragFrac = dragState.active && dragState.fracId !== null
        ? fractions.find((f) => f.id === dragState.fracId)
        : null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="min-h-dvh bg-[#080c18] text-white flex flex-col select-none overflow-hidden"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: "none" }}
        >
            {/* ── Header ── */}
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
                >
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">Fracciones en la Recta</h1>
                <button
                    onClick={() => setShowHelp(true)}
                    className="absolute right-4 w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white/70 text-lg font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                >
                    ?
                </button>
            </div>

            {/* ── Fraction Cards ── */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 flex-wrap">
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
                <button
                    onClick={handleNewSet}
                    disabled={!canRandomize}
                    className={[
                        "flex items-center justify-center w-11 h-11 rounded-xl border-2 text-xl transition-all",
                        canRandomize
                            ? "border-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/40 active:scale-90"
                            : "border-white/10 bg-white/5 text-white/20 cursor-not-allowed",
                    ].join("")}
                    title="Nuevas fracciones"
                >
                    🎲
                </button>
            </div>

            {/* ── Number Line Area ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-2 relative">
                <div
                    ref={lineRef}
                    className="relative w-full"
                    style={{ height: 150 }}
                >
                    {/* Placed fractions markers */}
                    {fractions.map((f) => {
                        const lx = placed.get(f.id);
                        if (lx === undefined) return null;
                        const isDraggingThis = dragState.active && dragState.fracId === f.id;
                        if (isDraggingThis) return null;

                        let markerColor = f.color;
                        if (checking) {
                            const res = results.get(f.id);
                            if (res === true) markerColor = "#22c55e";
                            else if (res === false) markerColor = "#ef4444";
                        }
                        if (incorrectIds.has(f.id) && !checking) markerColor = "#ef4444";

                        return (
                            <div
                                key={`m-${f.id}`}
                                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing z-10"
                                style={{
                                    left: lx,
                                    transform: "translateX(-50%)",
                                    top: 0,
                                    touchAction: "none",
                                }}
                                onPointerDown={(e) => {
                                    if (checking && results.get(f.id) === true) return;
                                    handleCardPointerDown(e, f.id);
                                }}
                            >
                                <div
                                    className="px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                                    style={{ backgroundColor: markerColor + "cc", color: "#fff" }}
                                >
                                    {f.label}
                                </div>
                                <div
                                    className="w-0.5 rounded-full"
                                    style={{ height: 40, backgroundColor: markerColor }}
                                />
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: markerColor }}
                                />
                            </div>
                        );
                    })}

                    {/* Cursor guide line while dragging */}
                    {cursorLineX !== null && (
                        <div
                            className="absolute z-20 pointer-events-none"
                            style={{
                                left: cursorLineX,
                                top: 0,
                                bottom: 0,
                                width: 2,
                                borderLeft: "2px dashed rgba(255,255,255,0.5)",
                            }}
                        />
                    )}

                    {/* Integer ticks (tall) — above the line */}
                    <div className="absolute w-full" style={{ top: 52 }}>
                        {Array.from({ length: LINE_RANGE + 1 }, (_, i) => LINE_MIN + i).map((n) => {
                            const x = valueToLineX(n, lineWidth);
                            return (
                                <div
                                    key={`t-${n}`}
                                    className="absolute bg-white/80 rounded"
                                    style={{ left: x, transform: "translateX(-50%)", width: 3, height: 22 }}
                                />
                            );
                        })}
                    </div>

                    {/* Subdivision ticks (short) — above the line */}
                    {divisions > 1 &&
                        Array.from({ length: LINE_RANGE }, (_, seg) => LINE_MIN + seg).map((base) => {
                            const ticks: React.ReactNode[] = [];
                            for (let d = 1; d < divisions; d++) {
                                const val = base + d / divisions;
                                const x = valueToLineX(val, lineWidth);
                                ticks.push(
                                    <div
                                        key={`sub-${base}-${d}`}
                                        className="absolute rounded"
                                        style={{ left: x, transform: "translateX(-50%)", width: 2, height: 14, top: 60, backgroundColor: "#facc15" }}
                                    />
                                );
                            }
                            return <React.Fragment key={`seg-${base}`}>{ticks}</React.Fragment>;
                        })}

                    {/* The main horizontal line */}
                    <div className="absolute w-full" style={{ top: 74, height: 4 }}>
                        <div className="w-full h-1 bg-white/80 rounded-full" />
                    </div>

                    {/* Integer labels — below the line */}
                    <div
                        className="absolute w-full flex"
                        style={{ top: 84 }}
                    >
                        {Array.from({ length: LINE_RANGE + 1 }, (_, i) => LINE_MIN + i).map((n) => {
                            const x = valueToLineX(n, lineWidth);
                            return (
                                <span
                                    key={n}
                                    className="absolute text-base font-mono font-extrabold text-white/70"
                                    style={{ left: x, transform: "translateX(-50%)" }}
                                >
                                    {n}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex items-center justify-center gap-4 px-4 py-4 flex-wrap">
                {/* Divisions */}
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <button
                        onClick={() => setDivisions((d) => Math.max(MIN_DIVISIONS, d - 1))}
                        disabled={divisions <= MIN_DIVISIONS}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        −
                    </button>
                    <span className="w-10 text-center font-mono font-bold text-lg">{divisions}</span>
                    <button
                        onClick={() => setDivisions((d) => Math.min(MAX_DIVISIONS, d + 1))}
                        disabled={divisions >= MAX_DIVISIONS}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        +
                    </button>
                </div>

                {/* Check */}
                <button
                    onClick={handleCheck}
                    disabled={!allPlaced}
                    className={[
                        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all",
                        allPlaced
                            ? "bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white shadow-lg shadow-emerald-500/30"
                            : "bg-white/10 text-white/30 cursor-not-allowed",
                    ].join(" ")}
                >
                    Comprobar
                </button>

                {/* Reset */}
                <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 active:scale-95 transition-all"
                >
                    Reiniciar
                </button>
            </div>

            {/* ── Error message ── */}
            {errorMsg && (
                <div className="text-center px-4 pb-2">
                    <span className="text-red-400 text-sm font-semibold">{errorMsg}</span>
                </div>
            )}

            {/* ── Celebration ── */}
            {celebration && (
                <div className="text-center px-4 pb-4">
                    <div className="text-2xl mb-1">🎉</div>
                    <span className="text-emerald-400 font-bold">¡Excelente! Todas correctas.</span>
                    <div className="mt-2">
                        <button
                            onClick={() => {
                                setFractions(generateFractions());
                                handleReset();
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm active:scale-95 transition-all"
                        >
                            Nuevo ejercicio
                        </button>
                    </div>
                </div>
            )}

            {/* ── Dragging ghost ── */}
            {dragState.active && dragFrac && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: dragState.currentX - 40,
                        top: dragState.currentY - 30,
                        transform: "scale(1.15)",
                        opacity: 0.9,
                        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                    }}
                >
                    <div
                        className="flex items-center gap-0.5 rounded-xl border-2 px-3 py-2"
                        style={{ backgroundColor: dragFrac.color + "44", borderColor: dragFrac.color }}
                    >
                        {dragFrac.type === "negative" && (
                            <span className="text-white/70 font-bold text-sm leading-tight">−</span>
                        )}
                        <div className="flex flex-col items-center">
                            <span className="text-white font-bold text-sm leading-tight">{Math.abs(dragFrac.num)}</span>
                            <div className="w-full h-px bg-white/80" />
                            <span className="text-white font-bold text-sm leading-tight">{dragFrac.den}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Help Modal ── */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo jugar?"
            >
                <ol className="space-y-3 text-white/80 text-sm leading-relaxed list-decimal list-inside">
                    <li>
                        <strong className="text-white">Observa</strong> las tarjetas de fracciones que aparecen en la parte superior.
                    </li>
                    <li>
                        <strong className="text-white">Arrastra</strong> cada tarjeta hacia la recta numérica y suéltala en la posición que consideras correcta.
                    </li>
                    <li>
                        Usa los botones <strong className="text-yellow-400">−</strong> y <strong className="text-yellow-400">+</strong> para dividir cada entero en más partes y ubicar las fracciones con mayor precisión.
                    </li>
                    <li>
                        Puedes <strong className="text-white">volver a arrastrar</strong> una fracción ya colocada para corregir su posición.
                    </li>
                    <li>
                        Cuando las 4 fracciones estén colocadas, pulsa <strong className="text-emerald-400">Comprobar</strong> para verificar tus respuestas.
                    </li>
                    <li>
                        Si todas son correctas, ¡celebra! Si no, intenta corregir las que están mal.
                    </li>
                    <li>
                        Usa <strong className="text-white">Reiniciar</strong> para quitar todas las fracciones de la recta, o 🎲 para generar nuevas fracciones.
                    </li>
                </ol>
            </ModalHelp>
        </div>
    );
}
