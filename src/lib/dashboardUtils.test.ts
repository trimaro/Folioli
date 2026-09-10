import { describe, expect, it } from "vitest";
import { buildDashboardModel } from "./dashboardUtils";
import type { Transaction } from "./types";

function tx(partial: Partial<Transaction> & Pick<Transaction, "status" | "amount">): Transaction {
    return {
        date: "2026-03-01",
        name: "Starbucks",
        category: "Cafe",
        ...partial,
    };
}

describe("buildDashboardModel", () => {
    it("ignores pending imports and account transfers", () => {
        const pendingOnly = buildDashboardModel(
            [tx({ status: "pending", amount: -12 })],
            "all"
        );
        expect(pendingOnly.empty).toBe(true);

        const mixed = buildDashboardModel(
            [
                tx({ status: "pending", amount: -12, name: "Pending Cafe" }),
                tx({ status: "confirmed", amount: -40, name: "Saved Cafe" }),
                tx({
                    status: "confirmed",
                    amount: -800,
                    name: "Move to savings",
                    category: "Account Transfer",
                }),
            ],
            "all"
        );
        expect(mixed.empty).toBe(false);
        expect(mixed.totals.count).toBe(1);
        expect(mixed.totals.expenses).toBe(40);
    });
});
