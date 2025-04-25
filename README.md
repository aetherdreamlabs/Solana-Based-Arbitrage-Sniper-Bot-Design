# Solana Arbitrage Sniper Bot

An automated trading bot that identifies and executes arbitrage opportunities across multiple Solana DEXes.

## Features

- **Fully Automated**: Requires only your Phantom wallet secret key to operate
- **Multi-DEX Support**: Monitors Serum, Raydium, and Orca for price discrepancies
- **Real-time Monitoring**: Continuously scans for profitable trading opportunities
- **Configurable Strategy**: Adjust profit thresholds, trade sizes, and risk parameters
- **Secure Design**: Handles wallet keys securely with proper error handling
- **Production Ready**: Built with reliability and performance in mind

## Architecture

The bot consists of several key modules:

1. **Wallet Connection**: Securely connects to your Phantom wallet
2. **Market Data Collection**: Monitors prices across multiple DEXes
3. **Arbitrage Detection**: Identifies profitable trading opportunities
4. **Transaction Execution**: Executes trades when opportunities arise
5. **Risk Management**: Ensures safe operation with configurable limits

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solana-arbitrage-bot.git
cd solana-arbitrage-bot

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PHANTOM_SECRET_KEY=your_phantom_wallet_secret_key
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
MIN_PROFIT_THRESHOLD=0.5
TRADE_SIZE_USD=1000
```

Alternatively, you can configure the bot directly in the code as shown in the example.ts file.

## Usage

```bash
# Build the project
npm run build

# Start the bot
npm start
```

## Example

```typescript
import { SolanaArbitrageBot } from './index';

// Create and configure the bot
const bot = new SolanaArbitrageBot({
  secretKey: 'YOUR_PHANTOM_WALLET_SECRET_KEY',
  minProfitThreshold: 0.5, // 0.5%
  tradeSizeUsd: 1000, // $1000 per trade
  maxDailyTrades: 100
});

// Initialize and start the bot
async function main() {
  await bot.initialize();
  bot.start();
  
  // The bot will now run automatically until stopped
  console.log('Bot is running. Press Ctrl+C to stop.');
}

main();
```

## Security Considerations

- **Never share your secret key**: The bot requires your wallet's secret key, which should be kept secure
- **Start with small trade sizes**: Begin with smaller amounts until you're comfortable with the bot's performance
- **Use a dedicated wallet**: Consider using a separate wallet with limited funds for the bot
- **Monitor the bot**: Regularly check the bot's performance and adjust settings as needed

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT
