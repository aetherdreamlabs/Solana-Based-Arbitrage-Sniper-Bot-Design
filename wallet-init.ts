import { WalletManager } from './wallet';
import { WalletAuthenticator } from './auth';

/**
 * Example usage of the wallet connection and authentication module
 */

// Configuration for the wallet
const config = {
  secretKey: 'YOUR_PHANTOM_WALLET_SECRET_KEY', // Replace with actual secret key
  endpoint: 'https://api.mainnet-beta.solana.com',
  minSolBalance: 0.1, // Minimum SOL balance required
  requiredTokens: [
    // Example of required tokens for trading
    // { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', minBalance: 10 } // USDC
  ]
};

/**
 * Initialize the wallet connection
 */
async function initializeWallet() {
  try {
    console.log('Initializing wallet connection...');
    
    // Create wallet authenticator
    const authenticator = new WalletAuthenticator(config);
    
    // Authenticate the wallet
    const isAuthenticated = await authenticator.authenticate();
    console.log(`Wallet authentication ${isAuthenticated ? 'successful' : 'failed'}`);
    
    if (isAuthenticated) {
      console.log(`Wallet address: ${authenticator.getWalletAddress()}`);
      
      // Validate balances
      const validation = await authenticator.validateBalances();
      
      if (validation.isValid) {
        console.log(`Wallet has sufficient balances for trading`);
        console.log(`SOL balance: ${validation.solBalance} SOL`);
        
        if (validation.tokenBalances) {
          console.log('Token balances:');
          Object.entries(validation.tokenBalances).forEach(([mint, balance]) => {
            console.log(`  ${mint}: ${balance}`);
          });
        }
        
        // Get wallet manager for transaction operations
        const walletManager = authenticator.getWalletManager();
        
        // Ready to use the wallet for arbitrage operations
        return walletManager;
      } else {
        console.error('Insufficient balances for trading:');
        validation.errors?.forEach(error => console.error(`  - ${error}`));
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Wallet initialization failed: ${error.message}`);
    return null;
  }
}

// Export the initialization function
export { initializeWallet };
