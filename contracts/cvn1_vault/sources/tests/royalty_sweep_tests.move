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

    #[test(creator = @0x123)]
    fun test_royalty_sweep_zero_bps_creates_no_escrow_and_noops(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Zero Royalties Collection"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            0,     // creator_royalty_bps
            0,     // vault_royalty_bps
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
            utf8(b"Zero Royalties Collection"),
        );

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Zero Royalties NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Zero Royalties Collection"),
            &utf8(b"Zero Royalties NFT"),
        );

        assert!(!vault_views::royalty_escrow_exists(nft_addr), 0);
        assert!(vault_views::get_royalty_escrow_address(nft_addr) == @0x0, 1);

        // Call sweep anyway; should be a clean no-op.
        let dummy = cedra_coin::mint_cedra_fa_for_test(1);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&dummy);
        primary_fungible_store::deposit(creator_addr, dummy);

        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        // No core vault deposits should occur.
        assert!(vector::length(&vault_views::get_core_vault_balances(nft_addr)) == 0, 2);
    }

    #[test(creator = @0x123)]
    fun test_royalty_sweep_creator_only_routes_all_to_creator(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Creator Only Royalties"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            1000,  // creator_royalty_bps
            0,     // vault_royalty_bps
            0,
            0,
            @0x0,
            vector::empty(),
            @0x123,
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr =
            collection::get_collection_address(creator_addr, utf8(b"Creator Only Royalties"));

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Creator Only NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Creator Only Royalties"),
            &utf8(b"Creator Only NFT"),
        );

        let escrow_addr = vault_views::get_royalty_escrow_address(nft_addr);
        assert!(escrow_addr != @0x0, 0);

        let royalty_payment = cedra_coin::mint_cedra_fa_for_test(1_000_000);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&royalty_payment);
        primary_fungible_store::deposit(escrow_addr, royalty_payment);

        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        assert!(primary_fungible_store::balance(escrow_addr, fa_metadata) == 0, 1);
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == 1_000_000, 2);
        assert!(vector::length(&vault_views::get_core_vault_balances(nft_addr)) == 0, 3);
    }

    #[test(creator = @0x123)]
    fun test_royalty_sweep_vault_only_routes_all_to_core_vault(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Vault Only Royalties"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            0,     // creator_royalty_bps
            1000,  // vault_royalty_bps
            0,
            0,
            @0x0,
            vector::empty(),
            @0x123,
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr =
            collection::get_collection_address(creator_addr, utf8(b"Vault Only Royalties"));

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Vault Only NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Vault Only Royalties"),
            &utf8(b"Vault Only NFT"),
        );

        let escrow_addr = vault_views::get_royalty_escrow_address(nft_addr);
        assert!(escrow_addr != @0x0, 0);

        let royalty_payment = cedra_coin::mint_cedra_fa_for_test(1_000_000);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&royalty_payment);
        primary_fungible_store::deposit(escrow_addr, royalty_payment);

        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        assert!(primary_fungible_store::balance(escrow_addr, fa_metadata) == 0, 1);
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == 0, 2);

        let core_balances = vault_views::get_core_vault_balances(nft_addr);
        assert!(vector::length(&core_balances) == 1, 3);
        let vb = vector::borrow(&core_balances, 0);
        assert!(vault_core::get_balance_amount(vb) == 1_000_000, 4);
    }

    #[test(creator = @0x123)]
    fun test_royalty_sweep_rounding_dust_to_creator(creator: &signer) {
        // 3.33% creator, 6.67% vault. total = 10.00%.
        collection::init_collection_config(
            creator,
            utf8(b"Rounding Royalties"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            333,  // creator_royalty_bps
            667,  // vault_royalty_bps
            0,
            0,
            @0x0,
            vector::empty(),
            @0x123,
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr =
            collection::get_collection_address(creator_addr, utf8(b"Rounding Royalties"));

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Rounding NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Rounding Royalties"),
            &utf8(b"Rounding NFT"),
        );

        let escrow_addr = vault_views::get_royalty_escrow_address(nft_addr);
        assert!(escrow_addr != @0x0, 0);

        let amount = 1_000_001;
        let royalty_payment = cedra_coin::mint_cedra_fa_for_test(amount);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&royalty_payment);
        primary_fungible_store::deposit(escrow_addr, royalty_payment);

        let expected_vault_cut = (((amount as u128) * 667u128) / 1000u128) as u64;
        let expected_creator_cut = amount - expected_vault_cut;

        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        assert!(primary_fungible_store::balance(escrow_addr, fa_metadata) == 0, 1);
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == expected_creator_cut, 2);

        let core_balances = vault_views::get_core_vault_balances(nft_addr);
        assert!(vector::length(&core_balances) == 1, 3);
        let vb = vector::borrow(&core_balances, 0);
        assert!(vault_core::get_balance_amount(vb) == expected_vault_cut, 4);
    }

    #[test(creator = @0x123)]
    fun test_royalty_sweep_is_idempotent_on_empty_escrow(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Idempotent Royalties"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            500,
            500,
            0,
            0,
            @0x0,
            vector::empty(),
            @0x123,
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr =
            collection::get_collection_address(creator_addr, utf8(b"Idempotent Royalties"));

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Idempotent NFT"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft.json"),
            true,
        );

        let nft_addr = token::create_token_address(
            &creator_addr,
            &utf8(b"Idempotent Royalties"),
            &utf8(b"Idempotent NFT"),
        );

        let escrow_addr = vault_views::get_royalty_escrow_address(nft_addr);
        assert!(escrow_addr != @0x0, 0);

        let royalty_payment = cedra_coin::mint_cedra_fa_for_test(1_000_000);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&royalty_payment);
        primary_fungible_store::deposit(escrow_addr, royalty_payment);

        let nft_object = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object, fa_metadata);

        let creator_balance_after_first = primary_fungible_store::balance(@0x123, fa_metadata);
        let core_balances_after_first = vault_views::get_core_vault_balances(nft_addr);
        assert!(vector::length(&core_balances_after_first) == 1, 2);
        let vb1 = vector::borrow(&core_balances_after_first, 0);
        let core_fa_after_first = vault_core::get_balance_fa_addr(vb1);
        let core_amount_after_first = vault_core::get_balance_amount(vb1);

        // Sweep again; should be a no-op since escrow balance is now 0.
        let nft_object_2 = object::address_to_object<Token>(nft_addr);
        vault_ops::sweep_royalty_to_core_vault(creator, nft_object_2, fa_metadata);

        assert!(primary_fungible_store::balance(escrow_addr, fa_metadata) == 0, 1);
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == creator_balance_after_first, 3);

        let core_balances_after_second = vault_views::get_core_vault_balances(nft_addr);
        assert!(vector::length(&core_balances_after_second) == 1, 4);
        let vb2 = vector::borrow(&core_balances_after_second, 0);
        assert!(vault_core::get_balance_fa_addr(vb2) == core_fa_after_first, 5);
        assert!(vault_core::get_balance_amount(vb2) == core_amount_after_first, 6);
    }

    #[test(creator = @0x123)]
    fun test_royalty_sweep_many_batches_multiple_nfts(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Batch Sweep Collection"),
            utf8(b"Test"),
            utf8(b"https://example.com"),
            500,
            500,
            0,
            0,
            @0x0,
            vector::empty(),
            @0x123,
            0
        );

        let creator_addr = signer::address_of(creator);
        let collection_addr = collection::get_collection_address(
            creator_addr,
            utf8(b"Batch Sweep Collection"),
        );

        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Batch NFT A"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft-a.json"),
            true,
        );
        minting::creator_self_mint(
            creator,
            collection_addr,
            utf8(b"Batch NFT B"),
            utf8(b"Test NFT"),
            utf8(b"https://example.com/nft-b.json"),
            true,
        );

        let nft_a = token::create_token_address(
            &creator_addr,
            &utf8(b"Batch Sweep Collection"),
            &utf8(b"Batch NFT A"),
        );
        let nft_b = token::create_token_address(
            &creator_addr,
            &utf8(b"Batch Sweep Collection"),
            &utf8(b"Batch NFT B"),
        );

        let escrow_a = vault_views::get_royalty_escrow_address(nft_a);
        let escrow_b = vault_views::get_royalty_escrow_address(nft_b);
        assert!(escrow_a != @0x0, 0);
        assert!(escrow_b != @0x0, 1);

        let payment_a = cedra_coin::mint_cedra_fa_for_test(1_000_000);
        let fa_metadata: object::Object<Metadata> = fungible_asset::asset_metadata(&payment_a);
        primary_fungible_store::deposit(escrow_a, payment_a);
        primary_fungible_store::deposit(escrow_b, cedra_coin::mint_cedra_fa_for_test(1_000_000));

        let nfts = vector::empty<address>();
        vector::push_back(&mut nfts, nft_a);
        vector::push_back(&mut nfts, nft_b);
        vault_ops::sweep_royalty_to_core_vault_many(creator, nfts, fa_metadata);

        assert!(primary_fungible_store::balance(escrow_a, fa_metadata) == 0, 2);
        assert!(primary_fungible_store::balance(escrow_b, fa_metadata) == 0, 3);

        // 50/50 split on each: creator gets 500k per NFT.
        assert!(primary_fungible_store::balance(@0x123, fa_metadata) == 1_000_000, 4);

        let core_a = vault_views::get_core_vault_balances(nft_a);
        assert!(vector::length(&core_a) == 1, 5);
        assert!(vault_core::get_balance_amount(vector::borrow(&core_a, 0)) == 500_000, 6);

        let core_b = vault_views::get_core_vault_balances(nft_b);
        assert!(vector::length(&core_b) == 1, 7);
        assert!(vault_core::get_balance_amount(vector::borrow(&core_b, 0)) == 500_000, 8);
    }
}
