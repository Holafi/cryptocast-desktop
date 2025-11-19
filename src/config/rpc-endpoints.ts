/**
 * Free RPC Endpoints Configuration
 * Using publicnode.com for reliable, free blockchain RPC access
 */

export const RPC_ENDPOINTS = {
  // Ethereum Mainnet
  ethereum: {
    name: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    symbol: 'ETH',
    decimals: 18
  },

  // Ethereum Testnets
  sepolia: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    symbol: 'ETH',
    decimals: 18
  },

  // Polygon Ecosystem
  polygon: {
    name: 'polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    blockExplorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    decimals: 18
  },

  'polygon-amoy': {
    name: 'polygon-amoy',
    chainId: 80002,
    rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com',
    blockExplorer: 'https://amoy.polygonscan.com',
    symbol: 'MATIC',
    decimals: 18
  },

  // Arbitrum Ecosystem
  arbitrum: {
    name: 'arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    blockExplorer: 'https://arbiscan.io',
    symbol: 'ETH',
    decimals: 18
  },

  // Optimism Ecosystem
  optimism: {
    name: 'optimism',
    chainId: 10,
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    blockExplorer: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
    decimals: 18
  },

  // Base Ecosystem
  base: {
    name: 'base',
    chainId: 8453,
    rpcUrl: 'https://base-rpc.publicnode.com',
    blockExplorer: 'https://basescan.org',
    symbol: 'ETH',
    decimals: 18
  },

  // Binance Smart Chain
  bsc: {
    name: 'bsc',
    chainId: 56,
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    blockExplorer: 'https://bscscan.com',
    symbol: 'BNB',
    decimals: 18
  },

  // Avalanche
  avalanche: {
    name: 'avalanche',
    chainId: 43114,
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    blockExplorer: 'https://snowtrace.io',
    symbol: 'AVAX',
    decimals: 18
  },

  // Linea
  linea: {
    name: 'linea',
    chainId: 59144,
    rpcUrl: 'https://linea-rpc.publicnode.com',
    blockExplorer: 'https://lineascan.build',
    symbol: 'ETH',
    decimals: 18
  },

  // Scroll
  scroll: {
    name: 'scroll',
    chainId: 534352,
    rpcUrl: 'https://scroll-rpc.publicnode.com',
    blockExplorer: 'https://scrollscan.com',
    symbol: 'ETH',
    decimals: 18
  },

  // Solana
  solana: {
    name: 'solana',
    chainId: 101, // Solana doesn't use standard chain IDs
    rpcUrl: 'https://solana-rpc.publicnode.com',
    blockExplorer: 'https://explorer.solana.com',
    symbol: 'SOL',
    decimals: 9
  }
} as const;

export type NetworkKey = keyof typeof RPC_ENDPOINTS;

/**
 * Get RPC endpoint configuration by key
 */
export function getRpcConfig(network: NetworkKey) {
  return RPC_ENDPOINTS[network];
}

/**
 * Get RPC endpoint by chain ID
 */
export function getRpcConfigByChainId(chainId: number) {
  return Object.values(RPC_ENDPOINTS).find(config => config.chainId === chainId);
}

/**
 * Get all mainnet networks
 */
export function getMainnetNetworks() {
  return Object.entries(RPC_ENDPOINTS)
    .filter(([_, config]) => !config.name.includes('testnet') && !config.name.includes('sepolia') && !config.name.includes('holesky'))
    .map(([key, config]) => ({ key: key as NetworkKey, ...config }));
}

/**
 * Get all testnet networks
 */
export function getTestnetNetworks() {
  return Object.entries(RPC_ENDPOINTS)
    .filter(([_, config]) => config.name.includes('testnet') || config.name.includes('sepolia') || config.name.includes('holesky'))
    .map(([key, config]) => ({ key: key as NetworkKey, ...config }));
}

/**
 * Default network for testing
 */
export const DEFAULT_TEST_NETWORK: NetworkKey = 'sepolia';

/**
 * Network categories
 */
export const NETWORK_CATEGORIES = {
  ETHEREUM_ECOSYSTEM: ['ethereum', 'sepolia', 'holesky'],
  L2_CHAINS: ['arbitrum', 'optimism', 'base', 'polygon'],
  ALTERNATIVE_L1: ['avalanche', 'fantom', 'bsc', 'gnosis', 'celo']
} as const;