# CVN-1 Marketplace Integration Guide

> How marketplaces can support CVN-1 vaulted NFTs with compliant royalty settlement.

## Overview

CVN-1 provides a standardized sale path that ensures royalties are properly split between:
1. **Creator** — Direct payment to creator's payout address
2. **Vault** — Deposited into the NFT's vault (increasing floor value)
3. **Seller** — Net proceeds to the current owner

## Why Integrate CVN-1?

- **Increased Trade Value** — Vault assets make NFTs more valuable over time
- **Compliance Tracking** — Verifiable on-chain compliance status
- **Community Trust** — Show users you respect creator economics
- **Standard API** — One integration covers all CVN-1 collections

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MARKETPLACE SETTLEMENT FLOW                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Buyer purchases NFT for 100 CEDRA                           │
│     ↓                                                            │
│  2. Marketplace collects payment (holds 100 CEDRA)              │
│     ↓                                                            │
│  3. Marketplace calls settle_sale_with_vault_royalty            │
│     ↓                                                            │
│  4. CVN-1 atomically:                                           │
│     • Creator gets 2.5 CEDRA (2.5% royalty)                     │
│     • Vault gets 2.5 CEDRA (2.5% vault royalty)                 │
│     • Seller gets 95 CEDRA (net proceeds)                       │
│     • NFT transfers to buyer                                    │
│     • Compliance flag set to TRUE                               │
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
  const summary = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_summary`,
      functionArguments: [nftAddr],
    },
  });

  const balances = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_balances`,
      functionArguments: [nftAddr],
    },
  });

  return {
    assetCount: Number(summary[0]),
    totalAssetTypes: Number(summary[1]),
    isRedeemable: summary[2] as boolean,
    lastSaleCompliant: summary[3] as boolean,
    balances: balances[0] as { fa_metadata_addr: string; balance: string }[],
  };
}
```

## Step 3: Get Collection Royalty Config

Fetch the royalty settings for the collection:

```typescript
async function getCollectionRoyalties(collectionAddr: string) {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::get_vault_config`,
      functionArguments: [collectionAddr],
    },
  });

  return {
    creatorRoyaltyBps: Number(result[0]),
    vaultRoyaltyBps: Number(result[1]),
    allowedAssets: result[2] as string[],
    creatorPayoutAddr: result[3] as string,
  };
}

// Calculate fees for display
function calculateFees(grossAmount: bigint, config: { creatorRoyaltyBps: number; vaultRoyaltyBps: number }) {
  const creatorFee = (grossAmount * BigInt(config.creatorRoyaltyBps)) / 10000n;
  const vaultFee = (grossAmount * BigInt(config.vaultRoyaltyBps)) / 10000n;
  const sellerNet = grossAmount - creatorFee - vaultFee;
  
  return { creatorFee, vaultFee, sellerNet };
}
```

## Step 4: Settle Sale with Vault Royalty

**This is the critical integration point.** When a sale completes, call this function instead of `object::transfer`:

```typescript
async function completeSale(
  marketplace: Account,
  nftAddr: string,
  buyerAddr: string,
  paymentFaAddr: string,  // FA used for payment (e.g., CEDRA, USDC)
  grossAmount: bigint      // Full sale price
) {
  // IMPORTANT: Marketplace must hold the gross amount before calling
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
    transaction: txn,
  });

  await cedra.waitForTransaction({ transactionHash: result.hash });

  return {
    txHash: result.hash,
    isCompliant: true,
  };
}
```

### Prerequisites for `settle_sale_with_vault_royalty`

1. **Marketplace holds funds** — The `gross_amount` must be in the marketplace's account
2. **Payment FA matches** — Use the correct FA metadata address for the payment currency
3. **NFT exists** — The NFT must be a valid CVN-1 NFT with a vault

## Step 5: Show Compliance Badge

Display compliance status to users:

```typescript
async function getComplianceStatus(nftAddr: string): Promise<{
  isCompliant: boolean;
  message: string;
}> {
  const result = await cedra.view({
    payload: {
      function: `${CVN1_ADDRESS}::vault_views::last_sale_used_vault_royalty`,
      functionArguments: [nftAddr],
    },
  });

  const isCompliant = result[0] as boolean;
  
  return {
    isCompliant,
    message: isCompliant
      ? "✓ Last sale used compliant CVN-1 settlement"
      : "⚠ Last sale bypassed vault royalties",
  };
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
│  │ • 25.5 CEDRA                     │ │
│  │ • 10 USDC                        │ │
│  │ Floor Value: ~$35.50             │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Fee Breakdown:                        │
│  • Creator Royalty: 2.5 CEDRA (2.5%)  │
│  • Vault Addition: 2.5 CEDRA (2.5%)   │
│  • Seller Receives: 95 CEDRA          │
│                                        │
│  [Buy Now]                             │
│                                        │
│  ✓ CVN-1 Compliant Settlement         │
└────────────────────────────────────────┘
```

### Compliance Badge

```
✓ Compliant   — Green badge for compliant sales
⚠ Non-Compliant — Yellow warning for bypassed royalties
```

## Error Handling

| Error | Code | Action |
|-------|------|--------|
| `EVAULT_NOT_FOUND` | 8 | Not a CVN-1 NFT, use standard transfer |
| `ECONFIG_NOT_FOUND` | 10 | Collection config missing |
| `EINVALID_AMOUNT` | 4 | Check gross_amount > 0 |

## Testing Checklist

- [ ] Detect CVN-1 NFTs correctly
- [ ] Display vault balances on listings
- [ ] Show royalty breakdown before purchase
- [ ] Call `settle_sale_with_vault_royalty` on sale completion
- [ ] Display compliance status
- [ ] Handle non-CVN-1 NFTs gracefully (fallback to standard transfer)

## Support

For integration support, contact the CVN-1 team or open an issue on the repository.
