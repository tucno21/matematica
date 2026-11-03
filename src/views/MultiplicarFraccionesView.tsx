import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";
import { useThemeStore } from "../store/useThemeStore";

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
    const isDark = useThemeStore((s) => s.theme === "dark");
    const teal = isDark ? "#2dd4bf" : "#0f766e";
    const amber = isDark ? "#fbbf24" : "#b45309";
    const opSignColor = isDark ? "text-white/40" : "text-slate-500 font-bold";

    if (ex.caseType === "frac-int") {
        return (
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
                <span className={`font-extrabold ${isDark ? "text-teal-400" : "text-teal-700"}`}>{ex.n2}</span>
                <span className={opSignColor}>×</span>
                <FractionDisplay num={ex.n1} den={ex.d1} color={amber} />
            </div>
        );
    }
    if (ex.caseType === "int-frac") {
        return (
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
                <FractionDisplay num={ex.n2} den={ex.d2} color={teal} />
                <span className={`text-[11px] sm:text-xs font-semibold ${isDark ? "text-white/40" : "text-slate-600"}`}>de</span>
                <span className={`font-extrabold ${isDark ? "text-amber-400" : "text-amber-700"}`}>{ex.n1}</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm lg:text-base select-none">
            <FractionDisplay num={ex.n1} den={ex.d1} color={teal} />
            <span className={opSignColor}>×</span>
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
    const isDark = useThemeStore((s) => s.theme === "dark");
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
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                        <span className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-slate-700"}`}>¿Cuántos grupos?</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setGroups(Math.max(0, groups - 1))}
                                disabled={groups <= 0}
                                className={`w-7 h-7 rounded-md font-bold text-base flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                                    isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                                }`}
                            >
                                −
                            </button>
                            <span className={`w-6 text-center font-mono font-bold text-sm ${isDark ? "text-teal-300" : "text-teal-700"}`}>
                                {groups}
                            </span>
                            <button
                                onClick={() => setGroups(Math.min(8, groups + 1))}
                                disabled={groups >= 8}
                                className={`w-7 h-7 rounded-md font-bold text-base flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                                    isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                                }`}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Barras de grupos */}
                    <div className="flex flex-col gap-1.5 w-full max-h-[220px] overflow-y-auto pr-1">
                        {groups === 0 ? (
                            <div className={`text-center py-4 text-xs italic ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                Usa los botones + para añadir grupos de {n1}/{d1}
                            </div>
                        ) : (
                            Array.from({ length: groups }, (_, g) => (
                                <div key={g} className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono font-bold w-5 text-right shrink-0 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                        #{g + 1}
                                    </span>
                                    <div
                                        className={`flex-1 flex rounded-xl overflow-hidden border-2 shadow-inner ${barH} ${
                                            isDark ? "border-amber-400/60 bg-slate-900/90" : "border-amber-500/60 bg-slate-100"
                                        }`}
                                    >
                                        {Array.from({ length: d1 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={[
                                                    `flex-1 border-r-2 last:border-r-0 transition-all select-none ${
                                                        isDark ? "border-black" : "border-slate-300"
                                                    }`,
                                                    i < n1
                                                        ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-xs"
                                                        : (isDark ? "bg-slate-800/80" : "bg-slate-200/90"),
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
                        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                            isDark ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" : "text-emerald-800 bg-emerald-50 border-emerald-300 font-bold"
                        }`}>
                            Resultado combinado
                        </span>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                            isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-300"
                        }`}>
                            <FractionDisplay num={resultNum} den={resultDen} color={isDark ? "#34d399" : "#047857"} />
                            {needsSimplify && (
                                <>
                                    <span className={`text-xs font-bold ${isDark ? "text-white/40" : "text-slate-400"}`}>=</span>
                                    <FractionDisplay num={sn} den={sd} color={isDark ? "#a78bfa" : "#7c3aed"} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full max-h-[220px] overflow-y-auto pr-1">
                        {Array.from({ length: barsNeeded }, (_, b) => (
                            <div key={b} className="flex items-center gap-1.5">
                                {barsNeeded > 1 && (
                                    <span className={`text-[10px] font-mono font-bold w-5 text-right shrink-0 ${isDark ? "text-white/40" : "text-slate-500"}`}>
                                        #{b + 1}
                                    </span>
                                )}
                                <div
                                    className={`flex-1 flex rounded-xl overflow-hidden border-2 shadow-inner ${barH} ${
                                        isDark ? "border-emerald-400/60 bg-slate-900/90" : "border-emerald-500/60 bg-emerald-50/50"
                                    }`}
                                >
                                    {Array.from({ length: d1 }, (_, i) => {
                                        const filled = b * d1 + i < totalPieces;
                                        return (
                                            <div
                                                key={i}
                                                className={[
                                                    `flex-1 border-r-2 last:border-r-0 transition-all select-none ${
                                                        isDark ? "border-black" : "border-slate-300"
                                                    }`,
                                                    filled
                                                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-xs"
                                                        : (isDark ? "bg-slate-800/80" : "bg-slate-200/90"),
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
    const isDark = useThemeStore((s) => s.theme === "dark");
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
                <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                    <span className={isDark ? "text-white/70" : "text-slate-700 font-medium"}>Dividir en</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, groupCount - 1);
                            setGroupCount(next);
                            if (selectCount > next) setSelectCount(next);
                        }}
                        disabled={groupCount <= 1}
                        className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-5 text-center font-mono font-bold ${isDark ? "text-teal-300" : "text-teal-700"}`}>{groupCount}</span>
                    <button
                        onClick={() => setGroupCount(Math.min(8, groupCount + 1))}
                        disabled={groupCount >= 8}
                        className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        +
                    </button>
                    <span className={isDark ? "text-white/70" : "text-slate-700 font-medium"}>grupos</span>
                </div>

                <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                    <span className={isDark ? "text-white/70" : "text-slate-700 font-medium"}>Tomar</span>
                    <button
                        onClick={() => setSelectCount(Math.max(0, selectCount - 1))}
                        disabled={selectCount <= 0}
                        className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                            isDark ? "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30" : "bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200 shadow-xs"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-5 text-center font-mono font-bold ${isDark ? "text-teal-300" : "text-teal-700"}`}>{selectCount}</span>
                    <button
                        onClick={() => setSelectCount(Math.min(groupCount, selectCount + 1))}
                        disabled={selectCount >= groupCount}
                        className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 transition-all select-none ${
                            isDark ? "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30" : "bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200 shadow-xs"
                        }`}
                    >
                        +
                    </button>
                    <span className={isDark ? "text-white/70" : "text-slate-700 font-medium"}>grupos</span>
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
                                    ? (isDark ? "border-teal-400 bg-teal-500/20 shadow-xs" : "border-teal-500 bg-teal-50/70 shadow-xs")
                                    : (isDark ? "border-white/10 bg-slate-900/60" : "border-slate-300 bg-slate-100/80"),
                            ].join(" ")}
                        >
                            {Array.from({ length: count }, (_, i) => (
                                <div
                                    key={i}
                                    className={[
                                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-150 border",
                                        isSelected
                                            ? "bg-gradient-to-br from-teal-400 to-teal-500 border-teal-300 shadow-xs"
                                            : (isDark ? "bg-slate-700/80 border-black/40" : "bg-slate-300 border-slate-400/60"),
                                    ].join(" ")}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>

            {confirmed && (
                <div className={`text-center border px-3 py-1 rounded-lg ${isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-300"}`}>
                    <span className={`font-bold text-sm sm:text-base ${isDark ? "text-emerald-300" : "text-emerald-800"}`}>
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
    const isDark = useThemeStore((s) => s.theme === "dark");
    const totalCells = cols * rows;
    const intersectCells = colSelect * rowSelect;
    const [sn, sd] = simplify(intersectCells, totalCells);
    const needsSimplify = sn !== intersectCells || sd !== totalCells;

    return (
        <div className="flex flex-col items-center justify-center gap-2 w-full max-w-lg mx-auto">
            {/* Controles de Columnas y Filas */}
            <div className="flex items-center gap-2 flex-wrap justify-center text-xs">
                {/* Columnas */}
                <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                    <span className={`font-semibold ${isDark ? "text-teal-400" : "text-teal-700"}`}>Cols:</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, cols - 1);
                            setCols(next);
                            if (colSelect > next) setColSelect(next);
                        }}
                        disabled={cols <= 1}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-4 text-center font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{cols}</span>
                    <button
                        onClick={() => setCols(Math.min(8, cols + 1))}
                        disabled={cols >= 8}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        +
                    </button>
                    <span className={`text-[10px] ${isDark ? "text-white/40" : "text-slate-500"}`}>pintar:</span>
                    <button
                        onClick={() => setColSelect(Math.max(0, colSelect - 1))}
                        disabled={colSelect <= 0}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30" : "bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-4 text-center font-mono font-bold ${isDark ? "text-teal-300" : "text-teal-700"}`}>{colSelect}</span>
                    <button
                        onClick={() => setColSelect(Math.min(cols, colSelect + 1))}
                        disabled={colSelect >= cols}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30" : "bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200"
                        }`}
                    >
                        +
                    </button>
                </div>

                {/* Filas */}
                <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                    <span className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>Filas:</span>
                    <button
                        onClick={() => {
                            const next = Math.max(1, rows - 1);
                            setRows(next);
                            if (rowSelect > next) setRowSelect(next);
                        }}
                        disabled={rows <= 1}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-4 text-center font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{rows}</span>
                    <button
                        onClick={() => setRows(Math.min(8, rows + 1))}
                        disabled={rows >= 8}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs"
                        }`}
                    >
                        +
                    </button>
                    <span className={`text-[10px] ${isDark ? "text-white/40" : "text-slate-500"}`}>pintar:</span>
                    <button
                        onClick={() => setRowSelect(Math.max(0, rowSelect - 1))}
                        disabled={rowSelect <= 0}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                        }`}
                    >
                        −
                    </button>
                    <span className={`w-4 text-center font-mono font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>{rowSelect}</span>
                    <button
                        onClick={() => setRowSelect(Math.min(rows, rowSelect + 1))}
                        disabled={rowSelect >= rows}
                        className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-20 select-none ${
                            isDark ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                        }`}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Cuadrícula adaptativa */}
            <div
                className={`grid border-2 rounded-xl overflow-hidden shadow-inner ${
                    isDark ? "border-white/40 bg-slate-900/90" : "border-slate-300 bg-slate-100"
                }`}
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

                    let bg = isDark ? "bg-slate-800/80" : "bg-slate-200/90";
                    if (isIntersection) bg = "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-xs";
                    else if (inCol) bg = isDark ? "bg-teal-500/40" : "bg-teal-400/50";
                    else if (inRow) bg = isDark ? "bg-amber-500/40" : "bg-amber-400/50";

                    return (
                        <div
                            key={idx}
                            className={`border transition-all duration-150 ${
                                isDark ? "border-black/40" : "border-slate-300"
                            } ${bg}`}
                        />
                    );
                })}
            </div>

            <div className="flex items-center gap-2 text-xs">
                <span className={isDark ? "text-white/60" : "text-slate-600 font-semibold"}>
                    Intersección: <strong className={`font-mono ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{intersectCells}</strong> / {totalCells}
                </span>
                {confirmed && (
                    <div className={`flex items-center gap-1 border px-2 py-0.5 rounded-md ${isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-300"}`}>
                        <FractionDisplay num={intersectCells} den={totalCells} color={isDark ? "#34d399" : "#047857"} size="small" />
                        {needsSimplify && (
                            <>
                                <span className={`font-bold text-[10px] ${isDark ? "text-white/40" : "text-slate-400"}`}>=</span>
                                <FractionDisplay num={sn} den={sd} color={isDark ? "#a78bfa" : "#7c3aed"} size="small" />
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
    const isDark = useThemeStore((s) => s.theme === "dark");
    const teal = isDark ? "#2dd4bf" : "#0f766e";
    const amber = isDark ? "#fbbf24" : "#b45309";
    const green = isDark ? "#34d399" : "#059669";
    const symColor = isDark ? "text-white/50" : "text-slate-400 font-bold";
    const subtextColor = isDark ? "text-white/50" : "text-slate-500 font-bold";

    if (ex.caseType === "frac-int") {
        return (
            <div className="text-center space-y-3">
                <p className={`text-xs uppercase tracking-widest ${subtextColor}`}>
                    Multiplicación como suma repetida
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: teal }}>{ex.n2}</span>
                    <span className={`text-xl sm:text-2xl ${symColor}`}>×</span>
                    <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                    <span className={`text-xl sm:text-2xl ${symColor}`}>=</span>
                    {Array.from({ length: ex.n2 }, (_, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className={`text-lg ${symColor}`}>+</span>}
                            <InlineFrac num={ex.n1} den={ex.d1} color={amber} />
                        </React.Fragment>
                    ))}
                    <span className={`text-xl sm:text-2xl ${symColor}`}>=</span>
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
                <p className={`text-xs uppercase tracking-widest ${subtextColor}`}>
                    Fracción de un conjunto (dividir y tomar)
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-sm sm:text-base">
                    <InlineFrac num={ex.n2} den={ex.d2} color={teal} />
                    <span className={symColor}>de</span>
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: amber }}>{ex.n1}</span>
                    <span className={symColor}>→</span>
                    <span className="font-bold" style={{ color: amber }}>{ex.n1}</span>
                    <span className={symColor}>÷</span>
                    <span className="font-bold" style={{ color: teal }}>{ex.d2}</span>
                    <span className={symColor}>=</span>
                    <span className="font-bold" style={{ color: amber }}>{divided}</span>
                    <span className={symColor}>→</span>
                    <span className="font-bold" style={{ color: amber }}>{divided}</span>
                    <span className={symColor}>×</span>
                    <span className="font-bold" style={{ color: teal }}>{ex.n2}</span>
                    <span className={symColor}>=</span>
                    <span className="font-bold text-xl sm:text-2xl" style={{ color: green }}>{multiplied}</span>
                </div>
            </div>
        );
    }
    return (
        <div className="text-center space-y-3">
            <p className={`text-xs uppercase tracking-widest ${subtextColor}`}>
                Producto directo: Numerador × Numerador y Denominador × Denominador
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <InlineFrac num={ex.n1} den={ex.d1} color={teal} />
                <span className={`text-xl sm:text-2xl ${symColor}`}>×</span>
                <InlineFrac num={ex.n2} den={ex.d2} color={amber} />
                <span className={`text-xl sm:text-2xl ${symColor}`}>=</span>
                <div className={`flex flex-col items-center ${symColor}`}>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm sm:text-base" style={{ color: teal }}>{ex.n1}</span>
                        <span>×</span>
                        <span className="font-bold text-sm sm:text-base" style={{ color: amber }}>{ex.n2}</span>
                    </div>
                    <div className={`w-full h-0.5 my-0.5 ${isDark ? "bg-white/40" : "bg-slate-400"}`} />
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-sm sm:text-base" style={{ color: teal }}>{ex.d1}</span>
                        <span>×</span>
                        <span className="font-bold text-sm sm:text-base" style={{ color: amber }}>{ex.d2}</span>
                    </div>
                </div>
                <span className={`text-xl sm:text-2xl ${symColor}`}>=</span>
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
    const isDark = useThemeStore((s) => s.theme === "dark");

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
        <div className={`flex h-dvh flex-col overflow-hidden select-none ${isDark ? "bg-[#080c18] text-white" : "bg-slate-100 text-slate-900"}`}>
            {/* 1. Header (34-44px) */}
            <header className={`flex h-9 lg:h-11 shrink-0 items-center justify-between border-b px-2 lg:px-4 ${isDark ? "border-white/10 bg-[#0a0f1d]" : "border-slate-300 bg-white shadow-xs"}`}>
                <button
                    onClick={() => navigate(-1)}
                    className={`flex h-7 px-2 lg:h-8 lg:px-3 items-center gap-1 rounded-lg text-xs font-bold active:scale-95 transition-all ${
                        isDark ? "bg-white/10 hover:bg-white/15 text-white/80" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                >
                    ← <span className="hidden xs:inline">Volver</span>
                </button>

                <div className="flex items-center gap-1.5 truncate px-1">
                    <h1 className={`text-[13px] lg:text-[15px] font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                        Multiplicación de Fracciones
                    </h1>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isDark ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold"
                    }`}>
                        Nivel {level}
                    </span>
                </div>

                <button
                    onClick={() => setShowHelp(true)}
                    className={`flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg font-bold text-xs lg:text-sm active:scale-95 transition-all ${
                        isDark ? "bg-white/10 hover:bg-white/15 text-white/80" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                    title="Ayuda"
                >
                    ?
                </button>
            </header>

            {/* 2. Barra de niveles y operación superior (34-40px) */}
            <div className={`shrink-0 flex items-center justify-between gap-2 border-b px-2 lg:px-4 py-1 text-[11px] lg:text-xs ${
                isDark ? "border-white/5 bg-[#0d1424]" : "border-slate-300 bg-white shadow-xs"
            }`}>
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
                                    : (isDark ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"),
                            ].join(" ")}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {/* Ejercicio / Operación central */}
                <div className={`flex items-center px-2 py-0.5 rounded-lg border shrink-0 ${isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-300 shadow-xs"}`}>
                    <OpDisplay ex={exercise} />
                </div>

                {/* Etiqueta del nivel */}
                <div className={`text-[11px] font-medium truncate hidden md:inline ${isDark ? "text-white/40" : "text-slate-500 font-semibold"}`}>
                    {levelLabel(level)}
                </div>
            </div>

            {/* 3. Área de trabajo central (flex-1 min-h-0) */}
            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4 overflow-hidden relative">
                <div className={`w-full max-w-2xl border rounded-2xl p-2.5 sm:p-3 lg:p-4 flex flex-col justify-center gap-2 transition-all ${
                    isDark ? "bg-[#0d1424]/90 border-white/10 shadow-xl" : "bg-white border-slate-300 shadow-md"
                }`}>
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
            <footer className={`h-10 lg:h-12 shrink-0 border-t px-2 sm:px-3 lg:px-4 flex items-center justify-between gap-2 ${
                isDark ? "border-white/10 bg-[#0a0f1d]" : "border-slate-300 bg-white shadow-xs"
            }`}>
                {/* Feedback a la izquierda */}
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 text-xs">
                        {hintTone === "emerald" ? "🎉" : hintTone === "green" ? "✓" : "💡"}
                    </span>
                    <span className={[
                        "text-[10px] sm:text-[11px] lg:text-xs font-semibold truncate",
                        hintTone === "emerald" ? (isDark ? "text-emerald-400" : "text-emerald-700 font-bold") : hintTone === "green" ? (isDark ? "text-teal-300" : "text-teal-700 font-bold") : (isDark ? "text-amber-300" : "text-amber-800 font-bold"),
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
                                className={`h-7 px-2.5 lg:h-8 lg:px-3.5 rounded-lg font-bold text-[11px] lg:text-xs transition-all active:scale-95 ${
                                    isDark ? "bg-white/10 hover:bg-white/15 text-white/70" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold"
                                }`}
                            >
                                🎲 Nuevo
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowMath(true)}
                                className={`h-7 px-2.5 lg:h-8 lg:px-4 rounded-lg text-[11px] lg:text-xs font-bold border transition-all active:scale-95 ${
                                    isDark ? "bg-white/10 hover:bg-white/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 shadow-xs font-bold"
                                }`}
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
                    <div className={`w-full max-w-lg border rounded-2xl shadow-2xl p-4 flex flex-col max-h-[85vh] ${isDark ? "bg-[#0d1424] border-white/20 text-white" : "bg-white border-slate-300 text-slate-900"}`}>
                        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-white/10" : "border-slate-200"}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-base">📐</span>
                                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Pasos Matemáticos Detallados</h3>
                            </div>
                            <button
                                onClick={() => setShowMath(false)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                    isDark ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto py-4 pr-1 flex-1 min-h-0">
                            <MathWriting ex={exercise} />
                        </div>
                        <div className={`pt-3 border-t flex justify-end ${isDark ? "border-white/10" : "border-slate-200"}`}>
                            <button
                                onClick={() => setShowMath(false)}
                                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
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
                bgColor={isDark ? "#0d1424" : "#f8fafc"}
                titleColor={isDark ? "#f8fafc" : "#0f172a"}
                buttonColor="bg-indigo-600 hover:bg-indigo-500"
            >
                <div className={`text-xs sm:text-sm space-y-3 leading-relaxed ${isDark ? "text-white/80" : "text-slate-700"}`}>
                    <p>Resuelve multiplicaciones visualmente con barras, conjuntos y cuadrículas de área:</p>

                    <div className={`rounded-xl p-2.5 space-y-1 border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                        <p className={`font-bold ${isDark ? "text-teal-400" : "text-teal-700"}`}>1. Fracción × Entero (niveles 1-2)</p>
                        <p className={isDark ? "text-white/70" : "text-slate-600"}>
                            Usa <strong>+/−</strong> para crear la cantidad de grupos indicada por el entero. Cuando coincida, pulsa <strong className={isDark ? "text-teal-300" : "text-teal-700 font-bold"}>Juntar todo</strong> para sumar las partes.
                        </p>
                    </div>

                    <div className={`rounded-xl p-2.5 space-y-1 border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                        <p className={`font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}>2. Fracción de un Conjunto (niveles 3-4)</p>
                        <p className={isDark ? "text-white/70" : "text-slate-600"}>
                            Usa <strong>Dividir en</strong> para repartir las fichas en grupos según el denominador, y <strong>Tomar</strong> según el numerador.
                        </p>
                    </div>

                    <div className={`rounded-xl p-2.5 space-y-1 border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                        <p className={`font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>3. Fracción × Fracción (niveles 5-6)</p>
                        <p className={isDark ? "text-white/70" : "text-slate-600"}>
                            Ajusta <strong>Columnas</strong> y <strong>Filas</strong> según cada denominador. Las celdas donde se cruzan ambos colores representan el numerador del resultado.
                        </p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
