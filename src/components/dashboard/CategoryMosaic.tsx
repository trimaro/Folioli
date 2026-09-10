"use client";

import { useMemo, useState } from "react";
import { CategoryGroupData, formatCurrency } from "@/lib/dashboardUtils";
import { squarifyLayout } from "./geometry";

interface CategoryMosaicProps {
    groups: CategoryGroupData[];
}

export function CategoryMosaic({ groups }: CategoryMosaicProps) {
    const [hover, setHover] = useState<string | null>(null);
    const width = 640;
    const height = 340;

    const rects = useMemo(
        () =>
            squarifyLayout(
                groups.map((g) => ({ name: g.group, value: g.total, color: g.color })),
                0,
                0,
                width,
                height,
                3
            ),
        [groups]
    );

    const active = groups.find((g) => g.group === hover);

    if (groups.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No outflow to compose.
            </div>
        );
    }

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full md:h-[320px]">
                {rects.map((rect) => {
                    const isActive = hover === rect.name;
                    const showLabel = rect.w > 72 && rect.h > 32;
                    const showValue = rect.w > 72 && rect.h > 52;
                    const clipId = `mosaic-${rect.name.replace(/[^a-z0-9]/gi, "")}`;
                    return (
                        <g
                            key={rect.name}
                            onMouseEnter={() => setHover(rect.name)}
                            onMouseLeave={() => setHover(null)}
                            className="cursor-pointer"
                        >
                            <clipPath id={clipId}>
                                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="6" />
                            </clipPath>
                            <rect
                                x={rect.x}
                                y={rect.y}
                                width={rect.w}
                                height={rect.h}
                                rx="6"
                                fill={rect.color}
                                fillOpacity={isActive ? 0.92 : 0.72}
                                className="transition-all duration-300"
                            />
                            {showLabel && (
                                <text
                                    x={rect.x + 10}
                                    y={rect.y + 20}
                                    fill="white"
                                    className="dash-mosaic-label"
                                    clipPath={`url(#${clipId})`}
                                >
                                    {rect.name}
                                </text>
                            )}
                            {showValue && (
                                <text
                                    x={rect.x + 10}
                                    y={rect.y + 38}
                                    fill="white"
                                    fillOpacity="0.85"
                                    className="dash-mosaic-value"
                                    clipPath={`url(#${clipId})`}
                                >
                                    {formatCurrency(rect.value, { compact: true, cents: false })}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {active && (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-white backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">
                        {active.group}
                    </div>
                    <div className="font-display text-lg leading-tight">
                        {formatCurrency(active.total)}
                    </div>
                    <div className="text-[11px] text-white/70">{active.percentage.toFixed(1)}% of outflow</div>
                </div>
            )}
        </div>
    );
}
