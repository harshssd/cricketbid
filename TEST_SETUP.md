# Test Setup Documentation

## Overview

This document describes the comprehensive testing infrastructure set up for the CricketBid application. The testing framework includes unit tests, component tests, integration tests, and coverage reporting.

## Test Architecture

### Testing Stack
- **Jest**: JavaScript testing framework with TypeScript support
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction testing
- **@testing-library/jest-dom**: DOM-specific matchers

### Configuration Files

#### `jest.config.js`
- Next.js integration using `next/jest`
- TypeScript support with `babel-jest`
- JSDOM environment for browser-like testing
- Module path mapping for `@/` imports
- Coverage collection from `src/**` files
- Coverage thresholds: 70% for branches, functions, lines, and statements

#### `jest.setup.js`
- Global test setup and mocks
- Next.js router mocking
- Supabase client mocking
- React Hook Form mocking
- Toast notification mocking
- Framer Motion mocking
- Browser API mocks (localStorage, matchMedia, etc.)

## Test Structure

```
src/__tests__/
├── lib/                           # Core utility tests
│   ├── permissions.test.ts        # Permission system tests
│   └── validations/
│       └── auction.test.ts        # Validation schema tests
├── hooks/                         # Custom hook tests
│   └── useWizardForm.test.ts      # Wizard form hook tests
├── components/                    # Component tests
│   ├── organizations/
│   │   └── PermissionGate.test.tsx # Permission-based rendering tests
│   ├── ui/
│   │   └── button.test.tsx        # UI component tests
│   └── wizard/
│       └── WizardLayout.test.tsx  # Wizard layout tests
├── app/                           # Page component tests
│   ├── page.test.tsx              # Homepage tests
│   ├── auth/
│   │   └── signup.test.tsx        # Authentication page tests
│   └── auction/
│       └── create.test.tsx        # Auction creation page tests
└── integration/                   # Integration tests
    └── wizard-permission-flow.test.tsx # End-to-end workflow tests
```

## Test Categories

### 1. Core Utility Tests

#### Permission System (`permissions.test.ts`)
- **Coverage**: 98.18% lines, 97.22% branches
- Tests all permission checking functions
- Role-based access control validation
- Permission hierarchy verification
- Edge cases and error handling

#### Validation System (`auction.test.ts`)
- **Coverage**: 91.52% lines, 80% branches
- Zod schema validation testing
- Form data validation
- Budget constraint validation
- Complex validation scenarios

### 2. Hook Tests

#### Wizard Form Hook (`useWizardForm.test.ts`)
- **Coverage**: 84.16% lines, 38.63% branches
- Form state management testing
- Auto-save functionality
- Draft management
- Navigation and step progression
- Integration with validation system

### 3. Component Tests

#### Permission Gate (`PermissionGate.test.tsx`)
- Permission-based rendering
- Role hierarchy enforcement
- Error display and fallback handling
- Utility permission components

#### UI Components (`button.test.tsx`)
- Variant and size testing
- Accessibility compliance
- Event handling
- Custom styling integration

#### Wizard Layout (`WizardLayout.test.tsx`)
- Step navigation
- Progress tracking
- Loading states
- Auto-save integration

### 4. Page Component Tests

#### Homepage (`page.test.tsx`)
- Authentication state handling
- Supabase integration
- Responsive rendering
- Link and navigation testing

#### Authentication (`signup.test.tsx`)
- Form validation
- Supabase auth integration
- Error handling
- Loading states

#### Auction Creation (`create.test.tsx`)
- Wizard flow integration
- Step progression
- Form persistence
- Error recovery

### 5. Integration Tests

#### Wizard-Permission Flow (`wizard-permission-flow.test.tsx`)
- End-to-end auction creation workflow
- Permission system integration
- Form validation throughout the process
- Error recovery scenarios

## Mock Strategies

### External Dependencies
- **Supabase**: Comprehensive client mocking with auth and database methods
- **Next.js Router**: Navigation and routing mocks
- **localStorage/sessionStorage**: Complete storage API mocking
- **Browser APIs**: matchMedia, ResizeObserver, IntersectionObserver

### Component Mocking
- **React Hook Form**: Form state and validation mocking
- **Framer Motion**: Animation component mocking
- **Toast Notifications**: Success/error message mocking

## Running Tests

### Available Scripts
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# CI mode (no watch, with coverage)
npm run test:ci
```

### Test Patterns
```bash
# Run specific test file
npm test -- --testPathPatterns="permissions.test.ts"

# Run tests with specific pattern
npm test -- --testNamePattern="should validate"

# Run with verbose output
npm test -- --verbose
```

## Coverage Targets

The project maintains coverage thresholds of **70%** across:
- **Lines**: Statement coverage
- **Branches**: Conditional logic coverage
- **Functions**: Function execution coverage
- **Statements**: Overall statement coverage

### Current Coverage Highlights
- **Permissions System**: 98.18% line coverage
- **Validation System**: 91.52% line coverage
- **Wizard Hook**: 84.16% line coverage
- **UI Components**: 100% for tested components

## Key Testing Patterns

### 1. Arrange-Act-Assert (AAA)
All tests follow the AAA pattern for clarity and maintainability.

### 2. Mock Reset
Each test suite includes `beforeEach()` hooks to reset mocks and ensure test isolation.

### 3. Error Boundary Testing
Tests include both success and failure scenarios with proper error handling.

### 4. Accessibility Testing
Component tests include accessibility checks and proper ARIA attribute testing.

### 5. User-Centric Testing
Tests simulate real user interactions rather than implementation details.

## Best Practices

### Test Organization
- Group related tests using `describe()` blocks
- Use descriptive test names that explain the expected behavior
- Test both positive and negative cases
- Include edge cases and error scenarios

### Async Testing
- Use `waitFor()` for asynchronous operations
- Proper cleanup with `act()` for state updates
- Mock timers when testing delayed operations

### Component Testing
- Test user interactions, not implementation
- Verify accessibility and semantic HTML
- Test responsive behavior and error states
- Mock external dependencies appropriately

## Continuous Integration

The test suite is designed for CI/CD environments with:
- **Deterministic Results**: No flaky tests due to timing or external dependencies
- **Fast Execution**: Optimized mock strategies and parallel execution
- **Comprehensive Reporting**: Coverage reports and test result summaries
- **Error Isolation**: Failed tests don't affect others

## Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure `@/` path mapping is configured correctly
2. **Mock Dependencies**: All external dependencies must be mocked in `jest.setup.js`
3. **Async Operations**: Use appropriate async testing utilities
4. **Environment Variables**: Mock required environment variables for Supabase

### Debug Mode
```bash
# Run with debug logging
npm test -- --verbose --no-cache

# Run single test with debugging
npm test -- --testNamePattern="specific test" --detectOpenHandles
```

This testing infrastructure provides comprehensive coverage of the CricketBid application's core functionality while maintaining fast execution and reliable results.