# Data Model: Component Migration Mapping

**Feature**: 003-shadcn-migration
**Date**: 2026-01-14

## Overview

This document defines the component mapping from MUI to shadcn/Tailwind. Since this is a UI migration (not a data model change), this document serves as the "entity relationship" between old and new components.

## Component Entities

### 1. Layout Components

#### Sidebar (Navigation)

**Current (MUI)**:
- `Drawer` with `List`, `ListItem`, `ListItemButton`, `ListItemText`
- Custom navigation config in `layouts/config-nav-dashboard.tsx`

**Target (shadcn)**:
- `Sidebar` component with `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`
- Same navigation config structure, different component imports

**Fields/Props Mapping**:
| MUI Prop | shadcn Prop | Notes |
|----------|-------------|-------|
| open | defaultOpen | Controlled state |
| variant="permanent" | collapsible="none" | Fixed sidebar |
| sx styling | className | Tailwind classes |

#### Header (AppBar)

**Current (MUI)**:
- `AppBar`, `Toolbar`, `IconButton`, `Typography`

**Target (shadcn)**:
- Custom `<header>` with Tailwind: `sticky top-0 z-50 flex items-center`
- `Button` variant="ghost" for icon buttons

#### Page Container

**Current (MUI)**:
- `Container maxWidth="xl"` with `sx={{ py: 3 }}`

**Target (shadcn)**:
- `<div className="container mx-auto px-4 py-6 max-w-7xl">`

---

### 2. Card Components

#### Basic Card

**Current (MUI)**:
- `Card`, `CardHeader`, `CardContent`
- `sx` prop for styling

**Target (shadcn)**:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `className` with Tailwind

**Transformation**:
```tsx
// Before (MUI)
<Card sx={{ p: 3, bgcolor: 'background.paper' }}>
  <CardHeader title="Title" subheader="Subtitle" />
  <CardContent>{children}</CardContent>
</Card>

// After (shadcn)
<Card className="p-6 bg-card">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>
```

#### Paper (Surface)

**Current (MUI)**:
- `Paper` with elevation

**Target (shadcn)**:
- `Card` or `<div className="bg-card rounded-lg border">`

---

### 3. Form Components

#### Input/TextField

**Current (MUI)**:
- `TextField` with label, helperText, error props

**Target (shadcn)**:
- Composition: `Label` + `Input` + error text `<p>`

**Transformation**:
```tsx
// Before (MUI)
<TextField
  label="Email"
  value={email}
  onChange={handleChange}
  error={!!error}
  helperText={error}
/>

// After (shadcn)
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    value={email}
    onChange={handleChange}
    className={error ? "border-destructive" : ""}
  />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>
```

#### Select

**Current (MUI)**:
- `Select` with `MenuItem` children

**Target (shadcn)**:
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`

#### Checkbox/Radio

**Current (MUI)**:
- `Checkbox`, `Radio` with `FormControlLabel`

**Target (shadcn)**:
- `Checkbox` with adjacent `Label`
- `RadioGroup` with `RadioGroupItem` and `Label`

---

### 4. Dialog Components

#### Modal Dialog

**Current (MUI)**:
- `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`

**Target (shadcn)**:
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`

**Transformation**:
```tsx
// Before (MUI)
<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Confirm Action</DialogTitle>
  <DialogContent>Are you sure?</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </DialogActions>
</Dialog>

// After (shadcn)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 5. Navigation Components

#### Tabs

**Current (MUI)**:
- `Tabs`, `Tab` with value/onChange

**Target (shadcn)**:
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

#### Menu/Dropdown

**Current (MUI)**:
- `Menu`, `MenuItem` with anchorEl

**Target (shadcn)**:
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`

---

### 6. Feedback Components

#### Alert

**Current (MUI)**:
- `Alert` with severity prop

**Target (shadcn)**:
- `Alert` with variant prop (default, destructive)

**Variant Mapping**:
| MUI severity | shadcn variant |
|--------------|----------------|
| error | destructive |
| warning | destructive (with custom icon) |
| info | default |
| success | default (with custom icon) |

#### Snackbar/Toast

**Current (MUI)**:
- `Snackbar` with `Alert` inside

**Target (shadcn)**:
- `Sonner` with `toast()` function

**Transformation**:
```tsx
// Before (MUI)
<Snackbar open={open} onClose={handleClose}>
  <Alert severity="success">Saved!</Alert>
</Snackbar>

// After (shadcn/Sonner)
import { toast } from "sonner"
toast.success("Saved!")
```

#### Progress

**Current (MUI)**:
- `LinearProgress`, `CircularProgress`

**Target (shadcn)**:
- `Progress` (linear), `Spinner` (circular)

---

### 7. Data Display Components

#### Table

**Current (MUI)**:
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`

**Target (shadcn)**:
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

#### Badge

**Current (MUI)**:
- `Badge` with badgeContent, color

**Target (shadcn)**:
- `Badge` with variant (default, secondary, destructive, outline)

#### Tooltip

**Current (MUI)**:
- `Tooltip` with title prop

**Target (shadcn)**:
- `TooltipProvider` (at root), `Tooltip`, `TooltipTrigger`, `TooltipContent`

---

### 8. Custom Components (No Direct Mapping)

#### Timeline

**Current (MUI Lab)**:
- `Timeline`, `TimelineItem`, `TimelineSeparator`, `TimelineConnector`, `TimelineDot`, `TimelineContent`

**Target (Custom)**:
```tsx
// Custom Timeline component
<div className="relative space-y-4 pl-8">
  {items.map((item, i) => (
    <div key={i} className="relative">
      {/* Vertical line */}
      {i < items.length - 1 && (
        <div className="absolute left-[-20px] top-3 h-full w-px bg-border" />
      )}
      {/* Dot */}
      <div className="absolute left-[-24px] top-1 h-2 w-2 rounded-full bg-primary" />
      {/* Content */}
      <div>{item.content}</div>
    </div>
  ))}
</div>
```

#### Gauge

**Current**:
- `react-gauge-component` with MUI-styled container

**Target**:
- Same library with Tailwind-styled wrapper

```tsx
<div className="flex flex-col items-center p-4 bg-card rounded-lg">
  <GaugeComponent value={value} type="semicircle" />
  <span className="text-sm text-muted-foreground">{label}</span>
</div>
```

#### Label (Status Badge)

**Current (Custom MUI)**:
- Styled `Box` with variants (filled, outlined, soft)

**Target (Custom Tailwind)**:
```tsx
const labelVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        filled: "bg-primary text-primary-foreground",
        outlined: "border border-primary text-primary",
        soft: "bg-primary/10 text-primary",
      },
      color: {
        default: "",
        success: "bg-green-500/10 text-green-500 border-green-500",
        error: "bg-red-500/10 text-red-500 border-red-500",
        warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
      },
    },
    defaultVariants: {
      variant: "filled",
      color: "default",
    },
  }
)
```

---

## Styling Migration Patterns

### sx Prop → className

```tsx
// Before
sx={{ display: 'flex', gap: 2, p: 3, mt: 2 }}

// After
className="flex gap-4 p-6 mt-4"
```

### Theme Access → CSS Variables

```tsx
// Before
const theme = useTheme()
<Box sx={{ color: theme.palette.primary.main }}>

// After
<div className="text-primary">
```

### Responsive Breakpoints

```tsx
// Before
sx={{ fontSize: { xs: 14, sm: 16, md: 18 } }}

// After
className="text-sm sm:text-base md:text-lg"
```

---

## State/Lifecycle Considerations

All component state patterns remain the same:
- `useState` for local state
- Context providers unchanged (ApiContext, SessionContext)
- SSE integration unchanged
- React Router unchanged

Only the render output changes from MUI JSX to shadcn/Tailwind JSX.
