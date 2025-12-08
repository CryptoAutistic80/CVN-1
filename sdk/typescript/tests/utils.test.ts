import { describe, it, expect } from "vitest";
import {
    bpsToPercent,
    percentToBps,
    formatAddress,
    toBigInt,
    CVN1_TESTNET_ADDRESS
} from "../src/utils";

describe("Utils", () => {
    describe("bpsToPercent", () => {
        it("converts 250 bps to 2.5%", () => {
            expect(bpsToPercent(250)).toBe(2.5);
        });

        it("converts 10000 bps to 100%", () => {
            expect(bpsToPercent(10000)).toBe(100);
        });

        it("converts 0 bps to 0%", () => {
            expect(bpsToPercent(0)).toBe(0);
        });
    });

    describe("percentToBps", () => {
        it("converts 2.5% to 250 bps", () => {
            expect(percentToBps(2.5)).toBe(250);
        });

        it("converts 100% to 10000 bps", () => {
            expect(percentToBps(100)).toBe(10000);
        });

        it("rounds correctly", () => {
            expect(percentToBps(2.55)).toBe(255);
        });
    });

    describe("formatAddress", () => {
        it("truncates long addresses", () => {
            const addr = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
            expect(formatAddress(addr)).toBe("0x87e8...cd2c");
        });

        it("returns short addresses unchanged", () => {
            expect(formatAddress("0x1234")).toBe("0x1234");
        });
    });

    describe("toBigInt", () => {
        it("converts string to bigint", () => {
            expect(toBigInt("1000")).toBe(1000n);
        });

        it("converts number to bigint", () => {
            expect(toBigInt(1000)).toBe(1000n);
        });

        it("passes through bigint unchanged", () => {
            expect(toBigInt(1000n)).toBe(1000n);
        });
    });

    describe("constants", () => {
        it("has correct testnet address", () => {
            expect(CVN1_TESTNET_ADDRESS).toBe("0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c");
        });
    });
});
