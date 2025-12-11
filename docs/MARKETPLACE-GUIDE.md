# CVN-1 Marketplace Integration Guide (v5)

> How marketplaces can support CVN-1 vaulted NFTs with framework royalties.

## Overview

CVN-1 v5 uses **Cedra Framework royalties** for automatic enforcement:

- **Creator Royalties** — Enforced automatically via `cedra_token_objects::royalty`
- **Vaults** — Receive value from minting, staking, and direct deposits
- **No Custom Settlement** — Standard Cedra NFT sales work out of the box

## Why Integrate CVN-1?

- **Increased Trade Value** — Vault assets make NFTs more valuable over time
- **Standard Royalties** — Use Cedra's built-in royalty enforcement
- **Community Trust** — Show users you respect creator economics
- **Standard API** — One integration covers all CVN-1 collections

## v5 Changes from v4

| v4 | v5 |
|----|-----|
| Custom `settle_sale_with_vault_royalty` | Standard transfer + framework royalties |
| Vault receives % of sales | Vault receives value from other sources |
| Custom compliance tracking | Framework royalty enforcement |

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MARKETPLACE SETTLEMENT FLOW                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Buyer purchases NFT for 100 CEDRA                           │
│     ↓                                                            │
│  2. Marketplace discovers royalty via framework API              │
│     • Calls royalty::get(collection_or_token)                   │
│     ↓                                                            │
│  3. Standard settlement:                                         │
│     • Creator gets 5 CEDRA (5% royalty - framework enforced)    │
│     • Seller gets 95 CEDRA (net proceeds)                       │
│     • NFT transfers to buyer                                    │
│                                                                  │
│  CVN-1 vaults are NOT funded from secondary sales.              │
│  Vaults receive value from: minting, staking, direct deposits   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Detect CVN-1 NFTs

Before listing, check if an NFT has a vault:

```typescript
async function isCVN1NFT(nftAddr: string): Promise<boolean> {
  try {
    const result = await cedra.view({
      payload: {
        function: `${CVN1_ADDRESS}::vault_views::vault_exists`,
        functionArguments: [nftAddr],
      },
    });
    return result[0] as boolean;
  } catch {
    return false;
  }
}
```

## Step 2: Display Vault Info

Show users the vault contents when viewing an NFT:

```typescript
async function getListingInfo(nftAddr: string) {
  // Get separate vault balances
  const coreBalances = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_core_vault_balances`,
      functionArguments: [nftAddr],
    },
  });

  const rewardsBalances = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_rewards_vault_balances`,
      functionArguments: [nftAddr],
    },
  });

  return {
    coreBalances: coreBalances[0] as { fa_metadata_addr: string; balance: string }[],
    rewardsBalances: rewardsBalances[0] as { fa_metadata_addr: string; balance: string }[],
  };
}
```

## Step 3: Get Collection Royalty

Use Cedra's framework royalty API to discover royalties:

```typescript
import { royalty } from "@cedra-labs/ts-sdk";

async function getCollectionRoyalties(collectionAddr: string) {
  // Get royalty from framework
  const royaltyInfo = await cedra.view({
    payload: {
      function: "0x4::royalty::get",
      typeArguments: ["0x4::collection::Collection"],
      functionArguments: [collectionAddr],
    },
  });

  if (royaltyInfo[0]) {
    const { numerator, denominator, payee_address } = royaltyInfo[0];
    return {
      royaltyBps: (Number(numerator) / Number(denominator)) * 10000,
      payeeAddress: payee_address,
    };
  }
  
  return { royaltyBps: 0, payeeAddress: null };
}

// CVN-1 specific config (for vault display)
async function getCVN1Config(collectionAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_config`,
      functionArguments: [collectionAddr],
    },
  });

  return {
    creatorRoyaltyBps: Number(result[0]),
    mintVaultBps: Number(result[1]),  // Note: vaultRoyaltyBps removed in v5
    allowedAssets: result[2] as string[],
    creatorPayoutAddr: result[3] as string,
  };
}
```

## Step 4: Execute Sale

Use standard Cedra NFT transfer. The framework handles royalty enforcement:

```typescript
async function completeSale(
  marketplace: Account,
  nftAddr: string,
  sellerAddr: string,
  buyerAddr: string,
  price: bigint
) {
  // Standard transfer - framework enforces royalties
  const txn = await cedra.transaction.build.simple({
    sender: marketplace.accountAddress,
    data: {
      function: "0x1::object::transfer",
      typeArguments: ["0x4::token::Token"],
      functionArguments: [nftAddr, buyerAddr],
    },
  });

  // Handle payment separately (marketplace-specific)
  // Framework royalties are enforced by the Cedra protocol

  const result = await cedra.signAndSubmitTransaction({
    signer: marketplace,
    transaction: txn,
  });

  await cedra.waitForTransaction({ transactionHash: result.hash });

  return { txHash: result.hash };
}
```

> **Note:** The specific royalty enforcement mechanism depends on your marketplace implementation and how Cedra's framework royalties are integrated. Consult Cedra documentation for the latest patterns.

## Step 5: Display Vault Value

Show vault contents as additional NFT value:

```typescript
async function getTotalVaultValue(nftAddr: string): Promise<string> {
  const coreResult = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_core_vault_balances`,
      functionArguments: [nftAddr],
    },
  });
  
  const rewardsResult = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_rewards_vault_balances`,
      functionArguments: [nftAddr],
    },
  });

  const coreBalances = coreResult[0] as { balance: string }[];
  const rewardsBalances = rewardsResult[0] as { balance: string }[];
  
  let totalOctas = 0n;
  for (const b of [...coreBalances, ...rewardsBalances]) {
    totalOctas += BigInt(b.balance);
  }
  
  return `${Number(totalOctas) / 1e8} CEDRA`;
}
```

## UI Recommendations

### Listing Page

```
┌────────────────────────────────────────┐
│  [NFT Image]                           │
│                                        │
│  Vaulted NFT #42                       │
│  Collection: Premium Art               │
│                                        │
│  Price: 100 CEDRA                      │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 💎 Vault Contents                 │ │
│  │ 🔒 Core:    15.5 CEDRA           │ │
│  │ 🎁 Rewards:  5.0 CEDRA           │ │
│  │ Floor Value: ~$20.50              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Creator Royalty: 5%                   │
│                                        │
│  [Buy Now]                             │
│                                        │
│  ✓ Framework Royalties Enforced       │
└────────────────────────────────────────┘
```

### Vault Badges

```
🔒 Core Vault   — Burn-to-redeem only (floor value)
🎁 Rewards      — Claim anytime by owner
```

## Error Handling

| Error | Code | Action |
|-------|------|--------|
| `EVAULT_NOT_FOUND` | 8 | Not a CVN-1 NFT, no vault display needed |
| `ECONFIG_NOT_FOUND` | 10 | Collection config missing |

## Updated Checklist for v5

- [ ] Detect CVN-1 NFTs via `vault_exists`
- [ ] Display dual vault balances on listings
- [ ] Show creator royalty (via framework API)
- [ ] Use standard transfer (framework enforces royalties)
- [ ] Display total vault value as floor price indicator
- [ ] Handle non-CVN-1 NFTs gracefully

## Removed from v5

The following are **no longer used**:

- `settle_sale_with_vault_royalty` — Removed, use framework royalties
- `vault_royalty_bps` — No longer affects secondary sales
- Compliance tracking — Framework handles enforcement

## Support

For integration support, contact the CVN-1 team or open an issue on the repository.
