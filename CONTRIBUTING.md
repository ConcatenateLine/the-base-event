# Contributing to The Base Event

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ConcatenateLine/the-base-event.git
cd the-base-event

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for pre-commit hooks

Run linting and formatting before committing:

```bash
npm run lint:fix
npm run format
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run benchmarks
npm run bench
```

## Project Structure

```
src/
├── core/           # Core event emitter
├── adapters/       # Framework adapters (React, Angular, Vue, Node)
├── security/      # Optional security module
├── migration/     # Migration utilities
└── test/          # Test suites
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
refactor: code refactoring
test: add/update tests
chore: maintenance
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit with conventional commit messages
6. Push to your fork
7. Open a Pull Request

## Release Process

Releases are automated via semantic-release. The release workflow:
1. PRs to `main` trigger version bumps based on commit messages
2. Merging to `main` triggers the release workflow
3. npm publish happens automatically

## Code of Conduct

Be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## Questions?

Open an issue for questions about contributing.
