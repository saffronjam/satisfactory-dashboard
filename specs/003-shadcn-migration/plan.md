# Implementation Plan: Migrate from MUI to shadcn + Tailwind v4

**Branch**: `003-shadcn-migration` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-shadcn-migration/spec.md`

## Summary

Complete migration of the Satisfactory Dashboard frontend from Material-UI (MUI) 6 to shadcn/ui with Tailwind CSS v4. This is a "big bang" migration that removes all MUI dependencies upfront and rebuilds the UI using shadcn components and Tailwind utilities. The migration includes a visual redesign to a darker, monochromatic grey color scheme inspired by GitLab, ChatGPT, and Claude.ai interfaces, while preserving all existing functionality and maintaining support for both dark (default) and light themes.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, Bun 1.3
**Primary Dependencies**:
- shadcn/ui (component library)
- Tailwind CSS v4 with @tailwindcss/vite plugin
- Radix UI primitives (shadcn foundation)
- lucide-react (icons, shadcn default)
- recharts (retained, shadcn-compatible)
- react-leaflet (retained for maps)
- react-gauge-component (retained, Tailwind-styled)
- @iconify/react (retained)

**Storage**: N/A (frontend-only migration)
**Testing**: Manual visual testing + TypeScript compilation check
**Target Platform**: Web browsers (desktop/mobile responsive)
**Project Type**: Web application (frontend only)
**Performance Goals**: Page load time comparable to current MUI implementation
**Constraints**: Zero MUI/Emotion imports post-migration; all pages must render without errors
**Scale/Scope**: 12 page components, ~78 files with MUI imports, 948 sx prop instances

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | ✅ PASS | No backend changes; frontend types from apiTypes.ts unchanged |
| II. Clean Code, No Dead Weight | ✅ PASS | Complete removal of MUI code, no deprecated paths maintained |
| III. Function Documentation | ✅ PASS | New components will have JSDoc comments |
| IV. Backend as Source of Truth | ✅ PASS | No state management changes; SSE integration preserved |
| V. Format and Lint Always | ✅ PASS | oxlint/oxfmt retained; Tailwind classes compatible |
| VI. Interface-Driven Design | N/A | Backend principle, not applicable to frontend migration |
| VII. Consistent API Patterns | N/A | Backend principle, not applicable to frontend migration |
| VIII. Simplicity Over Abstraction | ✅ PASS | Direct component replacement, no new abstractions |

**Gate Status**: PASSED - All applicable principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/003-shadcn-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (component mapping)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
dashboard/
├── src/
│   ├── components/
│   │   ├── ui/              # NEW: shadcn components installed here
│   │   ├── theme-provider/  # NEW: shadcn theme provider
│   │   ├── mode-toggle/     # NEW: dark/light mode toggle
│   │   ├── timeline/        # CUSTOM: Timeline component (replaces MUI Lab)
│   │   ├── gauge/           # CUSTOM: Gauge wrapper with Tailwind styling
│   │   ├── label/           # MIGRATED: Label component with Tailwind
│   │   ├── scrollbar/       # MIGRATED or REMOVED: Scrollbar wrapper
│   │   ├── iconify/         # RETAINED: Iconify integration
│   │   ├── logo/            # MIGRATED: Logo with Tailwind
│   │   └── ...              # Other existing components migrated
│   ├── pages/               # MIGRATED: All page components
│   ├── sections/            # MIGRATED: All section components
│   ├── layouts/
│   │   ├── dashboard/       # MIGRATED: Main layout with shadcn Sidebar
│   │   └── simple/          # MIGRATED: Simple layout
│   ├── contexts/            # RETAINED: API and session contexts unchanged
│   ├── services/            # RETAINED: API services unchanged
│   ├── hooks/               # RETAINED + NEW: useTheme hook for shadcn
│   ├── lib/                 # NEW: cn() utility for Tailwind class merging
│   └── index.css            # MIGRATED: Tailwind v4 entry point
├── components.json          # NEW: shadcn configuration
├── tailwind.config.ts       # NEW: Tailwind v4 configuration (if needed)
├── vite.config.ts           # UPDATED: Add @tailwindcss/vite plugin
├── tsconfig.json            # UPDATED: Add @/ path alias
└── package.json             # UPDATED: Remove MUI, add Tailwind/shadcn deps
```

**Structure Decision**: Existing dashboard structure preserved. New `src/components/ui/` directory added for shadcn components. Theme directory (`src/theme/`) will be removed entirely after migration.

## Complexity Tracking

No violations to justify - migration follows constitution principles.
