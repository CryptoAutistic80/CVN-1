# CVN-1 Testnet Deployment

## Deployment Details

| Field | Value |
|-------|-------|
| **Network** | Cedra Testnet |
| **Module Address** | `0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c` |
| **Module Name** | `vaulted_collection` |
| **Transaction Hash** | `0x10cbf3c19484338437fbbdd143a2aef104bd6949b6b881e8172e42beeb6d813f` |
| **Explorer Link** | [View on CedraScan](https://cedrascan.com/txn/0x10cbf3c19484338437fbbdd143a2aef104bd6949b6b881e8172e42beeb6d813f?network=testnet) |
| **Deployed At** | 2025-12-08 |
| **Package Size** | 11,761 bytes |
| **Gas Used** | 6,136 units |

## Full Module Path

```
0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c::vaulted_collection
```

## Entry Functions

| Function | CLI Example |
|----------|-------------|
| `init_collection_config` | `cedra move run --function-id <addr>::vaulted_collection::init_collection_config --args ...` |
| `creator_mint_vaulted_nft` | `cedra move run --function-id <addr>::vaulted_collection::creator_mint_vaulted_nft --args ...` |
| `deposit_to_vault` | `cedra move run --function-id <addr>::vaulted_collection::deposit_to_vault --args ...` |
| `burn_and_redeem` | `cedra move run --function-id <addr>::vaulted_collection::burn_and_redeem --args ...` |
| `settle_sale_with_vault_royalty` | `cedra move run --function-id <addr>::vaulted_collection::settle_sale_with_vault_royalty --args ...` |

## View Functions

```bash
# Check if vault exists
cedra move view --function-id 0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c::vaulted_collection::vault_exists --args address:<nft_addr>

# Get vault balances
cedra move view --function-id 0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c::vaulted_collection::get_vault_balances --args address:<nft_addr>

# Get collection config
cedra move view --function-id 0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c::vaulted_collection::get_vault_config --args address:<creator_addr>
```

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2025-12-08 | Initial testnet deployment |
