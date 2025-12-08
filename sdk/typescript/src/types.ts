/**
 * CVN-1 TypeScript SDK Types
 * Type definitions for Cedra Vaulted NFT Standard
 */

/**
 * Collection configuration stored on-chain
 */
export interface VaultConfig {
    /** Creator royalty in basis points (10000 = 100%) */
    creatorRoyaltyBps: number;
    /** Vault royalty in basis points (from secondary sales) */
    vaultRoyaltyBps: number;
    /** Allowed FA types (empty = any allowed) */
    allowedAssets: string[];
    /** Address to receive creator payments */
    creatorPayoutAddr: string;
}

/**
 * Parameters for initializing a new collection
 */
export interface CollectionConfig {
    /** Collection name */
    name: string;
    /** Collection description */
    description: string;
    /** Collection metadata URI */
    uri: string;
    /** Creator royalty in basis points (0-10000) */
    creatorRoyaltyBps: number;
    /** Vault royalty in basis points (0-10000) */
    vaultRoyaltyBps: number;
    /** Percentage of mint fee to vault (0-10000) */
    mintVaultBps: number;
    /** Mint price in smallest FA units (0 = free) */
    mintPrice: bigint;
    /** FA metadata address for mint payments */
    mintPriceFa: string;
    /** Allowed FA types for deposits */
    allowedAssets: string[];
    /** Address to receive creator payments */
    creatorPayoutAddr: string;
}

/**
 * Parameters for minting a new vaulted NFT
 */
export interface MintParams {
    /** Recipient address */
    to: string;
    /** Token name */
    name: string;
    /** Token description */
    description: string;
    /** Token metadata URI */
    uri: string;
    /** Whether the vault can be burned and redeemed */
    isRedeemable: boolean;
}

/**
 * Balance of a single FA type in a vault
 */
export interface VaultBalance {
    /** FA metadata address */
    faMetadataAddr: string;
    /** Balance in smallest units */
    balance: bigint;
}

/**
 * Vault info returned by get_vault_info view
 */
export interface VaultInfo {
    /** Whether vault can be redeemed */
    isRedeemable: boolean;
    /** Creator address */
    creatorAddr: string;
    /** Whether last sale used vault royalty */
    lastSaleCompliant: boolean;
}

/**
 * Result of minting a vaulted NFT
 */
export interface MintResult {
    /** Transaction hash */
    txHash: string;
    /** NFT object address */
    nftAddress: string;
}

/**
 * Transaction result
 */
export interface TxResult {
    /** Transaction hash */
    hash: string;
    /** Whether transaction succeeded */
    success: boolean;
    /** Gas used */
    gasUsed: number;
}
