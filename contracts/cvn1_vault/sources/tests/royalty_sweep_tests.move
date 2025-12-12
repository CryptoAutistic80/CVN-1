// CVN-1: Royalty Sweep Tests (v6)
// End-to-end test for per-NFT royalty escrow + sweep into Core Vault.
#[test_only]
module cvn1_vault::royalty_sweep_tests {
    use std::string::utf8;
    use std::signer;
    use std::vector;

    use cedra_framework::object;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::cedra_coin;

    use cedra_token_objects::token::{Self, Token};

    use cvn1_vault::collection;
    use cvn1_vault::minting;
    use cvn1_vault::vault_ops;
    use cvn1_vault::vault_views;
    use cvn1_vault::vault_core;

    #[test(creator = @0x123)]
    fun test_royalty_sweep_deposits_to_core_vault(creator: &signer) {
        // Create collection config:
        // - 5% creator royalty
        // - 5% core vault royalty
        // Total royalty enforced by marketplaces via token-level royalty = 10%.
        collection::init_collection_config(
            creator,
            utf8(b"Royalty Sweep Collection"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            500,   // creator_royalty_bps
            500,   // vault_royalty_bps (core vault)
            0,     // mint_vault_bps
            0,     // mint_price
            @0x0,  // mint_price_fa
            vector::empty(),
            @0x123, // creator_payout_addr
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr = collection::get_collection_address(
            creator_addr,
            utf8(b"Royalty Sweep Collection"),
        );

        // Mint a named token for deterministic address.
        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Sweep NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Royalty Sweep Collection"),
            &utf8(b"Sweep NFT"),
        );

        // Royalty escrow is created at mint-time (v6).
        assert!(vault_views::royalty_escrow_exists(nft_addr), 0);
        let escrow_addr = vault_views::get_royalty_escrow_address(nft_addr);
        assert!(escrow_addr != @0x0, 1);

        // Simulate a royalty payment into the escrow in CEDRA fungible-asset form.
        let royalty_payment = cedra_coin::mint_cedra_fa_for_test(1_000_000);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&royalty_payment);
        primary_fungible_store::deposit(escrow_addr, royalty_payment);

        // Sweep royalties permissionlessly into creator payout + NFT core vault.
        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        // Escrow drained
        assert!(primary_fungible_store::balance(escrow_addr, fa_metadata) == 0, 2);

        // Total royalty amount is 1_000_000; creator and vault split evenly (5%/5%).
        let expected_vault_cut = 500_000;
        let expected_creator_cut = 500_000;

        // Creator payout balance increased
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == expected_creator_cut, 3);

        // Core vault balance increased
        let core_balances = vault_views::get_core_vault_balances(nft_addr);
        assert!(vector::length(&core_balances) == 1, 4);
        let vb = vector::borrow(&core_balances, 0);
        assert!(vault_core::get_balance_fa_addr(vb) == object::object_address(&fa_metadata), 5);
        assert!(vault_core::get_balance_amount(vb) == expected_vault_cut, 6);
    }
}

