# CVN-1: Cedra Vaulted NFT Standard

## Motivation
Cedra NFTs already support object-owned fungible asset (FA) balances, but there is no common standard for “vaulted” NFTs that embed their own on-chain treasury. CVN-1 defines a standard data model, lifecycle flows, and marketplace hook so any Cedra-native NFT can own, grow, and redeem its own vault while keeping creator and vault royalties enforceable across compliant venues.

## Design goals
- **Native vaulting:** Every NFT has a dedicated FA vault keyed by its object address, following Cedra’s FA design where balances are stored in `FungibleStore` objects owned by addresses.
- **Open deposits:** Anyone can top up a vault to raise intrinsic value.
- **Redeemable:** The current holder can burn+redeem to claim the vault contents (optional non-redeemable mode).
- **Composable royalties:** Creator and vault royalty splits are standardized via a settlement hook that compliant marketplaces call.
- **Indexer-friendly:** View functions and predictable events make it easy to surface vault balances and intrinsic floor values.

## Roles
- **Creator:** Deploys module and collection, configures allowed assets and royalty splits, seeds vaults during mint.
- **Owner:** Current holder of the vaulted NFT; can deposit and can burn+redeem (if allowed).
- **Depositor:** Any third party who wants to add assets to the vault.
- **Marketplace:** Executes sales and calls the standard royalty+vault settlement entry function.

## On-chain data model
### Collection configuration
```move
struct VaultedCollectionConfig has key {
    collection_addr: address,
    creator_royalty_bps: u16,   // creator fee in basis points (secondary sales)
    vault_royalty_bps: u16,     // vault top-up fee in basis points (secondary sales)
    mint_vault_bps: u16,        // % of mint fee to seed into vault (0-10000)
    mint_price: u64,            // mint cost in smallest FA units (0 = free)
    mint_price_fa: address,     // FA metadata address for mint payments
    allowed_assets: vector<address>, // empty => any FA type allowed
    creator_payout_addr: address,
}
```
Stored once under the collection creator. Basis points use `10000 = 100%` to match Cedra conventions.

### Per-token vault marker
```move
struct VaultInfo has key {
    is_redeemable: bool,
    vault_stores: SmartTable<address, address>, // fa_metadata_addr -> store_object_addr
    extend_ref: ExtendRef,  // For extending vault object capabilities
    delete_ref: DeleteRef,  // For cleanup on burn+redeem
    burn_ref: BurnRef,      // For burning the token
    creator_addr: address,  // For config lookup
    last_sale_compliant: bool, // Tracks if last sale used vault royalty
}
```
`VaultInfo` marks an NFT as vaulted and captures redeemability. The vault's fungible balances live in FA `FungibleStore` objects owned by the NFT's object address (one per FA type). The `SmartTable` tracks each deposited FA type's store address. `ExtendRef`, `DeleteRef`, and `BurnRef` enable proper lifecycle management per the Cedra Escrow guide pattern.

## Lifecycle flows
### Mint vaulted NFT
Entry: `creator_mint_vaulted_nft(creator, buyer, to, name, description, uri, is_redeemable)`
1. Validate `creator` owns the collection (per Cedra NFT guide).
2. Mint NFT supply = 1 via `token::create_named_token`.
3. Record `VaultInfo` under the NFT's address with `BurnRef` for later destruction.
4. If `mint_price > 0`:
   - Calculate `vault_seed = mint_price * mint_vault_bps / 10000`
   - Withdraw `mint_price` from `buyer`
   - Deposit `mint_price - vault_seed` to `creator_payout_addr`
   - Deposit `vault_seed` directly into NFT's vault (immediate value!)
5. Transfer the NFT to `to`.
6. Emit `VaultedNFTMinted` event.

### Open deposits
Entry: `deposit_to_vault(depositor, nft_object, fa_type, amount)`
1. Resolve `nft_addr` from `nft_object` and assert a `VaultInfo` exists.
2. If `allowed_assets` is non-empty, require `fa_type` in the allowlist.
3. Withdraw `amount` from `depositor` and deposit into the `nft_addr` FA store (auto-create if missing).

### Burn and redeem
Entry: `burn_and_redeem(owner, nft_object)`
1. Confirm `owner` currently owns `nft_object`.
2. Ensure `is_redeemable`.
3. Iterate the `vault_stores` SmartTable; for each FA store, withdraw full balance and deposit to `owner`.
4. Emit `VaultRedeemed` event with asset totals.
5. Use `delete_ref` to clean up any vault objects.
6. Burn the NFT via `token::burn` and delete `VaultInfo`.

## Royalty + settlement hook
### Standard entry
`settle_sale_with_vault_royalty(marketplace, nft_object, buyer, sale_currency, gross_amount)`
1. Compute using overflow-safe math (per Cedra Fee Splitter guide):
   ```move
   use cedra_std::math64;
   let creator_cut = math64::mul_div(gross_amount, (creator_royalty_bps as u64), 10000);
   let vault_cut = math64::mul_div(gross_amount, (vault_royalty_bps as u64), 10000);
   let seller_net = gross_amount - creator_cut - vault_cut;
   ```
2. Marketplace holds `gross_amount` in its FA store for `sale_currency`.
3. Transfers:
   - `creator_cut` → `creator_payout_addr`
   - `vault_cut` → NFT vault store (owned by `nft_addr`)
   - `seller_net` → current NFT owner
4. Transfer NFT to `buyer` via `object::transfer`.

### Compliance signaling
- View: `last_sale_used_vault_royalty(nft_addr) -> bool` to flag compliant settlements.
- Off-chain UIs can badge compliant marketplaces and warn on non-compliant transfers.

## View helpers
- `get_vault_balances(nft_addr) -> vector<(address, u64)>` — enumerate FA stores and balances.
- `get_vault_config() -> (u16, u16, vector<address>, address)` — expose royalty splits and allowlist.
- `get_floor_value(nft_addr, oracle) -> u64` — optional helper to price vault assets via an oracle.

## Safety and edge cases
- **Non-redeemable mode:** `is_redeemable = false` to create permanent vault NFTs.
- **Zero-value guards:** Reject zero amounts on deposit/redeem; validate FA store existence before withdraw.
- **Asset allowlist:** Restrict vault assets to trusted FA types to avoid spam tokens.
- **No re-entrancy:** Keep flows linear (withdraw → deposit) without callbacks.
- **One-way burn:** Burn destroys the NFT and vault marker permanently.
- **Overflow-safe math:** Use `math64::mul_div` for all basis-point calculations.
- **SmartTable for multi-asset:** Gas-efficient tracking of multiple FA types per vault.

## Implementation blueprint (Move)
Module name suggestion: `cvn1_vault::vaulted_collection`.

### Imports (per Cedra framework)
```move
module cvn1_vault::vaulted_collection {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::signer;
    use std::vector;
    
    use cedra_framework::object::{Self, Object, ExtendRef, DeleteRef};
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::event;
    
    use cedra_token_objects::collection;
    use cedra_token_objects::token::{Self, Token};
    
    use cedra_std::math64;
    use cedra_std::smart_table::{Self, SmartTable};
```

### Error codes
```move
    const ENOT_CREATOR: u64 = 1;
    const ENOT_OWNER: u64 = 2;
    const ENOT_REDEEMABLE: u64 = 3;
    const EINVALID_AMOUNT: u64 = 4;
    const EASSET_NOT_ALLOWED: u64 = 5;
    const EINSUFFICIENT_BALANCE: u64 = 6;
    const ECOLLECTION_ALREADY_EXISTS: u64 = 7;
    const EVAULT_NOT_FOUND: u64 = 8;
    
    const MAX_BPS: u64 = 10000;
```

### Data structures
```move
    struct VaultedCollectionConfig has key {
        collection_addr: address,
        creator_royalty_bps: u16,
        vault_royalty_bps: u16,
        allowed_assets: vector<address>,
        creator_payout_addr: address,
    }
    
    struct VaultInfo has key {
        is_redeemable: bool,
        vault_stores: SmartTable<address, address>, // fa_metadata -> store_addr
        extend_ref: ExtendRef,
        delete_ref: DeleteRef,
    }
```

### Events
```move
    #[event]
    struct VaultDeposited has drop, store {
        nft_object_addr: address,
        fa_type: address,
        amount: u64,
        depositor: address,
    }
    
    #[event]
    struct VaultRedeemed has drop, store {
        nft_object_addr: address,
        redeemer: address,
    }
    
    #[event]
    struct RoyaltySettled has drop, store {
        nft_object_addr: address,
        sale_currency: address,
        gross_amount: u64,
        creator_cut: u64,
        vault_cut: u64,
        seller_net: u64,
    }
```

### Entry functions
```move
    public entry fun init_collection_config(
        creator: &signer,
        collection_name: String,
        collection_description: String,
        collection_uri: String,
        creator_royalty_bps: u16,
        vault_royalty_bps: u16,
        mint_vault_bps: u16,        // NEW: % of mint fee to vault
        mint_price: u64,            // NEW: mint cost (0 = free)
        mint_price_fa: address,     // NEW: FA for mint payments
        allowed_assets: vector<address>,
        creator_payout_addr: address
    );

    public entry fun creator_mint_vaulted_nft(
        creator: &signer,
        buyer: &signer,             // Pays the mint fee
        to: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) acquires VaultedCollectionConfig, VaultInfo;

    public entry fun deposit_to_vault(
        depositor: &signer,
        nft_object: Object<Token>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires VaultInfo, VaultedCollectionConfig;

    public entry fun burn_and_redeem(
        owner: &signer,
        nft_object: Object<Token>
    ) acquires VaultInfo;

    public entry fun settle_sale_with_vault_royalty(
        marketplace: &signer,
        nft_object: Object<Token>,
        buyer: address,
        sale_currency: Object<Metadata>,
        gross_amount: u64
    ) acquires VaultInfo, VaultedCollectionConfig;
```

### View functions
```move
    #[view]
    public fun get_vault_balances(nft_addr: address): vector<(address, u64)> acquires VaultInfo;
    
    #[view]
    public fun get_vault_config(creator_addr: address): (u16, u16, vector<address>, address) acquires VaultedCollectionConfig;
    
    #[view]
    public fun vault_exists(nft_addr: address): bool;
    
    #[view]
    public fun last_sale_used_vault_royalty(nft_addr: address): bool;
}
```

### Implementation notes
- Use `object::object_address(&nft_object)` to get `nft_addr` and `object::transfer` to move NFTs.
- Create per-asset `FungibleStore` using `fungible_asset::create_store(&constructor_ref, fa_metadata)` pattern from Escrow guide.
- Store each FA store address in `vault_stores` SmartTable keyed by FA metadata address.
- Use `math64::mul_div(amount, bps, 10000)` for all royalty calculations (prevents overflow).
- Emit events via `event::emit(EventStruct { ... })` on deposit, redeem, and settlement.
- Use `object::generate_signer_for_extending(&extend_ref)` to get signer for vault operations.

## Reference flows (TypeScript client with `@cedra-labs/ts-sdk`)

### Building transactions (entry function calls)
```typescript
import { Cedra, CedraConfig, Account, Network } from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ network: Network.TESTNET });
const cedra = new Cedra(config);

// Mint vaulted NFT
const mintTx = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: {
        function: `${MODULE_ADDR}::vaulted_collection::mint_vaulted_nft`,
        typeArguments: [],
        functionArguments: [
            recipientAddress,
            "NFT Name",
            "Description",
            "https://metadata.uri/token.json",
            true // is_redeemable
        ],
    },
});
const pendingTx = await cedra.signAndSubmitTransaction({ signer: creator, transaction: mintTx });
await cedra.waitForTransaction({ transactionHash: pendingTx.hash });
```

### Querying view functions
```typescript
// Get vault balances (gas-free view call)
const [balances] = await cedra.view({
    payload: {
        function: `${MODULE_ADDR}::vaulted_collection::get_vault_balances`,
        typeArguments: [],
        functionArguments: [nftObjectAddress],
    },
});
console.log("Vault balances:", balances);
```

### Flow summary
- **Mint:** Use `transaction.build.simple` + `signAndSubmitTransaction` for `mint_vaulted_nft`.
- **Deposit:** Same pattern for `deposit_to_vault`, then call `get_vault_balances` view to confirm.
- **Redeem:** Call `burn_and_redeem`; prompt user to approve burning. After tx, NFT is gone and wallet receives vault assets.
- **Marketplace:** Build transaction calling `settle_sale_with_vault_royalty` with correct FA metadata object.

## Indexer strategy
- Watch for `VaultInfo` creation to register vaulted NFTs.
- Subscribe to FA deposit/withdraw events where store owner equals an NFT address; maintain per-asset balances.
- Track `RoyaltySettled` events to compute total vault contributions from trades and to set `last_sale_used_vault_royalty`.
- Expose APIs: `GET /vaulted-nfts/:id/balances`, `GET /vaulted-nfts/leaderboard`, `GET /vaulted-nfts/:id/history`.

## Rollout phases
1. **Phase 1 – Core:** Implement config, mint, deposit, burn+redeem with single FA type; ship a small demo UI that shows “backed value.”
2. **Phase 2 – Royalty standard:** Add `settle_sale_with_vault_royalty` and a reference marketplace that uses it; publish compliance badge rules.
3. **Phase 3 – Multi-asset + tooling:** Support multiple FA stores per NFT, add view helpers, build a simple indexer and TypeScript client kit.
4. **Phase 4 – Formal spec:** Freeze the interface, publish CVN-1 as a draft Cedra standard, and solicit feedback from marketplace partners.

## Open questions for governance
- Should vault allowlists default to native CEDRA only, or remain opt-in?
- Should burn+redeem be time-locked or creator-toggleable after mint?
- Should there be a canonical price oracle interface for `get_floor_value`?
- Do we need a standardized event schema for `RoyaltySettled` across all NFT standards on Cedra?

## References
- Cedra NFT walkthrough: https://docs.cedra.network/guides/first-nft
- Cedra fungible assets (FA) walkthrough: https://docs.cedra.network/guides/first-fa
- Cedra Fee Splitter guide: https://docs.cedra.network/guides/fee-splitter
- Cedra Escrow guide: https://docs.cedra.network/guides/escrow
- Cedra Resource patterns: https://docs.cedra.network/move/resource
