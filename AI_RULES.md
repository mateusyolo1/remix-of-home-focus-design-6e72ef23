# Tech Stack & Conventions

## Framework & Routing
- **TanStack Start** (not React Router). Routes are **file-based** in `src/routes/`.
- The root layout is `src/routes/__root.tsx`. Each `.tsx` file in `src/routes/` is a route.
- The main (home) page is `src/routes/index.tsx`. Use `createFileRoute` from `@tanstack/react-router`.
- Use `Link`, `useNavigate`, `Outlet`, `useRouterState` from `@tanstack/react-router`, never from `react-router-dom`.
- Do NOT create `src/pages/` — routing is file-based in `src/routes/`. Check `src/routes/README.md` for conventions.

## UI & Styling
- **Tailwind CSS v4** with `@tailwindcss/vite`. Use Tailwind utility classes for all styling.
- **shadcn/ui** components are in `src/components/ui/`. All shadcn components and Radix UI dependencies are pre-installed — do not re-install them.
- Create custom components in `src/components/`. Do NOT edit shadcn/ui files.
- **lucide-react** is installed for icons.
- **sonner** is installed for toast notifications (`toast` from `sonner`).
- Color tokens are defined in `src/styles.css` via `@theme inline`. Use semantic colors (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-accent`, `bg-destructive`, etc.).

## State Management
- Use **localStorage** for persistence. Existing stores use a custom event-driven pattern with `useStoreValue` (see `src/lib/focus-store.ts` and `src/lib/profile-store.ts`).
- For the Hermes system, create stores in `src/lib/hermes/hermes-store.ts` following the same pattern.

## Hermes Architecture
The Hermes system lives in `src/lib/hermes/` and is organized as:

```
src/lib/hermes/
  hermes-core.ts       — Orchestrator
  hermes-types.ts      — All shared types
  hermes-events.ts     — Event system
  hermes-store.ts      — State management (localStorage)

  agents/
    capture-agent.ts           — Raw input capture
    audio-transcription-agent.ts — Audio/transcription
    speech-organizer-agent.ts  — NLP organization
    checklist-agent.ts         — Checklist generation
    design-context-agent.ts    — Design context detection
    focus-agent.ts             — TDAH/focus adaptation
    task-planner-agent.ts      — Task ordering & planning
    calendar-agent.ts          — Agenda integration
    memory-agent.ts            — Learning from user behavior
    quality-evaluator-agent.ts — Output validation
    client-communication-agent.ts — Client messages
    notification-agent.ts      — Reminders
    ui-state-agent.ts          — UI coordination
    privacy-storage-agent.ts   — Data control
```

Hermes components live in `src/components/hermes/`.

## Library Usage Guidelines
| Library | When to use |
|---------|------------|
| `@tanstack/react-router` | All navigation, links, routes, URL state |
| `tailwindcss` | All styling — no CSS modules or styled-components |
| `lucide-react` | All icons. Import individual icons: `import { Home, Sparkles } from "lucide-react"` |
| `sonner` | Toast notifications: `toast("message")` or `toast.success("message")` |
| `date-fns` | Date formatting and manipulation |
| `zod` | Form/schema validation |
| `react-hook-form` | Complex forms (used with zod via `@hookform/resolvers`) |
| `recharts` | Charts and data visualization |
| `cmdk` | Command menus |
| `vaul` | Drawers/sheets |
| `react-resizable-panels` | Resizable split panels |

## Hermes Design Rules
1. **Never save automatically** — always require user review before persisting.
2. **Never generate an empty checklist** — if no tasks found, generate a reasonable default.
3. **Never use generic checklist when context exists** — always infer from text.
4. **Never mix raw draft with organized content** — keep separate until user confirms.
5. **Always open review window before saving.**
6. **Always preserve original text.**
7. **Always indicate if output needs review** (low confidence, missing deadlines, etc.).
8. **Always allow editing before saving.**
9. **Learn only from confirmed/saved content** — not from discarded drafts or rejected checklists.
10. **Prioritize "next action" over dashboard** — the app should always answer "What do I do now?"
