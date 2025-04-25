import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Utility functions for testing the wallet connection
 */

/**
 * Test function to validate a secret key format
 * @param secretKey - The secret key to validate
 * @returns Boolean indicating if the format is valid
 */
export function isValidSecretKeyFormat(secretKey: string): boolean {
  try {
    // Attempt to decode the base58 string
    const decoded = bs58.decode(secretKey);
    
    // Check if the decoded key has the correct length (64 bytes for a keypair)
    return decoded.length === 64;
  } catch (error) {
    return false;
  }
}

/**
 * Test function to check connection to Solana network
 * @param endpoint - The Solana RPC endpoint to test
 * @returns Promise resolving to connection status
 */
export async function testNetworkConnection(endpoint: string = 'https://api.mainnet-beta.solana.com'): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connection = new Connection(endpoint, 'confirmed');
    const version = await connection.getVersion();
    const endTime = Date.now();
    
    return {
      success: true,
      latency: endTime - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test function to check if a public key is valid
 * @param publicKeyString - The public key string to validate
 * @returns Boolean indicating if the public key is valid
 */
export function isValidPublicKey(publicKeyString: string): boolean {
  try {
    new PublicKey(publicKeyString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely parse a secret key from various formats
 * @param secretKeyInput - The secret key input (could be various formats)
 * @returns The normalized base58 secret key or null if invalid
 */
export function parseSecretKey(secretKeyInput: string): string | null {
  try {
    // Remove whitespace and check if it's already a valid base58 string
    const trimmed = secretKeyInput.trim();
    
    if (isValidSecretKeyFormat(trimmed)) {
      return trimmed;
    }
    
    // Try to parse as JSON array
    try {
      const jsonArray = JSON.parse(trimmed);
      if (Array.isArray(jsonArray) && jsonArray.length === 64) {
        const uint8Array = new Uint8Array(jsonArray);
        return bs58.encode(uint8Array);
      }
    } catch (e) {
      // Not JSON, continue to other formats
    }
    
    // Try to parse as hex string (remove 0x prefix if present)
    const hexString = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
    if (/^[0-9a-fA-F]{128}$/.test(hexString)) {
      const uint8Array = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      return bs58.encode(uint8Array);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
