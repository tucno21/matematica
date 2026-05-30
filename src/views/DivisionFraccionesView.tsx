import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type CaseType = "int-int" | "frac-int" | "int-frac" | "frac-frac";

interface Exercise {
    caseType: CaseType;
    n1: number;
    d1: number;
    n2: number;
    d2: number;
    resultNum: number;
    resultDen: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

function simplify(n: number, d: number): [number, number] {
    if (n === 0) return [0, 1];
    const g = gcd(n, d);
    return [n / g, d / g];
}

function lcm(a: number, b: number): number {
    return (a * b) / gcd(a, b);
}

function generateExercise(level: number): Exercise {
    if (level === 1) {
        const d = 2 + Math.floor(Math.random() * 4);
        const n = 1;
        const [sn, sd] = simplify(n, d);
        return { caseType: "int-int", n1: n, d1: 1, n2: d, d2: 1, resultNum: sn, resultDen: sd };
    }
    if (level === 2) {
        const d = 2 + Math.floor(Math.random() * 4);
        const n = 2 + Math.floor(Math.random() * 3);
        const [sn, sd] = simplify(n, d);
        return { caseType: "int-int", n1: n, d1: 1, n2: d, d2: 1, resultNum: sn, resultDen: sd };
    }
    if (level === 3) {
        const d1 = 2 + Math.floor(Math.random() * 4);
        const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
        const n2 = n1;
        const [sn, sd] = simplify(1, d1);
        return { caseType: "frac-int", n1, d1, n2, d2: 1, resultNum: sn, resultDen: sd };
    }
    if (level === 4) {
        const d1 = 2 + Math.floor(Math.random() * 4);
        const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
        const n2 = 2 + Math.floor(Math.random() * 3);
        const rn = n1;
        const rd = d1 * n2;
        const [sn, sd] = simplify(rn, rd);
        return { caseType: "frac-int", n1, d1, n2, d2: 1, resultNum: sn, resultDen: sd };
    }
    if (level === 5) {
        const whole = 2 + Math.floor(Math.random() * 4);
        const d2 = 2 + Math.floor(Math.random() * 3);
        const n2 = 1;
        const rn = whole * d2;
        const [sn, sd] = simplify(rn, 1);
        return { caseType: "int-frac", n1: whole, d1: 1, n2, d2, resultNum: sn, resultDen: sd };
    }
    if (level === 6) {
        const whole = 2 + Math.floor(Math.random() * 3);
        const d2 = 2 + Math.floor(Math.random() * 4);
        const n2 = 1 + Math.floor(Math.random() * (d2 - 1));
        const rn = whole * d2;
        const rd = n2;
        const [sn, sd] = simplify(rn, rd);
        return { caseType: "int-frac", n1: whole, d1: 1, n2, d2, resultNum: sn, resultDen: sd };
    }
    if (level === 7) {
        const d1 = 2 + Math.floor(Math.random() * 4);
        const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
        const wholeResult = 2 + Math.floor(Math.random() * 4);
        const g = gcd(n1, d1);
        const rn1 = n1 / g;
        const rd1 = d1 / g;
        const n2 = rn1;
        const d2 = rd1 * wholeResult;
        const commonD = lcm(d1, d2);
        const expanded1 = n1 * (commonD / d1);
        const expanded2 = n2 * (commonD / d2);
        const [sn, sd] = simplify(expanded1, expanded2);
        return { caseType: "frac-frac", n1, d1, n2, d2, resultNum: sn, resultDen: sd };
    }
    if (level === 8) {
        const d1 = 2 + Math.floor(Math.random() * 4);
        const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
        const d2 = 2 + Math.floor(Math.random() * 4);
        const n2 = 1 + Math.floor(Math.random() * (d2 - 1));
        const commonD = lcm(d1, d2);
        const expanded1 = n1 * (commonD / d1);
        const expanded2 = n2 * (commonD / d2);
        const [sn, sd] = simplify(expanded1, expanded2);
        return { caseType: "frac-frac", n1, d1, n2, d2, resultNum: sn, resultDen: sd };
    }
    const mixedLevel = 1 + Math.floor(Math.random() * 8);
    return generateExercise(mixedLevel);
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function InlineFrac({ num, den, color }: { num: number; den: number; color: string }) {
    return (
        <div className="flex flex-col items-center min-w-[28px]" style={{ color }}>
            <span className="font-bold text-lg leading-tight">{num}</span>
            <div className="w-full h-px" style={{ backgroundColor: color }} />
            <span className="font-bold text-lg leading-tight">{den}</span>
        </div>
    );
}

function FractionDisplay({ num, den, color }: { num: number; den: number; color: string }) {
    return (
        <div className="flex flex-col items-center" style={{ color }}>
            <span className="font-bold text-lg leading-tight">{num}</span>
            <div className="w-full h-px" style={{ backgroundColor: color }} />
            <span className="font-bold text-lg leading-tight">{den}</span>
        </div>
    );
}

function OpDisplay({ ex }: { ex: Exercise }) {
    const teal = "#2dd4bf";
    const amber = "#fbbf24";

    if (ex.caseType === "int-int") {
        return (
            <div className="flex items-center gap-2 text-2xl font-bold">
                <span className="text-white/40 text-xs font-normal whitespace-nowrap">Cant. Barras</span>
                <span className="text-white/30 text-sm">←</span>
                <span style={{ color: teal }}>{ex.n1}</span>
                <span className="text-white/60">÷</span>
                <span style={{ color: amber }}>{ex.n2}</span>
                <span className="text-white/30 text-sm">→</span>
                <span className="text-white/40 text-xs font-normal whitespace-nowrap">Cant. Grupos</span>
            </div>
        );
    }
    if (ex.caseType === "frac-int") {
        return (
            <div className="flex items-center gap-2 text-2xl font-bold">
                <span className="text-white/40 text-xs font-normal whitespace-nowrap">Cant. Barras</span>
                <span className="text-white/30 text-sm">←</span>
                <FractionDisplay num={ex.n1} den={ex.d1} color={teal} />
                <span className="text-white/60">÷</span>
                <span style={{ color: amber }}>{ex.n2}</span>
                <span className="text-white/30 text-sm">→</span>
                <span className="text-white/40 text-xs font-normal whitespace-nowrap">Cant. Grupos</span>
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        return (
            <div className="flex items-center gap-2 text-2xl font-bold">
                <span className="text-white/40 text-xs font-normal">Cantidad</span>
                <span className="text-white/30 text-sm">←</span>
                <span style={{ color: teal }}>{ex.n1}</span>
                <span className="text-white/60">÷</span>
                <FractionDisplay num={ex.n2} den={ex.d2} color={amber} />
                <span className="text-white/30 text-sm">→</span>
                <span className="text-white/40 text-xs font-normal whitespace-nowrap">¿Cuántas veces cabe?</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 text-2xl font-bold">
            <span className="text-white/40 text-xs font-normal">Cantidad</span>
            <span className="text-white/30 text-sm">←</span>
            <FractionDisplay num={ex.n1} den={ex.d1} color={teal} />
            <span className="text-white/60">÷</span>
            <FractionDisplay num={ex.n2} den={ex.d2} color={amber} />
            <span className="text-white/30 text-sm">→</span>
            <span className="text-white/40 text-xs font-normal whitespace-nowrap">¿Cuántas veces cabe?</span>
        </div>
    );
}

// ─── Case 1: Int ÷ Int = Fraction (repartir enteros en grupos) ────────────────

interface FlyingPortion {
    id: number;
    fromBar: number;
    fromPiece: number;
    toGroup: number;
    startRect: DOMRect | null;
    endRect: DOMRect | null;
}

function CaseIntInt({
    ex, groupCount, setGroupCount, distributed, setDistributed, confirmed, setConfirmed,
    errorMessage, setErrorMessage,
}: {
    ex: Exercise;
    groupCount: number;
    setGroupCount: (n: number) => void;
    distributed: number[];
    setDistributed: (arr: number[]) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
    errorMessage: string;
    setErrorMessage: (msg: string) => void;
}) {
    const { n1, n2 } = ex;
    const totalPieces = n1 * groupCount;

    const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const groupRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const [flyings, setFlyings] = useState<FlyingPortion[]>([]);
    const [animating, setAnimating] = useState(false);
    const flyIdRef = useRef(0);

    const findNextPortion = useCallback(() => {
        const totalDistributed = distributed.reduce((a, b) => a + b, 0);
        const remaining = totalPieces - totalDistributed;
        if (remaining <= 0) return null;
        for (let bar = 0; bar < n1; bar++) {
            for (let piece = 0; piece < groupCount; piece++) {
                const globalPiece = bar * groupCount + piece;
                const assignedGroup = globalPiece % groupCount;
                const round = Math.floor(globalPiece / groupCount);
                if (round >= distributed[assignedGroup]) {
                    return { bar, piece };
                }
            }
        }
        return null;
    }, [distributed, totalPieces, n1, groupCount]);

    const handleDistribute = useCallback((groupIdx: number) => {
        if (groupCount <= 1 || animating) return;
        setErrorMessage("");
        const totalDistributed = distributed.reduce((a, b) => a + b, 0);
        if (totalDistributed >= totalPieces) return;
        const nextPortion = findNextPortion();
        if (!nextPortion) return;

        const key = `${nextPortion.bar}-${nextPortion.piece}`;
        const startEl = barRefs.current.get(key);
        const endEl = groupRefs.current.get(groupIdx);

        const flyId = ++flyIdRef.current;
        const fly: FlyingPortion = {
            id: flyId,
            fromBar: nextPortion.bar,
            fromPiece: nextPortion.piece,
            toGroup: groupIdx,
            startRect: startEl?.getBoundingClientRect() ?? null,
            endRect: endEl?.getBoundingClientRect() ?? null,
        };

        setAnimating(true);
        setFlyings((prev) => [...prev, fly]);

        setTimeout(() => {
            const next = [...distributed];
            next[groupIdx] += 1;
            setDistributed(next);
            setFlyings((prev) => prev.filter((f) => f.id !== flyId));
            setAnimating(false);
        }, 380);
    }, [groupCount, animating, distributed, totalPieces, findNextPortion, setDistributed, setErrorMessage]);

    const totalDistributed = distributed.reduce((a, b) => a + b, 0);
    const allDistributed = totalDistributed >= totalPieces;

    const handleConfirm = useCallback(() => {
        if (groupCount !== n2) {
            setErrorMessage(
                `Repartiste en ${groupCount} grupos, pero la división es entre ${n2}. Vuelve a intentar.`
            );
            return;
        }
        const portionsPerGroup = totalPieces / groupCount;
        const isEven = distributed.every((d) => d === portionsPerGroup);
        if (!isEven) {
            const maxGroup = Math.max(...distributed);
            const minGroup = Math.min(...distributed);
            setErrorMessage(
                `No es equitativo: un grupo tiene ${maxGroup} y otro tiene ${minGroup}. Cada grupo debe tener ${portionsPerGroup} porcion${portionsPerGroup > 1 ? "es" : ""}.`
            );
            return;
        }
        setErrorMessage("");
        setConfirmed(true);
    }, [groupCount, n2, distributed, totalPieces, setErrorMessage, setConfirmed]);

    return (
        <div className="flex flex-col items-center gap-4 w-[95%] sm:w-[80%] mx-auto">
            <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-white/70 text-sm font-semibold">¿En cuántos grupos repartes?</span>
                <button
                    onClick={() => { setGroupCount(Math.max(1, groupCount - 1)); setDistributed(new Array(Math.max(1, groupCount - 1)).fill(0)); setErrorMessage(""); }}
                    className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >−</button>
                <span className="w-10 text-center font-mono font-bold text-2xl text-white">{groupCount}</span>
                <button
                    onClick={() => { setGroupCount(Math.min(12, groupCount + 1)); setDistributed(new Array(Math.min(12, groupCount + 1)).fill(0)); setErrorMessage(""); }}
                    className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >+</button>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <div className="text-white/50 text-xs text-center mb-1">
                    {groupCount === 1
                        ? `${n1} barra${n1 > 1 ? "s" : ""} entera${n1 > 1 ? "s" : ""}`
                        : `${n1} barra${n1 > 1 ? "s" : ""} cortada${n1 > 1 ? "s" : ""} en ${groupCount} → ${totalPieces} porcion${totalPieces > 1 ? "es" : ""} en total`
                    }
                </div>
                {Array.from({ length: n1 }, (_, barIdx) => (
                    <div
                        key={barIdx}
                        className="flex w-full rounded-xl overflow-hidden border-2 border-teal-400/40 shadow-lg shadow-teal-500/10"
                        style={{ minHeight: 54 }}
                    >
                        {groupCount === 1 ? (
                            <div
                                className="w-full rounded-lg bg-gradient-to-b from-teal-400 to-teal-500"
                                style={{ minHeight: 54 }}
                            />
                        ) : (
                            Array.from({ length: groupCount }, (_, pieceIdx) => {
                                const globalPiece = barIdx * groupCount + pieceIdx;
                                const totalGiven = distributed.reduce((a, b) => a + b, 0);
                                const isGiven = globalPiece < totalGiven;
                                const isFlying = flyings.some(
                                    (f) => f.fromBar === barIdx && f.fromPiece === pieceIdx
                                );
                                return (
                                    <div
                                        key={pieceIdx}
                                        ref={(el) => {
                                            if (el) barRefs.current.set(`${barIdx}-${pieceIdx}`, el);
                                        }}
                                        className="flex-1 border-r-[3px] last:border-r-0 border-gray-600/80 transition-all duration-300"
                                        style={{
                                            minHeight: 54,
                                            backgroundColor: isFlying
                                                ? "rgba(52,211,153,0.3)"
                                                : isGiven
                                                    ? "transparent"
                                                    : "rgba(45,212,191,0.85)",
                                            opacity: isFlying ? 0.4 : isGiven ? 0.15 : 1,
                                            transform: isFlying ? "scale(0.85)" : "scale(1)",
                                        }}
                                    />
                                );
                            })
                        )}
                    </div>
                ))}
            </div>

            {groupCount > 1 && (
                <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${Math.min(groupCount, 6)}, 1fr)` }}>
                    {Array.from({ length: groupCount }, (_, g) => {
                        const hasContent = distributed[g] > 0;
                        return (
                            <button
                                key={g}
                                ref={(el) => {
                                    if (el) groupRefs.current.set(g, el);
                                }}
                                onClick={() => handleDistribute(g)}
                                className={[
                                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-300 active:scale-90",
                                    hasContent
                                        ? "border-emerald-400/60 bg-emerald-500/20 shadow-md shadow-emerald-500/10"
                                        : "border-white/20 bg-white/5 hover:bg-white/10",
                                ].join(" ")}
                            >
                                <span className="text-white/40 text-xs">Grupo {g + 1}</span>
                                <div className="flex flex-wrap gap-0.5 justify-center min-h-[20px]">
                                    {Array.from({ length: distributed[g] }, (_, i) => (
                                        <div
                                            key={i}
                                            className="w-4 h-4 rounded-sm bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm"
                                            style={{ animation: "popIn 0.3s ease-out" }}
                                        />
                                    ))}
                                </div>
                                <span className="text-white/30 text-xs">{distributed[g]} porcion{distributed[g] !== 1 ? "es" : ""}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {flyings.map((fly) => {
                if (!fly.startRect || !fly.endRect) return null;
                return (
                    <div
                        key={fly.id}
                        className="fixed z-50 rounded-md pointer-events-none"
                        style={{
                            width: fly.startRect.width,
                            height: fly.startRect.height,
                            background: "linear-gradient(to bottom, rgba(45,212,191,0.9), rgba(20,184,166,0.9))",
                            border: "2px solid rgba(94,234,212,0.6)",
                            boxShadow: "0 0 20px rgba(45,212,191,0.5)",
                            animation: "flyPortion 0.38s ease-in-out forwards",
                            left: fly.startRect.left,
                            top: fly.startRect.top,
                            transform: "scale(0.8)",
                        }}
                    />
                );
            })}

            {errorMessage && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-2">
                    {errorMessage}
                </div>
            )}

            {allDistributed && !confirmed && groupCount > 1 && (
                <button
                    onClick={handleConfirm}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                >
                    Comprobar resultado
                </button>
            )}

            {confirmed && (
                <div className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl border border-white/10 p-4">
                    <span className="text-white/70 text-sm">Cada grupo recibe:</span>
                    <FractionDisplay num={ex.resultNum} den={ex.resultDen} color="#34d399" />
                </div>
            )}
        </div>
    );
}

// ─── Case 2: Fraction ÷ Int (repartir fracción en grupos) ────────────────────

function CaseFracInt({
    ex, groupCount, setGroupCount, subdivisions, setSubdivisions,
    distributed, setDistributed, confirmed, setConfirmed,
    errorMessage, setErrorMessage,
}: {
    ex: Exercise;
    groupCount: number;
    setGroupCount: (n: number) => void;
    subdivisions: number;
    setSubdivisions: (n: number) => void;
    distributed: number[];
    setDistributed: (arr: number[]) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
    errorMessage: string;
    setErrorMessage: (msg: string) => void;
}) {
    const { n1, d1, n2 } = ex;
    const totalParts = d1 * subdivisions;
    const coloredParts = n1 * subdivisions;
    const canRepartition = groupCount > 0 && coloredParts % groupCount === 0;

    const barRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const groupRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const [flyings, setFlyings] = useState<{ id: number; pieceIdx: number; startRect: DOMRect | null }[]>([]);
    const [animating, setAnimating] = useState(false);
    const flyIdRef = useRef(0);

    const findNextColored = useCallback(() => {
        const totalDist = distributed.reduce((a, b) => a + b, 0);
        if (totalDist >= coloredParts) return null;
        for (let i = 0; i < coloredParts; i++) {
            if (i >= totalDist) return i;
        }
        return null;
    }, [distributed, coloredParts]);

    const handleDistribute = useCallback((groupIdx: number) => {
        if (groupCount <= 1 || animating) return;
        setErrorMessage("");
        const totalDist = distributed.reduce((a, b) => a + b, 0);
        if (totalDist >= coloredParts) return;

        const nextPiece = findNextColored();
        if (nextPiece === null) return;

        const startEl = barRefs.current.get(nextPiece);

        const flyId = ++flyIdRef.current;
        setAnimating(true);
        setFlyings((prev) => [...prev, {
            id: flyId,
            pieceIdx: nextPiece,
            startRect: startEl?.getBoundingClientRect() ?? null,
        }]);

        setTimeout(() => {
            const next = [...distributed];
            next[groupIdx] += 1;
            setDistributed(next);
            setFlyings((prev) => prev.filter((f) => f.id !== flyId));
            setAnimating(false);
        }, 380);
    }, [groupCount, animating, distributed, coloredParts, findNextColored, setDistributed, setErrorMessage]);

    const totalDistributed = distributed.reduce((a, b) => a + b, 0);
    const allDistributed = totalDistributed >= coloredParts;

    const handleConfirm = useCallback(() => {
        if (groupCount !== n2) {
            setErrorMessage(
                `Repartiste en ${groupCount} grupos, pero la división es entre ${n2}. Vuelve a intentar.`
            );
            return;
        }
        if (!canRepartition) {
            setErrorMessage(
                `${coloredParts} porcion${coloredParts > 1 ? "es" : ""} no se pueden repartir equitativamente en ${groupCount} grupos. Prueba subdividir más.`
            );
            return;
        }
        const portionsPerGroup = coloredParts / groupCount;
        const isEven = distributed.every((d) => d === portionsPerGroup);
        if (!isEven) {
            const maxGroup = Math.max(...distributed);
            const minGroup = Math.min(...distributed);
            setErrorMessage(
                `No es equitativo: un grupo tiene ${maxGroup} y otro tiene ${minGroup}. Cada grupo debe tener ${portionsPerGroup} porcion${portionsPerGroup > 1 ? "es" : ""}.`
            );
            return;
        }
        setErrorMessage("");
        setConfirmed(true);
    }, [groupCount, n2, canRepartition, coloredParts, distributed, setErrorMessage, setConfirmed]);

    return (
        <div className="flex flex-col items-center gap-4 w-[95%] sm:w-[80%] mx-auto">
            <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-white/70 text-xs">Grupos</span>
                    <button
                        onClick={() => { setGroupCount(Math.max(1, groupCount - 1)); setDistributed(new Array(Math.max(1, groupCount - 1)).fill(0)); setErrorMessage(""); }}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">{groupCount}</span>
                    <button
                        onClick={() => { setGroupCount(Math.min(12, groupCount + 1)); setDistributed(new Array(Math.min(12, groupCount + 1)).fill(0)); setErrorMessage(""); }}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-white/70 text-xs">Subdividir</span>
                    <button
                        onClick={() => { setSubdivisions(Math.max(1, subdivisions - 1)); setDistributed(new Array(groupCount).fill(0)); setErrorMessage(""); }}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">×{subdivisions}</span>
                    <button
                        onClick={() => { setSubdivisions(Math.min(6, subdivisions + 1)); setDistributed(new Array(groupCount).fill(0)); setErrorMessage(""); }}
                        className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                </div>
            </div>

            <div className="flex w-full rounded-xl overflow-hidden border-2 border-teal-400/50 shadow-lg shadow-teal-500/10" style={{ minHeight: 54 }}>
                {Array.from({ length: totalParts }, (_, i) => {
                    const isColored = i < coloredParts;
                    const isGiven = isColored && i < totalDistributed;
                    const isFlying = flyings.some((f) => f.pieceIdx === i);
                    return (
                        <div
                            key={i}
                            ref={(el) => {
                                if (el && isColored) barRefs.current.set(i, el);
                            }}
                            className={[
                                "flex-1 border-r-[3px] last:border-r-0 border-gray-600/80 transition-all duration-300",
                            ].join(" ")}
                            style={{
                                minHeight: 54,
                                backgroundColor: isFlying
                                    ? "rgba(45,212,191,0.3)"
                                    : isGiven
                                        ? "rgba(45,212,191,0.1)"
                                        : isColored
                                            ? "rgba(45,212,191,0.85)"
                                            : "rgba(45,212,191,0.08)",
                                opacity: isFlying ? 0.4 : isGiven ? 0.2 : isColored ? 1 : 0.3,
                                transform: isFlying ? "scale(0.85)" : "scale(1)",
                            }}
                        />
                    );
                })}
            </div>

            {groupCount > 1 && (
                <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${Math.min(groupCount, 6)}, 1fr)` }}>
                    {Array.from({ length: groupCount }, (_, g) => {
                        const hasContent = distributed[g] > 0;
                        return (
                            <button
                                key={g}
                                ref={(el) => {
                                    if (el) groupRefs.current.set(g, el);
                                }}
                                onClick={() => handleDistribute(g)}
                                className={[
                                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-300 active:scale-90",
                                    hasContent
                                        ? "border-emerald-400/60 bg-emerald-500/20 shadow-md shadow-emerald-500/10"
                                        : "border-white/20 bg-white/5 hover:bg-white/10",
                                ].join(" ")}
                            >
                                <span className="text-white/40 text-xs">Grupo {g + 1}</span>
                                <div className="flex flex-wrap gap-0.5 justify-center min-h-[20px]">
                                    {Array.from({ length: distributed[g] }, (_, i) => (
                                        <div
                                            key={i}
                                            className="w-4 h-4 rounded-sm bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm"
                                            style={{ animation: "popIn 0.3s ease-out" }}
                                        />
                                    ))}
                                </div>
                                <span className="text-white/30 text-xs">{distributed[g]} de {totalParts}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {flyings.map((fly) => {
                if (!fly.startRect) return null;
                return (
                    <div
                        key={fly.id}
                        className="fixed z-50 rounded-md pointer-events-none"
                        style={{
                            width: fly.startRect.width,
                            height: fly.startRect.height,
                            background: "linear-gradient(to bottom, rgba(45,212,191,0.9), rgba(20,184,166,0.9))",
                            border: "2px solid rgba(94,234,212,0.6)",
                            boxShadow: "0 0 20px rgba(45,212,191,0.5)",
                            animation: "flyPortion 0.38s ease-in-out forwards",
                            left: fly.startRect.left,
                            top: fly.startRect.top,
                        }}
                    />
                );
            })}

            {errorMessage && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-2">
                    {errorMessage}
                </div>
            )}

            {allDistributed && !confirmed && groupCount > 1 && (
                <button
                    onClick={handleConfirm}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                >
                    Comprobar resultado
                </button>
            )}

            {confirmed && (
                <div className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl border border-white/10 p-4">
                    <span className="text-white/70 text-sm">Cada grupo recibe:</span>
                    <FractionDisplay num={ex.resultNum} den={ex.resultDen} color="#34d399" />
                </div>
            )}
        </div>
    );
}

// ─── Case 3: Int ÷ Fraction (cuántas veces cabe) ─────────────────────────────

function CaseIntFrac({
    ex, count, setCount, placedCount, setPlacedCount, confirmed, setConfirmed,
}: {
    ex: Exercise;
    count: number;
    setCount: (n: number) => void;
    placedCount: number;
    setPlacedCount: (n: number) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
}) {
    const { n1, n2, d2 } = ex;
    const exactCount = Math.floor((n1 * d2) / n2);
    const hasRemainder = (n1 * d2) % n2 !== 0;
    const remainderNum = (n1 * d2) % n2;
    const fullSegments = exactCount;
    const segmentWidth = n2 / d2;

    const lineRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);
    const dragXRef = useRef(0);

    const lineWidth = n1 + 0.5;

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (placedCount >= fullSegments + (hasRemainder ? 1 : 0)) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        const rect = lineRef.current?.getBoundingClientRect();
        if (rect) {
            dragXRef.current = e.clientX - rect.left;
        }
    }, [placedCount, fullSegments, hasRemainder]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;
        const rect = lineRef.current?.getBoundingClientRect();
        if (rect) {
            dragXRef.current = e.clientX - rect.left;
        }
    }, [dragging]);

    const handlePointerUp = useCallback(() => {
        if (!dragging) return;
        setDragging(false);
        const rect = lineRef.current?.getBoundingClientRect();
        if (!rect) return;

        const nextStart = placedCount * segmentWidth;
        const dropPos = dragXRef.current / rect.width * lineWidth;
        const targetEnd = nextStart + segmentWidth;
        const tolerance = segmentWidth * 0.5;

        if (dropPos >= nextStart - tolerance && dropPos <= targetEnd + tolerance) {
            setPlacedCount(placedCount + 1);
            setCount(placedCount + 1);
        }
    }, [dragging, placedCount, segmentWidth, lineWidth, setCount, setPlacedCount]);

    const allPlaced = placedCount === fullSegments + (hasRemainder ? 1 : 0);

    return (
        <div className="flex flex-col items-center gap-4 w-[95%] sm:w-[80%] mx-auto">
            <div className="text-white/60 text-sm text-center">
                Arrastra la tarjeta de fracción sobre la recta para medir cuántas veces cabe
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-white/70 text-sm font-semibold">¿Cuántas veces contaste?</span>
                <button
                    onClick={() => setCount(Math.max(0, count - 1))}
                    className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >−</button>
                <span className="w-10 text-center font-mono font-bold text-2xl text-white">{count}</span>
                <button
                    onClick={() => setCount(Math.min(20, count + 1))}
                    className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >+</button>
            </div>

            <div
                ref={lineRef}
                className="relative w-full select-none"
                style={{ height: 80, touchAction: "none" }}
            >
                <div className="absolute left-0 right-0" style={{ top: 40, height: 3, backgroundColor: "rgba(255,255,255,0.3)" }} />

                {Array.from({ length: lineWidth + 1 }, (_, i) => {
                    const left = `${(i / lineWidth) * 100}%`;
                    return (
                        <React.Fragment key={`tick-${i}`}>
                            <div className="absolute" style={{ left, top: 30, width: 2, height: 22, backgroundColor: "rgba(255,255,255,0.6)" }} />
                            <div className="absolute text-xs font-bold text-white/60" style={{ left, top: 56, transform: "translateX(-50%)" }}>{i}</div>
                        </React.Fragment>
                    );
                })}

                <div className="absolute" style={{ left: `${(n1 / lineWidth) * 100}%`, top: 20, transform: "translateX(-50%)" }}>
                    <div className="w-0.5 h-6 bg-amber-400 mx-auto" />
                    <div className="text-amber-400 text-xs font-bold text-center whitespace-nowrap">meta</div>
                </div>

                {Array.from({ length: placedCount }, (_, i) => {
                    const start = i * segmentWidth;
                    const isLast = i === placedCount - 1 && hasRemainder && allPlaced;
                    const width = isLast ? remainderNum / n2 : segmentWidth;
                    const left = `${(start / lineWidth) * 100}%`;
                    const w = `${(width / lineWidth) * 100}%`;
                    return (
                        <div
                            key={`seg-${i}`}
                            className="absolute rounded-md"
                            style={{
                                left,
                                top: 34,
                                width: w,
                                height: 14,
                                backgroundColor: isLast ? "rgba(251,191,36,0.5)" : "rgba(52,211,153,0.5)",
                                border: `2px solid ${isLast ? "rgba(251,191,36,0.8)" : "rgba(52,211,153,0.8)"}`,
                            }}
                        />
                    );
                })}

                {dragging && (
                    <div
                        className="absolute rounded-md pointer-events-none"
                        style={{
                            left: `${((placedCount * segmentWidth) / lineWidth) * 100}%`,
                            top: 34,
                            width: `${(segmentWidth / lineWidth) * 100}%`,
                            height: 14,
                            border: "2px dashed rgba(52,211,153,0.6)",
                            backgroundColor: "rgba(52,211,153,0.1)",
                        }}
                    />
                )}
            </div>

            <button
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={[
                    "px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                    allPlaced
                        ? "bg-white/10 text-white/30 cursor-default"
                        : "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 cursor-grab",
                ].join(" ")}
                style={{ touchAction: "none" }}
            >
                Colocar <InlineFrac num={n2} den={d2} color={allPlaced ? "rgba(255,255,255,0.3)" : "#fff"} />
            </button>

            <div className="text-white/40 text-xs text-center">
                Veces colocadas: <span className="text-emerald-400 font-bold">{placedCount}</span>
            </div>

            {allPlaced && !confirmed && (
                <button
                    onClick={() => setConfirmed(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                >
                    Comprobar: {count} veces
                </button>
            )}

            {confirmed && (
                <div className="flex items-center justify-center gap-3 flex-wrap bg-white/5 rounded-2xl border border-white/10 p-4">
                    <span className="font-bold text-2xl" style={{ color: "#2dd4bf" }}>{n1}</span>
                    <span className="text-white/60 text-2xl">÷</span>
                    <InlineFrac num={n2} den={d2} color="#fbbf24" />
                    <span className="text-white/60 text-2xl">=</span>
                    {ex.resultDen > 1 ? (
                        <InlineFrac num={ex.resultNum} den={ex.resultDen} color="#34d399" />
                    ) : (
                        <span className="font-bold text-2xl" style={{ color: "#34d399" }}>{ex.resultNum}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Case 4: Fraction ÷ Fraction (cuántas veces cabe una fracción en otra) ───

function CaseFracFrac({
    ex, subdivisions, setSubdivisions, placedCount, setPlacedCount,
    count, setCount, confirmed, setConfirmed,
}: {
    ex: Exercise;
    subdivisions: number;
    setSubdivisions: (n: number) => void;
    placedCount: number;
    setPlacedCount: (n: number) => void;
    count: number;
    setCount: (n: number) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
}) {
    const { n1, d1, n2, d2 } = ex;
    const commonD = lcm(d1, d2);
    const targetExpanded1 = n1 * (commonD / d1);
    const targetExpanded2 = n2 * (commonD / d2);

    const currentParts = d1 * subdivisions;
    const currentColored = n1 * subdivisions;
    const currentDivisor = n2 * (currentParts / d1);

    const isAtCommon = currentParts === commonD;
    const coloredCells = isAtCommon ? targetExpanded1 : currentColored;
    const divisorCells = isAtCommon ? targetExpanded2 : currentDivisor;
    const barDivisions = currentParts;

    const canFit = divisorCells > 0 && coloredCells > 0 && divisorCells <= coloredCells;
    const maxPlacements = canFit ? Math.floor(coloredCells / divisorCells) : 0;
    const remainderCells = canFit ? coloredCells % divisorCells : 0;
    const hasRemainder = remainderCells > 0;

    const handlePlace = useCallback(() => {
        if (placedCount >= maxPlacements + (hasRemainder ? 1 : 0)) return;
        const next = placedCount + 1;
        setPlacedCount(next);
        if (next <= maxPlacements) {
            setCount(next);
        } else {
            setCount(next - 1);
        }
    }, [placedCount, maxPlacements, hasRemainder, setPlacedCount, setCount]);

    const allPlaced = placedCount === maxPlacements + (hasRemainder ? 1 : 0);

    return (
        <div className="flex flex-col items-center gap-4 w-[95%] sm:w-[80%] mx-auto">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                <span className="text-white/70 text-xs">Subdividir</span>
                <button
                    onClick={() => { setSubdivisions(Math.max(1, subdivisions - 1)); setPlacedCount(0); setCount(0); }}
                    className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >−</button>
                <span className="w-8 text-center font-mono font-bold text-white">{barDivisions}</span>
                <button
                    onClick={() => { setSubdivisions(Math.min(12, subdivisions + 1)); setPlacedCount(0); setCount(0); }}
                    className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                >+</button>
                <span className="text-white/40 text-xs">partes</span>
            </div>

            <div className="flex w-full rounded-xl overflow-hidden border-2 border-teal-400/50 shadow-lg shadow-teal-500/10" style={{ minHeight: 54 }}>
                {Array.from({ length: barDivisions }, (_, i) => {
                    const isColored = i < coloredCells;
                    const isInPlacedRange = isColored && i < placedCount * divisorCells;
                    const isRemainder = hasRemainder && placedCount > maxPlacements && isColored && i >= maxPlacements * divisorCells && i < maxPlacements * divisorCells + remainderCells;

                    let bg = "bg-teal-900/20";
                    let shadow = "";
                    if (isColored && isInPlacedRange && !isRemainder) {
                        bg = "bg-gradient-to-b from-violet-400 to-fuchsia-500";
                        shadow = "shadow-[inset_0_0_8px_rgba(168,85,247,0.5)]";
                    } else if (isRemainder) {
                        bg = "bg-gradient-to-b from-amber-400 to-amber-500";
                        shadow = "shadow-[inset_0_0_8px_rgba(251,191,36,0.5)]";
                    } else if (isColored) {
                        bg = "bg-gradient-to-b from-teal-400 to-teal-500";
                    }

                    return (
                        <div
                            key={i}
                            className={`flex-1 border-r-[3px] last:border-r-0 border-gray-600/80 transition-all duration-500 ${bg} ${shadow}`}
                            style={{ minHeight: 54 }}
                        />
                    );
                })}
            </div>

            <div className="flex items-center gap-2 text-sm">
                <span className="text-white/50">Coloreadas:</span>
                <span className="text-teal-400 font-bold">{coloredCells}</span>
                <span className="text-white/30">|</span>
                <span className="text-white/50">Tarjeta:</span>
                <span className="text-amber-400 font-bold">{divisorCells}</span>
                <span className="text-white/30">celdas</span>
            </div>

            {isAtCommon && !allPlaced && (
                <button
                    onClick={handlePlace}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-amber-500/30"
                >
                    Colocar <InlineFrac num={n2} den={d2} color="#fff" /> sobre la barra
                </button>
            )}

            {!isAtCommon && (
                <div className="text-amber-400/70 text-xs text-center">
                    Necesitas subdividir a {commonD} partes para poder colocar la tarjeta
                </div>
            )}

            {isAtCommon && (
                <div className="text-white/40 text-xs text-center">
                    Veces colocada: <span className="text-emerald-400 font-bold">{Math.min(placedCount, maxPlacements)}</span>
                    {hasRemainder && placedCount > maxPlacements && (
                        <span className="text-amber-400"> + resto</span>
                    )}
                </div>
            )}

            {allPlaced && !confirmed && (
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-white/70 text-sm font-semibold">¿Cuántas veces cabe?</span>
                        <button
                            onClick={() => setCount(Math.max(0, count - 1))}
                            className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >−</button>
                        <span className="w-10 text-center font-mono font-bold text-2xl text-white">{count}</span>
                        <button
                            onClick={() => setCount(Math.min(20, count + 1))}
                            className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >+</button>
                    </div>
                    <button
                        onClick={() => setConfirmed(true)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                    >
                        Comprobar
                    </button>
                </div>
            )}

            {confirmed && (
                <div className="flex items-center justify-center gap-3 flex-wrap bg-white/5 rounded-2xl border border-white/10 p-4">
                    {ex.resultDen === 1 ? (
                        <span className="font-bold text-2xl" style={{ color: "#34d399" }}>{ex.resultNum}</span>
                    ) : (
                        <InlineFrac num={ex.resultNum} den={ex.resultDen} color="#34d399" />
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Math Writing ─────────────────────────────────────────────────────────────

function MathWriting({ ex }: { ex: Exercise }) {
    const teal = "#2dd4bf";
    const amber = "#fbbf24";
    const green = "#34d399";

    if (ex.caseType === "int-int") {
        return (
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span className="font-bold text-2xl" style={{ color: teal }}>{ex.n1}</span>
                    <span className="text-white/50 text-2xl">÷</span>
                    <span className="font-bold text-2xl" style={{ color: amber }}>{ex.n2}</span>
                    <span className="text-white/50 text-2xl">=</span>
                    <span className="font-bold text-xl" style={{ color: teal }}>{ex.n1}</span>
                    <span className="text-white/50 text-lg">cosa{ex.n1 > 1 ? "s" : ""} en</span>
                    <span className="font-bold text-xl" style={{ color: amber }}>{ex.n2}</span>
                    <span className="text-white/50 text-lg">grupos</span>
                    <span className="text-white/50 text-2xl">=</span>
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                </div>
            </div>
        );
    }
    if (ex.caseType === "frac-int") {
        const newDen = ex.d1 * ex.n2;
        return (
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                    <span className="text-white/50 text-2xl">÷</span>
                    <span className="font-bold text-2xl" style={{ color: amber }}>{ex.n2}</span>
                    <span className="text-white/50 text-2xl">=</span>
                    <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                    <span className="text-white/50 text-lg">en</span>
                    <span className="font-bold text-xl" style={{ color: amber }}>{ex.n2}</span>
                    <span className="text-white/50 text-lg">grupos</span>
                    <span className="text-white/50 text-2xl">=</span>
                    <InlineFrac num={ex.n1} den={newDen} color="rgba(255,255,255,0.5)" />
                    <span className="text-white/50 text-2xl">=</span>
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                </div>
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        return (
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span className="font-bold text-2xl" style={{ color: teal }}>{ex.n1}</span>
                    <span className="text-white/50 text-2xl">÷</span>
                    <InlineFrac num={ex.n2} den={ex.d2} color={amber} />
                    <span className="text-white/50 text-lg">→ cabe</span>
                    <span className="font-bold text-2xl" style={{ color: green }}>{ex.resultNum}{ex.resultDen > 1 ? `/${ex.resultDen}` : ""}</span>
                    <span className="text-white/50 text-lg">veces</span>
                    <span className="text-white/50 text-2xl">=</span>
                    <span className="font-bold text-xl" style={{ color: teal }}>{ex.n1}</span>
                    <span className="text-white/50 text-2xl">×</span>
                    <InlineFrac num={ex.d2} den={ex.n2} color={amber} />
                    <span className="text-white/50 text-2xl">=</span>
                    {ex.resultDen === 1 ? (
                        <span className="font-bold text-2xl" style={{ color: green }}>{ex.resultNum}</span>
                    ) : (
                        <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                    )}
                </div>
            </div>
        );
    }

    const commonD = lcm(ex.d1, ex.d2);
    const expanded1 = ex.n1 * (commonD / ex.d1);
    const expanded2 = ex.n2 * (commonD / ex.d2);
    return (
        <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 flex-wrap">
                <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                <span className="text-white/50 text-2xl">÷</span>
                <InlineFrac num={ex.n2} den={ex.d2} color={amber} />
                <span className="text-white/50 text-2xl">=</span>
                <InlineFrac num={expanded1} den={commonD} color={teal} />
                <span className="text-white/50 text-2xl">÷</span>
                <InlineFrac num={expanded2} den={commonD} color={amber} />
                <span className="text-white/50 text-lg">→ cabe</span>
                {ex.resultDen === 1 ? (
                    <span className="font-bold text-2xl" style={{ color: green }}>{ex.resultNum}</span>
                ) : (
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                )}
                <span className="text-white/50 text-lg">veces</span>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
                <span className="text-white/40">Regla:</span>
                <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                <span className="text-white/50">×</span>
                <InlineFrac num={ex.d2} den={ex.n2} color={amber} />
                <span className="text-white/50">=</span>
                {ex.resultDen === 1 ? (
                    <span className="font-bold text-lg" style={{ color: green }}>{ex.resultNum}</span>
                ) : (
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                )}
            </div>
        </div>
    );
}

// ─── Level label ──────────────────────────────────────────────────────────────

function levelLabel(level: number): string {
    const labels: Record<number, string> = {
        1: "Entero ÷ entero (simple)",
        2: "Entero ÷ entero (mayor)",
        3: "Fracción ÷ entero (exacto)",
        4: "Fracción ÷ entero (subdividir)",
        5: "Entero ÷ fracción (exacto)",
        6: "Entero ÷ fracción (mixto)",
        7: "Fracción ÷ fracción (exacto)",
        8: "Fracción ÷ fracción (fracción)",
        9: "Mezcla libre",
    };
    return labels[level] ?? `Nivel ${level}`;
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DivisionFraccionesView() {
    const navigate = useNavigate();

    const [level, setLevel] = useState(1);
    const [exercise, setExercise] = useState<Exercise>(() => generateExercise(1));

    // Case 1: int-int
    const [groupCount, setGroupCount] = useState(1);
    const [distributed, setDistributed] = useState<number[]>(() => new Array(1).fill(0));
    const [intIntConfirmed, setIntIntConfirmed] = useState(false);
    const [intIntError, setIntIntError] = useState("");

    // Case 2: frac-int
    const [fracIntGroups, setFracIntGroups] = useState(1);
    const [subdivisions, setSubdivisions] = useState(1);
    const [fracIntDistributed, setFracIntDistributed] = useState<number[]>(() => new Array(1).fill(0));
    const [fracIntConfirmed, setFracIntConfirmed] = useState(false);
    const [fracIntError, setFracIntError] = useState("");

    // Case 3: int-frac
    const [intFracCount, setIntFracCount] = useState(0);
    const [intFracPlaced, setIntFracPlaced] = useState(0);
    const [intFracConfirmed, setIntFracConfirmed] = useState(false);

    // Case 4: frac-frac
    const [fracFracSubdivs, setFracFracSubdivs] = useState(1);
    const [fracFracPlaced, setFracFracPlaced] = useState(0);
    const [fracFracCount, setFracFracCount] = useState(0);
    const [fracFracConfirmed, setFracFracConfirmed] = useState(false);

    // Shared
    const [showMath, setShowMath] = useState(false);
    const [celebration, setCelebration] = useState(false);

    const isComplete =
        exercise.caseType === "int-int" ? intIntConfirmed :
            exercise.caseType === "frac-int" ? fracIntConfirmed :
                exercise.caseType === "int-frac" ? intFracConfirmed :
                    fracFracConfirmed;

    const resetAll = useCallback(() => {
        setGroupCount(1);
        setDistributed(new Array(1).fill(0));
        setIntIntConfirmed(false);
        setIntIntError("");
        setFracIntGroups(1);
        setSubdivisions(1);
        setFracIntDistributed(new Array(1).fill(0));
        setFracIntConfirmed(false);
        setFracIntError("");
        setIntFracCount(0);
        setIntFracPlaced(0);
        setIntFracConfirmed(false);
        setFracFracSubdivs(1);
        setFracFracPlaced(0);
        setFracFracCount(0);
        setFracFracConfirmed(false);
        setShowMath(false);
        setCelebration(false);
    }, []);

    const handleNewExercise = useCallback(() => {
        setExercise(generateExercise(level));
        resetAll();
    }, [level, resetAll]);

    const handleLevelChange = useCallback((newLevel: number) => {
        setLevel(newLevel);
        setExercise(generateExercise(newLevel));
        resetAll();
    }, [resetAll]);

    const handleShowMath = useCallback(() => {
        setShowMath(true);
        setCelebration(true);
    }, []);

    return (
        <div className="min-h-dvh bg-[#080c18] text-white flex flex-col select-none" style={{ touchAction: "none" }}>
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
                >
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">Dividir Fracciones</h1>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-1 flex-wrap">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((l) => (
                    <button
                        key={l}
                        onClick={() => handleLevelChange(l)}
                        className={[
                            "w-8 h-8 rounded-lg font-bold text-sm transition-all",
                            l === level
                                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                : "bg-white/10 text-white/50 hover:bg-white/20",
                        ].join("")}
                    >
                        {l}
                    </button>
                ))}
            </div>
            <div className="text-center text-xs text-white/40 mb-1">{levelLabel(level)}</div>

            <div className="flex justify-center px-4 py-3">
                <OpDisplay ex={exercise} />
            </div>

            <div className="flex-1 flex items-start justify-center px-4 py-2 overflow-auto">
                {exercise.caseType === "int-int" && (
                    <CaseIntInt
                        ex={exercise}
                        groupCount={groupCount}
                        setGroupCount={setGroupCount}
                        distributed={distributed}
                        setDistributed={setDistributed}
                        confirmed={intIntConfirmed}
                        setConfirmed={setIntIntConfirmed}
                        errorMessage={intIntError}
                        setErrorMessage={setIntIntError}
                    />
                )}
                {exercise.caseType === "frac-int" && (
                    <CaseFracInt
                        ex={exercise}
                        groupCount={fracIntGroups}
                        setGroupCount={setFracIntGroups}
                        subdivisions={subdivisions}
                        setSubdivisions={setSubdivisions}
                        distributed={fracIntDistributed}
                        setDistributed={setFracIntDistributed}
                        confirmed={fracIntConfirmed}
                        setConfirmed={setFracIntConfirmed}
                        errorMessage={fracIntError}
                        setErrorMessage={setFracIntError}
                    />
                )}
                {exercise.caseType === "int-frac" && (
                    <CaseIntFrac
                        ex={exercise}
                        count={intFracCount}
                        setCount={setIntFracCount}
                        placedCount={intFracPlaced}
                        setPlacedCount={setIntFracPlaced}
                        confirmed={intFracConfirmed}
                        setConfirmed={setIntFracConfirmed}
                    />
                )}
                {exercise.caseType === "frac-frac" && (
                    <CaseFracFrac
                        ex={exercise}
                        subdivisions={fracFracSubdivs}
                        setSubdivisions={setFracFracSubdivs}
                        placedCount={fracFracPlaced}
                        setPlacedCount={setFracFracPlaced}
                        count={fracFracCount}
                        setCount={setFracFracCount}
                        confirmed={fracFracConfirmed}
                        setConfirmed={setFracFracConfirmed}
                    />
                )}
            </div>

            {showMath && (
                <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                    <MathWriting ex={exercise} />
                </div>
            )}

            {celebration && (
                <div className="text-center px-4 pb-2">
                    <span className="text-emerald-400 font-bold text-lg">🎉 ¡Excelente!</span>
                </div>
            )}

            <div className="flex items-center justify-center gap-3 px-4 py-4 flex-wrap">
                {isComplete && !showMath && (
                    <button
                        onClick={handleShowMath}
                        className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-rose-500/30"
                    >
                        Ver la matemática
                    </button>
                )}
                <button
                    onClick={handleNewExercise}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-amber-500/30"
                >
                    Nuevo ejercicio
                </button>
                <button
                    onClick={() => handleLevelChange(level)}
                    className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/70 font-bold text-sm hover:bg-white/20 active:scale-95 transition-all"
                >
                    Reiniciar
                </button>
            </div>
        </div>
    );
}
