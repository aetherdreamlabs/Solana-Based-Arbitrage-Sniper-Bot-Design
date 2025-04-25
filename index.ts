import { WalletConnection, WalletConnectionConfig } from './wallet-connection';

/**
 * Main entry point for the wallet module
 * This file provides a simple interface for connecting to a Phantom wallet
 * and using it for arbitrage operations
 */

/**
 * Connect to a Phantom wallet using the provided secret key
 * @param secretKey - The secret key from the Phantom wallet
 * @param endpoint - Optional Solana RPC endpoint
 * @returns Promise resolving to the wallet connection
 */
export async function connectPhantomWallet(
  secretKey: string,
  endpoint: string = 'https://api.mainnet-beta.solana.com'
): Promise<{
  success: boolean;
  walletConnection?: WalletConnection;
  walletAddress?: string;
  error?: string;
}> {
  try {
    // Create wallet connection configuration
    const config: WalletConnectionConfig = {
      secretKey,
      endpoint,
      confirmationLevel: 'confirmed',
      autoReconnect: true,
      maxRetries: 3
    };
    
    // Create and connect wallet
    const walletConnection = new WalletConnection(config);
    const connectionResult = await walletConnection.connect();
    
    if (!connectionResult.success) {
      return {
        success: false,
        error: connectionResult.error
      };
    }
    
    const walletAddress = walletConnection.getWalletAddress();
    
    if (!walletAddress) {
      return {
        success: false,
        error: 'Failed to get wallet address after connection'
      };
    }
    
    return {
      success: true,
      walletConnection,
      walletAddress
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error connecting to wallet: ${error.message}`
    };
  }
}

// Export all wallet-related classes and utilities
export * from './wallet';
export * from './auth';
export * from './wallet-utils';
export * from './wallet-connection';
