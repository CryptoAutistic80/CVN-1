# CVN-1 TypeScript Integration Guide

> Examples using `@cedra-labs/ts-sdk` to interact with CVN-1 vaulted NFTs.

## Setup

```typescript
import { Cedra, CedraConfig, Account, Network } from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ network: Network.TESTNET });
const cedra = new Cedra(config);

// Your deployed CVN-1 module address
const CVN1_ADDRESS = "0x...";
```

## Creating a Collection

```typescript
async function createCollection(creator: Account) {
  const txn = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::collection::init_collection_config`,
      functionArguments: [
        "My Vaulted Collection",      // name
        "A collection with vaults",   // description
        "https://example.com/meta",   // uri
        250,                          // creator_royalty_bps (2.5%)
        250,                          // vault_royalty_bps (2.5%)
        5000,                         // mint_vault_bps (50% to vault)
        1000000,                      // mint_price (1 CEDRA)
        "0x1::cedra_coin::CedraCoin", // mint_price_fa (CEDRA)
        [],                           // allowed_assets (empty = any)
        creator.accountAddress,       // creator_payout_addr
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: creator, 
    transaction: txn 
  });
  await cedra.waitForTransaction({ transactionHash: result.hash });
  
  // Get collection address
  const collectionAddr = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::collection::get_collection_address`,
      functionArguments: [creator.accountAddress, "My Vaulted Collection"],
    },
  });
  
  return collectionAddr[0];
}
```

## Minting NFTs

### Creator Self-Mint (Free)

```typescript
async function creatorSelfMint(creator: Account, collectionAddr: string) {
  const txn = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::minting::creator_self_mint`,
      functionArguments: [
        collectionAddr,
        "NFT #1",
        "A vaulted NFT",
        "https://example.com/nft/1",
        true, // is_redeemable
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: creator, 
    transaction: txn 
  });
  return result.hash;
}
```

### Public Mint (Paid)

```typescript
async function publicMint(buyer: Account, collectionAddr: string) {
  const txn = await cedra.transaction.build.simple({
    sender: buyer.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::minting::public_mint`,
      functionArguments: [
        collectionAddr,
        "Public NFT",
        "Minted by buyer",
        "https://example.com/nft/public",
        true,
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: buyer, 
    transaction: txn 
  });
  return result.hash;
}
```

## Vault Operations

### Deposit to Vault

```typescript
async function depositToVault(
  depositor: Account,
  nftAddr: string,
  faMetadataAddr: string,
  amount: bigint
) {
  const txn = await cedra.transaction.build.simple({
    sender: depositor.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::deposit_to_vault`,
      functionArguments: [nftAddr, faMetadataAddr, amount.toString()],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: depositor, 
    transaction: txn 
  });
  return result.hash;
}
```

### Burn and Redeem

```typescript
async function burnAndRedeem(owner: Account, nftAddr: string) {
  const txn = await cedra.transaction.build.simple({
    sender: owner.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::burn_and_redeem`,
      functionArguments: [nftAddr],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: owner, 
    transaction: txn 
  });
  return result.hash;
}
```

## View Functions

### Get Vault Balances

```typescript
async function getVaultBalances(nftAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_balances`,
      functionArguments: [nftAddr],
    },
  });
  return result[0] as { fa_metadata_addr: string; balance: string }[];
}
```

### Get Vault Summary

```typescript
async function getVaultSummary(nftAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_summary`,
      functionArguments: [nftAddr],
    },
  });
  
  return {
    assetCount: Number(result[0]),
    totalAssetTypes: Number(result[1]),
    isRedeemable: result[2] as boolean,
    isCompliant: result[3] as boolean,
  };
}
```

### Check Compliance

```typescript
async function isCompliantSale(nftAddr: string): Promise<boolean> {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::last_sale_used_vault_royalty`,
      functionArguments: [nftAddr],
    },
  });
  return result[0] as boolean;
}
```

## Marketplace Integration

See [MARKETPLACE-GUIDE.md](./MARKETPLACE-GUIDE.md) for full marketplace integration details.

```typescript
async function settleCompliantSale(
  marketplace: Account,
  nftAddr: string,
  buyerAddr: string,
  paymentFaAddr: string,
  grossAmount: bigint
) {
  const txn = await cedra.transaction.build.simple({
    sender: marketplace.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::royalties::settle_sale_with_vault_royalty`,
      functionArguments: [
        nftAddr,
        buyerAddr,
        paymentFaAddr,
        grossAmount.toString(),
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ 
    signer: marketplace, 
    transaction: txn 
  });
  return result.hash;
}
```
