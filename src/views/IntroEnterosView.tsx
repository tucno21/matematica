import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_TEMP = -20;
const MAX_TEMP = 30;
const BULB_D = 56;   // bulb diameter px
const STEM_H = 300;  // draggable stem height px
const THERMO_H = STEM_H + BULB_D;

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
    if (temp > 0) return { primary: "#ff6b6b", secondary: "#ff4444", glow: "rgba(255,100,100,0.4)" };
    if (temp < 0) return { primary: "#74b9ff", secondary: "#0984e3", glow: "rgba(100,160,255,0.4)" };
    return { primary: "#a8a8b3", secondary: "#636e72", glow: "rgba(168,168,179,0.4)" };
};

const getFactKey = (temp: number): FactKey => {
    if (temp > 0) return "positive";
    if (temp < 0) return "negative";
    return "zero";
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const FACTS: Record<FactKey, string[]> = {
    positive: [
        "Temperatura sobre 0°C → número positivo (+)",
        "Los números positivos se escriben con + o sin signo",
        "Ejemplo: +15°C es quince grados sobre cero",
    ],
    zero: [
        "0°C es el punto de congelación del agua",
        "El cero no es positivo ni negativo",
        "¡El cero es el origen de la recta numérica!",
    ],
    negative: [
        "Temperatura bajo 0°C → número negativo (−)",
        "Los números negativos siempre llevan el signo −",
        "Ejemplo: −8°C es ocho grados BAJO cero",
    ],
};

const LEGEND_ITEMS = [
    { color: "#ff6b6b", label: "Positivo (+)", sub: "mayor que 0" },
    { color: "#a8a8b3", label: "Cero (0)", sub: "origen" },
    { color: "#74b9ff", label: "Negativo (−)", sub: "menor que 0" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function TermometroEnteros() {
    const navigate = useNavigate();

    const [temperature, setTemperature] = useState<number>(15);
    const [dragging, setDragging] = useState<boolean>(false);
    const [factIdx, setFactIdx] = useState<number>(0);

    const stemRef = useRef<HTMLDivElement>(null);

    const colors: TempColor = getTempColor(temperature);
    const range: number = MAX_TEMP - MIN_TEMP;
    const factKey: FactKey = getFactKey(temperature);
    const fillPct: number = ((temperature - MIN_TEMP) / range) * 100;

    const currentFacts: string[] = FACTS[factKey];

    const typeLabel: TypeLabel =
        temperature > 0
            ? { text: "POSITIVO", sign: "+", sub: "Mayor que cero" }
            : temperature < 0
                ? { text: "NEGATIVO", sign: "−", sub: "Menor que cero" }
                : { text: "CERO", sign: "0", sub: "Punto de congelación" };

    // ── Reset fact index when sign changes ──
    useEffect(() => { setFactIdx(0); }, [factKey]);

    // ── Rotate facts ──
    useEffect(() => {
        const id = setInterval(
            () => setFactIdx(i => (i + 1) % currentFacts.length),
            3200,
        );
        return () => clearInterval(id);
    }, [factKey, currentFacts.length]);

    // ── Drag: compute temperature from pointer Y inside the stem ──
    const tempFromMouseEvent = useCallback(
        (e: MouseEvent | React.MouseEvent): number | undefined => {
            if (!stemRef.current) return undefined;
            const rect = stemRef.current.getBoundingClientRect();
            const ratio = 1 - (e.clientY - rect.top) / rect.height;
            const clamped = Math.max(0, Math.min(1, ratio));
            return Math.round(clamped * range + MIN_TEMP);
        },
        [range],
    );

    const tempFromTouchEvent = useCallback(
        (e: TouchEvent | React.TouchEvent): number | undefined => {
            if (!stemRef.current) return undefined;
            const rect = stemRef.current.getBoundingClientRect();
            const clientY = e.touches[0].clientY;
            const ratio = 1 - (clientY - rect.top) / rect.height;
            const clamped = Math.max(0, Math.min(1, ratio));
            return Math.round(clamped * range + MIN_TEMP);
        },
        [range],
    );

    const handleStemMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>): void => {
            setDragging(true);
            const t = tempFromMouseEvent(e);
            if (t !== undefined) setTemperature(t);
        },
        [tempFromMouseEvent],
    );

    const handleStemTouchStart = useCallback(
        (e: React.TouchEvent<HTMLDivElement>): void => {
            setDragging(true);
            const t = tempFromTouchEvent(e);
            if (t !== undefined) setTemperature(t);
        },
        [tempFromTouchEvent],
    );

    // ── Global move / up listeners while dragging ──
    useEffect(() => {
        if (!dragging) return;

        const onMouseMove = (e: MouseEvent): void => {
            const t = tempFromMouseEvent(e);
            if (t !== undefined) setTemperature(t);
        };
        const onTouchMove = (e: TouchEvent): void => {
            const t = tempFromTouchEvent(e);
            if (t !== undefined) setTemperature(t);
        };
        const onUp = (): void => setDragging(false);

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onUp);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onUp);
        };
    }, [dragging, tempFromMouseEvent, tempFromTouchEvent]);

    // ── Build tick marks ──
    const ticks: TickMark[] = [];
    for (let t = MIN_TEMP; t <= MAX_TEMP; t += 5) {
        ticks.push({
            t,
            pct: ((t - MIN_TEMP) / range) * 100,
            isMajor: t % 10 === 0,
            isZero: t === 0,
        });
    }

    // ─── Inline style helpers (avoids repeating long objects) ─────────────────
    const blobStyle = (pos: CSSProperties): CSSProperties => ({
        position: "fixed",
        borderRadius: "50%",
        pointerEvents: "none",
        filter: "blur(40px)",
        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        transition: "background 0.8s ease",
        ...pos,
    });

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #0d0d1a 0%, #0a1628 50%, #0d0d1a 100%)",
                fontFamily: "'Outfit', sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* ── Global styles + keyframes ── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes fadeSlide {
          0%   { opacity: 0; transform: translateY(6px);  }
          10%  { opacity: 1; transform: translateY(0);    }
          85%  { opacity: 1; transform: translateY(0);    }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1);    }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        .fact-anim   { animation: fadeSlide  3.2s ease-in-out forwards; }
        .bulb-pulse  { animation: pulseGlow  2s   ease-in-out infinite; }
        .stem-track  { cursor: ns-resize; user-select: none; -webkit-user-select: none; touch-action: none; }
        .number-display { font-family: 'Space Mono', monospace; font-weight: 700; letter-spacing: -2px; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

            {/* ── Ambient blobs ── */}
            <div style={blobStyle({ top: "10%", left: "-10%", width: "40vw", height: "40vw", opacity: 0.5 })} />
            <div style={blobStyle({ bottom: "5%", right: "-5%", width: "30vw", height: "30vw", opacity: 0.3, filter: "blur(60px)" })} />

            {/* ── Header: back button + title ── */}
            <div
                className="w-full z-10"
                style={{ maxWidth: 640, marginBottom: 32, textAlign: "center" }}
            >
                {/* Back button */}
                <div className="flex items-center mb-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                        style={{
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.6)",
                            cursor: "pointer",
                            fontFamily: "'Outfit', sans-serif",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                            e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                        }}
                    >
                        <svg
                            width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Volver</span>
                    </button>
                </div>

                <p
                    className="text-xs font-bold tracking-widest uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                >
                    Números Enteros
                </p>
                <h1
                    className="font-black m-0 leading-tight"
                    style={{ color: "#fff", fontSize: "clamp(22px,4vw,32px)" }}
                >
                    El Termómetro de los{" "}
                    <br />
                    <span style={{ color: colors.primary, transition: "color 0.5s ease" }}>
                        Enteros
                    </span>
                </h1>
            </div>

            {/* ── Main card ── */}
            <div
                className="flex items-center z-10 w-full"
                style={{
                    maxWidth: 640,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 28,
                    padding: "28px 24px",
                    gap: "clamp(24px,5vw,56px)",
                    backdropFilter: "blur(20px)",
                    boxShadow: `0 0 80px ${colors.glow}`,
                    transition: "box-shadow 0.8s ease",
                }}
            >
                {/* ════ THERMOMETER COLUMN ════ */}
                <div className="flex flex-col items-center shrink-0">

                    {/* ▲ Up button */}
                    <button
                        type="button"
                        onClick={() => setTemperature(t => Math.min(MAX_TEMP, t + 1))}
                        disabled={temperature >= MAX_TEMP}
                        className="flex items-center justify-center rounded-full mb-2.5 transition-all active:scale-90"
                        style={{
                            width: 40,
                            height: 40,
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 18,
                            fontWeight: 900,
                            opacity: temperature >= MAX_TEMP ? 0.25 : 1,
                        }}
                    >
                        ▲
                    </button>

                    {/* ── Thermometer body ── */}
                    {/*
            Coordinate system (bottom=0):
              0  …  BULB_D           → bulb circle area
              BULB_D  …  THERMO_H    → stem tube (STEM_H tall)
            Fill:   height = fillPct% of STEM_H, starts at bottom of stem
            Handle: bottom = BULB_D + (fillPct/100)*STEM_H  → always at fill top
          */}
                    <div
                        className="relative shrink-0"
                        style={{ width: 80, height: THERMO_H }}
                    >
                        {/* Tick marks */}
                        {ticks.map(({ t, pct, isMajor, isZero }: TickMark) => {
                            const bottomPx: number = BULB_D + (pct / 100) * STEM_H;
                            return (
                                <div
                                    key={t}
                                    className="absolute flex items-center"
                                    style={{
                                        right: "50%",
                                        bottom: bottomPx,
                                        transform: "translateY(50%)",
                                        gap: 3,
                                        paddingRight: 22,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'Space Mono', monospace",
                                            fontSize: isZero ? 11 : 10,
                                            fontWeight: isZero ? 700 : 400,
                                            color: isZero
                                                ? "#fff"
                                                : isMajor
                                                    ? "rgba(255,255,255,0.55)"
                                                    : "rgba(255,255,255,0.25)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {t > 0 ? `+${t}` : t}°
                                    </span>
                                    <div
                                        style={{
                                            width: isZero ? 14 : isMajor ? 10 : 6,
                                            height: isZero ? 2 : 1,
                                            background: isZero
                                                ? "#fff"
                                                : isMajor
                                                    ? "rgba(255,255,255,0.4)"
                                                    : "rgba(255,255,255,0.15)",
                                            borderRadius: 2,
                                        }}
                                    />
                                </div>
                            );
                        })}

                        {/* Stem tube */}
                        <div
                            className="absolute overflow-hidden"
                            style={{
                                bottom: BULB_D - 2,   // 2 px overlap with bulb → seamless join
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: 26,
                                height: STEM_H + 2,
                                borderRadius: "13px 13px 0 0",
                                background: "rgba(255,255,255,0.07)",
                                border: "1.5px solid rgba(255,255,255,0.12)",
                                borderBottom: "none",
                            }}
                        >
                            {/* Liquid fill */}
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: `${fillPct}%`,
                                    background: `linear-gradient(to top, ${colors.secondary}, ${colors.primary})`,
                                    transition: "height 0.15s ease, background 0.6s ease",
                                }}
                            />
                            {/* Glass shine */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 4,
                                    width: 4,
                                    height: "100%",
                                    background: "rgba(255,255,255,0.15)",
                                    borderRadius: 4,
                                    pointerEvents: "none",
                                }}
                            />
                        </div>

                        {/* Bulb */}
                        <div
                            className="bulb-pulse absolute"
                            style={{
                                bottom: 0,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: BULB_D,
                                height: BULB_D,
                                borderRadius: "50%",
                                background: `radial-gradient(circle at 35% 35%, ${colors.primary}, ${colors.secondary})`,
                                boxShadow: `0 0 28px ${colors.glow}, 0 0 10px ${colors.glow}`,
                                border: "2px solid rgba(255,255,255,0.2)",
                                transition: "background 0.6s ease, box-shadow 0.6s ease",
                                zIndex: 2,
                            }}
                        >
                            {/* Bulb shine dot */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 9,
                                    left: 10,
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: "rgba(255,255,255,0.4)",
                                    pointerEvents: "none",
                                }}
                            />
                        </div>

                        {/* Drag handle — always at the top of the liquid fill */}
                        <div
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: BULB_D + (fillPct / 100) * STEM_H,
                                transform: "translate(-50%, 50%)",
                                width: dragging ? 22 : 18,
                                height: dragging ? 22 : 18,
                                borderRadius: "50%",
                                background: `radial-gradient(circle at 35% 35%, ${colors.primary}, ${colors.secondary})`,
                                border: "2.5px solid rgba(255,255,255,0.9)",
                                boxShadow: `0 0 14px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.4)`,
                                transition: "bottom 0.15s ease, width 0.15s, height 0.15s, background 0.6s, box-shadow 0.6s",
                                zIndex: 5,
                                pointerEvents: "none",
                            }}
                        />

                        {/* Invisible drag capture overlay on stem */}
                        <div
                            ref={stemRef}
                            className="stem-track absolute"
                            onMouseDown={handleStemMouseDown}
                            onTouchStart={handleStemTouchStart}
                            style={{
                                bottom: BULB_D,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: 40,
                                height: STEM_H,
                                zIndex: 10,
                                borderRadius: 20,
                            }}
                        />
                    </div>

                    {/* ▼ Down button */}
                    <button
                        type="button"
                        onClick={() => setTemperature(t => Math.max(MIN_TEMP, t - 1))}
                        disabled={temperature <= MIN_TEMP}
                        className="flex items-center justify-center rounded-full mt-2.5 transition-all active:scale-90"
                        style={{
                            width: 40,
                            height: 40,
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 18,
                            fontWeight: 900,
                            opacity: temperature <= MIN_TEMP ? 0.25 : 1,
                        }}
                    >
                        ▼
                    </button>
                </div>

                {/* ════ INFO PANEL ════ */}
                <div className="flex flex-col flex-1 min-w-0">

                    {/* Big temperature display */}
                    <div style={{ marginBottom: 20 }}>
                        <div
                            className="number-display"
                            style={{
                                fontSize: "clamp(52px,10vw,72px)",
                                color: colors.primary,
                                transition: "color 0.5s ease",
                                lineHeight: 1,
                                marginBottom: 4,
                            }}
                        >
                            {temperature > 0 ? `+${temperature}` : temperature}°C
                        </div>

                        {/* Type badge */}
                        <div
                            className="inline-flex items-center gap-2 rounded-full"
                            style={{
                                padding: "5px 14px",
                                background: `${colors.primary}22`,
                                border: `1px solid ${colors.primary}44`,
                                transition: "all 0.5s ease",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'Space Mono', monospace",
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: colors.primary,
                                    lineHeight: 1,
                                }}
                            >
                                {typeLabel.sign}
                            </span>
                            <span
                                className="font-extrabold text-white"
                                style={{ fontSize: 13, letterSpacing: "0.1em" }}
                            >
                                {typeLabel.text}
                            </span>
                        </div>

                        <p
                            className="font-medium"
                            style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6 }}
                        >
                            {typeLabel.sub}
                        </p>
                    </div>

                    {/* Mini number line */}
                    <div
                        className="rounded-2xl mb-4"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            padding: "12px 14px",
                        }}
                    >
                        <p
                            className="font-bold uppercase tracking-widest mb-2"
                            style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        >
                            Recta numérica
                        </p>
                        <div className="relative" style={{ height: 36 }}>
                            {/* Axis */}
                            <div
                                className="absolute rounded-full"
                                style={{
                                    top: "50%",
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    background: "rgba(255,255,255,0.15)",
                                    transform: "translateY(-50%)",
                                }}
                            />
                            {/* Zero tick */}
                            <div
                                className="absolute rounded-sm"
                                style={{
                                    top: "50%",
                                    left: `${((0 - MIN_TEMP) / range) * 100}%`,
                                    transform: "translate(-50%, -50%)",
                                    width: 2,
                                    height: 16,
                                    background: "rgba(255,255,255,0.5)",
                                }}
                            />
                            {/* Labels */}
                            {([-20, -10, 0, 10, 20, 30] as number[]).map(v => (
                                <span
                                    key={v}
                                    className="absolute font-bold select-none"
                                    style={{
                                        top: "calc(50% + 12px)",
                                        left: `${((v - MIN_TEMP) / range) * 100}%`,
                                        transform: "translateX(-50%)",
                                        fontSize: 9,
                                        color: v === 0 ? "#fff" : "rgba(255,255,255,0.35)",
                                        fontFamily: "'Space Mono', monospace",
                                    }}
                                >
                                    {v}
                                </span>
                            ))}
                            {/* Active dot */}
                            <div
                                className="absolute rounded-full border-2 border-white"
                                style={{
                                    top: "50%",
                                    left: `${((temperature - MIN_TEMP) / range) * 100}%`,
                                    transform: "translate(-50%, -50%)",
                                    width: 14,
                                    height: 14,
                                    background: colors.primary,
                                    boxShadow: `0 0 10px ${colors.glow}`,
                                    transition: "left 0.2s ease, background 0.5s ease, box-shadow 0.5s",
                                    zIndex: 2,
                                }}
                            />
                        </div>
                    </div>

                    {/* Fact card */}
                    <div
                        className="flex items-center rounded-2xl overflow-hidden"
                        style={{
                            minHeight: 68,
                            padding: "12px 14px",
                            background: `${colors.primary}11`,
                            border: `1px solid ${colors.primary}30`,
                            transition: "background 0.6s, border-color 0.6s",
                        }}
                    >
                        <p
                            key={`${factIdx}-${factKey}`}
                            className="fact-anim m-0 font-medium leading-relaxed"
                            style={{ color: "rgba(255,255,255,0.82)", fontSize: 13 }}
                        >
                            💡 {currentFacts[factIdx]}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Bottom legend ── */}
            <div className="flex flex-wrap gap-5 mt-6 z-10 justify-center">
                {LEGEND_ITEMS.map(({ color, label, sub }) => (
                    <div key={label} className="flex items-center gap-2">
                        <div
                            className="rounded-full shrink-0"
                            style={{ width: 10, height: 10, background: color }}
                        />
                        <div>
                            <span className="text-xs font-bold text-white">{label}</span>
                            <span
                                className="text-xs ml-1"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                            >
                                {sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Hint ── */}
            <p
                className="text-center mt-4 z-10"
                style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}
            >
                Arrastra el termómetro · Usa los botones ▲▼ · O haz clic en el tubo
            </p>
        </div>
    );
}