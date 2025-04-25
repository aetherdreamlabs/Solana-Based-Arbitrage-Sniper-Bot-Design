import { Connection } from '@solana/web3.js';
import { WalletConnection } from '../wallet-connection';
import { MarketMonitor } from '../market';
import { ArbitrageDetector, ArbitrageDetectorConfig } from './detector';
import { ArbitrageStrategy, ArbitrageStrategyConfig } from './strategy';

/**
 * Interface for arbitrage manager configuration
 */
export interface ArbitrageManagerConfig {
  detector?: Partial<ArbitrageDetectorConfig>;
  strategy?: Partial<ArbitrageStrategyConfig>;
}

/**
 * ArbitrageManager class
 * This class manages the arbitrage detection and execution process
 */
export class ArbitrageManager {
  private connection: Connection;
  private walletConnection: WalletConnection;
  private marketMonitor: MarketMonitor;
  private detector: ArbitrageDetector;
  private strategy: ArbitrageStrategy;
  private isRunning: boolean = false;
  
  /**
   * Constructor for ArbitrageManager
   * @param connection - Solana connection
   * @param walletConnection - Wallet connection
   * @param marketMonitor - Market monitor
   * @param config - Arbitrage manager configuration
   */
  constructor(
    connection: Connection,
    walletConnection: WalletConnection,
    marketMonitor: MarketMonitor,
    config: ArbitrageManagerConfig = {}
  ) {
    this.connection = connection;
    this.walletConnection = walletConnection;
    this.marketMonitor = marketMonitor;
    
    // Create arbitrage detector
    this.detector = new ArbitrageDetector(
      connection,
      walletConnection,
      marketMonitor,
      config.detector
    );
    
    // Create arbitrage strategy
    this.strategy = new ArbitrageStrategy(
      this.detector,
      config.strategy
    );
  }
  
  /**
   * Start the arbitrage manager
   */
  public start(): boolean {
    if (this.isRunning) {
      console.warn('Arbitrage manager is already running');
      return true;
    }
    
    console.log('Starting arbitrage manager...');
    
    // Start market monitor if not already running
    this.marketMonitor.start();
    
    // Start arbitrage detector
    this.detector.start();
    
    this.isRunning = true;
    return true;
  }
  
  /**
   * Stop the arbitrage manager
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    console.log('Stopping arbitrage manager...');
    
    // Stop arbitrage detector
    this.detector.stop();
    
    // We don't stop the market monitor here as it might be used by other components
    
    this.isRunning = false;
  }
  
  /**
   * Get the arbitrage detector
   */
  public getDetector(): ArbitrageDetector {
    return this.detector;
  }
  
  /**
   * Get the arbitrage strategy
   */
  public getStrategy(): ArbitrageStrategy {
    return this.strategy;
  }
  
  /**
   * Update detector configuration
   * @param config - New detector configuration
   */
  public updateDetectorConfig(config: Partial<ArbitrageDetectorConfig>): void {
    this.detector.updateConfig(config);
  }
  
  /**
   * Update strategy configuration
   * @param config - New strategy configuration
   */
  public updateStrategyConfig(config: Partial<ArbitrageStrategyConfig>): void {
    this.strategy.updateConfig(config);
  }
  
  /**
   * Get current status
   */
  public getStatus(): {
    isRunning: boolean;
    opportunities: number;
    completedTrades: number;
    failedTrades: number;
    pendingTrades: number;
    dailyTradeCount: number;
    maxDailyTrades: number;
  } {
    const opportunities = this.detector.getOpportunities();
    const completedTrades = this.detector.getOpportunitiesByStatus('completed').length;
    const failedTrades = this.detector.getOpportunitiesByStatus('failed').length;
    const pendingTrades = this.detector.getOpportunitiesByStatus('pending').length;
    const tradeStats = this.strategy.getTradeStats();
    
    return {
      isRunning: this.isRunning,
      opportunities: opportunities.length,
      completedTrades,
      failedTrades,
      pendingTrades,
      dailyTradeCount: tradeStats.dailyTradeCount,
      maxDailyTrades: tradeStats.maxDailyTrades
    };
  }
}
