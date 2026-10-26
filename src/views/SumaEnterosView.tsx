import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "play" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
}

interface InputConfig {
    color: ChipColor;
    count: number;
}

interface PresetCase {
    id: string;
    label: string;
    equation: string;
    inputs: [InputConfig, InputConfig];
    description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 46;
const SNAP_DISTANCE = 64;

const PRESET_CASES: PresetCase[] = [
    {
        id: "c1",
        label: "Caso 1",
        equation: "(+4) + (−2)",
        inputs: [
            { color: "blue", count: 4 },
            { color: "red", count: 2 },
        ],
        description: "Signos distintos: sobran positivas",
    },
    {
        id: "c2",
        label: "Caso 2",
        equation: "(+3) + (−5)",
        inputs: [
            { color: "blue", count: 3 },
            { color: "red", count: 5 },
        ],
        description: "Signos distintos: sobran negativas",
    },
    {
        id: "c3",
        label: "Caso 3",
        equation: "(+4) + (−4)",
        inputs: [
            { color: "blue", count: 4 },
            { color: "red", count: 4 },
        ],
        description: "Opuestos aditivos: se cancelan todas = 0",
    },
    {
        id: "c4",
        label: "Caso 4",
        equation: "(+3) + (+2)",
        inputs: [
            { color: "blue", count: 3 },
            { color: "blue", count: 2 },
        ],
        description: "Mismo signo positivo: se acumulan",
    },
    {
        id: "c5",
        label: "Caso 5",
        equation: "(−3) + (−2)",
        inputs: [
            { color: "red", count: 3 },
            { color: "red", count: 2 },
        ],
        description: "Mismo signo negativo: se acumulan",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function buildChips(blue: number, red: number, areaW: number, areaH: number): Chip[] {
    const total = blue + red;
    if (total === 0) return [];
    const cols = Math.max(2, Math.ceil(Math.sqrt(total * 1.6)));
    const cellW = Math.max(CHIP_SIZE + 10, areaW / cols);
    const cellH = Math.max(CHIP_SIZE + 10, cellW);
    const colors: ChipColor[] = [...Array(blue).fill("blue"), ...Array(red).fill("red")];
    for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors.map((color, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jx = (Math.random() - 0.5) * 12;
        const jy = (Math.random() - 0.5) * 12;
        return {
            id: uid(),
            color,
            x: Math.max(4, Math.min(areaW - CHIP_SIZE - 4, col * cellW + cellW / 2 - CHIP_SIZE / 2 + jx)),
            y: Math.max(4, Math.min(areaH - CHIP_SIZE - 4, row * cellH + cellH / 2 - CHIP_SIZE / 2 + jy)),
            exploding: false,
            exploded: false,
        };
    });
}

function calcResult(inputs: InputConfig[]) {
    let blue = 0,
        red = 0;
    for (const inp of inputs) {
        if (inp.color === "blue") blue += inp.count;
        else red += inp.count;
    }
    return { blue, red, value: blue - red };
}

// ─── Design tokens per color ──────────────────────────────────────────────────
const TOKEN = {
    blue: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/25",
        borderSel: "border-blue-400/70",
        ringBg: "bg-blue-500/20",
        text: "text-blue-300",
        dot: "bg-blue-500",
        glow: "shadow-blue-500/30",
        btn: "bg-blue-500 hover:bg-blue-400",
        chipGrad: "from-blue-400 to-blue-600",
        chipShadow: "shadow-blue-500/40",
        chipBorder: "border-blue-300/30",
        label: "Positivas (+1)",
        sign: "+1",
        particle: "#60a5fa",
    },
    red: {
        bg: "bg-red-500/10",
        border: "border-red-500/25",
        borderSel: "border-red-400/70",
        ringBg: "bg-red-500/20",
        text: "text-red-300",
        dot: "bg-red-500",
        glow: "shadow-red-500/30",
        btn: "bg-red-500 hover:bg-red-400",
        chipGrad: "from-red-400 to-red-600",
        chipShadow: "shadow-red-500/40",
        chipBorder: "border-red-300/30",
        label: "Negativas (−1)",
        sign: "−1",
        particle: "#f87171",
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorToggle({ selected, onChange }: { selected: ChipColor; onChange: (c: ChipColor) => void }) {
    return (
        <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
            {(["blue", "red"] as ChipColor[]).map((c) => {
                const t = TOKEN[c];
                const active = selected === c;
                return (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold transition-all duration-150 ${
                            active ? `${t.ringBg} ${t.text}` : "bg-transparent text-white/35 hover:text-white/55"
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${active ? t.dot : "bg-white/20"}`} />
                        {c === "blue" ? "+1" : "−1"}
                    </button>
                );
            })}
        </div>
    );
}

function InputCard({
    index,
    config,
    onChange,
}: {
    index: number;
    config: InputConfig;
    onChange: (u: InputConfig) => void;
}) {
    const t = TOKEN[config.color];
    return (
        <div className={`rounded-xl border ${t.border} ${t.bg} p-2 sm:p-2.5 flex flex-col justify-between gap-1 transition-all`}>
            {/* Fila 1: Título Grupo + Toggle de signo */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${t.dot}`} />
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                        Grupo {index + 1}
                    </span>
                </div>
                <ColorToggle selected={config.color} onChange={(c) => onChange({ ...config, color: c })} />
            </div>

            {/* Fila 2: Mini fichas visuales + Contador */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 flex-1 min-h-[22px] content-center">
                    {config.count === 0 ? (
                        <span className="text-white/20 text-[10px] italic">Sin fichas</span>
                    ) : (
                        Array.from({ length: Math.min(config.count, 8) }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-4 h-4 rounded-full bg-linear-to-br ${t.chipGrad} flex items-center justify-center shadow-xs`}
                            >
                                <span className="text-white text-[7px] font-black leading-none">
                                    {config.color === "blue" ? "+" : "−"}
                                </span>
                            </div>
                        ))
                    )}
                    {config.count > 8 && (
                        <span className={`text-[10px] font-bold ${t.text} opacity-70`}>+{config.count - 8}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        className={`w-7 h-7 rounded-lg ${t.btn} active:scale-90 text-white text-base font-black shadow flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onChange({ ...config, count: Math.max(0, config.count - 1) })}
                        disabled={config.count === 0}
                    >
                        −
                    </button>
                    <span className={`w-6 text-center text-lg font-black tabular-nums ${t.text}`}>
                        {config.count}
                    </span>
                    <button
                        className={`w-7 h-7 rounded-lg ${t.btn} active:scale-90 text-white text-base font-black shadow flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onChange({ ...config, count: Math.min(10, config.count + 1) })}
                        disabled={config.count === 10}
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChipEl({
    chip,
    dragging,
    onPointerDown,
}: {
    chip: Chip;
    dragging: boolean;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
}) {
    if (chip.exploded) return null;
    const t = TOKEN[chip.color];
    return (
        <div
            className={`absolute select-none transition-transform duration-75 ${
                chip.exploding ? "animate-explode" : ""
            } ${dragging ? "scale-125 z-50" : "z-10 hover:scale-110 cursor-grab active:cursor-grabbing"}`}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: chip.x, top: chip.y, touchAction: "none" }}
            onPointerDown={(e) => onPointerDown(e, chip.id)}
        >
            <div
                className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-lg ${t.chipShadow} flex items-center justify-center`}
            >
                <span className="text-white font-black text-sm leading-none select-none">{t.sign}</span>
            </div>
            {chip.exploding && <ExplosionParticles color={chip.color} />}
        </div>
    );
}

function ExplosionParticles({ color }: { color: ChipColor }) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }, (_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-particle"
                    style={
                        {
                            background: TOKEN[color].particle,
                            left: "50%",
                            top: "50%",
                            "--angle": `${i * 45}deg`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function SumaEnterosView(): React.ReactElement {
    const navigate = useNavigate();

    const [inputs, setInputs] = useState<InputConfig[]>([
        { color: "blue", count: 4 },
        { color: "red", count: 2 },
    ]);
    const [phase, setPhase] = useState<Phase>("setup");

    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [autoCancelling, setAutoCancelling] = useState(false);

    const [resultValue, setResultValue] = useState(0);
    const [snapshotInputs, setSnapshotInputs] = useState<InputConfig[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const canGenerate = inputs.some((i) => i.count > 0);
    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;
    const hasPairs = liveBlue > 0 && liveRed > 0;
    const remainingChips = chips.filter((c) => !c.exploded);
    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";

    // ── Setup Actions ─────────────────────────────────────────────────────────
    const updateInput = (i: number, updated: InputConfig) =>
        setInputs((prev) => prev.map((inp, idx) => (idx === i ? updated : inp)));

    const applyPreset = (preset: PresetCase) => {
        setInputs([{ ...preset.inputs[0] }, { ...preset.inputs[1] }]);
    };

    const applyRandom = () => {
        const b = Math.floor(Math.random() * 5) + 1;
        const r = Math.floor(Math.random() * 5) + 1;
        const isMixed = Math.random() > 0.3;
        const colors: ChipColor[] = isMixed
            ? ["blue", "red"]
            : Math.random() > 0.5
            ? ["blue", "blue"]
            : ["red", "red"];
        setInputs([
            { color: colors[0], count: b },
            { color: colors[1], count: r },
        ]);
    };

    const handleGenerate = () => {
        const { blue, red } = calcResult(inputs);
        const rect = areaRef.current?.getBoundingClientRect();
        const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
        const h = rect?.height ?? Math.max(260, window.innerHeight - 200);
        setSnapshotInputs([...inputs]);
        setChips(buildChips(blue, red, w, h));
        setPhase("play");
    };

    // ── Game-end detection ─────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "play" || chips.length === 0) return;
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        const b = active.filter((c) => c.color === "blue").length;
        const r = active.filter((c) => c.color === "red").length;
        if (b + r === 0 && chips.every((c) => !c.exploding)) {
            const t = setTimeout(() => {
                setResultValue(0);
                setPhase("result");
            }, 600);
            return () => clearTimeout(t);
        }
    }, [chips, phase]);

    // ── Show results ──────────────────────────────────────────────────────────
    const handleShowResult = () => {
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        const b = active.filter((c) => c.color === "blue").length;
        const r = active.filter((c) => c.color === "red").length;
        setResultValue(b - r);
        setPhase("result");
    };

    // ── Drag & Cancellation ───────────────────────────────────────────────────
    const handlePointerDown = useCallback(
        (e: React.PointerEvent, id: string) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const chip = chips.find((c) => c.id === id);
            if (!chip || chip.exploded || chip.exploding) return;
            const rect = areaRef.current?.getBoundingClientRect();
            if (!rect) return;
            dragOffset.current = { x: e.clientX - rect.left - chip.x, y: e.clientY - rect.top - chip.y };
            setDraggingId(id);
        },
        [chips],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
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
                        : c,
                ),
            );
        },
        [draggingId],
    );

    const explodePair = useCallback((id1: string, id2: string) => {
        setChips((prev) => prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, exploding: true } : c)));
        setTimeout(() => {
            setChips((prev) => prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, exploding: false, exploded: true } : c)));
        }, 480);
    }, []);

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
            if (opposite && opposite.dist < SNAP_DISTANCE) explodePair(draggingId, opposite.chip.id);
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
            await new Promise((r) => setTimeout(r, 340));
        }
        setAutoCancelling(false);
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setInputs([
            { color: "blue", count: 4 },
            { color: "red", count: 2 },
        ]);
        setChips([]);
        setDraggingId(null);
        setAutoCancelling(false);
        setPhase("setup");
    };

    // ── Result text ───────────────────────────────────────────────────────────
    const getResultText = () => {
        if (resultValue === 0) return "¡Los pares se cancelaron perfectamente! El resultado es cero (0).";
        if (resultValue > 0)
            return `Sobran ${resultValue} ficha${resultValue !== 1 ? "s" : ""} positiva${
                resultValue !== 1 ? "s" : ""
            }. El resultado es +${resultValue}.`;
        return `Sobran ${Math.abs(resultValue)} ficha${Math.abs(resultValue) !== 1 ? "s" : ""} negativa${
            Math.abs(resultValue) !== 1 ? "s" : ""
        }. El resultado es ${resultValue}.`;
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none font-sans">
            <style>{`
        @keyframes explode {
          0%   { transform: scale(1); opacity: 1; }
          45%  { transform: scale(1.6); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-explode { animation: explode 0.48s ease-out forwards; }

        @keyframes particle {
          0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0); opacity: 1; }
          100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-40px); opacity: 0; }
        }
        .animate-particle { animation: particle 0.48s ease-out forwards; }

        @keyframes floatChip {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-6px) rotate(3deg); }
        }
        .animate-float { animation: floatChip 2.4s ease-in-out infinite; }
      `}</style>

            {/* ── 1. Header (36-44px) ── */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d] z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white text-[11px] lg:text-xs font-semibold transition-all flex items-center gap-1 border border-white/10"
                    title="Volver"
                >
                    <span>←</span>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="flex items-center gap-2">
                    <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-white leading-tight">
                        Suma de Enteros
                    </h1>
                    <span className="text-[10px] text-white/40 hidden md:inline">· Cancelación con fichas</span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {(["setup", "play", "result"] as Phase[]).map((p, i) => (
                        <div
                            key={p}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                phase === p
                                    ? "w-4 sm:w-5 bg-indigo-400"
                                    : ["setup", "play", "result"].indexOf(phase) > i
                                    ? "w-2 bg-white/30"
                                    : "w-2 bg-white/10"
                            }`}
                        />
                    ))}
                    <button
                        onClick={() => setShowHelp(true)}
                        className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold flex items-center justify-center hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                        title="Ayuda"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* ── 2. Área Central (Cero Scroll en tablet y desktop) ── */}

            {/* ═══════════════════════════════════════════════════════════════════
          FASE 1: SETUP (Configuración y Casos de Estudio)
      ═══════════════════════════════════════════════════════════════════ */}
            {phase === "setup" && (
                <main className="flex-1 min-h-0 flex flex-col justify-between p-2 sm:p-4 max-w-[680px] w-full mx-auto overflow-hidden">
                    {/* Barra de Casos de Estudio para Resolver */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest shrink-0">
                            Casos:
                        </span>
                        {PRESET_CASES.map((preset) => {
                            const isSelected =
                                inputs[0]?.color === preset.inputs[0].color &&
                                inputs[0]?.count === preset.inputs[0].count &&
                                inputs[1]?.color === preset.inputs[1].color &&
                                inputs[1]?.count === preset.inputs[1].count;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 border ${
                                        isSelected
                                            ? "bg-indigo-600/90 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400"
                                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                                    title={preset.description}
                                >
                                    <span className="text-white/40 mr-1">{preset.label}:</span>
                                    <span>{preset.equation}</span>
                                </button>
                            );
                        })}
                        <button
                            onClick={applyRandom}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 active:scale-95"
                            title="Generar caso aleatorio"
                        >
                            🎲 Aleatorio
                        </button>
                    </div>

                    {/* Explicación didáctica compacta */}
                    <p className="text-white/45 text-[11px] sm:text-xs text-center leading-snug">
                        Azul = <strong className="text-blue-400">+1</strong> · Rojo ={" "}
                        <strong className="text-red-400">−1</strong> · Al juntar un par <span className="text-blue-400">+1</span> y{" "}
                        <span className="text-red-400">−1</span> se cancelan (suman 0).
                    </p>

                    {/* Tarjetas de Entrada de Grupos (en 2 columnas compactas) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 my-auto">
                        {inputs.map((inp, i) => (
                            <InputCard key={i} index={i} config={inp} onChange={(u) => updateInput(i, u)} />
                        ))}
                    </div>

                    {/* Vista previa de la operación */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            Operación:
                        </span>
                        <div className="flex items-center gap-1.5 text-base sm:text-lg font-black font-mono">
                            {canGenerate ? (
                                inputs
                                    .filter((i) => i.count > 0)
                                    .map((p, i) => (
                                        <span key={i} className="flex items-center gap-1.5">
                                            {i > 0 && <span className="text-white/30 text-sm font-sans">+</span>}
                                            <span className={p.color === "blue" ? "text-blue-300" : "text-red-300"}>
                                                {p.color === "blue" ? `(+${p.count})` : `(−${p.count})`}
                                            </span>
                                        </span>
                                    ))
                            ) : (
                                <span className="text-white/20 text-xs font-sans">Elige fichas para comenzar</span>
                            )}
                        </div>
                    </div>

                    {/* Botón Principal: Generar Fichas */}
                    <button
                        disabled={!canGenerate}
                        onClick={handleGenerate}
                        className={`w-full py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-black transition-all duration-200 shrink-0 ${
                            canGenerate
                                ? "bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                    >
                        Generar Fichas ✨
                    </button>
                </main>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
          FASE 2: PLAY (Mesa interactiva de cancelación)
      ═══════════════════════════════════════════════════════════════════ */}
            {phase === "play" && (
                <main className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 gap-2 overflow-hidden">
                    {/* Barra de conteo en vivo */}
                    <div className="flex items-center justify-between gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs shrink-0" />
                            <span className="text-blue-300 font-black text-sm sm:text-base tabular-nums">{liveBlue}</span>
                            <span className="text-white/40 text-[11px] hidden sm:inline">positivas</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs shrink-0" />
                            <span className="text-red-300 font-black text-sm sm:text-base tabular-nums">{liveRed}</span>
                            <span className="text-white/40 text-[11px] hidden sm:inline">negativas</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-white/40 text-[11px]">
                            Total: <strong className="text-white/70">{liveBlue + liveRed}</strong>
                        </span>
                        {hasPairs && (
                            <>
                                <div className="w-px h-3 bg-white/10" />
                                <span className="text-amber-400 font-bold text-[11px]">
                                    {Math.min(liveBlue, liveRed)} par{Math.min(liveBlue, liveRed) !== 1 ? "es" : ""}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Mesa interactiva para arrastrar fichas */}
                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                                backgroundSize: "24px 24px",
                            }}
                        />

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                dragging={draggingId === chip.id}
                                onPointerDown={handlePointerDown}
                            />
                        ))}

                        {!hasPairs && liveBlue + liveRed > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-white/10 shadow-xl">
                                    <p className="text-white font-bold text-xs sm:text-sm">✅ No quedan más pares</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">Pulsa para ver el resultado</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botón de acción inferior */}
                    <div className="flex items-center gap-2 shrink-0">
                        <p className="text-white/30 text-[10px] hidden sm:block truncate flex-1">
                            Arrastra +1 sobre −1 para cancelarlos
                        </p>
                        <button
                            disabled={hasPairs ? autoCancelling : false}
                            onClick={hasPairs ? handleAutoCancel : handleShowResult}
                            className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-md active:scale-95 ${
                                hasPairs && !autoCancelling
                                    ? "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-white"
                                    : "bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 text-white"
                            }`}
                        >
                            {hasPairs
                                ? autoCancelling
                                    ? "⚡ Cancelando pares…"
                                    : "⚡ Cancelar todos los pares"
                                : "✅ Ver resultado final"}
                        </button>
                    </div>
                </main>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
          FASE 3: RESULT (Resultado final y explicación)
      ═══════════════════════════════════════════════════════════════════ */}
            {phase === "result" && (
                <main className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-4 p-3 max-w-[500px] w-full mx-auto overflow-hidden">
                    {/* Fichas sobrantes animadas */}
                    <div className="flex flex-wrap justify-center gap-2 min-h-[44px] items-center">
                        {remainingChips.length === 0 ? (
                            <div className="text-4xl animate-float">⚖️</div>
                        ) : (
                            remainingChips.slice(0, 12).map((c, i) => (
                                <div
                                    key={c.id}
                                    className={`w-9 h-9 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-xs shadow-md animate-float ${
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
                        {remainingChips.length > 12 && (
                            <span className="text-white/40 text-[10px] font-bold">+{remainingChips.length - 12}</span>
                        )}
                    </div>

                    {/* Número de resultado grande */}
                    <div className="text-center">
                        <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-0.5">
                            Resultado
                        </p>
                        <div
                            className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tabular-nums leading-none ${resultBigColor}`}
                        >
                            {resultValue > 0 ? `+${resultValue}` : resultValue}
                        </div>
                    </div>

                    {/* Explicación didáctica */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 w-full text-center">
                        <p className={`font-bold text-xs sm:text-sm leading-snug ${resultTextColor}`}>
                            {getResultText()}
                        </p>
                        {resultValue === 0 && (
                            <p className="text-purple-300/60 text-[11px] mt-1">¡Perfecto equilibrio! 🎉</p>
                        )}
                    </div>

                    {/* Ecuación resumen */}
                    <div className="flex flex-wrap items-center justify-center gap-x-2 text-base font-black font-mono">
                        {snapshotInputs
                            .filter((i) => i.count > 0)
                            .map((inp, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    {i > 0 && <span className="text-white/30 text-sm font-sans">+</span>}
                                    <span className={inp.color === "blue" ? "text-blue-300" : "text-red-300"}>
                                        {inp.color === "blue" ? `(+${inp.count})` : `(−${inp.count})`}
                                    </span>
                                </span>
                            ))}
                        <span className="text-white/30 font-sans">=</span>
                        <span className={resultBigColor}>{resultValue > 0 ? `+${resultValue}` : resultValue}</span>
                    </div>

                    {/* Botón Nuevo Ejercicio */}
                    <button
                        onClick={handleReset}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
                    >
                        Nuevo Ejercicio 🔄
                    </button>
                </main>
            )}

            {/* ── Modal de Ayuda ── */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo sumar enteros con fichas?"
                bgColor="#080c18"
                buttonColor="bg-indigo-500 hover:bg-indigo-400"
            >
                <div className="space-y-3 text-white/80 text-xs sm:text-sm leading-relaxed">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5 text-white/40">
                            Paso 1 — Elige un caso o configura
                        </p>
                        <ol className="space-y-1.5 list-decimal list-inside">
                            <li>
                                Puedes tocar uno de los botones de <strong className="text-indigo-400">Casos</strong> arriba o generar uno <strong className="text-purple-400">Aleatorio 🎲</strong>.
                            </li>
                            <li>
                                O ajusta cada grupo con <span className="text-blue-400 font-bold">Azul (+1)</span> o <span className="text-red-400 font-bold">Rojo (−1)</span> y los botones <strong>+</strong> y <strong>−</strong>.
                            </li>
                            <li>Presiona <strong className="text-white">Generar Fichas ✨</strong>.</li>
                        </ol>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5 text-white/40">
                            Paso 2 — Cancela los pares opuestos
                        </p>
                        <ul className="space-y-1.5 list-disc list-inside">
                            <li>
                                <strong className="text-white">Arrastra</strong> una ficha azul sobre una roja (o viceversa) para cancelar el par.
                            </li>
                            <li>
                                O pulsa <strong className="text-amber-400">⚡ Cancelar todos los pares</strong> para resolverlo automáticamente.
                            </li>
                        </ul>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5 text-white/40">
                            Paso 3 — Descubre el resultado
                        </p>
                        <p>
                            Las fichas que sobran dan el valor final: si sobran azules es positivo (+), si sobran rojas es negativo (−), y si no sobra ninguna es <strong className="text-purple-400">0</strong>.
                        </p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
