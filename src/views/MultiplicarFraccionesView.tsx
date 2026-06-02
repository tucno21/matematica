import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────

type CaseType = "frac-int" | "int-frac" | "frac-frac";

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

function generateExercise(level: number): Exercise {
    const caseType: CaseType =
        level <= 2 ? "frac-int" :
            level <= 4 ? "int-frac" :
                level <= 6 ? "frac-frac" :
                    (["frac-int", "int-frac", "frac-frac"] as const)[Math.floor(Math.random() * 3)];

    if (caseType === "frac-int") {
        const den = 2 + Math.floor(Math.random() * 5);
        const num = 1 + Math.floor(Math.random() * (den - 1));
        const whole = level === 1
            ? Math.min(Math.floor(den / num), 3)
            : 2 + Math.floor(Math.random() * 3);
        const rn = num * whole;
        const rd = den;
        const [sn, sd] = simplify(rn, rd);
        return { caseType, n1: num, d1: den, n2: whole, d2: 1, resultNum: sn, resultDen: sd };
    }

    if (caseType === "int-frac") {
        const den = 2 + Math.floor(Math.random() * 4);
        const num = 1 + Math.floor(Math.random() * (den - 1));
        const total = level === 3
            ? den * (2 + Math.floor(Math.random() * 4))
            : 2 + Math.floor(Math.random() * 10);
        const rn = total * num;
        const rd = den;
        const [sn, sd] = simplify(rn, rd);
        return { caseType, n1: total, d1: 1, n2: num, d2: den, resultNum: sn, resultDen: sd };
    }

    const d1 = 2 + Math.floor(Math.random() * 5);
    const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
    const d2 = 2 + Math.floor(Math.random() * 5);
    const n2 = 1 + Math.floor(Math.random() * (d2 - 1));
    const rn = n1 * n2;
    const rd = d1 * d2;
    const [sn, sd] = simplify(rn, rd);
    return { caseType, n1, d1, n2, d2, resultNum: sn, resultDen: sd };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    if (ex.caseType === "frac-int") {
        return (
            <div className="flex items-center gap-3 text-2xl font-bold">
                <span style={{ color: teal }}>{ex.n2}</span>
                <span className="text-white/60">×</span>
                <FractionDisplay num={ex.n1} den={ex.d1} color={amber} />
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        return (
            <div className="flex items-center gap-3 text-2xl font-bold">
                <FractionDisplay num={ex.n2} den={ex.d2} color={teal} />
                <span className="text-white/60">de</span>
                <span style={{ color: amber }}>{ex.n1}</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-3 text-2xl font-bold">
            <FractionDisplay num={ex.n1} den={ex.d1} color={teal} />
            <span className="text-white/60">×</span>
            <FractionDisplay num={ex.n2} den={ex.d2} color={amber} />
        </div>
    );
}

// ─── Case 1: Fraction × Integer ──────────────────────────────────────────────

function CaseFracInt({
    ex, groups, setGroups, joined, setJoined,
}: {
    ex: Exercise;
    groups: number;
    setGroups: (n: number) => void;
    joined: boolean;
    setJoined: (b: boolean) => void;
}) {
    const { n1, d1, n2 } = ex;
    const totalPieces = n1 * groups;
    const resultNum = totalPieces;
    const resultDen = d1;
    const isOverflow = totalPieces > d1;
    const canJoin = groups === n2;

    const barWidth = `${100 / d1}%`;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
            {!joined ? (
                <>
                    <div className="flex items-center gap-3">
                        <span className="text-white/70 text-sm font-semibold">¿Cuántos grupos?</span>
                        <button
                            onClick={() => setGroups(Math.max(0, groups - 1))}
                            className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >−</button>
                        <span className="w-8 text-center font-mono font-bold text-xl text-white">{groups}</span>
                        <button
                            onClick={() => setGroups(Math.min(12, groups + 1))}
                            className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                        >+</button>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        {Array.from({ length: groups }, (_, g) => (
                            <div key={g} className="flex items-center gap-2">
                                <span className="text-white/40 text-xs font-mono w-6">{g + 1}.</span>
                                <div className="flex w-full rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-md" style={{ minHeight: 48 }}>
                                    {Array.from({ length: d1 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={[
                                                "flex-1 border-r last:border-r-0 border-gray-700",
                                                i < n1
                                                    ? "bg-gradient-to-b from-amber-400 to-amber-500"
                                                    : "bg-amber-900/30",
                                            ].join(" ")}
                                            style={{ minHeight: 48 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {canJoin && (
                        <button
                            onClick={() => setJoined(true)}
                            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-teal-500/30"
                        >
                            Juntar todo
                        </button>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                    <div className="text-white/70 text-sm font-semibold">Resultado</div>
                    <div className="flex w-full rounded-xl overflow-hidden border-2 border-emerald-400/60 shadow-md" style={{ minHeight: 48 }}>
                        {isOverflow ? (
                            <>
                                {Array.from({ length: d1 }, (_, i) => (
                                    <div
                                        key={`f-${i}`}
                                        className="flex-1 bg-gradient-to-b from-emerald-400 to-emerald-500 border-r border-gray-700"
                                        style={{ minHeight: 48, width: barWidth }}
                                    />
                                ))}
                                <div className="w-px bg-white/40 mx-1" />
                                {Array.from({ length: totalPieces - d1 }, (_, i) => (
                                    <div
                                        key={`s-${i}`}
                                        className="flex-1 bg-gradient-to-b from-emerald-400 to-emerald-500 border-r last:border-r-0 border-gray-700"
                                        style={{ minHeight: 48, width: barWidth }}
                                    />
                                ))}
                            </>
                        ) : (
                            Array.from({ length: d1 }, (_, i) => (
                                <div
                                    key={i}
                                    className={[
                                        "flex-1 border-r last:border-r-0 border-gray-700",
                                        i < totalPieces
                                            ? "bg-gradient-to-b from-emerald-400 to-emerald-500"
                                            : "bg-emerald-900/30",
                                    ].join(" ")}
                                    style={{ minHeight: 48, width: barWidth }}
                                />
                            ))
                        )}
                    </div>
                    <div className="text-center">
                        <FractionDisplay
                            num={resultNum}
                            den={resultDen}
                            color="#34d399"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Case 2: Integer × Fraction ──────────────────────────────────────────────

function CaseIntFrac({
    ex, groupCount, setGroupCount, selectCount, setSelectCount, confirmed, setConfirmed,
}: {
    ex: Exercise;
    groupCount: number;
    setGroupCount: (n: number) => void;
    selectCount: number;
    setSelectCount: (n: number) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
}) {
    const { n1, n2, d2 } = ex;
    const chipsPerGroup = groupCount > 0 ? Math.ceil(n1 / groupCount) : n1;
    const remainder = groupCount > 0 ? n1 % groupCount : 0;
    const groups: number[] = [];
    for (let g = 0; g < groupCount; g++) {
        groups.push(g < groupCount - remainder ? chipsPerGroup : chipsPerGroup - (groupCount > 0 && remainder > 0 ? 1 : 0));
    }
    if (groupCount === 0) {
        groups.push(n1);
    }

    const coloredCount = groups.slice(0, selectCount).reduce((a, b) => a + b, 0);
    const canConfirm = groupCount === d2 && selectCount === n2;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
            <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-white/70 text-xs">Dividir en</span>
                    <button
                        onClick={() => setGroupCount(Math.max(1, groupCount - 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">{groupCount}</span>
                    <button
                        onClick={() => setGroupCount(Math.min(12, groupCount + 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                    <span className="text-white/70 text-xs">grupos</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-white/70 text-xs">Tomar</span>
                    <button
                        onClick={() => setSelectCount(Math.max(0, selectCount - 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">{selectCount}</span>
                    <button
                        onClick={() => setSelectCount(Math.min(groupCount, selectCount + 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                    <span className="text-white/70 text-xs">grupos</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
                {groups.map((count, g) => {
                    const isSelected = g < selectCount;
                    return (
                        <div
                            key={g}
                            className={[
                                "flex flex-wrap gap-1.5 p-2 rounded-xl border-2 transition-all duration-300",
                                isSelected
                                    ? "border-teal-400 bg-teal-500/20"
                                    : "border-white/10 bg-white/5",
                            ].join(" ")}
                        >
                            {Array.from({ length: count }, (_, i) => (
                                <div
                                    key={i}
                                    className={[
                                        "w-8 h-8 rounded-full transition-all duration-200",
                                        isSelected
                                            ? "bg-gradient-to-br from-teal-400 to-teal-500 shadow-md"
                                            : "bg-white/20",
                                    ].join(" ")}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>

            {!confirmed && canConfirm && (
                <button
                    onClick={() => setConfirmed(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                >
                    ¿Cuántas fichas tomé?
                </button>
            )}

            {confirmed && (
                <div className="text-center">
                    <span className="text-emerald-400 font-bold text-xl">{coloredCount} fichas</span>
                </div>
            )}
        </div>
    );
}

// ─── Case 3: Fraction × Fraction ─────────────────────────────────────────────

function CaseFracFrac({
    ex, cols, setCols, colSelect, setColSelect, rows, setRows, rowSelect, setRowSelect, confirmed, setConfirmed,
}: {
    ex: Exercise;
    cols: number;
    setCols: (n: number) => void;
    colSelect: number;
    setColSelect: (n: number) => void;
    rows: number;
    setRows: (n: number) => void;
    rowSelect: number;
    setRowSelect: (n: number) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
}) {
    const { n1, d1, n2, d2 } = ex;
    const canConfirm = cols === d1 && colSelect === n1 && rows === d2 && rowSelect === n2;
    const totalCells = cols * rows;
    const intersectCells = colSelect * rowSelect;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
            <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-teal-400 text-xs font-semibold">Columnas</span>
                    <button
                        onClick={() => { setCols(Math.max(1, cols - 1)); setColSelect(Math.min(colSelect, cols - 1)); }}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">{cols}</span>
                    <button
                        onClick={() => setCols(Math.min(12, cols + 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                    <span className="text-white/40 text-xs">colorear</span>
                    <button
                        onClick={() => setColSelect(Math.max(0, colSelect - 1))}
                        className="w-8 h-8 rounded-lg bg-teal-500/30 text-teal-300 font-bold flex items-center justify-center hover:bg-teal-500/50 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-teal-300">{colSelect}</span>
                    <button
                        onClick={() => setColSelect(Math.min(cols, colSelect + 1))}
                        className="w-8 h-8 rounded-lg bg-teal-500/30 text-teal-300 font-bold flex items-center justify-center hover:bg-teal-500/50 active:scale-90 transition-all"
                    >+</button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-amber-400 text-xs font-semibold">Filas</span>
                    <button
                        onClick={() => { setRows(Math.max(1, rows - 1)); setRowSelect(Math.min(rowSelect, rows - 1)); }}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-white">{rows}</span>
                    <button
                        onClick={() => setRows(Math.min(12, rows + 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                    >+</button>
                    <span className="text-white/40 text-xs">colorear</span>
                    <button
                        onClick={() => setRowSelect(Math.max(0, rowSelect - 1))}
                        className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center hover:bg-amber-500/50 active:scale-90 transition-all"
                    >−</button>
                    <span className="w-6 text-center font-mono font-bold text-amber-300">{rowSelect}</span>
                    <button
                        onClick={() => setRowSelect(Math.min(rows, rowSelect + 1))}
                        className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center hover:bg-amber-500/50 active:scale-90 transition-all"
                    >+</button>
                </div>
            </div>

            <div
                className="grid border-2 border-white/30 rounded-lg overflow-hidden w-full aspect-square max-w-sm"
                style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
            >
                {Array.from({ length: totalCells }, (_, idx) => {
                    const c = idx % cols;
                    const r = Math.floor(idx / cols);
                    const inCol = c < colSelect;
                    const inRow = r < rowSelect;
                    const isIntersection = inCol && inRow;

                    let bg = "bg-white/5";
                    if (isIntersection) bg = "bg-gradient-to-br from-emerald-400 to-emerald-500";
                    else if (inCol) bg = "bg-teal-500/40";
                    else if (inRow) bg = "bg-amber-500/40";

                    return (
                        <div
                            key={idx}
                            className={`border border-white/10 transition-all duration-200 ${bg}`}
                        />
                    );
                })}
            </div>

            <div className="text-white/50 text-sm text-center">
                Celdas de intersección: <span className="text-emerald-400 font-bold">{intersectCells}</span>
                {" / "}
                Total: <span className="text-white font-bold">{totalCells}</span>
            </div>

            {!confirmed && canConfirm && (
                <button
                    onClick={() => setConfirmed(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
                >
                    Comprobar
                </button>
            )}

            {confirmed && (
                <div className="text-center">
                    <FractionDisplay
                        num={intersectCells}
                        den={totalCells}
                        color="#34d399"
                    />
                </div>
            )}
        </div>
    );
}

// ─── Math Writing ─────────────────────────────────────────────────────────────

function InlineFrac({ num, den, color }: { num: number; den: number; color: string }) {
    return (
        <div className="flex flex-col items-center" style={{ color }}>
            <span className="font-bold text-lg leading-tight">{num}</span>
            <div className="w-full h-px" style={{ backgroundColor: color }} />
            <span className="font-bold text-lg leading-tight">{den}</span>
        </div>
    );
}

function MathWriting({ ex }: { ex: Exercise }) {
    const teal = "#2dd4bf";
    const amber = "#fbbf24";
    const green = "#34d399";

    if (ex.caseType === "frac-int") {
        return (
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span className="font-bold text-2xl" style={{ color: teal }}>{ex.n2}</span>
                    <span className="text-white/50 text-2xl">×</span>
                    <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                    <span className="text-white/50 text-2xl">=</span>
                    {Array.from({ length: ex.n2 }, (_, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-white/50 text-2xl">+</span>}
                            <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                        </React.Fragment>
                    ))}
                    <span className="text-white/50 text-2xl">=</span>
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                </div>
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        const divided = ex.n1 / ex.d2;
        const multiplied = divided * ex.n2;
        return (
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <InlineFrac num={ex.n2} den={ex.d2} color={teal} />
                    <span className="text-white/50 text-lg">de</span>
                    <span className="font-bold text-2xl" style={{ color: amber }}>{ex.n1}</span>
                    <span className="text-white/50 text-lg">→</span>
                    <span className="font-bold text-xl" style={{ color: amber }}>{ex.n1}</span>
                    <span className="text-white/50 text-xl">÷</span>
                    <span className="font-bold text-xl" style={{ color: teal }}>{ex.d2}</span>
                    <span className="text-white/50 text-xl">=</span>
                    <span className="font-bold text-xl" style={{ color: amber }}>{divided}</span>
                    <span className="text-white/50 text-lg">→</span>
                    <span className="font-bold text-xl" style={{ color: amber }}>{divided}</span>
                    <span className="text-white/50 text-xl">×</span>
                    <span className="font-bold text-xl" style={{ color: teal }}>{ex.n2}</span>
                    <span className="text-white/50 text-xl">=</span>
                    <span className="font-bold text-2xl" style={{ color: green }}>{multiplied}</span>
                </div>
            </div>
        );
    }
    return (
        <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 flex-wrap">
                <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                <span className="text-white/50 text-2xl">×</span>
                <InlineFrac num={ex.n2} den={ex.d2} color={amber} />
                <span className="text-white/50 text-2xl">=</span>
                <div className="flex flex-col items-center text-white/50">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-lg" style={{ color: teal }}>{ex.n1}</span>
                        <span>×</span>
                        <span className="font-bold text-lg" style={{ color: amber }}>{ex.n2}</span>
                    </div>
                    <div className="w-full h-px bg-white/40" />
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-lg" style={{ color: teal }}>{ex.d1}</span>
                        <span>×</span>
                        <span className="font-bold text-lg" style={{ color: amber }}>{ex.d2}</span>
                    </div>
                </div>
                <span className="text-white/50 text-2xl">=</span>
                <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
            </div>
        </div>
    );
}

// ─── Level label ──────────────────────────────────────────────────────────────

function levelLabel(level: number): string {
    const labels: Record<number, string> = {
        1: "Fracción × entero (menor a 1)",
        2: "Fracción × entero (mayor a 1)",
        3: "Fracción de un conjunto (exacto)",
        4: "Fracción de un conjunto (no exacto)",
        5: "Fracción × fracción (simplificable)",
        6: "Fracción × fracción (no simplificable)",
        7: "Mezcla libre",
    };
    return labels[level] ?? `Nivel ${level}`;
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function MultiplicarFraccionesView() {
    const navigate = useNavigate();

    const [level, setLevel] = useState(1);
    const [exercise, setExercise] = useState<Exercise>(() => generateExercise(1));

    // Case 1
    const [groups, setGroups] = useState(0);
    const [joined, setJoined] = useState(false);

    // Case 2
    const [groupCount, setGroupCount] = useState(1);
    const [selectCount, setSelectCount] = useState(0);
    const [intFracConfirmed, setIntFracConfirmed] = useState(false);

    // Case 3
    const [cols, setCols] = useState(1);
    const [colSelect, setColSelect] = useState(0);
    const [rows, setRows] = useState(1);
    const [rowSelect, setRowSelect] = useState(0);
    const [fracFracConfirmed, setFracFracConfirmed] = useState(false);

    // Shared
    const [showMath, setShowMath] = useState(false);
    const [celebration, setCelebration] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const isComplete =
        exercise.caseType === "frac-int" ? joined :
            exercise.caseType === "int-frac" ? intFracConfirmed :
                fracFracConfirmed;

    const handleNewExercise = useCallback(() => {
        setExercise(generateExercise(level));
        setGroups(0);
        setJoined(false);
        setGroupCount(1);
        setSelectCount(0);
        setIntFracConfirmed(false);
        setCols(1);
        setColSelect(0);
        setRows(1);
        setRowSelect(0);
        setFracFracConfirmed(false);
        setShowMath(false);
        setCelebration(false);
    }, [level]);

    const handleLevelChange = useCallback((newLevel: number) => {
        setLevel(newLevel);
        setExercise(generateExercise(newLevel));
        setGroups(0);
        setJoined(false);
        setGroupCount(1);
        setSelectCount(0);
        setIntFracConfirmed(false);
        setCols(1);
        setColSelect(0);
        setRows(1);
        setRowSelect(0);
        setFracFracConfirmed(false);
        setShowMath(false);
        setCelebration(false);
    }, []);

    const handleShowMath = useCallback(() => {
        setShowMath(true);
        setCelebration(true);
    }, []);

    return (
        <div className="min-h-dvh bg-[#080c18] text-white flex flex-col select-none" style={{ touchAction: "none" }}>
            {/* ── Header ── */}
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
                >
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">Multiplicar Fracciones</h1>
                <button
                    onClick={() => setShowHelp(true)}
                    className="absolute right-4 w-8 h-8 rounded-full bg-white/10 text-white/70 text-sm font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                >
                    ?
                </button>
            </div>

            {/* ── Level selector ── */}
            <div className="flex items-center justify-center gap-2 px-4 py-1 flex-wrap">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((l) => (
                    <button
                        key={l}
                        onClick={() => handleLevelChange(l)}
                        className={[
                            "w-8 h-8 rounded-lg font-bold text-sm transition-all",
                            l === level
                                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                                : "bg-white/10 text-white/50 hover:bg-white/20",
                        ].join("")}
                    >
                        {l}
                    </button>
                ))}
            </div>
            <div className="text-center text-xs text-white/40 mb-1">{levelLabel(level)}</div>

            {/* ── Operation ── */}
            <div className="flex justify-center px-4 py-3">
                <OpDisplay ex={exercise} />
            </div>

            {/* ── Visual Area ── */}
            <div className="flex-1 flex items-start justify-center px-4 py-2 overflow-auto">
                {exercise.caseType === "frac-int" && (
                    <CaseFracInt
                        ex={exercise}
                        groups={groups}
                        setGroups={setGroups}
                        joined={joined}
                        setJoined={setJoined}
                    />
                )}
                {exercise.caseType === "int-frac" && (
                    <CaseIntFrac
                        ex={exercise}
                        groupCount={groupCount}
                        setGroupCount={setGroupCount}
                        selectCount={selectCount}
                        setSelectCount={setSelectCount}
                        confirmed={intFracConfirmed}
                        setConfirmed={setIntFracConfirmed}
                    />
                )}
                {exercise.caseType === "frac-frac" && (
                    <CaseFracFrac
                        ex={exercise}
                        cols={cols}
                        setCols={setCols}
                        colSelect={colSelect}
                        setColSelect={setColSelect}
                        rows={rows}
                        setRows={setRows}
                        rowSelect={rowSelect}
                        setRowSelect={setRowSelect}
                        confirmed={fracFracConfirmed}
                        setConfirmed={setFracFracConfirmed}
                    />
                )}
            </div>

            {/* ── Math writing ── */}
            {showMath && (
                <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                    <MathWriting ex={exercise} />
                </div>
            )}

            {/* ── Celebration ── */}
            {celebration && (
                <div className="text-center px-4 pb-2">
                    <span className="text-emerald-400 font-bold text-lg">🎉 ¡Excelente!</span>
                </div>
            )}

            {/* ── Controls ── */}
            <div className="flex items-center justify-center gap-3 px-4 py-4 flex-wrap">
                {isComplete && !showMath && (
                    <button
                        onClick={handleShowMath}
                        className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
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
                    onClick={handleLevelChange.bind(null, level)}
                    className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/70 font-bold text-sm hover:bg-white/20 active:scale-95 transition-all"
                >
                    Reiniciar
                </button>
            </div>

            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo multiplicar fracciones visualmente?"
                bgColor="#0f172a"
                titleColor="#e2e8f0"
            >
                <div className="text-white/80 text-sm space-y-4">
                    <p>Resuelve multiplicaciones paso a paso con barras, fichas y cuadrículas. Hay <strong className="text-white">3 tipos</strong> de ejercicio según el nivel:</p>

                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                        <p className="font-bold text-teal-400">Fracción × Entero (niveles 1-2)</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/70">
                            <li>Observa la <strong className="text-amber-400">fracción</strong> que debes multiplicar por un número <strong className="text-teal-400">entero</strong>.</li>
                            <li>Usa los botones <strong>−</strong> y <strong>+</strong> para crear la <strong className="text-white">cantidad de grupos</strong> que indica el entero.</li>
                            <li>Cada grupo muestra una barra con la fracción. Cuando tengas los grupos correctos, pulsa <strong className="text-teal-400">Juntar todo</strong>.</li>
                            <li>Las partes coloreadas se combinan en una sola barra mostrando el <strong className="text-emerald-400">resultado</strong>.</li>
                        </ol>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                        <p className="font-bold text-amber-400">Entero × Fracción — fracción de un conjunto (niveles 3-4)</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/70">
                            <li>Tienes una cantidad de <strong className="text-amber-400">fichas</strong> y debes tomar una fracción de ellas.</li>
                            <li>Usa <strong className="text-white">Dividir en</strong> para separar las fichas en tantos grupos como indica el <strong className="text-white">denominador</strong>.</li>
                            <li>Usa <strong className="text-white">Tomar</strong> para seleccionar tantos grupos como indica el <strong className="text-white">numerador</strong>.</li>
                            <li>Los grupos seleccionados se colorean de <strong className="text-teal-400">teal</strong>. Cuando coincidan con la fracción, pulsa <strong className="text-emerald-400">¿Cuántas fichas tomé?</strong>.</li>
                        </ol>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                        <p className="font-bold text-emerald-400">Fracción × Fracción (niveles 5-6)</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/70">
                            <li>Se muestra una <strong className="text-white">cuadrícula</strong> donde debes configurar <strong className="text-teal-400">Columnas</strong> (denominador 1) y <strong className="text-amber-400">Filas</strong> (denominador 2).</li>
                            <li>Ajusta <strong className="text-white">colorear</strong> en cada eje para marcar las partes que indica cada numerador.</li>
                            <li>Las celdas <strong className="text-emerald-400">intersección</strong> (donde se cruzan columnas y filas coloreadas) representan el <strong className="text-white">numerador del resultado</strong>.</li>
                            <li>El <strong className="text-white">total de celdas</strong> es el denominador. Cuando todo coincida, pulsa <strong className="text-emerald-400">Comprobar</strong>.</li>
                        </ol>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1.5">
                        <p className="font-bold text-white text-xs uppercase tracking-wide">Consejos generales</p>
                        <ul className="list-disc list-inside space-y-1 text-white/60 text-xs">
                            <li>El nivel <strong className="text-white/80">7</strong> mezcla todos los tipos aleatoriamente.</li>
                            <li>Usa <strong className="text-white/80">Nuevo ejercicio</strong> para cambiar el problema y <strong className="text-white/80">Reiniciar</strong> para empezar de cero.</li>
                            <li>Al completar, pulsa <strong className="text-indigo-400">Ver la matemática</strong> para ver la demostración formal de la operación.</li>
                        </ul>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
