# CVN-1 Testnet Deployment

## Current Version: 2.0.0 (Modular Architecture)

> **Note:** v2.0.0 introduces a modular architecture. Deploy with the new profile.

## Deployment Command

```bash
# Using the cvn1_v2 profile
cedra move publish --profile cvn1_v2 --named-addresses cvn1_vault=cvn1_v2
```

## v2.0.0 Modules

The monolithic `vaulted_collection.move` has been split into 7 focused modules:

| Module | Description |
|--------|-------------|
| `vault_core` | Core data structures, constants, errors |
| `vault_events` | Event definitions and emission |
| `collection` | Collection initialization |
| `minting` | All mint variants |
| `vault_ops` | Deposit, burn/redeem operations |
| `royalties` | Sale settlement with vault royalties |
| `vault_views` | Read-only view functions |

## Entry Functions (v2)

| Module | Function |
|--------|----------|
| `collection` | `init_collection_config` |
| `minting` | `creator_mint_vaulted_nft`, `creator_self_mint`, `public_mint` |
| `vault_ops` | `deposit_to_vault`, `burn_and_redeem` |
| `royalties` | `settle_sale_with_vault_royalty`, `mark_non_compliant_transfer` |

## View Functions (v2)

| Module | Function |
|--------|----------|
| `collection` | `get_collection_address` |
| `vault_views` | `get_vault_balances`, `get_vault_config`, `vault_exists`, `last_sale_used_vault_royalty`, `get_vault_info`, `get_token_metadata`, `get_vault_summary` |

---

## Previous Deployment (v1.0.0)

| Field | Value |
|-------|-------|
| **Network** | Cedra Testnet |
| **Module Address** | `0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c` |
| **Module Name** | `vaulted_collection` (monolithic) |
| **Transaction Hash** | `0x10cbf3c19484338437fbbdd143a2aef104bd6949b6b881e8172e42beeb6d813f` |
| **Deployed At** | 2025-12-08 |

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.0.0 | 2025-12-09 | Modular architecture (7 modules), resource cleanup, new views |
| 1.0.0 | 2025-12-08 | Initial testnet deployment (monolithic) |
