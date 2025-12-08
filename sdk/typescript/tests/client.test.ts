import { describe, it, expect, vi } from "vitest";
import { CVN1Client } from "../src/CVN1Client";
import { CollectionConfig } from "../src/types";

// Mock the Cedra SDK
const mockCedra = {
    view: vi.fn(),
    transaction: {
        build: {
            simple: vi.fn(),
        },
        sign: vi.fn(),
        submit: {
            simple: vi.fn(),
        },
    },
    waitForTransaction: vi.fn(),
};

describe("CVN1Client", () => {
    const client = new CVN1Client(mockCedra as any, "0xTEST_ADDRESS");

    describe("vaultExists", () => {
        it("returns true when vault exists", async () => {
            mockCedra.view.mockResolvedValueOnce([true]);
            const result = await client.vaultExists("0xNFT");
            expect(result).toBe(true);
        });

        it("returns false when vault does not exist", async () => {
            mockCedra.view.mockResolvedValueOnce([false]);
            const result = await client.vaultExists("0xNFT");
            expect(result).toBe(false);
        });
    });

    describe("getVaultConfig", () => {
        it("parses config correctly", async () => {
            mockCedra.view.mockResolvedValueOnce([
                250,  // creatorRoyaltyBps
                250,  // vaultRoyaltyBps
                ["0xCEDRA", "0xUSDC"],  // allowedAssets
                "0xCREATOR",  // creatorPayoutAddr
            ]);

            const config = await client.getVaultConfig("0xCREATOR");

            expect(config.creatorRoyaltyBps).toBe(250);
            expect(config.vaultRoyaltyBps).toBe(250);
            expect(config.allowedAssets).toEqual(["0xCEDRA", "0xUSDC"]);
            expect(config.creatorPayoutAddr).toBe("0xCREATOR");
        });
    });

    describe("getVaultBalances", () => {
        it("parses balances correctly", async () => {
            mockCedra.view.mockResolvedValueOnce([
                [
                    { fa_metadata_addr: "0xCEDRA", balance: "1000000" },
                    { fa_metadata_addr: "0xUSDC", balance: "500000" },
                ]
            ]);

            const balances = await client.getVaultBalances("0xNFT");

            expect(balances).toHaveLength(2);
            expect(balances[0].faMetadataAddr).toBe("0xCEDRA");
            expect(balances[0].balance).toBe(1000000n);
        });
    });

    describe("getVaultInfo", () => {
        it("parses vault info correctly", async () => {
            mockCedra.view.mockResolvedValueOnce([
                true,        // isRedeemable
                "0xCREATOR", // creatorAddr
                false,       // lastSaleCompliant
            ]);

            const info = await client.getVaultInfo("0xNFT");

            expect(info.isRedeemable).toBe(true);
            expect(info.creatorAddr).toBe("0xCREATOR");
            expect(info.lastSaleCompliant).toBe(false);
        });
    });
});
