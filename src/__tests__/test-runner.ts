#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  critical: boolean;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    description: 'Test backend services and utilities',
    critical: true
  },
  {
    name: 'Component Tests',
    command: 'npm run test:component',
    description: 'Test React components and UI',
    critical: true
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    description: 'Test complete workflows and API endpoints',
    critical: true
  },
  {
    name: 'E2E Tests',
    command: 'npm run test:e2e',
    description: 'End-to-end application testing',
    critical: false
  },
  {
    name: 'Ethereum Testnet Tests',
    command: 'npm run test:testnet',
    description: 'Real blockchain transaction testing',
    critical: false
  }
];

class TestRunner {
  private results: Array<{
    suite: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    output?: string;
    error?: string;
  }> = [];

  private createReportsDir() {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    return reportsDir;
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let output = '';
    let error = '';

    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`📝 ${suite.description}`);

    try {
      // For non-critical tests, allow skipping if environment doesn't support them
      if (!suite.critical) {
        if (suite.name === 'E2E Tests' && !process.env.CI) {
          console.log('⏭️  Skipping E2E tests (not in CI environment)');
          status = 'skipped';
        } else if (suite.name === 'Ethereum Testnet Tests') {
          console.log('⚠️  Testnet tests require manual configuration');
          status = 'skipped';
        }
      }

      if (status === 'passed') {
        output = execSync(suite.command, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 300000 // 5 minutes timeout
        });
      }

    } catch (err: any) {
      status = 'failed';
      error = err.stdout || err.message;
      console.error(`❌ ${suite.name} failed:`);
      console.error(error);
    }

    const duration = Date.now() - startTime;

    this.results.push({
      suite: suite.name,
      status,
      duration,
      output: status === 'passed' ? output : undefined,
      error: status === 'failed' ? error : undefined
    });

    const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${statusEmoji} ${suite.name} completed in ${duration}ms (${status})`);
  }

  private generateReport(): void {
    const reportsDir = this.createReportsDir();
    const reportPath = path.join(reportsDir, `test-report-${Date.now()}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.results
    };

    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Test report saved to: ${reportPath}`);
  }

  private printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📋 Test Summary:');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.suite}`);
          if (r.error) {
            console.log(`    ${r.error.split('\n')[0]}`); // First line of error
          }
        });
    }

    if (skipped > 0) {
      console.log('\n⏭️  Skipped Tests:');
      this.results
        .filter(r => r.status === 'skipped')
        .forEach(r => {
          console.log(`  - ${r.suite}`);
        });
    }

    // Overall status
    const criticalFailed = this.results
      .filter(r => r.status === 'failed' && TEST_SUITES.find(s => s.name === r.suite)?.critical)
      .length;

    if (criticalFailed === 0 && failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else if (criticalFailed > 0) {
      console.log('\n🚨 Critical tests failed!');
      process.exit(1);
    } else {
      console.log('\n⚠️  Some non-critical tests failed, but core functionality is working');
    }
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n');

    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }

    this.generateReport();
    this.printSummary();
  }

  async runSpecific(suiteNames: string[]): Promise<void> {
    const selectedSuites = TEST_SUITES.filter(s => suiteNames.includes(s.name));

    if (selectedSuites.length === 0) {
      console.error(`❌ No test suites found matching: ${suiteNames.join(', ')}`);
      console.log('Available suites:', TEST_SUITES.map(s => s.name).join(', '));
      process.exit(1);
    }

    console.log(`🎯 Running specific test suites: ${suiteNames.join(', ')}\n`);

    for (const suite of selectedSuites) {
      await this.runTestSuite(suite);
    }

    this.generateReport();
    this.printSummary();
  }

  listSuites(): void {
    console.log('📋 Available Test Suites:');
    console.log('='.repeat(50));

    TEST_SUITES.forEach(suite => {
      const critical = suite.critical ? '🔴 Critical' : '🟡 Optional';
      console.log(`${critical} ${suite.name}`);
      console.log(`   ${suite.description}`);
      console.log(`   Command: ${suite.command}`);
      console.log('');
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Batch Airdrop Desktop Test Runner

Usage: npm run test-runner [options]

Options:
  --help, -h              Show this help message
  --list, -l              List available test suites
  --suites, -s <names>    Run specific suites (comma-separated)
  --all, -a               Run all test suites (default)

Examples:
  npm run test-runner                    # Run all tests
  npm run test-runner --list            # List available suites
  npm run test-runner --suites "Unit Tests,Component Tests"  # Run specific suites
    `);
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    runner.listSuites();
    return;
  }

  const suitesIndex = args.findIndex(arg => arg === '--suites' || arg === '-s');
  if (suitesIndex !== -1) {
    const suiteNames = args[suitesIndex + 1]?.split(',') || [];
    if (suiteNames.length === 0) {
      console.error('❌ Please specify test suites to run');
      process.exit(1);
    }
    await runner.runSpecific(suiteNames);
  } else {
    // Default: run all tests
    await runner.runAll();
  }
}

// Add testnet test command to package.json if not exists
if (require.main === module) {
  // Check if we need to add the testnet test script
  const packageJson = require('../../package.json');
  if (!packageJson.scripts['test:testnet']) {
    packageJson.scripts['test:testnet'] = 'jest --config jest.config.mjs --testPathPattern=src/__tests__/testnet';
    console.log('⚠️  Please add "test:testnet" script to package.json');
  }

  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}