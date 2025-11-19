# Test Suite Documentation

## Overview

This directory contains the comprehensive test suite for the batch airdrop desktop application. The test suite covers unit tests, integration tests, and end-to-end tests to ensure application reliability and functionality.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Global test setup and teardown
├── utils/
│   └── testUtils.ts            # Test utilities and mock helpers
├── services/
│   ├── WalletService.test.ts   # Wallet service unit tests
│   ├── CampaignService.test.ts # Campaign service unit tests
│   └── PriceService.test.ts    # Price service unit tests
├── integration/
│   └── ipcHandlers.test.ts     # IPC handler integration tests
├── e2e/
│   └── workflow.test.ts        # End-to-end workflow tests
└── README.md                   # This documentation
```

## Test Categories

### Unit Tests

Unit tests test individual services and functions in isolation:

- **WalletService Tests**: Cryptographic operations, wallet creation, encryption/decryption
- **CampaignService Tests**: Campaign CRUD operations, status management, progress tracking
- **PriceService Tests**: Price fetching, caching, gas price monitoring

### Integration Tests

Integration tests test the interaction between components:

- **IPC Handler Tests**: Communication between main and renderer processes, error handling, event emission

### End-to-End Tests

E2E tests test complete user workflows:

- **Complete Campaign Workflow**: From wallet creation to campaign completion
- **Multi-Chain Operations**: Managing campaigns across different blockchains
- **File Operations**: CSV import and report export
- **Error Recovery**: System behavior under error conditions

## Running Tests

### Prerequisites

```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e

# Run tests silently (minimal output)
npm run test:silent
```

### Coverage Report

After running the coverage tests, a detailed report will be generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD integration

## Test Configuration

The test suite is configured via `jest.config.js` with the following settings:

- **Environment**: Node.js (for main process testing)
- **Transformer**: TypeScript compilation via ts-jest
- **Coverage**: All main process files, excluding test files and type definitions
- **Timeout**: 30 seconds for async operations
- **Setup**: Global setup via `src/__tests__/setup.ts`

## Mock Strategy

### External Dependencies

- **axios**: Mocked for API calls (CoinGecko, gas price APIs)
- **electron**: Mocked for Electron APIs (app, BrowserWindow, ipcMain)
- **fs**: Real filesystem operations for file-based tests

### Test Data

Test utilities provide:

- Temporary test directories with automatic cleanup
- Mock campaign, wallet, and chain data
- Helper functions for common test operations
- Price and gas price mock generators

## Test Best Practices

### Test Organization

1. **Descriptive Test Names**: Use `test('should do X when Y')` format
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification phases
3. **Test Isolation**: Each test should be independent and not rely on other tests
4. **Cleanup**: Use `beforeEach` and `afterEach` for proper resource management

### Error Testing

1. **Happy Path**: Test successful operations
2. **Error Cases**: Test invalid inputs, network failures, and system errors
3. **Edge Cases**: Test boundary conditions and unusual scenarios
4. **Recovery**: Test system behavior after errors

### Performance Testing

1. **Concurrent Operations**: Test multiple simultaneous operations
2. **Large Data Sets**: Test with realistic data volumes
3. **Memory Management**: Ensure proper cleanup and no memory leaks

## Debugging Tests

### VS Code Debugging

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Console Output

- Use `console.log` for debugging (muted in normal test runs)
- Run `npm run test:silent` to see only test failures
- Use `--verbose` flag for detailed test output

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

## Test Coverage Goals

- **Unit Tests**: >90% code coverage for core services
- **Integration Tests**: All IPC handlers and critical paths
- **E2E Tests**: Major user workflows and error scenarios

## Contributing

When adding new features:

1. Write tests before or alongside implementation
2. Ensure all tests pass before submitting PR
3. Maintain or improve overall test coverage
4. Update this documentation for new test patterns

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure test environment doesn't conflict with development server
2. **Database Locks**: Use unique test directories to prevent SQLite conflicts
3. **Async Timeouts**: Increase timeout for complex operations
4. **Mock Failures**: Verify mock setup matches actual implementation

### Test Performance

- Use `--runInBand` for debugging flaky tests
- Limit parallel execution for resource-intensive tests
- Clean up test data and connections properly

## Future Enhancements

- **Visual Testing**: Add screenshot-based UI testing
- **Load Testing**: Performance testing under high load
- **Contract Testing**: Smart contract integration testing
- **Security Testing**: Vulnerability scanning and security validation