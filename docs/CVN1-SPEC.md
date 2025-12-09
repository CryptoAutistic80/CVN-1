# CVN-1: Cedra Vaulted NFT Standard

> A standard for NFTs with built-in fungible asset vaults on Cedra Network.

## Overview

CVN-1 defines a vaulted NFT standard where each NFT contains an internal vault that can hold multiple fungible assets. This enables:

- **Value Accumulation** — NFTs can accumulate real value over time
- **Automatic Royalty Reinvestment** — Secondary sale royalties flow into the vault
- **Community Building** — Anyone can deposit into any NFT's vault
- **Burn-to-Redeem** — Owners can burn the NFT to claim all vault contents

## Module Architecture

```
contracts/cvn1_vault/sources/
├── vault_core.move      # Core data structures, constants, errors
├── vault_events.move    # Event definitions
├── collection.move      # Collection initialization
├── minting.move         # NFT minting functions
├── vault_ops.move       # Deposit, burn/redeem operations
├── royalties.move       # Sale settlement with vault royalties
└── vault_views.move     # Read-only view functions
```

## Data Structures

### VaultedCollectionConfig

Stored on the collection object's address:

```move
struct VaultedCollectionConfig has key {
    creator_royalty_bps: u16,    // Creator royalty (0-10000 = 0-100%)
    vault_royalty_bps: u16,      // Vault top-up royalty from sales
    mint_vault_bps: u16,         // % of mint fee seeded to vault
    mint_price: u64,             // Mint price (0 = free)
    mint_price_fa: address,      // FA metadata for payments
    allowed_assets: vector<address>,  // Allowlist (empty = any)
    creator_payout_addr: address,
}
```

### VaultInfo

Stored on each NFT's object address:

```move
struct VaultInfo has key {
    is_redeemable: bool,
    vault_stores: SmartTable<address, address>,  // FA addr → store addr
    store_delete_refs: SmartTable<address, DeleteRef>,
    extend_ref: ExtendRef,
    delete_ref: Option<DeleteRef>,
    burn_ref: BurnRef,
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
// Creator mints with optional payment
public entry fun creator_mint_vaulted_nft(
    creator: &signer,
    buyer: &signer,
    collection_addr: address,
    to: address,
    name: String,
    description: String,
    uri: String,
    is_redeemable: bool
)

// Creator mints to self (free)
public entry fun creator_self_mint(
    creator: &signer,
    collection_addr: address,
    name: String,
    description: String,
    uri: String,
    is_redeemable: bool
)

// Public mint (buyer pays)
public entry fun public_mint(
    buyer: &signer,
    collection_addr: address,
    name: String,
    description: String,
    uri: String,
    is_redeemable: bool
)
```

### Vault Operations

```move
// Deposit FA to any NFT's vault
public entry fun deposit_to_vault(
    depositor: &signer,
    nft_object: Object<Token>,
    fa_metadata: Object<Metadata>,
    amount: u64
)

// Burn NFT and claim vault contents
public entry fun burn_and_redeem(
    owner: &signer,
    nft_object: Object<Token>
)
```

### Royalty Settlement

```move
// Compliant sale settlement (for marketplaces)
public entry fun settle_sale_with_vault_royalty(
    marketplace: &signer,
    nft_object: Object<Token>,
    buyer: address,
    sale_currency: Object<Metadata>,
    gross_amount: u64
)

// Optional: mark non-compliant transfer
public entry fun mark_non_compliant_transfer(
    owner: &signer,
    nft_object: Object<Token>
)
```

## View Functions

| Function | Returns |
|----------|---------|
| `get_vault_balances(nft_addr)` | `vector<VaultBalance>` |
| `get_vault_config(collection_addr)` | `(u16, u16, vector<address>, address)` |
| `vault_exists(nft_addr)` | `bool` |
| `last_sale_used_vault_royalty(nft_addr)` | `bool` |
| `get_vault_info(nft_addr)` | `(bool, address, bool)` |
| `get_token_metadata(nft_object)` | `(String, String, String)` |
| `get_vault_summary(nft_addr)` | `(u64, u64, bool, bool)` |
| `get_collection_address(creator, name)` | `address` |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `ENOT_CREATOR` | Caller is not the collection creator |
| 2 | `ENOT_OWNER` | Caller is not the NFT owner |
| 3 | `ENOT_REDEEMABLE` | Vault is not redeemable |
| 4 | `EINVALID_AMOUNT` | Invalid amount (must be > 0) |
| 5 | `EASSET_NOT_ALLOWED` | FA not in allowlist |
| 6 | `EINSUFFICIENT_BALANCE` | Insufficient balance |
| 7 | `ECOLLECTION_ALREADY_EXISTS` | Collection already initialized |
| 8 | `EVAULT_NOT_FOUND` | No vault exists at address |
| 9 | `EINVALID_ROYALTY_BPS` | Royalty BPS > 10000 |
| 10 | `ECONFIG_NOT_FOUND` | Collection config not found |

## Compliance Model

CVN-1 provides a **strongly-encouraged sale path**, not cryptographic enforcement.

- `settle_sale_with_vault_royalty` is the canonical compliant path
- Standard `object::transfer` can bypass royalties entirely
- `last_sale_used_vault_royalty` tracks compliance status

**For Marketplaces:** Call `settle_sale_with_vault_royalty` for all CVN-1 NFT sales.

**For Collectors:** Check `last_sale_used_vault_royalty` to verify compliance.

## Events

```move
#[event] struct VaultedNFTMinted { nft_addr, collection_addr, creator, to, is_redeemable }
#[event] struct VaultDeposited { nft_addr, fa_type, amount, depositor }
#[event] struct VaultRedeemed { nft_addr, redeemer, redeemed_assets }
#[event] struct RoyaltySettled { nft_addr, sale_currency, gross, creator_cut, vault_cut, seller_net }
```

## License

Proprietary - Singularity Shift Ltd.
