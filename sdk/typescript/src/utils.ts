/**
 * CVN-1 TypeScript SDK Utilities
 */

/**
 * Convert basis points to percentage
 * @param bps Basis points (10000 = 100%)
 * @returns Percentage (100 = 100%)
 */
export function bpsToPercent(bps: number): number {
    return bps / 100;
}

/**
 * Convert percentage to basis points
 * @param percent Percentage (100 = 100%)
 * @returns Basis points (10000 = 100%)
 */
export function percentToBps(percent: number): number {
    return Math.round(percent * 100);
}

/**
 * Format an address for display (truncated)
 * @param address Full address
 * @returns Truncated address like "0x1234...abcd"
 */
export function formatAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Parse a bigint from various input types
 */
export function toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    return BigInt(value);
}

/**
 * Module address for the deployed CVN-1 contract on testnet
 */
export const CVN1_TESTNET_ADDRESS = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
