# CLAUDE.md

## ⚡ Project Overview

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript
- **Package Manager:** `pnpm`
- **UI Library:** Shadcn UI + Tailwind CSS
- **State Management:** Zustand
- **Icons:** Lucide React
- **API Reference:** See `API_DOCUMENTATION.md` for backend contracts.

## 📦 Common Commands

### Setup & Run

- `pnpm install`: Install dependencies.
- `pnpm dev`: Start development server on `http://localhost:3000`.
- `pnpm build`: Build for production.
- `pnpm start`: Run production build.
- `pnpm lint`: Run ESLint.

### Component Management (Shadcn)

- `pnpm dlx shadcn@latest add <component-name>`: Add a new UI component (e.g., `button`, `input`).
- _Note: Shadcn components live in `@/components/ui`. Treat them as source code, not a library._

## 🏗️ Project Structure & Architecture

### Directories

- `/app`: App Router pages and layouts. Group by feature (e.g., `/app/subscribers`).
- `/components/ui`: Base UI components (Shadcn auto-generated).
- `/components/<feature>`: Feature-specific components (e.g., `SubscribersTable.tsx`).
- `/lib`: Utility functions (including `utils.ts` for Tailwind).
- `/store`: Global client state (Zustand stores).
- `/services`: API fetch wrappers (if not using Server Actions).
- `/types`: TypeScript interfaces/types.

### Component Guidelines

- **Server vs. Client:** Default to **Server Components**. Add `'use client'` at the top _only_ when you need hooks (`useState`, `useEffect`, `useStore`) or event listeners.
- **Data Fetching:** Prefer fetching data in Server Components using `async/await` and passing data down as props.
- **Imports:** Use absolute imports `@/` (configured in `tsconfig.json`).

## 🎨 UI & Styling

- **Tailwind:** Use utility classes for styling. Avoid custom CSS files.
- **Class Merging:** Always use the `cn()` utility when passing external classes to a component.

```tsx
// Example
<div className={cn("bg-red-500", className)}>...</div>
```

- **Responsiveness:** Design mobile-first using standard breakpoints (`sm:`, `md:`, `lg:`).

## 🐻 State Management (Zustand)

- Use Zustand for **global client-side state** only (e.g., UI triggers, user session data, complex form flows).
- Do _not_ use it to cache server data (prefer Next.js built-in caching or React Query if needed).
- **Structure:**

```ts
// store/useSubscriberStore.ts
import { create } from "zustand";

interface SubscriberState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export const useSubscriberStore = create<SubscriberState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));
```

## 🔌 API Integration Guidelines

### ⚠️ Critical Rules

1. **Source of Truth:** Always refer to **`API_DOCUMENTATION.md`** for payload structures and endpoint definitions.
2. **Versioning:** **NEVER** use legacy endpoints.

- ❌ `GET /api/subscribers` (Legacy)
- ✅ `GET /v1/subscribers` (Correct)

3. **Proxy:** The backend is likely running on a different port. Use environment variables (`NEXT_PUBLIC_API_URL`) to define the base path.

### Fetching Pattern

- Use strict typing for API responses (defined in `/types`).
- Handle loading and error states gracefully (use Shadcn `Skeleton` for loading).
- **Server Actions:** For mutations (POST/PATCH/DELETE), prefer using Next.js Server Actions to keep secrets on the server and revalidate paths automatically.

## 📝 Coding Standards

- **Naming:**
- Components: `PascalCase.tsx`
- Functions/Variables: `camelCase`
- Files: `kebab-case` (except components)

- **Types:** Explicitly define interfaces for props and API responses. Avoid `any`.
- **Validation:** Use `zod` for form validation (works great with Shadcn `Form` component).
