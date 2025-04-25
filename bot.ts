import { SolanaArbitrageBot, SolanaArbitrageConfig } from './index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const config: SolanaArbitrageConfig = {
  // Connection settings
  rpcEndpoint: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  
  // Wallet settings
  secretKey: process.env.PHANTOM_SECRET_KEY || '', // Must be provided
  
  // Market settings
  dexes: (process.env.DEXES || 'Serum,Raydium,Orca').split(','),
  pairs: (process.env.PAIRS || 'SOL/USDC,BTC/USDC,ETH/USDC').split(','),
  pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '5000'),
  
  // Arbitrage settings
  minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.3'),
  tradeSizeUsd: parseFloat(process.env.TRADE_SIZE_USD || '1000'),
  maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES || '1'),
  cooldownMs: parseInt(process.env.COOLDOWN_MS || '2000'),
  
  // Transaction settings
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  confirmationLevel: (process.env.CONFIRMATION_LEVEL || 'confirmed') as 'processed' | 'confirmed' | 'finalized',
  priorityFeeMultiplier: parseFloat(process.env.PRIORITY_FEE_MULTIPLIER || '1.5'),
  
  // Advanced settings
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  simulateTransactions: process.env.SIMULATE_TRANSACTIONS !== 'false',
  maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES || '100')
};

/**
 * Main function to run the bot
 */
async function main() {
  try {
    // Validate required configuration
    if (!config.secretKey) {
      console.error('Error: PHANTOM_SECRET_KEY environment variable is required');
      process.exit(1);
    }
    
    console.log('Starting Solana Arbitrage Sniper Bot...');
    console.log(`Configuration:
- RPC Endpoint: ${config.rpcEndpoint}
- DEXes: ${config.dexes.join(', ')}
- Pairs: ${config.pairs.join(', ')}
- Min Profit Threshold: ${config.minProfitThreshold}%
- Trade Size: $${config.tradeSizeUsd}
- Max Daily Trades: ${config.maxDailyTrades}
- Simulate Transactions: ${config.simulateTransactions ? 'Yes' : 'No'}
`);
    
    // Create bot instance
    const bot = new SolanaArbitrageBot(config);
    
    // Initialize bot
    console.log('Initializing bot...');
    const initialized = await bot.initialize();
    
    if (!initialized) {
      console.error('Failed to initialize bot');
      process.exit(1);
    }
    
    // Start bot
    console.log('Starting bot...');
    const started = bot.start();
    
    if (!started) {
      console.error('Failed to start bot');
      process.exit(1);
    }
    
    console.log('Bot is running. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Stopping bot...');
      bot.stop();
      console.log('Bot stopped. Exiting...');
      process.exit(0);
    });
    
    // Periodically log status
    setInterval(() => {
      const status = bot.getStatus();
      const arbitrageStatus = status.arbitrageStatus || {};
      
      console.log(`
Bot Status:
- Running: ${status.isRunning ? 'Yes' : 'No'}
- Wallet Connected: ${status.walletConnected ? 'Yes' : 'No'}
- Wallet Address: ${status.walletAddress || 'N/A'}
- Opportunities Found: ${arbitrageStatus.opportunities || 0}
- Completed Trades: ${arbitrageStatus.completedTrades || 0}
- Failed Trades: ${arbitrageStatus.failedTrades || 0}
- Daily Trade Count: ${arbitrageStatus.dailyTradeCount || 0}/${arbitrageStatus.maxDailyTrades || 0}
`);
    }, 60000); // Log status every minute
    
  } catch (error) {
    console.error('Error running bot:', error.message);
    process.exit(1);
  }
}

// Run the bot
main();
