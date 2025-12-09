import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";

// CVN-1 Contract address on testnet
export const CVN1_ADDRESS = "0xd6806376a10362feac1b9c64dbc28bea0485c35cca171b345178137e0e3b6193";
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
    mintVaultBps: number;
    mintPrice: number;
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

export async function getVaultConfig(collectionAddr: string): Promise<VaultConfig | null> {
    try {
        const resource = await cedra.getAccountResource({
            accountAddress: collectionAddr,
            resourceType: `${CVN1_ADDRESS}::${MODULE_NAME}::VaultedCollectionConfig`
        });
        const data = resource as any;
        return {
            creatorRoyaltyBps: Number(data.creator_royalty_bps),
            vaultRoyaltyBps: Number(data.vault_royalty_bps),
            allowedAssets: data.allowed_assets,
            creatorPayoutAddr: data.creator_payout_addr,
            mintVaultBps: Number(data.mint_vault_bps),
            mintPrice: Number(data.mint_price),
        };
    } catch (e) {
        console.warn("Failed to get vault config for", collectionAddr);
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

export async function getVaultedCollections(): Promise<string[]> {
    try {
        const query = `
            query GetVaultedCollections {
                move_resources(
                    where: { type: { _ilike: "%::vaulted_collection::VaultedCollectionConfig" } }
                    distinct_on: [address]
                    order_by: { address: asc }
                    limit: 50
                ) {
                    address
                }
            }
        `;

        const result = await cedra.queryIndexer({ query: { query } });
        // @ts-ignore
        return result.move_resources.map((r: any) => r.address);
    } catch (e) {
        console.error("Failed to fetch collections from indexer:", e);
        return [];
    }
}

export async function getCollectionDetails(addr: string): Promise<{ name: string; uri: string } | null> {
    try {
        // Fetch the 0x4::collection::Collection resource
        const resource = await cedra.getAccountResource({
            accountAddress: addr,
            resourceType: "0x4::collection::Collection",
        });

        return {
            name: (resource as any).name,
            uri: (resource as any).uri,
        };
    } catch {
        return null;
    }
}

export async function getCollectionAddrFromTx(txHash: string): Promise<string | null> {
    try {
        const txn = await cedra.waitForTransaction({ transactionHash: txHash });
        // @ts-ignore - types might be strict about changes
        const changes = txn.changes;

        for (const change of changes) {
            if (change.type === "write_resource") {
                // The SDK response structure for write_resource puts content in 'data', 
                // but some versions might use 'resource'. We check both.
                const data = (change as any).resource || (change as any).data;

                if (data && data.type &&
                    data.type.includes(`${CVN1_ADDRESS}::${MODULE_NAME}::VaultedCollectionConfig`)) {
                    return (change as any).address;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Failed to parse tx for collection addr:", e);
        return null;
    }
}
