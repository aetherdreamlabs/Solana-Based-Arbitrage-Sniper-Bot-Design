import { PriceData } from './market-collector';

/**
 * Interface for arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  sourceDex: string;
  targetDex: string;
  pair: string;
  profitPercentage: number;
  estimatedProfit: number;
  sourcePrice: number;
  targetPrice: number;
  direction: 'buy' | 'sell';
  timestamp: number;
  tradeSize: number;
}

/**
 * Market analyzer class
 * This class analyzes market data to identify arbitrage opportunities
 */
export class MarketAnalyzer {
  private minProfitThreshold: number;
  private maxSlippage: number;
  private tradeSizeUsd: number;
  private gasCostSol: number;
  private solPriceUsd: number;
  
  /**
   * Constructor for MarketAnalyzer
   * @param minProfitThreshold - Minimum profit threshold as a percentage (e.g., 0.5 for 0.5%)
   * @param maxSlippage - Maximum allowed slippage as a percentage
   * @param tradeSizeUsd - Default trade size in USD
   * @param gasCostSol - Estimated gas cost in SOL
   * @param solPriceUsd - Current SOL price in USD
   */
  constructor(
    minProfitThreshold: number = 0.5,
    maxSlippage: number = 0.3,
    tradeSizeUsd: number = 1000,
    gasCostSol: number = 0.001,
    solPriceUsd: number = 150
  ) {
    this.minProfitThreshold = minProfitThreshold;
    this.maxSlippage = maxSlippage;
    this.tradeSizeUsd = tradeSizeUsd;
    this.gasCostSol = gasCostSol;
    this.solPriceUsd = solPriceUsd;
  }
  
  /**
   * Find arbitrage opportunities in the market data
   * @param marketData - Map of price data for each trading pair
   * @returns Array of arbitrage opportunities
   */
  public findArbitrageOpportunities(
    marketData: Map<string, PriceData[]>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Calculate gas cost in USD
    const gasCostUsd = this.gasCostSol * this.solPriceUsd;
    
    // Iterate through each trading pair
    for (const [pair, priceDataArray] of marketData.entries()) {
      // Need at least 2 DEXes to compare
      if (priceDataArray.length < 2) {
        continue;
      }
      
      // Compare prices between each pair of DEXes
      for (let i = 0; i < priceDataArray.length; i++) {
        for (let j = i + 1; j < priceDataArray.length; j++) {
          const dexA = priceDataArray[i];
          const dexB = priceDataArray[j];
          
          // Check if data is fresh (within last 30 seconds)
          const now = Date.now();
          if (now - dexA.timestamp > 30000 || now - dexB.timestamp > 30000) {
            continue;
          }
          
          // Check for buy opportunity: buy on dexA, sell on dexB
          if (dexB.bid > dexA.ask) {
            const profitPerUnit = dexB.bid - dexA.ask;
            const profitPercentage = (profitPerUnit / dexA.ask) * 100;
            
            // Calculate trade size based on the pair's price
            const tradeSize = this.tradeSizeUsd / dexA.ask;
            
            // Calculate estimated profit in USD
            const estimatedProfit = (profitPerUnit * tradeSize) - gasCostUsd;
            
            // Check if profit exceeds threshold and gas costs
            if (profitPercentage >= this.minProfitThreshold && estimatedProfit > 0) {
              opportunities.push({
                sourceDex: dexA.dex,
                targetDex: dexB.dex,
                pair,
                profitPercentage,
                estimatedProfit,
                sourcePrice: dexA.ask,
                targetPrice: dexB.bid,
                direction: 'buy',
                timestamp: now,
                tradeSize
              });
            }
          }
          
          // Check for sell opportunity: buy on dexB, sell on dexA
          if (dexA.bid > dexB.ask) {
            const profitPerUnit = dexA.bid - dexB.ask;
            const profitPercentage = (profitPerUnit / dexB.ask) * 100;
            
            // Calculate trade size based on the pair's price
            const tradeSize = this.tradeSizeUsd / dexB.ask;
            
            // Calculate estimated profit in USD
            const estimatedProfit = (profitPerUnit * tradeSize) - gasCostUsd;
            
            // Check if profit exceeds threshold and gas costs
            if (profitPercentage >= this.minProfitThreshold && estimatedProfit > 0) {
              opportunities.push({
                sourceDex: dexB.dex,
                targetDex: dexA.dex,
                pair,
                profitPercentage,
                estimatedProfit,
                sourcePrice: dexB.ask,
                targetPrice: dexA.bid,
                direction: 'buy',
                timestamp: now,
                tradeSize
              });
            }
          }
        }
      }
    }
    
    // Sort opportunities by profit percentage (highest first)
    return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
  }
  
  /**
   * Update the SOL price used for gas cost calculations
   * @param solPriceUsd - Current SOL price in USD
   */
  public updateSolPrice(solPriceUsd: number): void {
    this.solPriceUsd = solPriceUsd;
  }
  
  /**
   * Update the minimum profit threshold
   * @param minProfitThreshold - Minimum profit threshold as a percentage
   */
  public setMinProfitThreshold(minProfitThreshold: number): void {
    this.minProfitThreshold = minProfitThreshold;
  }
  
  /**
   * Update the maximum allowed slippage
   * @param maxSlippage - Maximum allowed slippage as a percentage
   */
  public setMaxSlippage(maxSlippage: number): void {
    this.maxSlippage = maxSlippage;
  }
  
  /**
   * Update the default trade size
   * @param tradeSizeUsd - Default trade size in USD
   */
  public setTradeSize(tradeSizeUsd: number): void {
    this.tradeSizeUsd = tradeSizeUsd;
  }
  
  /**
   * Update the estimated gas cost
   * @param gasCostSol - Estimated gas cost in SOL
   */
  public setGasCost(gasCostSol: number): void {
    this.gasCostSol = gasCostSol;
  }
}
