"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Transaction } from "@/lib/types";
import {
    PERIODS,
    PeriodKey,
    buildDashboardModel,
    deltaRatio,
    formatCurrency,
    formatPercentage,
} from "@/lib/dashboardUtils";
import { createSampleLedger } from "@/lib/sampleLedger";
import { CashFlowRiver, MiniSpark } from "./dashboard/CashFlowRiver";
import { CategoryMosaic } from "./dashboard/CategoryMosaic";
import { LedgerHeatmap } from "./dashboard/LedgerHeatmap";
import { SavingsArc, WeekdayRing } from "./dashboard/Complications";
import { MerchantLedger, Slopegraph } from "./dashboard/Concentration";

interface DashboardProps {
    transactions: Transaction[];
}

function DeltaChip({
    current,
    previous,
    invert = false,
}: {
    current: number;
    previous: number;
    invert?: boolean;
}) {
    const ratio = deltaRatio(current, previous);
    if (ratio === null) {
        return <span className="font-mono text-[11px] text-muted-foreground">New window</span>;
    }
    const up = ratio > 0.0005;
    const down = ratio < -0.0005;
    const good = invert ? down : up;
    const bad = invert ? up : down;
    return (
        <span
            className={clsx(
                "font-mono text-[11px] tabular-nums",
                good && "text-[hsl(var(--flow-in))]",
                bad && "text-[hsl(var(--flow-out))]",
                !good && !bad && "text-muted-foreground"
            )}
        >
            {formatPercentage(ratio * 100)} vs prior
        </span>
    );
}

function Panel({
    label,
    kicker,
    children,
    className,
}: {
    label: string;
    kicker?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={clsx("dash-panel", className)}>
            <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-1">
                <h2 className="dash-kicker">{label}</h2>
                {kicker && (
                    <span className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                        {kicker}
                    </span>
                )}
            </div>
            <div className="px-4 pb-4 pt-1">{children}</div>
        </section>
    );
}

export function Dashboard({ transactions }: DashboardProps) {
    const [period, setPeriod] = useState<PeriodKey>("90d");
    const [preview, setPreview] = useState(false);

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("preview") === "1") {
            setPreview(true);
        }
    }, []);
    const source = useMemo(
        () => (preview && transactions.length === 0 ? createSampleLedger() : transactions),
        [preview, transactions]
    );
    const model = useMemo(() => buildDashboardModel(source, period), [source, period]);

    if (model.empty) {
        return (
            <div className="dash-shell h-full overflow-y-auto">
                <div className="dash-grain relative flex min-h-full flex-col items-center justify-center px-8 py-16 text-center">
                    <p className="dash-kicker mb-4">Overview</p>
                    <h1 className="font-display text-4xl text-foreground md:text-6xl">The ledger awaits</h1>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                        Import a statement from Transactions. Folioli will compose cash flow, spending
                        architecture, and rhythm from your own books — nothing leaves this machine.
                    </p>
                    <button
                        type="button"
                        onClick={() => setPreview(true)}
                        className="mt-8 rounded-full border border-border px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-foreground hover:text-foreground"
                    >
                        Inspect a composed sample
                    </button>
                    <svg viewBox="0 0 600 80" className="mt-12 w-full max-w-xl opacity-40">
                        <path
                            d="M0 50 C 80 50, 80 18, 150 18 S 230 62, 300 40 S 420 8, 480 28 S 560 55, 600 42"
                            fill="none"
                            stroke="hsl(var(--flow-in))"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M0 50 C 80 50, 90 70, 160 64 S 250 44, 320 58 S 430 78, 500 60 S 560 50, 600 54"
                            fill="none"
                            stroke="hsl(var(--flow-out))"
                            strokeWidth="1.25"
                            strokeOpacity="0.7"
                        />
                    </svg>
                </div>
            </div>
        );
    }

    const { totals, previous, flow } = model;

    return (
        <div className="dash-shell h-full overflow-y-auto">
            <div className="dash-grain mx-auto flex max-w-[1400px] flex-col gap-4 pb-10">
                <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="dash-kicker mb-2">Private ledger</p>
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                            <h1
                                className={clsx(
                                    "font-display text-5xl leading-none tracking-tight md:text-7xl",
                                    totals.net >= 0 ? "text-foreground" : "text-[hsl(var(--flow-out))]"
                                )}
                            >
                                {totals.net < 0 ? "−" : ""}
                                {formatCurrency(Math.abs(totals.net))}
                            </h1>
                            <div className="mb-1.5 space-y-1">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                    Net cash flow
                                </div>
                                <DeltaChip current={totals.net} previous={previous.net} />
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{model.rangeLabel}</p>
                        {preview && transactions.length === 0 && (
                            <button
                                type="button"
                                onClick={() => setPreview(false)}
                                className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                                Sample composition — dismiss
                            </button>
                        )}
                    </div>

                    <div
                        className="inline-flex self-start rounded-full border border-border/80 bg-card/60 p-1 backdrop-blur-md"
                        role="tablist"
                        aria-label="Period"
                    >
                        {PERIODS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={period === item.key}
                                onClick={() => setPeriod(item.key)}
                                className={clsx(
                                    "rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase transition",
                                    period === item.key
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </header>

                <Panel label="Cash river" kicker="Inflow above · Outflow below">
                    <CashFlowRiver data={flow} />
                    <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 md:grid-cols-4">
                        <Stat
                            label="Inflow"
                            value={formatCurrency(totals.income)}
                            delta={<DeltaChip current={totals.income} previous={previous.income} />}
                            spark={<MiniSpark values={flow.map((p) => p.income)} tone="in" />}
                        />
                        <Stat
                            label="Outflow"
                            value={formatCurrency(totals.expenses)}
                            delta={
                                <DeltaChip
                                    current={totals.expenses}
                                    previous={previous.expenses}
                                    invert
                                />
                            }
                            spark={<MiniSpark values={flow.map((p) => p.expenses)} tone="out" />}
                        />
                        <Stat
                            label="Retained"
                            value={
                                totals.income <= 0 && totals.expenses > 0
                                    ? "—"
                                    : `${totals.savingsRate.toFixed(0)}%`
                            }
                            delta={
                                <DeltaChip
                                    current={totals.savingsRate}
                                    previous={previous.savingsRate}
                                />
                            }
                            spark={<MiniSpark values={flow.map((p) => p.net)} tone="net" />}
                        />
                        <Stat
                            label="Daily burn"
                            value={formatCurrency(totals.dailyBurn)}
                            delta={
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    {totals.count} entries
                                </span>
                            }
                        />
                    </div>
                </Panel>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <Panel
                        className="xl:col-span-7"
                        label="Spending architecture"
                        kicker="Proportional mosaic"
                    >
                        <CategoryMosaic groups={model.groups} />
                    </Panel>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
                        <Panel label="Retention" kicker="Share of inflow kept">
                            <SavingsArc
                                rate={totals.savingsRate}
                                income={totals.income}
                                expenses={totals.expenses}
                            />
                        </Panel>
                        <Panel label="Weekday rhythm" kicker={`Heaviest: ${model.peakWeekday}`}>
                            <WeekdayRing days={model.weekdays} peak={model.peakWeekday} />
                        </Panel>
                    </div>
                </div>

                <Panel label="Daily ledger" kicker="Outflow intensity">
                    <LedgerHeatmap
                        days={model.heatmap}
                        start={model.range.start}
                        end={model.range.end}
                    />
                </Panel>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Panel label="Concentration" kicker="Where the ink goes">
                        <MerchantLedger merchants={model.merchants} />
                    </Panel>
                    <Panel label="Category drift" kicker="Prior window → current">
                        <Slopegraph rows={model.slopes} />
                    </Panel>
                </div>
            </div>
        </div>
    );
}

function Stat({
    label,
    value,
    delta,
    spark,
}: {
    label: string;
    value: string;
    delta: ReactNode;
    spark?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="dash-kicker mb-1">{label}</div>
                <div className="font-display text-2xl leading-none text-foreground">{value}</div>
                <div className="mt-1.5">{delta}</div>
            </div>
            {spark}
        </div>
    );
}
