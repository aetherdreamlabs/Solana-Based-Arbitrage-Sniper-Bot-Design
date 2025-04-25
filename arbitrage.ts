import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair
} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionExecutor } from './executor';
import { SwapExecutor, SwapInstructionParams, SwapResult } from './swap';
import { ExecutableArbitrageOpportunity } from '../arbitrage';
import { WalletManager } from '../wallet';

/**
 * Interface for arbitrage transaction parameters
 */
export interface ArbitrageTransactionParams {
  opportunity: ExecutableArbitrageOpportunity;
  sourcePoolAddress: PublicKey;
  targetPoolAddress: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  userTokenAAccount: PublicKey;
  userTokenBAccount: PublicKey;
  slippageTolerance: number;
}

/**
 * Interface for arbitrage transaction result
 */
export interface ArbitrageTransactionResult {
  success: boolean;
  opportunity: ExecutableArbitrageOpportunity;
  sourceSwap?: SwapResult;
  targetSwap?: SwapResult;
  profit?: number;
  profitPercentage?: number;
  error?: string;
  executionTime?: number;
}

/**
 * ArbitrageExecutor class
 * This class handles the creation and execution of arbitrage transactions
 */
export class ArbitrageExecutor {
  private connection: Connection;
  private walletManager: WalletManager;
  private transactionExecutor: TransactionExecutor;
  private swapExecutor: SwapExecutor;
  
  /**
   * Constructor for ArbitrageExecutor
   * @param connection - Solana connection
   * @param walletManager - Wallet manager
   */
  constructor(
    connection: Connection,
    walletManager: WalletManager
  ) {
    this.connection = connection;
    this.walletManager = walletManager;
    
    // Create transaction executor
    this.transactionExecutor = new TransactionExecutor(
      connection,
      walletManager,
      {
        maxRetries: 3,
        confirmationLevel: 'confirmed',
        priorityFeeMultiplier: 1.5,
        timeoutMs: 30000,
        simulateBeforeSubmit: true
      }
    );
    
    // Create swap executor
    this.swapExecutor = new SwapExecutor(
      connection,
      this.transactionExecutor
    );
  }
  
  /**
   * Execute an arbitrage opportunity
   * @param params - Arbitrage transaction parameters
   * @returns Promise resolving to arbitrage transaction result
   */
  public async executeArbitrage(params: ArbitrageTransactionParams): Promise<ArbitrageTransactionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing arbitrage opportunity: ${params.opportunity.id}`);
      console.log(`  Source DEX: ${params.opportunity.sourceDex}, Target DEX: ${params.opportunity.targetDex}`);
      console.log(`  Pair: ${params.opportunity.pair}, Direction: ${params.opportunity.direction}`);
      console.log(`  Expected profit: ${params.opportunity.profitPercentage.toFixed(2)}%, $${params.opportunity.estimatedProfit.toFixed(2)}`);
      
      // Determine token flow based on direction
      let sourceInputToken: PublicKey;
      let sourceOutputToken: PublicKey;
      let sourceInputAccount: PublicKey;
      let sourceOutputAccount: PublicKey;
      let targetInputToken: PublicKey;
      let targetOutputToken: PublicKey;
      let targetInputAccount: PublicKey;
      let targetOutputAccount: PublicKey;
      let inputAmount: number;
      
      if (params.opportunity.direction === 'buy') {
        // Buy on source, sell on target
        sourceInputToken = params.tokenBMint; // USDC or quote token
        sourceOutputToken = params.tokenAMint; // Base token
        sourceInputAccount = params.userTokenBAccount;
        sourceOutputAccount = params.userTokenAAccount;
        
        targetInputToken = params.tokenAMint; // Base token
        targetOutputToken = params.tokenBMint; // USDC or quote token
        targetInputAccount = params.userTokenAAccount;
        targetOutputAccount = params.userTokenBAccount;
        
        // Use the trade size from the opportunity
        inputAmount = params.opportunity.tradeSize * params.opportunity.sourcePrice;
      } else {
        // Sell on source, buy on target
        sourceInputToken = params.tokenAMint; // Base token
        sourceOutputToken = params.tokenBMint; // USDC or quote token
        sourceInputAccount = params.userTokenAAccount;
        sourceOutputAccount = params.userTokenBAccount;
        
        targetInputToken = params.tokenBMint; // USDC or quote token
        targetOutputToken = params.tokenAMint; // Base token
        targetInputAccount = params.userTokenBAccount;
        targetOutputAccount = params.userTokenAAccount;
        
        // Use the trade size from the opportunity
        inputAmount = params.opportunity.tradeSize;
      }
      
      // Calculate minimum output amount for source swap with slippage
      const expectedSourceOutput = inputAmount / params.opportunity.sourcePrice;
      const minSourceOutput = expectedSourceOutput * (1 - params.slippageTolerance);
      
      // Execute source swap
      const sourceSwapParams: SwapInstructionParams = {
        sourceDex: params.opportunity.sourceDex,
        sourcePool: params.sourcePoolAddress,
        inputToken: sourceInputToken,
        outputToken: sourceOutputToken,
        inputAmount,
        minOutputAmount: minSourceOutput,
        userSourceTokenAccount: sourceInputAccount,
        userDestinationTokenAccount: sourceOutputAccount
      };
      
      const sourceSwapResult = await this.swapExecutor.executeSwap(sourceSwapParams);
      
      if (!sourceSwapResult.success || !sourceSwapResult.outputAmount) {
        return {
          success: false,
          opportunity: params.opportunity,
          sourceSwap: sourceSwapResult,
          error: sourceSwapResult.error || 'Source swap failed without specific error',
          executionTime: Date.now() - startTime
        };
      }
      
      // Calculate minimum output amount for target swap with slippage
      const expectedTargetOutput = sourceSwapResult.outputAmount * params.opportunity.targetPrice;
      const minTargetOutput = expectedTargetOutput * (1 - params.slippageTolerance);
      
      // Execute target swap
      const targetSwapParams: SwapInstructionParams = {
        sourceDex: params.opportunity.targetDex,
        sourcePool: params.targetPoolAddress,
        inputToken: targetInputToken,
        outputToken: targetOutputToken,
        inputAmount: sourceSwapResult.outputAmount,
        minOutputAmount: minTargetOutput,
        userSourceTokenAccount: targetInputAccount,
        userDestinationTokenAccount: targetOutputAccount
      };
      
      const targetSwapResult = await this.swapExecutor.executeSwap(targetSwapParams);
      
      if (!targetSwapResult.success || !targetSwapResult.outputAmount) {
        return {
          success: false,
          opportunity: params.opportunity,
          sourceSwap: sourceSwapResult,
          targetSwap: targetSwapResult,
          error: targetSwapResult.error || 'Target swap failed without specific error',
          executionTime: Date.now() - startTime
        };
      }
      
      // Calculate actual profit
      const profit = targetSwapResult.outputAmount - inputAmount;
      const profitPercentage = (profit / inputAmount) * 100;
      
      console.log(`Arbitrage execution completed: ${params.opportunity.id}`);
      console.log(`  Source swap: ${sourceSwapResult.inputAmount} → ${sourceSwapResult.outputAmount}`);
      console.log(`  Target swap: ${targetSwapResult.inputAmount} → ${targetSwapResult.outputAmount}`);
      console.log(`  Actual profit: ${profitPercentage.toFixed(2)}%, $${profit.toFixed(2)}`);
      
      return {
        success: true,
        opportunity: params.opportunity,
        sourceSwap: sourceSwapResult,
        targetSwap: targetSwapResult,
        profit,
        profitPercentage,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        opportunity: params.opportunity,
        error: `Arbitrage execution failed: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Get the transaction executor
   */
  public getTransactionExecutor(): TransactionExecutor {
    return this.transactionExecutor;
  }
  
  /**
   * Get the swap executor
   */
  public getSwapExecutor(): SwapExecutor {
    return this.swapExecutor;
  }
}
