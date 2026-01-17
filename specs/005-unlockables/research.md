# Research: Unlockables System

**Feature**: 005-unlockables
**Date**: 2026-01-17

## 1. FRM API Schematics Endpoint

### Decision
Use the `/getSchematics` FRM API endpoint to fetch all schematic/milestone data.

### Rationale
- Endpoint provides comprehensive schematic data including purchase status
- Already documented at docs.ficsit.app
- Returns all necessary fields for unlock checking

### Data Structure (from FRM API)

```json
{
  "ID": "Schematic_6-3_C",
  "Name": "Monorail Train Technology",
  "ClassName": "Schematic_6-3_C",
  "TechTier": 6,
  "Type": "Milestone",
  "Locked": false,
  "Purchased": true,
  "DepLocked": false,
  "LockedTutorial": false,
  "LockedPhase": false,
  "Recipes": [...],
  "Cost": [...]
}
```

### Key Fields for Unlock System
| Field | Type | Purpose |
|-------|------|---------|
| Name | string | Match against feature lock mapping |
| TechTier | int | Display as "Tier X" in UI (rename to Tier in frontend) |
| Type | string | Filter for "Milestone" type |
| Purchased | bool | Primary unlock indicator |

### Alternatives Considered
- **Poll HUB endpoint only**: Rejected - only shows active milestone, not all purchased
- **Store unlock state locally**: Rejected - would diverge from game state

---

## 2. Schematic Data Filtering Strategy

### Decision
Fetch all schematics but only store milestones (Type === "Milestone") to reduce data size.

### Rationale
- Full getSchematics response is ~1.3MB with all types
- Dashboard only needs milestone unlock status
- Filtering to milestones reduces payload significantly
- Other schematic types (Alternate, Hard Drive, M.A.M., etc.) not needed for feature locks

### Filter Implementation
Backend filters to `Type === "Milestone"` before caching, reducing:
- Network overhead
- Redis storage
- Frontend memory usage

### Alternatives Considered
- **Store all schematics**: Rejected - unnecessary data for this feature
- **Frontend filtering**: Rejected - wastes bandwidth, violates backend as source of truth

---

## 3. Polling Interval

### Decision
Poll schematics every 30 seconds (same as HUB/Space Elevator).

### Rationale
- Milestones are purchased infrequently (minutes to hours apart)
- 30 seconds aligns with existing semi-static data polling
- Provides responsive feel without excessive API calls
- Matches existing patterns in FRM client

### Alternatives Considered
- **4 seconds (dynamic data)**: Rejected - milestones don't change frequently
- **120 seconds (infrastructure)**: Rejected - too slow for good UX
- **On-demand only**: Rejected - would require user refresh for updates

---

## 4. Feature Lock Mapping Configuration

### Decision
Use a static TypeScript configuration file with typed mapping.

### Rationale
- Simple, type-safe approach
- Easy to add new lockable features
- No runtime configuration complexity
- Follows YAGNI - no need for dynamic config initially

### Configuration Structure

```typescript
// dashboard/src/config/unlockables.ts
export interface LockableFeature {
  route: string;           // e.g., "/trains"
  navKey: string;          // Navigation item identifier
  milestoneName: string;   // Exact match against schematic Name
  tier: number;            // For display purposes
  displayName: string;     // Human-readable feature name
}

export const LOCKABLE_FEATURES: LockableFeature[] = [
  {
    route: "/trains",
    navKey: "trains",
    milestoneName: "Monorail Train Technology",
    tier: 6,
    displayName: "Trains"
  },
  {
    route: "/drones",
    navKey: "drones",
    milestoneName: "Aeronautical Engineering",
    tier: 8,
    displayName: "Drones"
  }
];
```

### Alternatives Considered
- **Backend configuration**: Rejected - unnecessary complexity, frontend-only concern
- **Database storage**: Rejected - overkill for static mapping
- **Environment variables**: Rejected - not suitable for structured data

---

## 5. Unlock Status Hook Design

### Decision
Create `useUnlockables()` hook that combines schematics data with lock mapping.

### Rationale
- Centralized unlock logic
- Reactive to SSE updates
- Type-safe API
- Reusable across navigation and pages

### Hook Interface

```typescript
interface UseUnlockablesResult {
  isFeatureUnlocked: (featureKey: string) => boolean;
  getFeatureLockInfo: (featureKey: string) => LockableFeature | null;
  isLoading: boolean;
}

function useUnlockables(): UseUnlockablesResult;
```

### Alternatives Considered
- **HOC pattern**: Rejected - hooks are more composable
- **Context-only**: Rejected - hook provides cleaner API
- **Per-component logic**: Rejected - duplication, harder to maintain

---

## 6. Locked UI Component Design

### Decision
Create `LockedFeature` component with large padlock icon and unlock hint.

### Rationale
- Consistent locked state presentation
- Clear visual feedback per spec requirements
- Reusable across all lockable pages

### Component Structure

```typescript
interface LockedFeatureProps {
  feature: LockableFeature;
}

// Renders:
// - Large centered padlock icon (Lock from lucide-react)
// - Feature name heading
// - "Unlock requirement: {milestoneName} (Tier {tier})" hint text
```

### Visual Approach
- Full page overlay replacing content
- Centered vertically and horizontally
- Muted colors (gray/slate palette)
- Padlock icon at 64-96px size
- Clear typography hierarchy

### Alternatives Considered
- **Modal/dialog**: Rejected - page should show locked state, not interrupt flow
- **Inline banner**: Rejected - not prominent enough per spec
- **Redirect to home**: Rejected - loses context, confusing UX

---

## 7. Navigation Locked State Styling

### Decision
Add conditional styling to sidebar nav items: reduced opacity + small padlock icon overlay.

### Rationale
- Visible but clearly secondary
- Consistent with spec requirement for "faded + padlock"
- Non-intrusive to navigation flow

### Implementation Approach
- Opacity: 50% when locked
- Small padlock icon (16px) positioned at end of nav item
- Preserve clickability (navigates to locked page)

### Alternatives Considered
- **Disable completely**: Rejected - spec says click should show locked page
- **Hide locked items**: Rejected - users should see what's coming
- **Tooltip only**: Rejected - not visually distinct enough

---

## 8. Fail-Open Behavior

### Decision
Treat features as unlocked when schematic data is unavailable.

### Rationale
- Prevents blocking users due to API issues
- Better UX than showing everything locked
- Aligns with spec FR-007
- Users can still use dashboard if FRM API is down

### Implementation
```typescript
const isFeatureUnlocked = (featureKey: string): boolean => {
  if (!schematics || schematics.length === 0) {
    return true; // Fail-open
  }
  // ... normal unlock check
};
```

### Alternatives Considered
- **Fail-closed (show locked)**: Rejected - blocks legitimate use
- **Show error state**: Rejected - confusing, feature might work anyway

---

## 9. Backend Model Design

### Decision
Create minimal Schematic model with only fields needed for unlock checking.

### Rationale
- Reduces data transfer and storage
- Follows existing model patterns
- Only stores what's needed (no recipes, costs, etc.)

### Model Fields

```go
type Schematic struct {
  ID        string `json:"id"`
  Name      string `json:"name"`
  Tier      int    `json:"tier"`      // Renamed from TechTier
  Type      string `json:"type"`
  Purchased bool   `json:"purchased"`
}
```

### Alternatives Considered
- **Full schematic model**: Rejected - unnecessary data for this feature
- **Separate unlock endpoint**: Rejected - adds complexity, schematics endpoint sufficient

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | `/getSchematics` FRM endpoint | Comprehensive, documented |
| Filtering | Milestones only | Reduce payload size |
| Polling interval | 30 seconds | Balance responsiveness/efficiency |
| Lock mapping | Static TypeScript config | Simple, type-safe, extensible |
| Unlock logic | `useUnlockables()` hook | Centralized, reactive, reusable |
| Locked UI | Full-page `LockedFeature` component | Clear visual feedback |
| Nav styling | Opacity + small padlock | Visible but unobtrusive |
| Error handling | Fail-open | Don't block users |
| Backend model | Minimal fields | Only what's needed |
