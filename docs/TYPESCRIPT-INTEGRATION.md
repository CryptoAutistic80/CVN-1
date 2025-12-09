# CVN-1 TypeScript Integration Guide (v3)

> Examples using `@cedra-labs/ts-sdk` to interact with CVN-1 dual vault NFTs.

## Setup

```typescript
import { Cedra, CedraConfig, Account, Network } from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ network: Network.TESTNET });
const cedra = new Cedra(config);

const CVN1_ADDRESS = "0x..."; // Your deployed CVN-1 address
```

## Creating a Collection

```typescript
async function createCollection(creator: Account) {
  const txn = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::collection::init_collection_config`,
      functionArguments: [
        "My Vaulted Collection",
        "A collection with dual vaults",
        "https://example.com/meta",
        250,   // creator_royalty_bps (2.5%)
        250,   // vault_royalty_bps (2.5% → rewards vault)
        5000,  // mint_vault_bps (50% → core vault)
        1000000,
        "0x1::cedra_coin::CedraCoin",
        [],
        creator.accountAddress,
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: creator, transaction: txn });
  await cedra.waitForTransaction({ transactionHash: result.hash });
  
  const collectionAddr = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::collection::get_collection_address`,
      functionArguments: [creator.accountAddress, "My Vaulted Collection"],
    },
  });
  
  return collectionAddr[0];
}
```

## Minting (Seeds Core Vault)

```typescript
async function publicMint(buyer: Account, collectionAddr: string) {
  // mint_vault_bps % of mint price goes to CORE vault
  const txn = await cedra.transaction.build.simple({
    sender: buyer.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::minting::public_mint`,
      functionArguments: [
        collectionAddr,
        "NFT #1",
        "Vaulted NFT",
        "https://example.com/nft/1",
        true, // is_core_redeemable
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: buyer, transaction: txn });
  return result.hash;
}
```

## Vault Operations (v3)

### Deposit to Core Vault (Long-term)

```typescript
async function depositToCore(depositor: Account, nftAddr: string, amount: bigint) {
  const txn = await cedra.transaction.build.simple({
    sender: depositor.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::deposit_to_core_vault`,
      functionArguments: [nftAddr, "0x1::cedra_coin::CedraCoin", amount.toString()],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: depositor, transaction: txn });
  return result.hash;
}
```

### Deposit to Rewards Vault (Short-term)

```typescript
async function depositToRewards(depositor: Account, nftAddr: string, amount: bigint) {
  const txn = await cedra.transaction.build.simple({
    sender: depositor.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::deposit_to_rewards_vault`,
      functionArguments: [nftAddr, "0x1::cedra_coin::CedraCoin", amount.toString()],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: depositor, transaction: txn });
  return result.hash;
}
```

### Claim Rewards (Keep NFT)

```typescript
async function claimRewards(owner: Account, nftAddr: string) {
  const txn = await cedra.transaction.build.simple({
    sender: owner.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::claim_rewards`,
      functionArguments: [nftAddr],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: owner, transaction: txn });
  return result.hash;
}
```

### Burn and Redeem (Both Vaults)

```typescript
async function burnAndRedeem(owner: Account, nftAddr: string) {
  // Burns NFT and claims BOTH core + rewards vaults
  const txn = await cedra.transaction.build.simple({
    sender: owner.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::vault_ops::burn_and_redeem`,
      functionArguments: [nftAddr],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: owner, transaction: txn });
  return result.hash;
}
```

## View Functions (v3)

### Get Core Vault Balances

```typescript
async function getCoreBalances(nftAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_core_vault_balances`,
      functionArguments: [nftAddr],
    },
  });
  return result[0] as { fa_metadata_addr: string; balance: string }[];
}
```

### Get Rewards Vault Balances

```typescript
async function getRewardsBalances(nftAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_rewards_vault_balances`,
      functionArguments: [nftAddr],
    },
  });
  return result[0] as { fa_metadata_addr: string; balance: string }[];
}
```

### Get Combined Balances

```typescript
async function getTotalBalances(nftAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_balances`,
      functionArguments: [nftAddr],
    },
  });
  return result[0] as { fa_metadata_addr: string; balance: string }[];
}
```

## Marketplace (Royalties → Rewards Vault)

```typescript
async function settleCompliantSale(
  marketplace: Account,
  nftAddr: string,
  buyerAddr: string,
  grossAmount: bigint
) {
  // vault_royalty_bps % goes to REWARDS vault
  const txn = await cedra.transaction.build.simple({
    sender: marketplace.accountAddress,
    data: {
      function: `${CVN1_ADDRESS}::royalties::settle_sale_with_vault_royalty`,
      functionArguments: [
        nftAddr,
        buyerAddr,
        "0x1::cedra_coin::CedraCoin",
        grossAmount.toString(),
      ],
    },
  });

  const result = await cedra.signAndSubmitTransaction({ signer: marketplace, transaction: txn });
  return result.hash;
}
```

## Summary

| Action | Function | Vault |
|--------|----------|-------|
| Mint | `public_mint` | Core |
| Deposit long-term | `deposit_to_core_vault` | Core |
| Deposit short-term | `deposit_to_rewards_vault` | Rewards |
| Settle sale | `settle_sale_with_vault_royalty` | Rewards |
| Claim rewards | `claim_rewards` | Rewards |
| Burn & redeem | `burn_and_redeem` | Both |
