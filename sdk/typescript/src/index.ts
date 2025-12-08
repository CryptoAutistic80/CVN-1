/**
 * CVN-1 TypeScript SDK
 * 
 * Type-safe client for the Cedra Vaulted NFT Standard
 * 
 * @packageDocumentation
 */

// Main client
export { CVN1Client } from "./CVN1Client";

// Types
export {
    VaultConfig,
    VaultBalance,
    VaultInfo,
    CollectionConfig,
    MintParams,
    MintResult,
    TxResult,
} from "./types";

// Utilities
export {
    bpsToPercent,
    percentToBps,
    formatAddress,
    toBigInt,
    CVN1_TESTNET_ADDRESS,
} from "./utils";
