import React, { useState, useRef, useCallback, useEffect } from 'react';
import Draggable from 'react-draggable';
import { useNavigate } from 'react-router-dom';
import ModalHelp from '../components/ModalHelp';

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayMode = 'fractions' | 'decimals' | 'percentages';

interface Fraction {
    id: string;
    numerator: number;
    denominator: number;
    color: string;
    x: number;
    y: number;
}

interface ContainerSize {
    width: number;
    height: number;
}

interface Position {
    x: number;
    y: number;
}

interface SnapTarget {
    id: string;
    side: 'left' | 'right' | 'top' | 'bottom';
}

interface FractionBarProps {
    fraction: Fraction;
    displayMode: DisplayMode;
    containerWidth: number;
    onDragStart: () => void;
    onDrag: (pos: Position) => void;
    onDragStop: (pos: Position) => void;
    onDuplicate: () => void;
    onLongPressDelete: () => void;
    snapTarget: SnapTarget | null;
    isSnapping: boolean;
}

interface GuideLinesProps {
    containerHeight: number;
    containerWidth: number;
    show: boolean;
}

interface ToolbarProps {
    displayMode: DisplayMode;
    onDisplayMode: (mode: DisplayMode) => void;
    onAdd: () => void;
    onDelete: () => void;
    onReset: () => void;
    fractionCount: number;
}

interface RegletaFracionesCanvasProps {
    fractions: Fraction[];
    displayMode: DisplayMode;
    onDragStart: (id: string) => void;
    onDrag: (id: string, pos: Position) => void;
    onDragStop: (id: string, pos: Position) => void;
    onDuplicate: (fraction: Fraction, containerWidth: number) => void;
    onDeleteById: (id: string) => void;
    draggingId: string | null;
    snapTargetMap: Record<string, SnapTarget | null>;
    onContainerWidth: (w: number) => void;
    scrollWrapperRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS: string[] = [
    'bg-fuchsia-500',
    'bg-lime-500',
    'bg-red-400',
    'bg-yellow-300',
    'bg-blue-400',
    'bg-pink-400',
    'bg-purple-400',
    'bg-green-400',
    'bg-cyan-400',
    'bg-amber-400',
    'bg-orange-400',
    'bg-teal-400',
    'bg-rose-400',
    'bg-sky-400',
    'bg-emerald-400',
    'bg-violet-400',
];

/** Height in px of each fraction bar row */
const ROW_HEIGHT = 56;

/** Gap between bar and row boundary (top/bottom padding) */
const BAR_GAP = 4;

/** Actual bar height = ROW_HEIGHT - BAR_GAP (1 gap, bar sits flush top) */
const BAR_HEIGHT = ROW_HEIGHT - BAR_GAP;

/**
 * Width of fraction 1/1 as a percentage of container.
 * Reduced so users can move it horizontally.
 */
const WHOLE_WIDTH_PERCENT = 52;

/**
 * Snap thresholds — separate for each axis so diagonal drags
 * don't accidentally trigger snapping on the wrong axis.
 */
const SNAP_THRESHOLD_MAIN = 24;   // along the joining axis
const SNAP_THRESHOLD_CROSS = 20;  // perpendicular alignment tolerance

const INITIAL_FRACTIONS: Fraction[] = [
    { id: 'f1', numerator: 1, denominator: 1, color: 'bg-fuchsia-500', x: 0, y: 0 },
    { id: 'f2', numerator: 1, denominator: 2, color: 'bg-lime-500', x: 0, y: ROW_HEIGHT },
    { id: 'f3', numerator: 1, denominator: 3, color: 'bg-red-400', x: 0, y: ROW_HEIGHT * 2 },
    { id: 'f4', numerator: 1, denominator: 4, color: 'bg-yellow-300', x: 0, y: ROW_HEIGHT * 3 },
    { id: 'f5', numerator: 1, denominator: 5, color: 'bg-blue-400', x: 0, y: ROW_HEIGHT * 4 },
    { id: 'f6', numerator: 1, denominator: 6, color: 'bg-pink-400', x: 0, y: ROW_HEIGHT * 5 },
    { id: 'f7', numerator: 1, denominator: 7, color: 'bg-purple-400', x: 0, y: ROW_HEIGHT * 6 },
    { id: 'f8', numerator: 1, denominator: 8, color: 'bg-green-400', x: 0, y: ROW_HEIGHT * 7 },
    { id: 'f9', numerator: 1, denominator: 9, color: 'bg-cyan-400', x: 0, y: ROW_HEIGHT * 8 },
    { id: 'f10', numerator: 1, denominator: 10, color: 'bg-amber-400', x: 0, y: ROW_HEIGHT * 9 },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Computes the pixel width of a fraction bar given container width.
 */
function barPixelWidth(denominator: number, containerWidth: number): number {
    const pct = denominator === 1 ? WHOLE_WIDTH_PERCENT : WHOLE_WIDTH_PERCENT / denominator;
    return Math.round((containerWidth * pct) / 100);
}

/**
 * Improved snap: uses separate thresholds for the main axis (joining edge)
 * and cross axis (alignment). This prevents false positives on diagonal drags
 * and works consistently regardless of screen size because all distances are
 * computed in the same pixel space as the bars themselves.
 *
 * For horizontal snaps (left/right): main axis = X gap, cross axis = Y alignment.
 * For vertical snaps (top/bottom):   main axis = Y gap, cross axis = X alignment.
 */
function computeSnapTarget(
    dragged: Fraction,
    others: Fraction[],
    containerWidth: number,
): SnapTarget | null {
    const dW = barPixelWidth(dragged.denominator, containerWidth);

    let best: SnapTarget | null = null;
    let bestScore = Infinity;

    for (const other of others) {
        if (other.id === dragged.id) continue;
        const oW = barPixelWidth(other.denominator, containerWidth);

        // ── Horizontal candidates ────────────────────────────────────────────
        // Main axis: gap between edges on X
        // Cross axis: Y alignment (top edges aligned)

        const yDiff = Math.abs(dragged.y - other.y);   // cross axis for horizontal snap

        if (yDiff <= SNAP_THRESHOLD_CROSS) {
            // dragged snaps to right of other (dragged.x ≈ other.x + oW)
            const gapRight = Math.abs(dragged.x - (other.x + oW));
            if (gapRight <= SNAP_THRESHOLD_MAIN) {
                const score = gapRight + yDiff * 0.5;
                if (score < bestScore) { bestScore = score; best = { id: other.id, side: 'left' }; }
            }

            // dragged snaps to left of other (dragged.x + dW ≈ other.x)
            const gapLeft = Math.abs((dragged.x + dW) - other.x);
            if (gapLeft <= SNAP_THRESHOLD_MAIN) {
                const score = gapLeft + yDiff * 0.5;
                if (score < bestScore) { bestScore = score; best = { id: other.id, side: 'right' }; }
            }
        }

        // ── Vertical candidates ──────────────────────────────────────────────
        // Main axis: gap between edges on Y
        // Cross axis: X alignment (left edges aligned)

        const xDiff = Math.abs(dragged.x - other.x);   // cross axis for vertical snap

        if (xDiff <= SNAP_THRESHOLD_CROSS) {
            // dragged snaps below other (dragged.y ≈ other.y + BAR_HEIGHT + BAR_GAP)
            const gapBelow = Math.abs(dragged.y - (other.y + BAR_HEIGHT + BAR_GAP));
            if (gapBelow <= SNAP_THRESHOLD_MAIN) {
                const score = gapBelow + xDiff * 0.5;
                if (score < bestScore) { bestScore = score; best = { id: other.id, side: 'top' }; }
            }

            // dragged snaps above other (dragged.y + BAR_HEIGHT + BAR_GAP ≈ other.y)
            const gapAbove = Math.abs((dragged.y + BAR_HEIGHT + BAR_GAP) - other.y);
            if (gapAbove <= SNAP_THRESHOLD_MAIN) {
                const score = gapAbove + xDiff * 0.5;
                if (score < bestScore) { bestScore = score; best = { id: other.id, side: 'bottom' }; }
            }
        }
    }
    return best;
}

/**
 * Computes exact snapped position — zero gap for horizontal, BAR_GAP for vertical
 * so bars sit flush against each other without visible gaps.
 */
function snapPosition(
    dragged: Fraction,
    target: Fraction,
    side: 'left' | 'right' | 'top' | 'bottom',
    containerWidth: number,
): Position {
    const dW = barPixelWidth(dragged.denominator, containerWidth);
    const tW = barPixelWidth(target.denominator, containerWidth);

    switch (side) {
        case 'left':
            // Place dragged immediately to the right of target — no gap
            return { x: target.x + tW, y: target.y };
        case 'right':
            // Place dragged immediately to the left of target — no gap
            return { x: target.x - dW, y: target.y };
        case 'top':
            // Place dragged below target: target.y + BAR_HEIGHT + BAR_GAP
            return { x: target.x, y: target.y + BAR_HEIGHT + BAR_GAP };
        case 'bottom':
            // Place dragged above target
            return { x: target.x, y: target.y - BAR_HEIGHT - BAR_GAP };
        default:
            return { x: dragged.x, y: dragged.y };
    }
}

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

/**
 * Double-tap detector for touch events.
 */
function useDoubleTouch(onDoubleTouch: () => void): () => void {
    const touchCount = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    return useCallback(() => {
        touchCount.current += 1;
        if (touchCount.current === 1) {
            timer.current = setTimeout(() => {
                touchCount.current = 0;
            }, 300);
        } else if (touchCount.current === 2) {
            if (timer.current) clearTimeout(timer.current);
            touchCount.current = 0;
            onDoubleTouch();
        }
    }, [onDoubleTouch]);
}

/**
 * Persists and hydrates state from localStorage.
 */
function useLocalStorage<T>(
    key: string,
    initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? (JSON.parse(stored) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    }, [key, value]);

    return [value, setValue];
}

/**
 * Observes an element's size via ResizeObserver.
 * Returns stable size object, only updates when dimensions actually change.
 */
function useElementSize(ref: React.RefObject<HTMLElement | null>): ContainerSize {
    const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = (w: number, h: number) => {
            setSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
        };
        const obs = new ResizeObserver(([entry]) => {
            update(entry.contentRect.width, entry.contentRect.height);
        });
        obs.observe(el);
        update(el.clientWidth, el.clientHeight);
        return () => obs.disconnect();
    }, [ref]);
    return size;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Single draggable fraction bar.
 */
const FractionBar = React.memo(function FractionBar({
    fraction,
    displayMode,
    onDragStart,
    onDrag,
    onDragStop,
    onDuplicate,
    onLongPressDelete,
    snapTarget,
    isSnapping,
}: FractionBarProps) {
    const nodeRef = useRef<HTMLDivElement>(null);
    const handleDoubleTouch = useDoubleTouch(onDuplicate);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStartPosRef = useRef<Position>({ x: 0, y: 0 });
    const [isLongPressing, setIsLongPressing] = useState(false);

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        };
    }, []);

    const widthPct = fraction.denominator === 1
        ? WHOLE_WIDTH_PERCENT
        : WHOLE_WIDTH_PERCENT / fraction.denominator;

    const renderValue = (): React.ReactNode => {
        const val = fraction.numerator / fraction.denominator;
        switch (displayMode) {
            case 'decimals':
                return <span className="text-xs font-bold tabular-nums">{val.toFixed(2)}</span>;
            case 'percentages':
                return <span className="text-xs font-bold tabular-nums">{(val * 100).toFixed(0)}%</span>;
            default:
                return (
                    <div className="flex flex-col items-center leading-none select-none gap-0.5">
                        <span className="text-xs font-extrabold">{fraction.numerator}</span>
                        <div className="w-3.5 border-t-2 border-gray-800" />
                        <span className="text-xs font-extrabold">{fraction.denominator}</span>
                    </div>
                );
        }
    };

    const hasSnapTarget = !!snapTarget;

    return (
        <Draggable
            nodeRef={nodeRef}
            bounds="parent"
            position={{ x: fraction.x, y: fraction.y }}
            onStart={() => {
                onDragStart();
                pressStartPosRef.current = { x: fraction.x, y: fraction.y };
                setIsLongPressing(true);
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = setTimeout(() => {
                    setIsLongPressing(false);
                    longPressTimerRef.current = null;
                    onLongPressDelete();
                }, 3000);
            }}
            onDrag={(_e, data) => {
                const dx = data.x - pressStartPosRef.current.x;
                const dy = data.y - pressStartPosRef.current.y;
                if (Math.sqrt(dx * dx + dy * dy) > 5) {
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                    setIsLongPressing(false);
                }
                onDrag({ x: data.x, y: data.y });
            }}
            onStop={(_e, data) => {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                setIsLongPressing(false);
                onDragStop({ x: data.x, y: data.y });
            }}
        >
            <div
                ref={nodeRef}
                title="Doble clic para duplicar · Mantén 3s para eliminar"
                className={`
          absolute cursor-grab active:cursor-grabbing
          ${fraction.color}
          flex items-center justify-center
          border-2 ${isLongPressing ? 'border-red-500 border-solid' : hasSnapTarget ? 'border-white border-dashed' : 'border-gray-700'}
          select-none touch-none
          fraction-bar
          ${isSnapping ? 'snapping' : ''}
          ${isLongPressing ? 'long-pressing' : ''}
        `}
                style={{
                    width: `${widthPct}%`,
                    height: `${BAR_HEIGHT}px`,
                    minWidth: 28,
                    zIndex: isSnapping || hasSnapTarget ? 40 : 1,
                    transition: isSnapping
                        ? 'left 0.18s cubic-bezier(.22,.68,0,1.2), top 0.18s cubic-bezier(.22,.68,0,1.2), box-shadow 0.15s'
                        : 'box-shadow 0.15s',
                }}
                onDoubleClick={onDuplicate}
                onTouchStart={handleDoubleTouch}
            >
                {renderValue()}
                {hasSnapTarget && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border border-blue-400 animate-pulse" />
                )}
                {isLongPressing && (
                    <div className="absolute inset-0 bg-red-500/25 rounded-sm flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-red-800 bg-white/90 px-1.5 py-0.5 rounded-md shadow">No soltar para eliminar</span>
                    </div>
                )}
            </div>
        </Draggable>
    );
});

/**
 * Guide rule overlay shown while dragging.
 */
function GuideLines({ containerHeight, containerWidth, show }: GuideLinesProps) {
    if (!show || containerWidth === 0) return null;
    const hLines: React.ReactNode[] = [];
    const vLines: React.ReactNode[] = [];
    const rows = Math.ceil(containerHeight / ROW_HEIGHT);
    for (let i = 1; i <= rows; i++) {
        hLines.push(
            <line
                key={`h${i}`}
                x1={0} y1={i * ROW_HEIGHT}
                x2={containerWidth} y2={i * ROW_HEIGHT}
                stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"
            />
        );
    }
    for (let i = 1; i <= 20; i++) {
        const x = (containerWidth * i) / 20;
        vLines.push(
            <line
                key={`v${i}`}
                x1={x} y1={0}
                x2={x} y2={containerHeight}
                stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"
            />
        );
    }
    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={containerWidth}
            height={containerHeight}
        >
            {hLines}
            {vLines}
        </svg>
    );
}

/**
 * Toolbar with all buttons in a single row.
 */
function Toolbar({ displayMode, onDisplayMode, onAdd, onDelete, onReset, fractionCount }: ToolbarProps) {
    const buttons: Array<{
        key: string;
        label: string;
        cls: string;
        action: () => void;
        disabled?: boolean;
        isMode?: boolean;
        active?: boolean;
    }> = [
            {
                key: 'fractions',
                label: '½',
                cls: 'bg-blue-500 hover:bg-blue-600',
                action: () => onDisplayMode('fractions'),
                isMode: true,
                active: displayMode === 'fractions',
            },
            {
                key: 'decimals',
                label: '0.5',
                cls: 'bg-emerald-500 hover:bg-emerald-600',
                action: () => onDisplayMode('decimals'),
                isMode: true,
                active: displayMode === 'decimals',
            },
            {
                key: 'percentages',
                label: '50%',
                cls: 'bg-yellow-500 hover:bg-yellow-600',
                action: () => onDisplayMode('percentages'),
                isMode: true,
                active: displayMode === 'percentages',
            },
            {
                key: 'add',
                label: '＋',
                cls: 'bg-purple-500 hover:bg-purple-600',
                action: onAdd,
            },
            {
                key: 'delete',
                label: '－',
                cls: 'bg-red-500 hover:bg-red-600',
                action: onDelete,
                disabled: fractionCount <= 1,
            },
            {
                key: 'reset',
                label: '↺',
                cls: 'bg-gray-500 hover:bg-gray-600',
                action: onReset,
            },
        ];

    return (
        <div className="flex gap-3 w-full mb-1">
            {buttons.map(({ key, label, cls, action, disabled, isMode, active }) => (
                <button
                    key={key}
                    onClick={action}
                    disabled={disabled}
                    aria-pressed={isMode ? active : undefined}
                    title={
                        key === 'fractions' ? 'Mostrar como fracción' :
                            key === 'decimals' ? 'Mostrar como decimal' :
                                key === 'percentages' ? 'Mostrar como porcentaje' :
                                    key === 'add' ? 'Agregar fracción' :
                                        key === 'delete' ? 'Eliminar última fracción' :
                                            'Reiniciar'
                    }
                    className={`
            flex-1 py-1.5 rounded-xl text-white font-bold text-sm
            transition-all duration-150 ${cls}
            ${active ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-100 shadow-md scale-[1.05]' : 'opacity-80'}
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
          `}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/**
 * Canvas containing all fraction bars.
 *
 * Height strategy:
 *  - The canvas always fills the available wrapper height (height: 100%).
 *  - minHeight is set to the tallest bar position + padding, so when bars
 *    exceed the visible area the wrapper can scroll to reach them.
 *  - On large screens the canvas simply fills all the space with no scroll.
 */
function RegletaFracionesCanvas({
    fractions,
    displayMode,
    onDragStart,
    onDrag,
    onDragStop,
    onDuplicate,
    onDeleteById,
    draggingId,
    snapTargetMap,
    onContainerWidth,
    scrollWrapperRef,
}: RegletaFracionesCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: cW, height: cH } = useElementSize(containerRef);

    // Report live container width upward so snap math stays accurate
    useEffect(() => {
        if (cW > 0) onContainerWidth(cW);
    }, [cW, onContainerWidth]);

    // ── Three-finger scroll ──────────────────────────────────────────────────
    // Attach to the canvas itself so the gesture works anywhere inside it.
    // When 3 fingers are detected we forward scroll to the wrapper and
    // suppress the default behaviour so draggable doesn't also fire.
    const threeFingerRef = useRef<{ startY: number; scrollStart: number } | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 3) {
                const wrapper = scrollWrapperRef.current;
                threeFingerRef.current = {
                    startY: (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3,
                    scrollStart: wrapper ? wrapper.scrollTop : 0,
                };
            } else {
                threeFingerRef.current = null;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 3 || !threeFingerRef.current) return;
            e.preventDefault(); // block drag
            const currentY = (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3;
            const delta = threeFingerRef.current.startY - currentY;
            const wrapper = scrollWrapperRef.current;
            if (wrapper) {
                wrapper.scrollTop = threeFingerRef.current.scrollStart + delta;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 3) threeFingerRef.current = null;
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [scrollWrapperRef]);
    // ────────────────────────────────────────────────────────────────────────

    const isDragging = draggingId !== null;

    // Canvas must be at least as tall as the lowest bar so it's always reachable
    const minCanvasHeight = fractions.reduce(
        (max, f) => Math.max(max, f.y + ROW_HEIGHT + 24),
        INITIAL_FRACTIONS.length * ROW_HEIGHT + 32,
    );

    return (
        <div
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden bg-white border-2 border-gray-200"
            style={{
                touchAction: 'none',
                // Fill the wrapper on large screens; grow for extra bars on small screens
                height: '100%',
                minHeight: minCanvasHeight,
            }}
        >
            {/* Graph paper background */}
            {cW > 0 && (
                <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                    <defs>
                        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                        </pattern>
                        <pattern id="grid" width={cW / 10} height={ROW_HEIGHT} patternUnits="userSpaceOnUse">
                            <rect width={cW / 10} height={ROW_HEIGHT} fill="url(#smallGrid)" />
                            <path d={`M ${cW / 10} 0 L 0 0 0 ${ROW_HEIGHT}`} fill="none" stroke="#d1d5db" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            )}

            <GuideLines containerHeight={cH} containerWidth={cW} show={isDragging} />

            {fractions.map((fraction) => {
                const snap = snapTargetMap[fraction.id] ?? null;
                const isActive = fraction.id === draggingId;
                return (
                    <FractionBar
                        key={fraction.id}
                        fraction={fraction}
                        displayMode={displayMode}
                        containerWidth={cW}
                        onDragStart={() => onDragStart(fraction.id)}
                        onDrag={(pos) => onDrag(fraction.id, pos)}
                        onDragStop={(pos) => onDragStop(fraction.id, pos)}
                        onDuplicate={() => onDuplicate(fraction, cW)}
                        onLongPressDelete={() => onDeleteById(fraction.id)}
                        snapTarget={snap}
                        isSnapping={isActive && !!snap}
                    />
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RegletaFraciones = (): React.ReactElement => {
    const [fractions, setFractions] = useLocalStorage<Fraction[]>(
        'regletaFraciones_v3_fractions',
        INITIAL_FRACTIONS,
    );
    const [displayMode, setDisplayMode] = useLocalStorage<DisplayMode>(
        'regletaFraciones_v3_mode',
        'fractions',
    );

    const [draggingId, setDraggingId] = useState<string | null>(null);

    /**
     * Live container width, updated whenever the canvas resizes.
     * Stored in a ref so drag handlers always read the current value
     * without needing to re-create callbacks.
     */
    const containerWidthRef = useRef<number>(0);
    const scrollWrapperRef = useRef<HTMLDivElement>(null);

    const handleContainerWidth = useCallback((w: number) => {
        containerWidthRef.current = w;
    }, []);

    /**
     * Map of fractionId → current snap target while dragging.
     */
    const [snapTargetMap, setSnapTargetMap] = useState<Record<string, SnapTarget | null>>({});

    // ── Actions ──────────────────────────────────────────────────────────────

    const addFraction = useCallback(() => {
        const nextDenom = fractions.reduce((max, f) => Math.max(max, f.denominator), 0) + 1;
        const lastY = fractions.reduce((max, f) => Math.max(max, f.y), 0);
        const newF: Fraction = {
            id: `f${Date.now()}`,
            numerator: 1,
            denominator: nextDenom,
            color: COLORS[(nextDenom - 1) % COLORS.length],
            x: 0,
            y: lastY + ROW_HEIGHT,
        };
        setFractions((prev) => [...prev, newF]);
    }, [fractions, setFractions]);

    const deleteFraction = useCallback(() => {
        if (fractions.length <= 1) return;
        setFractions((prev) => prev.slice(0, -1));
    }, [fractions.length, setFractions]);

    const handleDeleteById = useCallback((id: string) => {
        setFractions((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((f) => f.id !== id);
        });
        setDraggingId((prev) => prev === id ? null : prev);
        setSnapTargetMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, [setFractions]);

    const resetFractions = useCallback(() => {
        setFractions(INITIAL_FRACTIONS);
        setSnapTargetMap({});
    }, [setFractions]);

    const handleDragStart = useCallback((id: string) => {
        setDraggingId(id);
    }, []);

    const handleDrag = useCallback((id: string, pos: Position) => {
        // Use functional update to get latest fractions without stale closure
        setFractions((prev) => {
            const dragged = prev.find((f) => f.id === id);
            if (!dragged) return prev;
            const cW = containerWidthRef.current;
            if (cW === 0) return prev;
            const snap = computeSnapTarget({ ...dragged, ...pos }, prev, cW);
            setSnapTargetMap((m) => {
                // Avoid re-render if snap target hasn't changed
                const existing = m[id];
                if (existing?.id === snap?.id && existing?.side === snap?.side) return m;
                return { ...m, [id]: snap };
            });
            return prev; // don't update positions during drag — Draggable handles it
        });
    }, [setFractions]);

    const handleDragStop = useCallback((id: string, pos: Position) => {
        setDraggingId(null);
        setFractions((prev) => {
            const dragged = prev.find((f) => f.id === id);
            if (!dragged) return prev;
            const cW = containerWidthRef.current;
            const snap = cW > 0 ? computeSnapTarget({ ...dragged, ...pos }, prev, cW) : null;
            let finalPos: Position = pos;
            if (snap) {
                const target = prev.find((f) => f.id === snap.id);
                if (target) {
                    finalPos = snapPosition(dragged, target, snap.side, cW);
                }
            }
            setSnapTargetMap((m) => ({ ...m, [id]: null }));
            return prev.map((f) => (f.id === id ? { ...f, ...finalPos } : f));
        });
    }, [setFractions]);

    const handleDuplicate = useCallback((fraction: Fraction, containerWidth: number) => {
        const pW = barPixelWidth(fraction.denominator, containerWidth);
        const maxX = containerWidth - pW;
        const candidateX = fraction.x + pW;
        const newX = candidateX <= maxX ? candidateX : 0;
        const newY = candidateX <= maxX ? fraction.y : fraction.y + ROW_HEIGHT;

        const newF: Fraction = {
            ...fraction,
            id: `${fraction.id}-copy-${Date.now()}`,
            x: Math.max(0, Math.min(newX, maxX)),
            y: newY,
        };
        setFractions((prev) => [...prev, newF]);
    }, [setFractions]);

    const navigate = useNavigate();
    const [showHelp, setShowHelp] = useState(false);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            className="flex flex-col w-full bg-gray-50 font-sans"
            style={{
                height: '100dvh',
                overflow: 'hidden',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; height: 100%; overflow: hidden; }
        .fraction-bar {
          will-change: transform;
          user-select: none;
          -webkit-user-select: none;
        }
        .fraction-bar:active {
          box-shadow: 0 6px 20px rgba(0,0,0,0.22);
          z-index: 50 !important;
        }
        .snapping {
          outline: 2.5px solid #3b82f6;
          outline-offset: 2px;
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.75) translateY(6px); }
          75%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .pop-in { animation: popIn 0.28s ease-out both; }
        .long-pressing {
          animation: longPressPulse 0.8s ease-in-out infinite;
        }
        @keyframes longPressPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 14px 4px rgba(239, 68, 68, 0.6); }
        }
      `}</style>

            {/* ── Header ── */}
            <div className="relative flex items-center justify-center px-2 pt-2 pb-0.5 bg-gray-50 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 text-xs font-semibold shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
                    title="Volver"
                >
                    ← Volver
                </button>

                <div className="text-center">
                    <h1 className="text-base md:text-lg font-extrabold text-gray-800 leading-tight">
                        Regleta de Fracciones
                    </h1>
                    <p className="text-gray-400 text-xs">
                        Doble clic para duplicar · Mantén 3s para eliminar · 3 dedos para hacer scroll
                    </p>
                </div>
                <button
                    onClick={() => setShowHelp(true)}
                    className="absolute right-2 w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
                >
                    ?
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className="px-2 pt-1 pb-1 bg-gray-50 shrink-0">
                <Toolbar
                    displayMode={displayMode}
                    onDisplayMode={(m) => setDisplayMode(m)}
                    onAdd={addFraction}
                    onDelete={deleteFraction}
                    onReset={resetFractions}
                    fractionCount={fractions.length}
                />
            </div>

            {/* ── Canvas wrapper ─────────────────────────────────────────────────────
                flex-1 + min-h-0 makes it fill all remaining vertical space.
                overflow-y: auto  → no scroll on large screens (canvas fills 100%);
                                    scroll appears only when minHeight > wrapper height.
                The canvas receives the ref so three-finger touch can scroll it.
            ── */}
            <div
                ref={scrollWrapperRef}
                className="flex-1 min-h-0 px-2 pb-2"
                style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
                <RegletaFracionesCanvas
                    fractions={fractions}
                    displayMode={displayMode}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragStop={handleDragStop}
                    onDuplicate={handleDuplicate}
                    onDeleteById={handleDeleteById}
                    draggingId={draggingId}
                    snapTargetMap={snapTargetMap}
                    onContainerWidth={handleContainerWidth}
                    scrollWrapperRef={scrollWrapperRef}
                />
            </div>

            {/* ── Footer ── */}
            <div className="text-center text-gray-400 text-xs pb-1.5 shrink-0">
                {fractions.length} barra{fractions.length !== 1 ? 's' : ''} en la regleta
            </div>

            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo usar la regleta de fracciones?"
                bgColor="#f9fafb"
                titleColor="#1f2937"
                buttonColor="bg-purple-500 hover:bg-purple-400"
            >
                <ol className="space-y-3 text-gray-600 text-sm leading-relaxed list-decimal list-inside">
                    <li>
                        <strong className="text-gray-800">Arrastra</strong> las barras de fracción para moverlas libremente dentro del lienzo.
                    </li>
                    <li>
                        Las barras se <strong className="text-blue-500">acoplan magnéticamente</strong> cuando las acercas a otra barra.
                    </li>
                    <li>
                        Haz <strong className="text-gray-800">doble clic</strong> (o doble toque) en una barra para <strong>duplicarla</strong>.
                    </li>
                    <li>
                        <strong className="text-red-500">Mantén presionado 3 segundos</strong> sin mover para eliminar una barra.
                    </li>
                    <li>
                        Usa los botones <strong className="text-purple-500">＋</strong> y <strong className="text-red-500">－</strong> para agregar o quitar fracciones.
                    </li>
                    <li>
                        Cambia la vista entre <strong className="text-blue-500">fracción</strong>, <strong className="text-emerald-500">decimal</strong> y <strong className="text-yellow-500">porcentaje</strong> con los botones del modo.
                    </li>
                    <li>
                        Compara visualmente el tamaño de las fracciones acomodándolas una debajo de otra.
                    </li>
                    <li>
                        En pantallas táctiles, usa <strong className="text-gray-800">3 dedos</strong> para hacer scroll vertical dentro del lienzo sin mover las barras.
                    </li>
                </ol>
            </ModalHelp>
        </div>
    );
};

export default RegletaFraciones;