# CVN-1 Use Cases

> Real-world applications for NFTs with embedded on-chain treasuries

---

## 1. 🎮 In-Game Rewards & Items

**Concept:** Game items that accumulate value through gameplay.

### How It Works
- Players earn NFT swords, armor, or characters
- Rewards from quests/battles deposited to the NFT's core vault
- Rare drops go to the rewards vault (claimable without selling)
- Trading the item transfers all accumulated value

### Example Flow
```
Player earns "Dragon Slayer Sword" NFT
  ↓
Defeats bosses → 500 GOLD deposited to core vault
  ↓
Daily login bonus → 10 GEMS to rewards vault
  ↓
Player claims GEMS (keeps sword)
  ↓
Later: Burns sword → receives 500 GOLD + remaining rewards
```

### Benefits
- Items have real, growing value
- Players can extract rewards without losing progress
- Secondary market prices reflect embedded assets

---

## 2. 💰 DeFi Yield-Bearing NFTs

**Concept:** NFTs that generate and store yield from DeFi protocols.

### How It Works
- NFT represents a staking position or LP share
- Yield automatically routed to the NFT's rewards vault
- Principal protected in core vault
- Holder claims yield anytime, burns to exit position

### Example Flow
```
Mint "Yield Vault NFT" with 1000 USDC (→ core vault)
  ↓
Protocol stakes USDC in lending pool
  ↓
Weekly: Interest deposited to rewards vault
  ↓
Holder claims 5 USDC interest
  ↓
12 months later: Burns NFT → 1000 USDC + accumulated yield
```

### Benefits
- Transferable DeFi positions
- Clear separation of principal vs earnings
- NFT price discovery includes yield history

---

## 3. 🌐 Social Graph Rewards

**Concept:** Reward loyal followers/community members with value-accruing NFTs.

### How It Works
- Creators issue membership NFTs to top supporters
- Revenue share deposited to holder vaults
- Engagement rewards accumulate over time
- Long-term holders benefit most

### Example Flow
```
Creator launches "Founding Member" NFT (100 minted)
  ↓
Creator earns 10,000 CEDRA from content
  ↓
5% (500 CEDRA) split across 100 NFT vaults
  ↓
Each NFT receives 5 CEDRA to rewards vault
  ↓
Engaged members claim monthly; holders amass value
```

### Benefits
- Quantifiable community loyalty
- Passive income for supporters
- Transferable membership with value history

---

## 4. 🏛️ DAO Governance Tokens

**Concept:** Voting NFTs that accumulate treasury distributions.

### How It Works
- DAO issues governance NFTs instead of fungible tokens
- Treasury profits distributed to NFT core vaults
- Voting power tied to NFT holding period
- Exit = burn NFT to claim share

### Example Flow
```
DAO mints 1000 Governance NFTs
  ↓
Protocol generates 100,000 CEDRA profit
  ↓
100 CEDRA deposited to each NFT's core vault
  ↓
Member votes on proposals (1 NFT = 1 vote)
  ↓
After 2 years: Burns NFT → claims 2,400 CEDRA accumulated
```

### Benefits
- Non-dilutive governance
- Transparent value distribution
- Natural Sybil resistance

---

## 5. 🎨 1/1 Art with Baked-In Value

**Concept:** Fine art NFTs where each trade adds tangible value to the piece.

### How It Works
- Artist mints 1/1 artwork with CVN-1
- On each sale: artist receives royalties (to wallet) + portion deposited to NFT vault
- Current owner can claim vault contents or hold for appreciation
- Art becomes more valuable as trading history grows

### Example Flow
```
Artist mints "Masterpiece #1" (1/1 NFT)
  ↓
Primary sale: 1000 CEDRA to artist
  ↓
Collector A sells to B for 2000 CEDRA
  → 5% royalty (100 CEDRA) → Artist wallet
  → 2% vault (40 CEDRA) → NFT vault (owner B benefits)
  ↓
B sells to C for 3000 CEDRA
  → 5% royalty (150 CEDRA) → Artist wallet  
  → 2% vault (60 CEDRA) → NFT vault (now 100 CEDRA total)
  ↓
C owns art + 100 CEDRA embedded value
```

### Benefits
- Artist earns ongoing royalties (standard)
- Art has real, growing embedded value (CVN-1 unique)
- Collectors own both art AND treasury
- Trading history = provable value accumulation

---

## Summary

| Use Case | Core Vault | Rewards Vault | Primary Benefit |
|----------|------------|---------------|-----------------|
| Gaming | Loot/prizes | Daily bonuses | Value-accruing items |
| DeFi | Principal | Yield | Transferable positions |
| Social | Revenue share | Engagement rewards | Quantified loyalty |
| DAO | Treasury claims | Dividends | Non-dilutive governance |
| 1/1 Art | Trade deposits | Appreciation | Value grows with trading history |

---

*CVN-1: Where every NFT is also a treasury.*
