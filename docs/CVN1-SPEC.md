# CVN-1: Cedra Vaulted NFT Standard (v3)

> A standard for NFTs with dual built-in fungible asset vaults on Cedra Network.

## Overview

CVN-1 v3 introduces a **dual vault architecture** where each NFT contains two internal vaults:

| Vault | Purpose | Redemption |
|-------|---------|------------|
| **Core Vault** | Long-term value (mint seed, staking) | Burn NFT only |
| **Rewards Vault** | Short-term value (royalties, gaming) | Claim anytime |

This enables:
- **Floor Value** — Core vault defines minimum intrinsic value
- **Passive Income** — Claim rewards without selling
- **Gaming Integration** — Deposit activity rewards to either vault
- **Burn-to-Redeem** — Owners burn NFT to claim both vaults

## Module Architecture

```
contracts/cvn1_vault/sources/
├── vault_core.move      # Core data structures, dual vault logic
├── vault_events.move    # Event definitions
├── collection.move      # Collection initialization
├── minting.move         # NFT minting (seeds core vault)
├── vault_ops.move       # Dual deposit, claim_rewards, burn_and_redeem
├── royalties.move       # Sale settlement (deposits to rewards vault)
└── vault_views.move     # Read-only view functions
```

## Data Structures

### VaultedCollectionConfig

Stored on the collection object's address:

```move
struct VaultedCollectionConfig has key {
    creator_royalty_bps: u16,
    vault_royalty_bps: u16,
    mint_vault_bps: u16,
    mint_price: u64,
    mint_price_fa: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address,
}
```

### VaultInfo (v3: Dual Vault)

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
    creator_royalty_bps: u16,
    vault_royalty_bps: u16,
    mint_vault_bps: u16,
    mint_price: u64,
    mint_price_fa: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address
)
```

### Minting

```move
// All mint functions seed the CORE vault with mint_vault_bps %

public entry fun creator_mint_vaulted_nft(...)
public entry fun creator_self_mint(...)
public entry fun public_mint(...)
```

### Vault Operations (v3)

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

### Royalty Settlement

```move
// Deposits vault royalty to REWARDS vault
public entry fun settle_sale_with_vault_royalty(
    marketplace: &signer,
    nft_object: Object<Token>,
    buyer: address,
    sale_currency: Object<Metadata>,
    gross_amount: u64
)
```

## Routing Rules

| Source | Destination |
|--------|-------------|
| Mint seed (% of mint price) | Core Vault |
| Staking rewards | Core Vault |
| Secondary sale royalty | **Rewards Vault** |
| Gaming wins/activities | **Rewards Vault** |
| Manual deposits | Either (depositor chooses) |

## View Functions

| Function | Returns |
|----------|---------|
| `get_vault_balances(nft_addr)` | Combined core + rewards |
| `get_core_vault_balances(nft_addr)` | Core vault only |
| `get_rewards_vault_balances(nft_addr)` | Rewards vault only |
| `get_vault_config(collection_addr)` | Config tuple |
| `vault_exists(nft_addr)` | `bool` |
| `last_sale_used_vault_royalty(nft_addr)` | `bool` |
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

## Events

```move
#[event] struct VaultedNFTMinted { nft_addr, collection_addr, creator, to, is_redeemable }
#[event] struct VaultDeposited { nft_addr, fa_type, amount, depositor }
#[event] struct VaultRedeemed { nft_addr, redeemer, redeemed_assets }
#[event] struct RoyaltySettled { nft_addr, sale_currency, gross, creator_cut, vault_cut, seller_net }
#[event] struct RewardsClaimed { nft_addr, claimer, assets_claimed }
```

## Compliance Model

CVN-1 provides a **strongly-encouraged sale path**, not cryptographic enforcement.

- `settle_sale_with_vault_royalty` is the canonical compliant path
- Vault royalties go to **rewards vault** (claimable)
- `last_sale_used_vault_royalty` tracks compliance status

## License

Proprietary - Singularity Shift Ltd.
