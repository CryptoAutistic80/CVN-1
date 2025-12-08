# @cvn1/sdk

TypeScript SDK for the CVN-1 Vaulted NFT Standard on Cedra.

## Installation

```bash
npm install @cvn1/sdk @cedra-labs/ts-sdk
```

## Quick Start

```typescript
import { Cedra } from "@cedra-labs/ts-sdk";
import { CVN1Client, CVN1_TESTNET_ADDRESS } from "@cvn1/sdk";

// Initialize clients
const cedra = new Cedra();
const cvn1 = new CVN1Client(cedra, CVN1_TESTNET_ADDRESS);

// Check if a vault exists
const exists = await cvn1.vaultExists("0xNFT_ADDRESS");

// Get vault balances
const balances = await cvn1.getVaultBalances("0xNFT_ADDRESS");
console.log(balances); // [{ faMetadataAddr: "0x...", balance: 1000n }]

// Get collection config
const config = await cvn1.getVaultConfig("0xCREATOR_ADDRESS");
console.log(config.creatorRoyaltyBps); // 250 (2.5%)
```

## Creating a Collection

```typescript
import { Account } from "@cedra-labs/ts-sdk";

const creator = Account.generate();

const result = await cvn1.initCollectionConfig(creator, {
  name: "My Vaulted Collection",
  description: "NFTs with built-in value",
  uri: "https://example.com/collection.json",
  creatorRoyaltyBps: 250,  // 2.5% to creator on sales
  vaultRoyaltyBps: 250,    // 2.5% to vault on sales
  mintVaultBps: 5000,      // 50% of mint fee goes to vault
  mintPrice: 0n,           // Free mint
  mintPriceFa: "0x0",
  allowedAssets: [],       // Any FA allowed
  creatorPayoutAddr: creator.accountAddress.toString(),
});

console.log("Collection created:", result.hash);
```

## Depositing to a Vault

```typescript
const depositor = Account.generate();

const result = await cvn1.depositToVault(
  depositor,
  "0xNFT_ADDRESS",
  "0xFA_METADATA_ADDRESS",
  1000000n  // Amount in smallest units
);

console.log("Deposited:", result.hash);
```

## Burning and Redeeming

```typescript
const owner = Account.generate();

const result = await cvn1.burnAndRedeem(owner, "0xNFT_ADDRESS");
console.log("Redeemed:", result.hash);
```

## API Reference

### View Functions (gas-free)

| Method | Description |
|--------|-------------|
| `vaultExists(nftAddr)` | Check if vault exists |
| `getVaultBalances(nftAddr)` | Get all FA balances |
| `getVaultConfig(creatorAddr)` | Get collection config |
| `getVaultInfo(nftAddr)` | Get vault details |
| `lastSaleUsedVaultRoyalty(nftAddr)` | Check compliance |

### Entry Functions

| Method | Description |
|--------|-------------|
| `initCollectionConfig(signer, config)` | Create collection |
| `creatorMintVaultedNFT(creator, buyer, params)` | Mint NFT |
| `depositToVault(depositor, nft, fa, amount)` | Deposit FA |
| `burnAndRedeem(owner, nft)` | Burn and claim |
| `settleSaleWithVaultRoyalty(marketplace, ...)` | Settle sale |

## Types

```typescript
interface VaultConfig {
  creatorRoyaltyBps: number;
  vaultRoyaltyBps: number;
  allowedAssets: string[];
  creatorPayoutAddr: string;
}

interface VaultBalance {
  faMetadataAddr: string;
  balance: bigint;
}

interface CollectionConfig {
  name: string;
  description: string;
  uri: string;
  creatorRoyaltyBps: number;
  vaultRoyaltyBps: number;
  mintVaultBps: number;
  mintPrice: bigint;
  mintPriceFa: string;
  allowedAssets: string[];
  creatorPayoutAddr: string;
}
```

## Utilities

```typescript
import { bpsToPercent, percentToBps, formatAddress } from "@cvn1/sdk";

bpsToPercent(250);     // 2.5
percentToBps(2.5);     // 250
formatAddress("0x1234567890abcdef"); // "0x1234...cdef"
```

## License

Proprietary - © Singularity Shift Ltd
