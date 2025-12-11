/// CVN-1: Fee Splitter Module
/// 
/// A generic fee splitter that receives royalties and distributes them
/// proportionally to configured recipients. Anyone can call distribute_fees
/// to trigger distribution.
module cvn1_vault::fee_splitter {
    use std::vector;
    use std::signer;
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;

    // ============================================
    // Error Codes
    // ============================================
    
    /// Shares vector length must match addresses vector length
    const EMISMATCHED_LENGTHS: u64 = 1;
    /// Total shares must be greater than zero
    const EZERO_TOTAL_SHARES: u64 = 2;
    /// Splitter not found at address
    const ESPLITTER_NOT_FOUND: u64 = 3;
    /// No balance to distribute
    const EZERO_BALANCE: u64 = 4;
    /// Caller is not the splitter owner
    const ENOT_OWNER: u64 = 5;

    // ============================================
    // Data Structures
    // ============================================

    /// A recipient with their share allocation
    struct Recipient has copy, drop, store {
        addr: address,
        share: u64,  // parts out of total_shares
    }

    /// Fee Splitter configuration stored on its own object
    struct FeeSplitter has key {
        /// Owner who can update recipients (typically collection creator)
        owner: address,
        /// List of recipients and their share allocations
        recipients: vector<Recipient>,
        /// Sum of all shares (denominator for splits)
        total_shares: u64,
        /// ExtendRef for generating signer to withdraw funds
        extend_ref: ExtendRef,
    }

    // ============================================
    // Entry Functions
    // ============================================

    /// Create a new fee splitter with specified recipients and shares
    /// 
    /// Returns the object address of the created splitter.
    /// The splitter address should be used as the royalty payout address.
    public fun create_splitter(
        creator: &signer,
        addresses: vector<address>,
        shares: vector<u64>,
    ): address {
        let len = vector::length(&addresses);
        assert!(len == vector::length(&shares), EMISMATCHED_LENGTHS);
        
        // Build recipients vector and calculate total shares
        let recipients = vector::empty<Recipient>();
        let total_shares = 0u64;
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            let share = *vector::borrow(&shares, i);
            vector::push_back(&mut recipients, Recipient { addr, share });
            total_shares = total_shares + share;
            i = i + 1;
        };
        
        assert!(total_shares > 0, EZERO_TOTAL_SHARES);
        
        // Create splitter object
        let constructor_ref = object::create_object_from_account(creator);
        let splitter_signer = object::generate_signer(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        move_to(&splitter_signer, FeeSplitter {
            owner: signer::address_of(creator),
            recipients,
            total_shares,
            extend_ref,
        });
        
        signer::address_of(&splitter_signer)
    }

    /// Distribute accumulated fees for a specific fungible asset
    /// 
    /// Anyone can call this function. Funds are split proportionally
    /// among recipients based on their share allocations.
    public entry fun distribute_fees(
        _caller: &signer,  // Anyone can trigger distribution
        splitter_addr: address,
        fa_metadata: Object<Metadata>,
    ) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_addr), ESPLITTER_NOT_FOUND);
        
        let splitter = borrow_global<FeeSplitter>(splitter_addr);
        let splitter_signer = object::generate_signer_for_extending(&splitter.extend_ref);
        
        // Check balance in splitter's primary fungible store
        let balance = primary_fungible_store::balance(splitter_addr, fa_metadata);
        assert!(balance > 0, EZERO_BALANCE);
        
        // Withdraw all funds from splitter
        let funds = primary_fungible_store::withdraw(&splitter_signer, fa_metadata, balance);
        
        // Distribute to recipients proportionally
        let recipients = &splitter.recipients;
        let total_shares = splitter.total_shares;
        let len = vector::length(recipients);
        let i = 0;
        let distributed = 0u64;
        
        while (i < len) {
            let recipient = vector::borrow(recipients, i);
            let amount = if (i == len - 1) {
                // Last recipient gets remainder to avoid rounding dust
                balance - distributed
            } else {
                // Calculate proportional share: balance * share / total_shares
                (((balance as u128) * (recipient.share as u128) / (total_shares as u128)) as u64)
            };
            
            if (amount > 0) {
                let payment = fungible_asset::extract(&mut funds, amount);
                primary_fungible_store::deposit(recipient.addr, payment);
                distributed = distributed + amount;
            };
            i = i + 1;
        };
        
        // Destroy empty remainder (should be 0)
        fungible_asset::destroy_zero(funds);
    }

    // ============================================
    // View Functions
    // ============================================

    #[view]
    /// Check if a fee splitter exists at the given address
    public fun splitter_exists(addr: address): bool {
        exists<FeeSplitter>(addr)
    }

    #[view]
    /// Get the pending balance for a specific asset in the splitter
    public fun get_pending_balance(
        splitter_addr: address,
        fa_metadata: Object<Metadata>,
    ): u64 {
        primary_fungible_store::balance(splitter_addr, fa_metadata)
    }

    #[view]
    /// Get the number of recipients in a splitter
    public fun get_recipient_count(splitter_addr: address): u64 acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_addr), ESPLITTER_NOT_FOUND);
        let splitter = borrow_global<FeeSplitter>(splitter_addr);
        vector::length(&splitter.recipients)
    }

    #[view]
    /// Get recipient info by index (address, share, total_shares)
    public fun get_recipient_info(
        splitter_addr: address,
        index: u64,
    ): (address, u64, u64) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_addr), ESPLITTER_NOT_FOUND);
        let splitter = borrow_global<FeeSplitter>(splitter_addr);
        let recipient = vector::borrow(&splitter.recipients, index);
        (recipient.addr, recipient.share, splitter.total_shares)
    }

    #[view]
    /// Get the splitter owner
    public fun get_owner(splitter_addr: address): address acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_addr), ESPLITTER_NOT_FOUND);
        let splitter = borrow_global<FeeSplitter>(splitter_addr);
        splitter.owner
    }

    // ============================================
    // Owner Functions
    // ============================================

    /// Update recipients (owner only)
    /// 
    /// Allows the owner to change the distribution configuration.
    /// Should only be called when splitter has zero balance to avoid
    /// inconsistent distributions.
    public entry fun update_recipients(
        owner: &signer,
        splitter_addr: address,
        addresses: vector<address>,
        shares: vector<u64>,
    ) acquires FeeSplitter {
        assert!(exists<FeeSplitter>(splitter_addr), ESPLITTER_NOT_FOUND);
        
        let splitter = borrow_global_mut<FeeSplitter>(splitter_addr);
        assert!(signer::address_of(owner) == splitter.owner, ENOT_OWNER);
        
        let len = vector::length(&addresses);
        assert!(len == vector::length(&shares), EMISMATCHED_LENGTHS);
        
        // Rebuild recipients vector
        let recipients = vector::empty<Recipient>();
        let total_shares = 0u64;
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            let share = *vector::borrow(&shares, i);
            vector::push_back(&mut recipients, Recipient { addr, share });
            total_shares = total_shares + share;
            i = i + 1;
        };
        
        assert!(total_shares > 0, EZERO_TOTAL_SHARES);
        
        splitter.recipients = recipients;
        splitter.total_shares = total_shares;
    }
}
