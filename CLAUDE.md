# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PET (Practice Efficiency Tracking) is an Ionic/React hybrid mobile application for tracking ice hockey practice efficiency. Coaches use it to log timing and count data across drills during training sessions and generate detailed visualizations and PDF reports.

**Tech Stack:** React 19 + TypeScript + Ionic 8 + Capacitor 8 (iOS/Android) + Auth0 + i18next (EN/DE/RU) + Vite + Vitest + Cypress

## Commands

```bash
npm run dev            # Start Vite development server (http://localhost:5173)
npm run build          # TypeScript check + Vite production build
npm run preview        # Preview production build locally
npm run test.unit      # Run unit tests with Vitest
npm run test.e2e       # Run Cypress E2E tests
npm run lint           # Lint with ESLint
npm run lint:fix       # Auto-fix lint issues
```

> Note: The existing CLAUDE.md listed `npm start` and `npm test` — these are NOT valid scripts. Use `npm run dev` and `npm run test.unit` instead.

## Directory Structure

```
pet/
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── drillsForm/        # Drill configuration with drag-and-drop
│   │   ├── gantt/             # Gantt/timeline visualization components
│   │   └── practiceInfoForm/  # Practice metadata form
│   ├── hooks/                 # Custom React hooks
│   ├── pages/
│   │   ├── tracking/          # Core tracking workflow & context providers
│   │   ├── language/          # Language selection & hockey glossary
│   │   └── feedback/          # User feedback form
│   ├── theme/                 # Ionic CSS theme variables
│   ├── App.tsx                # Root component with routing
│   ├── main.tsx               # Application entry point
│   ├── i18n.ts                # All translations (EN/DE/RU)
│   ├── auth.config.ts         # Auth0 configuration
│   └── setupTests.ts          # Vitest test setup
├── cypress/                   # E2E tests
│   └── e2e/
├── public/                    # Static assets & PWA manifest
├── capacitor.config.ts        # Capacitor native app config
├── vite.config.ts             # Vite + Vitest configuration
├── tsconfig.json              # TypeScript configuration
└── eslint.config.js           # ESLint flat config (v9)
```

## Architecture

### Routing

React Router 5 is used. The app wraps everything in `Auth0Provider` and routes are defined in `App.tsx`:
- `/` → Tracking page (main workflow)
- `/results` → Results visualization
- `/language` → Language picker
- `/glossary` → Hockey glossary
- `/feedback` → Feedback form

### State Management

Two React Context providers manage application state:

- **TrackingContextProvider** (`src/pages/tracking/TrackingContextProvider.tsx`): Workflow orchestration — manages practice info, drills array, current drill index, and mode transitions
- **TimerContextProvider** (`src/pages/tracking/TimerContextProvider.tsx`): Real-time tracking — manages timer states, counter states with timestamps, and waste time tracking. Uses 100ms intervals via `useRef` to prevent recreation on renders.

### Workflow Modes

The tracking process flows through sequential modes controlled by `TrackingContext`:

1. `practiceInfo` → Enter practice metadata (`PracticeInfoForm`)
2. `drills` → Configure enabled actions per drill (`DrillsForm` with drag-and-drop)
3. `timeWatcher` → Live tracking with timer/counter UI (`TimeWatcher`)
4. Navigate to `/results` for visualization (`Results` page with Recharts + custom Gantt)

### Action Types

Each drill has 10 pre-defined action buttons split into:
- **Timers** (duration tracking): `explanation`, `demonstration`, `feedbackteam`, `changesideone`, `changesidetwo`, `timemoving`
- **Counters** (occurrence counting): `repetition`, `feedbackplayers`, `shots`, `passes`

### Data Models

Defined in `src/pages/tracking/TrackingContext.ts`:

```typescript
interface PracticeInfo {
  clubName: string;
  teamName: string;
  date: string;
  coachName: string;
  evaluation: number;
  athletesNumber: number;
  coachesNumber: number;
  totalTime: number;
  trackedPlayerName: string;
  drillsNumber: number;
}

interface TimerData {
  totalTime: number;
  timeSegments: Array<{ startTime: number; endTime: number | null; duration: number }>;
}

interface CounterData {
  count: number;
  timestamps: number[];
}

interface Drill {
  id: number;
  tags: Set<string>;          // Drill category tags
  actionButtons: ActionButton[];
  timerData: Record<string, TimerData>;
  counterData: Record<string, CounterData>;
  wasteTime: number;
}

interface ActionButton {
  id: string;
  type: 'timer' | 'counter';
  enabled: boolean;
}
```

## Key Components

### `src/pages/tracking/`
- **`Tracking.tsx`** — Top-level orchestrator that renders the appropriate mode UI
- **`TrackingContextProvider.tsx`** — Workflow state, drill management, mode navigation
- **`TimerContextProvider.tsx`** — Real-time timer/counter state, interval management
- **`TimeWatcher.tsx`** — Live tracking UI during practice sessions
- **`Results.tsx`** (~900 lines) — Full results page with charts, Gantt, and PDF export

### `src/components/drillsForm/`
- **`DrillsForm.tsx`** — Configure which actions are enabled per drill
- **`SortableActionItem.tsx`** — Individual draggable action item using @dnd-kit

### `src/components/gantt/`
- **`GanttChart.tsx`** — Container for the Gantt visualization
- **`ganttUtils.ts`** — Transforms drill data into timeline segments with color coding
- **`ActionTimeChart.tsx`**, **`ActionTimeline.tsx`**, **`DrillOverviewTimeline.tsx`**, **`GanttDrillDetail.tsx`**, **`GanttLegend.tsx`** — Gantt sub-components

### `src/hooks/`
- **`useContainerWidth.ts`** — ResizeObserver hook returning element width for responsive chart sizing

## Key Patterns & Conventions

### Coding Style
- Functional components with React Hooks throughout — no class components
- `PascalCase` for components and types; `camelCase` for functions and variables
- Context types/interfaces in separate `*Context.ts` files, providers in `*ContextProvider.tsx`
- Co-located CSS files alongside components (e.g., `Menu.tsx` + `Menu.css`)

### Drag & Drop
- `@dnd-kit` (core, sortable, utilities) for action reordering in `DrillsForm`
- Uses `PointerSensor` + `KeyboardSensor` for pointer and keyboard accessibility

### Data Visualization
- **Recharts** for pie/bar/summary charts in `Results.tsx`
- **Custom Gantt components** for timeline visualization (`src/components/gantt/`)
- 10 fixed colors for the 10 action types in `ganttUtils.ts`

### Localization
- All translations inline in `src/i18n.ts` (no separate JSON files)
- Four namespaces: `pet` (main UI), `menu`, `feedback`, `glossary`
- Access via `useTranslation('pet')` hook from `react-i18next`
- Language persisted via i18next `localStorage` detector

### Authentication
- Auth0 via `@auth0/auth0-react`
- Domain: `petty.eu.auth0.com`, clientId in `src/auth.config.ts`
- Callback URI is dynamic: native Capacitor deep link vs. web URL
- GitHub Pages deployment extracts repo name from pathname for correct redirect URI

### PDF Export
- `jspdf` + `modern-screenshot` for rendering DOM sections to images
- Progress tracking (current/total sections) with `IonToast` notifications
- Per-section error handling — continues on failure rather than aborting

### Mobile (Capacitor)
- `appId: "io.ionic.starter"`, `webDir: "dist"`
- Capacitor plugins: App, Browser, Keyboard, StatusBar, Haptics
- PWA manifest at `public/manifest.json` (service worker configured but NOT registered)

## Build & Deployment

- **Vite** with `base: '/pet/'` for GitHub Pages deployment
- `@vitejs/plugin-legacy` for older browser compatibility
- Production build: `tsc && vite build` → outputs to `dist/`
- `public/404.html` handles SPA client-side routing on GitHub Pages

## Testing

### Unit Tests (Vitest)
- Test runner: Vitest 0.34.6 with jsdom environment
- Setup file: `src/setupTests.ts` (extends jest-dom matchers, polyfills `window.matchMedia`)
- Test files: `*.test.tsx` co-located with source
- Current coverage: `src/App.test.tsx` (basic smoke test)
- Run: `npm run test.unit`

### E2E Tests (Cypress)
- Cypress 13.5.0 with `baseUrl: http://localhost:5173`
- Test files: `cypress/e2e/`
- Run: `npm run test.e2e` (requires dev server running)

## Linting

ESLint 9 with flat config (`eslint.config.js`):
- TypeScript eslint rules (strict)
- React and React Hooks plugins
- `react-refresh/only-export-components`: warn
- `no-console` and `no-debugger`: warn

## Localization — Adding Translations

When adding new UI strings:
1. Add to `src/i18n.ts` under all three languages (`en`, `de`, `ru`) and the appropriate namespace
2. Use `const { t } = useTranslation('namespace')` in the component
3. Reference with `t('key')` — nested keys use dot notation: `t('section.key')`
