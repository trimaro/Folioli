import { describe, expect, it } from "vitest";
import {
    csvUsesCreditCardSigning,
    findCsvValue,
    mapCsvRow,
    mapCsvRows,
    normalizeHeader,
} from "./csvImport";

describe("normalizeHeader", () => {
    it("treats underscores, hyphens, and spaces as the same", () => {
        expect(normalizeHeader("transaction_date")).toBe("transaction date");
        expect(normalizeHeader("Transaction Date")).toBe("transaction date");
        expect(normalizeHeader("\uFEFFtransaction_date")).toBe("transaction date");
    });
});

describe("mapCsvRow", () => {
    it("maps Wealthsimple credit card exports", () => {
        const mapped = mapCsvRow({
            transaction_date: "2026-07-11",
            post_date: "2026-07-12",
            type: "Purchase",
            details: "LCBO/RAO #0212",
            amount: "7.9",
            currency: "CAD",
        });

        expect(mapped).toEqual({
            date: "2026-07-11",
            name: "LCBO/RAO #0212",
            amount: 7.9,
            memo: "Purchase",
        });
    });

    it("maps Date / Description / Amount headers", () => {
        const mapped = mapCsvRow({
            Date: "2024-09-01",
            Description: "Starbucks",
            Amount: "-5.75",
            Memo: "Coffee",
        });

        expect(mapped).toEqual({
            date: "2024-09-01",
            name: "Starbucks",
            amount: -5.75,
            memo: "Coffee",
        });
    });

    it("does not duplicate the merchant into memo", () => {
        const mapped = mapCsvRow({
            date: "2026-07-11",
            details: "TIM HORTONS #21603",
            amount: "18.92",
        });

        expect(mapped.name).toBe("TIM HORTONS #21603");
        expect(mapped.memo).toBe("");
    });
});

describe("csvUsesCreditCardSigning", () => {
    it("detects Wealthsimple-style purchases listed as positive", () => {
        expect(
            csvUsesCreditCardSigning([
                { type: "Purchase", details: "LCBO", amount: "7.9" },
                { type: "Purchase", details: "TIM HORTONS", amount: "18.92" },
                { type: "Payment", details: "From chequing account", amount: "-226.73" },
            ])
        ).toBe(true);
    });

    it("leaves already-signed bank ledgers alone", () => {
        expect(
            csvUsesCreditCardSigning([
                { Date: "2024-09-01", Description: "Starbucks", Amount: "-5.75" },
                { Date: "2024-09-02", Description: "Payroll", Amount: "2400" },
            ])
        ).toBe(false);
    });

    it("does not flip files whose purchases are already expenses", () => {
        expect(
            csvUsesCreditCardSigning([
                { type: "Purchase", details: "LCBO", amount: "-7.9" },
                { type: "Purchase", details: "TIM HORTONS", amount: "-18.92" },
            ])
        ).toBe(false);
    });
});

describe("mapCsvRows", () => {
    it("negates a credit-card statement so purchases are expenses", () => {
        const mapped = mapCsvRows([
            {
                transaction_date: "2026-07-11",
                type: "Purchase",
                details: "LCBO/RAO #0212",
                amount: "7.9",
            },
            {
                transaction_date: "2026-07-20",
                type: "Payment",
                details: "From chequing account",
                amount: "-226.73",
            },
        ]);

        expect(mapped[0].amount).toBeCloseTo(-7.9);
        expect(mapped[1].amount).toBeCloseTo(226.73);
    });

    it("does not negate a normal bank CSV", () => {
        const mapped = mapCsvRows([
            { Date: "2024-09-01", Description: "Starbucks", Amount: "-5.75" },
            { Date: "2024-09-02", Description: "Payroll", Amount: "2400" },
        ]);

        expect(mapped[0].amount).toBeCloseTo(-5.75);
        expect(mapped[1].amount).toBe(2400);
    });
});

describe("findCsvValue", () => {
    it("reads the first matching header in the alias list", () => {
        const row = {
            transaction_date: "2026-07-11",
            post_date: "2026-07-12",
        };
        expect(findCsvValue(row, ["transaction date", "post date"])).toBe("2026-07-11");
        expect(findCsvValue(row, ["post date"])).toBe("2026-07-12");
    });
});
