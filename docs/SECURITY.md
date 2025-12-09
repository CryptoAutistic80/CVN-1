# CVN-1 Security Review

> Self-audit checklist for the CVN-1 Vaulted NFT Standard

## ✅ Completed Security Checks

### 1. Arithmetic Safety
- [x] All royalty calculations use `math64::mul_div` for overflow safety
- [x] BPS validation ensures `≤ 10000` (100%)
- [x] `creator_royalty_bps + vault_royalty_bps ≤ MAX_BPS` enforced
- [x] `mint_vault_bps ≤ MAX_BPS` enforced separately

### 2. Access Control
- [x] `creator_mint_vaulted_nft` - Only collection creator can mint
- [x] `burn_and_redeem` - Only NFT owner can burn
- [x] `deposit_to_vault` - Open to anyone (by design)
- [x] `settle_sale_with_vault_royalty` - Requires marketplace signer (holds funds)

### 3. Resource Safety
- [x] `VaultInfo` stored under NFT address (not global)
- [x] `BurnRef` stored in VaultInfo for proper token destruction
- [x] `SmartTable::destroy()` called before VaultInfo move_from
- [x] All FA stores cleaned up via iteration before burn

### 4. Re-entrancy Prevention
- [x] Linear flow: withdraw → deposit (no callbacks)
- [x] State changes before external calls
- [x] No user-controlled callbacks in any entry function

### 5. Capability Patterns
- [x] `ExtendRef` used for vault signer generation
- [x] `DeleteRef` used for NFT and FungibleStore cleanup in burn_and_redeem
- [x] `BurnRef` moved and consumed in burn_and_redeem

### 6. Edge Cases Handled
- [x] Zero deposit amount → `EINVALID_AMOUNT` abort
- [x] Non-redeemable burn → `ENOT_REDEEMABLE` abort
- [x] Non-owner burn → `ENOT_OWNER` abort  
- [x] Non-allowed FA deposit → `EASSET_NOT_ALLOWED` abort
- [x] Empty vault redeem → succeeds, emits empty assets list
- [x] Missing config → `ECONFIG_NOT_FOUND` abort
- [x] Missing vault → `EVAULT_NOT_FOUND` abort

## Risk Assessment

### Low Risk
- **Spam deposits**: Mitigated by `allowed_assets` allowlist option
- **Dust attacks**: Tokens can't be "trapped" (owner can always redeem)

### Medium Risk
- **Marketplace trust**: `settle_sale_with_vault_royalty` trusts marketplace to hold funds
  - Mitigation: Marketplace must sign transaction, providing non-repudiation

### Accepted Design Choices
- **is_redeemable = false**: Permanent lock, cannot be changed after mint
- **No withdraw without burn**: By design - vault is intrinsic to NFT
- **Anyone can deposit**: Intentional for community value building

## Potential Improvements (Future)

1. **Time-locked vaults**: Add unlock timestamp before burn allowed
2. **Governance redemption**: DAO can vote to unlock non-redeemable vaults
3. **Deposit limits**: Cap max deposit per transaction
4. **Creator delegation**: Allow designated minters besides creator

---

## Audit Status

| Check | Status |
|-------|--------|
| Self-review | ✅ Complete |
| Unit tests | ✅ 18 passing |
| Modular architecture | ✅ 7 modules |
| Testnet deploy | ✅ Verified |
| External audit | ⏳ Not yet |

---

*Last reviewed: 2025-12-09*
