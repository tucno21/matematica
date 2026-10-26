import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_TEMP = -20;
const MAX_TEMP = 30;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TempColor {
    primary: string;
    secondary: string;
    glow: string;
}

interface TickMark {
    t: number;
    pct: number;
    isMajor: boolean;
    isZero: boolean;
}

interface TypeLabel {
    text: string;
    sign: string;
    sub: string;
}

type FactKey = "positive" | "zero" | "negative";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTempColor = (temp: number): TempColor => {
    // Convención matemática escolar: Positivos en AZUL, Negativos en ROJO, Cero neutro en GRIS
    if (temp > 0) return { primary: "#60a5fa", secondary: "#2563eb", glow: "rgba(96,165,250,0.35)" };
    if (temp < 0) return { primary: "#f87171", secondary: "#dc2626", glow: "rgba(248,113,113,0.35)" };
    return { primary: "#cbd5e1", secondary: "#94a3b8", glow: "rgba(203,213,225,0.3)" };
};

const getFactKey = (temp: number): FactKey => {
    if (temp > 0) return "positive";
    if (temp < 0) return "negative";
    return "zero";
};

// ─── Educational Facts ────────────────────────────────────────────────────────
const FACTS: Record<FactKey, string[]> = {
    positive: [
        "Temperatura sobre 0°C → número positivo (+)",
        "Los positivos se escriben con + o sin signo (+15 = 15)",
        "¡Más arriba estés de 0, mayor es el número!",
    ],
    zero: [
        "0°C es el punto de congelación del agua",
        "El cero no es positivo ni negativo: es neutro",
        "¡El cero es el origen de la recta numérica!",
    ],
    negative: [
        "Temperatura bajo 0°C → número negativo (−)",
        "Los negativos SIEMPRE llevan el signo menos (−)",
        "Ejemplo: −8°C significa 8 grados bajo cero",
    ],
};

const LEGEND_ITEMS = [
    { color: "#60a5fa", label: "Positivo (+)", sub: "> 0" },
    { color: "#cbd5e1", label: "Cero (0)", sub: "origen" },
    { color: "#f87171", label: "Negativo (−)", sub: "< 0" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntroEnterosView(): React.ReactElement {
    const navigate = useNavigate();

    const [temperature, setTemperature] = useState<number>(15);
    const [dragging, setDragging] = useState<boolean>(false);
    const [factIdx, setFactIdx] = useState<number>(0);

    const stemRef = useRef<HTMLDivElement>(null);

    const colors: TempColor = getTempColor(temperature);
    const range: number = MAX_TEMP - MIN_TEMP;
    const factKey: FactKey = getFactKey(temperature);
    const fillPct: number = Math.max(0, Math.min(100, ((temperature - MIN_TEMP) / range) * 100));

    const currentFacts: string[] = FACTS[factKey];

    const typeLabel: TypeLabel =
        temperature > 0
            ? { text: "POSITIVO", sign: "+", sub: "Mayor que cero" }
            : temperature < 0
                ? { text: "NEGATIVO", sign: "−", sub: "Menor que cero" }
                : { text: "CERO", sign: "0", sub: "Punto de congelación" };

    // ── Rotate facts periodically, resetting smoothly on factKey change ──
    useEffect(() => {
        const id = setInterval(() => {
            setFactIdx((i) => (i + 1) % currentFacts.length);
        }, 3600);
        return () => clearInterval(id);
    }, [factKey, currentFacts.length]);

    // ── Drag interaction via Pointer Events ──
    const tempFromPointerY = useCallback(
        (clientY: number): number | undefined => {
            if (!stemRef.current) return undefined;
            const rect = stemRef.current.getBoundingClientRect();
            if (rect.height <= 0) return undefined;
            const ratio = 1 - (clientY - rect.top) / rect.height;
            const clamped = Math.max(0, Math.min(1, ratio));
            return Math.round(clamped * range + MIN_TEMP);
        },
        [range],
    );

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>): void => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            const t = tempFromPointerY(e.clientY);
            if (t !== undefined) setTemperature(t);
        },
        [tempFromPointerY],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>): void => {
            if (!dragging) return;
            const t = tempFromPointerY(e.clientY);
            if (t !== undefined) setTemperature(t);
        },
        [dragging, tempFromPointerY],
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>): void => {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
            setDragging(false);
        },
        [],
    );

    // ── Graduated ticks ──
    const ticks: TickMark[] = [];
    for (let t = MIN_TEMP; t <= MAX_TEMP; t += 5) {
        ticks.push({
            t,
            pct: ((t - MIN_TEMP) / range) * 100,
            isMajor: t % 10 === 0,
            isZero: t === 0,
        });
    }

    return (
        <div className="flex h-dvh flex-col justify-between overflow-hidden bg-[#090d1a] text-white select-none relative font-sans">
            <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }
        @keyframes fadeSlide {
          0%   { opacity: 0; transform: translateY(4px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .fact-anim { animation: fadeSlide 3.6s ease-in-out forwards; }
        .number-display { font-family: 'Space Mono', monospace; }
      `}</style>

            {/* ── Ambient Background Glows ── */}
            <div
                className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full pointer-events-none blur-[70px] transition-all duration-700 opacity-40"
                style={{ background: colors.glow }}
            />
            <div
                className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full pointer-events-none blur-[80px] transition-all duration-700 opacity-25"
                style={{ background: colors.glow }}
            />

            {/* ── 1. Header (36-44px) ── */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0d1424] z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-white/80 hover:text-white text-[11px] lg:text-xs font-semibold transition-all flex items-center gap-1 border border-white/10"
                    title="Volver"
                >
                    <span>←</span>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="text-center px-1">
                    <span className="text-[9px] uppercase tracking-widest text-white/40 block font-bold leading-none">
                        Números Enteros
                    </span>
                    <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-white leading-tight">
                        El Termómetro de los <span style={{ color: colors.primary }}>Enteros</span>
                    </h1>
                </div>

                {/* Badge de temperatura en cabecera */}
                <div
                    className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] lg:text-xs font-mono font-bold flex items-center justify-center tabular-nums"
                    style={{ color: colors.primary }}
                >
                    {temperature > 0 ? `+${temperature}` : temperature}°C
                </div>
            </header>

            {/* ── 2. Área Central (Sin scroll en tablets ni laptops) ── */}
            <main className="flex-1 min-h-0 flex items-center justify-center p-1.5 sm:p-3 lg:p-6 z-10 overflow-hidden">
                <div
                    className="flex items-center w-full max-w-[560px] lg:max-w-[700px] bg-white/[0.04] border border-white/10 rounded-2xl lg:rounded-3xl p-2 sm:p-4 lg:p-6 gap-2 sm:gap-6 lg:gap-8 backdrop-blur-xl shadow-2xl transition-all duration-500"
                    style={{
                        boxShadow: `0 0 40px ${colors.glow}`,
                    }}
                >
                    {/* ════ COLUMNA TERMÓMETRO ════ */}
                    <div className="flex flex-col items-center shrink-0 pl-1 sm:pl-2 pr-2">
                        {/* Botón ▲ Aumentar */}
                        <button
                            type="button"
                            onClick={() => setTemperature((t) => Math.min(MAX_TEMP, t + 1))}
                            disabled={temperature >= MAX_TEMP}
                            className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center border border-white/15 shadow transition-all disabled:opacity-25 disabled:cursor-not-allowed mb-1"
                            title="Aumentar temperatura (+1°C)"
                        >
                            ▲
                        </button>

                        {/* Contenedor del Termómetro y Escala Graduada */}
                        <div className="relative flex items-center justify-center">
                            {/* Escala de Ticks a la izquierda del tubo */}
                            <div className="relative h-[170px] sm:h-[200px] lg:h-[270px] w-12 sm:w-14 shrink-0">
                                {ticks.map(({ t, pct, isMajor, isZero }) => (
                                    <div
                                        key={t}
                                        className="absolute right-1 flex items-center gap-1 -translate-y-1/2 pointer-events-none"
                                        style={{ bottom: `${pct}%` }}
                                    >
                                        <span
                                            className={`font-mono text-[9px] sm:text-[10px] tabular-nums whitespace-nowrap ${
                                                isZero
                                                    ? "text-white font-bold"
                                                    : isMajor
                                                    ? "text-white/60 font-semibold"
                                                    : "text-white/25"
                                            }`}
                                        >
                                            {t > 0 ? `+${t}` : t}°
                                        </span>
                                        <div
                                            className={`rounded-full ${
                                                isZero
                                                    ? "w-3 h-[2px] bg-white"
                                                    : isMajor
                                                    ? "w-2 h-[1.5px] bg-white/50"
                                                    : "w-1 h-[1px] bg-white/20"
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Tubo de cristal y bulbo inferior */}
                            <div className="relative flex flex-col items-center">
                                {/* Tubo vertical (Stem) */}
                                <div
                                    ref={stemRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                    className="relative w-5 sm:w-6 lg:w-7 h-[170px] sm:h-[200px] lg:h-[270px] rounded-t-full bg-white/10 border-x border-t border-white/20 overflow-visible cursor-ns-resize touch-none select-none"
                                    style={{ touchAction: "none" }}
                                    title="Arrastra verticalmente para cambiar la temperatura"
                                >
                                    {/* Contenedor interior del líquido con overflow hidden */}
                                    <div className="absolute inset-0 rounded-t-full overflow-hidden pointer-events-none">
                                        {/* Líquido coloreado */}
                                        <div
                                            className="absolute bottom-0 left-0 right-0 transition-all duration-150"
                                            style={{
                                                height: `${fillPct}%`,
                                                background: `linear-gradient(to top, ${colors.secondary}, ${colors.primary})`,
                                            }}
                                        />
                                        {/* Reflejo de cristal */}
                                        <div className="absolute top-0 left-1 w-1 h-full bg-white/20 rounded-full pointer-events-none" />
                                    </div>

                                    {/* Indicador / Manija de arrastre sobre el líquido */}
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white pointer-events-none shadow-md z-10 transition-all duration-150"
                                        style={{
                                            bottom: `${fillPct}%`,
                                            background: `radial-gradient(circle at 35% 35%, ${colors.primary}, ${colors.secondary})`,
                                            boxShadow: `0 0 10px ${colors.glow}`,
                                        }}
                                    />
                                </div>

                                {/* Bulbo inferior redondo */}
                                <div
                                    className="relative w-9 h-9 sm:w-11 sm:h-11 lg:w-13 lg:h-13 -mt-2 rounded-full border border-white/20 flex items-center justify-center shadow-lg transition-all duration-500 z-10"
                                    style={{
                                        background: `radial-gradient(circle at 35% 35%, ${colors.primary}, ${colors.secondary})`,
                                        boxShadow: `0 0 16px ${colors.glow}`,
                                    }}
                                >
                                    {/* Reflejo curvo del bulbo */}
                                    <div className="absolute top-1.5 left-2 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white/30 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Botón ▼ Disminuir */}
                        <button
                            type="button"
                            onClick={() => setTemperature((t) => Math.max(MIN_TEMP, t - 1))}
                            disabled={temperature <= MIN_TEMP}
                            className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center border border-white/15 shadow transition-all disabled:opacity-25 disabled:cursor-not-allowed mt-1"
                            title="Disminuir temperatura (−1°C)"
                        >
                            ▼
                        </button>
                    </div>

                    {/* ════ PANEL DE INFORMACIÓN Y RECTA ════ */}
                    <div className="flex flex-col flex-1 min-w-0 justify-center py-1">
                        {/* Display de temperatura */}
                        <div className="mb-2 sm:mb-3">
                            <div
                                className="number-display text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums leading-none tracking-tight transition-colors duration-500"
                                style={{ color: colors.primary }}
                            >
                                {temperature > 0 ? `+${temperature}` : temperature}°C
                            </div>

                            {/* Badge de clasificación */}
                            <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                                <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-black tracking-wide border transition-all duration-500"
                                    style={{
                                        background: `${colors.primary}20`,
                                        borderColor: `${colors.primary}50`,
                                        color: colors.primary,
                                    }}
                                >
                                    <span className="font-mono text-sm leading-none">{typeLabel.sign}</span>
                                    <span>{typeLabel.text}</span>
                                </span>
                                <span className="text-[11px] sm:text-xs text-white/50 font-medium truncate">
                                    {typeLabel.sub}
                                </span>
                            </div>
                        </div>

                        {/* Mini Recta Numérica Interactiva */}
                        <div className="rounded-xl bg-white/[0.05] border border-white/10 p-2 sm:p-2.5 mb-2 sm:mb-2.5">
                            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1">
                                <span>Recta numérica</span>
                                <span className="font-mono font-semibold" style={{ color: colors.primary }}>
                                    {temperature > 0 ? `+${temperature}` : temperature}
                                </span>
                            </div>

                            <div className="relative h-6 sm:h-7 flex items-center">
                                {/* Eje horizontal */}
                                <div className="absolute left-0 right-0 h-[2px] bg-white/20 rounded-full" />

                                {/* Marca cero destacada */}
                                <div
                                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-white/60 rounded-full"
                                    style={{ left: `${((0 - MIN_TEMP) / range) * 100}%` }}
                                />

                                {/* Etiquetas numéricas fijas */}
                                {([-20, -10, 0, 10, 20, 30] as number[]).map((v) => (
                                    <span
                                        key={v}
                                        className={`absolute top-4 -translate-x-1/2 text-[8px] sm:text-[9px] font-mono select-none ${
                                            v === 0 ? "text-white font-bold" : "text-white/40"
                                        }`}
                                        style={{ left: `${((v - MIN_TEMP) / range) * 100}%` }}
                                    >
                                        {v}
                                    </span>
                                ))}

                                {/* Punto activo sincronizado */}
                                <div
                                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-md transition-all duration-150 z-10"
                                    style={{
                                        left: `${fillPct}%`,
                                        background: colors.primary,
                                        boxShadow: `0 0 10px ${colors.glow}`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Tarjeta de Hechos y Curiosidades Didácticas */}
                        <div
                            className="flex items-center rounded-xl p-2 sm:p-2.5 min-h-[46px] sm:min-h-[52px] border transition-all duration-500"
                            style={{
                                background: `${colors.primary}12`,
                                borderColor: `${colors.primary}30`,
                            }}
                        >
                            <p
                                key={`${factIdx}-${factKey}`}
                                className="fact-anim m-0 text-xs sm:text-[13px] text-white/90 font-medium leading-snug"
                            >
                                💡 {currentFacts[factIdx]}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── 3. Footer / Leyenda (32-36px) ── */}
            <footer className="h-8 sm:h-9 shrink-0 border-t border-white/10 px-2 lg:px-4 bg-[#0d1424] flex items-center justify-between text-[10px] sm:text-[11px] text-white/50 z-20">
                {/* Leyenda interactiva */}
                <div className="flex items-center gap-3 sm:gap-4">
                    {LEGEND_ITEMS.map(({ color, label, sub }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            <span className="font-bold text-white/80">{label}</span>
                            <span className="hidden sm:inline text-white/40">{sub}</span>
                        </div>
                    ))}
                </div>

                {/* Micro-indicación */}
                <span className="hidden md:inline text-white/30 truncate">
                    Arrastra el termómetro · Usa ▲▼ · O toca el tubo
                </span>
            </footer>
        </div>
    );
}
