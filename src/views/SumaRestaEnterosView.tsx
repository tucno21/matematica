import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 52;
const SNAP_DISTANCE = 68;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function buildChips(blue: number, red: number, areaW: number, areaH: number): Chip[] {
    const total = blue + red;
    if (total === 0) return [];
    const cols = Math.max(2, Math.ceil(Math.sqrt(total * 1.6)));
    const cellW = Math.max(CHIP_SIZE + 14, areaW / cols);
    const cellH = Math.max(CHIP_SIZE + 14, cellW);
    const colors: ChipColor[] = [...Array(blue).fill("blue"), ...Array(red).fill("red")];
    for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors.map((color, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jx = (Math.random() - 0.5) * 16;
        const jy = (Math.random() - 0.5) * 16;
        return {
            id: uid(), color,
            x: Math.max(4, Math.min(areaW - CHIP_SIZE - 4, col * cellW + cellW / 2 - CHIP_SIZE / 2 + jx)),
            y: Math.max(4, Math.min(areaH - CHIP_SIZE - 4, row * cellH + cellH / 2 - CHIP_SIZE / 2 + jy)),
            exploding: false, exploded: false,
        };
    });
}

function calcResult(inputs: InputConfig[]) {
    let blue = 0, red = 0;
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
        radioBg: "bg-blue-500/20 border-blue-400",
        radioText: "text-blue-300",
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
        radioBg: "bg-red-500/20 border-red-400",
        radioText: "text-red-300",
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorToggle({ selected, onChange }: { selected: ChipColor; onChange: (c: ChipColor) => void }) {
    return (
        <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
            {(["blue", "red"] as ChipColor[]).map((c) => {
                const t = TOKEN[c];
                const active = selected === c;
                return (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all duration-200
              ${active ? `${t.ringBg} ${t.text}` : "bg-transparent text-white/35 hover:text-white/55"}`}
                    >
                        <div className={`w-2 h-2 rounded-full transition-all ${active ? t.dot : "bg-white/20"}`} />
                        {c === "blue" ? "+1" : "−1"}
                    </button>
                );
            })}
        </div>
    );
}

function InputCard({ index, config, onChange }: {
    index: number;
    config: InputConfig;
    onChange: (u: InputConfig) => void;
}) {
    const t = TOKEN[config.color];
    return (
        <div className={`rounded-2xl border ${t.border} ${t.bg} p-4 flex flex-col gap-3 transition-all duration-300`}>
            {/* Row 1: label + color toggle */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${t.dot}`} />
                    <span className="text-[11px] font-black tracking-widest text-white/40 uppercase">
                        Grupo {index + 1}
                    </span>
                </div>
                <ColorToggle selected={config.color} onChange={(c) => onChange({ ...config, color: c })} />
            </div>

            {/* Row 2: mini chip dots + counter controls */}
            <div className="flex items-center justify-between gap-3">
                {/* Mini chip preview */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-h-7 content-center">
                    {config.count === 0 ? (
                        <span className="text-white/20 text-xs italic">Sin fichas aún</span>
                    ) : (
                        Array.from({ length: Math.min(config.count, 10) }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-5 h-5 rounded-full bg-linear-to-br ${t.chipGrad} flex items-center justify-center shadow-sm`}
                            >
                                <span className="text-white text-[8px] font-black leading-none">
                                    {config.color === "blue" ? "+" : "−"}
                                </span>
                            </div>
                        ))
                    )}
                    {config.count > 10 && (
                        <span className={`text-xs font-bold ${t.text} opacity-60`}>+{config.count - 10}</span>
                    )}
                </div>

                {/* Counter */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        className={`w-9 h-9 rounded-xl ${t.btn} active:scale-90 text-white text-xl font-black shadow transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onChange({ ...config, count: Math.max(0, config.count - 1) })}
                        disabled={config.count === 0}
                    >−</button>
                    <span className={`w-8 text-center text-2xl font-black tabular-nums ${t.text}`}>
                        {config.count}
                    </span>
                    <button
                        className={`w-9 h-9 rounded-xl ${t.btn} active:scale-90 text-white text-xl font-black shadow transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onChange({ ...config, count: Math.min(10, config.count + 1) })}
                        disabled={config.count === 10}
                    >+</button>
                </div>
            </div>

            {/* Row 3: summary label */}
            {config.count > 0 && (
                <p className={`text-xs font-semibold ${t.text} opacity-60 leading-none`}>
                    {config.count} ficha{config.count !== 1 ? "s" : ""} {t.label}
                </p>
            )}
        </div>
    );
}

function ChipEl({ chip, dragging, onPointerDown }: {
    chip: Chip; dragging: boolean;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
}) {
    if (chip.exploded) return null;
    const t = TOKEN[chip.color];
    return (
        <div
            className={`absolute select-none transition-transform duration-75
        ${chip.exploding ? "animate-explode" : ""}
        ${dragging ? "scale-125 z-50" : "z-10 hover:scale-110 cursor-grab active:cursor-grabbing"}
      `}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: chip.x, top: chip.y, touchAction: "none" }}
            onPointerDown={(e) => onPointerDown(e, chip.id)}
        >
            <div className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-lg ${t.chipShadow} flex items-center justify-center`}>
                <span className="text-white font-black text-[15px] leading-none select-none">{t.sign}</span>
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
                    style={{ background: TOKEN[color].particle, left: "50%", top: "50%", "--angle": `${i * 45}deg` } as React.CSSProperties}
                />
            ))}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function SumaRestaEnterosView() {
    const navigate = useNavigate();

    const [inputs, setInputs] = useState<InputConfig[]>([
        { color: "blue", count: 0 },
        { color: "red", count: 0 },
    ]);
    const [phase, setPhase] = useState<Phase>("setup");

    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [autoCancelling, setAutoCancelling] = useState(false);

    const [resultValue, setResultValue] = useState(0);
    const [snapshotInputs, setSnapshotInputs] = useState<InputConfig[]>([]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const canGenerate = inputs.some((i) => i.count > 0);
    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;
    const hasPairs = liveBlue > 0 && liveRed > 0;
    const remainingChips = chips.filter((c) => !c.exploded);
    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";
    const { value: previewResult } = calcResult(inputs);

    // ── Setup ─────────────────────────────────────────────────────────────────
    const updateInput = (i: number, updated: InputConfig) =>
        setInputs((prev) => prev.map((inp, idx) => (idx === i ? updated : inp)));

    const handleGenerate = () => {
        const { blue, red } = calcResult(inputs);
        const rect = areaRef.current?.getBoundingClientRect();
        const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
        const h = rect?.height ?? Math.max(340, window.innerHeight - 280);
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
            const t = setTimeout(() => { setResultValue(0); setPhase("result"); }, 600);
            return () => clearTimeout(t);
        }
        if (b + r > 0 && !(b > 0 && r > 0)) {
            const t = setTimeout(() => { setResultValue(b - r); setPhase("result"); }, 600);
            return () => clearTimeout(t);
        }
    }, [chips, phase]);

    // ── Drag ──────────────────────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const chip = chips.find((c) => c.id === id);
        if (!chip || chip.exploded || chip.exploding) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        dragOffset.current = { x: e.clientX - rect.left - chip.x, y: e.clientY - rect.top - chip.y };
        setDraggingId(id);
    }, [chips]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        setChips((prev) => prev.map((c) => c.id === draggingId ? {
            ...c,
            x: Math.max(0, Math.min(rect.width - CHIP_SIZE, e.clientX - rect.left - dragOffset.current.x)),
            y: Math.max(0, Math.min(rect.height - CHIP_SIZE, e.clientY - rect.top - dragOffset.current.y)),
        } : c));
    }, [draggingId]);

    const explodePair = useCallback((id1: string, id2: string) => {
        setChips((prev) => prev.map((c) => c.id === id1 || c.id === id2 ? { ...c, exploding: true } : c));
        setTimeout(() => {
            setChips((prev) => prev.map((c) => c.id === id1 || c.id === id2 ? { ...c, exploding: false, exploded: true } : c));
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
        setInputs([{ color: "blue", count: 0 }, { color: "red", count: 0 }]);
        setChips([]);
        setDraggingId(null);
        setAutoCancelling(false);
        setPhase("setup");
    };

    // ── Result text ───────────────────────────────────────────────────────────
    const getResultText = () => {
        if (resultValue === 0) return "¡Los pares se cancelaron perfectamente! El resultado es cero.";
        if (resultValue > 0) return `Sobran ${resultValue} ficha${resultValue !== 1 ? "s" : ""} positiva${resultValue !== 1 ? "s" : ""}. El resultado es +${resultValue}.`;
        return `Sobran ${Math.abs(resultValue)} ficha${Math.abs(resultValue) !== 1 ? "s" : ""} negativa${Math.abs(resultValue) !== 1 ? "s" : ""}. El resultado es ${resultValue}.`;
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-dvh bg-[#080c18] text-white flex flex-col"
            style={{ fontFamily: "'Nunito', sans-serif" }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        @keyframes explode {
          0%   { transform: scale(1);   opacity: 1; }
          45%  { transform: scale(1.7); opacity: 0.7; }
          100% { transform: scale(0);   opacity: 0; }
        }
        .animate-explode { animation: explode 0.48s ease-out forwards; }

        @keyframes particle {
          0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0);     opacity: 1; }
          100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-44px); opacity: 0; }
        }
        .animate-particle { animation: particle 0.48s ease-out forwards; }

        @keyframes floatChip {
          0%,100% { transform: translateY(0)    rotate(-4deg); }
          50%      { transform: translateY(-10px) rotate(4deg); }
        }
        .animate-float { animation: floatChip 2.6s ease-in-out infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-up  { animation: fadeUp 0.42s ease-out both; }

        @keyframes popIn {
          0%   { transform: scale(0.72); opacity: 0; }
          70%  { transform: scale(1.06); }
          100% { transform: scale(1);    opacity: 1; }
        }
        .anim-pop { animation: popIn 0.38s ease-out both; }

        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 18px rgba(99,102,241,.35); }
          50%      { box-shadow: 0 0 36px rgba(99,102,241,.7); }
        }
        .glow-btn { animation: glowPulse 2.2s ease-in-out infinite; }
      `}</style>

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-4 pt-safe pt-4 pb-2 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 text-sm font-bold border border-white/10 shrink-0 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="min-w-0 flex-1">
                    <h1 className="text-[15px] sm:text-lg font-black tracking-tight leading-tight truncate">
                        Suma y Resta de Enteros
                    </h1>
                    <p className="text-[10px] text-white/30 font-semibold">Cancelación de pares</p>
                </div>

                {/* Step dots */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {(["setup", "play", "result"] as Phase[]).map((p, i) => (
                        <div
                            key={p}
                            className={`h-1.5 rounded-full transition-all duration-300 ${phase === p
                                ? "w-5 bg-indigo-400"
                                : (["setup", "play", "result"].indexOf(phase) > i)
                                    ? "w-2.5 bg-white/25"
                                    : "w-2.5 bg-white/8"
                                }`}
                        />
                    ))}
                </div>
            </header>

            {/* ════════════════════════════════════════════════════════════════════
          SETUP PHASE
      ════════════════════════════════════════════════════════════════════ */}
            {phase === "setup" && (
                <main className="flex-1 flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
                    {/* Hero text */}
                    <div className="text-center anim-up pt-1">
                        <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-1">Elige tus fichas</p>
                        <p className="text-white/45 text-sm leading-relaxed max-w-70 mx-auto">
                            Azul&nbsp;=&nbsp;<span className="text-blue-400 font-bold">+1</span>
                            &nbsp;·&nbsp;Rojo&nbsp;=&nbsp;<span className="text-red-400 font-bold">−1</span>
                            &nbsp;·&nbsp;Al juntarlos se cancelan
                        </p>
                    </div>

                    {/* Input cards */}
                    <div className="flex flex-col gap-3">
                        {inputs.map((inp, i) => (
                            <div key={i} className="anim-up" style={{ animationDelay: `${i * 0.07}s` }}>
                                <InputCard index={i} config={inp} onChange={(u) => updateInput(i, u)} />
                            </div>
                        ))}
                    </div>

                    {/* Equation preview */}
                    {canGenerate && (() => {
                        const parts = inputs.filter((i) => i.count > 0);
                        return (
                            <div className="anim-up anim-pop" style={{ animationDelay: "0.16s" }}>
                                <p className="text-center text-white/25 text-[10px] uppercase tracking-widest mb-2 font-bold">
                                    Vista previa
                                </p>
                                <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-xl font-black">
                                    {parts.map((p, i) => (
                                        <span key={i} className="flex items-center gap-2">
                                            {i > 0 && <span className="text-white/20 text-base">+</span>}
                                            <span className={p.color === "blue" ? "text-blue-300" : "text-red-300"}>
                                                {p.color === "blue" ? `+${p.count}` : `(−${p.count})`}
                                            </span>
                                        </span>
                                    ))}
                                    <span className="text-white/20 text-base">=</span>
                                    <span className={`text-2xl ${previewResult > 0 ? "text-blue-300" : previewResult < 0 ? "text-red-300" : "text-purple-300"}`}>
                                        {previewResult > 0 ? `+${previewResult}` : previewResult}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Generate button */}
                    <div className="anim-up" style={{ animationDelay: "0.22s" }}>
                        <button
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`w-full py-4 rounded-2xl text-base font-black transition-all duration-200
                ${canGenerate
                                    ? "bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.97] glow-btn"
                                    : "bg-white/6 text-white/20 cursor-not-allowed"
                                }`}
                        >
                            Generar Fichas ✨
                        </button>
                    </div>
                </main>
            )}

            {/* ════════════════════════════════════════════════════════════════════
          PLAY PHASE
      ════════════════════════════════════════════════════════════════════ */}
            {phase === "play" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    {/* Live counter bar */}
                    <div className="flex items-center justify-between gap-2 bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/60 shrink-0" />
                            <span className="text-blue-300 font-black text-lg tabular-nums">{liveBlue}</span>
                            <span className="text-white/30 text-xs hidden sm:inline">positivas</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/60 shrink-0" />
                            <span className="text-red-300 font-black text-lg tabular-nums">{liveRed}</span>
                            <span className="text-white/30 text-xs hidden sm:inline">negativas</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <span className="text-white/35 text-xs">
                            <span className="font-bold text-white/55">{liveBlue + liveRed}</span> fichas
                        </span>
                        {hasPairs && (
                            <>
                                <div className="w-px h-4 bg-white/10" />
                                <span className="text-amber-400/80 text-xs font-bold">
                                    {Math.min(liveBlue, liveRed)} par{Math.min(liveBlue, liveRed) !== 1 ? "es" : ""}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Drag area — fills all available space */}
                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <div className="absolute inset-0 opacity-[0.03]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }} />

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
                                <div className="bg-black/75 backdrop-blur-md rounded-2xl px-5 py-3 text-center anim-up border border-white/10">
                                    <p className="text-white font-bold text-sm">✅ No quedan más pares</p>
                                    <p className="text-white/40 text-xs mt-0.5">Calculando resultado…</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-white/20 text-[11px] shrink-0">
                        Arrastra +1 sobre −1 para cancelarlos
                    </p>

                    <button
                        disabled={!hasPairs || autoCancelling}
                        onClick={handleAutoCancel}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
              ${hasPairs && !autoCancelling
                                ? "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98]"
                                : "bg-white/4 text-white/18 cursor-not-allowed"
                            }`}
                    >
                        {autoCancelling ? "⚡ Cancelando pares…" : "⚡ Cancelar todos los pares automáticamente"}
                    </button>
                </main>
            )}

            {/* ════════════════════════════════════════════════════════════════════
          RESULT PHASE
      ════════════════════════════════════════════════════════════════════ */}
            {phase === "result" && (
                <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6 overflow-y-auto">
                    {/* Floating remaining chips */}
                    <div className="flex flex-wrap justify-center gap-2.5 min-h-14 items-center anim-up max-w-xs">
                        {remainingChips.length === 0 ? (
                            <div className="text-5xl animate-float">⚖️</div>
                        ) : (
                            remainingChips.slice(0, 16).map((c, i) => (
                                <div
                                    key={c.id}
                                    className={`w-11 h-11 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-sm shadow-lg animate-float
                    ${c.color === "blue" ? "from-blue-400 to-blue-600 shadow-blue-500/40" : "from-red-400 to-red-600 shadow-red-500/40"}`}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    {c.color === "blue" ? "+1" : "−1"}
                                </div>
                            ))
                        )}
                        {remainingChips.length > 16 && (
                            <span className="text-white/30 text-xs font-bold">+{remainingChips.length - 16}</span>
                        )}
                    </div>

                    {/* Big result number */}
                    <div className="text-center anim-up anim-pop" style={{ animationDelay: "0.1s" }}>
                        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-1">Resultado</p>
                        <div className={`text-[72px] sm:text-8xl font-black tabular-nums leading-none ${resultBigColor} drop-shadow-2xl`}>
                            {resultValue > 0 ? `+${resultValue}` : resultValue}
                        </div>
                    </div>

                    {/* Explanation */}
                    <div
                        className="anim-up bg-white/4 border border-white/8 rounded-2xl px-5 py-4 max-w-70 w-full text-center"
                        style={{ animationDelay: "0.2s" }}
                    >
                        <p className={`font-bold text-sm leading-relaxed ${resultTextColor}`}>{getResultText()}</p>
                        {resultValue === 0 && <p className="text-purple-300/50 text-xs mt-1.5">¡Perfecto equilibrio! 🎉</p>}
                    </div>

                    {/* Equation recap */}
                    <div className="anim-up flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-lg font-black" style={{ animationDelay: "0.26s" }}>
                        {snapshotInputs.filter((i) => i.count > 0).map((inp, i) => (
                            <span key={i} className="flex items-center gap-2">
                                {i > 0 && <span className="text-white/20 text-base">+</span>}
                                <span className={inp.color === "blue" ? "text-blue-300" : "text-red-300"}>
                                    {inp.color === "blue" ? `+${inp.count}` : `(−${inp.count})`}
                                </span>
                            </span>
                        ))}
                        <span className="text-white/20 text-base">=</span>
                        <span className={resultBigColor}>{resultValue > 0 ? `+${resultValue}` : resultValue}</span>
                    </div>

                    <button
                        onClick={handleReset}
                        className="px-8 py-3.5 rounded-2xl text-base font-black bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all duration-200 glow-btn anim-up"
                        style={{ animationDelay: "0.34s" }}
                    >
                        Nuevo Ejercicio 🔄
                    </button>
                </main>
            )}
        </div>
    );
}