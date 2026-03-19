# Quickstart: 007 — Simple UI Pages

**Feature Branch**: `007-simple-ui-pages`

## Prerequisites

- Node.js 20+
- Existing project cloned and `npm install` completed
- Database seeded (`npm run db:migrate && npm run db:seed:geography && npm run db:seed:admin`)

## Setup

### 1. Install Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

### 2. Create PostCSS config

Create `postcss.config.mjs` at project root:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### 3. Create globals.css

Create `src/app/globals.css`:

```css
@import "tailwindcss";
```

### 4. Import globals.css in root layout

In `src/app/layout.tsx`, add at the top:

```tsx
import "./globals.css";
```

### 5. Run dev server

```bash
npm run dev
```

Navigate to `http://localhost:3000`. You should see the landing page with navigation header.

## Implementation Order

1. **Tailwind setup** — postcss.config.mjs, globals.css
2. **NavHeader component** — `src/components/NavHeader.tsx`
3. **Root layout** — integrate NavHeader + globals.css import
4. **Landing page** — hero section + featured events
5. **Events pages** — breadcrumb on detail, layout integration
6. **Teacher pages** — directory polish, profile polish
7. **Profile page** — form layout polish
8. **Settings pages** — sidebar navigation, sub-page integration
9. **Admin dashboard** — extend nav, add dashboard summary
10. **Bookings page** — polish, add empty state CTA

## Key Files

| File | Purpose |
|------|---------|
| `postcss.config.mjs` | Tailwind CSS PostCSS plugin config |
| `src/app/globals.css` | Tailwind CSS import directive |
| `src/app/layout.tsx` | Root layout with NavHeader shell |
| `src/components/NavHeader.tsx` | Shared navigation header |
| `src/app/page.tsx` | Landing page |

## Verification

After implementation, verify:

1. Every page has the navigation header
2. Navigation links route to correct pages
3. Mobile menu works on < 768px viewport
4. Landing page shows hero + featured events
5. All pages show loading states during fetch
6. All pages show error states on API failure
7. All pages show empty states when no data exists
8. `npm run build` passes without errors
