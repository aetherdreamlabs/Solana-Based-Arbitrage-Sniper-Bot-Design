import { SolanaArbitrageBot, SolanaArbitrageConfig } from './index';

/**
 * Example usage of the Solana Arbitrage Bot
 * This file demonstrates how to configure and run the bot
 */

// Configuration for the bot
const config: SolanaArbitrageConfig = {
  // Connection settings
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  
  // Wallet settings
  secretKey: 'YOUR_PHANTOM_WALLET_SECRET_KEY', // Replace with your actual secret key
  
  // Market settings
  dexes: ['Serum', 'Raydium', 'Orca'],
  pairs: ['SOL/USDC', 'BTC/USDC', 'ETH/USDC'],
  pollingIntervalMs: 5000,
  
  // Arbitrage settings
  minProfitThreshold: 0.5, // 0.5%
  maxSlippage: 0.3, // 0.3%
  tradeSizeUsd: 1000, // $1000 per trade
  maxConcurrentTrades: 1,
  cooldownMs: 2000,
  
  // Transaction settings
  maxRetries: 3,
  confirmationLevel: 'confirmed',
  priorityFeeMultiplier: 1.5,
  
  // Advanced settings
  logLevel: 'info',
  simulateTransactions: true, // Set to false for real trading
  maxDailyTrades: 100
};

/**
 * Main function to run the bot
 */
async function main() {
  try {
    console.log('Starting Solana Arbitrage Sniper Bot...');
    
    // Create bot instance
    const bot = new SolanaArbitrageBot(config);
    
    // Initialize bot
    const initialized = await bot.initialize();
    
    if (!initialized) {
      console.error('Failed to initialize bot');
      return;
    }
    
    // Start bot
    const started = bot.start();
    
    if (!started) {
      console.error('Failed to start bot');
      return;
    }
    
    console.log('Bot is running. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Stopping bot...');
      bot.stop();
      process.exit(0);
    });
    
    // Periodically log status
    setInterval(() => {
      const status = bot.getStatus();
      console.log('Bot status:', JSON.stringify(status, null, 2));
    }, 60000); // Log status every minute
    
  } catch (error) {
    console.error('Error running bot:', error.message);
  }
}

// Run the bot
main();
