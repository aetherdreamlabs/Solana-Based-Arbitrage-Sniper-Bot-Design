import { Connection } from '@solana/web3.js';
import { DexMarketProvider } from './dex-provider';
import { SerumMarketProvider } from './serum-provider';
import { RaydiumMarketProvider } from './raydium-provider';
import { OrcaMarketProvider } from './orca-provider';

/**
 * Interface for price data
 */
export interface PriceData {
  dex: string;
  pair: string;
  bid: number;
  ask: number;
  last?: number;
  timestamp: number;
}

/**
 * Market data collector class
 * This class collects and aggregates market data from multiple DEXes
 */
export class MarketDataCollector {
  private connection: Connection;
  private providers: DexMarketProvider[] = [];
  private isInitialized: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private priceData: Map<string, PriceData[]> = new Map();
  private updateCallbacks: ((data: Map<string, PriceData[]>) => void)[] = [];
  
  /**
   * Constructor for MarketDataCollector
   * @param connection - Solana connection
   * @param dexes - Array of DEX names to include (default: all supported)
   */
  constructor(
    connection: Connection,
    private dexes: string[] = ['Serum', 'Raydium', 'Orca'],
    private pollingIntervalMs: number = 5000
  ) {
    this.connection = connection;
  }
  
  /**
   * Initialize the market data collector
   */
  public async initialize(): Promise<boolean> {
    try {
      // Create providers based on requested DEXes
      if (this.dexes.includes('Serum')) {
        const serumProvider = new SerumMarketProvider(this.connection);
        this.providers.push(serumProvider);
      }
      
      if (this.dexes.includes('Raydium')) {
        const raydiumProvider = new RaydiumMarketProvider(this.connection);
        this.providers.push(raydiumProvider);
      }
      
      if (this.dexes.includes('Orca')) {
        const orcaProvider = new OrcaMarketProvider(this.connection);
        this.providers.push(orcaProvider);
      }
      
      // Initialize all providers
      for (const provider of this.providers) {
        const success = await provider.initialize();
        if (!success) {
          console.error(`Failed to initialize ${provider.getDexName()} provider`);
        }
      }
      
      this.isInitialized = this.providers.length > 0;
      return this.isInitialized;
    } catch (error) {
      console.error(`Failed to initialize market data collector: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Start collecting market data
   */
  public start(): boolean {
    if (!this.isInitialized) {
      console.error('Market data collector is not initialized');
      return false;
    }
    
    if (this.pollingInterval) {
      console.warn('Market data collector is already running');
      return true;
    }
    
    console.log(`Starting market data collection with interval: ${this.pollingIntervalMs}ms`);
    
    // Start polling for market data
    this.pollingInterval = setInterval(async () => {
      await this.collectData();
    }, this.pollingIntervalMs);
    
    // Collect initial data
    this.collectData();
    
    return true;
  }
  
  /**
   * Stop collecting market data
   */
  public stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Market data collection stopped');
    }
  }
  
  /**
   * Collect market data from all providers
   */
  private async collectData(): Promise<void> {
    try {
      for (const provider of this.providers) {
        const dexName = provider.getDexName();
        const pairs = await provider.getSupportedPairs();
        
        for (const pair of pairs) {
          const pairName = pair.name;
          const priceData = await provider.getPrice(pairName);
          
          if (priceData) {
            // Store price data
            const data: PriceData = {
              dex: dexName,
              pair: pairName,
              bid: priceData.bid,
              ask: priceData.ask,
              last: priceData.last,
              timestamp: priceData.timestamp
            };
            
            // Get or create array for this pair
            if (!this.priceData.has(pairName)) {
              this.priceData.set(pairName, []);
            }
            
            // Update or add price data for this DEX
            const pairData = this.priceData.get(pairName)!;
            const existingIndex = pairData.findIndex(p => p.dex === dexName);
            
            if (existingIndex >= 0) {
              pairData[existingIndex] = data;
            } else {
              pairData.push(data);
            }
          }
        }
      }
      
      // Notify all callbacks about the updated data
      this.notifyUpdateCallbacks();
    } catch (error) {
      console.error(`Error collecting market data: ${error.message}`);
    }
  }
  
  /**
   * Get the latest price data for all pairs
   */
  public getPriceData(): Map<string, PriceData[]> {
    return new Map(this.priceData);
  }
  
  /**
   * Get the latest price data for a specific pair
   * @param pairName - The name of the pair (e.g., "SOL/USDC")
   */
  public getPriceDataForPair(pairName: string): PriceData[] | null {
    return this.priceData.get(pairName) || null;
  }
  
  /**
   * Register a callback for price updates
   * @param callback - Function to call when prices are updated
   */
  public onPriceUpdate(callback: (data: Map<string, PriceData[]>) => void): void {
    this.updateCallbacks.push(callback);
  }
  
  /**
   * Notify all registered callbacks about price updates
   */
  private notifyUpdateCallbacks(): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(this.getPriceData());
      } catch (error) {
        console.error(`Error in price update callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Get all supported trading pairs across all DEXes
   */
  public async getSupportedPairs(): Promise<Set<string>> {
    const pairs = new Set<string>();
    
    for (const provider of this.providers) {
      const providerPairs = await provider.getSupportedPairs();
      for (const pair of providerPairs) {
        pairs.add(pair.name);
      }
    }
    
    return pairs;
  }
  
  /**
   * Get all providers
   */
  public getProviders(): DexMarketProvider[] {
    return [...this.providers];
  }
}
