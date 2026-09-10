"use client";

import { useMemo, useState } from "react";
import { HeatDay, formatCurrency, startOfWeek, toDayKey } from "@/lib/dashboardUtils";

interface LedgerHeatmapProps {
    days: HeatDay[];
    start: Date;
    end: Date;
}

function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function quantile(values: number[], q: number): number {
    if (values.length === 0) return 0;
    const s = [...values].sort((a, b) => a - b);
    const i = (s.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return s[lo];
    return s[lo] * (hi - i) + s[hi] * (i - lo);
}

export function LedgerHeatmap({ days, start, end }: LedgerHeatmapProps) {
    const [hover, setHover] = useState<HeatDay | null>(null);

    const { weeks, monthLabels, levels } = useMemo(() => {
        const byIso = new Map(days.map((d) => [d.iso, d]));
        const gridStart = startOfWeek(start);
        let gridEnd = startOfWeek(end);
        gridEnd = addDays(gridEnd, 6);
        const weekCount = Math.min(53, Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000 / 7) + 1);
        const actualStart = addDays(gridEnd, -(weekCount * 7 - 1));
        const alignedStart = startOfWeek(actualStart);

        const weeks: (HeatDay | { iso: string; date: Date; empty: true })[][] = [];
        const monthLabels: { weekIndex: number; label: string }[] = [];
        let cursor = alignedStart;
        let lastMonth = -1;

        for (let w = 0; w < weekCount; w++) {
            const col: (HeatDay | { iso: string; date: Date; empty: true })[] = [];
            for (let d = 0; d < 7; d++) {
                const date = addDays(cursor, w * 7 + d);
                const iso = toDayKey(date);
                const hit = byIso.get(iso);
                if (hit) col.push(hit);
                else col.push({ iso, date, empty: true });
                if (d === 0 && date.getMonth() !== lastMonth) {
                    lastMonth = date.getMonth();
                    monthLabels.push({
                        weekIndex: w,
                        label: date.toLocaleDateString("en-US", { month: "short" }),
                    });
                }
            }
            weeks.push(col);
        }

        const spends = days.map((d) => d.expenses).filter((v) => v > 0);
        const levels = [0.2, 0.4, 0.65, 0.9].map((q) => quantile(spends, q));
        return { weeks, monthLabels, levels };
    }, [days, start, end]);

    const intensity = (value: number) => {
        if (value <= 0) return 0;
        if (value <= levels[0]) return 1;
        if (value <= levels[1]) return 2;
        if (value <= levels[2]) return 3;
        if (value <= levels[3]) return 4;
        return 5;
    };

    return (
        <div className="relative">
            <div className="mb-3 flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>Quiet</span>
                <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`dash-heat-cell heat-${i} h-2.5 w-2.5`} />
                    ))}
                </div>
                <span>Heavy</span>
            </div>

            <div className="flex w-full gap-2 overflow-x-auto pb-1">
                <div className="flex w-3 shrink-0 flex-col gap-[3px] pt-4 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <span key={`${d}-${i}`} className="flex flex-1 items-center">
                            {d}
                        </span>
                    ))}
                </div>
                <div className="flex min-h-[140px] min-w-0 flex-1 gap-[3px]">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                            <span className="h-4 truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                                {monthLabels.find((m) => m.weekIndex === wi)?.label ?? ""}
                            </span>
                            {week.map((cell) => {
                                const isEmpty = "empty" in cell;
                                const spend = isEmpty ? 0 : cell.expenses;
                                const level = isEmpty ? 0 : intensity(spend);
                                const inRange =
                                    cell.date.getTime() >= start.getTime() &&
                                    cell.date.getTime() <= end.getTime();
                                return (
                                    <button
                                        key={cell.iso}
                                        type="button"
                                        className={`dash-heat-cell heat-${level} min-h-[11px] w-full flex-1 ${
                                            inRange ? "" : "opacity-25"
                                        }`}
                                        onMouseEnter={() =>
                                            setHover(
                                                isEmpty
                                                    ? {
                                                          date: cell.date,
                                                          iso: cell.iso,
                                                          expenses: 0,
                                                          income: 0,
                                                          net: 0,
                                                          count: 0,
                                                      }
                                                    : cell
                                            )
                                        }
                                        onMouseLeave={() => setHover(null)}
                                        aria-label={cell.iso}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {hover && (
                <div className="mt-3 flex items-baseline gap-3 text-sm">
                    <span className="font-display text-base text-foreground">
                        {hover.date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                        })}
                    </span>
                    <span className="text-muted-foreground">
                        {hover.count === 0
                            ? "No movement"
                            : `${formatCurrency(hover.expenses)} spent${hover.income > 0 ? ` · ${formatCurrency(hover.income)} in` : ""}`}
                    </span>
                </div>
            )}
        </div>
    );
}
