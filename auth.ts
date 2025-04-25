import { WalletManager } from './wallet';

/**
 * Configuration interface for the wallet authentication
 */
interface WalletConfig {
  secretKey: string;
  endpoint: string;
  minSolBalance: number;
  requiredTokens?: {
    mint: string;
    minBalance: number;
  }[];
}

/**
 * WalletAuthenticator class for handling wallet authentication and validation
 */
export class WalletAuthenticator {
  private walletManager: WalletManager;
  private config: WalletConfig;

  /**
   * Constructor for WalletAuthenticator
   * @param config - The wallet configuration
   */
  constructor(config: WalletConfig) {
    this.config = config;
    
    if (!config.secretKey) {
      throw new Error('Secret key is required for wallet authentication');
    }
    
    try {
      this.walletManager = new WalletManager(config.secretKey, config.endpoint);
    } catch (error) {
      throw new Error(`Failed to initialize wallet manager: ${error.message}`);
    }
  }

  /**
   * Authenticate the wallet by validating the secret key
   * @returns Promise resolving to true if authentication is successful
   */
  public async authenticate(): Promise<boolean> {
    try {
      // Verify that we can get the public key from the secret key
      const publicKey = this.walletManager.getPublicKey();
      
      if (!publicKey) {
        throw new Error('Invalid secret key: Could not derive public key');
      }
      
      // Verify that we can connect to the network with this wallet
      await this.walletManager.getBalance();
      
      return true;
    } catch (error) {
      throw new Error(`Wallet authentication failed: ${error.message}`);
    }
  }

  /**
   * Validate that the wallet has sufficient balances for trading
   * @returns Promise resolving to validation result with details
   */
  public async validateBalances(): Promise<{
    isValid: boolean;
    solBalance: number;
    tokenBalances?: Record<string, number>;
    errors?: string[];
  }> {
    const errors: string[] = [];
    const tokenBalances: Record<string, number> = {};
    
    try {
      // Check SOL balance
      const solBalance = await this.walletManager.getBalance();
      
      if (solBalance < this.config.minSolBalance) {
        errors.push(`Insufficient SOL balance: ${solBalance} SOL (minimum required: ${this.config.minSolBalance} SOL)`);
      }
      
      // Check token balances if required
      if (this.config.requiredTokens && this.config.requiredTokens.length > 0) {
        for (const token of this.config.requiredTokens) {
          const balance = await this.walletManager.getTokenBalance(token.mint);
          tokenBalances[token.mint] = balance;
          
          if (balance < token.minBalance) {
            errors.push(`Insufficient balance for token ${token.mint}: ${balance} (minimum required: ${token.minBalance})`);
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        solBalance,
        tokenBalances,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      throw new Error(`Balance validation failed: ${error.message}`);
    }
  }

  /**
   * Get the wallet manager instance
   * @returns The wallet manager
   */
  public getWalletManager(): WalletManager {
    return this.walletManager;
  }

  /**
   * Get the wallet address
   * @returns The wallet address as a string
   */
  public getWalletAddress(): string {
    return this.walletManager.getWalletAddress();
  }
}
