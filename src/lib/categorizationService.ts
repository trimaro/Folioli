/**
 * Categorization Service
 *
 * Priority order:
 * 1. Learned mappings (user corrections, keyed by merchantKey)
 * 2. Amount-aware rules (ATM deposits vs withdrawals)
 * 3. Keyword matching (from JSON config)
 * 4. Default to "Uncategorized"
 */

import type { Category } from "./categories";
import categoryKeywords from "../config/categoryKeywords.json";

export type LearnedMappings = Map<string, Category>;

export type MappingWrite =
    | { action: "upsert"; category: Category }
    | { action: "delete" }
    | { action: "skip" };

const KEYWORD_MAP = new Map<string, Category>();

(function initializeKeywordMap() {
    const keywords = categoryKeywords as Record<string, string[]>;
    for (const [category, keywordList] of Object.entries(keywords)) {
        for (const keyword of keywordList) {
            KEYWORD_MAP.set(keyword.toLowerCase(), category as Category);
        }
    }
})();

const PREFIXES = [
    "interac - purchase - ",
    "interac purchase ",
    "paypal *",
    "paypal ",
    "sq *",
    "sq ",
    "tst *",
    "tst ",
    "pos - ",
    "debit - ",
    "credit - ",
    "eft - ",
];

const ALIASES: Record<string, string> = {
    amzn: "amazon",
    amazonn: "amazon",
};

const JUNK_TOKENS = new Set([
    "mktp",
    "marketplace",
    "www",
    "com",
    "net",
    "http",
    "https",
    "inc",
    "ltd",
    "llc",
]);

const COMPOUND_SECONDS = new Set([
    "foods",
    "food",
    "depot",
    "tire",
    "tires",
    "market",
    "markets",
    "drugs",
    "drug",
    "hardware",
    "computers",
    "express",
    "bank",
    "credit",
    "mobile",
    "fitness",
    "studio",
    "cafe",
    "coffee",
    "pizza",
    "burger",
    "king",
    "hops",
    "buy",
    "joe",
    "joes",
    "eleven",
    "bath",
    "sonoma",
    "barrel",
    "barn",
    "western",
    "airlines",
    "air",
    "canada",
    "horton",
    "hortons",
]);

const REGION_CODES = new Set([
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia",
    "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt",
    "va", "wa", "wv", "wi", "wy", "dc",
    "ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt",
    "us", "usa", "uk", "gb",
]);

function applyAlias(token: string): string {
    return ALIASES[token] ?? token;
}

function isPureNumber(token: string): boolean {
    return /^\d+$/.test(token);
}

function isAlphanumRef(token: string): boolean {
    return /[0-9]/.test(token) && /[a-z]/.test(token);
}

function isTrailingNoise(token: string): boolean {
    return REGION_CODES.has(token) || isPureNumber(token) || isAlphanumRef(token) || JUNK_TOKENS.has(token);
}

function isInternalNoise(token: string): boolean {
    if (JUNK_TOKENS.has(token)) return true;
    if (isAlphanumRef(token)) return true;
    if (isPureNumber(token) && token.length >= 2) return true;
    return false;
}

/**
 * Light cleanup for keyword / ATM matching. Keeps distinctive tokens
 * (starbucks, amazon) inside noisy bank strings.
 */
export function cleanDescription(name: string): string {
    if (!name) return "";

    let cleaned = name.toLowerCase().trim();
    cleaned = cleaned.replace(/^https?:\/\//, "").replace(/^www\./, "");

    for (const prefix of PREFIXES) {
        if (cleaned.startsWith(prefix)) {
            cleaned = cleaned.slice(prefix.length);
            break;
        }
    }

    return cleaned.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Stable merchant identity used as the learned-map key.
 * STARBUCKS #18472 SEATTLE and STARBUCKS #99 PORTLAND → "starbucks"
 */
export function merchantKey(name: string): string {
    const tokens = cleanDescription(name).split(" ").filter(Boolean).map(applyAlias);

    while (tokens.length > 0 && isTrailingNoise(tokens[tokens.length - 1])) {
        tokens.pop();
    }

    const meaningful = tokens.filter((token) => !isInternalNoise(token));
    if (meaningful.length === 0) return "";

    const first = meaningful[0];
    const second = meaningful[1];
    if (second && COMPOUND_SECONDS.has(second)) {
        return `${first} ${second}`;
    }
    return first;
}

/** @deprecated Use merchantKey for mappings; kept so older call sites keep working. */
export function normalizeTransactionName(name: string): string {
    return merchantKey(name);
}

export function mappingWriteForEdit(
    originalCategory: string | undefined,
    nextCategory: string | undefined
): MappingWrite {
    const original = originalCategory || "Uncategorized";
    const next = nextCategory || "Uncategorized";
    if (original === next) return { action: "skip" };
    if (next === "Uncategorized") return { action: "delete" };
    return { action: "upsert", category: next as Category };
}

export function remapMappingRows(
    rows: Array<{ normalized_name: string; category: string; updated_at?: string }>
): Array<{ normalized_name: string; category: string }> {
    const byKey = new Map<string, { category: string; updated_at: string }>();

    for (const row of rows) {
        const key = merchantKey(row.normalized_name);
        if (!key) continue;
        const ts = row.updated_at ?? "";
        const prev = byKey.get(key);
        if (!prev || ts >= prev.updated_at) {
            byKey.set(key, { category: row.category, updated_at: ts });
        }
    }

    return [...byKey.entries()].map(([normalized_name, value]) => ({
        normalized_name,
        category: value.category,
    }));
}

async function migrateMappingKeys(db: any): Promise<void> {
    const rows = await db.select(
        "SELECT normalized_name, category, updated_at FROM category_mappings"
    ) as Array<{ normalized_name: string; category: string; updated_at?: string }>;

    if (rows.length === 0) return;

    const remapped = remapMappingRows(rows);
    const keep = new Set(remapped.map((row) => row.normalized_name));
    const changed =
        remapped.length !== rows.length ||
        rows.some((row) => !keep.has(row.normalized_name)) ||
        remapped.some((row) => {
            const existing = rows.find((r) => r.normalized_name === row.normalized_name);
            return !existing || existing.category !== row.category;
        });

    if (!changed) return;

    for (const row of remapped) {
        await db.execute(
            `INSERT INTO category_mappings (normalized_name, category, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT(normalized_name) DO UPDATE SET
                category = $2,
                updated_at = CURRENT_TIMESTAMP`,
            [row.normalized_name, row.category]
        );
    }

    for (const row of rows) {
        if (!keep.has(row.normalized_name)) {
            await db.execute(
                "DELETE FROM category_mappings WHERE normalized_name = $1",
                [row.normalized_name]
            );
        }
    }
}

export async function loadMappingsFromDB(db: any): Promise<LearnedMappings> {
    const mappings = new Map<string, Category>();
    if (!db) return mappings;

    try {
        await migrateMappingKeys(db);

        const rows = await db.select(
            "SELECT normalized_name, category FROM category_mappings"
        ) as Array<{ normalized_name: string; category: string }>;

        for (const row of rows) {
            mappings.set(row.normalized_name, row.category as Category);
        }

        console.log(`Loaded ${mappings.size} learned category mappings from database`);
    } catch (error) {
        console.error("Failed to load category mappings:", error);
    }

    return mappings;
}

export async function saveMappingToDB(
    db: any,
    transactionName: string,
    category: Category
): Promise<void> {
    const key = merchantKey(transactionName);
    if (!db || !key) return;
    if (category === "Uncategorized") return;

    try {
        await db.execute(
            `INSERT INTO category_mappings (normalized_name, category, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT(normalized_name) DO UPDATE SET
                category = $2,
                updated_at = CURRENT_TIMESTAMP`,
            [key, category]
        );
        console.log(`Saved mapping: "${key}" → ${category}`);
    } catch (error) {
        console.error("Failed to save category mapping:", error);
    }
}

export async function deleteMappingByKeyFromDB(db: any, key: string): Promise<void> {
    if (!db || !key) return;
    try {
        await db.execute(
            "DELETE FROM category_mappings WHERE normalized_name = $1",
            [key]
        );
        console.log(`Forgot mapping: "${key}"`);
    } catch (error) {
        console.error("Failed to delete category mapping:", error);
    }
}

export async function deleteMappingFromDB(db: any, transactionName: string): Promise<void> {
    await deleteMappingByKeyFromDB(db, merchantKey(transactionName));
}

/**
 * Learned mappings come only from the category_mappings table.
 * Confirmed transactions are not harvested into the map.
 */
export function buildLearnedMappings(dbMappings?: LearnedMappings): LearnedMappings {
    return new Map(dbMappings || []);
}

export function categorize(
    name: string,
    amount?: number,
    learnedMappings?: LearnedMappings
): Category {
    const key = merchantKey(name);
    const cleaned = cleanDescription(name);
    const isIncome = amount !== undefined && amount > 0;

    if (key && learnedMappings?.has(key)) {
        return learnedMappings.get(key)!;
    }

    if (
        cleaned.includes("atm") ||
        cleaned.includes("abm") ||
        (cleaned.includes("cash") && cleaned.includes("deposit"))
    ) {
        return isIncome ? "Income" : "ATM Withdrawal";
    }

    const words = cleaned.split(" ").filter(Boolean);

    for (const word of words) {
        if (KEYWORD_MAP.has(word)) {
            return KEYWORD_MAP.get(word)!;
        }
    }

    for (let i = 0; i < words.length - 1; i++) {
        const bigram = words[i] + " " + words[i + 1];
        if (KEYWORD_MAP.has(bigram)) {
            return KEYWORD_MAP.get(bigram)!;
        }
    }

    return "Uncategorized";
}

export function autoCategorize(name: string, amount?: number): Category {
    return categorize(name, amount);
}
