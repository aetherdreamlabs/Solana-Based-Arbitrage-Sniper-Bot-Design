import { ArbitrageDetector, ExecutableArbitrageOpportunity } from './detector';

/**
 * Interface for arbitrage strategy configuration
 */
export interface ArbitrageStrategyConfig {
  minProfitThreshold: number;
  maxSlippage: number;
  tradeSizeUsd: number;
  maxConcurrentTrades: number;
  cooldownMs: number;
  gasMultiplier: number;
  prioritizePairs?: string[];
  blacklistPairs?: string[];
  prioritizeDexes?: string[];
  blacklistDexes?: string[];
  minTradeIntervalMs?: number;
  maxDailyTrades?: number;
}

/**
 * ArbitrageStrategy class
 * This class implements different arbitrage strategies
 */
export class ArbitrageStrategy {
  private detector: ArbitrageDetector;
  private config: ArbitrageStrategyConfig;
  private dailyTradeCount: number = 0;
  private lastTradeTime: number = 0;
  private dailyResetTime: number = 0;
  
  /**
   * Constructor for ArbitrageStrategy
   * @param detector - Arbitrage detector
   * @param config - Strategy configuration
   */
  constructor(
    detector: ArbitrageDetector,
    config: Partial<ArbitrageStrategyConfig> = {}
  ) {
    this.detector = detector;
    
    // Set default configuration values
    this.config = {
      minProfitThreshold: config.minProfitThreshold || 0.5,
      maxSlippage: config.maxSlippage || 0.3,
      tradeSizeUsd: config.tradeSizeUsd || 1000,
      maxConcurrentTrades: config.maxConcurrentTrades || 1,
      cooldownMs: config.cooldownMs || 2000,
      gasMultiplier: config.gasMultiplier || 1.5,
      prioritizePairs: config.prioritizePairs || [],
      blacklistPairs: config.blacklistPairs || [],
      prioritizeDexes: config.prioritizeDexes || [],
      blacklistDexes: config.blacklistDexes || [],
      minTradeIntervalMs: config.minTradeIntervalMs || 5000,
      maxDailyTrades: config.maxDailyTrades || 100
    };
    
    // Update detector with our configuration
    this.detector.updateConfig({
      minProfitThreshold: this.config.minProfitThreshold,
      maxSlippage: this.config.maxSlippage,
      tradeSizeUsd: this.config.tradeSizeUsd,
      maxConcurrentTrades: this.config.maxConcurrentTrades,
      cooldownMs: this.config.cooldownMs,
      gasMultiplier: this.config.gasMultiplier
    });
    
    // Register for opportunity updates
    this.detector.onOpportunity(this.handleOpportunity.bind(this));
    
    // Set daily reset time to midnight UTC
    this.resetDailyTradeCount();
  }
  
  /**
   * Handle a new or updated arbitrage opportunity
   * @param opportunity - Executable arbitrage opportunity
   */
  private handleOpportunity(opportunity: ExecutableArbitrageOpportunity): void {
    // Check if the opportunity is pending (not yet executed)
    if (opportunity.status !== 'pending') {
      return;
    }
    
    // Apply strategy filters
    if (!this.filterOpportunity(opportunity)) {
      return;
    }
    
    // Check trade limits
    if (!this.checkTradeLimits()) {
      return;
    }
    
    // If the opportunity passes all filters, it will be executed by the detector
    // We don't need to do anything else here
  }
  
  /**
   * Filter an opportunity based on strategy rules
   * @param opportunity - Executable arbitrage opportunity
   * @returns Boolean indicating if the opportunity passes all filters
   */
  private filterOpportunity(opportunity: ExecutableArbitrageOpportunity): boolean {
    // Check blacklisted pairs
    if (this.config.blacklistPairs && this.config.blacklistPairs.includes(opportunity.pair)) {
      return false;
    }
    
    // Check blacklisted DEXes
    if (this.config.blacklistDexes) {
      if (this.config.blacklistDexes.includes(opportunity.sourceDex) || 
          this.config.blacklistDexes.includes(opportunity.targetDex)) {
        return false;
      }
    }
    
    // Check if profit is above threshold
    if (opportunity.profitPercentage < this.config.minProfitThreshold) {
      return false;
    }
    
    // Prioritize specific pairs if configured
    if (this.config.prioritizePairs && this.config.prioritizePairs.length > 0) {
      if (!this.config.prioritizePairs.includes(opportunity.pair)) {
        // If we have priority pairs and this isn't one, require higher profit
        if (opportunity.profitPercentage < this.config.minProfitThreshold * 1.5) {
          return false;
        }
      }
    }
    
    // Prioritize specific DEXes if configured
    if (this.config.prioritizeDexes && this.config.prioritizeDexes.length > 0) {
      const isSourcePriority = this.config.prioritizeDexes.includes(opportunity.sourceDex);
      const isTargetPriority = this.config.prioritizeDexes.includes(opportunity.targetDex);
      
      if (!isSourcePriority && !isTargetPriority) {
        // If neither DEX is prioritized, require higher profit
        if (opportunity.profitPercentage < this.config.minProfitThreshold * 1.5) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Check if we're within trade limits
   * @returns Boolean indicating if we can execute more trades
   */
  private checkTradeLimits(): boolean {
    const now = Date.now();
    
    // Check if we need to reset daily count
    if (now > this.dailyResetTime) {
      this.resetDailyTradeCount();
    }
    
    // Check daily trade limit
    if (this.dailyTradeCount >= this.config.maxDailyTrades!) {
      return false;
    }
    
    // Check minimum trade interval
    if (now - this.lastTradeTime < this.config.minTradeIntervalMs!) {
      return false;
    }
    
    // Update counters
    this.lastTradeTime = now;
    this.dailyTradeCount++;
    
    return true;
  }
  
  /**
   * Reset daily trade count
   */
  private resetDailyTradeCount(): void {
    this.dailyTradeCount = 0;
    
    // Set next reset time to midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    this.dailyResetTime = tomorrow.getTime();
  }
  
  /**
   * Update strategy configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<ArbitrageStrategyConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Update detector with relevant configuration
    this.detector.updateConfig({
      minProfitThreshold: this.config.minProfitThreshold,
      maxSlippage: this.config.maxSlippage,
      tradeSizeUsd: this.config.tradeSizeUsd,
      maxConcurrentTrades: this.config.maxConcurrentTrades,
      cooldownMs: this.config.cooldownMs,
      gasMultiplier: this.config.gasMultiplier
    });
  }
  
  /**
   * Get current strategy configuration
   */
  public getConfig(): ArbitrageStrategyConfig {
    return { ...this.config };
  }
  
  /**
   * Get daily trade statistics
   */
  public getTradeStats(): {
    dailyTradeCount: number;
    maxDailyTrades: number;
    lastTradeTime: number;
    nextResetTime: number;
  } {
    return {
      dailyTradeCount: this.dailyTradeCount,
      maxDailyTrades: this.config.maxDailyTrades!,
      lastTradeTime: this.lastTradeTime,
      nextResetTime: this.dailyResetTime
    };
  }
}
