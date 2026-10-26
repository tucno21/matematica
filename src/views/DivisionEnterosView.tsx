import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "predict" | "build" | "flip" | "count" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
    groupIndex: number; // -1: unassigned, 0..absDivisor-1
}

interface ExerciseCase {
    id: string;
    label: string;
    equation: string;
    dividend: number; // Total fichas con signo
    divisor: number;  // Número de grupos con signo
    story: string;
    resultLabel: (v: number) => string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 42;

// Exactamente 3 casos pedagógicos para la regla de signos de la división
const PRESET_CASES: ExerciseCase[] = [
    {
        id: "c1",
        label: "Caso 1",
        equation: "(+6) ÷ (+2)",
        dividend: 6,
        divisor: 2,
        story: "Ganas s/6 en un juego y los repartes entre 2 amigos por igual. ¿Cuánto recibe cada uno?",
        resultLabel: (v) => `Cada amigo recibe s/${v} de ganancia.`,
    },
    {
        id: "c2",
        label: "Caso 2",
        equation: "(−6) ÷ (+2)",
        dividend: -6,
        divisor: 2,
        story: "Dos amigos perdieron juntos s/6 en un torneo en partes iguales. ¿Cuánto perdió cada uno?",
        resultLabel: (v) => `Cada amigo perdió s/${Math.abs(v)}.`,
    },
    {
        id: "c3",
        label: "Caso 3",
        equation: "(−6) ÷ (−2)",
        dividend: -6,
        divisor: -2,
        story: "Tienes una deuda de s/6 y pagas cuotas semanales de s/2. ¿En cuántas semanas se salda?",
        resultLabel: (v) => `Se necesitan ${v} cuotas para saldar la deuda.`,
    },
];

const RANDOM_BANK: Array<{ dividend: number; divisor: number; story: string; resultLabel: (v: number) => string }> = [
    {
        dividend: 8,
        divisor: 2,
        story: "Repartes 8 puntos a favor entre 2 equipos por igual.",
        resultLabel: (v) => `Cada equipo recibe ${v} puntos a favor.`,
    },
    {
        dividend: 8,
        divisor: -4,
        story: "Tienes 8 puntos ganados pero tienes 4 sanciones iguales por pagar.",
        resultLabel: (v) => `Pagas ${Math.abs(v)} puntos por sanción.`,
    },
    {
        dividend: -8,
        divisor: 4,
        story: "La temperatura descendió 8°C de manera constante en 4 horas.",
        resultLabel: (v) => `La temperatura bajó ${Math.abs(v)}°C cada hora.`,
    },
    {
        dividend: -8,
        divisor: -2,
        story: "Tienes una deuda de s/8 y descuentas s/2 por semana.",
        resultLabel: (v) => `Se cancela en ${v} semanas.`,
    },
];

const uid = () => Math.random().toString(36).slice(2, 9);

function pickRandomExercise(): ExerciseCase {
    const item = RANDOM_BANK[Math.floor(Math.random() * RANDOM_BANK.length)];
    const format = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);
    return {
        id: `rand-${Date.now()}`,
        label: "Aleatorio",
        equation: `${format(item.dividend)} ÷ ${format(item.divisor)}`,
        dividend: item.dividend,
        divisor: item.divisor,
        story: item.story,
        resultLabel: item.resultLabel,
    };
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const TOKEN = {
    blue: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/25",
        text: "text-blue-300",
        dot: "bg-blue-500",
        btn: "bg-blue-500 hover:bg-blue-400",
        chipGrad: "from-blue-400 to-blue-600",
        chipShadow: "shadow-blue-500/40",
        chipBorder: "border-blue-300/30",
        sign: "+1",
        particle: "#60a5fa",
    },
    red: {
        bg: "bg-red-500/10",
        border: "border-red-500/25",
        text: "text-red-300",
        dot: "bg-red-500",
        btn: "bg-red-500 hover:bg-red-400",
        chipGrad: "from-red-400 to-red-600",
        chipShadow: "shadow-red-500/40",
        chipBorder: "border-red-300/30",
        sign: "−1",
        particle: "#f87171",
    },
};

export default function DivisionEnterosView() {
    const navigate = useNavigate();

    // Estado del ejercicio actual
    const [currentCase, setCurrentCase] = useState<ExerciseCase>(PRESET_CASES[0]);
    const [activePreset, setActivePreset] = useState<string | null>("c1");

    const [phase, setPhase] = useState<Phase>("setup");

    // Predicción
    const [userPrediction, setUserPrediction] = useState<"positive" | "negative" | null>(null);
    const [predictionResult, setPredictionResult] = useState<"correct" | "wrong" | null>(null);

    // Fichas y columnas
    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [isFlippingAll, setIsFlippingAll] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ── Computed Values ───────────────────────────────────────────────────────
    const dividend = currentCase.dividend;
    const divisor = currentCase.divisor;
    const quotient = divisor !== 0 ? dividend / divisor : 0;

    const absDividend = Math.abs(dividend);
    const absDivisor = Math.max(1, Math.abs(divisor)); // Grupos a formar
    const absQuotient = Math.abs(quotient);            // Fichas por grupo

    const needFlip = divisor < 0;
    const signsSame = (dividend >= 0) === (divisor >= 0);
    const initialChipColor: ChipColor = dividend >= 0 ? "blue" : "red";

    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;

    const formatNum = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    const formatExpr = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);

    // ── Group Status & Validation ─────────────────────────────────────────────
    const chipsInGroup = useCallback(
        (groupIndex: number) => chips.filter((c) => c.groupIndex === groupIndex).length,
        [chips]
    );

    const allGroupsFormed = Array.from({ length: absDivisor }).every(
        (_, i) => chipsInGroup(i) === absQuotient
    );

    // ── Presets ───────────────────────────────────────────────────────────────
    const applyPreset = (preset: ExerciseCase) => {
        setCurrentCase(preset);
        setActivePreset(preset.id);
        setUserPrediction(null);
        setPredictionResult(null);
        setChips([]);
        setPhase("setup");
    };

    const handleRandomCase = useCallback(() => {
        const rand = pickRandomExercise();
        setCurrentCase(rand);
        setActivePreset(null);
        setUserPrediction(null);
        setPredictionResult(null);
        setChips([]);
        setPhase("setup");
    }, []);

    // ── Generar Fichas (Build) ────────────────────────────────────────────────
    useEffect(() => {
        if (phase === "build" && chips.length === 0) {
            const timer = setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? 480;
                const h = rect?.height ?? 300;

                const newChips: Chip[] = [];
                for (let i = 0; i < absDividend; i++) {
                    const spacing = Math.min(CHIP_SIZE + 6, (w - 24) / Math.max(1, absDividend));
                    const x = Math.max(8, Math.min(w - CHIP_SIZE - 8, 12 + i * spacing));
                    const y = Math.max(h * 0.72, Math.min(h - CHIP_SIZE - 6, h * 0.78));

                    newChips.push({
                        id: uid(),
                        color: initialChipColor,
                        x,
                        y,
                        exploding: false,
                        exploded: false,
                        groupIndex: -1,
                    });
                }
                setChips(newChips);
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [phase, absDividend, initialChipColor, chips.length]);

    // ── Auto-repartir equitativamente ─────────────────────────────────────────
    const handleAutoDistribute = () => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const w = rect.width;
        const colW = w / absDivisor;

        setChips((prev) => {
            const updated = [...prev];
            let chipIdx = 0;
            for (let g = 0; g < absDivisor; g++) {
                const colCenter = g * colW + colW / 2;
                for (let c = 0; c < absQuotient; c++) {
                    if (chipIdx < updated.length) {
                        const targetX = colCenter - CHIP_SIZE / 2;
                        const targetY = 32 + c * (CHIP_SIZE + 6);
                        updated[chipIdx] = {
                            ...updated[chipIdx],
                            x: targetX,
                            y: targetY,
                            groupIndex: g,
                        };
                        chipIdx++;
                    }
                }
            }
            return updated;
        });
    };

    // ── Drag & Drop Handlers ──────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "build") return;
        const chip = chips.find((c) => c.id === id);
        if (!chip || chip.exploded || chip.exploding) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;

        dragOffset.current = { x: e.clientX - rect.left - chip.x, y: e.clientY - rect.top - chip.y };
        setDraggingId(id);
    }, [chips, phase]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;

        setChips((prev) =>
            prev.map((c) =>
                c.id === draggingId
                    ? {
                        ...c,
                        x: Math.max(0, Math.min(rect.width - CHIP_SIZE, e.clientX - rect.left - dragOffset.current.x)),
                        y: Math.max(0, Math.min(rect.height - CHIP_SIZE, e.clientY - rect.top - dragOffset.current.y)),
                    }
                    : c
            )
        );
    }, [draggingId]);

    const handlePointerUp = useCallback(() => {
        if (!draggingId) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (rect) {
            const chip = chips.find((c) => c.id === draggingId);
            if (chip) {
                const colW = rect.width / absDivisor;
                if (chip.y < rect.height * 0.7) {
                    const targetGroup = Math.max(0, Math.min(absDivisor - 1, Math.floor(chip.x / colW)));
                    const chipsAlreadyInGroup = chips.filter(
                        (c) => c.id !== draggingId && c.groupIndex === targetGroup
                    ).length;

                    const snapX = targetGroup * colW + (colW - CHIP_SIZE) / 2;
                    const snapY = 32 + chipsAlreadyInGroup * (CHIP_SIZE + 6);

                    setChips((prev) =>
                        prev.map((c) =>
                            c.id === draggingId
                                ? { ...c, x: snapX, y: snapY, groupIndex: targetGroup }
                                : c
                        )
                    );
                } else {
                    setChips((prev) =>
                        prev.map((c) => (c.id === draggingId ? { ...c, groupIndex: -1 } : c))
                    );
                }
            }
        }
        setDraggingId(null);
    }, [draggingId, chips, absDivisor]);

    // ── Predict Handlers ──────────────────────────────────────────────────────
    const handlePredict = (prediction: "positive" | "negative") => {
        setUserPrediction(prediction);
        const correctSign = quotient >= 0 ? "positive" : "negative";
        if (prediction === correctSign) {
            setPredictionResult("correct");
        } else {
            setPredictionResult("wrong");
        }
    };

    // ── Flip Phase (Inversión cuando divisor < 0) ──────────────────────────────
    const handleFlipAll = async () => {
        setIsFlippingAll(true);
        const toFlip = chips.filter((c) => !c.exploded && !c.exploding);

        for (const chip of toFlip) {
            setFlippingIds((prev) => new Set(prev).add(chip.id));
            await new Promise((r) => setTimeout(r, 120));
            setChips((prev) =>
                prev.map((c) =>
                    c.id === chip.id ? { ...c, color: c.color === "blue" ? "red" : "blue" } : c
                )
            );
            await new Promise((r) => setTimeout(r, 60));
            setFlippingIds((prev) => {
                const n = new Set(prev);
                n.delete(chip.id);
                return n;
            });
            await new Promise((r) => setTimeout(r, 30));
        }
        setIsFlippingAll(false);
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setChips([]);
        setDraggingId(null);
        setFlippingIds(new Set());
        setUserPrediction(null);
        setPredictionResult(null);
        setPhase("setup");
    };

    const getResultText = () => {
        if (quotient === 0) return "Cero dividido entre cualquier número es 0.";
        if (quotient > 0)
            return `Cada grupo contiene ${absQuotient} fichas positivas. Signos iguales → resultado POSITIVO (+${quotient}).`;
        return `Cada grupo contiene ${absQuotient} fichas negativas. Signos distintos → resultado NEGATIVO (${quotient}).`;
    };

    const phaseLabels: Record<Phase, string> = {
        setup: "1. Planteo",
        predict: "2. Predicción",
        build: "3. Reparto",
        flip: "4. Invertir",
        count: "4. Conteo",
        result: "5. Resultado",
    };
    const phaseKeys: Phase[] = [
        "setup",
        "predict",
        "build",
        ...(needFlip ? (["flip"] as Phase[]) : []),
        "count",
        "result",
    ];

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <style>{`
                @keyframes explode {
                    0%   { transform: scale(1);   opacity: 1; }
                    45%  { transform: scale(1.6); opacity: 0.7; }
                    100% { transform: scale(0);   opacity: 0; }
                }
                .animate-explode { animation: explode 0.45s ease-out forwards; }
                @keyframes floatChip {
                    0%, 100% { transform: translateY(0) rotate(-3deg); }
                    50%      { transform: translateY(-6px) rotate(3deg); }
                }
                .animate-float { animation: floatChip 2.4s ease-in-out infinite; }
                @keyframes flipChip {
                    0%   { transform: scaleX(1) scale(1.05); }
                    50%  { transform: scaleX(0) scale(1.25); }
                    100% { transform: scaleX(1) scale(1); }
                }
                .animate-flip { animation: flipChip 0.36s ease-in-out; }
            `}</style>

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
                        División de Números Enteros
                    </h1>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="hidden xs:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-white/60">
                        {phaseKeys.map((p, idx) => (
                            <span
                                key={p}
                                className={`px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                                    phase === p ? "bg-teal-500/30 text-teal-300" : "opacity-40"
                                }`}
                            >
                                {idx + 1}
                            </span>
                        ))}
                        <span className="font-semibold ml-1 text-white/80">{phaseLabels[phase]}</span>
                    </div>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white active:scale-95 transition-all border border-white/10 font-bold text-xs"
                        title="Ayuda didáctica"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* 2. Barra de Casos de Aprendizaje (Exactamente 3 casos representativos) */}
            <div className="relative shrink-0 flex items-center justify-between gap-1.5 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline mr-1">
                        Casos clave:
                    </span>
                    {PRESET_CASES.map((preset) => {
                        const isSelected = activePreset === preset.id && phase === "setup";
                        return (
                            <button
                                key={preset.id}
                                onClick={() => applyPreset(preset)}
                                className={`px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all shrink-0 border ${
                                    isSelected
                                        ? "bg-teal-500/25 border-teal-400/50 text-teal-200 shadow-xs"
                                        : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                                title={preset.story}
                            >
                                {preset.label}: <span className="opacity-90">{preset.equation}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={handleRandomCase}
                        className="px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold bg-white/5 border border-white/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 transition-all shrink-0 active:scale-95"
                        title="Generar caso aleatorio"
                    >
                        🎲 Aleatorio
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <div className="flex items-center gap-1 text-[11px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <span className={dividend >= 0 ? "text-blue-400" : "text-red-400"}>
                            {formatExpr(dividend)}
                        </span>
                        <span className="text-white/40">÷</span>
                        <span className={divisor >= 0 ? "text-blue-400" : "text-red-400"}>
                            {formatExpr(divisor)}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Área Central de Trabajo (Fases) */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-1 sm:p-2 lg:p-3 overflow-hidden">
                {/* ── FASE 1: SETUP ── */}
                {phase === "setup" && (
                    <div className="w-full max-w-[620px] flex flex-col justify-center gap-2 lg:gap-3 flex-1 min-h-0">
                        {/* Concept pill */}
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-2.5 py-1 text-center shrink-0">
                            <p className="text-[11px] lg:text-xs text-teal-300 font-bold">
                                💡 Significado: Repartir {absDividend} fichas en {absDivisor} grupos iguales
                            </p>
                            <p className="text-[10px] text-white/50 leading-tight">
                                El <strong className="text-white">divisor</strong> define el número de grupos. El <strong className="text-teal-300">cociente</strong> es cuántas fichas recibe cada grupo.
                            </p>
                        </div>

                        {/* Story Card */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 shrink-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs">📖</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300/80">
                                    Situación en la vida real
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm text-white/90 leading-relaxed font-semibold">
                                {currentCase.story}
                            </p>
                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                <span className="text-white/40 text-[10px]">Expresión matemática:</span>
                                <div className="font-mono font-bold text-sm lg:text-base">
                                    <span className={dividend >= 0 ? "text-blue-400" : "text-red-400"}>
                                        {formatExpr(dividend)}
                                    </span>
                                    <span className="text-white/40 mx-1">÷</span>
                                    <span className={divisor >= 0 ? "text-blue-400" : "text-red-400"}>
                                        {formatExpr(divisor)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Two Columns Preview */}
                        <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                            <div className={`rounded-xl border ${dividend >= 0 ? TOKEN.blue.border : TOKEN.red.border} ${dividend >= 0 ? TOKEN.blue.bg : TOKEN.red.bg} p-2 text-center`}>
                                <span className="text-[10px] font-black uppercase text-white/60 block mb-0.5">
                                    Dividendo (Fichas Totales)
                                </span>
                                <span className={`text-xl lg:text-2xl font-black font-mono ${dividend >= 0 ? "text-blue-400" : "text-red-400"}`}>
                                    {formatExpr(dividend)}
                                </span>
                                <span className="text-[10px] text-white/40 block mt-0.5">
                                    {absDividend} ficha{absDividend > 1 ? "s" : ""} {dividend >= 0 ? "positivas" : "negativas"}
                                </span>
                            </div>

                            <div className={`rounded-xl border ${divisor >= 0 ? TOKEN.blue.border : TOKEN.red.border} ${divisor >= 0 ? TOKEN.blue.bg : TOKEN.red.bg} p-2 text-center`}>
                                <span className="text-[10px] font-black uppercase text-white/60 block mb-0.5">
                                    Divisor (Grupos)
                                </span>
                                <span className={`text-xl lg:text-2xl font-black font-mono ${divisor >= 0 ? "text-blue-400" : "text-red-400"}`}>
                                    {formatExpr(divisor)}
                                </span>
                                <span className="text-[10px] text-white/40 block mt-0.5">
                                    {absDivisor} grupo{absDivisor > 1 ? "s" : ""} {divisor < 0 ? "(invertirá signo)" : ""}
                                </span>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={() => setPhase("predict")}
                            className="w-full h-8 lg:h-9 rounded-xl text-xs lg:text-sm font-black bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 active:scale-98 transition-all cursor-pointer shrink-0"
                        >
                            Comenzar: Predecir el Signo →
                        </button>
                    </div>
                )}

                {/* ── FASE 2: PREDICT (Predicción Didáctica) ── */}
                {phase === "predict" && (
                    <div className="w-full max-w-[560px] flex flex-col justify-center gap-2.5 lg:gap-3.5 flex-1 min-h-0 text-center">
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-0.5">
                                ¿Qué signo tendrá el cociente?
                            </span>
                            <div className="flex items-center justify-center gap-1.5 font-mono font-bold text-lg lg:text-xl">
                                <span className={dividend >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(dividend)}
                                </span>
                                <span className="text-white/40">÷</span>
                                <span className={divisor >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(divisor)}
                                </span>
                                <span className="text-white/40">=</span>
                                <span className="text-amber-300 font-bold">?</span>
                            </div>
                        </div>

                        {predictionResult === null && (
                            <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                                <button
                                    onClick={() => handlePredict("positive")}
                                    className="p-3 lg:p-4 rounded-xl border-2 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 font-black transition-all active:scale-95 flex flex-col items-center gap-1 cursor-pointer"
                                >
                                    <span className="text-2xl">➕</span>
                                    <span className="text-xs lg:text-sm">POSITIVO (+)</span>
                                    <span className="text-[10px] text-blue-400/60 font-sans font-normal">Mayor que cero</span>
                                </button>
                                <button
                                    onClick={() => handlePredict("negative")}
                                    className="p-3 lg:p-4 rounded-xl border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400 text-red-300 font-black transition-all active:scale-95 flex flex-col items-center gap-1 cursor-pointer"
                                >
                                    <span className="text-2xl">➖</span>
                                    <span className="text-xs lg:text-sm">NEGATIVO (−)</span>
                                    <span className="text-[10px] text-red-400/60 font-sans font-normal">Menor que cero</span>
                                </button>
                            </div>
                        )}

                        {predictionResult !== null && (
                            <div className={`p-3 rounded-xl border shrink-0 ${predictionResult === "correct" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-amber-500/15 border-amber-500/30 text-amber-300"}`}>
                                <p className="font-black text-sm lg:text-base">
                                    {predictionResult === "correct" ? "🎉 ¡Predicción acertada!" : "🤔 ¡Buen intento!"}
                                </p>
                                <p className="text-xs text-white/80 mt-1">
                                    {signsSame
                                        ? "Signos iguales ((+)÷(+) o (−)÷(−)) siempre dan POSITIVO (+)."
                                        : "Signos distintos ((+)÷(−) o (−)÷(+)) siempre dan NEGATIVO (−)."}
                                </p>
                            </div>
                        )}

                        {predictionResult !== null && (
                            <button
                                onClick={() => setPhase("build")}
                                className="h-8 lg:h-9 rounded-xl text-xs lg:text-sm font-black bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                            >
                                Comprobar repartiendo con fichas →
                            </button>
                        )}
                    </div>
                )}

                {/* ── FASE 3: BUILD (Reparto Equitativo en Grupos) ── */}
                {phase === "build" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        {/* Progress Bar */}
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-xl shrink-0 mb-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <span className="text-white/60 text-[10px] font-bold">Reparto:</span>
                                <span className="font-mono text-teal-300 font-bold text-xs">
                                    {absDividend} fichas en {absDivisor} grupos ({absQuotient} por grupo)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${allGroupsFormed ? "text-emerald-400" : "text-amber-400"}`}>
                                    {allGroupsFormed ? "✅ ¡Reparto completo!" : "⏳ Fichas pendientes"}
                                </span>
                                <button
                                    onClick={handleAutoDistribute}
                                    className="h-6 px-2 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-md transition-all active:scale-95"
                                >
                                    Repartir equitativamente ⚡
                                </button>
                            </div>
                        </div>

                        {/* Interactive Drag Arena */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                        >
                            {/* Column Dividers */}
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: absDivisor }).map((_, i) => {
                                    const count = chipsInGroup(i);
                                    const isComplete = count === absQuotient;
                                    return (
                                        <div
                                            key={i}
                                            className={`flex-1 border-r border-white/10 last:border-r-0 flex flex-col justify-between p-1.5 ${
                                                isComplete ? "bg-emerald-500/[0.04]" : "bg-transparent"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                <span className="text-white/40">Grupo {i + 1}</span>
                                                <span className={isComplete ? "text-emerald-400" : "text-amber-400"}>
                                                    {count}/{absQuotient}
                                                </span>
                                            </div>
                                            <div className="border-t border-dashed border-white/10 pt-1 text-center">
                                                <span className="text-[9px] text-white/20">Grupo {i + 1}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Separator line for unassigned chips tray */}
                            <div className="absolute bottom-[28%] left-0 right-0 h-px bg-white/10 pointer-events-none" />
                            <div className="absolute bottom-1 right-2 pointer-events-none">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                                    Fichas a repartir
                                </span>
                            </div>

                            {/* Chips */}
                            {chips.map((chip) => {
                                const t = TOKEN[chip.color];
                                const isDragging = draggingId === chip.id;

                                return (
                                    <div
                                        key={chip.id}
                                        onPointerDown={(e) => handlePointerDown(e, chip.id)}
                                        className={`absolute select-none ${
                                            isDragging ? "scale-125 z-50 shadow-2xl cursor-grabbing" : "z-20 cursor-grab hover:scale-105"
                                        }`}
                                        style={{
                                            width: CHIP_SIZE,
                                            height: CHIP_SIZE,
                                            left: chip.x,
                                            top: chip.y,
                                            touchAction: "none",
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-md ${t.chipShadow} flex items-center justify-center`}
                                        >
                                            <span className="text-white font-black text-xs leading-none">
                                                {t.sign}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FASE 4: FLIP (Inversión cuando divisor < 0) ── */}
                {phase === "flip" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl shrink-0 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm">⚠️</span>
                                <p className="text-[11px] text-amber-200 truncate">
                                    El divisor <span className="font-bold text-amber-400">{formatExpr(divisor)}</span> es negativo: ¡las fichas se invierten al signo opuesto!
                                </p>
                            </div>
                            <button
                                disabled={isFlippingAll}
                                onClick={handleFlipAll}
                                className="h-6 px-2 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-md transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-xs"
                            >
                                {isFlippingAll ? "Invirtiendo…" : "Invertir todas 🔄"}
                            </button>
                        </div>

                        {/* Board */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                        >
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: absDivisor }).map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-white/10 last:border-r-0 p-1.5">
                                        <span className="text-[10px] font-bold text-white/30">Grupo {i + 1}</span>
                                    </div>
                                ))}
                            </div>

                            {chips.map((chip) => {
                                const t = TOKEN[chip.color];
                                const isFlipping = flippingIds.has(chip.id);

                                return (
                                    <div
                                        key={chip.id}
                                        className={`absolute select-none transition-transform duration-100 ${
                                            isFlipping ? "animate-flip z-30" : "z-10"
                                        }`}
                                        style={{
                                            width: CHIP_SIZE,
                                            height: CHIP_SIZE,
                                            left: chip.x,
                                            top: chip.y,
                                            touchAction: "none",
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-md ${t.chipShadow} flex items-center justify-center`}
                                        >
                                            <span className="text-white font-black text-xs leading-none">
                                                {t.sign}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FASE 5: COUNT (Conteo de 1 Grupo = Cociente) ── */}
                {phase === "count" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-xl shrink-0 mb-1 text-[11px]">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="font-bold text-blue-300 font-mono text-xs">{liveBlue}</span>
                                    <span className="text-white/40 text-[10px]">positivas</span>
                                </div>
                                <div className="w-px h-3 bg-white/10" />
                                <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <span className="font-bold text-red-300 font-mono text-xs">{liveRed}</span>
                                    <span className="text-white/40 text-[10px]">negativas</span>
                                </div>
                            </div>

                            <span className="text-teal-300 text-[10px] font-bold font-mono">
                                {absDivisor} grupos de {absQuotient} fichas → Cociente = {formatNum(quotient)}
                            </span>
                        </div>

                        {/* Board */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                        >
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: absDivisor }).map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-white/10 last:border-r-0 p-1.5">
                                        <span className="text-[10px] font-bold text-white/30">Grupo {i + 1}</span>
                                    </div>
                                ))}
                            </div>

                            {chips.map((chip) => {
                                const t = TOKEN[chip.color];
                                return (
                                    <div
                                        key={chip.id}
                                        className="absolute select-none z-10"
                                        style={{
                                            width: CHIP_SIZE,
                                            height: CHIP_SIZE,
                                            left: chip.x,
                                            top: chip.y,
                                            touchAction: "none",
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-md ${t.chipShadow} flex items-center justify-center`}
                                        >
                                            <span className="text-white font-black text-xs leading-none">
                                                {t.sign}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FASE 6: RESULTADO ── */}
                {phase === "result" && (
                    <div className="w-full max-w-[560px] flex flex-col items-center justify-center gap-2 lg:gap-3 flex-1 min-h-0 text-center py-1">
                        {/* Chips of 1 group representing quotient */}
                        <div className="flex flex-wrap justify-center gap-1.5 min-h-[36px] items-center max-w-sm">
                            {Array.from({ length: absQuotient }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-8 h-8 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-[11px] shadow-md animate-float ${
                                        quotient >= 0
                                            ? "from-blue-400 to-blue-600 shadow-blue-500/40"
                                            : "from-red-400 to-red-600 shadow-red-500/40"
                                    }`}
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                >
                                    {quotient >= 0 ? "+1" : "−1"}
                                </div>
                            ))}
                        </div>

                        {/* Result number */}
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-0.5">
                                Cociente (Fichas por grupo)
                            </span>
                            <div
                                className={`text-4xl lg:text-6xl font-black font-mono leading-none ${
                                    quotient > 0
                                        ? "text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]"
                                        : quotient < 0
                                        ? "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                                        : "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]"
                                }`}
                            >
                                {quotient > 0 ? `+${quotient}` : quotient}
                            </div>
                        </div>

                        {/* Feedback text badge */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-sm w-full">
                            <p
                                className={`font-bold text-xs ${
                                    quotient > 0 ? "text-blue-300" : quotient < 0 ? "text-red-300" : "text-slate-300"
                                }`}
                            >
                                {getResultText()}
                            </p>
                            {userPrediction && (
                                <p className="text-[10px] text-white/50 mt-0.5">
                                    Predicción: <span className="font-bold">{userPrediction === "positive" ? "Positivo (+)" : "Negativo (−)"}</span> {predictionResult === "correct" ? "🎯 (¡Acertaste!)" : "📚 (Revisa la regla abajo)"}
                                </p>
                            )}
                        </div>

                        {/* Meaning card */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 max-w-sm w-full">
                            <p className="text-indigo-300/60 text-[9px] font-black uppercase tracking-wider">
                                Conclusión del problema
                            </p>
                            <p className="font-bold text-xs text-white/90 mt-0.5">
                                {currentCase.resultLabel(quotient)}
                            </p>
                        </div>

                        {/* Law of signs rule card */}
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 max-w-sm w-full text-[11px] font-mono">
                            <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1 text-center font-sans">
                                Ley de Signos en la División
                            </div>
                            <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                                <span className={dividend >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(dividend)}
                                </span>
                                <span className="text-white/40">÷</span>
                                <span className={divisor >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(divisor)}
                                </span>
                                <span className="text-white/40">=</span>
                                <span
                                    className={
                                        quotient > 0
                                            ? "text-blue-400"
                                            : quotient < 0
                                            ? "text-red-400"
                                            : "text-slate-300"
                                    }
                                >
                                    {formatNum(quotient)}
                                </span>
                            </div>
                            <div className="text-[10px] text-teal-300 mt-1 text-center font-sans">
                                {signsSame ? "(+) ÷ (+) o (−) ÷ (−) = (+)" : "(+) ÷ (−) o (−) ÷ (+) = (−)"}
                            </div>
                        </div>

                        {/* New Exercise button */}
                        <button
                            onClick={handleReset}
                            className="h-8 lg:h-9 px-4 rounded-xl text-xs lg:text-sm font-black bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                            Nuevo Ejercicio 🔄
                        </button>
                    </div>
                )}
            </div>

            {/* 4. Barra Inferior de Acción y Feedback (40-48px) */}
            <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    {phase === "setup" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            Elige uno de los 3 casos pedagógicos de la barra superior.
                        </p>
                    )}
                    {phase === "predict" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            Predice si el resultado será positivo o negativo.
                        </p>
                    )}
                    {phase === "build" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            {allGroupsFormed
                                ? "¡Excelente! Cada grupo tiene exactamente las mismas fichas."
                                : "Arrastra las fichas para repartirlas equitativamente en los grupos."}
                        </p>
                    )}
                    {phase === "flip" && (
                        <p className="text-[10px] lg:text-[11px] text-amber-300/80 truncate">
                            Al ser divisor negativo, las fichas se invierten al signo opuesto.
                        </p>
                    )}
                    {phase === "count" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            Verificando cuántas fichas tiene cada grupo.
                        </p>
                    )}
                    {phase === "result" && (
                        <p className="text-[10px] lg:text-[11px] text-emerald-400/90 truncate font-semibold">
                            División completada exitosamente.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {phase === "setup" && (
                        <button
                            onClick={() => setPhase("predict")}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            Comenzar Reto →
                        </button>
                    )}

                    {phase === "predict" && predictionResult !== null && (
                        <button
                            onClick={() => setPhase("build")}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            Ir a repartir →
                        </button>
                    )}

                    {phase === "build" && (
                        <button
                            disabled={!allGroupsFormed}
                            onClick={() => setPhase(needFlip ? "flip" : "count")}
                            className={`h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg transition-all ${
                                allGroupsFormed
                                    ? "bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 shadow-sm"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                            }`}
                        >
                            {needFlip ? "Invertir signos →" : "Contar cociente →"}
                        </button>
                    )}

                    {phase === "flip" && (
                        <button
                            onClick={() => setPhase("count")}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            Siguiente: Conteo →
                        </button>
                    )}

                    {phase === "count" && (
                        <button
                            onClick={() => setPhase("result")}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            Ver Resultado ✅
                        </button>
                    )}

                    {phase === "result" && (
                        <button
                            onClick={handleReset}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            Nuevo Reto 🔄
                        </button>
                    )}
                </div>
            </footer>

            {/* Modal de Ayuda */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo dividir números enteros?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <div className="space-y-3 text-white/80 text-xs leading-relaxed">
                    <div className="rounded-lg p-2.5 bg-teal-500/10 border border-teal-500/20">
                        <p className="font-bold text-teal-300 mb-1">💡 La Ley de Signos en la División</p>
                        <ul className="space-y-1 font-mono text-teal-200">
                            <li>(+) ÷ (+) = (+) &nbsp;|&nbsp; (−) ÷ (−) = (+)  <span className="font-sans text-white/60">(Signos iguales dan positivo)</span></li>
                            <li>(+) ÷ (−) = (−) &nbsp;|&nbsp; (−) ÷ (+) = (−)  <span className="font-sans text-white/60">(Signos distintos dan negativo)</span></li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-bold text-white/40 uppercase tracking-wider text-[10px] mb-1">
                            Pasos del método interactivo:
                        </p>
                        <ol className="space-y-1.5 list-decimal list-inside text-white/70">
                            <li>
                                <strong className="text-white">1. Planteo:</strong> Conoce la situación real y la división planteada.
                            </li>
                            <li>
                                <strong className="text-white">2. Predicción:</strong> Intenta predecir si el cociente será positivo o negativo.
                            </li>
                            <li>
                                <strong className="text-white">3. Reparto:</strong> Distribuye las fichas en partes iguales en cada grupo.
                            </li>
                            <li>
                                <strong className="text-white">4. Invertir:</strong> Si el divisor es negativo, las fichas cambian de signo.
                            </li>
                            <li>
                                <strong className="text-white">5. Resultado:</strong> La cantidad de fichas en un solo grupo es el resultado.
                            </li>
                        </ol>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
