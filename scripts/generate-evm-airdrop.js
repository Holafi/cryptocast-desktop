#!/usr/bin/env node
/**
 * 生成 EVM 空投列表
 * 生成 333 行合法的 EVM 地址和随机金额
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 配置
const COUNT = 333;
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 100;

/**
 * 生成随机金额（0.01 到 100 之间，保留 2 位小数）
 */
function generateRandomAmount() {
  const amount = Math.random() * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT;
  return amount.toFixed(2);
}

/**
 * 生成空投列表
 */
function generateAirdropList() {
  console.log(`🚀 开始生成 ${COUNT} 个 EVM 地址和金额...`);

  const airdropList = [];

  for (let i = 0; i < COUNT; i++) {
    // 生成随机钱包
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const amount = generateRandomAmount();

    airdropList.push({ address, amount });

    // 显示进度
    if ((i + 1) % 50 === 0) {
      console.log(`✓ 已生成 ${i + 1}/${COUNT} 个地址`);
    }
  }

  return airdropList;
}

/**
 * 保存为 CSV 文件
 */
function saveToCSV(airdropList, filename) {
  const csvContent = [
    'address,amount',
    ...airdropList.map(item => `${item.address},${item.amount}`)
  ].join('\n');

  const outputPath = path.join(__dirname, filename);
  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`\n✅ 已保存到: ${outputPath}`);
  console.log(`📊 总计: ${airdropList.length} 个地址`);

  // 统计总金额
  const totalAmount = airdropList.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  console.log(`💰 总金额: ${totalAmount.toFixed(2)}`);
}

/**
 * 主函数
 */
function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 EVM 空投列表生成器');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const airdropList = generateAirdropList();
  saveToCSV(airdropList, 'evm-airdrop-list.csv');

  // 显示前 5 个示例
  console.log('\n📋 前 5 个地址示例:');
  airdropList.slice(0, 5).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.address} - ${item.amount}`);
  });

  console.log('\n✨ 完成！');
}

// 运行
main();
