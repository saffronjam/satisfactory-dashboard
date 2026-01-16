# Implementation Plan: Migrate from MUI to shadcn + Tailwind v4

**Branch**: `003-shadcn-migration` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-shadcn-migration/spec.md`

## Summary

Migrate Satisfactory Dashboard frontend from Material-UI to shadcn/ui + Tailwind CSS v4. Use "big bang" strategy: remove all MUI first, then rebuild with shadcn components. Change color scheme from purple/blue to monochromatic grey with dark mode as default.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, Bun 1.3
**Primary Dependencies**: shadcn/ui, Tailwind CSS v4, Recharts, React Router 6, Leaflet
**Storage**: N/A (frontend-only migration)
**Testing**: Manual testing (build validation, lint checks)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend only for this migration)
**Performance Goals**: No regression from current MUI performance
**Constraints**: Must maintain all existing functionality, responsive design
**Scale/Scope**: 12 pages, ~100 components to migrate

## Constitution Check

*GATE: Passed - Re-checked after design*

- [x] Type Safety First - Using auto-generated types from `apiTypes.ts`
- [x] Clean Code, No Dead Weight - Removing all MUI code completely
- [x] Function Documentation - Components will have JSDoc
- [x] Backend as Source of Truth - No changes to data flow
- [x] Format and Lint Always - Using oxlint and oxfmt
- [x] Interface-Driven Design - N/A (frontend only)
- [x] Consistent API Patterns - N/A (no API changes)
- [x] Simplicity Over Abstraction - Direct component migration

## Project Structure

### Documentation (this feature)

```text
specs/003-shadcn-migration/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Component mappings
├── quickstart.md        # Setup verification
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
dashboard/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn components
│   │   ├── gauge/       # Gauge wrapper
│   │   ├── timeline/    # Custom Timeline
│   │   └── ...
│   ├── pages/           # Page components
│   ├── sections/        # Feature sections
│   ├── layouts/         # Dashboard/simple layouts
│   └── index.css        # Tailwind theme config
└── package.json         # Dependencies
```

**Structure Decision**: Frontend-only migration affecting `dashboard/` directory

## Bug Fix Phase (2026-01-15)

After initial migration completion, the following issues were identified:

### Issue 1: Donut Charts/Gauges Appearing Black
**Root Cause**: CSS variables defined in OKLCH format but components using `hsl(var(...))` wrapper
**Affected**: `AnalyticsPieChart`, `Gauge` component
**Fix**: Remove `hsl()` wrapper, use OKLCH variables directly via Tailwind `oklch(var(...))` or raw CSS

### Issue 2: text-primary-foreground Color Mismatch
**Root Cause**: Dark mode `--primary-foreground` value too dark, light mode too light
**Fix**: Adjust OKLCH values in index.css for better contrast

### Issue 3: Map Page Buttons Not Clickable
**Root Cause**: Popover z-index/stacking context issues with Leaflet map overlay
**Fix**: Ensure PopoverContent has sufficient z-index and pointer-events

### Issue 4: Trains Page Runtime Error
**Root Cause**: Component error (details in tasks.md)
**Fix**: Debug and fix the specific component causing the error

### Issue 5: Scrollbar Layout Interference
**Root Cause**: Scrollbars reserving space instead of overlaying content
**Fix**: Use `overflow: overlay` or equivalent modern CSS for overlay scrollbars

### Issue 6: Table Column Width Instability
**Root Cause**: Column widths calculated from content, changing with pagination
**Fix**: Set fixed/min widths on table columns

### Issue 7: Rows Per Page Selector Too Narrow
**Root Cause**: Fixed width insufficient for "100" option text
**Fix**: Make selector width dynamic or increase min-width

### Issue 8: Select Components Not Showing Items
**Root Cause**: SelectContent/DropdownMenuContent z-index or portal rendering issue
**Fix**: Ensure proper z-index stacking and portal rendering

## Complexity Tracking

No constitution violations - straightforward UI component migration.
