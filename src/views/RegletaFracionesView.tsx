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

interface SnapResult {
    x: number;
    y: number;
    type: 'wall' | 'adjacent' | 'base-align' | 'equivalence' | 'row-rail';
    guideLineX?: number;
    targetId?: string;
    label?: string;
}

interface FractionBarProps {
    fraction: Fraction;
    displayMode: DisplayMode;
    barHeight: number;
    containerWidth: number;
    zoom: number;
    onDragStart: () => void;
    onDrag: (pos: Position) => void;
    onDragStop: (pos: Position) => void;
    onDuplicate: () => void;
    onLongPressDelete: () => void;
    snapResult: SnapResult | null;
    isSnapping: boolean;
}

interface GuideLinesProps {
    containerHeight: number;
    containerWidth: number;
    show: boolean;
    rowHeight: number;
}

interface RegletaFracionesCanvasProps {
    fractions: Fraction[];
    displayMode: DisplayMode;
    rowHeight: number;
    barHeight: number;
    pan: Position;
    zoom: number;
    onPanChange: (pan: Position) => void;
    onZoomToPoint: (targetZoom: number, clientX: number, clientY: number) => void;
    onDragStart: (id: string) => void;
    onDrag: (id: string, pos: Position) => void;
    onDragStop: (id: string, pos: Position) => void;
    onDuplicate: (fraction: Fraction, containerWidth: number) => void;
    onDeleteById: (id: string) => void;
    draggingId: string | null;
    activeSnap: SnapResult | null;
    onContainerWidth: (w: number) => void;
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

/** Height in px of each fraction bar row for desktop (>= 1024px) */
const ROW_HEIGHT_DESKTOP = 56;
/** Height in px of each fraction bar row for tablets and mobile (< 1024px) */
const ROW_HEIGHT_TABLET = 34;

/** Gap between bar and row boundary (top/bottom padding) */
const BAR_GAP = 3;

/**
 * Width of fraction 1/1 as a percentage of container.
 * 50% ensures base-10 fractions (1/10 = 5%, 1/5 = 10%, 1/2 = 25%, 1/1 = 50%)
 * align perfectly with the background grid columns.
 */
const WHOLE_WIDTH_PERCENT = 50;

/**
 * Snap thresholds:
 * - WALL: margen izquierdo inicial (X = 0)
 * - ROW: riel horizontal de fila (Y = k * rowHeight)
 * - MAIN: acople horizontal continuo (cola con cabeza)
 * - EQUIV: coincidencia de extremos derechos (equivalencia matemática)
 * - BASE: alineación de bases izquierdas compartidas
 */
const SNAP_THRESHOLD_WALL = 28;
const SNAP_THRESHOLD_ROW = 22;
const SNAP_THRESHOLD_MAIN = 24;
const SNAP_THRESHOLD_EQUIV = 20;
const SNAP_THRESHOLD_BASE = 18;

function createInitialFractions(rowH: number): Fraction[] {
    return [
        { id: 'f1', numerator: 1, denominator: 1, color: 'bg-fuchsia-500', x: 0, y: 0 },
        { id: 'f2', numerator: 1, denominator: 2, color: 'bg-lime-500', x: 0, y: rowH },
        { id: 'f3', numerator: 1, denominator: 3, color: 'bg-red-400', x: 0, y: rowH * 2 },
        { id: 'f4', numerator: 1, denominator: 4, color: 'bg-yellow-300', x: 0, y: rowH * 3 },
        { id: 'f5', numerator: 1, denominator: 5, color: 'bg-blue-400', x: 0, y: rowH * 4 },
        { id: 'f6', numerator: 1, denominator: 6, color: 'bg-pink-400', x: 0, y: rowH * 5 },
        { id: 'f7', numerator: 1, denominator: 7, color: 'bg-purple-400', x: 0, y: rowH * 6 },
        { id: 'f8', numerator: 1, denominator: 8, color: 'bg-green-400', x: 0, y: rowH * 7 },
        { id: 'f9', numerator: 1, denominator: 9, color: 'bg-cyan-400', x: 0, y: rowH * 8 },
        { id: 'f10', numerator: 1, denominator: 10, color: 'bg-amber-400', x: 0, y: rowH * 9 },
    ];
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Computes the pixel width of a fraction bar given container width.
 */
function barPixelWidth(denominator: number, containerWidth: number): number {
    const pct = denominator === 1 ? WHOLE_WIDTH_PERCENT : WHOLE_WIDTH_PERCENT / denominator;
    return Math.round((containerWidth * pct) / 100);
}

/**
 * Sistema integral de imantado de bases y equivalencias:
 * 1. Base izquierda X = 0 (punto de partida universal)
 * 2. Rieles de fila Y = k * rowHeight (nunca queda flotando a media altura)
 * 3. Acople horizontal cabeza-con-cola sin fisuras (suma visual)
 * 4. Extremo derecho de equivalencia (revelación visual de fracciones iguales)
 * 5. Base común compartida entre filas distantes
 */
function computeSnap(
    dragged: Fraction,
    pos: Position,
    others: Fraction[],
    containerWidth: number,
    rowHeight: number,
): SnapResult {
    const dW = barPixelWidth(dragged.denominator, containerWidth);

    // 1. Riel horizontal Y más cercano
    const nearestRow = Math.max(0, Math.round(pos.y / rowHeight));
    const targetRowY = nearestRow * rowHeight;
    const isNearRow = Math.abs(pos.y - targetRowY) <= SNAP_THRESHOLD_ROW;
    let snappedY = isNearRow ? targetRowY : pos.y;
    let snappedX = pos.x;

    let snapType: SnapResult['type'] = 'row-rail';
    let guideLineX: number | undefined = undefined;
    let targetId: string | undefined = undefined;
    let label: string | undefined = undefined;

    // 2. Base izquierda X = 0 (Muro inicial)
    if (pos.x <= SNAP_THRESHOLD_WALL && pos.x >= -40) {
        snappedX = 0;
        snapType = 'wall';
        guideLineX = 0;
        label = 'Base 0';
    }

    // 3. Comparar con otras barras en el lienzo
    let bestScore = Infinity;

    for (const other of others) {
        if (other.id === dragged.id) continue;
        const oW = barPixelWidth(other.denominator, containerWidth);
        const yDiff = Math.abs(pos.y - other.y);
        const isSameRow = yDiff <= SNAP_THRESHOLD_ROW;

        // 3.1 Acople horizontal secuencial en la misma fila (cabeza con cola)
        if (isSameRow) {
            // Pegado a la derecha de other: other.x + oW
            const gapRight = Math.abs(pos.x - (other.x + oW));
            if (gapRight <= SNAP_THRESHOLD_MAIN && gapRight < bestScore) {
                bestScore = gapRight;
                snappedX = other.x + oW;
                snappedY = other.y;
                snapType = 'adjacent';
                targetId = other.id;
                guideLineX = other.x + oW;
                label = 'Acoplado';
            }

            // Pegado a la izquierda de other: other.x - dW
            const gapLeft = Math.abs((pos.x + dW) - other.x);
            if (gapLeft <= SNAP_THRESHOLD_MAIN && gapLeft < bestScore) {
                bestScore = gapLeft;
                snappedX = Math.max(0, other.x - dW);
                snappedY = other.y;
                snapType = 'adjacent';
                targetId = other.id;
                guideLineX = other.x;
                label = 'Acoplado';
            }
        }

        // 3.2 Coincidencia de Extremo Derecho (Equivalencia matemática)
        const draggedRight = pos.x + dW;
        const otherRight = other.x + oW;
        const edgeDiff = Math.abs(draggedRight - otherRight);

        if (edgeDiff <= SNAP_THRESHOLD_EQUIV && edgeDiff < bestScore && snapType !== 'adjacent') {
            bestScore = edgeDiff;
            snappedX = Math.max(0, otherRight - dW);
            snapType = 'equivalence';
            targetId = other.id;
            guideLineX = otherRight;
            label = 'Equivalente';
        }

        // 3.3 Alineación de Base Izquierda (Ambas empiezan en la misma X)
        const baseDiff = Math.abs(pos.x - other.x);
        if (
            baseDiff <= SNAP_THRESHOLD_BASE &&
            baseDiff < bestScore &&
            snapType !== 'adjacent' &&
            snapType !== 'equivalence' &&
            snapType !== 'wall'
        ) {
            bestScore = baseDiff;
            snappedX = other.x;
            snapType = 'base-align';
            targetId = other.id;
            guideLineX = other.x;
            label = 'Base común';
        }
    }

    return {
        x: Math.max(0, Math.round(snappedX)),
        y: Math.max(0, Math.round(snappedY)),
        type: snapType,
        guideLineX: guideLineX !== undefined ? Math.round(guideLineX) : undefined,
        targetId,
        label,
    };
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
    barHeight,
    containerWidth,
    zoom,
    onDragStart,
    onDrag,
    onDragStop,
    onDuplicate,
    onLongPressDelete,
    snapResult,
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

    const barW = barPixelWidth(fraction.denominator, containerWidth);

    const renderValue = (): React.ReactNode => {
        const val = fraction.numerator / fraction.denominator;
        switch (displayMode) {
            case 'decimals':
                return <span className="text-[10px] lg:text-xs font-bold tabular-nums">{val.toFixed(2)}</span>;
            case 'percentages':
                return <span className="text-[10px] lg:text-xs font-bold tabular-nums">{(val * 100).toFixed(0)}%</span>;
            default:
                return (
                    <div className="flex flex-col items-center leading-none select-none gap-0.5">
                        <span className="text-[10px] lg:text-xs font-extrabold">{fraction.numerator}</span>
                        <div className="w-2.5 lg:w-3.5 border-t border-gray-800" />
                        <span className="text-[10px] lg:text-xs font-extrabold">{fraction.denominator}</span>
                    </div>
                );
        }
    };

    const hasSnapTarget = !!snapResult && snapResult.type !== 'row-rail';
    const isEquiv = snapResult?.type === 'equivalence';
    const isWall = snapResult?.type === 'wall';

    return (
        <Draggable
            nodeRef={nodeRef}
            scale={zoom}
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
                data-bar="true"
                title="Doble clic para duplicar · Mantén 3s para eliminar"
                className={`
          absolute cursor-grab active:cursor-grabbing
          ${fraction.color}
          flex items-center justify-center
          border ${
              isLongPressing
                  ? 'border-red-500 border-solid ring-1 ring-red-500'
                  : hasSnapTarget
                  ? isEquiv
                      ? 'border-emerald-400 ring-2 ring-emerald-400'
                      : isWall
                      ? 'border-sky-400 ring-2 ring-sky-400'
                      : 'border-blue-400 ring-2 ring-blue-400'
                  : 'border-gray-800'
          }
          select-none touch-none
          fraction-bar rounded-none
          ${isSnapping ? 'snapping' : ''}
          ${isLongPressing ? 'long-pressing' : ''}
        `}
                style={{
                    width: `${barW}px`,
                    height: `${barHeight}px`,
                    minWidth: 22,
                    borderRadius: 0,
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
                    <span
                        className={`absolute -top-2.5 -right-1 px-1 rounded text-[8px] font-black text-white shadow-md animate-pulse z-50 ${
                            isEquiv ? 'bg-emerald-600 ring-1 ring-emerald-300' : 'bg-sky-600 ring-1 ring-sky-300'
                        }`}
                    >
                        {snapResult?.label ?? '✓'}
                    </span>
                )}
                {isLongPressing && (
                    <div className="absolute inset-0 bg-red-500/25 rounded-none flex items-center justify-center pointer-events-none" style={{ borderRadius: 0 }}>
                        <span className="text-[9px] lg:text-[10px] font-bold text-red-800 bg-white/90 px-1 py-0.5 shadow" style={{ borderRadius: 0 }}>No soltar para eliminar</span>
                    </div>
                )}
            </div>
        </Draggable>
    );
});

/**
 * Guide rule overlay shown while dragging.
 */
function GuideLines({ containerHeight, containerWidth, show, rowHeight }: GuideLinesProps) {
    if (!show || containerWidth === 0) return null;
    const hLines: React.ReactNode[] = [];
    const vLines: React.ReactNode[] = [];
    const rows = Math.ceil(containerHeight / rowHeight);
    for (let i = 1; i <= rows; i++) {
        hLines.push(
            <line
                key={`h${i}`}
                x1={0} y1={i * rowHeight}
                x2={containerWidth} y2={i * rowHeight}
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
    rowHeight,
    barHeight,
    pan,
    zoom,
    onPanChange,
    onZoomToPoint,
    onDragStart,
    onDrag,
    onDragStop,
    onDuplicate,
    onDeleteById,
    draggingId,
    activeSnap,
    onContainerWidth,
}: RegletaFracionesCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: cW, height: cH } = useElementSize(containerRef);

    // Report live container width upward so snap math stays accurate
    useEffect(() => {
        if (cW > 0) onContainerWidth(cW);
    }, [cW, onContainerWidth]);

    // Rueda del ratón para zoom enfocado en el puntero
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.88;
            onZoomToPoint(zoom * factor, e.clientX, e.clientY);
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [zoom, onZoomToPoint]);

    // Gestión de pointers para Pan con 1 dedo o ratón, y Pinch-to-zoom con 2 dedos
    const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
    const pinchStartRef = useRef({ dist: 0, zoom: 1, midX: 0, midY: 0 });

    const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // Si el evento se originó en una barra de fracción interactiva, ignorar el pan del lienzo
        if ((e.target as HTMLElement).closest('[data-bar]')) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointersRef.current.size >= 2) {
            isPanningRef.current = false;
            const pts = Array.from(activePointersRef.current.values());
            pinchStartRef.current = {
                dist: getDistance(pts[0], pts[1]),
                zoom,
                midX: (pts[0].x + pts[1].x) / 2,
                midY: (pts[0].y + pts[1].y) / 2,
            };
        } else if (activePointersRef.current.size === 1) {
            isPanningRef.current = true;
            panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                initialPanX: pan.x,
                initialPanY: pan.y,
            };
        }

        const onPointerMove = (ev: PointerEvent) => {
            if (!activePointersRef.current.has(ev.pointerId)) return;
            activePointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

            if (activePointersRef.current.size >= 2) {
                const pts = Array.from(activePointersRef.current.values());
                const curDist = getDistance(pts[0], pts[1]);
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;

                if (pinchStartRef.current.dist > 5) {
                    const ratio = curDist / pinchStartRef.current.dist;
                    onZoomToPoint(pinchStartRef.current.zoom * ratio, midX, midY);
                }
            } else if (isPanningRef.current) {
                const dx = ev.clientX - panStartRef.current.x;
                const dy = ev.clientY - panStartRef.current.y;
                onPanChange({
                    x: Math.round(panStartRef.current.initialPanX + dx),
                    y: Math.round(panStartRef.current.initialPanY + dy),
                });
            }
        };

        const onPointerUp = (ev: PointerEvent) => {
            activePointersRef.current.delete(ev.pointerId);
            if (activePointersRef.current.size === 0) {
                isPanningRef.current = false;
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    };

    const isDragging = draggingId !== null;

    // Dimensiones ampliadas del mundo virtual para que el usuario pueda explorar holgadamente
    const worldW = Math.max(cW > 0 ? cW : 800, 1600);
    const worldH = Math.max(cH > 0 ? cH : 600, 1800);

    return (
        <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            className="relative w-full h-full rounded-xl lg:rounded-2xl overflow-hidden bg-white border border-gray-200 lg:border-2 cursor-grab active:cursor-grabbing select-none"
            style={{
                touchAction: 'none',
            }}
        >
            {/* Contenedor del mundo virtual transformado con Pan y Zoom */}
            <div
                className="absolute inset-0 origin-top-left pointer-events-none"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    width: worldW,
                    height: worldH,
                }}
            >
                {/* Cuadrícula milimetrada infinita en el mundo virtual */}
                <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                    <defs>
                        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                        </pattern>
                        <pattern id="grid" width={cW > 0 ? cW / 10 : 80} height={rowHeight} patternUnits="userSpaceOnUse">
                            <rect width={cW > 0 ? cW / 10 : 80} height={rowHeight} fill="url(#smallGrid)" />
                            <path d={`M ${cW > 0 ? cW / 10 : 80} 0 L 0 0 0 ${rowHeight}`} fill="none" stroke="#d1d5db" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Línea guía vertical de alineación e imantado con feedback visual */}
                    {isDragging && activeSnap && activeSnap.guideLineX !== undefined && (
                        <g>
                            <line
                                x1={activeSnap.guideLineX}
                                y1={0}
                                x2={activeSnap.guideLineX}
                                y2={worldH}
                                stroke={activeSnap.type === 'equivalence' ? '#10b981' : '#0284c7'}
                                strokeWidth={activeSnap.type === 'equivalence' ? '2.5' : '2'}
                                strokeDasharray={activeSnap.type === 'equivalence' ? '6 3' : '4 4'}
                            />
                            {/* Etiqueta flotante cerca del punto de imantado */}
                            <foreignObject
                                x={Math.max(4, activeSnap.guideLineX - 45)}
                                y={Math.max(6, activeSnap.y - 28)}
                                width="90"
                                height="24"
                            >
                                <div
                                    className={`px-2 py-0.5 rounded text-[10px] font-black text-center shadow-lg select-none whitespace-nowrap ${
                                        activeSnap.type === 'equivalence'
                                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                            : 'bg-sky-600 text-white ring-1 ring-sky-200'
                                    }`}
                                >
                                    {activeSnap.label ?? 'Alineado'}
                                </div>
                            </foreignObject>
                        </g>
                    )}
                </svg>

                <GuideLines containerHeight={worldH} containerWidth={worldW} show={isDragging} rowHeight={rowHeight} />

                {/* Barras de fracciones */}
                <div className="relative w-full h-full pointer-events-auto">
                    {fractions.map((fraction) => {
                        const isActive = fraction.id === draggingId;
                        return (
                            <FractionBar
                                key={fraction.id}
                                fraction={fraction}
                                displayMode={displayMode}
                                barHeight={barHeight}
                                containerWidth={cW > 0 ? cW : 800}
                                zoom={zoom}
                                onDragStart={() => onDragStart(fraction.id)}
                                onDrag={(pos) => onDrag(fraction.id, pos)}
                                onDragStop={(pos) => onDragStop(fraction.id, pos)}
                                onDuplicate={() => onDuplicate(fraction, cW > 0 ? cW : 800)}
                                onLongPressDelete={() => onDeleteById(fraction.id)}
                                snapResult={isActive ? activeSnap : null}
                                isSnapping={isActive && !!activeSnap && activeSnap.type !== 'row-rail'}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StoredFractionData {
    fractions: Fraction[];
    savedRowHeight: number;
}

const RegletaFraciones = (): React.ReactElement => {
    // Detect whether we are on desktop (>= 1024px) vs tablet/mobile (< 1024px)
    const [isDesktop, setIsDesktop] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth >= 1024;
    });

    useEffect(() => {
        const checkSize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    const rowHeight = isDesktop ? ROW_HEIGHT_DESKTOP : ROW_HEIGHT_TABLET;
    const barHeight = rowHeight - BAR_GAP;

    const [fractions, setFractions] = useState<Fraction[]>(() => {
        try {
            const raw = localStorage.getItem('regletaFraciones_v5_data');
            if (raw) {
                const parsed = JSON.parse(raw) as StoredFractionData;
                if (parsed && Array.isArray(parsed.fractions) && parsed.fractions.length > 0) {
                    const savedH = parsed.savedRowHeight || (isDesktop ? ROW_HEIGHT_DESKTOP : ROW_HEIGHT_TABLET);
                    if (savedH !== rowHeight && savedH > 0) {
                        const ratio = rowHeight / savedH;
                        return parsed.fractions.map((f) => ({
                            ...f,
                            y: Math.round(f.y * ratio),
                        }));
                    }
                    return parsed.fractions;
                }
            }
        } catch {
            // fallback
        }
        return createInitialFractions(rowHeight);
    });

    // Escalar y sincronizar posiciones verticales cuando cambie la resolución o tamaño de pantalla
    const prevRowHeightRef = useRef<number>(rowHeight);
    useEffect(() => {
        if (prevRowHeightRef.current !== rowHeight) {
            const ratio = rowHeight / prevRowHeightRef.current;
            setFractions((prev) =>
                prev.map((f) => ({
                    ...f,
                    y: Math.round(f.y * ratio),
                }))
            );
            prevRowHeightRef.current = rowHeight;
        }
    }, [rowHeight]);

    // Persistir fracciones con el rowHeight actual
    useEffect(() => {
        try {
            const dataToSave: StoredFractionData = {
                fractions,
                savedRowHeight: rowHeight,
            };
            localStorage.setItem('regletaFraciones_v5_data', JSON.stringify(dataToSave));
        } catch {
            // ignore
        }
    }, [fractions, rowHeight]);

    // Limpieza de claves anteriores para prevenir desalineaciones por caché heredada
    useEffect(() => {
        try {
            localStorage.removeItem('regletaFraciones_v4_fractions');
            localStorage.removeItem('regletaFraciones_fractions');
        } catch {
            // ignore
        }
    }, []);

    const [displayMode, setDisplayMode] = useLocalStorage<DisplayMode>(
        'regletaFraciones_v3_mode',
        'fractions',
    );

    const [draggingId, setDraggingId] = useState<string | null>(null);

    // Estado de Pan y Zoom del lienzo
    const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState<number>(1);
    const panRef = useRef<Position>({ x: 0, y: 0 });
    const zoomRef = useRef<number>(1);
    useEffect(() => {
        panRef.current = pan;
        zoomRef.current = zoom;
    }, [pan, zoom]);

    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Zoom enfocado hacia el cursor o punto medio táctil
    const handleZoomToPoint = useCallback((targetZoom: number, clientX: number, clientY: number) => {
        if (!canvasContainerRef.current) return;
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;
        const nextZoom = Math.min(2.5, Math.max(0.6, Math.round(targetZoom * 100) / 100));
        if (Math.abs(nextZoom - currentZoom) < 0.001) return;

        const worldX = (px - currentPan.x) / currentZoom;
        const worldY = (py - currentPan.y) / currentZoom;

        const newPanX = Math.round(px - worldX * nextZoom);
        const newPanY = Math.round(py - worldY * nextZoom);

        setZoom(nextZoom);
        setPan({ x: newPanX, y: newPanY });
    }, []);

    const resetView = useCallback(() => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    /**
     * Live container width, updated whenever the canvas resizes.
     * Stored in a ref so drag handlers always read the current value
     * without needing to re-create callbacks.
     */
    const containerWidthRef = useRef<number>(0);

    const handleContainerWidth = useCallback((w: number) => {
        containerWidthRef.current = w;
    }, []);

    const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);

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
            y: lastY + rowHeight,
        };
        setFractions((prev) => [...prev, newF]);
    }, [fractions, rowHeight, setFractions]);

    const deleteFraction = useCallback(() => {
        if (fractions.length <= 1) return;
        setFractions((prev) => prev.slice(0, -1));
    }, [fractions.length, setFractions]);

    const handleDeleteById = useCallback((id: string) => {
        setFractions((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((f) => f.id !== id);
        });
        setDraggingId((prev) => (prev === id ? null : prev));
        setActiveSnap(null);
    }, [setFractions]);

    const resetFractions = useCallback(() => {
        setFractions(createInitialFractions(rowHeight));
        setActiveSnap(null);
    }, [rowHeight, setFractions]);

    const handleDragStart = useCallback((id: string) => {
        setDraggingId(id);
        setActiveSnap(null);
    }, []);

    const handleDrag = useCallback((id: string, pos: Position) => {
        setFractions((prev) => {
            const dragged = prev.find((f) => f.id === id);
            if (!dragged) return prev;
            const cW = containerWidthRef.current;
            if (cW === 0) return prev;
            const snap = computeSnap(dragged, pos, prev, cW, rowHeight);
            setActiveSnap((existing) => {
                if (
                    existing?.x === snap.x &&
                    existing?.y === snap.y &&
                    existing?.type === snap.type &&
                    existing?.guideLineX === snap.guideLineX &&
                    existing?.label === snap.label
                ) {
                    return existing;
                }
                return snap;
            });
            return prev;
        });
    }, [rowHeight, setFractions]);

    const handleDragStop = useCallback((id: string, pos: Position) => {
        setDraggingId(null);
        setActiveSnap(null);
        setFractions((prev) => {
            const dragged = prev.find((f) => f.id === id);
            if (!dragged) return prev;
            const cW = containerWidthRef.current;
            if (cW === 0) return prev;
            const snap = computeSnap(dragged, pos, prev, cW, rowHeight);
            // Al soltar, encajar Y exactamente en el riel de fila
            const finalY = Math.max(0, Math.round(snap.y / rowHeight) * rowHeight);
            return prev.map((f) => (f.id === id ? { ...f, x: snap.x, y: finalY } : f));
        });
    }, [rowHeight, setFractions]);

    const handleDuplicate = useCallback((fraction: Fraction, containerWidth: number) => {
        const pW = barPixelWidth(fraction.denominator, containerWidth);
        const maxX = containerWidth - pW;
        const candidateX = fraction.x + pW;
        const newX = candidateX <= maxX ? candidateX : 0;
        const newY = candidateX <= maxX ? fraction.y : fraction.y + rowHeight;

        const newF: Fraction = {
            ...fraction,
            id: `${fraction.id}-copy-${Date.now()}`,
            x: Math.max(0, Math.min(newX, maxX)),
            y: newY,
        };
        setFractions((prev) => [...prev, newF]);
    }, [rowHeight, setFractions]);

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
          border-radius: 0 !important;
          border-width: 1px !important;
          will-change: transform;
          user-select: none;
          -webkit-user-select: none;
        }
        .fraction-bar:active {
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          z-index: 50 !important;
        }
        .snapping {
          outline: 1.5px solid #3b82f6;
          outline-offset: 1px;
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

            {/* ── Cabecera unificada con título, modos de visualización y herramientas ── */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-gray-200/80 px-2 lg:px-4 bg-gray-50 select-none gap-1 sm:gap-2">
                {/* Lado izquierdo: Volver + Título + Modos (½, 0.5, 50%) */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white border border-gray-300 text-gray-600 text-[11px] lg:text-xs font-semibold shadow-sm hover:bg-gray-100 active:scale-95 transition-all shrink-0 flex items-center gap-1"
                        title="Volver"
                    >
                        <span>←</span>
                        <span className="hidden sm:inline">Volver</span>
                    </button>

                    <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-gray-800 whitespace-nowrap shrink-0">
                        <span className="hidden sm:inline">Regleta de </span>Fracciones
                    </h1>

                    {/* Botones de modo de visualización (½, 0.5, 50%) junto al título */}
                    <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg shrink-0 gap-0.5">
                        <button
                            onClick={() => setDisplayMode('fractions')}
                            className={`h-6 lg:h-7 px-2 rounded-md font-bold text-[11px] lg:text-xs transition-all ${
                                displayMode === 'fractions'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                            }`}
                            title="Mostrar como fracción"
                        >
                            ½
                        </button>
                        <button
                            onClick={() => setDisplayMode('decimals')}
                            className={`h-6 lg:h-7 px-2 rounded-md font-bold text-[11px] lg:text-xs transition-all ${
                                displayMode === 'decimals'
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                            }`}
                            title="Mostrar como decimal"
                        >
                            0.5
                        </button>
                        <button
                            onClick={() => setDisplayMode('percentages')}
                            className={`h-6 lg:h-7 px-2 rounded-md font-bold text-[11px] lg:text-xs transition-all ${
                                displayMode === 'percentages'
                                    ? 'bg-yellow-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                            }`}
                            title="Mostrar como porcentaje"
                        >
                            50%
                        </button>
                    </div>
                </div>

                {/* Lado derecho: Acciones (+, -, ↺, Centrar, ?) */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                        onClick={addFraction}
                        title="Agregar fracción"
                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg bg-purple-500 text-white font-bold text-xs lg:text-sm flex items-center justify-center hover:bg-purple-600 active:scale-95 shadow-sm transition-all"
                    >
                        ＋
                    </button>
                    <button
                        onClick={deleteFraction}
                        disabled={fractions.length <= 1}
                        title="Eliminar última fracción"
                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg bg-red-500 text-white font-bold text-xs lg:text-sm flex items-center justify-center hover:bg-red-600 active:scale-95 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        －
                    </button>
                    <button
                        onClick={resetFractions}
                        title="Reiniciar barras iniciales"
                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg bg-gray-500 text-white font-bold text-xs lg:text-sm flex items-center justify-center hover:bg-gray-600 active:scale-95 shadow-sm transition-all"
                    >
                        ↺
                    </button>

                    <div className="h-4 w-px bg-gray-300 mx-0.5" />

                    <button
                        onClick={resetView}
                        title="Centrar vista del lienzo"
                        className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-[11px] lg:text-xs font-semibold shadow-sm hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-1"
                    >
                        <span>🎯</span>
                        <span className="hidden md:inline">Centrar</span>
                        <span className="text-[10px] text-gray-400 font-mono">({Math.round(zoom * 100)}%)</span>
                    </button>

                    <button
                        onClick={() => setShowHelp(true)}
                        title="Ayuda"
                        className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-white border border-gray-300 text-gray-600 text-xs lg:text-sm font-bold flex items-center justify-center shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* ── Canvas wrapper ── */}
            <div
                ref={canvasContainerRef}
                className="flex-1 min-h-0 px-2 lg:px-4 pb-1.5 lg:pb-2 overflow-hidden"
            >
                <RegletaFracionesCanvas
                    fractions={fractions}
                    displayMode={displayMode}
                    rowHeight={rowHeight}
                    barHeight={barHeight}
                    pan={pan}
                    zoom={zoom}
                    onPanChange={setPan}
                    onZoomToPoint={handleZoomToPoint}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragStop={handleDragStop}
                    onDuplicate={handleDuplicate}
                    onDeleteById={handleDeleteById}
                    draggingId={draggingId}
                    activeSnap={activeSnap}
                    onContainerWidth={handleContainerWidth}
                />
            </div>

            {/* ── Footer ── */}
            <div className="text-center text-gray-400 text-[10px] lg:text-xs py-0.5 lg:pb-1 shrink-0 flex items-center justify-center gap-2 sm:gap-3">
                <span>{fractions.length} barra{fractions.length !== 1 ? 's' : ''} en la regleta</span>
                <span>·</span>
                <span className="font-mono text-gray-500">Zoom: {Math.round(zoom * 100)}%</span>
                <span className="hidden sm:inline text-gray-400">· Arrastra el fondo para mover · Rueda o pellizca para zoom</span>
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
                        <strong className="text-gray-800">Arrastra libremente el fondo del lienzo</strong> con un dedo o el ratón para desplazarte y tener espacio infinito.
                    </li>
                    <li>
                        Usa la <strong className="text-blue-500">rueda del ratón</strong> o haz <strong className="text-blue-500">pellizco con 2 dedos</strong> para acercar o alejar el zoom donde desees.
                    </li>
                    <li>
                        Toca el botón <strong className="text-indigo-600">🎯 Centrar</strong> en la barra de herramientas para volver a la posición original en cualquier momento.
                    </li>
                    <li>
                        <strong className="text-gray-800">Arrastra</strong> las barras de fracción desde su cuerpo para moverlas individualmente.
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
                        Cambia la vista entre <strong className="text-blue-500">fracción</strong>, <strong className="text-emerald-500">decimal</strong> y <strong className="text-yellow-500">porcentaje</strong> con los botones de modo.
                    </li>
                </ol>
            </ModalHelp>
        </div>
    );
};

export default RegletaFraciones;