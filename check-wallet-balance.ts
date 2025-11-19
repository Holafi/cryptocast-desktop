#!/usr/bin/env node

import { ethers } from 'ethers';

// Test wallet configuration
const TEST_WALLET = {
  address: '0xd8F29E2e49757d008a14E78BB0B4ef3062932A4a',
  privateKey: '0x11b3aff6bd4191b1bde981ffb9a389f832851c977c824643405e2ee179aa9fea'
};

// Sepolia testnet RPC
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

async function checkWalletBalance() {
  console.log('🔍 Checking Sepolia Testnet Wallet Balance');
  console.log('='.repeat(50));
  console.log(`Wallet Address: ${TEST_WALLET.address}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/address/${TEST_WALLET.address}`);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new ethers.Wallet(TEST_WALLET.privateKey, provider);

    // Get balance
    const balance = await provider.getBalance(TEST_WALLET.address);
    const balanceETH = ethers.formatEther(balance);

    console.log(`💰 ETH Balance: ${balanceETH} ETH`);
    console.log(`💰 Balance in Wei: ${balance.toString()} Wei`);

    // Get network info
    const network = await provider.getNetwork();
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    console.log(`📦 Latest Block: ${blockNumber}`);

    if (balance > 0n) {
      console.log('\n✅ Wallet is funded and ready for testing!');
      console.log('🚀 You can now run: npm run test:testnet');
    } else {
      console.log('\n⚠️  Wallet has no ETH balance');
      console.log('💡 Please visit https://sepoliafaucet.com/ to get test ETH');
      console.log('📋 Copy this address:', TEST_WALLET.address);
    }

    // Check gas price
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
      console.log(`⛽ Current Gas Price: ${gasPriceGwei} Gwei`);
    }

  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkWalletBalance();