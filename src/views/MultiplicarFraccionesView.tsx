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
            ? den * (2 + Math.floor(Math.random() * 3))
            : den * (1 + Math.floor(Math.random() * 3));
        const rn = total * num;
        const rd = den;
        const [sn, sd] = simplify(rn, rd);
        return { caseType, n1: total, d1: 1, n2: num, d2: den, resultNum: sn, resultDen: sd };
    }

    const d1 = 2 + Math.floor(Math.random() * 4);
    const n1 = 1 + Math.floor(Math.random() * (d1 - 1));
    const d2 = 2 + Math.floor(Math.random() * 4);
    const n2 = 1 + Math.floor(Math.random() * (d2 - 1));
    const rn = n1 * n2;
    const rd = d1 * d2;
    const [sn, sd] = simplify(rn, rd);
    return { caseType, n1, d1, n2, d2, resultNum: sn, resultDen: sd };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FractionDisplay({
    num,
    den,
    color,
    size = "normal",
}: {
    num: number;
    den: number;
    color: string;
    size?: "normal" | "small" | "large";
}) {
    const textCls =
        size === "large"
            ? "text-base lg:text-xl"
            : size === "small"
                ? "text-[10px] lg:text-xs"
                : "text-xs lg:text-sm";
    const lineH = size === "large" ? "h-0.5 my-0.5" : "h-px my-0.5";
    return (
        <div className={`inline-flex flex-col items-center font-bold ${textCls} leading-none select-none`} style={{ color }}>
            <span>{num}</span>
            <span className={`w-full ${lineH}`} style={{ backgroundColor: color }} />
            <span>{den}</span>
        </div>
    );
}

function OpDisplay({ ex }: { ex: Exercise }) {
    const teal = "#2dd4bf";
    const amber = "#fbbf24";
    if (ex.caseType === "frac-int") {
        return (
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
                <span className="text-teal-400 font-extrabold">{ex.n2}</span>
                <span className="text-white/40">×</span>
                <FractionDisplay num={ex.n1} den={ex.d1} color={amber} />
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        return (
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
                <FractionDisplay num={ex.n2} den={ex.d2} color={teal} />
                <span className="text-white/40 text-[11px] sm:text-xs font-semibold">de</span>
                <span className="text-amber-400 font-extrabold">{ex.n1}</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
            <FractionDisplay num={ex.n1} den={ex.d1} color={teal} />
            <span className="text-white/40">×</span>
            <FractionDisplay num={ex.n2} den={ex.d2} color={amber} />
        </div>
    );
}

// ─── Case 1: Fraction × Integer ──────────────────────────────────────────────

function CaseFracInt({
    ex,
    groups,
    setGroups,
    joined,
}: {
    ex: Exercise;
    groups: number;
    setGroups: (n: number) => void;
    joined: boolean;
    setJoined: (b: boolean) => void;
}) {
    const { n1, d1 } = ex;
    const totalPieces = n1 * groups;
    const resultNum = totalPieces;
    const resultDen = d1;
    const [sn, sd] = simplify(resultNum, resultDen);
    const needsSimplify = sn !== resultNum || sd !== resultDen;

    const barsNeeded = Math.max(1, Math.ceil(totalPieces / d1));
    const compactBars = groups > 3 || (joined && barsNeeded > 1);
    const barH = compactBars ? "h-6 sm:h-7" : "h-7 sm:h-8 lg:h-9";

    return (
        <div className="flex flex-col items-center justify-center gap-2 w-full max-w-xl mx-auto">
            {!joined ? (
                <>
                    {/* Control de grupos */}
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-3 py-1">
                        <span className="text-white/70 text-xs font-semibold">¿Cuántos grupos?</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setGroups(Math.max(0, groups - 1))}
                                disabled={groups <= 0}
                                className="w-7 h-7 rounded-md bg-white/10 text-white font-bold text-base flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all select-none"
                            >
                                −
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-sm text-teal-300">
                                {groups}
                            </span>
                            <button
                                onClick={() => setGroups(Math.min(8, groups + 1))}
                                disabled={groups >= 8}
                                className="w-7 h-7 rounded-md bg-white/10 text-white font-bold text-base flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all select-none"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Barras de grupos */}
                    <div className="flex flex-col gap-1.5 w-full max-h-[220px] overflow-y-auto pr-1">
                        {groups === 0 ? (
                            <div className="text-center py-4 text-xs text-white/40 italic">
                                Usa los botones + para añadir grupos de {n1}/{d1}
                            </div>
                        ) : (
                            Array.from({ length: groups }, (_, g) => (
                                <div key={g} className="flex items-center gap-1.5">
                                    <span className="text-white/40 text-[10px] font-mono font-bold w-5 text-right shrink-0">
                                        #{g + 1}
                                    </span>
                                    <div
                                        className={`flex-1 flex rounded-xl overflow-hidden border-2 border-amber-400/60 bg-slate-900/90 shadow-inner ${barH}`}
                                    >
                                        {Array.from({ length: d1 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={[
                                                    "flex-1 border-r-2 last:border-r-0 border-black transition-all select-none",
                                                    i < n1
                                                        ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-xs"
                                                        : "bg-slate-800/80",
                                                ].join(" ")}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                /* Resultado unificado */
                <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-300 text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                            Resultado combinado
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                            <FractionDisplay num={resultNum} den={resultDen} color="#34d399" />
                            {needsSimplify && (
                                <>
                                    <span className="text-white/40 text-xs font-bold">=</span>
                                    <FractionDisplay num={sn} den={sd} color="#a78bfa" />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full max-h-[220px] overflow-y-auto pr-1">
                        {Array.from({ length: barsNeeded }, (_, b) => (
                            <div key={b} className="flex items-center gap-1.5">
                                {barsNeeded > 1 && (
                                    <span className="text-white/40 text-[10px] font-mono font-bold w-5 text-right shrink-0">
                                        #{b + 1}
                                    </span>
                                )}
                                <div
                                    className={`flex-1 flex rounded-xl overflow-hidden border-2 border-emerald-400/60 bg-slate-900/90 shadow-inner ${barH}`}
                                >
                                    {Array.from({ length: d1 }, (_, i) => {
                                        const filled = b * d1 + i < totalPieces;
                                        return (
                                            <div
                                                key={i}
                                                className={[
                                                    "flex-1 border-r-2 last:border-r-0 border-black transition-all select-none",
                                                    filled
                                                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-xs"
                                                        : "bg-slate-800/80",
                                                ].join(" ")}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Case 2: Integer × Fraction ──────────────────────────────────────────────

function CaseIntFrac({
    ex,
    groupCount,
    setGroupCount,
    selectCount,
    setSelectCount,
    confirmed,
}: {
    ex: Exercise;
    groupCount: number;
    setGroupCount: (n: number) => void;
    selectCount: number;
    setSelectCount: (n: number) => void;
    confirmed: boolean;
    setConfirmed: (b: boolean) => void;
}) {
    const { n1 } = ex;
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

    return (
        <div className="flex flex-col items-center justify-center gap-2 w-full max-w-xl mx-auto">
            {/* Controles de división y selección */}
            <div className="flex items-center gap-2 flex-wrap justify-center text-xs">
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 px-2.5 py-1">
                    <span className="text-white/70">Dividir en</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, groupCount - 1);
                            setGroupCount(next);
                            if (selectCount > next) setSelectCount(next);
                        }}
                        disabled={groupCount <= 1}
                        className="w-6 h-6 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all select-none"
                    >
                        −
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-teal-300">{groupCount}</span>
                    <button
                        onClick={() => setGroupCount(Math.min(8, groupCount + 1))}
                        disabled={groupCount >= 8}
                        className="w-6 h-6 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all select-none"
                    >
                        +
                    </button>
                    <span className="text-white/70">grupos</span>
                </div>

                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 px-2.5 py-1">
                    <span className="text-white/70">Tomar</span>
                    <button
                        onClick={() => setSelectCount(Math.max(0, selectCount - 1))}
                        disabled={selectCount <= 0}
                        className="w-6 h-6 rounded bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center hover:bg-teal-500/30 active:scale-95 disabled:opacity-20 transition-all select-none"
                    >
                        −
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-teal-300">{selectCount}</span>
                    <button
                        onClick={() => setSelectCount(Math.min(groupCount, selectCount + 1))}
                        disabled={selectCount >= groupCount}
                        className="w-6 h-6 rounded bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center hover:bg-teal-500/30 active:scale-95 disabled:opacity-20 transition-all select-none"
                    >
                        +
                    </button>
                    <span className="text-white/70">grupos</span>
                </div>
            </div>

            {/* Fichas divididas en grupos */}
            <div className="flex flex-wrap gap-2 justify-center items-center max-h-[200px] overflow-y-auto p-1 w-full">
                {groups.map((count, g) => {
                    const isSelected = g < selectCount;
                    return (
                        <div
                            key={g}
                            className={[
                                "flex flex-wrap gap-1 p-1.5 rounded-xl border-2 transition-all duration-200 items-center justify-center",
                                isSelected
                                    ? "border-teal-400 bg-teal-500/20 shadow-xs"
                                    : "border-white/10 bg-slate-900/60",
                            ].join(" ")}
                        >
                            {Array.from({ length: count }, (_, i) => (
                                <div
                                    key={i}
                                    className={[
                                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-150 border",
                                        isSelected
                                            ? "bg-gradient-to-br from-teal-400 to-teal-500 border-teal-300 shadow-xs"
                                            : "bg-slate-700/80 border-black/40",
                                    ].join(" ")}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>

            {confirmed && (
                <div className="text-center bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                    <span className="text-emerald-300 font-bold text-sm sm:text-base">
                        {coloredCount} fichas tomadas de {n1}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Case 3: Fraction × Fraction ─────────────────────────────────────────────

function CaseFracFrac({
    cols,
    setCols,
    colSelect,
    setColSelect,
    rows,
    setRows,
    rowSelect,
    setRowSelect,
    confirmed,
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
    const totalCells = cols * rows;
    const intersectCells = colSelect * rowSelect;
    const [sn, sd] = simplify(intersectCells, totalCells);
    const needsSimplify = sn !== intersectCells || sd !== totalCells;

    return (
        <div className="flex flex-col items-center justify-center gap-2 w-full max-w-lg mx-auto">
            {/* Controles de Columnas y Filas */}
            <div className="flex items-center gap-2 flex-wrap justify-center text-xs">
                {/* Columnas */}
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 px-2 py-1">
                    <span className="text-teal-400 font-semibold">Cols:</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, cols - 1);
                            setCols(next);
                            if (colSelect > next) setColSelect(next);
                        }}
                        disabled={cols <= 1}
                        className="w-5 h-5 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 select-none"
                    >
                        −
                    </button>
                    <span className="w-4 text-center font-mono font-bold text-white">{cols}</span>
                    <button
                        onClick={() => setCols(Math.min(8, cols + 1))}
                        disabled={cols >= 8}
                        className="w-5 h-5 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 select-none"
                    >
                        +
                    </button>
                    <span className="text-white/40 text-[10px]">pintar:</span>
                    <button
                        onClick={() => setColSelect(Math.max(0, colSelect - 1))}
                        disabled={colSelect <= 0}
                        className="w-5 h-5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center hover:bg-teal-500/30 active:scale-95 disabled:opacity-20 select-none"
                    >
                        −
                    </button>
                    <span className="w-4 text-center font-mono font-bold text-teal-300">{colSelect}</span>
                    <button
                        onClick={() => setColSelect(Math.min(cols, colSelect + 1))}
                        disabled={colSelect >= cols}
                        className="w-5 h-5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center hover:bg-teal-500/30 active:scale-95 disabled:opacity-20 select-none"
                    >
                        +
                    </button>
                </div>

                {/* Filas */}
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 px-2 py-1">
                    <span className="text-amber-400 font-semibold">Filas:</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, rows - 1);
                            setRows(next);
                            if (rowSelect > next) setRowSelect(next);
                        }}
                        disabled={rows <= 1}
                        className="w-5 h-5 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 select-none"
                    >
                        −
                    </button>
                    <span className="w-4 text-center font-mono font-bold text-white">{rows}</span>
                    <button
                        onClick={() => setRows(Math.min(8, rows + 1))}
                        disabled={rows >= 8}
                        className="w-5 h-5 rounded bg-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 select-none"
                    >
                        +
                    </button>
                    <span className="text-white/40 text-[10px]">pintar:</span>
                    <button
                        onClick={() => setRowSelect(Math.max(0, rowSelect - 1))}
                        disabled={rowSelect <= 0}
                        className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center hover:bg-amber-500/30 active:scale-95 disabled:opacity-20 select-none"
                    >
                        −
                    </button>
                    <span className="w-4 text-center font-mono font-bold text-amber-300">{rowSelect}</span>
                    <button
                        onClick={() => setRowSelect(Math.min(rows, rowSelect + 1))}
                        disabled={rowSelect >= rows}
                        className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center hover:bg-amber-500/30 active:scale-95 disabled:opacity-20 select-none"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Cuadrícula adaptativa */}
            <div
                className="grid border-2 border-white/40 rounded-xl overflow-hidden shadow-inner bg-slate-900/90"
                style={{
                    width: "min(42vw, 190px)",
                    height: "min(42vw, 190px)",
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

                    let bg = "bg-slate-800/80";
                    if (isIntersection) bg = "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-xs";
                    else if (inCol) bg = "bg-teal-500/40";
                    else if (inRow) bg = "bg-amber-500/40";

                    return (
                        <div
                            key={idx}
                            className={`border border-black/40 transition-all duration-150 ${bg}`}
                        />
                    );
                })}
            </div>

            <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">
                    Intersección: <strong className="text-emerald-400 font-mono">{intersectCells}</strong> / {totalCells}
                </span>
                {confirmed && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        <FractionDisplay num={intersectCells} den={totalCells} color="#34d399" size="small" />
                        {needsSimplify && (
                            <>
                                <span className="text-white/40 font-bold text-[10px]">=</span>
                                <FractionDisplay num={sn} den={sd} color="#a78bfa" size="small" />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Math Writing ─────────────────────────────────────────────────────────────

function InlineFrac({ num, den, color }: { num: number; den: number; color: string }) {
    return (
        <div className="inline-flex flex-col items-center" style={{ color }}>
            <span className="font-bold text-base lg:text-xl leading-tight">{num}</span>
            <div className="w-full h-0.5 my-0.5" style={{ backgroundColor: color }} />
            <span className="font-bold text-base lg:text-xl leading-tight">{den}</span>
        </div>
    );
}

function MathWriting({ ex }: { ex: Exercise }) {
    const teal = "#2dd4bf";
    const amber = "#fbbf24";
    const green = "#34d399";

    if (ex.caseType === "frac-int") {
        return (
            <div className="text-center space-y-3">
                <p className="text-xs text-white/50 uppercase tracking-widest font-bold">
                    Multiplicación como suma repetida
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: teal }}>{ex.n2}</span>
                    <span className="text-white/50 text-xl sm:text-2xl">×</span>
                    <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                    <span className="text-white/50 text-xl sm:text-2xl">=</span>
                    {Array.from({ length: ex.n2 }, (_, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-white/50 text-lg">+</span>}
                            <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                        </React.Fragment>
                    ))}
                    <span className="text-white/50 text-xl sm:text-2xl">=</span>
                    <InlineFrac num={ex.resultNum} den={ex.resultDen} color={green} />
                </div>
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        const divided = ex.n1 / ex.d2;
        const multiplied = divided * ex.n2;
        return (
            <div className="text-center space-y-3">
                <p className="text-xs text-white/50 uppercase tracking-widest font-bold">
                    Fracción de un conjunto (dividir y tomar)
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-sm sm:text-base">
                    <InlineFrac num={ex.n2} den={ex.d2} color={teal} />
                    <span className="text-white/50">de</span>
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: amber }}>{ex.n1}</span>
                    <span className="text-white/50">→</span>
                    <span className="font-bold" style={{ color: amber }}>{ex.n1}</span>
                    <span className="text-white/50">÷</span>
                    <span className="font-bold" style={{ color: teal }}>{ex.d2}</span>
                    <span className="text-white/50">=</span>
                    <span className="font-bold" style={{ color: amber }}>{divided}</span>
                    <span className="text-white/50">→</span>
                    <span className="font-bold" style={{ color: amber }}>{divided}</span>
                    <span className="text-white/50">×</span>
                    <span className="font-bold" style={{ color: teal }}>{ex.n2}</span>
                    <span className="text-white/50">=</span>
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: green }}>{multiplied}</span>
                </div>
            </div>
        );
    }
    return (
        <div className="text-center space-y-3">
            <p className="text-xs text-white/50 uppercase tracking-widest font-bold">
                Producto directo: Numerador × Numerador y Denominador × Denominador
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                <span className="text-white/50 text-xl sm:text-2xl">×</span>
                <InlineFrac num={ex.n2} den={ex.d2} color={amber} />
                <span className="text-white/50 text-xl sm:text-2xl">=</span>
                <div className="flex flex-col items-center text-white/50">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm sm:text-base" style={{ color: teal }}>{ex.n1}</span>
                        <span>×</span>
                        <span className="font-bold text-sm sm:text-base" style={{ color: amber }}>{ex.n2}</span>
                    </div>
                    <div className="w-full h-0.5 bg-white/40 my-0.5" />
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm sm:text-base" style={{ color: teal }}>{ex.d1}</span>
                        <span>×</span>
                        <span className="font-bold text-sm sm:text-base" style={{ color: amber }}>{ex.d2}</span>
                    </div>
                </div>
                <span className="text-white/50 text-xl sm:text-2xl">=</span>
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
    }, []);

    // Can action helpers
    const canJoinCase1 = groups === exercise.n2;
    const canConfirmCase2 = groupCount === exercise.d2 && selectCount === exercise.n2;
    const canConfirmCase3 =
        cols === exercise.d1 &&
        colSelect === exercise.n1 &&
        rows === exercise.d2 &&
        rowSelect === exercise.n2;

    const getInstruction = () => {
        if (isComplete) return { text: "¡Operación completada con éxito!", tone: "emerald" };
        if (exercise.caseType === "frac-int") {
            if (canJoinCase1) return { text: "¡Cantidad de grupos correcta! Pulsa «Juntar todo».", tone: "green" };
            return { text: `Crea exactamente ${exercise.n2} grupos usando el botón +/−.`, tone: "amber" };
        }
        if (exercise.caseType === "int-frac") {
            if (canConfirmCase2) return { text: "¡Grupos listos! Pulsa «¿Cuántas fichas tomé?».", tone: "green" };
            return { text: `Divide en ${exercise.d2} grupos y toma ${exercise.n2} de ellos.`, tone: "amber" };
        }
        if (canConfirmCase3) return { text: "¡Cuadrícula completada! Pulsa «Comprobar».", tone: "green" };
        return { text: `Ajusta ${exercise.d1} columnas (${exercise.n1} pintar) y ${exercise.d2} filas (${exercise.n2} pintar).`, tone: "amber" };
    };

    const { text: hintText, tone: hintTone } = getInstruction();

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none">
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
                        Multiplicación de Fracciones
                    </h1>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shrink-0">
                        Nivel {level}
                    </span>
                </div>

                <button
                    onClick={() => setShowHelp(true)}
                    className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs lg:text-sm active:scale-95 transition-all"
                    title="Ayuda"
                >
                    ?
                </button>
            </header>

            {/* 2. Barra de niveles y operación superior (34-40px) */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] lg:text-xs">
                {/* Selector de nivel */}
                <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((l) => (
                        <button
                            key={l}
                            onClick={() => handleLevelChange(l)}
                            className={[
                                "w-6 h-6 lg:w-7 lg:h-7 rounded-md font-bold text-[11px] lg:text-xs transition-all active:scale-95",
                                l === level
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                            ].join(" ")}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {/* Ejercicio / Operación central */}
                <div className="flex items-center px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 shrink-0">
                    <OpDisplay ex={exercise} />
                </div>

                {/* Etiqueta del nivel */}
                <div className="text-[11px] text-white/40 font-medium truncate hidden md:inline">
                    {levelLabel(level)}
                </div>
            </div>

            {/* 3. Área de trabajo central (flex-1 min-h-0) */}
            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4 overflow-hidden relative">
                <div className="w-full max-w-2xl bg-[#0d1424]/90 border border-white/10 rounded-2xl p-2.5 sm:p-3 lg:p-4 shadow-xl flex flex-col justify-center gap-2">
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
            </main>

            {/* 4. Barra inferior de acción y feedback (40-48px) */}
            <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
                {/* Feedback a la izquierda */}
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 text-xs">
                        {hintTone === "emerald" ? "🎉" : hintTone === "green" ? "✓" : "💡"}
                    </span>
                    <span className={[
                        "text-[10px] sm:text-[11px] lg:text-xs font-semibold truncate",
                        hintTone === "emerald" ? "text-emerald-400" : hintTone === "green" ? "text-teal-300" : "text-amber-300",
                    ].join(" ")}>
                        {hintText}
                    </span>
                </div>

                {/* Acciones principales a la derecha */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {!isComplete ? (
                        <>
                            {exercise.caseType === "frac-int" && (
                                <button
                                    onClick={() => setJoined(true)}
                                    disabled={!canJoinCase1}
                                    className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-25 disabled:cursor-not-allowed text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                                >
                                    Juntar todo
                                </button>
                            )}
                            {exercise.caseType === "int-frac" && (
                                <button
                                    onClick={() => setIntFracConfirmed(true)}
                                    disabled={!canConfirmCase2}
                                    className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-25 disabled:cursor-not-allowed text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                                >
                                    ¿Cuántas tomé?
                                </button>
                            )}
                            {exercise.caseType === "frac-frac" && (
                                <button
                                    onClick={() => setFracFracConfirmed(true)}
                                    disabled={!canConfirmCase3}
                                    className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-25 disabled:cursor-not-allowed text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                                >
                                    Comprobar
                                </button>
                            )}
                            <button
                                onClick={handleNewExercise}
                                className="h-7 px-2.5 lg:h-8 lg:px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] lg:text-xs font-bold text-white/70 transition-all active:scale-95"
                            >
                                🎲 Nuevo
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowMath(true)}
                                className="h-7 px-2.5 lg:h-8 lg:px-4 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] lg:text-xs font-bold text-indigo-300 border border-indigo-500/30 transition-all active:scale-95"
                            >
                                📐 Ver matemática
                            </button>
                            <button
                                onClick={handleNewExercise}
                                className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                            >
                                🎲 Nuevo ejercicio
                            </button>
                        </>
                    )}
                </div>
            </footer>

            {/* Modal de Pasos Matemáticos */}
            {showMath && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="w-full max-w-lg bg-[#0d1424] border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col max-h-[85vh]">
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
                        <div className="overflow-y-auto py-4 pr-1 flex-1 min-h-0">
                            <MathWriting ex={exercise} />
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowMath(false)}
                                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all active:scale-95"
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
                title="¿Cómo multiplicar fracciones visualmente?"
                bgColor="#0d1424"
                titleColor="#f8fafc"
                buttonColor="bg-indigo-600 hover:bg-indigo-500"
            >
                <div className="text-white/80 text-xs sm:text-sm space-y-3 leading-relaxed">
                    <p>Resuelve multiplicaciones visualmente con barras, conjuntos y cuadrículas de área:</p>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1 border border-white/10">
                        <p className="font-bold text-teal-400">1. Fracción × Entero (niveles 1-2)</p>
                        <p className="text-white/70">
                            Usa <strong>+/−</strong> para crear la cantidad de grupos indicada por el entero. Cuando coincida, pulsa <strong className="text-teal-300">Juntar todo</strong> para sumar las partes.
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1 border border-white/10">
                        <p className="font-bold text-amber-400">2. Fracción de un Conjunto (niveles 3-4)</p>
                        <p className="text-white/70">
                            Usa <strong>Dividir en</strong> para repartir las fichas en grupos según el denominador, y <strong>Tomar</strong> según el numerador.
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1 border border-white/10">
                        <p className="font-bold text-emerald-400">3. Fracción × Fracción (niveles 5-6)</p>
                        <p className="text-white/70">
                            Ajusta <strong>Columnas</strong> y <strong>Filas</strong> según cada denominador. Las celdas donde se cruzan ambos colores representan el numerador del resultado.
                        </p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
