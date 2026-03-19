# @acroyoga/shared-ui

Cross-platform UI component library for the AcroYoga Community app, using design tokens from `@acroyoga/tokens`.

## Architecture

Each component follows a **5-file pattern**:

```
src/Button/
  Button.tsx          ← Shared types & props (headless)
  index.web.tsx       ← Web rendering (HTML + CSS tokens)
  index.native.tsx    ← React Native rendering (re-exports web for now)
  Button.test.tsx     ← Unit tests (renderToStaticMarkup)
  Button.stories.tsx  ← Storybook stories
```

## Component Registry

| Component | Variants | Tests | Stories | Tokens Used |
|-----------|----------|-------|---------|-------------|
| **Button** | `primary` `secondary` `outline` `ghost` × `sm` `md` `lg` | 8 | 6 | `--color-brand-*`, `--spacing-*`, `--radius-*` |
| **Card** | `default` `outlined` `elevated` | 4 | 4 | `--color-surface-*`, `--shadow-*`, `--radius-*` |
| **Avatar** | `sm` `md` `lg` `xl` | 5 | 5 | `--color-surface-*`, `--radius-full` |
| **Badge** | `default` `success` `warning` `error` `info` | 4 | 5 | `--color-semantic-*`, `--radius-full` |
| **Input** | `default` `error` `success` | 6 | 5 | `--color-surface-*`, `--spacing-*`, `--radius-md` |
| **TextArea** | `default` `error` `success` | 6 | 5 | `--color-surface-*`, `--spacing-*`, `--radius-md` |
| **Select** | `default` `error` `success` | 7 | 4 | `--color-surface-*`, `--spacing-*`, `--radius-md` |
| **Modal** | — | 4 | 1 | `--spacing-*`, `--radius-lg`, `--shadow-xl`, `--font-size-lg` |
| **Toast** | `info` `success` `warning` `error` | 5 | 5 | `--color-semantic-*`, `--spacing-*`, `--radius-md`, `--shadow-lg` |
| **EventCard** | — | 6 | 4 | `--color-brand-*`, `--color-semantic-*`, `--spacing-*` |
| **TeacherCard** | — | 5 | 4 | `--color-brand-*`, `--spacing-*`, `--radius-*` |
| **LoadingSpinner** | `sm` `md` `lg` | 4 | 3 | `--color-brand-primary`, `--spacing-*` |
| **OfflineBanner** | — | 4 | 2 | `--color-semantic-warning`, `--spacing-*` |
| **EmptyState** | — | 5 | 3 | `--color-surface-muted-foreground`, `--spacing-*` |
| **Skeleton** | `text` `circle` `rectangle` | 5 | 4 | `--color-surface-muted`, `--radius-*` |

**Totals: 15 components, 78 tests, 60 stories**

## Usage

```tsx
import { Button, Card, Input } from "@acroyoga/shared-ui";

function MyForm() {
  return (
    <Card>
      <Input label="Event Name" placeholder="Enter name…" />
      <Button variant="primary">Create Event</Button>
    </Card>
  );
}
```

## Accessibility

All components meet **WCAG 2.1 AA** standards:

- Semantic HTML elements (`<button>`, `<dialog>`, `<label>`)
- ARIA attributes (`aria-invalid`, `aria-label`, `aria-live`, `aria-labelledby`)
- Keyboard navigation support
- Error messages linked via `aria-describedby`
- Minimum 4.5:1 contrast ratio for body text, 3:1 for large text

## Development

```bash
# Run tests
npm run test -w @acroyoga/shared-ui

# View in Storybook (from repo root)
npm run storybook
```
