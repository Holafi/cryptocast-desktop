import { ethers } from 'ethers';
import { GasService, GasInfo } from './GasService';

// Batch Airdrop Contract ABI
const BATCH_AIRDROP_CONTRACT_ABI = [
  // Write function - only one function
  "function batchTransfer(address token, address[] recipients, uint256[] amounts) external"
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

export interface BatchInfo {
  token: string;
  totalAmount: string;
  recipientCount: number;
  executedCount: number;
  executed: boolean;
  cancelled: boolean;
  createdAt: string;
}

export interface BatchDetails {
  recipients: string[];
  amounts: string[];
}

export interface ContractDeploymentResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

export interface BatchTransferResult {
  transactionHash: string;
  totalAmount: string;
  recipientCount: number;
  gasUsed: string;
}

export interface ContractDeploymentConfig {
  tokenAddress: string;
  chainId: number;
  rpcUrl: string;
  deployerPrivateKey: string;
}

export class ContractService {
  private gasService: GasService;

  constructor() {
    this.gasService = new GasService();
  }

  /**
   * Deploy the simple batch transfer contract
   */
  async deployContract(config: ContractDeploymentConfig): Promise<ContractDeploymentResult> {
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const wallet = new ethers.Wallet(config.deployerPrivateKey, provider);

      // Get deployment gas estimate
      const gasInfo = await this.gasService.getGasInfo(config.rpcUrl, 'ethereum');
      const txOptions = this.gasService.getTransactionOptions(gasInfo);

      // Load contract bytecode
      const bytecode = this.getContractBytecode();
      const contractFactory = new ethers.ContractFactory(BATCH_AIRDROP_CONTRACT_ABI, bytecode, wallet);

      // Deploy contract
      const contract = await contractFactory.deploy({ ...txOptions });
      const deploymentReceipt = await contract.waitForDeployment();
      const receipt = await contract.deploymentTransaction()?.wait();

      return {
        contractAddress: await contract.getAddress(),
        transactionHash: contract.deploymentTransaction()?.hash || '',
        blockNumber: receipt?.blockNumber || 0,
        gasUsed: receipt?.gasUsed?.toString() || '0'
      };
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      throw new Error(`Contract deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approve tokens for the contract to use
   */
  async approveTokens(
    rpcUrl: string,
    privateKey: string,
    tokenAddress: string,
    contractAddress: string,
    amount: string
  ): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(wallet.address, contractAddress);
      if (currentAllowance >= BigInt(amount)) {
        console.log('Sufficient allowance already exists, skipping approval');
        return 'already-approved';
      }

      // Get gas info and create transaction
      const gasInfo = await this.gasService.getGasInfo(rpcUrl, 'ethereum');
      const txOptions = this.gasService.getTransactionOptions(gasInfo);

      // Approve tokens
      const tx = await tokenContract.approve(contractAddress, amount, txOptions);
      const receipt = await tx.wait();

      return tx.hash;
    } catch (error) {
      console.error('Failed to approve tokens:', error);
      throw new Error(`Token approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 直接执行批量转账 - 最简单的方法
   */
  async batchTransfer(
    contractAddress: string,
    rpcUrl: string,
    privateKey: string,
    recipients: string[],
    amounts: string[],
    tokenAddress: string
  ): Promise<BatchTransferResult> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, BATCH_AIRDROP_CONTRACT_ABI, wallet);

      // Validate inputs
      if (recipients.length !== amounts.length) {
        throw new Error('收币地址和金额数组长度必须相同');
      }

      if (recipients.length === 0) {
        throw new Error('收币地址不能为空');
      }

      // Convert amounts to BigInt (假设都是18位小数)
      const bigintAmounts = amounts.map(amount => ethers.parseUnits(amount, 18));

      // Get gas info for this batch
      const gasInfo = await this.gasService.getBatchGasEstimate(rpcUrl, 'ethereum', recipients.length);
      const txOptions = this.gasService.getTransactionOptions(gasInfo);

      // 执行批量转账
      const tx = await contract.batchTransfer(tokenAddress, recipients, bigintAmounts, txOptions);
      const receipt = await tx.wait();

      // 计算总金额
      const totalAmount = bigintAmounts.reduce((sum, amount) => sum + amount, 0n);

      return {
        transactionHash: tx.hash,
        totalAmount: ethers.formatUnits(totalAmount, 18),
        recipientCount: recipients.length,
        gasUsed: receipt?.gasUsed?.toString() || '0'
      };
    } catch (error) {
      console.error('批量转账失败:', error);
      throw new Error(`批量转账失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(
    rpcUrl: string,
    tokenAddress: string
  ): Promise<{ symbol: string; name: string; decimals: number }> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      return {
        symbol,
        name,
        decimals: Number(decimals)
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      throw new Error(`Failed to get token info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if tokens are approved for the contract
   */
  async checkApproval(
    rpcUrl: string,
    privateKey: string,
    tokenAddress: string,
    contractAddress: string,
    requiredAmount: string
  ): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const allowance = await tokenContract.allowance(wallet.address, contractAddress);
      return allowance >= ethers.parseEther(requiredAmount);
    } catch (error) {
      console.error('Failed to check approval:', error);
      return false;
    }
  }

  /**
   * Get BatchAirdropContract bytecode
   */
  private getContractBytecode(): string {
    // BatchAirdropContract bytecode - 高效批量空投合约
    // 实际部署时应该编译真实的合约，这里只是占位符
    return '0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c8063b0363cdf146041575b600080fd5b60005b60005481101560575760008082015b602002015b91905056fea2646970667358221220a7b5c8d7e6f9a0b3c5d8e1f2a4b6c9d0e3f5a7b9c1d4e6f8a0b2c5d7e9f1a3c64736f6c63430008120033';
  }

  /**
   * Static method to get contract bytecode for testing
   */
  public static getContractBytecode(): string {
    return '0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c8063b0363cdf146041575b600080fd5b60005b60005481101560575760008082015b602002015b91905056fea2646970667358221220a7b5c8d7e6f9a0b3c5d8e1f2a4b6c9d0e3f5a7b9c1d4e6f8a0b2c5d7e9f1a3c64736f6c63430008120033';
  }
}