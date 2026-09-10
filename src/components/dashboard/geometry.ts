export interface Point {
    x: number;
    y: number;
}

export function smoothPath(points: Point[]): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
}

export function areaToBaseline(points: Point[], baselineY: number): string {
    if (points.length === 0) return "";
    const line = smoothPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export interface MosaicItem {
    name: string;
    value: number;
    color: string;
}

export interface MosaicRect extends MosaicItem {
    x: number;
    y: number;
    w: number;
    h: number;
    share: number;
}

function worst(row: number[], side: number): number {
    const s = row.reduce((a, b) => a + b, 0);
    if (s === 0) return Infinity;
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
}

export function squarifyLayout(
    items: MosaicItem[],
    x: number,
    y: number,
    width: number,
    height: number,
    gap = 2
): MosaicRect[] {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total <= 0 || width <= 0 || height <= 0) return [];

    const scaled = items
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((i) => ({ ...i, area: (i.value / total) * width * height }));

    const result: MosaicRect[] = [];

    const layoutRow = (
        row: typeof scaled,
        bx: number,
        by: number,
        bw: number,
        bh: number,
        vertical: boolean
    ) => {
        const sum = row.reduce((s, i) => s + i.area, 0);
        if (vertical) {
            const rowWidth = sum / bh;
            let cy = by;
            for (const item of row) {
                const ih = item.area / rowWidth;
                result.push({
                    name: item.name,
                    value: item.value,
                    color: item.color,
                    share: item.value / total,
                    x: bx + gap / 2,
                    y: cy + gap / 2,
                    w: Math.max(0, rowWidth - gap),
                    h: Math.max(0, ih - gap),
                });
                cy += ih;
            }
            return { x: bx + rowWidth, y: by, w: bw - rowWidth, h: bh };
        }
        const rowHeight = sum / bw;
        let cx = bx;
        for (const item of row) {
            const iw = item.area / rowHeight;
            result.push({
                name: item.name,
                value: item.value,
                color: item.color,
                share: item.value / total,
                x: cx + gap / 2,
                y: by + gap / 2,
                w: Math.max(0, iw - gap),
                h: Math.max(0, rowHeight - gap),
            });
            cx += iw;
        }
        return { x: bx, y: by + rowHeight, w: bw, h: bh - rowHeight };
    };

    const step = (children: typeof scaled, bx: number, by: number, bw: number, bh: number) => {
        if (!children.length || bw <= 0 || bh <= 0) return;
        const vertical = bw >= bh;
        const side = vertical ? bh : bw;
        const row: typeof scaled = [];
        const remaining = [...children];
        while (remaining.length) {
            const next = remaining[0];
            const trial = [...row, next].map((r) => r.area);
            if (row.length === 0 || worst(trial, side) <= worst(row.map((r) => r.area), side)) {
                row.push(next);
                remaining.shift();
            } else {
                break;
            }
        }
        const nextBounds = layoutRow(row, bx, by, bw, bh, vertical);
        step(remaining, nextBounds.x, nextBounds.y, nextBounds.w, nextBounds.h);
    };

    step(scaled, x, y, width, height);
    return result;
}

export function polar(cx: number, cy: number, r: number, angle: number): Point {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function annularSector(
    cx: number,
    cy: number,
    r0: number,
    r1: number,
    a0: number,
    a1: number
): string {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p0 = polar(cx, cy, r1, a0);
    const p1 = polar(cx, cy, r1, a1);
    const p2 = polar(cx, cy, r0, a1);
    const p3 = polar(cx, cy, r0, a0);
    return `M ${p0.x} ${p0.y} A ${r1} ${r1} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r0} ${r0} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

export function describeArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
    const start = polar(cx, cy, r, a0);
    const end = polar(cx, cy, r, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
