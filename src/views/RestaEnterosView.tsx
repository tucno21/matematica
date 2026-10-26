import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "flip" | "play" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
    isSubtrahend: boolean;
    flipped: boolean;
}

interface PresetCase {
    id: string;
    label: string;
    equation: string;
    minuend: { sign: "positive" | "negative"; count: number };
    subtrahend: { sign: "positive" | "negative"; count: number };
    description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 44;
const SNAP_DISTANCE = 62;

const PRESET_CASES: PresetCase[] = [
    {
        id: "c1",
        label: "Caso 1",
        equation: "(+5) − (+2)",
        minuend: { sign: "positive", count: 5 },
        subtrahend: { sign: "positive", count: 2 },
        description: "Resta directa: (+5) + (−2) = +3",
    },
    {
        id: "c2",
        label: "Caso 2",
        equation: "(+3) − (−2)",
        minuend: { sign: "positive", count: 3 },
        subtrahend: { sign: "negative", count: 2 },
        description: "Restar un negativo suma: (+3) + (+2) = +5",
    },
    {
        id: "c3",
        label: "Caso 3",
        equation: "(−3) − (+2)",
        minuend: { sign: "negative", count: 3 },
        subtrahend: { sign: "positive", count: 2 },
        description: "Acumular negativos: (−3) + (−2) = −5",
    },
    {
        id: "c4",
        label: "Caso 4",
        equation: "(−2) − (−5)",
        minuend: { sign: "negative", count: 2 },
        subtrahend: { sign: "negative", count: 5 },
        description: "Gana el opuesto positivo: (−2) + (+5) = +3",
    },
    {
        id: "c5",
        label: "Caso 5",
        equation: "(+4) − (+4)",
        minuend: { sign: "positive", count: 4 },
        subtrahend: { sign: "positive", count: 4 },
        description: "Resta de iguales: (+4) + (−4) = 0",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function buildSideChips(
    color: ChipColor,
    count: number,
    isSubtrahend: boolean,
    areaW: number,
    areaH: number
): Chip[] {
    if (count === 0) return [];
    const halfW = areaW / 2;
    const startX = isSubtrahend ? halfW : 0;
    const availableWidth = halfW;

    const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.3)));
    const cellW = Math.max(CHIP_SIZE + 8, (availableWidth - 8) / cols);
    const cellH = Math.max(CHIP_SIZE + 8, cellW);

    return Array.from({ length: count }, (_, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jx = (Math.random() - 0.5) * 8;
        const jy = (Math.random() - 0.5) * 8;

        const relativeX = 6 + col * cellW + cellW / 2 - CHIP_SIZE / 2 + jx;
        const absoluteX = startX + relativeX;
        const minX = startX + 4;
        const maxX = startX + availableWidth - CHIP_SIZE - 4;

        return {
            id: uid(),
            color,
            x: Math.max(minX, Math.min(maxX, absoluteX)),
            y: Math.max(4, Math.min(areaH - CHIP_SIZE - 4, row * cellH + cellH / 2 - CHIP_SIZE / 2 + jy)),
            exploding: false,
            exploded: false,
            isSubtrahend,
            flipped: false,
        };
    });
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

export default function RestaEnterosView() {
    const navigate = useNavigate();

    // Inputs setup
    const [minuendSign, setMinuendSign] = useState<"positive" | "negative">("positive");
    const [minuendValue, setMinuendValue] = useState<number>(5);
    const [subtrahendSign, setSubtrahendSign] = useState<"positive" | "negative">("positive");
    const [subtrahendValue, setSubtrahendValue] = useState<number>(2);

    const [activePreset, setActivePreset] = useState<string | null>("c1");

    // Phase management
    const [phase, setPhase] = useState<Phase>("setup");
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [autoCancelling, setAutoCancelling] = useState(false);
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [resultValue, setResultValue] = useState(0);
    const [showHelp, setShowHelp] = useState(false);

    const areaRef = useRef<HTMLDivElement>(null);

    // ── Computed Values ───────────────────────────────────────────────────────
    const minuendActual = minuendSign === "positive" ? minuendValue : -minuendValue;
    const subtrahendActual = subtrahendSign === "positive" ? subtrahendValue : -subtrahendValue;
    const oppositeOfSubtrahend = -subtrahendActual;

    const minuendColor: ChipColor = minuendActual >= 0 ? "blue" : "red";
    const subtrahendColor: ChipColor = subtrahendActual >= 0 ? "blue" : "red";

    const canGenerate = minuendValue > 0 || subtrahendValue > 0;

    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;
    const hasPairs = liveBlue > 0 && liveRed > 0;
    const remainingChips = chips.filter((c) => !c.exploded);

    const subtrahendChips = chips.filter((c) => c.isSubtrahend);
    const unflippedSubtrahendCount = subtrahendChips.filter((c) => !c.flipped).length;
    const allSubtrahendFlipped = subtrahendChips.length === 0 || unflippedSubtrahendCount === 0;

    const formatNum = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    const formatExpr = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);

    // ── Presets ───────────────────────────────────────────────────────────────
    const applyPreset = (preset: PresetCase) => {
        setMinuendSign(preset.minuend.sign);
        setMinuendValue(preset.minuend.count);
        setSubtrahendSign(preset.subtrahend.sign);
        setSubtrahendValue(preset.subtrahend.count);
        setActivePreset(preset.id);
    };

    const handleRandomCase = () => {
        const signs: ("positive" | "negative")[] = ["positive", "negative"];
        const mSign = signs[Math.floor(Math.random() * 2)];
        const sSign = signs[Math.floor(Math.random() * 2)];
        const mVal = Math.floor(Math.random() * 6) + 1;
        const sVal = Math.floor(Math.random() * 6) + 1;

        setMinuendSign(mSign);
        setMinuendValue(mVal);
        setSubtrahendSign(sSign);
        setSubtrahendValue(sVal);
        setActivePreset(null);
    };

    // ── Generate Fichas (Setup -> Flip) ───────────────────────────────────────
    const handleGenerate = () => {
        if (!canGenerate) return;
        setPhase("flip");
    };

    useEffect(() => {
        if (phase === "flip" && chips.length === 0 && (minuendValue > 0 || subtrahendValue > 0)) {
            const timer = setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? 480;
                const h = rect?.height ?? 300;

                const mChips = buildSideChips(minuendColor, Math.abs(minuendActual), false, w, h);
                const sChips = buildSideChips(subtrahendColor, Math.abs(subtrahendActual), true, w, h);
                setChips([...mChips, ...sChips]);
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [phase, minuendValue, subtrahendValue, minuendColor, subtrahendColor, minuendActual, subtrahendActual, chips.length]);

    // ── Flip single subtrahend chip ───────────────────────────────────────────
    const handleSingleFlip = useCallback((id: string) => {
        const chip = chips.find((c) => c.id === id);
        if (!chip || !chip.isSubtrahend || chip.flipped || chip.exploded) return;

        setFlippingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
            setChips((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, color: c.color === "blue" ? "red" : "blue", flipped: true } : c
                )
            );
            setTimeout(() => {
                setFlippingIds((prev) => {
                    const n = new Set(prev);
                    n.delete(id);
                    return n;
                });
            }, 180);
        }, 180);
    }, [chips]);

    // ── Flip all subtrahend chips ─────────────────────────────────────────────
    const handleFlipAll = async () => {
        const toFlip = chips.filter((c) => c.isSubtrahend && !c.flipped && !c.exploded);
        for (const chip of toFlip) {
            setFlippingIds((prev) => new Set(prev).add(chip.id));
            await new Promise((r) => setTimeout(r, 140));
            setChips((prev) =>
                prev.map((c) =>
                    c.id === chip.id ? { ...c, color: c.color === "blue" ? "red" : "blue", flipped: true } : c
                )
            );
            await new Promise((r) => setTimeout(r, 80));
            setFlippingIds((prev) => {
                const n = new Set(prev);
                n.delete(chip.id);
                return n;
            });
            await new Promise((r) => setTimeout(r, 40));
        }
    };

    // Auto transition to play phase when all are flipped
    useEffect(() => {
        if (phase === "flip" && allSubtrahendFlipped && chips.length > 0 && flippingIds.size === 0) {
            const timer = setTimeout(() => {
                setPhase("play");
            }, 450);
            return () => clearTimeout(timer);
        }
    }, [phase, allSubtrahendFlipped, chips.length, flippingIds.size]);

    // ── Pair explosion & drag in Play phase ────────────────────────────────────
    const explodePair = useCallback((id1: string, id2: string) => {
        setChips((prev) =>
            prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, exploding: true } : c))
        );
        setTimeout(() => {
            setChips((prev) =>
                prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, exploding: false, exploded: true } : c))
            );
        }, 420);
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "play") return;
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
        const dragged = chips.find((c) => c.id === draggingId);
        if (dragged) {
            const opposite = chips
                .filter((c) => c.id !== draggingId && c.color !== dragged.color && !c.exploded && !c.exploding)
                .map((c) => {
                    const dx = c.x + CHIP_SIZE / 2 - (dragged.x + CHIP_SIZE / 2);
                    const dy = c.y + CHIP_SIZE / 2 - (dragged.y + CHIP_SIZE / 2);
                    return { chip: c, dist: Math.sqrt(dx * dx + dy * dy) };
                })
                .sort((a, b) => a.dist - b.dist)[0];

            if (opposite && opposite.dist < SNAP_DISTANCE) {
                explodePair(draggingId, opposite.chip.id);
            }
        }
        setDraggingId(null);
    }, [draggingId, chips, explodePair]);

    // ── Auto cancel ───────────────────────────────────────────────────────────
    const handleAutoCancel = async () => {
        setAutoCancelling(true);
        const cur = chips.filter((c) => !c.exploded && !c.exploding);
        const blues = cur.filter((c) => c.color === "blue");
        const reds = cur.filter((c) => c.color === "red");
        for (let i = 0; i < Math.min(blues.length, reds.length); i++) {
            explodePair(blues[i].id, reds[i].id);
            await new Promise((r) => setTimeout(r, 320));
        }
        setAutoCancelling(false);
    };

    // ── Check game-end in Play phase ──────────────────────────────────────────
    useEffect(() => {
        if (phase !== "play" || chips.length === 0) return;
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        if (active.length === 0 && chips.every((c) => !c.exploding)) {
            const timer = setTimeout(() => {
                setResultValue(0);
                setPhase("result");
            }, 550);
            return () => clearTimeout(timer);
        }
    }, [chips, phase]);

    const handleShowResult = () => {
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        const b = active.filter((c) => c.color === "blue").length;
        const r = active.filter((c) => c.color === "red").length;
        setResultValue(b - r);
        setPhase("result");
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setChips([]);
        setDraggingId(null);
        setAutoCancelling(false);
        setFlippingIds(new Set());
        setPhase("setup");
    };

    const getResultText = () => {
        if (resultValue === 0) return "¡Equilibrio perfecto! Todos los pares se anularon y el resultado es 0.";
        if (resultValue > 0)
            return `Sobran ${resultValue} ficha${resultValue !== 1 ? "s" : ""} positiva${resultValue !== 1 ? "s" : ""}. El resultado es +${resultValue}.`;
        return `Sobran ${Math.abs(resultValue)} ficha${Math.abs(resultValue) !== 1 ? "s" : ""} negativa${Math.abs(resultValue) !== 1 ? "s" : ""}. El resultado es ${resultValue}.`;
    };

    const phaseLabels: Record<Phase, string> = {
        setup: "1. Planteo",
        flip: "2. Opuesto",
        play: "3. Anulación",
        result: "4. Resultado",
    };
    const phaseKeys: Phase[] = ["setup", "flip", "play", "result"];

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <style>{`
                @keyframes explode {
                    0%   { transform: scale(1);   opacity: 1; }
                    45%  { transform: scale(1.6); opacity: 0.7; }
                    100% { transform: scale(0);   opacity: 0; }
                }
                .animate-explode { animation: explode 0.45s ease-out forwards; }
                @keyframes particle {
                    0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0); opacity: 1; }
                    100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-40px); opacity: 0; }
                }
                .animate-particle { animation: particle 0.45s ease-out forwards; }
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
                        Resta de Números Enteros
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

            {/* 2. Barra de Casos de Aprendizaje (Pills de retos predefinidos) */}
            <div className="relative shrink-0 flex items-center justify-between gap-1.5 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline mr-1">
                        Casos:
                    </span>
                    {PRESET_CASES.map((preset) => {
                        const isSelected = activePreset === preset.id && phase === "setup";
                        return (
                            <button
                                key={preset.id}
                                onClick={() => {
                                    applyPreset(preset);
                                    if (phase !== "setup") handleReset();
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all shrink-0 border ${
                                    isSelected
                                        ? "bg-teal-500/25 border-teal-400/50 text-teal-200 shadow-xs"
                                        : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                                title={preset.description}
                            >
                                {preset.label}: <span className="opacity-90">{preset.equation}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => {
                            handleRandomCase();
                            if (phase !== "setup") handleReset();
                        }}
                        className="px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold bg-white/5 border border-white/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 transition-all shrink-0 active:scale-95"
                        title="Generar caso aleatorio"
                    >
                        🎲 Aleatorio
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {phase === "setup" && (
                        <div className="flex items-center gap-1 text-[11px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            <span className={minuendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                {formatExpr(minuendActual)}
                            </span>
                            <span className="text-white/40">−</span>
                            <span className={subtrahendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                {formatExpr(subtrahendActual)}
                            </span>
                        </div>
                    )}
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
                                💡 Regla pedagógica: <span className="underline font-black">Restar es sumar el opuesto</span>
                            </p>
                            <p className="text-[10px] text-white/50 leading-tight">
                                Transforma <span className="text-white font-mono">a − b</span> en <span className="text-teal-300 font-mono">a + (−b)</span> volteando las fichas del sustraendo.
                            </p>
                        </div>

                        {/* Two Columns Grid for Minuend and Subtrahend */}
                        <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                            {/* Minuendo */}
                            <div className={`rounded-xl border ${minuendSign === "positive" ? TOKEN.blue.border : TOKEN.red.border} ${minuendSign === "positive" ? TOKEN.blue.bg : TOKEN.red.bg} p-2 sm:p-2.5 flex flex-col justify-between`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${minuendSign === "positive" ? TOKEN.blue.dot : TOKEN.red.dot}`} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/70 truncate">
                                            Minuendo
                                        </span>
                                    </div>
                                    <div className="flex rounded-md border border-white/10 overflow-hidden shrink-0">
                                        <button
                                            onClick={() => { setMinuendSign("positive"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${minuendSign === "positive" ? "bg-blue-500/30 text-blue-300 font-bold" : "text-white/40"}`}
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => { setMinuendSign("negative"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${minuendSign === "negative" ? "bg-red-500/30 text-red-300 font-bold" : "text-white/40"}`}
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Dots */}
                                <div className="flex flex-wrap gap-1 min-h-[26px] items-center content-center py-1">
                                    {minuendValue === 0 ? (
                                        <span className="text-white/20 text-[10px] italic">0 fichas</span>
                                    ) : (
                                        Array.from({ length: minuendValue }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-linear-to-br ${minuendSign === "positive" ? TOKEN.blue.chipGrad : TOKEN.red.chipGrad} flex items-center justify-center shadow-xs`}
                                            >
                                                <span className="text-[8px] font-black leading-none">
                                                    {minuendSign === "positive" ? "+" : "−"}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                    <span className="text-[10px] text-white/50">Cantidad:</span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => { setMinuendValue((v) => Math.max(0, v - 1)); setActivePreset(null); }}
                                            disabled={minuendValue === 0}
                                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                        >
                                            −
                                        </button>
                                        <span className="w-5 text-center font-mono font-bold text-sm">
                                            {minuendValue}
                                        </span>
                                        <button
                                            onClick={() => { setMinuendValue((v) => Math.min(8, v + 1)); setActivePreset(null); }}
                                            disabled={minuendValue === 8}
                                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Sustraendo */}
                            <div className={`rounded-xl border ${subtrahendSign === "positive" ? TOKEN.blue.border : TOKEN.red.border} ${subtrahendSign === "positive" ? TOKEN.blue.bg : TOKEN.red.bg} p-2 sm:p-2.5 flex flex-col justify-between`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${subtrahendSign === "positive" ? TOKEN.blue.dot : TOKEN.red.dot}`} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 truncate">
                                            Sustraendo (S)
                                        </span>
                                    </div>
                                    <div className="flex rounded-md border border-white/10 overflow-hidden shrink-0">
                                        <button
                                            onClick={() => { setSubtrahendSign("positive"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${subtrahendSign === "positive" ? "bg-blue-500/30 text-blue-300 font-bold" : "text-white/40"}`}
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => { setSubtrahendSign("negative"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${subtrahendSign === "negative" ? "bg-red-500/30 text-red-300 font-bold" : "text-white/40"}`}
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Dots */}
                                <div className="flex flex-wrap gap-1 min-h-[26px] items-center content-center py-1">
                                    {subtrahendValue === 0 ? (
                                        <span className="text-white/20 text-[10px] italic">0 fichas</span>
                                    ) : (
                                        Array.from({ length: subtrahendValue }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-linear-to-br ${subtrahendSign === "positive" ? TOKEN.blue.chipGrad : TOKEN.red.chipGrad} flex items-center justify-center shadow-xs relative`}
                                            >
                                                <span className="text-[8px] font-black leading-none">
                                                    {subtrahendSign === "positive" ? "+" : "−"}
                                                </span>
                                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 text-[6px] text-amber-950 font-black flex items-center justify-center leading-none">
                                                    S
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                    <span className="text-[10px] text-white/50">Cantidad:</span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => { setSubtrahendValue((v) => Math.max(0, v - 1)); setActivePreset(null); }}
                                            disabled={subtrahendValue === 0}
                                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                        >
                                            −
                                        </button>
                                        <span className="w-5 text-center font-mono font-bold text-sm">
                                            {subtrahendValue}
                                        </span>
                                        <button
                                            onClick={() => { setSubtrahendValue((v) => Math.min(8, v + 1)); setActivePreset(null); }}
                                            disabled={subtrahendValue === 8}
                                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Equation summary card */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shrink-0">
                            <span className="text-white/40 text-[10px]">Operación:</span>
                            <div className="flex items-center gap-1 font-mono font-bold text-sm">
                                <span className={minuendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(minuendActual)}
                                </span>
                                <span className="text-white/40">−</span>
                                <span className={subtrahendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(subtrahendActual)}
                                </span>
                                <span className="text-white/40">→</span>
                                <span className="text-teal-300 font-bold">
                                    {formatExpr(minuendActual)} + {formatExpr(oppositeOfSubtrahend)}
                                </span>
                            </div>
                        </div>

                        {/* Big Generate Button */}
                        <button
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`w-full h-8 lg:h-9 rounded-xl text-xs lg:text-sm font-black transition-all shrink-0 ${
                                canGenerate
                                    ? "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 active:scale-98 cursor-pointer"
                                    : "bg-white/5 text-white/25 cursor-not-allowed"
                            }`}
                        >
                            Generar Fichas y Voltear Sustraendo ✨
                        </button>
                    </div>
                )}

                {/* ── FASE 2: FLIP (Opuesto del Sustraendo) ── */}
                {phase === "flip" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        {/* Top prompt bar */}
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl shrink-0 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm">🔄</span>
                                <p className="text-[11px] text-amber-200 truncate">
                                    Toca las fichas <span className="font-bold text-amber-400">[S]</span> para invertirlas a su opuesto aditivo
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                    Faltan: {unflippedSubtrahendCount}
                                </span>
                                {!allSubtrahendFlipped && (
                                    <button
                                        onClick={handleFlipAll}
                                        className="h-6 px-2 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-md transition-all active:scale-95 shadow-xs"
                                    >
                                        Voltear todas ⚡
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Zone Labels */}
                        <div className="grid grid-cols-2 gap-1.5 shrink-0 mb-1 text-[10px] font-bold uppercase tracking-wider text-center">
                            <div className="bg-blue-500/10 border border-blue-500/20 py-0.5 rounded-lg text-blue-300/80">
                                Minuendo (Conservar)
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 py-0.5 rounded-lg text-amber-300/80">
                                Sustraendo (Invertir al Opuesto)
                            </div>
                        </div>

                        {/* Interactive Board */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                        >
                            {/* Grid Dots */}
                            <div
                                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                style={{
                                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                                    backgroundSize: "24px 24px",
                                }}
                            />

                            {/* Center separator line */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2 pointer-events-none flex items-center justify-center">
                                <span className="bg-[#080c18] border border-white/10 px-1.5 py-0.5 rounded-full text-[10px] font-black text-white/40">
                                    −
                                </span>
                            </div>

                            {/* Chips */}
                            {chips.map((chip) => {
                                const t = TOKEN[chip.color];
                                const isFlipping = flippingIds.has(chip.id);
                                const isFlippable = chip.isSubtrahend && !chip.flipped;

                                return (
                                    <div
                                        key={chip.id}
                                        onClick={() => isFlippable && handleSingleFlip(chip.id)}
                                        className={`absolute select-none transition-transform duration-100 ${
                                            isFlipping ? "animate-flip z-30" : ""
                                        } ${isFlippable ? "cursor-pointer hover:scale-110 active:scale-95 z-20" : "z-10"}`}
                                        style={{
                                            width: CHIP_SIZE,
                                            height: CHIP_SIZE,
                                            left: chip.x,
                                            top: chip.y,
                                            touchAction: "none",
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-md ${t.chipShadow} flex items-center justify-center relative`}
                                        >
                                            <span className="text-white font-black text-xs leading-none">
                                                {t.sign}
                                            </span>
                                            {chip.isSubtrahend && !chip.flipped && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-amber-200 flex items-center justify-center shadow-xs">
                                                    <span className="text-[7px] font-black text-amber-950">S</span>
                                                </div>
                                            )}
                                            {chip.isSubtrahend && chip.flipped && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border border-emerald-200 flex items-center justify-center shadow-xs">
                                                    <span className="text-[7px] font-black text-emerald-950">✓</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FASE 3: PLAY (Anulación de Pares) ── */}
                {phase === "play" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        {/* Status bar */}
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

                            <div className="flex items-center gap-2">
                                {hasPairs ? (
                                    <span className="text-amber-400 text-[10px] font-bold">
                                        ⚡ {Math.min(liveBlue, liveRed)} par{Math.min(liveBlue, liveRed) > 1 ? "es" : ""} por anular
                                    </span>
                                ) : (
                                    <span className="text-emerald-400 text-[10px] font-bold">
                                        ✅ No quedan más pares
                                    </span>
                                )}
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
                            {/* Grid Dots */}
                            <div
                                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                style={{
                                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                                    backgroundSize: "24px 24px",
                                }}
                            />

                            {/* Chips */}
                            {chips.map((chip) => {
                                if (chip.exploded) return null;
                                const t = TOKEN[chip.color];
                                const isDragging = draggingId === chip.id;

                                return (
                                    <div
                                        key={chip.id}
                                        onPointerDown={(e) => handlePointerDown(e, chip.id)}
                                        className={`absolute select-none ${
                                            chip.exploding ? "animate-explode z-40" : ""
                                        } ${isDragging ? "scale-125 z-50 shadow-2xl cursor-grabbing" : "z-20 cursor-grab hover:scale-105"}`}
                                        style={{
                                            width: CHIP_SIZE,
                                            height: CHIP_SIZE,
                                            left: chip.x,
                                            top: chip.y,
                                            touchAction: "none",
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-md ${t.chipShadow} flex items-center justify-center relative`}
                                        >
                                            <span className="text-white font-black text-xs leading-none">
                                                {t.sign}
                                            </span>
                                        </div>
                                        {chip.exploding && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="absolute w-1.5 h-1.5 rounded-full animate-particle"
                                                        style={{
                                                            background: t.particle,
                                                            left: "50%",
                                                            top: "50%",
                                                            ["--angle" as string]: `${i * 45}deg`,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FASE 4: RESULTADO ── */}
                {phase === "result" && (
                    <div className="w-full max-w-[560px] flex flex-col items-center justify-center gap-2 lg:gap-3 flex-1 min-h-0 text-center py-1">
                        {/* Remaining chips row */}
                        <div className="flex flex-wrap justify-center gap-1.5 min-h-[36px] items-center max-w-sm">
                            {remainingChips.length === 0 ? (
                                <div className="text-3xl lg:text-4xl animate-bounce">⚖️</div>
                            ) : (
                                remainingChips.slice(0, 16).map((c, i) => (
                                    <div
                                        key={c.id}
                                        className={`w-8 h-8 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-[11px] shadow-md animate-float ${
                                            c.color === "blue"
                                                ? "from-blue-400 to-blue-600 shadow-blue-500/40"
                                                : "from-red-400 to-red-600 shadow-red-500/40"
                                        }`}
                                        style={{ animationDelay: `${i * 0.08}s` }}
                                    >
                                        {c.color === "blue" ? "+1" : "−1"}
                                    </div>
                                ))
                            )}
                            {remainingChips.length > 16 && (
                                <span className="text-white/40 text-xs font-bold font-mono">
                                    +{remainingChips.length - 16}
                                </span>
                            )}
                        </div>

                        {/* Result number */}
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-0.5">
                                Resultado Final
                            </span>
                            <div
                                className={`text-4xl lg:text-6xl font-black font-mono leading-none ${
                                    resultValue > 0
                                        ? "text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]"
                                        : resultValue < 0
                                        ? "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                                        : "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]"
                                }`}
                            >
                                {resultValue > 0 ? `+${resultValue}` : resultValue}
                            </div>
                        </div>

                        {/* Feedback text badge */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-sm w-full">
                            <p
                                className={`font-bold text-xs ${
                                    resultValue > 0
                                        ? "text-blue-300"
                                        : resultValue < 0
                                        ? "text-red-300"
                                        : "text-slate-300"
                                }`}
                            >
                                {getResultText()}
                            </p>
                        </div>

                        {/* Mathematical transformation recap */}
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 max-w-sm w-full text-[11px] font-mono">
                            <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1 text-center font-sans">
                                Transformación paso a paso
                            </div>
                            <div className="flex items-center justify-center gap-1.5 font-bold">
                                <span className={minuendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(minuendActual)}
                                </span>
                                <span className="text-white/40">−</span>
                                <span className={subtrahendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(subtrahendActual)}
                                </span>
                            </div>
                            <div className="text-[10px] text-teal-400/80 my-0.5 text-center font-sans">
                                ↓ sumar el opuesto del sustraendo
                            </div>
                            <div className="flex items-center justify-center gap-1.5 font-bold">
                                <span className={minuendActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(minuendActual)}
                                </span>
                                <span className="text-white/40">+</span>
                                <span className="text-teal-300">{formatExpr(oppositeOfSubtrahend)}</span>
                                <span className="text-white/40">=</span>
                                <span
                                    className={
                                        resultValue > 0
                                            ? "text-blue-400"
                                            : resultValue < 0
                                            ? "text-red-400"
                                            : "text-slate-300"
                                    }
                                >
                                    {formatNum(resultValue)}
                                </span>
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
                            Configura el minuendo y sustraendo o elige un caso de la barra superior.
                        </p>
                    )}
                    {phase === "flip" && (
                        <p className="text-[10px] lg:text-[11px] text-amber-300/80 truncate">
                            {allSubtrahendFlipped
                                ? "¡Listo! Todas las fichas del sustraendo fueron invertidas a su opuesto."
                                : "Voltea las fichas tocándolas una a una o presiona el botón."}
                        </p>
                    )}
                    {phase === "play" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            {hasPairs
                                ? "Arrastra una ficha azul sobre una roja (o viceversa) para anular el par."
                                : "¡Todos los pares fueron anulados!"}
                        </p>
                    )}
                    {phase === "result" && (
                        <p className="text-[10px] lg:text-[11px] text-emerald-400/90 truncate font-semibold">
                            Resta completada exitosamente.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {phase === "setup" && (
                        <button
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg transition-all ${
                                canGenerate
                                    ? "bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 shadow-sm"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                            }`}
                        >
                            Comenzar →
                        </button>
                    )}

                    {phase === "flip" && (
                        <button
                            onClick={() => setPhase("play")}
                            className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                        >
                            {allSubtrahendFlipped ? "Pasar a Anular →" : "Saltar volteo →"}
                        </button>
                    )}

                    {phase === "play" && (
                        <>
                            {hasPairs ? (
                                <button
                                    disabled={autoCancelling}
                                    onClick={handleAutoCancel}
                                    className="h-7 px-2.5 lg:h-8 lg:px-3.5 text-[11px] lg:text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {autoCancelling ? "Anulando…" : "⚡ Anular automáticamente"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleShowResult}
                                    className="h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 transition-all shadow-sm"
                                >
                                    Ver Resultado ✅
                                </button>
                            )}
                        </>
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
                title="¿Cómo restar números enteros?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <div className="space-y-3 text-white/80 text-xs leading-relaxed">
                    <div className="rounded-lg p-2.5 bg-teal-500/10 border border-teal-500/20">
                        <p className="font-bold text-teal-300 mb-1">💡 La Regla de Oro</p>
                        <p className="text-white/70">
                            Restar un número equivale a <strong>sumar su opuesto</strong>:
                            <br />
                            <span className="font-mono text-teal-200 text-sm font-bold">
                                a − b = a + (−b)
                            </span>
                        </p>
                    </div>

                    <div>
                        <p className="font-bold text-white/40 uppercase tracking-wider text-[10px] mb-1">
                            Pasos del método interactivo:
                        </p>
                        <ol className="space-y-1.5 list-decimal list-inside text-white/70">
                            <li>
                                <strong className="text-white">1. Planteo:</strong> Ingresa el minuendo y el sustraendo o escoge uno de los casos pedagógicos.
                            </li>
                            <li>
                                <strong className="text-white">2. Invertir al Opuesto:</strong> Toca cada ficha del sustraendo (con marca <span className="text-amber-400 font-bold">S</span>) para voltearla. Una ficha azul (+1) pasa a ser roja (−1) y viceversa.
                            </li>
                            <li>
                                <strong className="text-white">3. Anulación de Pares:</strong> Arrastra una ficha positiva (+1) sobre una negativa (−1). Ambas se anulan al formar un par cero.
                            </li>
                            <li>
                                <strong className="text-white">4. Resultado:</strong> Cuenta las fichas que sobrevivieron.
                            </li>
                        </ol>
                    </div>

                    <div className="rounded-lg p-2 bg-white/5 border border-white/10 text-[11px]">
                        <span className="font-bold text-white">Convención de colores:</span>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-blue-300 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Positivos (+1)
                            </span>
                            <span className="text-red-300 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Negativos (−1)
                            </span>
                            <span className="text-slate-300 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Cero (0)
                            </span>
                        </div>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
