"use client";

import { MerchantRow, SlopeRow, formatCurrency } from "@/lib/dashboardUtils";

interface MerchantLedgerProps {
    merchants: MerchantRow[];
}

export function MerchantLedger({ merchants }: MerchantLedgerProps) {
    if (merchants.length === 0) {
        return (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No merchants in this window.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            {merchants.map((row, i) => (
                <div
                    key={row.name}
                    className="relative overflow-hidden rounded-lg px-3 py-2.5"
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-[hsl(var(--flow-in))]/15"
                        style={{ width: `${Math.max(row.share * 100, 2)}%` }}
                    />
                    <div className="relative flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-foreground">
                                <span className="mr-2 font-mono text-[10px] text-muted-foreground">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                {row.name}
                            </div>
                            <div className="pl-6 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                {row.count} {row.count === 1 ? "entry" : "entries"} ·{" "}
                                {(row.cumulative * 100).toFixed(0)}% cumulative
                            </div>
                        </div>
                        <div className="shrink-0 font-mono text-[13px] tabular-nums text-foreground">
                            {formatCurrency(row.amount)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface SlopegraphProps {
    rows: SlopeRow[];
}

export function Slopegraph({ rows }: SlopegraphProps) {
    const width = 420;
    const height = 280;
    const leftX = 126;
    const rightX = 294;
    const top = 22;
    const bottom = 16;
    const usable = height - top - bottom;
    const max = Math.max(1, ...rows.flatMap((r) => [r.previous, r.current]));
    const log = (v: number) => Math.log10(Math.max(v, 1));
    const maxLog = log(max);
    const yOf = (v: number) => top + (1 - log(v) / maxLog) * usable;

    if (rows.length === 0) {
        return (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Not enough history to compare.
            </div>
        );
    }

    const plotted = rows.map((row) => ({
        ...row,
        y1: yOf(row.previous),
        y2: yOf(row.current),
    }));

    const dodge = (items: typeof plotted, key: "y1" | "y2") => {
        const ordered = [...items].sort((a, b) => a[key] - b[key]);
        const y = new Map<string, number>();
        let last = -Infinity;
        for (const item of ordered) {
            const next = Math.max(item[key], last + 14);
            y.set(item.group, next);
            last = next;
        }
        return y;
    };
    const leftY = dodge(plotted, "y1");
    const rightY = dodge(plotted, "y2");

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full md:h-[280px]">
            <text x={leftX} y={12} textAnchor="middle" className="dash-axis-label" fill="hsl(var(--muted-foreground))">
                Prior
            </text>
            <text x={rightX} y={12} textAnchor="middle" className="dash-axis-label" fill="hsl(var(--muted-foreground))">
                Current
            </text>
            {plotted.map((row) => {
                const rose = row.current > row.previous * 1.02;
                return (
                    <g key={row.group}>
                        <line
                            x1={leftX}
                            y1={row.y1}
                            x2={rightX}
                            y2={row.y2}
                            stroke={rose ? "hsl(var(--flow-out))" : "hsl(var(--flow-in))"}
                            strokeWidth="1.4"
                            strokeOpacity="0.75"
                        />
                        <circle cx={leftX} cy={row.y1} r="3" fill={row.color} />
                        <circle cx={rightX} cy={row.y2} r="3" fill={row.color} />
                        <text
                            x={leftX - 10}
                            y={(leftY.get(row.group) ?? row.y1) + 3}
                            textAnchor="end"
                            className="dash-slope-label"
                            fill="hsl(var(--foreground))"
                        >
                            {row.group}
                        </text>
                        <text
                            x={rightX + 10}
                            y={(rightY.get(row.group) ?? row.y2) + 3}
                            className="dash-slope-value"
                            fill="hsl(var(--muted-foreground))"
                        >
                            {formatCurrency(row.current, { compact: true, cents: false })}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
