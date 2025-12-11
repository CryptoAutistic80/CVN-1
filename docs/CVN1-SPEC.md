# CVN-1: Cedra Vaulted NFT Standard (v5)

> A standard for NFTs with dual built-in fungible asset vaults on Cedra Network.

## Overview

CVN-1 v5 features a **dual vault architecture** with **framework royalty integration** for automatic marketplace enforcement:

| Vault | Purpose | Redemption |
|-------|---------|------------|
| **Core Vault** | Long-term value (mint seed, staking) | Burn NFT only |
| **Rewards Vault** | Short-term value (deposits, gaming) | Claim anytime |

### v5 Changes

- **Framework Royalties** — Uses `cedra_token_objects::royalty` for automatic marketplace discovery
- **Simplified Royalties** — Creator royalty only, enforced by Cedra framework
- **Removed** — `royalties.move` and `settle_sale_with_vault_royalty` (no longer needed)

This enables:
- **Floor Value** — Core vault defines minimum intrinsic value
- **Passive Income** — Claim rewards without selling
- **Gaming Integration** — Deposit activity rewards to either vault
- **Burn-to-Redeem** — Owners burn NFT to claim both vaults
- **Automatic Royalties** — Marketplaces discover and enforce royalties automatically

## Module Architecture

```
contracts/cvn1_vault/sources/
├── vault_core.move      # Core data structures, dual vault logic
├── vault_events.move    # Event definitions
├── collection.move      # Collection initialization (with framework royalty)
├── minting.move         # NFT minting (inherits collection royalty)
├── vault_ops.move       # Dual deposit, claim_rewards, burn_and_redeem
└── vault_views.move     # Read-only view functions
```

## Data Structures

### VaultedCollectionConfig

Stored on the collection object's address:

```move
struct VaultedCollectionConfig has key {
    creator_royalty_bps: u16,      // Creator royalty (set via framework)
    vault_royalty_bps: u16,        // Unused in v5 (kept for compatibility)
    mint_vault_bps: u16,           // % of mint price to Core Vault
    mint_price: u64,
    mint_price_fa: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address,
    extend_ref: ExtendRef,         // For collection signer
    max_supply: u64,               // 0 = unlimited
    minted_count: u64,
}
```

### VaultInfo (Dual Vault)

Stored on each NFT's object address:

```move
struct VaultInfo has key {
    // Core Vault (burn-to-redeem only)
    core_stores: SmartTable<address, address>,
    core_delete_refs: SmartTable<address, DeleteRef>,
    is_core_redeemable: bool,
    
    // Rewards Vault (claim anytime)
    rewards_stores: SmartTable<address, address>,
    rewards_delete_refs: SmartTable<address, DeleteRef>,
    
    // Object lifecycle
    extend_ref: ExtendRef,
    delete_ref: Option<DeleteRef>,
    burn_ref: BurnRef,
    
    // Metadata
    creator_addr: address,
    last_sale_compliant: bool,
}
```

## Entry Functions

### Collection Setup

```move
public entry fun init_collection_config(
    creator: &signer,
    collection_name: String,
    collection_description: String,
    collection_uri: String,
    creator_royalty_bps: u16,      // Framework royalty (enforced by marketplaces)
    vault_royalty_bps: u16,        // Unused in v5, pass 0
    mint_vault_bps: u16,           // % of mint to Core Vault
    mint_price: u64,
    mint_price_fa: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address,
    max_supply: u64                // v4: 0 = unlimited
)
```

### Minting

```move
// All mint functions:
// 1. Seed the CORE vault with mint_vault_bps %
// 2. Inherit royalty from collection (v5)

public entry fun creator_mint_vaulted_nft(...)
public entry fun creator_self_mint(...)
public entry fun public_mint(...)
```

### Vault Operations

```move
// Deposit to CORE vault (long-term value)
public entry fun deposit_to_core_vault(
    depositor: &signer,
    nft_object: Object<Token>,
    fa_metadata: Object<Metadata>,
    amount: u64
)

// Deposit to REWARDS vault (short-term value)
public entry fun deposit_to_rewards_vault(
    depositor: &signer,
    nft_object: Object<Token>,
    fa_metadata: Object<Metadata>,
    amount: u64
)

// Claim rewards without burning NFT
public entry fun claim_rewards(
    owner: &signer,
    nft_object: Object<Token>
)

// Burn NFT and claim BOTH vaults
public entry fun burn_and_redeem(
    owner: &signer,
    nft_object: Object<Token>
)
```

## Royalty Model (v5)

### Framework Royalties

CVN-1 v5 uses **Cedra Framework royalties** (`cedra_token_objects::royalty`):

| Royalty Type | Recipient | Enforcement |
|--------------|-----------|-------------|
| **Creator Royalty** | `creator_payout_addr` | Automatic via framework |

Marketplaces supporting Cedra's standard royalty API will automatically:
1. Discover the royalty rate from the collection/token
2. Enforce payment to the creator's payout address
3. No custom settlement function needed

### Vault Value Sources

Vaults receive value from:

| Source | Destination |
|--------|-------------|
| Mint seed (% of mint price) | Core Vault |
| Staking rewards | Core Vault |
| Gaming wins/activities | Rewards Vault |
| Manual deposits | Either (depositor chooses) |

## View Functions

| Function | Returns |
|----------|---------|
| `get_vault_balances(nft_addr)` | Combined core + rewards |
| `get_core_vault_balances(nft_addr)` | Core vault only |
| `get_rewards_vault_balances(nft_addr)` | Rewards vault only |
| `get_vault_config(collection_addr)` | Config tuple |
| `vault_exists(nft_addr)` | `bool` |
| `get_vault_info(nft_addr)` | `(is_redeemable, creator, compliant)` |
| `get_token_metadata(nft_object)` | `(name, description, uri)` |
| `get_collection_address(creator, name)` | `address` |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `ENOT_CREATOR` | Caller is not the collection creator |
| 2 | `ENOT_OWNER` | Caller is not the NFT owner |
| 3 | `ENOT_REDEEMABLE` | Core vault is not redeemable |
| 4 | `EINVALID_AMOUNT` | Invalid amount (must be > 0) |
| 5 | `EASSET_NOT_ALLOWED` | FA not in allowlist |
| 6 | `EINSUFFICIENT_BALANCE` | Insufficient balance |
| 7 | `ECOLLECTION_ALREADY_EXISTS` | Collection already initialized |
| 8 | `EVAULT_NOT_FOUND` | No vault exists at address |
| 9 | `EINVALID_ROYALTY_BPS` | Royalty BPS > 10000 |
| 10 | `ECONFIG_NOT_FOUND` | Collection config not found |
| 11 | `EMAX_SUPPLY_REACHED` | Max supply reached |

## Events

```move
#[event] struct VaultedNFTMinted { nft_addr, collection_addr, creator, to, is_redeemable }
#[event] struct VaultDeposited { nft_addr, fa_type, amount, depositor }
#[event] struct VaultRedeemed { nft_addr, redeemer, redeemed_assets }
#[event] struct RewardsClaimed { nft_addr, claimer, assets_claimed }
```

## Migration from v3/v4

If upgrading from earlier versions:

1. **Royalties** — Now handled by Cedra framework, no custom settlement needed
2. **`vault_royalty_bps`** — Pass 0, this field is ignored
3. **`royalties.move`** — Module removed, marketplaces use framework royalties
4. **`settle_sale_with_vault_royalty`** — Function removed

## License

Proprietary - Singularity Shift Ltd.
