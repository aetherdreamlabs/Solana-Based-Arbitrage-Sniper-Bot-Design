import { expect } from 'chai';
import { isValidSecretKeyFormat, parseSecretKey, isValidPublicKey } from './wallet-utils';

describe('Wallet Utilities Tests', () => {
  describe('isValidSecretKeyFormat', () => {
    it('should return true for valid base58 secret key format', () => {
      // This is a fake key for testing purposes only
      const validKey = '4NMwxzmYbBq8ipFWo8UuHbD2KipPjBWCz8ihA7aQx8aBUbfwwHqfPnGLtHPUdTSxqgn9UjJkJmA7oeER75iz7AzV';
      expect(isValidSecretKeyFormat(validKey)).to.be.true;
    });

    it('should return false for invalid secret key format', () => {
      const invalidKey = 'not-a-valid-key';
      expect(isValidSecretKeyFormat(invalidKey)).to.be.false;
    });
  });

  describe('parseSecretKey', () => {
    it('should return the same key if already in valid base58 format', () => {
      // This is a fake key for testing purposes only
      const validKey = '4NMwxzmYbBq8ipFWo8UuHbD2KipPjBWCz8ihA7aQx8aBUbfwwHqfPnGLtHPUdTSxqgn9UjJkJmA7oeER75iz7AzV';
      expect(parseSecretKey(validKey)).to.equal(validKey);
    });

    it('should return null for invalid input', () => {
      const invalidInput = 'not-a-valid-key-or-format';
      expect(parseSecretKey(invalidInput)).to.be.null;
    });
  });

  describe('isValidPublicKey', () => {
    it('should return true for valid public key format', () => {
      // This is a fake public key for testing purposes only
      const validPublicKey = 'BPF9Xn3nKqHVf1JUmUAKRYsP6AwXFADGPr2vEPCpRrYWNGhu3WUU';
      expect(isValidPublicKey(validPublicKey)).to.be.true;
    });

    it('should return false for invalid public key format', () => {
      const invalidPublicKey = 'not-a-valid-public-key';
      expect(isValidPublicKey(invalidPublicKey)).to.be.false;
    });
  });
});
