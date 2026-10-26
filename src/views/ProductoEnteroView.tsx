import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "build" | "flip" | "count" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
    groupIndex: number; // -1: unassigned, 0..a-1: assigned group
}

interface PresetCase {
    id: string;
    label: string;
    equation: string;
    a: { sign: "positive" | "negative"; count: number };
    b: { sign: "positive" | "negative"; count: number };
    description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 42;

// Exactamente 3 casos pedagógicos representativos de la regla de signos
const PRESET_CASES: PresetCase[] = [
    {
        id: "c1",
        label: "Caso 1",
        equation: "(+3) × (−2)",
        a: { sign: "positive", count: 3 },
        b: { sign: "negative", count: 2 },
        description: "3 veces (−2): 3 grupos de 2 rojas = −6",
    },
    {
        id: "c2",
        label: "Caso 2",
        equation: "(−2) × (+3)",
        a: { sign: "negative", count: 2 },
        b: { sign: "positive", count: 3 },
        description: "−2 veces (+3): 2 grupos de 3 azules se invierten a rojas = −6",
    },
    {
        id: "c3",
        label: "Caso 3",
        equation: "(−2) × (−3)",
        a: { sign: "negative", count: 2 },
        b: { sign: "negative", count: 3 },
        description: "−2 veces (−3): 2 grupos de 3 rojas se invierten a azules = +6",
    },
];

const uid = () => Math.random().toString(36).slice(2, 9);

function generateRandomValues(): {
    aSign: "positive" | "negative";
    bSign: "positive" | "negative";
    aVal: number;
    bVal: number;
} {
    const signs: ("positive" | "negative")[] = ["positive", "negative"];
    return {
        aSign: signs[Math.floor(Math.random() * 2)],
        bSign: signs[Math.floor(Math.random() * 2)],
        aVal: Math.floor(Math.random() * 3) + 2,
        bVal: Math.floor(Math.random() * 3) + 2,
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

export default function ProductoEnteroView() {
    const navigate = useNavigate();

    // Inputs: a = número de grupos, b = cantidad por grupo
    const [aSign, setASign] = useState<"positive" | "negative">("positive");
    const [aValue, setAValue] = useState<number>(3);
    const [bSign, setBSign] = useState<"positive" | "negative">("negative");
    const [bValue, setBValue] = useState<number>(2);

    const [activePreset, setActivePreset] = useState<string | null>("c1");

    // Phase management
    const [phase, setPhase] = useState<Phase>("setup");
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [isFlippingAll, setIsFlippingAll] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const areaRef = useRef<HTMLDivElement>(null);

    // ── Computed Values ───────────────────────────────────────────────────────
    const aActual = aSign === "positive" ? aValue : -aValue;
    const bActual = bSign === "positive" ? bValue : -bValue;
    const numGroups = Math.max(1, Math.abs(aActual));
    const chipsPerGroup = Math.abs(bActual);
    const totalChips = numGroups * chipsPerGroup;
    const resultValue = aActual * bActual;
    const signsSame = (aActual >= 0) === (bActual >= 0);

    const initialChipColor: ChipColor = bActual >= 0 ? "blue" : "red";
    const canGenerate = aValue > 0 && bValue > 0;

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

    const allGroupsFormed = Array.from({ length: numGroups }).every(
        (_, i) => chipsInGroup(i) === chipsPerGroup
    );

    // ── Presets ───────────────────────────────────────────────────────────────
    const applyPreset = (preset: PresetCase) => {
        setASign(preset.a.sign);
        setAValue(preset.a.count);
        setBSign(preset.b.sign);
        setBValue(preset.b.count);
        setActivePreset(preset.id);
        if (phase !== "setup") handleReset();
    };

    const handleRandomCase = useCallback(() => {
        const rand = generateRandomValues();
        setASign(rand.aSign);
        setAValue(rand.aVal);
        setBSign(rand.bSign);
        setBValue(rand.bVal);
        setActivePreset(null);
        setChips([]);
        setDraggingId(null);
        setFlippingIds(new Set());
        setIsFlippingAll(false);
        setPhase("setup");
    }, []);

    // ── Generar Fichas (Setup -> Build) ───────────────────────────────────────
    const handleGenerate = () => {
        if (!canGenerate) return;
        setPhase("build");
    };

    useEffect(() => {
        if (phase === "build" && chips.length === 0 && canGenerate) {
            const timer = setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? 480;
                const h = rect?.height ?? 300;

                const newChips: Chip[] = [];
                for (let i = 0; i < totalChips; i++) {
                    const spacing = Math.min(CHIP_SIZE + 6, (w - 24) / Math.max(1, totalChips));
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
    }, [phase, canGenerate, totalChips, initialChipColor, chips.length]);

    // ── Auto-Agrupar Instantáneo ──────────────────────────────────────────────
    const handleAutoGroup = () => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const w = rect.width;
        const colW = w / numGroups;

        setChips((prev) => {
            const updated = [...prev];
            let chipIdx = 0;
            for (let g = 0; g < numGroups; g++) {
                const colCenter = g * colW + colW / 2;
                for (let c = 0; c < chipsPerGroup; c++) {
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

    // ── Drag & Drop Handlers (Touch & Mouse) ───────────────────────────────────
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
                const colW = rect.width / numGroups;
                // Si la ficha está en la zona superior de columnas (< 70% de altura)
                if (chip.y < rect.height * 0.7) {
                    const targetGroup = Math.max(0, Math.min(numGroups - 1, Math.floor(chip.x / colW)));
                    const chipsAlreadyInGroup = chips.filter(
                        (c) => c.id !== draggingId && c.groupIndex === targetGroup
                    ).length;

                    // Alinear centrada en la columna
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
                    // Queda en la bandeja sin grupo
                    setChips((prev) =>
                        prev.map((c) => (c.id === draggingId ? { ...c, groupIndex: -1 } : c))
                    );
                }
            }
        }
        setDraggingId(null);
    }, [draggingId, chips, numGroups]);

    // ── Flip Phase (Invertir al Opuesto cuando a < 0) ─────────────────────────
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

    // ── Avanzar desde Build ───────────────────────────────────────────────────
    const handleContinueFromBuild = () => {
        if (!allGroupsFormed) return;
        // Si el factor 'a' es negativo, se debe voltear; si es positivo, se cuenta directamente
        if (aActual < 0) {
            setPhase("flip");
        } else {
            setPhase("count");
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setChips([]);
        setDraggingId(null);
        setFlippingIds(new Set());
        setIsFlippingAll(false);
        setPhase("setup");
    };

    const getResultText = () => {
        if (resultValue === 0) return "Cero multiplicado por cualquier número es 0.";
        if (resultValue > 0)
            return `Obtuviste ${resultValue} fichas positivas. Signos iguales → resultado POSITIVO (+${resultValue}).`;
        return `Obtuviste ${Math.abs(resultValue)} fichas negativas. Signos distintos → resultado NEGATIVO (${resultValue}).`;
    };

    const phaseLabels: Record<Phase, string> = {
        setup: "1. Planteo",
        build: "2. Grupos",
        flip: "3. Invertir",
        count: "3. Conteo",
        result: "4. Resultado",
    };
    const phaseKeys: Phase[] = ["setup", "build", ...(aActual < 0 ? (["flip"] as Phase[]) : []), "count", "result"];

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
                        Multiplicación de Números Enteros
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

            {/* 2. Barra de Casos de Aprendizaje (Exactamente 3 casos pedagógicos) */}
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
                                title={preset.description}
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
                        <span className={aActual >= 0 ? "text-blue-400" : "text-red-400"}>
                            {formatExpr(aActual)}
                        </span>
                        <span className="text-white/40">×</span>
                        <span className={bActual >= 0 ? "text-blue-400" : "text-red-400"}>
                            {formatExpr(bActual)}
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
                                💡 Significado: <span className="underline font-black">{Math.abs(aActual)} veces el {formatExpr(bActual)}</span>
                            </p>
                            <p className="text-[10px] text-white/50 leading-tight">
                                El primer factor <span className="font-mono text-white font-bold">a</span> indica cuántos grupos formar. Si es negativo, los grupos se invierten al opuesto.
                            </p>
                        </div>

                        {/* Two Columns Grid for Factors a and b */}
                        <div className="grid grid-cols-2 gap-2 lg:gap-3 shrink-0">
                            {/* Factor a (Número de grupos) */}
                            <div className={`rounded-xl border ${aSign === "positive" ? TOKEN.blue.border : TOKEN.red.border} ${aSign === "positive" ? TOKEN.blue.bg : TOKEN.red.bg} p-2 sm:p-2.5 flex flex-col justify-between`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${aSign === "positive" ? TOKEN.blue.dot : TOKEN.red.dot}`} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/70 truncate">
                                            Factor a (Grupos)
                                        </span>
                                    </div>
                                    <div className="flex rounded-md border border-white/10 overflow-hidden shrink-0">
                                        <button
                                            onClick={() => { setASign("positive"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${aSign === "positive" ? "bg-blue-500/30 text-blue-300 font-bold" : "text-white/40"}`}
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => { setASign("negative"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${aSign === "negative" ? "bg-red-500/30 text-red-300 font-bold" : "text-white/40"}`}
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <span className="text-[10px] text-white/50 block">Número de grupos:</span>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => { setAValue((v) => Math.max(1, v - 1)); setActivePreset(null); }}
                                                disabled={aValue <= 1}
                                                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                            >
                                                −
                                            </button>
                                            <span className="w-5 text-center font-mono font-bold text-sm">
                                                {aValue}
                                            </span>
                                            <button
                                                onClick={() => { setAValue((v) => Math.min(5, v + 1)); setActivePreset(null); }}
                                                disabled={aValue >= 5}
                                                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/40">
                                            {aValue} grupo{aValue > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Factor b (Fichas por grupo) */}
                            <div className={`rounded-xl border ${bSign === "positive" ? TOKEN.blue.border : TOKEN.red.border} ${bSign === "positive" ? TOKEN.blue.bg : TOKEN.red.bg} p-2 sm:p-2.5 flex flex-col justify-between`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${bSign === "positive" ? TOKEN.blue.dot : TOKEN.red.dot}`} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/70 truncate">
                                            Factor b (Fichas)
                                        </span>
                                    </div>
                                    <div className="flex rounded-md border border-white/10 overflow-hidden shrink-0">
                                        <button
                                            onClick={() => { setBSign("positive"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${bSign === "positive" ? "bg-blue-500/30 text-blue-300 font-bold" : "text-white/40"}`}
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => { setBSign("negative"); setActivePreset(null); }}
                                            className={`px-1.5 py-0.5 text-[10px] font-black ${bSign === "negative" ? "bg-red-500/30 text-red-300 font-bold" : "text-white/40"}`}
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <span className="text-[10px] text-white/50 block">Fichas en cada grupo:</span>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => { setBValue((v) => Math.max(1, v - 1)); setActivePreset(null); }}
                                                disabled={bValue <= 1}
                                                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                            >
                                                −
                                            </button>
                                            <span className="w-5 text-center font-mono font-bold text-sm">
                                                {bValue}
                                            </span>
                                            <button
                                                onClick={() => { setBValue((v) => Math.min(5, v + 1)); setActivePreset(null); }}
                                                disabled={bValue >= 5}
                                                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-xs font-black flex items-center justify-center active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/40">
                                            {bValue} {bSign === "positive" ? "(+1)" : "(−1)"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Pill */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shrink-0">
                            <span className="text-white/40 text-[10px]">Total de fichas:</span>
                            <div className="flex items-center gap-2 font-mono font-bold text-xs lg:text-sm">
                                <span>{aValue} × {bValue} = <span className="text-amber-300">{totalChips} fichas</span></span>
                                <span className="text-white/30">|</span>
                                <span className="text-teal-300">{aActual < 0 ? "Se invertirán" : "Mantendrán su signo"}</span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`w-full h-8 lg:h-9 rounded-xl text-xs lg:text-sm font-black transition-all shrink-0 ${
                                canGenerate
                                    ? "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 active:scale-98 cursor-pointer"
                                    : "bg-white/5 text-white/25 cursor-not-allowed"
                            }`}
                        >
                            Comenzar Agrupación ✨
                        </button>
                    </div>
                )}

                {/* ── FASE 2: BUILD (Formar Grupos) ── */}
                {phase === "build" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        {/* Group Progress Bar */}
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-xl shrink-0 mb-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <span className="text-white/60 text-[10px] font-bold">Objetivo:</span>
                                <span className="font-mono text-teal-300 font-bold text-xs">
                                    {numGroups} grupos de {chipsPerGroup} fichas
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${allGroupsFormed ? "text-emerald-400" : "text-amber-400"}`}>
                                    {allGroupsFormed ? "✅ ¡Grupos completados!" : "⏳ Arrastra a las columnas"}
                                </span>
                                <button
                                    onClick={handleAutoGroup}
                                    className="h-6 px-2 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-md transition-all active:scale-95"
                                >
                                    Auto-agrupar ⚡
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
                            {/* Columns Dividers and Headings */}
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: numGroups }).map((_, i) => {
                                    const count = chipsInGroup(i);
                                    const isComplete = count === chipsPerGroup;
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
                                                    {count}/{chipsPerGroup}
                                                </span>
                                            </div>
                                            {/* Bottom tray border */}
                                            <div className="border-t border-dashed border-white/10 pt-1 text-center">
                                                <span className="text-[9px] text-white/20">Zona del grupo</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Separator line for unassigned chips tray at the bottom */}
                            <div className="absolute bottom-[28%] left-0 right-0 h-px bg-white/10 pointer-events-none" />
                            <div className="absolute bottom-1 right-2 pointer-events-none">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                                    Bandeja de fichas
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

                {/* ── FASE 3: FLIP (Inversión cuando a < 0) ── */}
                {phase === "flip" && (
                    <div className="w-full h-full flex flex-col min-h-0 relative">
                        <div className="flex items-center justify-between gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl shrink-0 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm">⚠️</span>
                                <p className="text-[11px] text-amber-200 truncate">
                                    El factor <span className="font-bold text-amber-400">a = {formatExpr(aActual)}</span> es negativo: ¡todas las fichas se invierten al signo opuesto!
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

                        {/* Interactive Board */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                        >
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: numGroups }).map((_, i) => (
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

                {/* ── FASE 4: COUNT (Conteo) ── */}
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
                                Total: {totalChips} fichas ({signsSame ? "POSITIVO" : "NEGATIVO"})
                            </span>
                        </div>

                        {/* Board */}
                        <div
                            ref={areaRef}
                            className="relative flex-1 min-h-0 w-full rounded-xl border border-white/10 bg-[#060a14] overflow-hidden"
                            style={{ touchAction: "none" }}
                        >
                            <div className="absolute inset-0 pointer-events-none flex">
                                {Array.from({ length: numGroups }).map((_, i) => (
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

                {/* ── FASE 5: RESULTADO ── */}
                {phase === "result" && (
                    <div className="w-full max-w-[560px] flex flex-col items-center justify-center gap-2 lg:gap-3 flex-1 min-h-0 text-center py-1">
                        {/* Remaining chips row */}
                        <div className="flex flex-wrap justify-center gap-1.5 min-h-[36px] items-center max-w-sm">
                            {chips.slice(0, 16).map((c, i) => (
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
                            ))}
                            {chips.length > 16 && (
                                <span className="text-white/40 text-xs font-bold font-mono">
                                    +{chips.length - 16}
                                </span>
                            )}
                        </div>

                        {/* Result number */}
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-0.5">
                                Resultado del Producto
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
                                    resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-slate-300"
                                }`}
                            >
                                {getResultText()}
                            </p>
                        </div>

                        {/* Law of signs rule card */}
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 max-w-sm w-full text-[11px] font-mono">
                            <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1 text-center font-sans">
                                Ley de Signos en la Multiplicación
                            </div>
                            <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                                <span className={aActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(aActual)}
                                </span>
                                <span className="text-white/40">×</span>
                                <span className={bActual >= 0 ? "text-blue-400" : "text-red-400"}>
                                    {formatExpr(bActual)}
                                </span>
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
                            <div className="text-[10px] text-teal-300 mt-1 text-center font-sans">
                                {signsSame ? "(+) × (+) o (−) × (−) = (+)" : "(+) × (−) o (−) × (+) = (−)"}
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
                            Elige uno de los 3 casos clave o ajusta los factores a y b.
                        </p>
                    )}
                    {phase === "build" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            {allGroupsFormed
                                ? "¡Excelente! Cada grupo tiene exactamente la cantidad correspondiente."
                                : "Arrastra las fichas de la bandeja inferior a cada grupo."}
                        </p>
                    )}
                    {phase === "flip" && (
                        <p className="text-[10px] lg:text-[11px] text-amber-300/80 truncate">
                            Al ser a negativo, las fichas se invierten al signo opuesto.
                        </p>
                    )}
                    {phase === "count" && (
                        <p className="text-[10px] lg:text-[11px] text-white/50 truncate">
                            Contando el total de fichas agrupadas.
                        </p>
                    )}
                    {phase === "result" && (
                        <p className="text-[10px] lg:text-[11px] text-emerald-400/90 truncate font-semibold">
                            Multiplicación completada exitosamente.
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

                    {phase === "build" && (
                        <button
                            disabled={!allGroupsFormed}
                            onClick={handleContinueFromBuild}
                            className={`h-7 px-3 lg:h-8 lg:px-4 text-[11px] lg:text-xs font-bold rounded-lg transition-all ${
                                allGroupsFormed
                                    ? "bg-teal-500 hover:bg-teal-400 text-teal-950 active:scale-95 shadow-sm"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                            }`}
                        >
                            {aActual < 0 ? "Invertir signos →" : "Contar fichas →"}
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
                title="¿Cómo multiplicar números enteros?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <div className="space-y-3 text-white/80 text-xs leading-relaxed">
                    <div className="rounded-lg p-2.5 bg-teal-500/10 border border-teal-500/20">
                        <p className="font-bold text-teal-300 mb-1">💡 La Ley de Signos</p>
                        <ul className="space-y-1 font-mono text-teal-200">
                            <li>(+) × (+) = (+) &nbsp;|&nbsp; (−) × (−) = (+)  <span className="font-sans text-white/60">(Signos iguales dan positivo)</span></li>
                            <li>(+) × (−) = (−) &nbsp;|&nbsp; (−) × (+) = (−)  <span className="font-sans text-white/60">(Signos distintos dan negativo)</span></li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-bold text-white/40 uppercase tracking-wider text-[10px] mb-1">
                            Pasos del método interactivo:
                        </p>
                        <ol className="space-y-1.5 list-decimal list-inside text-white/70">
                            <li>
                                <strong className="text-white">1. Planteo:</strong> Ingresa cuántos grupos formar (factor a) y cuántas fichas van en cada grupo (factor b).
                            </li>
                            <li>
                                <strong className="text-white">2. Formar Grupos:</strong> Arrastra las fichas de la bandeja inferior a cada columna. Puedes usar <strong className="text-amber-400">Auto-agrupar ⚡</strong>.
                            </li>
                            <li>
                                <strong className="text-white">3. Invertir:</strong> Si el factor a es negativo, todas las fichas se invierten al color opuesto.
                            </li>
                            <li>
                                <strong className="text-white">4. Conteo:</strong> Suma el total de fichas resultantes.
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
                        </div>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
