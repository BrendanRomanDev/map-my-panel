# Testing Guide

This document describes the testing strategy and infrastructure for Map My Panel.

## Overview

We use a multi-layered testing approach:

1. **Integration Tests** (Vitest) - Test business logic and data layer
2. **E2E Tests** (Playwright) - Test the full Electron application

## Testing Stack

- **Vitest** - Fast unit/integration testing with TypeScript support
- **Playwright** - End-to-end testing for Electron applications
- **@vitest/ui** - Interactive test UI for debugging

## Running Tests

```bash
# Run all tests (unit + e2e)
npm test

# Run only integration tests
npm run test:unit

# Run integration tests in watch mode
npm run test:unit:watch

# Run integration tests with UI
npm run test:unit:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with Playwright UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── integration/          # Integration tests (Vitest)
│   └── queryKeys.test.ts  # Tests for centralized query keys
└── e2e/                  # End-to-end tests (Playwright)
    ├── helpers/
    │   └── electron.ts   # Electron test utilities
    └── entity-management.spec.ts  # Entity CRUD tests
```

## Integration Tests

Integration tests validate business logic, data transformations, and utility functions.

### Query Key Tests

Located in `tests/integration/queryKeys.test.ts`, these tests ensure:

- Query keys are generated consistently
- Query key invalidation works correctly
- No query key collisions exist
- Helper functions return the correct set of queries

**Example:**

```typescript
import { describe, it, expect } from 'vitest'
import { queryKeys } from '../../src/renderer/lib/queryKeys'

describe('Query Keys', () => {
  it('should generate consistent entity query keys', () => {
    const panelId = 'panel-123'
    expect(queryKeys.entities.byPanel(panelId)).toEqual(['entities', 'panel-123'])
  })
})
```

### Adding Integration Tests

1. Create a new `.test.ts` file in `tests/integration/`
2. Import the code you want to test
3. Write tests using Vitest's API
4. Run tests with `npm run test:unit:watch` for live feedback

## E2E Tests

End-to-end tests verify the complete user workflows in the Electron application.

### Test Setup

The `tests/e2e/helpers/electron.ts` file provides utilities for launching Electron:

```typescript
import { test, expect } from './helpers/electron'

test('should load the application', async ({ window }) => {
  await expect(window).toBeTruthy()
})
```

### Entity Management Tests

Located in `tests/e2e/entity-management.spec.ts`, these tests cover:

- Assigning entities to breakers
- Editing entity properties
- Deleting entities with confirmation
- Removing entities from breakers

### Writing E2E Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import the electron test fixture
3. Use Playwright's API to interact with the UI
4. Add data-testid attributes to components for reliable selectors

**Example:**

```typescript
import { test, expect } from './helpers/electron'

test('should complete onboarding', async ({ window }) => {
  await window.click('button:has-text("Get Started")')
  await window.fill('input[placeholder="Panel Name"]', 'Main Panel')
  await window.click('button:has-text("Next")')
  // ... more steps
})
```

### Test Selectors

Use `data-testid` attributes for reliable element selection:

```tsx
// In component
<button data-testid="assign-entity-btn">Assign</button>

// In test
await window.click('[data-testid="assign-entity-btn"]')
```

**Recommended data-testids to add:**

- `app-loaded` - Root app element (for wait conditions)
- `entity-card` - Entity cards in lists
- `entity-name` - Entity name display
- `entity-edit-btn` - Edit button on entity cards
- `breaker-card` - Breaker cards in grid
- `assigned-entity` - Entity items in breaker detail
- `remove-entity-btn` - Remove button in breaker detail
- `close-breaker-detail` - Close button for breaker panel

## Centralized Query Keys

To prevent React Query cache invalidation bugs, all query keys are centralized in `src/renderer/lib/queryKeys.ts`.

### Using Query Keys

```typescript
import { queryKeys } from '../lib/queryKeys'

// In hooks
const { data } = useQuery({
  queryKey: queryKeys.entities.byPanel(panelId),
  queryFn: () => fetchEntities(panelId)
})

// In components (for invalidation)
queryClient.invalidateQueries({
  queryKey: queryKeys.entities.byPanel(panelId)
})
```

### Query Key Helpers

Use helper functions for complex invalidation scenarios:

```typescript
import { invalidateEntityBreakerQueries } from '../lib/queryKeys'

// When entity breaker assignment changes
const queriesToInvalidate = invalidateEntityBreakerQueries(
  panelId,
  oldBreakerId,
  newBreakerId
)

queriesToInvalidate.forEach(queryKey => {
  queryClient.invalidateQueries({ queryKey })
})
```

## Debugging Tests

### Integration Tests

```bash
# Run with UI for interactive debugging
npm run test:unit:ui

# Or use console.log in tests
it('should work', () => {
  const result = myFunction()
  console.log('Result:', result)
  expect(result).toBe(expected)
})
```

### E2E Tests

```bash
# Run in debug mode (opens inspector)
npm run test:e2e:debug

# Or use Playwright UI
npm run test:e2e:ui
```

**Playwright Debug Features:**

- Step through tests
- Inspect page state
- View console logs
- Take screenshots
- Record videos

### Viewing Screenshots & Videos

Failed E2E tests automatically capture:

- Screenshots (in `test-results/`)
- Videos (in `test-results/`)
- Traces (in `test-results/`)

Open the HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:unit

      - name: Build app
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Best Practices

### Integration Tests

1. **Test behavior, not implementation** - Focus on outputs, not internal details
2. **Keep tests fast** - Mock external dependencies
3. **Use descriptive test names** - Make failures easy to understand
4. **Group related tests** - Use `describe` blocks for organization

### E2E Tests

1. **Use data-testid** - Avoid brittle CSS selectors
2. **Wait for conditions** - Use `waitForSelector` instead of fixed delays
3. **Test user workflows** - Test complete scenarios, not individual actions
4. **Keep tests independent** - Each test should work in isolation
5. **Clean up after tests** - Reset database state between tests

### General

1. **Run tests before commits** - Catch bugs early
2. **Write tests for bugs** - Prevent regression
3. **Keep test code clean** - Apply same standards as production code
4. **Update tests when refactoring** - Keep tests in sync with code

## Troubleshooting

### "Cannot find module" errors

Make sure path aliases are configured in `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, './src/shared'),
    '@renderer': path.resolve(__dirname, './src/renderer'),
  },
}
```

### Electron tests hanging

- Ensure the app builds successfully: `npm run build`
- Check that the Electron path is correct in `electron.ts`
- Increase timeout in test: `test.setTimeout(30000)`

### Query invalidation not working

- Verify query keys match between hooks and invalidation
- Check that `queryClient` is the same instance
- Add debug logging to see which queries are being invalidated

### Tests pass locally but fail in CI

- Check Node.js version matches
- Ensure all dependencies are installed
- Review environment variables
- Check for race conditions or timing issues

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
