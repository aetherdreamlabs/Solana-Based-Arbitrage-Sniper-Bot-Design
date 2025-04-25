import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { WalletManager } from '../wallet';
import { ExecutableArbitrageOpportunity } from '../arbitrage';

/**
 * Interface for transaction executor configuration
 */
export interface TransactionExecutorConfig {
  maxRetries: number;
  confirmationLevel: 'processed' | 'confirmed' | 'finalized';
  priorityFeeMultiplier: number;
  timeoutMs: number;
  simulateBeforeSubmit: boolean;
}

/**
 * Interface for transaction result
 */
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  confirmationTime?: number;
  blockHeight?: number;
  fee?: number;
}

/**
 * TransactionExecutor class
 * This class handles the creation and execution of Solana transactions
 */
export class TransactionExecutor {
  private connection: Connection;
  private walletManager: WalletManager;
  private config: TransactionExecutorConfig;
  
  /**
   * Constructor for TransactionExecutor
   * @param connection - Solana connection
   * @param walletManager - Wallet manager
   * @param config - Transaction executor configuration
   */
  constructor(
    connection: Connection,
    walletManager: WalletManager,
    config: Partial<TransactionExecutorConfig> = {}
  ) {
    this.connection = connection;
    this.walletManager = walletManager;
    
    // Set default configuration values
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      confirmationLevel: config.confirmationLevel ?? 'confirmed',
      priorityFeeMultiplier: config.priorityFeeMultiplier ?? 1.5,
      timeoutMs: config.timeoutMs ?? 30000,
      simulateBeforeSubmit: config.simulateBeforeSubmit ?? true
    };
  }
  
  /**
   * Execute a transaction
   * @param transaction - Transaction to execute
   * @returns Promise resolving to transaction result
   */
  public async executeTransaction(transaction: Transaction): Promise<TransactionResult> {
    let retries = 0;
    
    while (retries <= this.config.maxRetries) {
      try {
        // Add recent blockhash
        transaction.recentBlockhash = (
          await this.connection.getLatestBlockhash(this.config.confirmationLevel)
        ).blockhash;
        
        // Set fee payer
        transaction.feePayer = this.walletManager.getPublicKey();
        
        // Simulate transaction if configured
        if (this.config.simulateBeforeSubmit) {
          const simulation = await this.connection.simulateTransaction(transaction);
          
          if (simulation.value.err) {
            throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
          }
        }
        
        // Sign and send transaction
        const startTime = Date.now();
        const signature = await this.walletManager.signAndSendTransaction(transaction);
        
        // Wait for confirmation
        const confirmation = await this.connection.confirmTransaction(
          signature,
          this.config.confirmationLevel
        );
        
        if (confirmation.value.err) {
          throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        const endTime = Date.now();
        
        // Get transaction details
        const txDetails = await this.connection.getTransaction(signature, {
          commitment: this.config.confirmationLevel
        });
        
        return {
          success: true,
          signature,
          confirmationTime: endTime - startTime,
          blockHeight: txDetails?.slot,
          fee: txDetails?.meta?.fee ? txDetails.meta.fee / LAMPORTS_PER_SOL : undefined
        };
      } catch (error) {
        retries++;
        
        if (retries > this.config.maxRetries) {
          return {
            success: false,
            error: `Transaction failed after ${retries} attempts: ${error.message}`
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    
    // This should never happen due to the return in the catch block
    return {
      success: false,
      error: 'Transaction failed for unknown reason'
    };
  }
  
  /**
   * Update configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<TransactionExecutorConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): TransactionExecutorConfig {
    return { ...this.config };
  }
}
