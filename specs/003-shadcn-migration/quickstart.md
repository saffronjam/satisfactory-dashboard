# Quickstart: shadcn + Tailwind v4 Migration

**Feature**: 003-shadcn-migration
**Date**: 2026-01-14

## Prerequisites

- Bun 1.3+ installed
- Node.js 18+ (for shadcn CLI)
- Access to dashboard/ directory

## Step 1: Install Tailwind CSS v4

```bash
cd dashboard
bun add tailwindcss @tailwindcss/vite
```

## Step 2: Update Vite Configuration

Edit `vite.config.ts`:

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const PORT = 3039;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_VERSION__: JSON.stringify(process.env.VITE_BUILD_VERSION || "localbuild"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.join(process.cwd(), "node_modules"),
      "src": path.join(process.cwd(), "src"),
    },
  },
  server: { port: PORT, host: true, fs: { cachedChecks: false } },
  preview: { port: PORT, host: true },
});
```

## Step 3: Update TypeScript Configuration

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "module": "ESNext",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": false,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

## Step 4: Initialize shadcn/ui

```bash
bunx shadcn@latest init
```

When prompted:
- Style: **new-york**
- Base color: **neutral**
- CSS variables: **yes**

This creates:
- `components.json` - shadcn configuration
- `src/lib/utils.ts` - cn() utility function
- Updates to `src/index.css` with Tailwind and CSS variables

## Step 5: Install Required shadcn Components

```bash
bunx shadcn@latest add button card dialog input select checkbox \
  radio-group table tooltip dropdown-menu sheet alert progress \
  tabs badge skeleton slider scroll-area separator avatar popover \
  sidebar sonner spinner label
```

## Step 6: Set Up Theme Provider

Create `src/components/theme-provider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "dark",
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "satisfactory-dashboard-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
```

## Step 7: Create Mode Toggle Component

Create `src/components/mode-toggle.tsx`:

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Step 8: Update CSS Variables for Dark Theme

Update `src/index.css` with the monochromatic grey palette:

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 10%;
    --foreground: 0 0% 94%;
    --card: 0 0% 14%;
    --card-foreground: 0 0% 94%;
    --popover: 0 0% 14%;
    --popover-foreground: 0 0% 94%;
    --primary: 0 0% 94%;
    --primary-foreground: 0 0% 10%;
    --secondary: 0 0% 18%;
    --secondary-foreground: 0 0% 94%;
    --muted: 0 0% 18%;
    --muted-foreground: 0 0% 60%;
    --accent: 0 0% 18%;
    --accent-foreground: 0 0% 94%;
    --destructive: 0 62.8% 50%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 22%;
    --input: 0 0% 18%;
    --ring: 0 0% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Step 9: Install Additional Dependencies

```bash
bun add lucide-react class-variance-authority clsx tailwind-merge
```

## Step 10: Remove MUI Dependencies (After Migration Complete)

```bash
bun remove @mui/material @mui/icons-material @mui/lab @mui/x-charts \
  @mui/styled-engine-sc @emotion/react @emotion/styled @emotion/cache
```

## Step 11: Wrap App with Providers

Update `src/main.tsx` or app entry:

```tsx
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        {/* Existing providers (SessionProvider, ApiProvider, etc.) */}
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
```

## Verification Checklist

After migration:

- [ ] `bun run build` completes without errors
- [ ] `grep -r "@mui" src/` returns no results
- [ ] App loads with dark theme by default
- [ ] Theme toggle switches between dark/light modes
- [ ] All navigation items work
- [ ] All pages render without console errors
- [ ] Charts display correctly
- [ ] Map loads and functions
- [ ] Forms submit correctly
- [ ] Toasts/notifications appear

## Common Patterns Reference

### Box to div
```tsx
// Before
<Box sx={{ display: 'flex', gap: 2, p: 3 }}>

// After
<div className="flex gap-4 p-6">
```

### Typography to spans/headings
```tsx
// Before
<Typography variant="h4">Title</Typography>
<Typography variant="body1">Text</Typography>

// After
<h4 className="text-2xl font-semibold tracking-tight">Title</h4>
<p className="text-base">Text</p>
```

### useTheme to CSS variables
```tsx
// Before
const theme = useTheme();
<div style={{ color: theme.palette.primary.main }}>

// After
<div className="text-primary">
```
