import { WalletManager } from './wallet';
import { isValidSecretKeyFormat, testNetworkConnection, parseSecretKey } from './wallet-utils';

/**
 * Main configuration interface for the wallet connection
 */
export interface WalletConnectionConfig {
  secretKey: string;
  endpoint?: string;
  confirmationLevel?: 'processed' | 'confirmed' | 'finalized';
  autoReconnect?: boolean;
  maxRetries?: number;
}

/**
 * WalletConnection class that provides a simplified interface for connecting to a Phantom wallet
 * and handling common wallet operations for the arbitrage bot
 */
export class WalletConnection {
  private walletManager: WalletManager | null = null;
  private config: WalletConnectionConfig;
  private connected: boolean = false;
  private connectionError: string | null = null;

  /**
   * Constructor for WalletConnection
   * @param config - The wallet connection configuration
   */
  constructor(config: WalletConnectionConfig) {
    this.config = {
      endpoint: 'https://api.mainnet-beta.solana.com',
      confirmationLevel: 'confirmed',
      autoReconnect: true,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Connect to the wallet using the provided secret key
   * @returns Promise resolving to connection status
   */
  public async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the secret key format
      if (!isValidSecretKeyFormat(this.config.secretKey)) {
        // Try to parse the key from various formats
        const parsedKey = parseSecretKey(this.config.secretKey);
        if (!parsedKey) {
          this.connectionError = 'Invalid secret key format';
          return { success: false, error: this.connectionError };
        }
        this.config.secretKey = parsedKey;
      }

      // Test network connection first
      const networkTest = await testNetworkConnection(this.config.endpoint);
      if (!networkTest.success) {
        this.connectionError = `Failed to connect to Solana network: ${networkTest.error}`;
        return { success: false, error: this.connectionError };
      }

      // Initialize wallet manager
      this.walletManager = new WalletManager(this.config.secretKey, this.config.endpoint);
      
      // Verify connection by getting the balance
      await this.walletManager.getBalance();
      
      this.connected = true;
      this.connectionError = null;
      
      return { success: true };
    } catch (error) {
      this.connected = false;
      this.connectionError = `Wallet connection failed: ${error.message}`;
      return { success: false, error: this.connectionError };
    }
  }

  /**
   * Check if the wallet is connected
   * @returns Boolean indicating connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the wallet manager instance
   * @returns The wallet manager or null if not connected
   */
  public getWalletManager(): WalletManager | null {
    return this.walletManager;
  }

  /**
   * Get the wallet address
   * @returns The wallet address as a string or null if not connected
   */
  public getWalletAddress(): string | null {
    if (!this.connected || !this.walletManager) {
      return null;
    }
    return this.walletManager.getWalletAddress();
  }

  /**
   * Get the connection error if any
   * @returns The connection error message or null if no error
   */
  public getConnectionError(): string | null {
    return this.connectionError;
  }

  /**
   * Disconnect the wallet
   */
  public disconnect(): void {
    this.walletManager = null;
    this.connected = false;
  }

  /**
   * Get the SOL balance of the wallet
   * @returns Promise resolving to the balance in SOL or null if not connected
   */
  public async getBalance(): Promise<number | null> {
    if (!this.connected || !this.walletManager) {
      return null;
    }
    
    try {
      return await this.walletManager.getBalance();
    } catch (error) {
      console.error(`Failed to get wallet balance: ${error.message}`);
      return null;
    }
  }
}
