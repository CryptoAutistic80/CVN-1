# CVN-1 Gas Benchmarks

> Gas costs measured on Cedra Testnet (December 2025)

## Summary

| Operation | Gas Units | Est. Cost (100 gas price) |
|-----------|-----------|---------------------------|
| **Publish module** | 6,136 | 0.006136 CEDRA |
| **init_collection_config** | 1,089 | 0.001089 CEDRA |
| **creator_mint_vaulted_nft** | ~2,500-4,000* | ~0.003 CEDRA |
| **deposit_to_vault** | ~1,500-2,500* | ~0.002 CEDRA |
| **burn_and_redeem** | ~3,000-5,000* | ~0.004 CEDRA |
| **settle_sale_with_vault_royalty** | ~4,000-6,000* | ~0.005 CEDRA |

*Estimates based on similar operations. Actual costs depend on vault state (# of FA types, balances, etc.)

## Measured Operations

### Module Publish
```
Transaction: 0x10cbf3c19484338437fbbdd143a2aef104bd6949b6b881e8172e42beeb6d813f
Package size: 11,761 bytes
Gas used: 6,136 units
```

### init_collection_config
```
Transaction: 0xb8a22fffb195b6e4089eb4e69c692ee6cf1ff6d3c697fc15bb6f4eed52cff35f
Gas used: 1,089 units
```

## Cost Factors

### Fixed Costs
- Collection creation: ~1,000 gas (one-time)
- SmartTable initialization: ~200 gas

### Variable Costs
- Each new FA type in vault: +500-800 gas (creates new store)
- Each existing FA deposit: +200-400 gas
- Each FA type on redemption: +300-500 gas per type

## Optimization Notes

1. **Batch deposits**: If depositing multiple FA types, do in single transaction if possible
2. **Limit allowed_assets**: Smaller allowlist = faster validation
3. **Mint vault seeding**: More efficient than separate mint + deposit

## Network Info

- **Network**: Cedra Testnet
- **Gas price**: 100 Octas per gas unit
- **1 CEDRA**: 100,000,000 Octas

---

*Last updated: 2025-12-08*
