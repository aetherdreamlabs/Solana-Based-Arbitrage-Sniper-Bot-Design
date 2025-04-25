# Solana Arbitrage Bot Research Notes

## Solana Blockchain Architecture

### Consensus Mechanism
- Hybrid approach: Proof-of-History (PoH) & Proof-of-Stake (PoS)
- PoH: Cryptographic clock to verify time of each transaction
- Tower BFT: Uses synchronized clock allowed by PoH to reach consensus
- Transaction speeds exceeding 50,000 per second

### Scalability Features
- Sea level: Off-chain protocol for simple payments and low-value transactions
- Turbine: Block propagation protocol for transmitting blocks between validators
- Cloudbreak: Horizontal scaling by partitioning the network
- Gulf Stream: Pushes transactions to the edge of the network
- Pipeline Architecture: Processes transactions in parallel

### Transaction Processing
- Parallel transaction execution in a single shard
- Ahead of Time transactions: Validators can start executing transactions before being coded into a block
- Clean State Design: Eliminates need for storing historical data on every node

## Solana DEX Ecosystem

### Major DEXes

#### Raydium
- Automated Market Maker (AMM) and liquidity provider
- Integrates with OpenBook central limit order book
- Supports wide range of trading pairs including permissionless pools
- Features yield farming opportunities
- Offers limit order functionality
- Variable swap fees depending on pool type

#### Orca
- AMM DEX focusing on simplicity and ease of use
- Features concentrated liquidity 'Whirlpools'
- Multiple fee tiers (0.01%, 0.05%, 0.30%, 1.00%)
- User-friendly interface

#### Other DEXes
- Serum: Central order book
- Aldrin: DEX with advanced trading features
- Saber: Stablecoin exchange
- Mercurial: Stablecoin-focused DEX
- Jupiter: Dominant swap aggregator

### Arbitrage Opportunities
- Price discrepancies between different DEXes
- Liquidity differences across pools
- Opportunity for triangular arbitrage (A -> B -> C -> A)
- Potential for cross-DEX arbitrage (same token pair on different DEXes)

## Arbitrage Bot Architecture

### Components
- Off-chain arbitrage bot code
- On-chain swap program
- DEX pool metadata
- Wallet connection and authentication

### Strategies
- Brute-force approach to find arbitrage opportunities
- Multiple decreasing swap amounts (N, N/2, N/4, ...)
- Monitoring price fluctuations across DEXes
- Real-time data updates and analysis

### Technical Considerations
- Need for on-chain swap program to handle unexpected token amounts
- Swap quotes verification (quoted swap amount = actual swap amount)
- Reverse engineering DEX interfaces
- Transaction speed optimization

## Wallet Integration

### Phantom Wallet
- Stores secret key for transaction signing
- Private key needed for authentication
- Base-58 encoded private key format
- Can be integrated with web3.js library

### Security Considerations
- Private key should never be exposed
- Secure storage and handling of keys
- Transaction signing should happen locally
