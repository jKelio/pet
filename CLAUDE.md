# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PET (Practice Efficiency Tracking) is an Ionic/React hybrid mobile application for tracking ice hockey practice efficiency. Coaches use it to log timing and count data across drills during training sessions.

**Tech Stack:** React 19 + TypeScript + Ionic 8 + Capacitor 4 (iOS/Android) + Auth0 + i18next (EN/DE/RU)

## Commands

```bash
npm start          # Start development server
npm run build      # Production build
npm test           # Run tests (includes Ionic transform patterns)
```

## Architecture

### State Management

Two React Context providers manage application state:

- **TrackingContextProvider** (`src/pages/tracking/TrackingContextProvider.tsx`): Workflow orchestration - manages practice info, drills array, current drill index, and mode transitions
- **TimerContextProvider** (`src/pages/tracking/TimerContextProvider.tsx`): Real-time tracking - manages timer states, counter states with timestamps, and waste time tracking

### Workflow Modes

The tracking process flows through three sequential modes:
1. `practiceInfo` → Enter practice metadata (PracticeInfoForm)
2. `drills` → Configure enabled actions per drill (DrillsForm with drag-and-drop)
3. `timeWatcher` → Live tracking with timer/counter UI (TimeWatcher)
4. Results visualization (Results page with Recharts)

### Action Types

Each drill has 10 pre-defined action buttons split into:
- **Timers** (duration): explanation, demonstration, feedbackteam, changesideone, changesidetwo, timemoving
- **Counters** (occurrences): repetition, feedbackplayers, shots, passes

### Data Models

- **TimerData**: `{ totalTime, timeSegments: Array<{startTime, endTime, duration}> }`
- **CounterData**: `{ count, timestamps: number[] }`
- **Drill**: Contains id, tags (Set), actionButtons, timerData, counterData, wasteTime

## Localization

Translations in `src/i18n.ts` with namespaces: `pet`, `menu`, `feedback`, `glossary`. Supports English, German, and Russian.

## Key Patterns

- Drag-and-drop for action reordering uses @dnd-kit
- Auth0 handles authentication with Capacitor deep linking for native apps
- PWA service worker configured but unregistered by default
