"use client";

import { useId, useMemo, useState } from "react";
import { FlowPoint, formatCurrency } from "@/lib/dashboardUtils";
import { areaToBaseline, smoothPath } from "./geometry";

interface CashFlowRiverProps {
    data: FlowPoint[];
}

export function CashFlowRiver({ data }: CashFlowRiverProps) {
    const uid = useId().replace(/:/g, "");
    const [hover, setHover] = useState<number | null>(null);
    const width = 1000;
    const height = 280;
    const padX = 12;
    const padTop = 18;
    const padBottom = 28;
    const zeroY = padTop + (height - padTop - padBottom) / 2;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    const { incomePts, expensePts, maxAbs, ticks } = useMemo(() => {
        const maxAbs = Math.max(
            1,
            ...data.map((d) => Math.max(d.income, d.expenses))
        );
        const n = Math.max(data.length - 1, 1);
        const incomePts = data.map((d, i) => ({
            x: padX + (i / n) * usableW,
            y: zeroY - (d.income / maxAbs) * (usableH / 2) * 0.92,
        }));
        const expensePts = data.map((d, i) => ({
            x: padX + (i / n) * usableW,
            y: zeroY + (d.expenses / maxAbs) * (usableH / 2) * 0.92,
        }));

        const ticks: { x: number; label: string }[] = [];
        if (data.length > 0) {
            const count = Math.min(data.length, 6);
            for (let i = 0; i < count; i++) {
                const idx = Math.round((i * (data.length - 1)) / Math.max(count - 1, 1));
                ticks.push({
                    x: padX + (idx / n) * usableW,
                    label: data[idx].label,
                });
            }
        }

        return { incomePts, expensePts, maxAbs, ticks };
    }, [data, padX, usableW, usableH, zeroY]);

    const incomeArea = areaToBaseline(incomePts, zeroY);
    const expenseArea = areaToBaseline(expensePts, zeroY);
    const incomeLine = smoothPath(incomePts);
    const expenseLine = smoothPath(expensePts);

    const active = hover !== null ? data[hover] : data[data.length - 1];
    const activeX =
        hover !== null && incomePts[hover]
            ? incomePts[hover].x
            : incomePts[incomePts.length - 1]?.x;

    return (
        <div className="relative w-full">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-[220px] md:h-[280px] overflow-visible"
                onMouseLeave={() => setHover(null)}
                onMouseMove={(e) => {
                    if (data.length === 0) return;
                    const bounds = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - bounds.left) / bounds.width;
                    const idx = Math.round(ratio * (data.length - 1));
                    setHover(Math.max(0, Math.min(data.length - 1, idx)));
                }}
            >
                <defs>
                    <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--flow-in))" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="hsl(var(--flow-in))" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id={`${uid}-out`} x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--flow-out))" stopOpacity="0.42" />
                        <stop offset="100%" stopColor="hsl(var(--flow-out))" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="white" stopOpacity="0" />
                        <stop offset="0.04" stopColor="white" stopOpacity="1" />
                        <stop offset="0.96" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <mask id={`${uid}-mask`}>
                        <rect width={width} height={height} fill={`url(#${uid}-fade)`} />
                    </mask>
                </defs>

                {[0.25, 0.5, 0.75].map((t) => (
                    <line
                        key={t}
                        x1={padX}
                        x2={width - padX}
                        y1={padTop + usableH * t}
                        y2={padTop + usableH * t}
                        stroke="hsl(var(--border))"
                        strokeOpacity="0.7"
                        strokeDasharray="1.5 6"
                    />
                ))}

                <line
                    x1={padX}
                    x2={width - padX}
                    y1={zeroY}
                    y2={zeroY}
                    stroke="hsl(var(--foreground))"
                    strokeOpacity="0.22"
                />

                <g mask={`url(#${uid}-mask)`}>
                    {incomeArea && (
                        <path d={incomeArea} fill={`url(#${uid}-in)`} className="dash-draw" />
                    )}
                    {expenseArea && (
                        <path d={expenseArea} fill={`url(#${uid}-out)`} className="dash-draw" />
                    )}
                    {incomeLine && (
                        <path
                            d={incomeLine}
                            fill="none"
                            stroke="hsl(var(--flow-in))"
                            strokeWidth="1.75"
                            filter={`url(#${uid}-glow)`}
                        />
                    )}
                    {expenseLine && (
                        <path
                            d={expenseLine}
                            fill="none"
                            stroke="hsl(var(--flow-out))"
                            strokeWidth="1.5"
                            strokeOpacity="0.9"
                        />
                    )}
                </g>

                        {ticks.map((tick, i) => (
                    <text
                        key={`${tick.label}-${i}`}
                        x={tick.x}
                        y={height - 8}
                        textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
                        className="dash-axis-label"
                        fill="hsl(var(--muted-foreground))"
                    >
                        {tick.label}
                    </text>
                ))}

                {activeX !== undefined && (
                    <>
                        <line
                            x1={activeX}
                            x2={activeX}
                            y1={padTop}
                            y2={height - padBottom}
                            stroke="hsl(var(--foreground))"
                            strokeOpacity="0.28"
                        />
                        {hover !== null && incomePts[hover] && (
                            <>
                                <circle
                                    cx={incomePts[hover].x}
                                    cy={incomePts[hover].y}
                                    r="3.5"
                                    fill="hsl(var(--flow-in))"
                                />
                                <circle
                                    cx={expensePts[hover].x}
                                    cy={expensePts[hover].y}
                                    r="3.5"
                                    fill="hsl(var(--flow-out))"
                                />
                            </>
                        )}
                    </>
                )}

                <text
                    x={padX}
                    y={14}
                    className="dash-axis-label"
                    fill="hsl(var(--muted-foreground))"
                >
                    {formatCurrency(maxAbs, { compact: true, cents: false })}
                </text>
            </svg>

            {active && (
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-[11px] tracking-wide text-muted-foreground backdrop-blur-md">
                    <span className="font-medium text-foreground">{active.label}</span>
                    <span className="mx-2 opacity-30">·</span>
                    <span style={{ color: "hsl(var(--flow-in))" }}>
                        {formatCurrency(active.income, { compact: true })}
                    </span>
                    <span className="mx-2 opacity-30">/</span>
                    <span style={{ color: "hsl(var(--flow-out))" }}>
                        {formatCurrency(active.expenses, { compact: true })}
                    </span>
                </div>
            )}
        </div>
    );
}

export function MiniSpark({
    values,
    tone,
}: {
    values: number[];
    tone: "in" | "out" | "net";
}) {
    const uid = useId().replace(/:/g, "");
    if (values.length < 2) return null;
    const w = 72;
    const h = 22;
    const max = Math.max(...values.map((v) => Math.abs(v)), 1);
    const pts = values.map((v, i) => ({
        x: (i / (values.length - 1)) * w,
        y: h / 2 - (v / max) * (h / 2 - 2),
    }));
    const color =
        tone === "in"
            ? "hsl(var(--flow-in))"
            : tone === "out"
              ? "hsl(var(--flow-out))"
              : "hsl(var(--foreground))";

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-5 w-[72px] opacity-80">
            <defs>
                <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaToBaseline(pts, h)} fill={`url(#${uid}-s)`} />
            <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
    );
}
