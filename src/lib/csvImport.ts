const DATE_HEADERS = [
    "transaction date",
    "posting date",
    "post date",
    "date",
    "time",
];

const NAME_HEADERS = [
    "description",
    "desc",
    "payee",
    "name",
    "merchant",
    "details",
    "transaction",
];

const AMOUNT_HEADERS = ["amount", "amt", "debit", "credit", "value"];

const MEMO_HEADERS = ["memo", "notes", "type"];

/** Credit-card statements often label spend this way, with charges as positive numbers. */
const SPEND_TYPE = /^(purchase|charge|fee|interest|sale|authorization)\b/i;

export type MappedCsvRow = {
    date: string;
    name: string;
    amount: number;
    memo: string;
};

export function normalizeHeader(key: string): string {
    return key
        .replace(/^\uFEFF/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function findCsvValue(
    row: Record<string, unknown>,
    headers: string[]
): string | null {
    const entries = Object.entries(row).map(([key, value]) => [
        normalizeHeader(key),
        value,
    ] as const);

    for (const header of headers) {
        const wanted = normalizeHeader(header);
        const match = entries.find(([key]) => key === wanted);
        if (!match || match[1] == null) continue;
        const text = String(match[1]).trim();
        if (text) return text;
    }
    return null;
}

function parseAmount(row: Record<string, unknown>): number {
    const amount = parseFloat(findCsvValue(row, AMOUNT_HEADERS) || "0");
    return Number.isNaN(amount) ? 0 : amount;
}

/**
 * Credit-card CSVs (e.g. Wealthsimple) list purchases as positive and payments as
 * negative. Bank ledgers usually already use expense-negative / income-positive.
 * Only flip when a Type column exists and most spend rows are positive.
 */
export function csvUsesCreditCardSigning(rows: Record<string, unknown>[]): boolean {
    const spendAmounts: number[] = [];
    for (const row of rows) {
        const type = findCsvValue(row, ["type"]);
        if (!type || !SPEND_TYPE.test(type)) continue;
        const amount = parseAmount(row);
        if (amount === 0) continue;
        spendAmounts.push(amount);
    }
    if (spendAmounts.length === 0) return false;
    const positive = spendAmounts.filter((amount) => amount > 0).length;
    return positive > spendAmounts.length / 2;
}

export function mapCsvRow(
    row: Record<string, unknown>,
    options: { negateAmount?: boolean } = {}
): MappedCsvRow {
    const amount = parseAmount(row);
    const name = findCsvValue(row, NAME_HEADERS) || "Unknown";
    const date =
        findCsvValue(row, DATE_HEADERS) ||
        new Date().toISOString().split("T")[0];
    const memo = findCsvValue(row, MEMO_HEADERS) || "";

    return {
        date,
        name,
        amount: options.negateAmount ? -amount : amount,
        memo: memo === name ? "" : memo,
    };
}

export function mapCsvRows(rows: Record<string, unknown>[]): MappedCsvRow[] {
    const negateAmount = csvUsesCreditCardSigning(rows);
    return rows.map((row) => mapCsvRow(row, { negateAmount }));
}
