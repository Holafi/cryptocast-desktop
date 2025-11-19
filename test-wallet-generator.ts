#!/usr/bin/env ts-node

import { ethers } from 'ethers';

// Generate a new test wallet
function generateTestWallet() {
  const wallet = ethers.Wallet.createRandom();

  console.log('🔑 Generated Test Wallet for Sepolia Testnet');
  console.log('='.repeat(50));
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`Public Key: ${wallet.publicKey}`);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Copy the address above');
  console.log('2. Go to https://sepoliafaucet.com/');
  console.log('3. Paste the address to get test ETH');
  console.log('4. Wait for the ETH to arrive (usually a few minutes)');
  console.log('5. Run: npm run test:testnet');
  console.log('');
  console.log('⚠️  Keep your private key secure and never share it!');
  console.log('💡 This wallet is for testing only - do not use real funds!');

  return wallet;
}

// Generate and display the test wallet
const testWallet = generateTestWallet();

// Save wallet info to a file (for reference)
import { writeFileSync } from 'fs';
import { join } from 'path';

const walletInfo = {
  address: testWallet.address,
  privateKey: testWallet.privateKey,
  publicKey: testWallet.publicKey,
  network: 'sepolia',
  purpose: 'Testing Batch Airdrop Desktop App',
  generatedAt: new Date().toISOString()
};

const walletFilePath = join(__dirname, 'test-wallet-info.json');
writeFileSync(walletFilePath, JSON.stringify(walletInfo, null, 2));

console.log(`📁 Wallet info saved to: ${walletFilePath}`);