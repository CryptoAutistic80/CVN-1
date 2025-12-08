/**
 * CVN-1 TypeScript SDK
 * Client for interacting with the Cedra Vaulted NFT Standard
 */

import { Cedra, Account, AccountAddress, InputGenerateTransactionPayloadData } from "@cedra-labs/ts-sdk";
import {
    VaultConfig,
    VaultBalance,
    VaultInfo,
    CollectionConfig,
    MintParams,
    MintResult,
    TxResult
} from "./types";
import { toBigInt } from "./utils";

/**
 * CVN1Client - Main client for CVN-1 contract interactions
 * 
 * @example
 * ```typescript
 * import { Cedra } from "@cedra-labs/ts-sdk";
 * import { CVN1Client } from "@cvn1/sdk";
 * 
 * const cedra = new Cedra();
 * const client = new CVN1Client(cedra, "0x87e87b2f...");
 * 
 * // Check if vault exists
 * const exists = await client.vaultExists("0xNFT_ADDRESS");
 * ```
 */
export class CVN1Client {
    private readonly moduleName = "vaulted_collection";

    constructor(
        private readonly cedra: Cedra,
        private readonly moduleAddress: string
    ) { }

    // ========================================
    // VIEW FUNCTIONS (gas-free)
    // ========================================

    /**
     * Check if a vault exists for an NFT
     * @param nftAddr NFT object address
     */
    async vaultExists(nftAddr: string): Promise<boolean> {
        const result = await this.cedra.view({
            payload: {
                function: `${this.moduleAddress}::${this.moduleName}::vault_exists`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });
        return result[0] as boolean;
    }

    /**
     * Get all FA balances in a vault
     * @param nftAddr NFT object address
     */
    async getVaultBalances(nftAddr: string): Promise<VaultBalance[]> {
        const result = await this.cedra.view({
            payload: {
                function: `${this.moduleAddress}::${this.moduleName}::get_vault_balances`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });

        // Parse the vector of VaultBalance structs
        const balances = result[0] as Array<{ fa_metadata_addr: string; balance: string }>;
        return balances.map(b => ({
            faMetadataAddr: b.fa_metadata_addr,
            balance: BigInt(b.balance),
        }));
    }

    /**
     * Get collection configuration
     * @param creatorAddr Creator address
     */
    async getVaultConfig(creatorAddr: string): Promise<VaultConfig> {
        const result = await this.cedra.view({
            payload: {
                function: `${this.moduleAddress}::${this.moduleName}::get_vault_config`,
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
    }

    /**
     * Get vault info for an NFT
     * @param nftAddr NFT object address
     */
    async getVaultInfo(nftAddr: string): Promise<VaultInfo> {
        const result = await this.cedra.view({
            payload: {
                function: `${this.moduleAddress}::${this.moduleName}::get_vault_info`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });

        return {
            isRedeemable: result[0] as boolean,
            creatorAddr: result[1] as string,
            lastSaleCompliant: result[2] as boolean,
        };
    }

    /**
     * Check if last sale used vault royalty
     * @param nftAddr NFT object address
     */
    async lastSaleUsedVaultRoyalty(nftAddr: string): Promise<boolean> {
        const result = await this.cedra.view({
            payload: {
                function: `${this.moduleAddress}::${this.moduleName}::last_sale_used_vault_royalty`,
                typeArguments: [],
                functionArguments: [nftAddr],
            },
        });
        return result[0] as boolean;
    }

    // ========================================
    // ENTRY FUNCTIONS
    // ========================================

    /**
     * Initialize a new vaulted NFT collection
     * @param signer Creator account
     * @param config Collection configuration
     */
    async initCollectionConfig(
        signer: Account,
        config: CollectionConfig
    ): Promise<TxResult> {
        const payload: InputGenerateTransactionPayloadData = {
            function: `${this.moduleAddress}::${this.moduleName}::init_collection_config`,
            functionArguments: [
                config.name,
                config.description,
                config.uri,
                config.creatorRoyaltyBps,
                config.vaultRoyaltyBps,
                config.mintVaultBps,
                config.mintPrice.toString(),
                config.mintPriceFa,
                config.allowedAssets,
                config.creatorPayoutAddr,
            ],
        };

        return this.submitTransaction(signer, payload);
    }

    /**
     * Mint a vaulted NFT
     * @param creator Creator account (must own collection)
     * @param buyer Buyer account (pays mint fee if applicable)
     * @param params Mint parameters
     */
    async creatorMintVaultedNFT(
        creator: Account,
        buyer: Account,
        params: MintParams
    ): Promise<MintResult> {
        // Note: This requires a multi-signer transaction pattern
        // For simplicity, this version assumes creator = buyer for free mints
        const payload: InputGenerateTransactionPayloadData = {
            function: `${this.moduleAddress}::${this.moduleName}::creator_mint_vaulted_nft`,
            functionArguments: [
                // buyer signer handled separately in multi-agent tx
                params.to,
                params.name,
                params.description,
                params.uri,
                params.isRedeemable,
            ],
        };

        const result = await this.submitTransaction(creator, payload);

        // TODO: Parse NFT address from events
        return {
            txHash: result.hash,
            nftAddress: "", // Would need to parse from transaction events
        };
    }

    /**
     * Deposit fungible assets into a vault
     * @param depositor Depositor account
     * @param nftObject NFT object address
     * @param faMetadata FA metadata address
     * @param amount Amount to deposit
     */
    async depositToVault(
        depositor: Account,
        nftObject: string,
        faMetadata: string,
        amount: bigint | number
    ): Promise<TxResult> {
        const payload: InputGenerateTransactionPayloadData = {
            function: `${this.moduleAddress}::${this.moduleName}::deposit_to_vault`,
            functionArguments: [
                nftObject,
                faMetadata,
                toBigInt(amount).toString(),
            ],
        };

        return this.submitTransaction(depositor, payload);
    }

    /**
     * Burn an NFT and redeem all vault contents
     * @param owner NFT owner account
     * @param nftObject NFT object address
     */
    async burnAndRedeem(
        owner: Account,
        nftObject: string
    ): Promise<TxResult> {
        const payload: InputGenerateTransactionPayloadData = {
            function: `${this.moduleAddress}::${this.moduleName}::burn_and_redeem`,
            functionArguments: [nftObject],
        };

        return this.submitTransaction(owner, payload);
    }

    /**
     * Settle a sale with vault royalty
     * @param marketplace Marketplace account
     * @param nftObject NFT object address
     * @param buyer Buyer address
     * @param saleCurrency FA metadata address for sale currency
     * @param grossAmount Gross sale amount
     */
    async settleSaleWithVaultRoyalty(
        marketplace: Account,
        nftObject: string,
        buyer: string,
        saleCurrency: string,
        grossAmount: bigint | number
    ): Promise<TxResult> {
        const payload: InputGenerateTransactionPayloadData = {
            function: `${this.moduleAddress}::${this.moduleName}::settle_sale_with_vault_royalty`,
            functionArguments: [
                nftObject,
                buyer,
                saleCurrency,
                toBigInt(grossAmount).toString(),
            ],
        };

        return this.submitTransaction(marketplace, payload);
    }

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    private async submitTransaction(
        signer: Account,
        payload: InputGenerateTransactionPayloadData
    ): Promise<TxResult> {
        const txn = await this.cedra.transaction.build.simple({
            sender: signer.accountAddress,
            data: payload,
        });

        const signedTxn = await this.cedra.transaction.sign({
            signer,
            transaction: txn,
        });

        const result = await this.cedra.transaction.submit.simple({
            transaction: txn,
            senderAuthenticator: signedTxn,
        });

        // Wait for transaction to complete
        const response = await this.cedra.waitForTransaction({
            transactionHash: result.hash,
        });

        return {
            hash: result.hash,
            success: response.success,
            gasUsed: Number(response.gas_used || 0),
        };
    }
}
