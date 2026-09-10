import { Transaction } from "./types";
import { Category } from "./categories";

export type PeriodKey = "30d" | "90d" | "6m" | "ytd" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "6m", label: "6M" },
    { key: "ytd", label: "YTD" },
    { key: "all", label: "All" },
];

export const CATEGORY_GROUPS: Record<string, Category[]> = {
    "Food & Dining": ["Groceries", "Dining", "Takeout", "Cafe", "Snacks"],
    Housing: ["Rent", "Home & Garden"],
    "Bills & Utilities": ["Utilities", "Phone & Internet", "Insurance", "Subscriptions"],
    Transportation: ["Fuel", "Car Payment", "Car Repairs", "Car Wash", "Parking", "Public Transit", "Rideshare"],
    Health: ["Healthcare", "Pharmacy", "Fitness", "Personal Care"],
    Lifestyle: ["Clothing", "Electronics", "Books & Records", "Hobbies", "Entertainment"],
    Travel: ["Travel", "Hotels", "Flights"],
    Financial: ["Investments", "Loan Payment", "Bank Fee", "ATM Withdrawal"],
    Giving: ["Gifts", "Charity", "Education"],
    Other: ["Other", "Uncategorized"],
};

const CATEGORY_TO_GROUP: Record<string, string> = {};
for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    for (const cat of categories) CATEGORY_TO_GROUP[cat] = group;
}

export const GROUP_COLORS: Record<string, string> = {
    "Food & Dining": "#C4A574",
    Housing: "#6B7C8A",
    "Bills & Utilities": "#8A8178",
    Transportation: "#5E6F64",
    Health: "#7D9A7E",
    Lifestyle: "#B089A0",
    Travel: "#6A8E9F",
    Financial: "#B8A369",
    Giving: "#8E7B9B",
    Other: "#9A948C",
};

const DATE_CACHE = new Map<string, Date>();

export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (DATE_CACHE.has(dateStr)) return DATE_CACHE.get(dateStr)!;

    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        if (!isNaN(date.getTime())) {
            DATE_CACHE.set(dateStr, date);
            return date;
        }
    }

    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        DATE_CACHE.set(dateStr, date);
        return date;
    }

    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts.map((p) => parseInt(p, 10));
        if (a > 1000) date = new Date(a, b - 1, c);
        else if (c > 1000) date = new Date(c, a - 1, b);
        if (!isNaN(date.getTime())) {
            DATE_CACHE.set(dateStr, date);
            return date;
        }
    }

    return null;
}

export function formatCurrency(
    amount: number,
    opts?: { compact?: boolean; cents?: boolean }
): string {
    if (opts?.compact && Math.abs(amount) >= 1000) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(amount);
    }
    const cents = opts?.cents ?? true;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
    }).format(amount);
}

export function formatPercentage(value: number, digits = 1): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(digits)}%`;
}

export function getCategoryGroup(category: string | undefined): string {
    if (!category) return "Other";
    return CATEGORY_TO_GROUP[category] || "Other";
}

export function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toDayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function startOfWeek(d: Date): Date {
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset));
}

function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function daysBetween(a: Date, b: Date): number {
    return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

export function getAnchorDate(transactions: Transaction[]): Date {
    let max = 0;
    for (const tx of transactions) {
        const d = parseDate(tx.date);
        if (d && d.getTime() > max) max = d.getTime();
    }
    return max ? startOfDay(new Date(max)) : startOfDay(new Date());
}

export function getEarliestDate(transactions: Transaction[]): Date | null {
    let min = Infinity;
    for (const tx of transactions) {
        const d = parseDate(tx.date);
        if (d && d.getTime() < min) min = d.getTime();
    }
    return Number.isFinite(min) ? startOfDay(new Date(min)) : null;
}

export function getPeriodRange(
    key: PeriodKey,
    anchor: Date,
    earliest: Date | null
): { start: Date; end: Date } {
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59, 59, 999);
    const start = startOfDay(anchor);

    switch (key) {
        case "30d":
            start.setDate(start.getDate() - 29);
            break;
        case "90d":
            start.setDate(start.getDate() - 89);
            break;
        case "6m":
            start.setMonth(start.getMonth() - 6);
            break;
        case "ytd":
            start.setMonth(0, 1);
            break;
        case "all":
            return {
                start: earliest ?? startOfDay(anchor),
                end,
            };
    }

    return { start, end };
}

function previousRange(start: Date, end: Date): { start: Date; end: Date } {
    const length = daysBetween(start, end);
    const prevEnd = addDays(start, -1);
    prevEnd.setHours(23, 59, 59, 999);
    return { start: addDays(startOfDay(prevEnd), -length), end: prevEnd };
}

export function formatRangeLabel(start: Date, end: Date): string {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startFmt = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: sameYear ? undefined : "numeric",
    });
    const endFmt = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    return `${startFmt} – ${endFmt}`;
}

export type FlowGranularity = "day" | "week" | "month";

export interface FlowPoint {
    key: string;
    label: string;
    date: Date;
    income: number;
    expenses: number;
    net: number;
}

export interface HeatDay {
    date: Date;
    iso: string;
    expenses: number;
    income: number;
    net: number;
    count: number;
}

export interface CategoryGroupData {
    group: string;
    total: number;
    color: string;
    percentage: number;
}

export interface SlopeRow {
    group: string;
    previous: number;
    current: number;
    color: string;
}

export interface MerchantRow {
    name: string;
    amount: number;
    count: number;
    share: number;
    cumulative: number;
}

export interface WeekdayPoint {
    day: string;
    index: number;
    expenses: number;
    count: number;
}

export interface DashboardModel {
    empty: boolean;
    period: PeriodKey;
    range: { start: Date; end: Date };
    previousRange: { start: Date; end: Date };
    rangeLabel: string;
    totals: {
        income: number;
        expenses: number;
        net: number;
        count: number;
        savingsRate: number;
        dailyBurn: number;
    };
    previous: {
        income: number;
        expenses: number;
        net: number;
        savingsRate: number;
        count: number;
    };
    flow: FlowPoint[];
    heatmap: HeatDay[];
    groups: CategoryGroupData[];
    slopes: SlopeRow[];
    merchants: MerchantRow[];
    weekdays: WeekdayPoint[];
    peakWeekday: string;
}

function inRange(date: Date, start: Date, end: Date): boolean {
    const t = date.getTime();
    return t >= start.getTime() && t <= end.getTime();
}

function bucketMeta(d: Date, granularity: FlowGranularity): { key: string; label: string; date: Date } {
    if (granularity === "day") {
        return {
            key: toDayKey(d),
            label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            date: startOfDay(d),
        };
    }
    if (granularity === "week") {
        const week = startOfWeek(d);
        return {
            key: toDayKey(week),
            label: week.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            date: week,
        };
    }
    const monthDate = new Date(d.getFullYear(), d.getMonth(), 1);
    return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: monthDate.toLocaleDateString("en-US", { month: "short" }),
        date: monthDate,
    };
}

function enumerateBuckets(start: Date, end: Date, granularity: FlowGranularity): FlowPoint[] {
    const points: FlowPoint[] = [];
    if (granularity === "day") {
        for (let d = startOfDay(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
            const meta = bucketMeta(d, "day");
            points.push({ ...meta, income: 0, expenses: 0, net: 0 });
        }
        return points;
    }
    if (granularity === "week") {
        for (let d = startOfWeek(start); d.getTime() <= end.getTime(); d = addDays(d, 7)) {
            const meta = bucketMeta(d, "week");
            points.push({ ...meta, income: 0, expenses: 0, net: 0 });
        }
        return points;
    }
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (d.getTime() <= last.getTime()) {
        const meta = bucketMeta(d, "month");
        points.push({ ...meta, income: 0, expenses: 0, net: 0 });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return points;
}

function savingsRate(income: number, expenses: number): number {
    if (income <= 0) return expenses > 0 ? -100 : 0;
    return ((income - expenses) / income) * 100;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function buildDashboardModel(
    transactions: Transaction[],
    period: PeriodKey
): DashboardModel {
    const filtered = transactions.filter(
        (tx) => tx.status === "confirmed" && tx.category !== "Account Transfer"
    );
    const anchor = getAnchorDate(filtered);
    const earliest = getEarliestDate(filtered);
    const range = getPeriodRange(period, anchor, earliest);
    const prev = previousRange(range.start, range.end);
    const span = Math.max(1, daysBetween(range.start, range.end) + 1);
    const granularity: FlowGranularity = span <= 45 ? "day" : span <= 210 ? "week" : "month";

    const flow = enumerateBuckets(range.start, range.end, granularity);
    const flowIndex = new Map(flow.map((p, i) => [p.key, i]));

    const heatmapMap = new Map<string, HeatDay>();
    const groupTotals: Record<string, number> = {};
    const prevGroupTotals: Record<string, number> = {};
    const merchantMap = new Map<string, { amount: number; count: number }>();
    const weekdayTotals = WEEKDAYS.map((day, index) => ({ day, index, expenses: 0, count: 0 }));

    const totals = { income: 0, expenses: 0, net: 0, count: 0, savingsRate: 0, dailyBurn: 0 };
    const previous = { income: 0, expenses: 0, net: 0, savingsRate: 0, count: 0 };

    for (const tx of filtered) {
        const date = parseDate(tx.date);
        if (!date) continue;
        const current = inRange(date, range.start, range.end);
        const prior = inRange(date, prev.start, prev.end);
        if (!current && !prior) continue;

        const abs = Math.abs(tx.amount);
        const isIncome = tx.amount > 0;

        if (current) {
            totals.count += 1;
            if (isIncome) totals.income += tx.amount;
            else totals.expenses += abs;

            const meta = bucketMeta(date, granularity);
            const idx = flowIndex.get(meta.key);
            if (idx !== undefined) {
                if (isIncome) flow[idx].income += tx.amount;
                else flow[idx].expenses += abs;
            }

            const iso = toDayKey(date);
            let heat = heatmapMap.get(iso);
            if (!heat) {
                heat = { date: startOfDay(date), iso, expenses: 0, income: 0, net: 0, count: 0 };
                heatmapMap.set(iso, heat);
            }
            heat.count += 1;
            if (isIncome) heat.income += tx.amount;
            else heat.expenses += abs;
            heat.net = heat.income - heat.expenses;

            if (!isIncome) {
                const group = getCategoryGroup(tx.category);
                groupTotals[group] = (groupTotals[group] || 0) + abs;
                const merchant = tx.name.trim() || "Unknown";
                const row = merchantMap.get(merchant) ?? { amount: 0, count: 0 };
                row.amount += abs;
                row.count += 1;
                merchantMap.set(merchant, row);
                const weekdayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
                weekdayTotals[weekdayIdx].expenses += abs;
                weekdayTotals[weekdayIdx].count += 1;
            }
        } else if (prior) {
            previous.count += 1;
            if (isIncome) previous.income += tx.amount;
            else {
                previous.expenses += abs;
                const group = getCategoryGroup(tx.category);
                prevGroupTotals[group] = (prevGroupTotals[group] || 0) + abs;
            }
        }
    }

    for (const point of flow) point.net = point.income - point.expenses;
    totals.net = totals.income - totals.expenses;
    totals.savingsRate = savingsRate(totals.income, totals.expenses);
    totals.dailyBurn = totals.expenses / span;
    previous.net = previous.income - previous.expenses;
    previous.savingsRate = savingsRate(previous.income, previous.expenses);

    const groups: CategoryGroupData[] = Object.entries(groupTotals)
        .map(([group, total]) => ({
            group,
            total,
            color: GROUP_COLORS[group] || GROUP_COLORS.Other,
            percentage: totals.expenses > 0 ? (total / totals.expenses) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

    const slopeNames = new Set([...Object.keys(groupTotals), ...Object.keys(prevGroupTotals)]);
    const slopes: SlopeRow[] = Array.from(slopeNames)
        .map((group) => ({
            group,
            previous: prevGroupTotals[group] || 0,
            current: groupTotals[group] || 0,
            color: GROUP_COLORS[group] || GROUP_COLORS.Other,
        }))
        .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
        .slice(0, 7);

    const merchantSorted = Array.from(merchantMap.entries())
        .map(([name, row]) => ({ name, ...row }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

    let running = 0;
    const merchants: MerchantRow[] = merchantSorted.map((row) => {
        running += row.amount;
        return {
            ...row,
            share: totals.expenses > 0 ? row.amount / totals.expenses : 0,
            cumulative: totals.expenses > 0 ? running / totals.expenses : 0,
        };
    });

    const peakWeekday =
        weekdayTotals.reduce((best, d) => (d.expenses > best.expenses ? d : best), weekdayTotals[0])
            ?.day ?? "—";

    return {
        empty: filtered.length === 0,
        period,
        range,
        previousRange: prev,
        rangeLabel: formatRangeLabel(range.start, range.end),
        totals,
        previous,
        flow,
        heatmap: Array.from(heatmapMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime()),
        groups,
        slopes,
        merchants,
        weekdays: weekdayTotals,
        peakWeekday,
    };
}

export function deltaRatio(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return (current - previous) / previous;
}
