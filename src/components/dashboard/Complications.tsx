"use client";

import { useMemo, useState } from "react";
import { WeekdayPoint, formatCurrency } from "@/lib/dashboardUtils";
import { annularSector, describeArc, polar } from "./geometry";

interface WeekdayRingProps {
    days: WeekdayPoint[];
    peak: string;
}

export function WeekdayRing({ days, peak }: WeekdayRingProps) {
    const [hover, setHover] = useState<string | null>(null);
    const max = Math.max(...days.map((d) => d.expenses), 1);
    const cx = 100;
    const cy = 100;
    const inner = 42;
    const track = 78;
    const gap = 0.12;
    const slice = (Math.PI * 2) / 7;

    const active = days.find((d) => d.day === (hover ?? peak));

    return (
        <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="h-[210px] w-[210px]">
                {days.map((day, i) => {
                    const a0 = -Math.PI / 2 + i * slice + gap / 2;
                    const a1 = -Math.PI / 2 + (i + 1) * slice - gap / 2;
                    const outer = inner + 10 + (day.expenses / max) * (track - inner - 10);
                    const isActive = (hover ?? peak) === day.day;
                    return (
                        <g key={day.day}>
                            <path
                                d={annularSector(cx, cy, inner, track, a0, a1)}
                                fill="hsl(var(--muted))"
                                fillOpacity="0.45"
                            />
                            <path
                                d={annularSector(cx, cy, inner, outer, a0, a1)}
                                fill="hsl(var(--flow-in))"
                                fillOpacity={isActive ? 0.85 : 0.38}
                                className="cursor-pointer transition-all duration-300"
                                onMouseEnter={() => setHover(day.day)}
                                onMouseLeave={() => setHover(null)}
                            />
                        </g>
                    );
                })}
                <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    className="dash-ring-day"
                    fill="hsl(var(--foreground))"
                >
                    {active?.day ?? "—"}
                </text>
                <text
                    x={cx}
                    y={cy + 12}
                    textAnchor="middle"
                    className="dash-axis-label"
                    fill="hsl(var(--muted-foreground))"
                >
                    peak rhythm
                </text>
            </svg>
            {active && (
                <div className="absolute -bottom-1 text-center text-[11px] text-muted-foreground">
                    {formatCurrency(active.expenses, { compact: true })} across {active.count} days
                </div>
            )}
        </div>
    );
}

interface SavingsArcProps {
    rate: number;
    income: number;
    expenses: number;
}

export function SavingsArc({ rate, income, expenses }: SavingsArcProps) {
    const t = income <= 0 && expenses > 0 ? 0 : Math.max(0, Math.min(1, rate / 100));
    const start = Math.PI;
    const span = Math.PI;
    const angle = start + span * t;
    const cx = 120;
    const cy = 124;
    const r = 70;

    const ticks = useMemo(() => {
        const marks: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let i = 0; i <= 10; i++) {
            const a = start + (span * i) / 10;
            const inner = i % 5 === 0 ? r - 9 : r - 5;
            const p0 = polar(cx, cy, inner, a);
            const p1 = polar(cx, cy, r, a);
            marks.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y });
        }
        return marks;
    }, [start, span]);

    const left = polar(cx, cy, r, start);
    const right = polar(cx, cy, r, start + span);
    const cap = polar(cx, cy, r, angle);
    const display = income <= 0 && expenses > 0 ? "—" : `${rate.toFixed(0)}%`;

    return (
        <div className="relative">
            <svg viewBox="0 0 240 150" className="h-[150px] w-full">
                <path
                    d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="9"
                    strokeLinecap="round"
                />
                {t > 0 && (
                    <path
                        d={describeArc(cx, cy, r, start, angle)}
                        fill="none"
                        stroke="hsl(var(--flow-in))"
                        strokeWidth="9"
                        strokeLinecap="round"
                        className="dash-draw"
                    />
                )}
                {ticks.map((tick, i) => (
                    <line
                        key={i}
                        {...tick}
                        stroke="hsl(var(--foreground))"
                        strokeOpacity={i % 5 === 0 ? 0.45 : 0.18}
                        strokeWidth={i % 5 === 0 ? 1.4 : 1}
                    />
                ))}
                <circle cx={cap.x} cy={cap.y} r="4.5" fill="hsl(var(--flow-in))" />
                <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    className="dash-arc-value"
                    fill="hsl(var(--foreground))"
                >
                    {display}
                </text>
                <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    className="dash-axis-label"
                    fill="hsl(var(--muted-foreground))"
                >
                    retained
                </text>
            </svg>
        </div>
    );
}
