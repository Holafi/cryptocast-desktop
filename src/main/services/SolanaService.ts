import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionSignature,
  Commitment
} from '@solana/web3.js';
// import { TokenService } from './TokenService';
// import { ChainUtils } from '../utils/chain-utils';
import { DEFAULTS } from '../config/defaults';
import { KeyUtils } from '../utils/keyUtils';
import {
  createTransferInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import BigNumber from 'bignumber.js';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance().child('SolanaService');

export interface SolanaBatchTransferResult {
  transactionHash: string;
  totalAmount: string;
  recipientCount: number;
  gasUsed: string;
  status: 'success' | 'partial' | 'failed';
  details?: Array<{
    address: string;
    amount: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export interface SolanaTokenInfo {
  address: string;
  decimals: number;
  symbol?: string;
  isNativeSOL: boolean;
  programId: PublicKey;
}

interface ATAInfo {
  owner: PublicKey;
  ata: PublicKey;
  amount: string;
}

export class SolanaService {
  private connection: Connection | null = null;

  /**
   * Initialize Solana connection
   */
  private initializeConnection(rpcUrl: string): Connection {
    if (!this.connection) {
      this.connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 120000, // 120秒超时 (increased from 60s for better success rate)
        httpHeaders: {
          'Connection': 'keep-alive'
        }
      });
    }
    return this.connection;
  }

  /**
   * Create Keypair from base64 private key
   */
  private createKeypairFromBase64(privateKeyBase64: string): Keypair {
    const privateKeyBytes = KeyUtils.decodeToSolanaBytes(privateKeyBase64);
    return Keypair.fromSecretKey(privateKeyBytes);
  }

  /**
   * Detect Token Program ID (Token Program v1 vs Token-2022)
   */
  private async detectTokenProgram(
    connection: Connection,
    mintAddress: PublicKey
  ): Promise<PublicKey> {
    const mintInfo = await connection.getAccountInfo(mintAddress);
    if (!mintInfo) {
      throw new Error('Mint account does not exist');
    }

    const owner = mintInfo.owner.toBase58();

    if (owner === TOKEN_PROGRAM_ID.toBase58()) {
      return TOKEN_PROGRAM_ID;
    }
    if (owner === TOKEN_2022_PROGRAM_ID.toBase58()) {
      return TOKEN_2022_PROGRAM_ID;
    }

    throw new Error(`Unknown Token Program ID: ${owner}`);
  }

  /**
   * Get token information
   */
  async getTokenInfo(rpcUrl: string, tokenAddress: string): Promise<SolanaTokenInfo> {
    try {
      const connection = this.initializeConnection(rpcUrl);

      // Check if it's native SOL
      if (tokenAddress.toLowerCase() === 'sol' || tokenAddress.toLowerCase() === 'native') {
        return {
          address: 'So11111111111111111111111111111111111111112',
          decimals: 9,
          symbol: 'SOL',
          isNativeSOL: true,
          programId: TOKEN_PROGRAM_ID
        };
      }

      const tokenMint = new PublicKey(tokenAddress);

      // Detect Token Program
      const programId = await this.detectTokenProgram(connection, tokenMint);
      logger.debug(`[SolanaService] Token Program detected`, {
        programType: programId.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token Program v1',
        tokenAddress
      });

      const tokenInfo = await connection.getParsedAccountInfo(tokenMint);

      if (!tokenInfo || !tokenInfo.value) {
        throw new Error('Invalid token address');
      }

      const parsedInfo = tokenInfo.value.data as any;
      const decimals = parsedInfo.parsed.info.decimals;

      return {
        address: tokenAddress,
        decimals,
        isNativeSOL: false,
        programId
      };
    } catch (error) {
      logger.error('[SolanaService] Failed to get token info', error as Error, {
        tokenAddress,
        rpcUrl
      });
      throw new Error(
        `Failed to get token info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(
    rpcUrl: string,
    walletPublicKey: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const connection = this.initializeConnection(rpcUrl);
      const publicKey = new PublicKey(walletPublicKey);

      if (!tokenAddress || tokenAddress.toLowerCase() === 'sol') {
        // Native SOL balance
        const balance = await connection.getBalance(publicKey);
        return (balance / LAMPORTS_PER_SOL).toString();
      } else {
        // SPL token balance
        const tokenMint = new PublicKey(tokenAddress);
        const programId = await this.detectTokenProgram(connection, tokenMint);
        const tokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          publicKey,
          false,
          programId
        );

        try {
          const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
          return tokenBalance.value.uiAmountString || '0';
        } catch (error) {
          // Token account does not exist
          return '0';
        }
      }
    } catch (error) {
      logger.error('[SolanaService] Failed to get balance', error as Error, {
        walletPublicKey,
        tokenAddress
      });
      return '0';
    }
  }

  /**
   * Batch SPL token transfer - optimized version
   * Process:
   * 1. Calculate all ATAs locally
   * 2. Batch query ATAs existence
   * 3. Batch create missing ATAs
   * 4. Batch send tokens
   */
  async batchTransfer(
    rpcUrl: string,
    privateKeyBase64: string,
    recipients: string[],
    amounts: string[],
    tokenAddress: string,
    batchSize: number = DEFAULTS.BATCH_SIZES.solana // Read default batch size from config file
  ): Promise<SolanaBatchTransferResult> {
    try {
      const connection = this.initializeConnection(rpcUrl);
      const wallet = this.createKeypairFromBase64(privateKeyBase64);

      // Get token information
      const tokenInfo = await this.getTokenInfo(rpcUrl, tokenAddress);

      logger.info('[SolanaService] Starting batch transfer', {
        recipientCount: recipients.length,
        tokenType: tokenInfo.isNativeSOL ? 'SOL' : 'SPL',
        programType: tokenInfo.programId.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token v1',
        batchSize
      });

      // ========== Step 1: Calculate all ATAs locally ==========
      const { ataList, skipped } = await this.calculateATAs(
        recipients,
        amounts,
        tokenInfo,
        wallet.publicKey
      );

      // Add failure records for skipped addresses
      const skippedDetails = skipped.map(item => ({
        address: item.address,
        amount: item.amount,
        status: 'failed' as const,
        error: `Invalid address: ${item.error}`
      }));

      if (!tokenInfo.isNativeSOL) {
        // ========== Step 2: Batch query ATAs existence ==========
        const missingATAs = await this.checkMissingATAs(connection, ataList);

        logger.debug('[SolanaService] Missing ATAs detected', { missingCount: missingATAs.length });

        // ========== Step 3: Batch create missing ATAs ==========
        if (missingATAs.length > 0) {
          await this.batchCreateATAs(connection, wallet, missingATAs, tokenInfo, batchSize);
        }
      }

      // ========== Step 4: Batch send tokens ==========
      const results = await this.batchTransferTokens(
        connection,
        wallet,
        ataList,
        tokenInfo,
        batchSize
      );

      // Calculate total amount
      const totalAmount = amounts.reduce((sum: BigNumber, amount: string) => {
        return sum.plus(new BigNumber(amount || '0'));
      }, new BigNumber(0));

      const allDetails = [...skippedDetails, ...results.details];
      const successCount = allDetails.filter(r => r.status === 'success').length;

      return {
        transactionHash: results.transactionHashes.join(','),
        totalAmount: totalAmount.toString(),
        recipientCount: successCount,
        gasUsed: results.totalGasUsed.toString(),
        status:
          successCount === recipients.length ? 'success' : successCount > 0 ? 'partial' : 'failed',
        details: allDetails
      };
    } catch (error) {
      logger.error('[SolanaService] Solana batch transfer failed', error as Error, {
        recipientCount: recipients.length,
        tokenAddress
      });
      const errorMsg = error instanceof Error ? error.message || error.toString() : String(error);
      throw new Error(`Solana batch transfer failed: ${errorMsg}`);
    }
  }

  /**
   * Get recommended priority fee based on recent network activity
   */
  private async getRecommendedPriorityFee(connection: Connection): Promise<number> {
    try {
      const recentFees = await connection.getRecentPrioritizationFees();
      if (recentFees && recentFees.length > 0) {
        // Use 95th percentile for maximum confirmation rate (increased from 90th)
        const sorted = recentFees
          .map(f => f.prioritizationFee)
          .filter(fee => fee > 0)
          .sort((a, b) => a - b);

        if (sorted.length > 0) {
          const index = Math.floor(sorted.length * 0.95);
          const recommendedFee = sorted[index];
          // Increased minimum to 10000, maximum to 500000 for guaranteed confirmation
          // 500000 micro-lamports = 0.0005 SOL per transaction
          const clampedFee = Math.min(Math.max(recommendedFee, 10000), 500000);

          logger.debug('[SolanaService] Dynamic priority fee calculated', {
            recommendedFee,
            clampedFee,
            sampleSize: sorted.length,
            percentile: '95th',
            costInSOL: (clampedFee / 1000000).toFixed(6)
          });

          return clampedFee;
        }
      }
    } catch (error) {
      logger.warn('[SolanaService] Failed to get priority fees, using default', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Fallback to higher default value for better success rate
    return 20000;
  }

  /**
   * Send and confirm transaction with retry mechanism
   * This replaces the blocking sendAndConfirmTransaction with better error handling
   */
  private async sendAndConfirmTransactionWithRetry(
    connection: Connection,
    transaction: Transaction,
    signers: Keypair[],
    commitment: Commitment = 'confirmed',
    maxRetries: number = 10 // Increased from 5 to 10 for better success rate
  ): Promise<{ signature: TransactionSignature; gasUsed: number }> {
    // Get latest blockhash with 'confirmed' commitment for better performance
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = signers[0].publicKey;

    // Sign transaction
    transaction.sign(...signers);

    // Serialize transaction once (will be reused for replay)
    const rawTransaction = transaction.serialize();

    // Send transaction initially
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      maxRetries: 0, // We handle retries ourselves
      preflightCommitment: 'processed'
    });

    logger.debug('[SolanaService] Transaction sent', {
      signature: signature.substring(0, 20) + '...',
      blockhash: blockhash.substring(0, 20) + '...',
      lastValidBlockHeight
    });

    // Confirm transaction with retry and replay mechanism
    let confirmed = false;
    let gasUsed = 0;
    let replayCount = 0;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // Replay transaction every 2 seconds to increase confirmation probability
        // This is safe because Solana network deduplicates transactions by signature
        if (retry > 0 && retry % 2 === 0) {
          try {
            await connection.sendRawTransaction(rawTransaction, {
              skipPreflight: true, // Skip preflight on replay to save time
              maxRetries: 0
            });
            replayCount++;
            logger.debug('[SolanaService] Transaction replayed', {
              signature: signature.substring(0, 20) + '...',
              replayCount
            });
          } catch (replayError) {
            // Ignore replay errors (transaction might already be confirmed)
            logger.debug('[SolanaService] Replay failed (likely already confirmed)', {
              signature: signature.substring(0, 20) + '...',
              error: replayError instanceof Error ? replayError.message : String(replayError)
            });
          }
        }

        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight
          },
          commitment
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        confirmed = true;

        // Get gas used
        try {
          const txDetails = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          });
          gasUsed = txDetails?.meta?.fee || 0;
        } catch (error) {
          logger.warn('[SolanaService] Failed to get transaction fee', {
            signature,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        logger.debug('[SolanaService] Transaction confirmed', {
          signature: signature.substring(0, 20) + '...',
          retry,
          replayCount,
          gasUsed
        });

        break;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isBlockHeightExceeded = errorMsg.includes('block height exceeded') || errorMsg.includes('has expired');
        const isLastRetry = retry === maxRetries - 1;

        // If blockhash has expired, immediately check on-chain status instead of continuing retries
        if (isBlockHeightExceeded) {
          logger.warn('[SolanaService] Blockhash expired, checking on-chain transaction status', {
            signature: signature.substring(0, 20) + '...',
            retry,
            error: errorMsg
          });

          try {
            const status = await connection.getSignatureStatus(signature);
            const confirmationStatus = status?.value?.confirmationStatus;

            if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
              logger.info('[SolanaService] Transaction succeeded on-chain despite expired blockhash', {
                signature: signature.substring(0, 20) + '...',
                confirmationStatus
              });

              // Get gas used
              try {
                const txDetails = await connection.getTransaction(signature, {
                  maxSupportedTransactionVersion: 0,
                  commitment: 'confirmed'
                });
                gasUsed = txDetails?.meta?.fee || 0;
              } catch (e) {
                // Ignore
              }

              confirmed = true;
              break;
            } else {
              // Transaction did not land on-chain before blockhash expired
              const expiredError = new Error(`Transaction expired: blockhash exceeded before confirmation. Transaction may have been dropped.`);
              logger.error('[SolanaService] Transaction lost - blockhash expired before confirmation', expiredError, {
                signature: signature.substring(0, 20) + '...',
                confirmationStatus: confirmationStatus || 'null'
              });
              throw expiredError;
            }
          } catch (statusError) {
            if (statusError instanceof Error && statusError.message.includes('Transaction expired')) {
              throw statusError;
            }
            logger.error('[SolanaService] Failed to check status of expired transaction', statusError as Error, {
              signature
            });
            throw new Error(`Blockhash expired and status check failed: ${statusError instanceof Error ? statusError.message : String(statusError)}`);
          }
        }

        if (isLastRetry) {
          // Last retry failed, check actual status one more time
          logger.warn('[SolanaService] Confirmation timeout, checking final status', {
            signature,
            retry
          });

          try {
            const status = await connection.getSignatureStatus(signature);
            const confirmationStatus = status?.value?.confirmationStatus;

            if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
              logger.info('[SolanaService] Transaction actually succeeded despite timeout', {
                signature: signature.substring(0, 20) + '...',
                confirmationStatus
              });

              // Get gas used
              try {
                const txDetails = await connection.getTransaction(signature, {
                  maxSupportedTransactionVersion: 0,
                  commitment: 'confirmed'
                });
                gasUsed = txDetails?.meta?.fee || 0;
              } catch (e) {
                // Ignore
              }

              confirmed = true;
              break;
            }
          } catch (statusError) {
            logger.error(
              '[SolanaService] Failed to check final transaction status',
              statusError as Error,
              {
                signature
              }
            );
          }

          // Really failed
          throw error;
        }

        // Exponential backoff
        const delay = 2000 * Math.pow(1.5, retry);
        logger.warn('[SolanaService] Confirmation attempt failed, retrying', {
          signature: signature.substring(0, 20) + '...',
          retry: retry + 1,
          maxRetries,
          nextRetryDelay: delay,
          error: errorMsg
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!confirmed) {
      // CRITICAL: Before throwing error, check on-chain status to prevent double-spend
      logger.warn('[SolanaService] Confirmation timeout, performing final on-chain check', {
        signature: signature.substring(0, 20) + '...'
      });

      try {
        const finalStatus = await connection.getSignatureStatus(signature);
        const finalConfirmation = finalStatus?.value?.confirmationStatus;

        if (finalConfirmation === 'confirmed' || finalConfirmation === 'finalized') {
          logger.info('[SolanaService] Transaction confirmed on-chain despite timeout', {
            signature: signature.substring(0, 20) + '...',
            confirmationStatus: finalConfirmation
          });

          // Get gas used
          try {
            const txDetails = await connection.getTransaction(signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            });
            gasUsed = txDetails?.meta?.fee || 0;
          } catch (e) {
            // Ignore gas fetch error
          }

          return { signature, gasUsed };
        }
      } catch (statusError) {
        logger.error('[SolanaService] Final status check failed', statusError as Error, {
          signature
        });
      }

      throw new Error('Transaction confirmation failed after all retries');
    }

    return { signature, gasUsed };
  }

  /**
   * Calculate compute unit limit based on operation type and batch size
   */
  private calculateComputeUnitLimit(
    operationType: 'ata_creation' | 'transfer',
    batchSize: number,
    isNativeSOL: boolean
  ): number {
    if (operationType === 'ata_creation') {
      // ATA creation is more expensive: ~40,000 per ATA
      return Math.min(batchSize * 45000 + 50000, 1400000); // Max 1.4M units
    } else {
      // Transfer operations
      if (isNativeSOL) {
        // Native SOL transfers are cheap: ~300 per transfer
        return Math.min(batchSize * 1000 + 20000, 400000);
      } else {
        // SPL token transfers: ~25,000 per transfer
        return Math.min(batchSize * 30000 + 50000, 1400000); // Max 1.4M units
      }
    }
  }

  /**
   * Step 1: Calculate all ATAs locally (without RPC calls)
   */
  private async calculateATAs(
    recipients: string[],
    amounts: string[],
    tokenInfo: SolanaTokenInfo,
    senderPublicKey: PublicKey
  ): Promise<{
    ataList: ATAInfo[];
    skipped: Array<{ address: string; amount: string; error: string }>;
  }> {
    logger.debug('[SolanaService] Calculating all ATAs locally', {
      recipientCount: recipients.length
    });

    const ataList: ATAInfo[] = [];
    const skipped: Array<{ address: string; amount: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i++) {
      logger.debug(`[SolanaService] Processing ATA calculation`, {
        index: i + 1,
        total: recipients.length,
        address: recipients[i]
      });

      try {
        const owner = new PublicKey(recipients[i]);

        if (tokenInfo.isNativeSOL) {
          // SOL transfers don't need ATA, directly use user address
          ataList.push({
            owner,
            ata: owner, // For SOL transfers, ATA is the user address
            amount: amounts[i]
          });
        } else {
          // SPL tokens need ATA calculation
          const tokenMint = new PublicKey(tokenInfo.address);
          const ata = await getAssociatedTokenAddress(
            tokenMint,
            owner,
            false,
            tokenInfo.programId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          ataList.push({
            owner,
            ata,
            amount: amounts[i]
          });
        }
      } catch (error) {
        // Skip addresses that cause errors (e.g., off-curve addresses that cannot have ATAs)
        const errorName = error instanceof Error ? error.name : 'Unknown';
        logger.warn('[SolanaService] Skipping invalid address', {
          address: recipients[i],
          error: errorName
        });
        skipped.push({
          address: recipients[i],
          amount: amounts[i],
          error: errorName
        });
      }
    }

    logger.debug('[SolanaService] ATA calculation completed', {
      validCount: ataList.length,
      skippedCount: skipped.length
    });
    return { ataList, skipped };
  }

  /**
   * Step 2: Batch query ATAs existence (1 RPC call)
   */
  private async checkMissingATAs(connection: Connection, ataList: ATAInfo[]): Promise<ATAInfo[]> {
    logger.debug('[SolanaService] Checking for missing ATAs', { ataCount: ataList.length });

    const ataAddresses = ataList.map(item => item.ata);
    const accountInfos = await connection.getMultipleAccountsInfo(ataAddresses);

    const missing: ATAInfo[] = [];
    ataList.forEach((item, index) => {
      if (accountInfos[index] === null) {
        missing.push(item);
      }
    });

    logger.debug('[SolanaService] ATA check completed', { missingCount: missing.length });
    return missing;
  }

  /**
   * Step 3: Batch create ATAs
   * ATA creation instructions are large, recommended not to exceed 15 per batch
   * But we use user-set batchSize, maximum not exceeding 15
   */
  private async batchCreateATAs(
    connection: Connection,
    wallet: Keypair,
    missingATAs: ATAInfo[],
    tokenInfo: SolanaTokenInfo,
    userBatchSize: number
  ): Promise<void> {
    logger.info('[SolanaService] Starting batch ATA creation', { ataCount: missingATAs.length });

    const tokenMint = new PublicKey(tokenInfo.address);
    // ATA creation is more expensive and complex than transfers
    // Use a smaller batch size (max 5) to improve confirmation rate
    // This reduces transaction size and increases success probability
    const CREATE_BATCH_SIZE = Math.min(userBatchSize, 5);

    logger.debug('[SolanaService] ATA creation batch size', {
      batchSize: CREATE_BATCH_SIZE,
      userBatchSize,
      note: 'Using smaller batch size for ATA creation to improve success rate'
    });

    // Get recommended priority fee once for all ATA creation batches
    // Use 1.5x higher priority fee for ATA creation to improve confirmation rate
    const basePriorityFee = await this.getRecommendedPriorityFee(connection);
    const computeUnitPrice = Math.min(Math.floor(basePriorityFee * 1.5), 500000); // Cap at 500k

    logger.debug('[SolanaService] ATA creation priority fee boosted', {
      baseFee: basePriorityFee,
      boostedFee: computeUnitPrice,
      multiplier: 1.5
    });

    // Batch create
    for (let i = 0; i < missingATAs.length; i += CREATE_BATCH_SIZE) {
      const batch = missingATAs.slice(i, Math.min(i + CREATE_BATCH_SIZE, missingATAs.length));
      let tx = new Transaction(); // Use 'let' to allow reassignment in retry logic

      // Calculate appropriate compute unit limit based on batch size
      const computeUnitLimit = this.calculateComputeUnitLimit(
        'ata_creation',
        batch.length,
        tokenInfo.isNativeSOL
      );

      logger.debug('[SolanaService] ATA creation compute budget', {
        batchSize: batch.length,
        computeUnitPrice,
        computeUnitLimit,
        estimatedCost: (computeUnitPrice * computeUnitLimit) / 1000000 // lamports
      });

      tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: computeUnitPrice
        })
      );
      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: computeUnitLimit
        })
      );

      for (const item of batch) {
        const ix = createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          item.ata, // associatedToken
          item.owner, // owner
          tokenMint, // mint
          tokenInfo.programId, // programId
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        tx.add(ix);
      }

      let lastError: Error | null = null;
      let retryCount = 0;
      const maxRetries = 2; // Retry ATA creation up to 2 times with fresh blockhash

      while (retryCount <= maxRetries) {
        try {
          // Use new retry-based confirmation method
          const { signature, gasUsed } = await this.sendAndConfirmTransactionWithRetry(
            connection,
            tx,
            [wallet],
            'confirmed',
            10 // Max 10 retries (increased for better success rate)
          );

          logger.info('[SolanaService] ATA batch created successfully', {
            batchNumber: Math.floor(i / CREATE_BATCH_SIZE) + 1,
            signature,
            ataCount: batch.length,
            gasUsed,
            retryCount
          });

          lastError = null;
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          const isExpiredError = lastError.message.includes('expired') ||
                                 lastError.message.includes('block height exceeded');

          if (isExpiredError && retryCount < maxRetries) {
            // Blockhash expired, retry with fresh transaction
            logger.warn('[SolanaService] ATA creation expired, retrying with fresh blockhash', {
              batchNumber: Math.floor(i / CREATE_BATCH_SIZE) + 1,
              ataCount: batch.length,
              retryCount: retryCount + 1,
              maxRetries
            });

            // Recreate transaction with fresh blockhash
            tx = new Transaction();

            // Re-add compute budget instructions
            tx.add(
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: computeUnitPrice
              })
            );
            tx.add(
              ComputeBudgetProgram.setComputeUnitLimit({
                units: computeUnitLimit
              })
            );

            // Re-add ATA creation instructions
            for (const item of batch) {
              const ix = createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                item.ata,
                item.owner,
                tokenMint,
                tokenInfo.programId,
                ASSOCIATED_TOKEN_PROGRAM_ID
              );
              tx.add(ix);
            }

            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          } else {
            // Non-expiry error or max retries reached, throw immediately
            logger.error('[SolanaService] ATA batch creation failed', lastError, {
              batchNumber: Math.floor(i / CREATE_BATCH_SIZE) + 1,
              ataCount: batch.length,
              retryCount,
              isExpiredError
            });
            throw lastError;
          }
        }
      }

      // If we exhausted retries, throw the last error
      if (lastError !== null) {
        logger.error('[SolanaService] ATA batch creation failed after all retries', lastError, {
          batchNumber: Math.floor(i / CREATE_BATCH_SIZE) + 1,
          ataCount: batch.length,
          maxRetries
        });
        throw lastError;
      }

      // Reduced delay between batches (from 3s to 500ms)
      if (i + CREATE_BATCH_SIZE < missingATAs.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logger.info('[SolanaService] All ATAs created successfully', {
      totalCreated: missingATAs.length
    });
  }

  /**
   * Step 4: Batch send tokens (according to user-set batchSize)
   */
  private async batchTransferTokens(
    connection: Connection,
    wallet: Keypair,
    ataList: ATAInfo[],
    tokenInfo: SolanaTokenInfo,
    batchSize: number
  ): Promise<{
    transactionHashes: string[];
    totalGasUsed: number;
    details: Array<{
      address: string;
      amount: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
  }> {
    logger.info('[SolanaService] Starting batch token transfer', {
      batchSize,
      totalRecipients: ataList.length
    });

    const transactionHashes: string[] = [];
    const details: Array<{
      address: string;
      amount: string;
      status: 'success' | 'failed';
      error?: string;
    }> = [];
    let totalGasUsed = 0;

    // Sender's ATA (required for SPL tokens)
    let senderATA: PublicKey | undefined;
    if (!tokenInfo.isNativeSOL) {
      const tokenMint = new PublicKey(tokenInfo.address);
      senderATA = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey,
        false,
        tokenInfo.programId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    }

    // Get recommended priority fee once for all transfer batches
    const computeUnitPrice = await this.getRecommendedPriorityFee(connection);

    // Batch process
    for (let i = 0; i < ataList.length; i += batchSize) {
      const batch = ataList.slice(i, Math.min(i + batchSize, ataList.length));
      const batchNumber = Math.floor(i / batchSize) + 1;

      logger.debug('[SolanaService] Processing transfer batch', {
        batchNumber,
        startIndex: i + 1,
        endIndex: Math.min(i + batchSize, ataList.length)
      });

      // Pre-validate addresses to improve success rate
      const validRecipients: ATAInfo[] = [];
      const invalidRecipients: ATAInfo[] = [];

      for (const item of batch) {
        try {
          // Validate address format
          if (!tokenInfo.isNativeSOL) {
            // For SPL tokens, verify ATA is valid
            await connection.getAccountInfo(item.ata);
          }
          validRecipients.push(item);
        } catch (error) {
          logger.warn('[SolanaService] Invalid recipient in batch, skipping', {
            address: item.owner.toBase58(),
            error: error instanceof Error ? error.message : String(error)
          });
          invalidRecipients.push(item);
        }
      }

      // Record invalid recipients as failed
      if (invalidRecipients.length > 0) {
        invalidRecipients.forEach(item => {
          details.push({
            address: item.owner.toBase58(),
            amount: item.amount,
            status: 'failed',
            error: 'Invalid address or account not found'
          });
        });
      }

      // Skip batch if no valid recipients
      if (validRecipients.length === 0) {
        logger.warn('[SolanaService] No valid recipients in batch, skipping', { batchNumber });
        continue;
      }

      try {
        const tx = new Transaction();

        // Calculate appropriate compute unit limit based on operation and batch size
        const computeUnitLimit = this.calculateComputeUnitLimit(
          'transfer',
          validRecipients.length,
          tokenInfo.isNativeSOL
        );

        logger.debug('[SolanaService] Transfer compute budget', {
          batchSize: validRecipients.length,
          computeUnitPrice,
          computeUnitLimit,
          isNativeSOL: tokenInfo.isNativeSOL,
          estimatedCost: (computeUnitPrice * computeUnitLimit) / 1000000 // lamports
        });

        tx.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: computeUnitPrice
          })
        );
        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnitLimit
          })
        );

        for (const item of validRecipients) {
          if (tokenInfo.isNativeSOL) {
            // Native SOL transfer
            const lamports = Math.floor(parseFloat(item.amount) * LAMPORTS_PER_SOL);
            tx.add(
              SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: item.owner,
                lamports
              })
            );
          } else {
            // SPL token transfer
            const tokenMint = new PublicKey(tokenInfo.address);
            const transferAmount = BigInt(
              Math.floor(parseFloat(item.amount) * Math.pow(10, tokenInfo.decimals))
            );

            if (tokenInfo.programId.equals(TOKEN_2022_PROGRAM_ID)) {
              // Token-2022 uses transferChecked
              tx.add(
                createTransferCheckedInstruction(
                  senderATA!,
                  tokenMint,
                  item.ata,
                  wallet.publicKey,
                  transferAmount,
                  tokenInfo.decimals,
                  [],
                  tokenInfo.programId
                )
              );
            } else {
              // Token Program v1
              tx.add(
                createTransferInstruction(
                  senderATA!,
                  item.ata,
                  wallet.publicKey,
                  transferAmount,
                  [],
                  tokenInfo.programId
                )
              );
            }
          }
        }

        // Use new retry-based confirmation method
        const { signature, gasUsed } = await this.sendAndConfirmTransactionWithRetry(
          connection,
          tx,
          [wallet],
          'confirmed',
          10 // Max 10 retries (increased for better success rate)
        );

        totalGasUsed += gasUsed;
        transactionHashes.push(signature);

        // Mark all valid addresses as successful
        validRecipients.forEach(item => {
          details.push({
            address: item.owner.toBase58(),
            amount: item.amount,
            status: 'success'
          });
        });

        logger.info('[SolanaService] Transfer batch completed successfully', {
          batchNumber,
          signature,
          gasUsed,
          successCount: validRecipients.length,
          skippedCount: invalidRecipients.length
        });
      } catch (error) {
        logger.error('[SolanaService] Transfer batch failed', error as Error, { batchNumber });

        // Mark only valid recipients as failed (invalid ones already marked)
        validRecipients.forEach(item => {
          details.push({
            address: item.owner.toBase58(),
            amount: item.amount,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Batch execution failed'
          });
        });
      }

      // Reduced delay between batches (from 4s to 500ms)
      if (i + batchSize < ataList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logger.info('[SolanaService] All transfers completed', {
      transactionCount: transactionHashes.length,
      totalGasUsed
    });

    return {
      transactionHashes,
      totalGasUsed,
      details
    };
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(
    rpcUrl: string,
    transactionHash: string
  ): Promise<{
    status: 'confirmed' | 'pending' | 'failed';
    blockHeight?: number;
    error?: string;
    confirmations?: number;
  }> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = this.initializeConnection(rpcUrl);

        // Use more efficient query method
        const [transaction, signatureStatuses] = await Promise.all([
          connection.getTransaction(transactionHash, {
            maxSupportedTransactionVersion: 0
          }),
          connection.getSignatureStatus(transactionHash, {
            searchTransactionHistory: false
          })
        ]);

        if (!transaction) {
          return { status: 'pending' };
        }

        if (transaction.meta?.err) {
          return {
            status: 'failed',
            error: `Transaction failed: ${JSON.stringify(transaction.meta.err)}`,
            blockHeight: (transaction as any).blockHeight || undefined
          };
        }

        // Check confirmation status
        const confirmations = signatureStatuses?.value?.confirmations || 0;

        return {
          status: 'confirmed',
          blockHeight: (transaction as any).blockHeight || undefined,
          confirmations
        };
      } catch (error) {
        logger.warn('[SolanaService] Failed to get transaction status', {
          attempt: attempt + 1,
          maxRetries,
          transactionHash,
          error: error instanceof Error ? error.message : String(error)
        });

        if (attempt === maxRetries - 1) {
          // Last attempt failed, return error
          return {
            status: 'failed',
            error: `Failed to check transaction status after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    // This case should theoretically never be reached, but for type safety
    return {
      status: 'failed',
      error: 'Unknown error in transaction status check'
    };
  }

  /**
   * Estimate batch transfer fees
   */
  async estimateBatchTransferFee(
    rpcUrl: string,
    recipientCount: number,
    isSPLToken: boolean
  ): Promise<number> {
    try {
      const connection = this.initializeConnection(rpcUrl);

      // Base transaction fee
      let baseFee = DEFAULTS.SOLANA_FEES.base_fee_per_signature;

      // SPL token transfers require additional fees (each transfer may need to create associated token accounts)
      if (isSPLToken) {
        baseFee += recipientCount * DEFAULTS.SOLANA_FEES.spl_account_creation_fee;
      }

      // Add some buffer
      const estimatedFee = baseFee * 1.2;

      return Math.ceil(estimatedFee);
    } catch (error) {
      logger.error('[SolanaService] Failed to estimate fee', error as Error, {
        recipientCount,
        isSPLToken
      });
      return DEFAULTS.SOLANA_FEES.spl_account_creation_fee;
    }
  }
}
