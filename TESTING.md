# Testing Guide

This document provides a comprehensive guide for testing the Batch Airdrop Desktop application.

## Overview

Our testing strategy includes multiple layers:

1. **Unit Tests** - Individual service and utility function tests
2. **Component Tests** - React component testing with mocked dependencies
3. **Integration Tests** - Full workflow and API endpoint testing
4. **E2E Tests** - End-to-end application testing with Playwright
5. **Testnet Tests** - Real blockchain transaction testing

## Quick Start

### Run All Tests

```bash
# Install dependencies first
npm install

# Run the comprehensive test suite
npm run test:runner
```

### Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Component tests only
npm run test:component

# Integration tests only
npm run test:integration

# E2E tests (requires setup)
npm run test:e2e

# Testnet tests (requires ETH on Sepolia)
npm run test:testnet
```

## Test Categories

### 1. Unit Tests (`src/__tests__/services/`)

Test individual backend services and utilities:

- **ContractService**: Smart contract deployment and interaction
- **GasService**: Gas price estimation and optimization
- **CampaignService**: Campaign management and database operations
- **WalletService**: Wallet generation and security

```bash
npm run test:unit
npm run test:unit -- --watch  # Watch mode
npm run test:unit -- --coverage  # Coverage report
```

### 2. Component Tests (`src/__tests__/components/`)

Test React components with mocked Electron APIs:

- **Dashboard**: Main dashboard display and statistics
- **CampaignCreate**: Campaign creation workflow
- **CampaignDetail**: Campaign execution and management
- **History**: Campaign history and reporting

```bash
npm run test:component
npm run test:component -- --watch
```

### 3. Integration Tests (`src/__tests__/integration/`)

Test complete workflows and API integration:

- **Complete Workflow**: Full campaign creation to execution
- **API Endpoints**: REST API functionality
- **Database Consistency**: Data integrity across operations

```bash
npm run test:integration
```

### 4. E2E Tests (`src/__tests__/e2e/`)

End-to-end testing with real browser automation:

- **User Workflows**: Complete user journeys
- **Cross-browser**: Chrome, Firefox, Safari testing
- **Responsive Design**: Mobile and desktop layouts

#### E2E Setup

```bash
# Install Playwright browsers
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Interactive mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Generate new tests
npm run test:e2e:codegen
```

### 5. Testnet Tests (`src/__tests__/testnet/`)

Real blockchain transaction testing:

- **Sepolia Testnet**: Ethereum Sepolia network testing
- **Smart Contract Deployment**: Real contract deployment
- **Token Transfers**: Actual ERC20 token transfers
- **Gas Estimation**: Real gas price testing

#### Testnet Setup

1. **Get Test ETH**:
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Get test ETH for your wallet

2. **Configure Test Wallet**:
   - Update the private key in `ethereum-testnet.test.ts`
   - Ensure sufficient balance for gas fees

```bash
# Run testnet tests
npm run test:testnet
```

## Test Runner

Use the custom test runner for comprehensive testing:

```bash
# List all available test suites
npm run test:runner -- --list

# Run specific suites
npm run test:runner -- --suites "Unit Tests,Component Tests"

# Run all tests with detailed reporting
npm run test:runner
```

## Configuration

### Jest Configuration (`jest.config.mjs`)

- TypeScript support
- Mock environment setup
- Coverage reporting
- Test timeout configuration

### Playwright Configuration (`playwright.config.ts`)

- Multiple browser support
- Mobile testing
- Screenshot/video capture
- Parallel execution

### Test Environment Variables

```bash
# CI environment
CI=true

# Test network configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

## Mocking Strategy

### Electron API Mocking

All Electron APIs are mocked for testing:

```typescript
// Example mock setup
window.electronAPI = {
  campaign: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  wallet: {
    generate: jest.fn(),
    unlock: jest.fn(),
  }
};
```

### Blockchain Mocking

Ethers.js is mocked for unit tests:

```typescript
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
  }
}));
```

## Coverage Reports

Generate detailed coverage reports:

```bash
# Generate coverage for all tests
npm run test:coverage

# Coverage for specific test types
npm run test:unit -- --coverage
npm run test:component -- --coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Data Management

### Temporary Test Directories

Tests use temporary directories for file operations:

```typescript
// Create temp test directory
const testDir = createTempTestDir();

// Cleanup after test
await cleanupTempDir(testDir);
```

### Database Testing

Tests use in-memory SQLite databases:

```typescript
// Setup test database
const databaseService = new DatabaseService(':memory:');
await databaseService.init();
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main branch
- Release workflows

### CI Test Matrix

- Node.js 18, 20
- Ubuntu, Windows, macOS
- Chrome, Firefox, Safari

## Debugging Tests

### Unit/Component Tests

```bash
# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
npm run test:unit -- ContractService.test.ts
```

### E2E Tests

```bash
# Debug mode with browser
npm run test:e2e:debug

# Run tests with headed browser
npm run test:e2e -- --headed
```

### Testnet Debugging

```bash
# Run with verbose logging
DEBUG=* npm run test:testnet

# Run specific test
npm run test:testnet -- --testNamePattern="should deploy contract"
```

## Performance Testing

### Test Performance

```bash
# Run tests with performance monitoring
npm run test:unit -- --detectOpenHandles

# Measure test execution time
time npm run test:unit
```

### Benchmarking

```bash
# Run performance benchmarks
npm run test:performance
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**:
   - Increase test timeout in Jest config
   - Check for hanging promises

2. **Memory Leaks**:
   - Use `--detectOpenHandles` flag
   - Ensure proper cleanup in tests

3. **E2E Test Failures**:
   - Check browser versions
   - Verify Playwright installation

4. **Testnet Issues**:
   - Verify test ETH balance
   - Check RPC endpoint connectivity

### Getting Help

```bash
# Check Jest configuration
npx jest --showConfig

# Check Playwright configuration
npx playwright test --config playwright.config.ts --dry-run

# Validate test files
npx eslint src/__tests__/
```

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert Pattern**
2. **Descriptive Test Names**
3. **Test One Thing Per Test**
4. **Use Page Object Model for E2E**
5. **Mock External Dependencies**

### Test Maintenance

1. **Keep Tests Independent**
2. **Update Tests When Code Changes**
3. **Regular Test Reviews**
4. **Monitor Test Flakiness**
5. **Maintain High Coverage**

### Continuous Improvement

1. **Add Tests for New Features**
2. **Improve Test Coverage**
3. **Optimize Test Performance**
4. **Enhance Error Messages**
5. **Update Documentation Regularly**

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)

For specific questions or issues, refer to the test files or create an issue in the project repository.