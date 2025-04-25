import { Connection } from '@solana/web3.js';
import { MarketDataCollector, PriceData } from './market-collector';
import { MarketAnalyzer, ArbitrageOpportunity } from './market-analyzer';

/**
 * Interface for market monitor configuration
 */
export interface MarketMonitorConfig {
  connection: Connection;
  dexes?: string[];
  pairs?: string[];
  pollingIntervalMs?: number;
  minProfitThreshold?: number;
  maxSlippage?: number;
  tradeSizeUsd?: number;
  gasCostSol?: number;
  solPriceUsd?: number;
  maxOpportunities?: number;
}

/**
 * Market monitor class
 * This class combines the market data collector and analyzer to monitor for arbitrage opportunities
 */
export class MarketMonitor {
  private collector: MarketDataCollector;
  private analyzer: MarketAnalyzer;
  private opportunities: ArbitrageOpportunity[] = [];
  private opportunityCallbacks: ((opportunities: ArbitrageOpportunity[]) => void)[] = [];
  private maxOpportunities: number;
  
  /**
   * Constructor for MarketMonitor
   * @param config - Market monitor configuration
   */
  constructor(config: MarketMonitorConfig) {
    // Create market data collector
    this.collector = new MarketDataCollector(
      config.connection,
      config.dexes,
      config.pollingIntervalMs || 5000
    );
    
    // Create market analyzer
    this.analyzer = new MarketAnalyzer(
      config.minProfitThreshold || 0.5,
      config.maxSlippage || 0.3,
      config.tradeSizeUsd || 1000,
      config.gasCostSol || 0.001,
      config.solPriceUsd || 150
    );
    
    // Set maximum number of opportunities to track
    this.maxOpportunities = config.maxOpportunities || 10;
    
    // Register for price updates
    this.collector.onPriceUpdate(this.handlePriceUpdate.bind(this));
  }
  
  /**
   * Initialize the market monitor
   */
  public async initialize(): Promise<boolean> {
    return await this.collector.initialize();
  }
  
  /**
   * Start monitoring for arbitrage opportunities
   */
  public start(): boolean {
    return this.collector.start();
  }
  
  /**
   * Stop monitoring
   */
  public stop(): void {
    this.collector.stop();
  }
  
  /**
   * Handle price updates from the collector
   * @param priceData - Updated price data
   */
  private handlePriceUpdate(priceData: Map<string, PriceData[]>): void {
    // Find arbitrage opportunities
    const opportunities = this.analyzer.findArbitrageOpportunities(priceData);
    
    // Keep only the top N opportunities
    this.opportunities = opportunities.slice(0, this.maxOpportunities);
    
    // Notify callbacks
    this.notifyOpportunityCallbacks();
  }
  
  /**
   * Get current arbitrage opportunities
   */
  public getOpportunities(): ArbitrageOpportunity[] {
    return [...this.opportunities];
  }
  
  /**
   * Register a callback for new arbitrage opportunities
   * @param callback - Function to call when new opportunities are found
   */
  public onOpportunity(callback: (opportunities: ArbitrageOpportunity[]) => void): void {
    this.opportunityCallbacks.push(callback);
  }
  
  /**
   * Notify all registered callbacks about new opportunities
   */
  private notifyOpportunityCallbacks(): void {
    for (const callback of this.opportunityCallbacks) {
      try {
        callback(this.getOpportunities());
      } catch (error) {
        console.error(`Error in opportunity callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Update the minimum profit threshold
   * @param minProfitThreshold - Minimum profit threshold as a percentage
   */
  public setMinProfitThreshold(minProfitThreshold: number): void {
    this.analyzer.setMinProfitThreshold(minProfitThreshold);
  }
  
  /**
   * Update the maximum allowed slippage
   * @param maxSlippage - Maximum allowed slippage as a percentage
   */
  public setMaxSlippage(maxSlippage: number): void {
    this.analyzer.setMaxSlippage(maxSlippage);
  }
  
  /**
   * Update the default trade size
   * @param tradeSizeUsd - Default trade size in USD
   */
  public setTradeSize(tradeSizeUsd: number): void {
    this.analyzer.setTradeSize(tradeSizeUsd);
  }
  
  /**
   * Get the market data collector
   */
  public getCollector(): MarketDataCollector {
    return this.collector;
  }
  
  /**
   * Get the market analyzer
   */
  public getAnalyzer(): MarketAnalyzer {
    return this.analyzer;
  }
}
