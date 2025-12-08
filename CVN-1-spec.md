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
    creator_royalty_bps: u16,   // creator fee in basis points
    vault_royalty_bps: u16,     // vault top-up fee in basis points
    allowed_assets: vector<address>, // empty => any FA type allowed
    creator_payout_addr: address,
}
```
Stored once under the collection creator. Basis points use `10000 = 100%` to match Cedra conventions.

### Per-token vault marker
```move
struct VaultInfo has key {
    nft_object_addr: address,
    is_redeemable: bool,
}
```
`VaultInfo` marks an NFT as vaulted and captures redeemability. The vault’s fungible balances live in FA `FungibleStore` objects owned by the NFT’s object address (one per FA type), consistent with the FA guide.

## Lifecycle flows
### Mint vaulted NFT
Entry: `mint_vaulted_nft(creator, to, name, description, uri, initial_vault_assets)`
1. Validate `creator` owns the collection (per Cedra NFT guide).
2. Mint NFT supply = 1 via `token::create_named_token`.
3. Record `VaultInfo { nft_object_addr, is_redeemable: true }` under the NFT’s address.
4. For each `(fa_type, amount)` in `initial_vault_assets`, withdraw from `creator` and deposit into the NFT’s FA store (creating on first use).
5. Transfer the NFT to `to`.

### Open deposits
Entry: `deposit_to_vault(depositor, nft_object, fa_type, amount)`
1. Resolve `nft_addr` from `nft_object` and assert a `VaultInfo` exists.
2. If `allowed_assets` is non-empty, require `fa_type` in the allowlist.
3. Withdraw `amount` from `depositor` and deposit into the `nft_addr` FA store (auto-create if missing).

### Burn and redeem
Entry: `burn_and_redeem(owner, nft_object)`
1. Confirm `owner` currently owns `nft_object`.
2. Ensure `is_redeemable`.
3. For each FA store owned by `nft_addr`, withdraw full balances and deposit to `owner`.
4. Burn the NFT via `token::burn` and destroy the object; delete `VaultInfo`.

## Royalty + settlement hook
### Standard entry
`settle_sale_with_vault_royalty(marketplace, nft_object, buyer, sale_currency, gross_amount)`
1. Compute:
   - `creator_cut = gross_amount * creator_royalty_bps / 10000`
   - `vault_cut = gross_amount * vault_royalty_bps / 10000`
   - `seller_net = gross_amount - creator_cut - vault_cut`
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

## Implementation blueprint (Move)
Module name suggestion: `cvn1_vault::vaulted_collection`.

Key entry functions and signatures:
```move
module cvn1_vault::vaulted_collection {
    use std::string::String;
    use cedra_token_objects::collection;
    use cedra_token_objects::token;
    use fungible_asset::store::FungibleStore;
    use object::{self, Object};

    struct VaultedCollectionConfig has key { ... }
    struct VaultInfo has key { ... }

    public entry fun init_collection_config(creator: &signer, creator_royalty_bps: u16, vault_royalty_bps: u16, allowed_assets: vector<address>, creator_payout_addr: address);

    public entry fun mint_vaulted_nft(creator: &signer, to: address, name: String, description: String, uri: String, initial_vault_assets: vector<(address, u64)>) acquires VaultedCollectionConfig;

    public entry fun deposit_to_vault(depositor: &signer, nft_object: Object<token::Token>, fa_type: address, amount: u64) acquires VaultInfo, VaultedCollectionConfig;

    public entry fun burn_and_redeem(owner: &signer, nft_object: Object<token::Token>) acquires VaultInfo;

    public entry fun settle_sale_with_vault_royalty(marketplace: &signer, nft_object: Object<token::Token>, buyer: address, sale_currency: address, gross_amount: u64) acquires VaultInfo, VaultedCollectionConfig;

    #[view]
    public fun get_vault_balances(nft_addr: address): vector<(address, u64)>;
    #[view]
    public fun get_vault_config(): (u16, u16, vector<address>, address);
    #[view]
    public fun last_sale_used_vault_royalty(nft_addr: address): bool;
}
```

Implementation notes:
- Use `object::id` to derive `nft_addr` and `object::transfer` to move NFTs.
- Create per-asset `FungibleStore` owned by `nft_addr`; use `store::create_store` on first deposit.
- Emit events on deposit, redeem, and settlement to aid indexers (e.g., `VaultDeposited`, `VaultRedeemed`, `RoyaltySettled`).
- Keep arithmetic in `u128` where possible before casting back to avoid bps overflow.

## Reference flows (TypeScript client with `@cedra-labs/ts-sdk`)
- **Mint:** Build a transaction that calls `mint_vaulted_nft`, providing initial vault assets. Use `sponsoredTransaction` helpers if creator seeds vaults for buyers.
- **Deposit:** Call `deposit_to_vault` with FA type address and amount; UI should fetch `get_vault_balances` to confirm.
- **Redeem:** Call `burn_and_redeem`; prompt the user to approve burning the NFT. After execution, NFT disappears and wallet receives vault assets.
- **Marketplace settlement:** Marketplace backend constructs a transaction that first ensures it holds payment FAs, then calls `settle_sale_with_vault_royalty`; afterwards it transfers the NFT to buyer within the same entry.

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
