import { Connection, PublicKey } from '@solana/web3.js';
import { Market } from '@project-serum/serum';

/**
 * Interface for token pair information
 */
export interface TokenPair {
  name: string;
  baseToken: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  quoteToken: {
    symbol: string;
    mint: string;
    decimals: number;
  };
}

/**
 * Interface for DEX information
 */
export interface DexInfo {
  name: string;
  type: 'orderbook' | 'amm' | 'hybrid';
  supportedPairs: string[];
}

/**
 * Base class for DEX market data providers
 */
export abstract class DexMarketProvider {
  protected connection: Connection;
  protected dexName: string;
  
  constructor(connection: Connection, dexName: string) {
    this.connection = connection;
    this.dexName = dexName;
  }
  
  /**
   * Get the name of the DEX
   */
  public getDexName(): string {
    return this.dexName;
  }
  
  /**
   * Get supported token pairs for this DEX
   */
  public abstract getSupportedPairs(): Promise<TokenPair[]>;
  
  /**
   * Get current price for a token pair
   */
  public abstract getPrice(pairName: string): Promise<{
    bid: number;
    ask: number;
    last?: number;
    timestamp: number;
  } | null>;
  
  /**
   * Get order book for a token pair
   */
  public abstract getOrderBook(pairName: string): Promise<{
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
    timestamp: number;
  } | null>;
  
  /**
   * Initialize the market data provider
   */
  public abstract initialize(): Promise<boolean>;
}

/**
 * Serum DEX market data provider
 */
export class SerumMarketProvider extends DexMarketProvider {
  private markets: Map<string, Market> = new Map();
  private marketAddresses: Map<string, string> = new Map();
  private tokenPairs: TokenPair[] = [];
  private programId: PublicKey;
  
  constructor(connection: Connection, programId: string = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX') {
    super(connection, 'Serum');
    this.programId = new PublicKey(programId);
  }
  
  /**
   * Initialize the Serum market data provider
   */
  public async initialize(): Promise<boolean> {
    try {
      // In a real implementation, we would load market addresses from a config file or API
      // For demonstration purposes, we'll hardcode a few common markets
      this.marketAddresses.set('SOL/USDC', '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT');
      this.marketAddresses.set('BTC/USDC', 'A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw');
      this.marketAddresses.set('ETH/USDC', '4tSvZvnbyzHXLMTiFonMyxZoHmFqau1XArcRCVHLZ5gX');
      
      // Define token pairs
      this.tokenPairs = [
        {
          name: 'SOL/USDC',
          baseToken: {
            symbol: 'SOL',
            mint: 'So11111111111111111111111111111111111111112',
            decimals: 9
          },
          quoteToken: {
            symbol: 'USDC',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6
          }
        },
        {
          name: 'BTC/USDC',
          baseToken: {
            symbol: 'BTC',
            mint: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
            decimals: 6
          },
          quoteToken: {
            symbol: 'USDC',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6
          }
        },
        {
          name: 'ETH/USDC',
          baseToken: {
            symbol: 'ETH',
            mint: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
            decimals: 6
          },
          quoteToken: {
            symbol: 'USDC',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6
          }
        }
      ];
      
      // Load markets
      for (const [pairName, marketAddress] of this.marketAddresses.entries()) {
        try {
          const marketPubkey = new PublicKey(marketAddress);
          const market = await Market.load(
            this.connection,
            marketPubkey,
            {},
            this.programId
          );
          this.markets.set(pairName, market);
        } catch (error) {
          console.error(`Failed to load Serum market for ${pairName}: ${error.message}`);
        }
      }
      
      return this.markets.size > 0;
    } catch (error) {
      console.error(`Failed to initialize Serum market provider: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get supported token pairs for Serum
   */
  public async getSupportedPairs(): Promise<TokenPair[]> {
    return this.tokenPairs;
  }
  
  /**
   * Get current price for a token pair on Serum
   */
  public async getPrice(pairName: string): Promise<{
    bid: number;
    ask: number;
    last?: number;
    timestamp: number;
  } | null> {
    try {
      const market = this.markets.get(pairName);
      
      if (!market) {
        return null;
      }
      
      const orderbook = await market.loadOrderbook(this.connection);
      
      if (!orderbook.bids.length || !orderbook.asks.length) {
        return null;
      }
      
      const bestBid = orderbook.bids[0].price;
      const bestAsk = orderbook.asks[0].price;
      
      return {
        bid: bestBid,
        ask: bestAsk,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get price for ${pairName} on Serum: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get order book for a token pair on Serum
   */
  public async getOrderBook(pairName: string): Promise<{
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
    timestamp: number;
  } | null> {
    try {
      const market = this.markets.get(pairName);
      
      if (!market) {
        return null;
      }
      
      const orderbook = await market.loadOrderbook(this.connection);
      
      const bids = orderbook.bids.map(bid => ({
        price: bid.price,
        size: bid.size
      }));
      
      const asks = orderbook.asks.map(ask => ({
        price: ask.price,
        size: ask.size
      }));
      
      return {
        bids,
        asks,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get orderbook for ${pairName} on Serum: ${error.message}`);
      return null;
    }
  }
}
