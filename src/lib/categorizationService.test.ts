import { describe, expect, it } from "vitest";
import {
    categorize,
    mappingWriteForEdit,
    merchantKey,
    remapMappingRows,
} from "./categorizationService";

describe("merchantKey", () => {
    it("collapses store numbers and cities to the same Starbucks key", () => {
        expect(merchantKey("STARBUCKS #18472 SEATTLE")).toBe("starbucks");
        expect(merchantKey("STARBUCKS #99 PORTLAND")).toBe("starbucks");
        expect(merchantKey("Interac - Purchase - STARBUCKS #18472 SEATTLE WA")).toBe("starbucks");
    });

    it("strips Amazon marketplace junk", () => {
        expect(merchantKey("AMZN*MKTP US*AB12")).toBe("amazon");
        expect(merchantKey("AMZN MKTP US AB12")).toBe("amazon");
    });

    it("keeps compound grocery brands", () => {
        expect(merchantKey("WHOLE FOODS MARKET #12")).toBe("whole foods");
        expect(merchantKey("Whole Foods Market Seattle")).toBe("whole foods");
    });

    it("keeps 7-eleven", () => {
        expect(merchantKey("7-ELEVEN STORE #2041")).toBe("7 eleven");
    });
});

describe("categorize", () => {
    it("lets a learned map beat keyword heuristics", () => {
        const learned = new Map([[merchantKey("STARBUCKS #1"), "Groceries"]] as const);
        expect(categorize("STARBUCKS #18472 SEATTLE", -5.25, learned)).toBe("Groceries");
        expect(categorize("STARBUCKS #18472 SEATTLE", -5.25)).toBe("Cafe");
    });

    it("reuses a correction on the next import and forgets back to keywords", () => {
        const first = categorize("STARBUCKS #18472 SEATTLE", -5.25);
        expect(first).toBe("Cafe");
        expect(mappingWriteForEdit(first, first)).toEqual({ action: "skip" });

        const write = mappingWriteForEdit(first, "Groceries");
        expect(write).toEqual({ action: "upsert", category: "Groceries" });

        const learned = new Map([[merchantKey("STARBUCKS #18472 SEATTLE"), "Groceries"]] as const);
        expect(categorize("STARBUCKS #99 PORTLAND", -4.1, learned)).toBe("Groceries");
        expect(categorize("STARBUCKS #99 PORTLAND", -4.1)).toBe("Cafe");
    });
});

describe("mappingWriteForEdit", () => {
    it("does not write a mapping when the user accepts the heuristic", () => {
        expect(mappingWriteForEdit("Cafe", "Cafe")).toEqual({ action: "skip" });
    });

    it("upserts when the user corrects a category", () => {
        expect(mappingWriteForEdit("Cafe", "Groceries")).toEqual({
            action: "upsert",
            category: "Groceries",
        });
        expect(mappingWriteForEdit("Uncategorized", "Dining")).toEqual({
            action: "upsert",
            category: "Dining",
        });
    });

    it("deletes the mapping when the user sets Uncategorized", () => {
        expect(mappingWriteForEdit("Cafe", "Uncategorized")).toEqual({ action: "delete" });
    });
});

describe("remapMappingRows", () => {
    it("migrates noisy keys onto merchantKey and keeps the newest category", () => {
        const remapped = remapMappingRows([
            {
                normalized_name: "starbucks #18472 seattle",
                category: "Cafe",
                updated_at: "2024-01-01",
            },
            {
                normalized_name: "starbucks #99 portland",
                category: "Dining",
                updated_at: "2024-06-01",
            },
        ]);

        expect(remapped).toEqual([{ normalized_name: "starbucks", category: "Dining" }]);
    });
});
