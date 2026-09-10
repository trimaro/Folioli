import { Transaction } from "./types";

const MERCHANTS: Array<{ name: string; category: string; amount: number; cadence: number }> = [
    { name: "Whole Foods Market", category: "Groceries", amount: -118, cadence: 7 },
    { name: "Equinox SoHo", category: "Fitness", amount: -245, cadence: 30 },
    { name: "Con Edison", category: "Utilities", amount: -164, cadence: 30 },
    { name: "Brooklyn Rent", category: "Rent", amount: -2850, cadence: 30 },
    { name: "Sweetgreen", category: "Dining", amount: -18, cadence: 4 },
    { name: "Shell", category: "Fuel", amount: -52, cadence: 10 },
    { name: "Apple", category: "Subscriptions", amount: -16.99, cadence: 30 },
    { name: "United Airlines", category: "Flights", amount: -428, cadence: 90 },
    { name: "Pharmacy", category: "Pharmacy", amount: -24, cadence: 21 },
    { name: "Blue Bottle", category: "Cafe", amount: -7.5, cadence: 3 },
    { name: "The Met", category: "Entertainment", amount: -32, cadence: 45 },
    { name: "Payroll", category: "Income", amount: 4200, cadence: 15 },
    { name: "Vanguard", category: "Investments", amount: -500, cadence: 30 },
    { name: "Uber", category: "Rideshare", amount: -22, cadence: 6 },
];

export function createSampleLedger(): Transaction[] {
    const rows: Transaction[] = [];
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 7, 1);
    let id = 1;

    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const day = Math.floor(d.getTime() / 86400000);
        for (const merchant of MERCHANTS) {
            if (day % merchant.cadence !== 0) continue;
            const wobble = 0.85 + ((day + merchant.name.length) % 7) * 0.05;
            const amount = Math.round(merchant.amount * wobble * 100) / 100;
            rows.push({
                id: id++,
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                name: merchant.name,
                category: merchant.category,
                amount,
                status: "confirmed",
            });
        }
    }

    return rows;
}
