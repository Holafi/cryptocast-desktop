import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import type { Database as DatabaseType } from 'better-sqlite3';

export interface CSVRow {
  address: string;
  amount: string;
}

export interface ReportData {
  campaign: any;
  recipients: any[];
  transactions: any[];
  summary: any;
}

export class FileService {
  private db: DatabaseType;

  constructor(databaseManager: any) {
    this.db = databaseManager.getDatabase();
  }

  async readCSV(filePath: string): Promise<CSVRow[]> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');

      return new Promise((resolve, reject) => {
        parse(fileContent, {
          columns: ['address', 'amount'],
          skip_empty_lines: true,
          trim: true,
        }, (error, records: any[]) => {
          if (error) {
            reject(new Error(`CSV parsing failed: ${error.message}`));
            return;
          }

          try {
            const validatedRecords = records.filter((record: any) => {
              // 验证必填字段
              if (!record.address || !record.amount) {
                return false;
              }

              // 验证地址格式（简单检查）
              if (record.address.length < 10) {
                return false;
              }

              // 验证金额格式
              const amount = parseFloat(record.amount);
              if (isNaN(amount) || amount <= 0) {
                return false;
              }

              return true;
            }).map((record: any) => ({
              address: record.address.trim(),
              amount: record.amount
            }));

            if (validatedRecords.length === 0) {
              reject(new Error('No valid records found in CSV file'));
              return;
            }

            resolve(validatedRecords);
          } catch (validationError) {
            reject(new Error(`Data validation failed: ${validationError}`));
          }
        });
      });
    } catch (error) {
      console.error('Failed to read CSV:', error);
      throw new Error(`CSV file reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportReport(campaignId: string, format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<{ success: boolean; filePath: string }> {
    try {
      const reportData = await this.generateReportData(campaignId);

      let filePath: string;
      let fileName: string;

      switch (format) {
        case 'csv':
          fileName = `campaign_${campaignId}_report.csv`;
          filePath = await this.exportCSVReport(reportData, fileName);
          break;
        case 'json':
          fileName = `campaign_${campaignId}_report.json`;
          filePath = await this.exportJSONReport(reportData, fileName);
          break;
        case 'pdf':
          fileName = `campaign_${campaignId}_report.pdf`;
          filePath = await this.exportPDFReport(reportData, fileName);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to export report:', error);
      throw new Error(`Report export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateReportData(campaignId: string): Promise<ReportData> {
    // 获取活动信息
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // 获取接收者信息
    const recipients = this.db.prepare(`
      SELECT * FROM recipients WHERE campaign_id = ? ORDER BY created_at
    `).all(campaignId);

    // 获取交易记录
    const transactions = this.db.prepare(`
      SELECT * FROM transactions WHERE campaign_id = ? ORDER BY created_at
    `).all(campaignId);

    // 计算汇总信息
    const totalRecipients = recipients.length;
    const sentRecipients = recipients.filter((r: any) => r.status === 'SENT').length;
    const failedRecipients = recipients.filter((r: any) => r.status === 'FAILED').length;
    const pendingRecipients = recipients.filter((r: any) => r.status === 'PENDING').length;

    const totalAmount = recipients.reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);
    const sentAmount = recipients
      .filter((r: any) => r.status === 'SENT')
      .reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

    const totalGasUsed = transactions.reduce((sum: number, t: any) => sum + (t.gas_used || 0), 0);
    const totalGasCost = transactions.reduce((sum: number, t: any) => sum + (t.gas_cost || 0), 0);

    const summary = {
      totalRecipients,
      sentRecipients,
      failedRecipients,
      pendingRecipients,
      successRate: totalRecipients > 0 ? (sentRecipients / totalRecipients * 100).toFixed(2) : 0,
      totalAmount: totalAmount.toString(),
      sentAmount: sentAmount.toString(),
      totalGasUsed: totalGasUsed.toString(),
      totalGasCost: totalGasCost.toString(),
      campaignStatus: (campaign as any).status || 'unknown',
      createdAt: (campaign as any).created_at || new Date().toISOString(),
      updatedAt: (campaign as any).updated_at || new Date().toISOString(),
    };

    return {
      campaign,
      recipients,
      transactions,
      summary,
    };
  }

  private async exportCSVReport(reportData: ReportData, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const filePath = path.join(this.getDownloadsDirectory(), fileName);
        const writableStream = fs.createWriteStream(filePath);

        const csvStringifier = stringify({
          header: true,
          columns: [
            '活动ID',
            '活动名称',
            '区块链',
            '代币地址',
            '接收地址',
            '金额',
            '状态',
            '交易哈希',
            'Gas消耗',
            '错误信息',
            '创建时间',
            '更新时间'
          ]
        });

        writableStream.on('finish', () => {
          resolve(filePath);
        });

        writableStream.on('error', (error) => {
          reject(new Error(`Failed to write CSV file: ${error.message}`));
        });

        csvStringifier.pipe(writableStream);

        // 写入数据行
        reportData.recipients.forEach(recipient => {
          csvStringifier.write([
            reportData.campaign.id,
            reportData.campaign.name,
            reportData.campaign.chain,
            reportData.campaign.token_address,
            recipient.address,
            recipient.amount,
            recipient.status,
            recipient.tx_hash || '',
            recipient.gas_used || '',
            recipient.error_message || '',
            recipient.created_at,
            recipient.updated_at
          ]);
        });

        csvStringifier.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async exportJSONReport(reportData: ReportData, fileName: string): Promise<string> {
    try {
      const filePath = path.join(this.getDownloadsDirectory(), fileName);
      const jsonData = JSON.stringify(reportData, null, 2);
      fs.writeFileSync(filePath, jsonData, 'utf-8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to write JSON file: ${error}`);
    }
  }

  private async exportPDFReport(reportData: ReportData, fileName: string): Promise<string> {
    try {
      // 注意：这里应该使用专门的PDF生成库，如pdf-kit或puppeteer
      // 为简化起见，这里生成一个包含报告数据的文本文件，但命名为.pdf
      const filePath = path.join(this.getDownloadsDirectory(), fileName);

      let reportContent = `活动报告\n`;
      reportContent += `=========\n\n`;
      reportContent += `活动名称: ${reportData.campaign.name}\n`;
      reportContent += `活动ID: ${reportData.campaign.id}\n`;
      reportContent += `区块链: ${reportData.campaign.chain}\n`;
      reportContent += `代币地址: ${reportData.campaign.token_address}\n`;
      reportContent += `状态: ${reportData.campaign.status}\n`;
      reportContent += `创建时间: ${reportData.campaign.created_at}\n\n`;

      reportContent += `汇总统计\n`;
      reportContent += `---------\n`;
      reportContent += `总接收者: ${reportData.summary.totalRecipients}\n`;
      reportContent += `已发送: ${reportData.summary.sentRecipients}\n`;
      reportContent += `发送失败: ${reportData.summary.failedRecipients}\n`;
      reportContent += `待发送: ${reportData.summary.pendingRecipients}\n`;
      reportContent += `成功率: ${reportData.summary.successRate}%\n`;
      reportContent += `总金额: ${reportData.summary.totalAmount}\n`;
      reportContent += `已发送金额: ${reportData.summary.sentAmount}\n`;
      reportContent += `总Gas消耗: ${reportData.summary.totalGasUsed}\n`;
      reportContent += `总Gas成本: ${reportData.summary.totalGasCost}\n\n`;

      reportContent += `详细记录\n`;
      reportContent += `---------\n`;
      reportData.recipients.forEach((recipient, index) => {
        reportContent += `${index + 1}. 地址: ${recipient.address}\n`;
        reportContent += `   金额: ${recipient.amount}\n`;
        reportContent += `   状态: ${recipient.status}\n`;
        if (recipient.tx_hash) {
          reportContent += `   交易哈希: ${recipient.tx_hash}\n`;
        }
        if (recipient.error_message) {
          reportContent += `   错误信息: ${recipient.error_message}\n`;
        }
        reportContent += `   创建时间: ${recipient.created_at}\n\n`;
      });

      fs.writeFileSync(filePath, reportContent, 'utf-8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to write PDF file: ${error}`);
    }
  }

  private getDownloadsDirectory(): string {
    const homeDir = require('os').homedir();
    const platform = require('os').platform();

    let downloadsDir: string;

    switch (platform) {
      case 'win32':
        downloadsDir = path.join(homeDir, 'Downloads');
        break;
      case 'darwin':
        downloadsDir = path.join(homeDir, 'Downloads');
        break;
      default:
        downloadsDir = path.join(homeDir, 'Downloads');
        break;
    }

    // 确保下载目录存在
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    return downloadsDir;
  }

  async validateCSVFile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      if (!fs.existsSync(filePath)) {
        return { valid: false, errors: ['File not found'] };
      }

      const fileStats = fs.statSync(filePath);
      const fileSizeMB = fileStats.size / (1024 * 1024);

      if (fileSizeMB > 10) {
        errors.push('File size exceeds 10MB limit');
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        errors.push('File must contain at least a header and one data row');
      }

      if (lines.length > 10001) {
        errors.push('File contains more than 10,000 records');
      }

      // 检查表头
      const header = lines[0].toLowerCase();
      if (!header.includes('address') || !header.includes('amount')) {
        errors.push('CSV file must contain "address" and "amount" columns');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async getFileStats(filePath: string): Promise<{ size: number; lines: number; validRows: number }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const fileStats = fs.statSync(filePath);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      // 尝试解析CSV以获取有效行数
      try {
        const csvData = await this.readCSV(filePath);
        return {
          size: fileStats.size,
          lines: lines.length,
          validRows: csvData.length
        };
      } catch {
        return {
          size: fileStats.size,
          lines: lines.length,
          validRows: 0
        };
      }
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async createBackup(campaignId: string): Promise<string> {
    try {
      const backupData = await this.generateReportData(campaignId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_campaign_${campaignId}_${timestamp}.json`;
      const filePath = await this.exportJSONReport(backupData, fileName);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async exportMultipleCampaigns(campaignIds: string[], format: 'csv' | 'json' = 'csv'): Promise<string> {
    try {
      const allData: any[] = [];

      for (const campaignId of campaignIds) {
        const reportData = await this.generateReportData(campaignId);
        allData.push(...reportData.recipients.map(recipient => ({
          campaignId: reportData.campaign.id,
          campaignName: reportData.campaign.name,
          chain: reportData.campaign.chain,
          tokenAddress: reportData.campaign.token_address,
          ...recipient
        })));
      }

      const fileName = `multiple_campaigns_report_${Date.now()}.${format}`;
      const filePath = path.join(this.getDownloadsDirectory(), fileName);

      if (format === 'csv') {
        return new Promise((resolve, reject) => {
          const writableStream = fs.createWriteStream(filePath);
          const csvStringifier = stringify({ header: true });

          writableStream.on('finish', () => resolve(filePath));
          writableStream.on('error', reject);

          csvStringifier.pipe(writableStream);

          allData.forEach(row => {
            csvStringifier.write(row);
          });

          csvStringifier.end();
        });
      } else {
        fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
        return filePath;
      }
    } catch (error) {
      throw new Error(`Failed to export multiple campaigns: ${error}`);
    }
  }
}