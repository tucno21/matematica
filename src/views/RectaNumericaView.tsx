import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tooltip {
    value: number;
    x: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN = -10;
const MAX = 10;
const TOTAL = MAX - MIN; // 20

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getColor = (n: number) => {
    if (n > 0) return { text: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)", glow: "rgba(248,113,113,0.35)" };
    if (n < 0) return { text: "#60a5fa", bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.4)", glow: "rgba(96,165,250,0.35)" };
    return { text: "#e5e7eb", bg: "rgba(229,231,235,0.12)", border: "rgba(229,231,235,0.35)", glow: "rgba(229,231,235,0.3)" };
};

const getLabel = (n: number) => {
    if (n > 0) return { type: "POSITIVO", sign: "+", desc: "Mayor que cero", emoji: "🔴" };
    if (n < 0) return { type: "NEGATIVO", sign: "−", desc: "Menor que cero", emoji: "🔵" };
    return { type: "CERO", sign: "0", desc: "Origen — punto de referencia", emoji: "⚪" };
};

const facts: Record<"pos" | "neg" | "zero", string[]> = {
    pos: [
        "Los números positivos están a la DERECHA del cero.",
        "Cuanto más a la derecha, mayor es el número.",
        "Se pueden escribir con + o sin signo: +4 = 4",
    ],
    neg: [
        "Los números negativos están a la IZQUIERDA del cero.",
        "Cuanto más a la izquierda, menor es el número.",
        "Siempre llevan el signo −: no se puede omitir.",
    ],
    zero: [
        "El cero es el origen de la recta numérica.",
        "El cero no es positivo ni negativo.",
        "Es el punto de referencia para todos los demás.",
    ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function RectaNumericaView() {
    const navigate = useNavigate();

    // Active point on the number line
    const [active, setActive] = useState<number>(3);
    const [dragging, setDragging] = useState(false);
    const [tooltip, setTooltip] = useState<Tooltip | null>(null);
    const [factIdx, setFactIdx] = useState(0);
    const [revealed, setRevealed] = useState<Set<number>>(new Set([3]));
    const [pulse, setPulse] = useState(false);

    const lineRef = useRef<HTMLDivElement>(null);

    const colors = getColor(active);
    const label = getLabel(active);
    const currentFacts = active > 0 ? facts.pos : active < 0 ? facts.neg : facts.zero;
    const factKey = active > 0 ? "pos" : active < 0 ? "neg" : "zero";

    // Rotate facts
    useEffect(() => {
        setFactIdx(0);
        const id = setInterval(() => setFactIdx(i => (i + 1) % currentFacts.length), 3500);
        return () => clearInterval(id);
    }, [factKey]); // eslint-disable-line

    // Pulse animation on value change
    useEffect(() => {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 350);
        return () => clearTimeout(t);
    }, [active]);

    // Convert clientX → integer value on the line
    const xToValue = useCallback((clientX: number): number => {
        if (!lineRef.current) return active;
        const rect = lineRef.current.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;
        const clamped = Math.max(0, Math.min(1, ratio));
        return Math.round(clamped * TOTAL + MIN);
    }, [active]);

    const commit = useCallback((val: number) => {
        setActive(val);
        setRevealed(prev => new Set([...prev, val]));
    }, []);

    const handleLineMouseDown = useCallback((e: React.MouseEvent) => {
        setDragging(true);
        commit(xToValue(e.clientX));
    }, [xToValue, commit]);

    const handleLineTouchStart = useCallback((e: React.TouchEvent) => {
        setDragging(true);
        commit(xToValue(e.touches[0].clientX));
    }, [xToValue, commit]);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent | TouchEvent) => {
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            commit(xToValue(clientX));
        };
        const onUp = () => setDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onUp);
        };
    }, [dragging, xToValue, commit]);

    // Hover tooltip
    const handleHover = useCallback((e: React.MouseEvent) => {
        if (dragging) return;
        const val = xToValue(e.clientX);
        if (!lineRef.current) return;
        const rect = lineRef.current.getBoundingClientRect();
        const x = ((val - MIN) / TOTAL) * rect.width;
        setTooltip({ value: val, x });
    }, [dragging, xToValue]);

    const pct = (val: number) => ((val - MIN) / TOTAL) * 100;

    // Snap buttons
    const snap = (v: number) => { commit(v); };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-dvh flex flex-col items-center"
            style={{
                background: "linear-gradient(160deg, #07090f 0%, #0c1220 55%, #07090f 100%)",
                fontFamily: "'Nunito', sans-serif",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes popIn {
          0%   { transform:scale(0.7); opacity:0; }
          65%  { transform:scale(1.08); }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes factSlide {
          0%   { opacity:0; transform:translateY(5px); }
          12%  { opacity:1; transform:translateY(0); }
          85%  { opacity:1; transform:translateY(0); }
          100% { opacity:0; transform:translateY(-5px); }
        }
        @keyframes glowPulse {
          0%,100% { opacity:.5; transform:scale(1); }
          50%     { opacity:.9; transform:scale(1.12); }
        }
        @keyframes tickReveal {
          from { transform:scaleY(0); opacity:0; }
          to   { transform:scaleY(1); opacity:1; }
        }
        @keyframes markerPop {
          0%   { transform:translate(-50%,-50%) scale(0.5); }
          65%  { transform:translate(-50%,-50%) scale(1.15); }
          100% { transform:translate(-50%,-50%) scale(1); }
        }

        .anim-fadeup   { animation:fadeUp .45s ease-out both; }
        .anim-popin    { animation:popIn .4s ease-out both; }
        .fact-anim     { animation:factSlide 3.5s ease-in-out forwards; }
        .glow-orb      { animation:glowPulse 2.2s ease-in-out infinite; }
        .marker-pop    { animation:markerPop .3s ease-out both; }

        .line-track    { cursor:ew-resize; user-select:none; -webkit-user-select:none; touch-action:none; }
        .snap-btn:hover { filter:brightness(1.2); transform:scale(1.06); }
        .snap-btn:active { transform:scale(.94); }
        .snap-btn { transition: transform .15s, filter .15s; }
      `}</style>

            {/* ── Ambient blobs ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="glow-orb absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl"
                    style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`, transition: "background .8s" }} />
                <div className="glow-orb absolute bottom-0 -right-24 w-80 h-80 rounded-full blur-3xl"
                    style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`, transition: "background .8s", animationDelay: "1.1s" }} />
            </div>

            {/* ── Header ── */}
            <header className="w-full max-w-3xl px-4 pt-4 pb-2 flex items-center gap-3 z-10 anim-fadeup">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>

                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>
                        Números Enteros
                    </p>
                    <h1 className="text-base sm:text-lg font-black leading-tight truncate text-white">
                        La Recta Numérica
                    </h1>
                </div>
            </header>

            {/* ── Main content ── */}
            <main className="flex-1 flex flex-col gap-5 w-full max-w-3xl px-4 pb-8 z-10">

                {/* ── Value display card ── */}
                <div
                    className="rounded-2xl p-5 flex items-center gap-4 anim-fadeup"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${colors.border}`,
                        boxShadow: `0 0 40px ${colors.glow}`,
                        transition: "border-color .5s, box-shadow .5s",
                        animationDelay: "0.05s",
                    }}
                >
                    {/* Big number */}
                    <div
                        className={`transition-all duration-300 ${pulse ? "scale-110" : "scale-100"}`}
                        style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "clamp(56px, 12vw, 80px)",
                            fontWeight: 700,
                            color: colors.text,
                            lineHeight: 1,
                            minWidth: "3ch",
                            textAlign: "center",
                            transition: "color .4s",
                            letterSpacing: "-3px",
                        }}
                    >
                        {active > 0 ? `+${active}` : active}
                    </div>

                    {/* Labels */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase"
                            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, transition: "all .4s" }}
                        >
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>{label.sign}</span>
                            {label.type}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{label.desc}</p>

                        {/* Distance from zero */}
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-px flex-1 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                            <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {active === 0 ? "Origen" : `${Math.abs(active)} unidad${Math.abs(active) !== 1 ? "es" : ""} del cero`}
                            </span>
                            <div className="h-px flex-1 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                        </div>
                    </div>
                </div>

                {/* ── Number line ── */}
                <div
                    className="rounded-2xl px-6 py-8 anim-fadeup"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        animationDelay: "0.1s",
                    }}
                >
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-5" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Recta Numérica Interactiva — arrastra o toca
                    </p>

                    {/* The line */}
                    <div className="relative" style={{ height: 90 }}>

                        {/* Colored zone: negative */}
                        <div
                            className="absolute rounded-l-full"
                            style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: 0,
                                width: `${pct(0)}%`,
                                height: 6,
                                background: "linear-gradient(to right, rgba(96,165,250,0.15), rgba(96,165,250,0.35))",
                                transition: "opacity .4s",
                            }}
                        />
                        {/* Colored zone: positive */}
                        <div
                            className="absolute rounded-r-full"
                            style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: `${pct(0)}%`,
                                width: `${pct(MAX) - pct(0)}%`,
                                height: 6,
                                background: "linear-gradient(to right, rgba(248,113,113,0.35), rgba(248,113,113,0.15))",
                                transition: "opacity .4s",
                            }}
                        />

                        {/* Main axis line */}
                        <div
                            className="absolute rounded-full"
                            style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: 0, right: 0,
                                height: 3,
                                background: "rgba(255,255,255,0.15)",
                            }}
                        />

                        {/* Arrow left */}
                        <div className="absolute" style={{ top: "50%", left: -8, transform: "translateY(-50%)" }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(96,165,250,0.6)">
                                <polygon points="0,7 14,0 14,14" />
                            </svg>
                        </div>
                        {/* Arrow right */}
                        <div className="absolute" style={{ top: "50%", right: -8, transform: "translateY(-50%)" }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(248,113,113,0.6)">
                                <polygon points="14,7 0,0 0,14" />
                            </svg>
                        </div>

                        {/* Tick marks + labels */}
                        {Array.from({ length: TOTAL + 1 }, (_, i) => MIN + i).map(n => {
                            const x = pct(n);
                            const isMajor = n % 5 === 0;
                            const isZero = n === 0;
                            const c = getColor(n);
                            return (
                                <div key={n} className="absolute flex flex-col items-center" style={{ left: `${x}%`, top: "50%", transform: "translate(-50%,-50%)" }}>
                                    {/* tick */}
                                    <div
                                        style={{
                                            width: isZero ? 3 : 2,
                                            height: isZero ? 28 : isMajor ? 20 : 12,
                                            background: isZero ? "rgba(255,255,255,0.7)" : isMajor ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
                                            borderRadius: 2,
                                            marginBottom: 2,
                                        }}
                                    />
                                    {/* label */}
                                    {(isMajor || isZero) && (
                                        <span
                                            className="absolute font-bold select-none"
                                            style={{
                                                top: "calc(50% + 18px)",
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: isZero ? 11 : 10,
                                                color: isZero ? "#fff" : revealed.has(n) ? c.text : "rgba(255,255,255,0.3)",
                                                transition: "color .3s",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {n > 0 ? `+${n}` : n}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {/* ── Distance indicator (line from 0 to active) ── */}
                        {active !== 0 && (
                            <div
                                className="absolute rounded-full"
                                style={{
                                    top: "50%",
                                    height: 4,
                                    background: colors.text,
                                    opacity: 0.5,
                                    left: active > 0 ? `${pct(0)}%` : `${pct(active)}%`,
                                    width: `${Math.abs(pct(active) - pct(0))}%`,
                                    transform: "translateY(-50%)",
                                    transition: "left .15s ease, width .15s ease, background .4s",
                                }}
                            />
                        )}

                        {/* ── Active marker ── */}
                        <div
                            key={active}
                            className="marker-pop absolute z-20 pointer-events-none"
                            style={{ left: `${pct(active)}%`, top: "50%", transform: "translate(-50%,-50%)" }}
                        >
                            {/* Outer glow ring */}
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: 36, height: 36,
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: colors.bg,
                                    border: `2px solid ${colors.border}`,
                                    boxShadow: `0 0 20px ${colors.glow}`,
                                    transition: "background .4s, border-color .4s, box-shadow .4s",
                                }}
                            />
                            {/* Inner dot */}
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: 18, height: 18,
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: colors.text,
                                    boxShadow: `0 0 12px ${colors.glow}`,
                                    transition: "background .4s, box-shadow .4s",
                                }}
                            />
                            {/* Label above */}
                            <div
                                className="absolute text-center font-black"
                                style={{
                                    bottom: "calc(100% + 8px)",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 13,
                                    color: colors.text,
                                    whiteSpace: "nowrap",
                                    transition: "color .4s",
                                    textShadow: `0 0 10px ${colors.glow}`,
                                }}
                            >
                                {active > 0 ? `+${active}` : active}
                            </div>
                        </div>

                        {/* ── Hover tooltip ── */}
                        {tooltip && !dragging && (
                            <div
                                className="absolute pointer-events-none z-30"
                                style={{ left: tooltip.x, bottom: "calc(50% + 32px)", transform: "translateX(-50%)" }}
                            >
                                <div
                                    className="px-2 py-1 rounded-lg text-xs font-bold"
                                    style={{
                                        background: "rgba(15,20,35,0.9)",
                                        border: `1px solid ${getColor(tooltip.value).border}`,
                                        color: getColor(tooltip.value).text,
                                        fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                >
                                    {tooltip.value > 0 ? `+${tooltip.value}` : tooltip.value}
                                </div>
                            </div>
                        )}

                        {/* ── Invisible drag track ── */}
                        <div
                            ref={lineRef}
                            className="line-track absolute inset-0 z-10"
                            onMouseDown={handleLineMouseDown}
                            onMouseMove={handleHover}
                            onMouseLeave={() => setTooltip(null)}
                            onTouchStart={handleLineTouchStart}
                        />
                    </div>
                </div>

                {/* ── Snap buttons ── */}
                <div className="anim-fadeup" style={{ animationDelay: "0.15s" }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Explorar valores rápidos
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {[MIN, -5, -3, -1, 0, 1, 3, 5, MAX].map(v => {
                            const c = getColor(v);
                            const isSelected = v === active;
                            return (
                                <button
                                    key={v}
                                    onClick={() => snap(v)}
                                    className="snap-btn px-3 py-1.5 rounded-xl text-sm font-black"
                                    style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        background: isSelected ? c.bg : "rgba(255,255,255,0.04)",
                                        border: `1.5px solid ${isSelected ? c.border : "rgba(255,255,255,0.08)"}`,
                                        color: isSelected ? c.text : "rgba(255,255,255,0.4)",
                                        boxShadow: isSelected ? `0 0 16px ${c.glow}` : "none",
                                        transition: "all .25s",
                                    }}
                                >
                                    {v > 0 ? `+${v}` : v}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Comparison row ── */}
                <div
                    className="rounded-2xl p-4 anim-fadeup"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        animationDelay: "0.2s",
                    }}
                >
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Comparaciones con el número actual
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { compare: active - 1, sym: "<" },
                            { compare: active + 1, sym: ">" },
                        ].map(({ compare, sym }) => {
                            if (compare < MIN || compare > MAX) return null;
                            const c = getColor(compare);
                            return (
                                <button
                                    key={sym}
                                    onClick={() => snap(compare)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: `1px solid rgba(255,255,255,0.1)`,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                                >
                                    <span className="text-sm font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.text }}>
                                        {active > 0 ? `+${active}` : active}
                                    </span>
                                    <span className="text-base font-black text-white/40">{sym}</span>
                                    <span className="text-sm font-black" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.text }}>
                                        {compare > 0 ? `+${compare}` : compare}
                                    </span>
                                </button>
                            );
                        })}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {active > 0
                                    ? `Está ${active} unidad${active !== 1 ? "es" : ""} a la derecha del 0`
                                    : active < 0
                                        ? `Está ${Math.abs(active)} unidad${Math.abs(active) !== 1 ? "es" : ""} a la izquierda del 0`
                                        : "Es el punto de origen"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Fact card ── */}
                <div
                    className="rounded-2xl px-4 py-4 flex items-start gap-3 anim-fadeup overflow-hidden"
                    style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        minHeight: 72,
                        transition: "background .5s, border-color .5s",
                        animationDelay: "0.25s",
                    }}
                >
                    <span className="text-xl mt-0.5 shrink-0">{label.emoji}</span>
                    <p
                        key={`${factIdx}-${factKey}`}
                        className="fact-anim text-sm font-semibold leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.8)", margin: 0 }}
                    >
                        {currentFacts[factIdx]}
                    </p>
                </div>

                {/* ── Mini legend ── */}
                <div className="flex justify-center gap-6 anim-fadeup" style={{ animationDelay: "0.3s" }}>
                    {[
                        { color: "#60a5fa", label: "Negativo (−)", sub: "izquierda" },
                        { color: "#e5e7eb", label: "Cero (0)", sub: "origen" },
                        { color: "#f87171", label: "Positivo (+)", sub: "derecha" },
                    ].map(({ color, label: lbl, sub }) => (
                        <div key={lbl} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <div>
                                <span className="text-xs font-bold text-white">{lbl}</span>
                                <span className="text-xs ml-1 font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                    Arrastra la recta · Toca un punto · Usa los botones de acceso rápido
                </p>
            </main>
        </div>
    );
}