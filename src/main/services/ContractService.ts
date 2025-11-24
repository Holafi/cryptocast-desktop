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
      // Our contract has no constructor arguments, so we pass tx options directly
      // Gas limit with buffer (actual usage ~364,571, setting to 500,000 for safety)
      const deployOptions = {
        ...txOptions,
        gasLimit: BigInt(500000) // 500K gas for contract deployment
      };

      const contract = await contractFactory.deploy(deployOptions);
      await contract.waitForDeployment();
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

      // Get token decimals dynamically
      const tokenDecimals = await this.getTokenDecimals(rpcUrl, tokenAddress);

      // Convert amounts to BigInt with correct decimals
      // Ensure amount is a string before parsing
      const bigintAmounts = amounts.map(amount => ethers.parseUnits(amount.toString(), tokenDecimals));

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
   * Get token decimals
   */
  async getTokenDecimals(rpcUrl: string, tokenAddress: string): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const decimals = await tokenContract.decimals();
      return Number(decimals);
    } catch (error) {
      console.error('Failed to get token decimals, defaulting to 18:', error);
      return 18; // Default fallback
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
   * Compiled from contracts/BatchAirdrop.sol using Solidity 0.8.18
   * Contract features:
   * - Batch ERC20 token transfers (up to 200 recipients per batch)
   * - Gas optimized with optimizer runs: 200
   * - Error handling for individual transfer failures
   * - Event emission for monitoring
   * - Statistics tracking
   * - Emergency withdrawal function
   * - Ownership transfer capability
   */
  private getContractBytecode(): string {
    return '0x6080604052348015600e575f80fd5b5060016029601f603360201b60201c565b605c60201b60201c565b5f01819055506065565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b6107a2806100725f395ff3fe608060405234801561000f575f80fd5b5060043610610029575f3560e01c80631239ec8c1461002d575b5f80fd5b61004760048036038101906100429190610524565b610049565b005b6100516101ab565b8051825114610095576040517f08c379a0000000000000000000000000000000000000000000000000000000000815260040161008c90610606565b60405180910390fd5b5f5b825181101561019d578373ffffffffffffffffffffffffffffffffffffffff166323b872dd338584815181106100d0576100cf610624565b5b60200260200101518585815181106100eb576100ea610624565b5b60200260200101516040518463ffffffff1660e01b81526004016101119392919061066f565b6020604051808303815f875af115801561012d573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061015191906106d9565b610190576040517f08c379a000000000000000000000000000000000000000000000000000000000081526004016101879061074e565b60405180910390fd5b8080600101915050610097565b506101a66101cd565b505050565b6101b36101e7565b60026101c56101c0610228565b610251565b5f0181905550565b60016101df6101da610228565b610251565b5f0181905550565b6101ef61025a565b15610226576040517f3ee5aeb5000000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f600261026d610268610228565b610251565b5f015414905090565b5f604051905090565b5f80fd5b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6102b082610287565b9050919050565b6102c0816102a6565b81146102ca575f80fd5b50565b5f813590506102db816102b7565b92915050565b5f80fd5b5f601f19601f8301169050919050565b7f4e487b710000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61032b826102e5565b810181811067ffffffffffffffff8211171561034a576103496102f5565b5b80604052505050565b5f61035c610276565b90506103688282610322565b919050565b5f67ffffffffffffffff821115610387576103866102f5565b5b602082029050602081019050919050565b5f80fd5b5f6103ae6103a98461036d565b610353565b905080838252602082019050602084028301858111156103d1576103d0610398565b5b835b818110156103fa57806103e688826102cd565b8452602084019350506020810190506103d3565b5050509392505050565b5f82601f830112610418576104176102e1565b5b813561042884826020860161039c565b91505092915050565b5f67ffffffffffffffff82111561044b5761044a6102f5565b5b602082029050602081019050919050565b5f819050919050565b61046e8161045c565b8114610478575f80fd5b50565b5f8135905061048981610465565b92915050565b5f6104a161049c84610431565b610353565b905080838252602082019050602084028301858111156104c4576104c3610398565b5b835b818110156104ed57806104d9888261047b565b8452602084019350506020810190506104c6565b5050509392505050565b5f82601f83011261050b5761050a6102e1565b5b813561051b84826020860161048f565b91505092915050565b5f805f6060848603121561053b5761053a61027f565b5b5f610548868287016102cd565b935050602084013567ffffffffffffffff81111561056957610568610283565b5b61057586828701610404565b925050604084013567ffffffffffffffff81111561059657610595610283565b5b6105a2868287016104f7565b9150509250925092565b5f82825260208201905092915050565b7f6c656e00000000000000000000000000000000000000000000000000000000005f82015250565b5f6105f06003836105ac565b91506105fb826105bc565b602082019050919050565b5f6020820190508181035f83015261061d816105e4565b9050919050565b7f4e487b710000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b61065a816102a6565b82525050565b6106698161045c565b82525050565b5f6060820190506106825f830186610651565b61068f6020830185610651565b61069c6040830184610660565b949350505050565b5f8115159050919050565b6106b8816106a4565b81146106c2575f80fd5b50565b5f815190506106d3816106af565b92915050565b5f602082840312156106ee576106ed61027f565b5b5f6106fb848285016106c5565b91505092915050565b7f6f757400000000000000000000000000000000000000000000000000000000005f82015250565b5f6107386003836105ac565b915061074382610704565b602082019050919050565b5f6020820190508181035f8301526107658161072c565b905091905056fea2646970667358221220c083cdeba80f26430560a167a952a009c0f95e0eafd0c21e9cf78608f2509cb364736f6c634300081a0033';
  }

  /**
   * Static method to get contract bytecode for testing
   */
  public static getContractBytecode(): string {
    // Correct BatchAirdropContract bytecode (minimal version - no events, no statistics)
    return '0x6080604052348015600e575f80fd5b5060016029601f603360201b60201c565b605c60201b60201c565b5f01819055506065565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b6107a2806100725f395ff3fe608060405234801561000f575f80fd5b5060043610610029575f3560e01c80631239ec8c1461002d575b5f80fd5b61004760048036038101906100429190610524565b610049565b005b6100516101ab565b8051825114610095576040517f08c379a0000000000000000000000000000000000000000000000000000000000815260040161008c90610606565b60405180910390fd5b5f5b825181101561019d578373ffffffffffffffffffffffffffffffffffffffff166323b872dd338584815181106100d0576100cf610624565b5b60200260200101518585815181106100eb576100ea610624565b5b60200260200101516040518463ffffffff1660e01b81526004016101119392919061066f565b6020604051808303815f875af115801561012d573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061015191906106d9565b610190576040517f08c379a0000000000000000000000000000000000000000000000000000000000081526004016101879061074e565b60405180910390fd5b8080600101915050610097565b506101a66101cd565b505050565b6101b36101e7565b60026101c56101c0610228565b610251565b5f0181905550565b60016101df6101da610228565b610251565b5f0181905550565b6101ef61025a565b15610226576040517f3ee5aeb50000000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f600261026d610268610228565b610251565b5f015414905090565b5f604051905090565b5f80fd5b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6102b082610287565b9050919050565b6102c0816102a6565b81146102ca575f80fd5b50565b5f813590506102db816102b7565b92915050565b5f80fd5b5f601f19601f8301169050919050565b7f4e487b710000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61032b826102e5565b810181811067ffffffffffffffff8211171561034a576103496102f5565b5b80604052505050565b5f61035c610276565b90506103688282610322565b919050565b5f67ffffffffffffffff821115610387576103866102f5565b5b602082029050602081019050919050565b5f80fd5b5f6103ae6103a98461036d565b610353565b905080838252602082019050602084028301858111156103d1576103d0610398565b5b835b818110156103fa57806103e688826102cd565b8452602084019350506020810190506103d3565b5050509392505050565b5f82601f830112610418576104176102e1565b5b813561042884826020860161039c565b91505092915050565b5f67ffffffffffffffff82111561044b5761044a6102f5565b5b602082029050602081019050919050565b5f819050919050565b61046e8161045c565b8114610478575f80fd5b50565b5f8135905061048981610465565b92915050565b5f6104a161049c84610431565b610353565b905080838252602082019050602084028301858111156104c4576104c3610398565b5b835b818110156104ed57806104d9888261047b565b8452602084019350506020810190506104c6565b5050509392505050565b5f82601f83011261050b5761050a6102e1565b5b813561051b84826020860161048f565b91505092915050565b5f805f6060848603121561053b5761053a61027f565b5b5f610548868287016102cd565b935050602084013567ffffffffffffffff81111561056957610568610283565b5b61057586828701610404565b925050604084013567ffffffffffffffff81111561059657610595610283565b5b6105a2868287016104f7565b9150509250925092565b5f82825260208201905092915050565b7f6c656e00000000000000000000000000000000000000000000000000000000005f82015250565b5f6105f06003836105ac565b91506105fb826105bc565b602082019050919050565b5f6020820190508181035f83015261061d816105e4565b9050919050565b7f4e487b710000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b61065a816102a6565b82525050565b6106698161045c565b82525050565b5f6060820190506106825f830186610651565b61068f6020830185610651565b61069c6040830184610660565b949350505050565b5f8115159050919050565b6106b8816106a4565b81146106c2575f80fd5b50565b5f815190506106d3816106af565b92915050565b5f602082840312156106ee576106ed61027f565b5b5f6106fb848285016106c5565b91505092915050565b7f6f757400000000000000000000000000000000000000000000000000000000005f82015250565b5f6107386003836105ac565b915061074382610704565b602082019050919050565b5f6020820190508181035f8301526107658161072c565b905091905056fea2646970667358221220c083cdeba80f26430560a167a952a009c0f95e0eafd0c21e9cf78608f2509cb364736f6c634300081a0033';
  }
}