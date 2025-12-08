import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

// CVN-1 Contract address on testnet
export const CVN1_ADDRESS = "0xdd8a5cf89985a6d8bb4f91c7b943d2bdbc2faae400aa6737e877feb68369f926";
export const MODULE_NAME = "vaulted_collection";

// Initialize Cedra client for testnet
const config = new CedraConfig({ network: Network.TESTNET });
export const cedra = new Cedra(config);

// Types
export interface VaultConfig {
    creatorRoyaltyBps: number;
    vaultRoyaltyBps: number;
    allowedAssets: string[];
    creatorPayoutAddr: string;
}

export interface VaultBalance {
    faMetadataAddr: string;
    balance: bigint;
}

// View functions (gas-free)
export async function vaultExists(nftAddr: string): Promise<boolean> {
    try {
        const result = await cedra.view({
            payload: {
                function: `${CVN1_ADDRESS}::${MODULE_NAME}::vault_exists`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });
        return result[0] as boolean;
    } catch {
        return false;
    }
}

export async function getVaultConfig(creatorAddr: string): Promise<VaultConfig | null> {
    try {
        const result = await cedra.view({
            payload: {
                function: `${CVN1_ADDRESS}::${MODULE_NAME}::get_vault_config`,
                typeArguments: [],
                functionArguments: [creatorAddr],
            },
        });
        return {
            creatorRoyaltyBps: Number(result[0]),
            vaultRoyaltyBps: Number(result[1]),
            allowedAssets: result[2] as string[],
            creatorPayoutAddr: result[3] as string,
        };
    } catch {
        return null;
    }
}

export async function getVaultBalances(nftAddr: string): Promise<VaultBalance[]> {
    try {
        const result = await cedra.view({
            payload: {
                function: `${CVN1_ADDRESS}::${MODULE_NAME}::get_vault_balances`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });

        const balances = result[0] as Array<{ fa_metadata_addr: string; balance: string }>;
        return balances.map(b => ({
            faMetadataAddr: b.fa_metadata_addr,
            balance: BigInt(b.balance),
        }));
    } catch {
        return [];
    }
}

// Helper functions
export function bpsToPercent(bps: number): number {
    return bps / 100;
}

export function formatAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface NFT {
    address: string;
    collection: string;
    name: string;
    uri: string;
    hasVault: boolean;
}

export async function getWalletNfts(ownerAddr: string): Promise<NFT[]> {
    try {
        // Use the Digital Asset indexer to get owned tokens
        const tokens = await cedra.getAccountOwnedTokens({
            accountAddress: ownerAddr,
        });

        const nfts: NFT[] = [];

        // LIMIT to 20 for performance during this demo
        for (const token of tokens.slice(0, 20)) {
            // Check if this NFT has a vault
            const hasVault = await vaultExists(token.token_data_id);

            nfts.push({
                address: token.token_data_id,
                collection: token.current_token_data?.collection_id ?? "",
                name: token.current_token_data?.token_name ?? "Unknown NFT",
                uri: token.current_token_data?.token_uri ?? "",
                hasVault,
            });
        }

        return nfts;
    } catch (e) {
        console.error("Failed to fetch NFTs:", e);
        return [];
    }
}
