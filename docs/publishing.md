# NPM Publishing Guide

## Pre-requisites

1. **npm account** - Create at https://www.npmjs.com/
2. **2FA enabled** - Recommended for security
3. **Access to the package** - You need to be added as a maintainer

## Publishing Steps

### 1. Verify Build
```bash
npm run build
npm test
```

### 2. Check Package Configuration
Ensure `package.json` has:
- Correct name: `the-base-event`
- Version: `1.0.0`
- Repository URL configured
- Files to publish: `dist/`

### 3. Login to npm
```bash
npm login
```

### 4. Publish
```bash
npm publish
```

For scoped packages:
```bash
npm publish --access public
```

## Post-Publish

1. Create a GitHub release with the version tag
2. Update README badges (npm version, downloads)
3. Announce on social media

## Semantic Release (Automated)

The project is configured with semantic-release. To set up:

1. Add NPM token to GitHub secrets:
   - Go to GitHub repo Settings > Secrets
   - Add `NPM_TOKEN` with your npm access token

2. Add to `.releaserc.json`:
```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

3. Push to main with conventional commits to trigger release

## Distribution Tags

- `latest` - Default (stable releases)
- `beta` - Beta versions: `npm publish --tag beta`
- `next` - Alpha/beta releases: `npm publish --tag next`

## Troubleshooting

### Package name already taken
If `the-base-event` is taken, update `package.json` name to `@your-scope/the-base-event`

### Permission denied
```bash
npm owner add username the-base-event
```

### Build fails
```bash
npm run typecheck
npm run lint
```
