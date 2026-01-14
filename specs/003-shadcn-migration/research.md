# Research: MUI to shadcn + Tailwind v4 Migration

**Feature**: 003-shadcn-migration
**Date**: 2026-01-14

## 1. Tailwind CSS v4 Setup with Vite

**Decision**: Use @tailwindcss/vite plugin for zero-config Tailwind v4 integration

**Rationale**:
- Tailwind v4 with Vite requires only the @tailwindcss/vite plugin
- No separate tailwind.config.ts needed for basic setup (config moves to CSS)
- CSS entry point uses `@import "tailwindcss";` instead of @tailwind directives
- Better performance through native ESM and faster hot reload

**Alternatives Considered**:
- PostCSS plugin: Rejected - Vite plugin is recommended for Vite projects
- Tailwind v3: Rejected - v4 is current and shadcn supports it fully

**Implementation**:
```bash
bun add tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

## 2. shadcn/ui Installation and Configuration

**Decision**: Initialize shadcn with "new-york" style and neutral base color

**Rationale**:
- "new-york" style is the current default (old "default" style is deprecated)
- Neutral base color aligns with monochromatic grey design goal
- CSS variables enabled for theming support (dark/light modes)
- Components installed to `src/components/ui/`

**Alternatives Considered**:
- Default style: Deprecated in latest shadcn
- Slate/Zinc/Stone base colors: Neutral provides cleanest grey palette

**Implementation**:
```bash
bunx shadcn@latest init
```

Configuration choices:
- Style: new-york
- Base color: neutral
- CSS variables: yes
- React Server Components: no (client-side app)
- Components alias: @/components
- Utils alias: @/lib/utils

**components.json** will be generated:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## 3. Dark Theme Color Palette (OKLCH)

**Decision**: Custom monochromatic grey palette using OKLCH color format

**Rationale**:
- shadcn v4 uses OKLCH for perceptually uniform colors
- Design inspiration requires deep dark backgrounds (#1a1a1a to #2d2d2d)
- No purple/blue tints - pure grey scale
- Must support both dark (default) and light themes

**Color Mapping** (dark mode):
```css
:root {
  /* Background colors - deep greys */
  --background: oklch(0.13 0 0);        /* ~#1a1a1a - main background */
  --foreground: oklch(0.95 0 0);        /* ~#f0f0f0 - main text */

  /* Card/surface colors */
  --card: oklch(0.16 0 0);              /* ~#242424 - card background */
  --card-foreground: oklch(0.95 0 0);

  /* Muted/secondary */
  --muted: oklch(0.20 0 0);             /* ~#2d2d2d - muted background */
  --muted-foreground: oklch(0.65 0 0);  /* ~#9a9a9a - muted text */

  /* Border and input */
  --border: oklch(0.25 0 0);            /* ~#3a3a3a - subtle borders */
  --input: oklch(0.20 0 0);
  --ring: oklch(0.50 0 0);

  /* Primary accent (minimal use) */
  --primary: oklch(0.90 0 0);           /* Near white for primary actions */
  --primary-foreground: oklch(0.13 0 0);

  /* Secondary */
  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.90 0 0);

  /* Destructive/Error */
  --destructive: oklch(0.55 0.2 25);    /* Red for errors */
  --destructive-foreground: oklch(0.98 0 0);

  /* Accent (for highlights) */
  --accent: oklch(0.22 0 0);
  --accent-foreground: oklch(0.90 0 0);
}
```

**Light mode** will use inverted values (high lightness background, low lightness text).

## 4. Component Mapping Strategy

**Decision**: Direct 1:1 mapping where possible, custom components for gaps

### shadcn Components to Install

```bash
bunx shadcn@latest add button card dialog input select checkbox radio \
  table tooltip dropdown-menu sheet alert progress tabs badge skeleton \
  slider scroll-area separator avatar popover sidebar sonner spinner
```

### MUI to shadcn Mapping

| MUI Component | shadcn Equivalent | Notes |
|---------------|-------------------|-------|
| Box | `<div>` + Tailwind | Use className with Tailwind utilities |
| Button | Button | Direct replacement |
| Card, Paper | Card | CardHeader, CardContent, CardFooter |
| Dialog | Dialog | DialogTrigger, DialogContent, etc. |
| TextField | Input | Simpler API, combine with Label |
| Select | Select | SelectTrigger, SelectContent, SelectItem |
| Checkbox | Checkbox | Direct replacement |
| Radio | RadioGroup | RadioGroupItem |
| Typography | Tailwind classes | text-xl, text-sm, font-bold, etc. |
| Table | Table | TableHeader, TableBody, TableRow, TableCell |
| Tooltip | Tooltip | TooltipProvider required at root |
| Menu/DropdownMenu | DropdownMenu | DropdownMenuTrigger, DropdownMenuContent |
| Drawer | Sheet | SheetTrigger, SheetContent |
| Alert | Alert | AlertTitle, AlertDescription |
| Snackbar | Sonner | toast() function |
| LinearProgress | Progress | Direct replacement |
| CircularProgress | Spinner | From shadcn spinner component |
| Tabs | Tabs | TabsList, TabsTrigger, TabsContent |
| Badge | Badge | Direct replacement |
| Skeleton | Skeleton | Direct replacement |
| Slider | Slider | Direct replacement |
| AppBar/Toolbar | Custom header | Tailwind flex/sticky layout |
| Grid2 | CSS Grid/Flexbox | `grid grid-cols-*` or `flex` |
| Stack | Flexbox | `flex flex-col gap-*` |

### Custom Components Required

| Component | Approach |
|-----------|----------|
| Timeline | Build with Tailwind (vertical flex, dots, connectors) |
| Gauge | Style react-gauge-component container with Tailwind |
| Label (badge variant) | Rebuild using Badge + custom variants |
| Scrollbar | Use shadcn ScrollArea or native styling |

## 5. Theme Provider Pattern

**Decision**: Use shadcn's recommended theme provider with localStorage persistence

**Implementation**:
```tsx
// components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({ theme: "dark", setTheme: () => null })

export function ThemeProvider({ children, defaultTheme = "dark" }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeProviderContext)
```

## 6. Icon Strategy

**Decision**: Retain @iconify/react, optionally add lucide-react for shadcn defaults

**Rationale**:
- @iconify/react already used throughout codebase
- Provides access to multiple icon sets
- lucide-react is shadcn default but not required
- Both can coexist without conflict

**Implementation**:
- Keep existing Iconify component
- Install lucide-react for any new icons or shadcn component defaults
- Both use same sizing pattern (size prop or className)

## 7. Chart Integration

**Decision**: Retain recharts, apply dark theme styling

**Rationale**:
- recharts already in use and shadcn-compatible
- MUI X-Charts will be removed
- recharts supports custom theming via props

**Implementation**:
```tsx
// Dark theme chart colors
const chartColors = {
  background: "transparent",
  text: "#9a9a9a",
  grid: "#3a3a3a",
  primary: "#f0f0f0",
}

<BarChart>
  <XAxis stroke={chartColors.text} />
  <YAxis stroke={chartColors.text} />
  <CartesianGrid stroke={chartColors.grid} />
  <Bar fill={chartColors.primary} />
</BarChart>
```

## 8. Migration Execution Order

**Decision**: Big bang approach with phased rebuild

**Rationale**:
- Clarification confirmed big bang strategy
- Application will be non-functional during migration
- Allows clean break from MUI patterns

**Execution Order**:
1. **Setup Phase**: Install Tailwind v4, shadcn, configure paths
2. **Foundation Phase**: Theme provider, CSS variables, base layout
3. **Core Components**: Install all shadcn components
4. **Layout Migration**: Sidebar, header, page wrapper
5. **Page Migration**: One page at a time (Home → Map → Production → etc.)
6. **Custom Components**: Timeline, Gauge, Label
7. **Cleanup Phase**: Remove MUI packages, theme directory, verify zero imports

## 9. Path Alias Configuration

**Decision**: Add @/ alias pointing to src/ for shadcn compatibility

**Implementation**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```typescript
// vite.config.ts
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  }
})
```

## 10. Responsive Design Approach

**Decision**: Use Tailwind responsive prefixes (sm:, md:, lg:, xl:)

**Breakpoint Mapping**:
| MUI Breakpoint | Tailwind Equivalent |
|----------------|---------------------|
| xs (0px) | default (mobile-first) |
| sm (600px) | sm: (640px) |
| md (900px) | md: (768px) |
| lg (1200px) | lg: (1024px) |
| xl (1536px) | xl: (1280px), 2xl: (1536px) |

**Pattern**:
```tsx
// MUI
<Grid size={{ xs: 12, sm: 6, md: 4 }}>

// Tailwind
<div className="col-span-12 sm:col-span-6 md:col-span-4">
```

## Summary of Decisions

| Area | Decision |
|------|----------|
| Tailwind Setup | @tailwindcss/vite plugin, v4 |
| shadcn Style | new-york with neutral base |
| Color Palette | OKLCH monochromatic greys |
| Component Strategy | Direct mapping + custom builds |
| Theme Provider | Context-based with localStorage |
| Icons | Retain @iconify, add lucide-react |
| Charts | Retain recharts with dark theme |
| Migration Order | Big bang, phased rebuild |
| Path Aliases | @/ → src/ |
| Responsive | Tailwind breakpoint utilities |
