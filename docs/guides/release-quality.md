# Release Quality & Build Pipeline

This document details the Quality & Release improvements implemented for Phase 4 of The Base Event project.

## Overview

As of March 2025, the following release quality tasks have been completed:

- [x] Bundle optimization with tree-shaking
- [x] Type definition generation (.d.ts files)
- [x] Build pipeline automation
- [x] Package metadata configuration

## Build System

### Rollup Configuration

The project uses Rollup for building with multiple output formats:

```javascript
// rollup.config.js
export default [
  // ES Module build (tree-shakable)
  { format: 'es', file: 'dist/index.esm.js' },
  // CommonJS build
  { format: 'cjs', file: 'dist/index.js' },
  // UMD build (browser global)
  { format: 'umd', name: 'TheBaseEvent' },
  // Minified versions
];
```

### Output Artifacts

| File | Format | Purpose |
|------|--------|---------|
| `dist/index.esm.js` | ES Module | Tree-shakable for bundlers |
| `dist/index.js` | CommonJS | Node.js compatibility |
| `dist/index.umd.js` | UMD | Browser global variable |
| `dist/*.min.*` | Minified | Production builds |
| `dist/**/*.d.ts` | TypeScript | Type definitions |

### Build Commands

```bash
npm run build    # Build all formats
npm run dev      # Watch mode
npm run typecheck # TypeScript validation
```

## CI/CD Pipeline

### GitHub Actions Workflow

Located at: `.github/workflows/ci.yml`

The CI pipeline runs on:
- Push to `main`/`master` branches
- Pull requests to `main`/`master`

#### Jobs

1. **Test Job**
   - Runs on Node.js 18.x, 20.x, 22.x
   - Steps: install → lint → typecheck → test → build

2. **Benchmark Job**
   - Runs on Node.js 20.x
   - Executes performance benchmarks

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Package metadata, scripts, exports |
| `tsconfig.json` | TypeScript configuration |
| `jest.config.cjs` | Test configuration |
| `.eslintrc.cjs` | Linting rules |
| `.prettierrc` | Code formatting |

## Test Coverage

### Current Status

- **Statements**: 74.45%
- **Branches**: 60%
- **Functions**: 65%
- **Lines**: 74.55%

### Test Suites

- 16 test suites passing
- 781 tests passing
- Coverage thresholds configured in `jest.config.cjs`

### Excluded from Coverage

- Performance benchmark tests (`src/test/benchmark/`)
- Buffer manager performance tests (environment-dependent)

## Package.json Configuration

### Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./security": "./dist/security.js",
    "./react": "./dist/adapters/react.js",
    "./angular": "./dist/adapters/angular.js",
    "./vue": "./dist/adapters/vue.js"
  }
}
```

### Scripts

```json
{
  "scripts": {
    "build": "rollup -c",
    "test": "jest --config jest.config.cjs",
    "test:coverage": "jest --coverage --config jest.config.cjs",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "release": "semantic-release"
  }
}
```

## Known Issues

### Lint Errors

There are 12 pre-existing lint errors in the Vue and React adapter files related to unused variables. These do not affect functionality.

### Coverage Target

The original target was >95% coverage. The current coverage (~74%) reflects:
- Excluded benchmark tests (environment-dependent)
- Complex code paths that are difficult to test without realistic load

## Future Improvements

To reach 95% coverage, consider:
1. Adding tests for `src/core/events/pattern-match.ts` (10% coverage)
2. Adding tests for `src/core/middleware/validation.ts` (12% coverage)
3. Expanding React/Vue adapter tests

## Publishing

To publish to npm:

```bash
npm run build
npm test
npm publish
```

For automated releases, configure semantic-release with appropriate npm token.
