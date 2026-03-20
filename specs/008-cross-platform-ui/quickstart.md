# Quickstart: Cross-Platform Hot-Reloadable UI System

**Feature Branch**: `008-cross-platform-ui`  
**Created**: 2026-03-17  
**Status**: Complete

## Prerequisites

| Tool | Version | Required For | Install |
|------|---------|-------------|---------|
| Node.js | 24+ LTS | All development | [nodejs.org](https://nodejs.org) |
| npm | 11+ | Package management (ships with Node) | — |

> **Note**: Mobile prerequisites (Xcode, Android Studio, Expo CLI, EAS CLI, Watchman, CocoaPods) are deferred until mobile phases are implemented.

## Setup

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd acroyoga-community

# 2. Install all workspace dependencies (root + apps + packages)
npm install

# 3. Build design tokens (generates CSS, Swift, Kotlin, TS outputs)
npm run tokens:build

# 4. Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your DATABASE_URL, auth keys, Stripe keys, etc.

# 5. Run database migrations (web app)
npm run --workspace apps/web db:migrate

# 6. Seed geography data (web app)
npm run --workspace apps/web db:seed:geography
```

## Running the Component Development Environment

```bash
# Start Storybook (auto-opens at http://localhost:6006)
npm run storybook

# — or from the web app workspace specifically —
npm run --workspace apps/web storybook
```

Storybook features:
- **Component catalogue**: Browse all shared components with live previews
- **Controls**: Adjust props in real-time via the Controls panel
- **Viewport**: Toggle between mobile/tablet/desktop viewports
- **Theme**: Switch light/dark theme via toolbar toggle
- **Accessibility**: axe-core audit results in the Accessibility panel
- **Hot reload**: Edit any component or token file → preview updates in <1 second

## Running the Web App (Development)

```bash
# Start Next.js dev server with token watch mode
npm run dev

# This concurrently runs:
# - Style Dictionary watch (rebuilds tokens on change)
# - Next.js dev server (http://localhost:3000)
```

Design token hot-swap: Edit any `*.tokens.json` file → CSS custom properties rebuild → Next.js HMR picks up the change → browser updates without page reload.

## Design Token Workflow

```bash
# Build tokens once (all platforms)
npm run tokens:build

# Watch mode (rebuilds on file change)
npm run tokens:watch
```

**Adding a new token:**
1. Edit the relevant `packages/tokens/src/*.tokens.json` file
2. If watch mode is running, outputs regenerate automatically
3. Web: CSS custom properties update via HMR
4. Mobile: Restart the dev server to pick up new TS constants
5. CI: Contrast check runs automatically on build

## Using the UI Expert Agent

The UI Agent is defined in `.agent.md` at the project root. To invoke it in VS Code with GitHub Copilot:

1. Open the Chat panel (`Ctrl+Shift+I` / `Cmd+Shift+I`)
2. Switch to the **UI Expert** agent mode via the mode selector
3. Ask it to:
   - `"Create a new EventCard component"` — generates all platform files + story
   - `"Review this component for accessibility"` — checks ARIA, contrast, touch targets
   - `"Replace hardcoded colours with tokens"` — identifies and substitutes token references
   - `"Make this layout responsive"` — adds mobile-first breakpoints

## Building for Production

### Web

```bash
# Production build
npm run --workspace apps/web build
```

### Design Tokens

```bash
# Rebuild all token outputs
npm run tokens:build
```

## Workspace Scripts Summary

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web dev server + token watch |
| `npm run storybook` | Launch Storybook component environment |
| `npm run tokens:build` | Build all token platform outputs |
| `npm run tokens:watch` | Watch token files and rebuild on change |
| `npm run --workspace apps/web build` | Production web build |
| `npm test` | Run all tests across workspaces |
| `npm run lint` | Lint all workspaces |
