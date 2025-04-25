import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as bs58 from 'bs58';

/**
 * WalletManager class for handling wallet operations
 * This class provides secure wallet connection and transaction signing capabilities
 */
export class WalletManager {
  private connection: Connection;
  private keypair: Keypair;
  private endpoint: string;

  /**
   * Constructor for WalletManager
   * @param secretKey - The secret key for the wallet (from Phantom)
   * @param endpoint - The Solana RPC endpoint to connect to
   */
  constructor(secretKey: string, endpoint: string = 'https://api.mainnet-beta.solana.com') {
    this.endpoint = endpoint;
    this.connection = new Connection(this.endpoint, 'confirmed');
    
    // Convert the secret key from base58 string to Uint8Array and create keypair
    try {
      const decodedKey = bs58.decode(secretKey);
      this.keypair = Keypair.fromSecretKey(decodedKey);
    } catch (error) {
      throw new Error(`Failed to create keypair from secret key: ${error.message}`);
    }
  }

  /**
   * Get the public key of the wallet
   * @returns The public key
   */
  public getPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  /**
   * Get the wallet address as a string
   * @returns The wallet address
   */
  public getWalletAddress(): string {
    return this.keypair.publicKey.toString();
  }

  /**
   * Get the SOL balance of the wallet
   * @returns Promise resolving to the balance in SOL
   */
  public async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      throw new Error(`Failed to get wallet balance: ${error.message}`);
    }
  }

  /**
   * Get the token balance for a specific SPL token
   * @param tokenMint - The mint address of the token
   * @returns Promise resolving to the token balance
   */
  public async getTokenBalance(tokenMint: string): Promise<number> {
    try {
      const mint = new PublicKey(tokenMint);
      const token = new Token(
        this.connection,
        mint,
        TOKEN_PROGRAM_ID,
        this.keypair
      );

      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const tokenAccountInfo = await token.getAccountInfo(tokenAccounts.value[0].pubkey);
      return Number(tokenAccountInfo.amount) / Math.pow(10, tokenAccountInfo.decimals);
    } catch (error) {
      throw new Error(`Failed to get token balance for ${tokenMint}: ${error.message}`);
    }
  }

  /**
   * Sign and send a transaction
   * @param transaction - The transaction to sign and send
   * @returns Promise resolving to the transaction signature
   */
  public async signAndSendTransaction(transaction: Transaction): Promise<string> {
    try {
      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair]
      );
    } catch (error) {
      throw new Error(`Failed to sign and send transaction: ${error.message}`);
    }
  }

  /**
   * Sign a transaction without sending it
   * @param transaction - The transaction to sign
   * @returns The signed transaction
   */
  public signTransaction(transaction: Transaction): Transaction {
    try {
      transaction.sign(this.keypair);
      return transaction;
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  }

  /**
   * Get the connection object
   * @returns The Solana connection
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Change the RPC endpoint
   * @param newEndpoint - The new Solana RPC endpoint
   */
  public changeEndpoint(newEndpoint: string): void {
    this.endpoint = newEndpoint;
    this.connection = new Connection(this.endpoint, 'confirmed');
  }
}
