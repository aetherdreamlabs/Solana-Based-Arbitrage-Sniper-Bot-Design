import { Connection } from '@solana/web3.js';
import { WalletConnection } from '../wallet-connection';
import { MarketMonitor, ArbitrageOpportunity } from '../market';

/**
 * Interface for arbitrage detector configuration
 */
export interface ArbitrageDetectorConfig {
  minProfitThreshold: number;
  maxSlippage: number;
  tradeSizeUsd: number;
  maxConcurrentTrades: number;
  cooldownMs: number;
  gasMultiplier: number;
}

/**
 * Interface for detected arbitrage opportunity with execution details
 */
export interface ExecutableArbitrageOpportunity extends ArbitrageOpportunity {
  id: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  executionTimestamp?: number;
  executionTxId?: string;
  actualProfit?: number;
  error?: string;
}

/**
 * ArbitrageDetector class
 * This class detects and manages arbitrage opportunities
 */
export class ArbitrageDetector {
  private connection: Connection;
  private walletConnection: WalletConnection;
  private marketMonitor: MarketMonitor;
  private config: ArbitrageDetectorConfig;
  private isRunning: boolean = false;
  private detectedOpportunities: Map<string, ExecutableArbitrageOpportunity> = new Map();
  private opportunityCallbacks: ((opportunity: ExecutableArbitrageOpportunity) => void)[] = [];
  private lastExecutionTime: number = 0;
  private activeExecutions: number = 0;
  
  /**
   * Constructor for ArbitrageDetector
   * @param connection - Solana connection
   * @param walletConnection - Wallet connection
   * @param marketMonitor - Market monitor
   * @param config - Arbitrage detector configuration
   */
  constructor(
    connection: Connection,
    walletConnection: WalletConnection,
    marketMonitor: MarketMonitor,
    config: Partial<ArbitrageDetectorConfig> = {}
  ) {
    this.connection = connection;
    this.walletConnection = walletConnection;
    this.marketMonitor = marketMonitor;
    
    // Set default configuration values
    this.config = {
      minProfitThreshold: config.minProfitThreshold || 0.5,
      maxSlippage: config.maxSlippage || 0.3,
      tradeSizeUsd: config.tradeSizeUsd || 1000,
      maxConcurrentTrades: config.maxConcurrentTrades || 1,
      cooldownMs: config.cooldownMs || 2000,
      gasMultiplier: config.gasMultiplier || 1.5
    };
    
    // Update market analyzer with our configuration
    this.marketMonitor.setMinProfitThreshold(this.config.minProfitThreshold);
    this.marketMonitor.setMaxSlippage(this.config.maxSlippage);
    this.marketMonitor.setTradeSize(this.config.tradeSizeUsd);
    
    // Register for opportunity updates
    this.marketMonitor.onOpportunity(this.handleOpportunities.bind(this));
  }
  
  /**
   * Start the arbitrage detector
   */
  public start(): boolean {
    if (this.isRunning) {
      console.warn('Arbitrage detector is already running');
      return true;
    }
    
    console.log('Starting arbitrage detector...');
    this.isRunning = true;
    
    // Start the market monitor if it's not already running
    this.marketMonitor.start();
    
    return true;
  }
  
  /**
   * Stop the arbitrage detector
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    console.log('Stopping arbitrage detector...');
    this.isRunning = false;
    
    // We don't stop the market monitor here as it might be used by other components
  }
  
  /**
   * Handle new arbitrage opportunities
   * @param opportunities - Array of arbitrage opportunities
   */
  private handleOpportunities(opportunities: ArbitrageOpportunity[]): void {
    if (!this.isRunning) {
      return;
    }
    
    // Process each opportunity
    for (const opportunity of opportunities) {
      // Generate a unique ID for this opportunity
      const id = this.generateOpportunityId(opportunity);
      
      // Check if we've already seen this opportunity
      if (this.detectedOpportunities.has(id)) {
        continue;
      }
      
      // Create executable opportunity
      const executableOpportunity: ExecutableArbitrageOpportunity = {
        ...opportunity,
        id,
        status: 'pending'
      };
      
      // Store the opportunity
      this.detectedOpportunities.set(id, executableOpportunity);
      
      // Notify callbacks
      this.notifyOpportunityCallbacks(executableOpportunity);
      
      // Check if we should execute this opportunity
      this.evaluateForExecution(executableOpportunity);
    }
    
    // Clean up old opportunities
    this.cleanupOldOpportunities();
  }
  
  /**
   * Generate a unique ID for an arbitrage opportunity
   * @param opportunity - Arbitrage opportunity
   * @returns Unique ID
   */
  private generateOpportunityId(opportunity: ArbitrageOpportunity): string {
    return `${opportunity.sourceDex}-${opportunity.targetDex}-${opportunity.pair}-${opportunity.direction}-${opportunity.timestamp}`;
  }
  
  /**
   * Evaluate an opportunity for execution
   * @param opportunity - Executable arbitrage opportunity
   */
  private evaluateForExecution(opportunity: ExecutableArbitrageOpportunity): void {
    // Check if we're running
    if (!this.isRunning) {
      return;
    }
    
    // Check if we're already at max concurrent trades
    if (this.activeExecutions >= this.config.maxConcurrentTrades) {
      return;
    }
    
    // Check if we're in cooldown period
    const now = Date.now();
    if (now - this.lastExecutionTime < this.config.cooldownMs) {
      return;
    }
    
    // Check if the opportunity is still profitable
    if (opportunity.profitPercentage < this.config.minProfitThreshold) {
      return;
    }
    
    // Execute the opportunity
    this.executeOpportunity(opportunity);
  }
  
  /**
   * Execute an arbitrage opportunity
   * @param opportunity - Executable arbitrage opportunity
   */
  private async executeOpportunity(opportunity: ExecutableArbitrageOpportunity): Promise<void> {
    // Update opportunity status
    opportunity.status = 'executing';
    opportunity.executionTimestamp = Date.now();
    this.lastExecutionTime = opportunity.executionTimestamp;
    this.activeExecutions++;
    
    // Notify callbacks
    this.notifyOpportunityCallbacks(opportunity);
    
    try {
      console.log(`Executing arbitrage opportunity: ${opportunity.id}`);
      console.log(`  Source: ${opportunity.sourceDex}, Target: ${opportunity.targetDex}`);
      console.log(`  Pair: ${opportunity.pair}, Direction: ${opportunity.direction}`);
      console.log(`  Profit: ${opportunity.profitPercentage.toFixed(2)}%, Estimated: $${opportunity.estimatedProfit.toFixed(2)}`);
      
      // In a real implementation, this would execute the actual trades
      // For now, we'll just simulate execution
      
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful execution
      opportunity.status = 'completed';
      opportunity.executionTxId = `simulated-tx-${Date.now()}`;
      opportunity.actualProfit = opportunity.estimatedProfit * (0.9 + Math.random() * 0.2); // 90-110% of estimated
      
      console.log(`Arbitrage execution completed: ${opportunity.id}`);
      console.log(`  Transaction: ${opportunity.executionTxId}`);
      console.log(`  Actual profit: $${opportunity.actualProfit.toFixed(2)}`);
    } catch (error) {
      // Handle execution error
      opportunity.status = 'failed';
      opportunity.error = error.message;
      
      console.error(`Arbitrage execution failed: ${opportunity.id}`);
      console.error(`  Error: ${opportunity.error}`);
    } finally {
      this.activeExecutions--;
      
      // Notify callbacks
      this.notifyOpportunityCallbacks(opportunity);
    }
  }
  
  /**
   * Clean up old opportunities
   */
  private cleanupOldOpportunities(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, opportunity] of this.detectedOpportunities.entries()) {
      if (now - opportunity.timestamp > maxAge) {
        this.detectedOpportunities.delete(id);
      }
    }
  }
  
  /**
   * Register a callback for new arbitrage opportunities
   * @param callback - Function to call when a new opportunity is detected or updated
   */
  public onOpportunity(callback: (opportunity: ExecutableArbitrageOpportunity) => void): void {
    this.opportunityCallbacks.push(callback);
  }
  
  /**
   * Notify all registered callbacks about a new or updated opportunity
   * @param opportunity - Executable arbitrage opportunity
   */
  private notifyOpportunityCallbacks(opportunity: ExecutableArbitrageOpportunity): void {
    for (const callback of this.opportunityCallbacks) {
      try {
        callback(opportunity);
      } catch (error) {
        console.error(`Error in opportunity callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Get all detected opportunities
   */
  public getOpportunities(): ExecutableArbitrageOpportunity[] {
    return Array.from(this.detectedOpportunities.values());
  }
  
  /**
   * Get opportunities by status
   * @param status - Status to filter by
   */
  public getOpportunitiesByStatus(status: 'pending' | 'executing' | 'completed' | 'failed'): ExecutableArbitrageOpportunity[] {
    return this.getOpportunities().filter(o => o.status === status);
  }
  
  /**
   * Update configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<ArbitrageDetectorConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Update market analyzer with new configuration
    if (config.minProfitThreshold !== undefined) {
      this.marketMonitor.setMinProfitThreshold(config.minProfitThreshold);
    }
    
    if (config.maxSlippage !== undefined) {
      this.marketMonitor.setMaxSlippage(config.maxSlippage);
    }
    
    if (config.tradeSizeUsd !== undefined) {
      this.marketMonitor.setTradeSize(config.tradeSizeUsd);
    }
  }
}
