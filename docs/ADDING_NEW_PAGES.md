# Adding New Pages - FlexLayout & SimpleLayout Support

## Overview
This application supports two layout modes that users can toggle in Settings → Theme:
- **FlexLayout Mode**: Multi-tab interface where pages open in tabs
- **Simple Layout Mode**: Traditional single-page navigation

When adding a new page, you must ensure it works in **both** modes to avoid breaking the user experience.

---

## Quick Checklist for Adding a New Page

- [ ] Create the page component in `client/src/pages/`
- [ ] Add route to `AppLayout` component (for FlexLayout mode)
- [ ] Add route to `App.tsx` (for Simple Layout mode)
- [ ] Add navigation item to `client/src/config/navigation.ts`
- [ ] Test in both FlexLayout and Simple Layout modes

---

## Step-by-Step Guide

### 1. Create Your Page Component

Create your page component in the appropriate directory under `client/src/pages/`:

```tsx
// client/src/pages/MyNewPage.tsx
export default function MyNewPage() {
  return (
    <div>
      <h1>My New Page</h1>
      {/* Your page content */}
    </div>
  );
}
```

---

### 2. Add Route for FlexLayout Mode

**File**: `client/src/components/layout/AppLayout.tsx`

Find the `componentMap` object and add your page:

```tsx
const componentMap: Record<string, React.ComponentType<any>> = {
  '/home': Home,
  '/crm': CRM,
  '/my-new-page': MyNewPage,  // ← Add this line
  // ... other routes
};
```

This ensures the page can be opened in a tab when FlexLayout is enabled.

---

### 3. Add Route for Simple Layout Mode

**File**: `client/src/App.tsx`

1. **Import your page** at the top:
```tsx
import MyNewPage from "@/pages/MyNewPage";
```

2. **Add route** in the `ProtectedApp` function, inside the `if (!useFlexLayout)` block:
```tsx
if (!useFlexLayout) {
  return (
    <SimplePageLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/home" component={Home} />
        <Route path="/my-new-page" component={MyNewPage} />  {/* ← Add this */}
        {/* ... other routes */}
        <Route component={NotFound} />
      </Switch>
    </SimplePageLayout>
  );
}
```

> **CRITICAL**: If you forget this step, users with Simple Layout mode will see a 404 error when navigating to your page!

---

### 4. Add Navigation Item

**File**: `client/src/config/navigation.ts`

Add your page to the appropriate navigation array:

```tsx
export const topLevelNavigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/home",
    icon: Home,
  },
  {
    name: "My New Page",  // ← Add your page
    href: "/my-new-page",
    icon: YourIcon,
    permission: "view:my-feature", // Optional
  },
  // ... other items
];
```

The Sidebar component automatically handles navigation for both modes.

---

### 5. Test Both Modes

1. **Test FlexLayout Mode (Default)**:
   - Ensure FlexLayout is enabled in Settings → Theme
   - Click your navigation item
   - Verify page opens in a new tab
   - Verify you can have multiple tabs open

2. **Test Simple Layout Mode**:
   - Toggle "Use Multi-Tab Layout" OFF in Settings → Theme
   - Refresh the page (Ctrl+R)
   - Click your navigation item
   - Verify page loads normally (no 404)
   - Verify navigation works correctly

---

## Common Patterns

### Pages with Dynamic Routes (e.g., `/clients/:id`)

For pages with parameters, you need to handle them in both modes:

**FlexLayout Mode** (`AppLayout.tsx`):
```tsx
const componentMap: Record<string, React.ComponentType<any>> = {
  '/clients/:id': ClientDetail,
};
```

**Simple Layout Mode** (`App.tsx`):
```tsx
<Route path="/clients/:id" component={ClientDetail} />
```

### Pages That Should Always Use Simple Layout

Some pages (like Profile and Settings) should always use SimplePageLayout regardless of user preference. Add them before the `if (!useFlexLayout)` check in `App.tsx`:

```tsx
if (location === "/my-special-page") {
  return (
    <SimplePageLayout>
      <MySpecialPage />
    </SimplePageLayout>
  );
}
```

---

## Architecture Overview

```
User Clicks Navigation Item
         |
         v
   Sidebar.handleNavigation()
         |
         +-- Check: flexLayoutEnabled?
         |
    YES  |  NO
         |
    FlexLayout Mode          Simple Layout Mode
         |                          |
         v                          v
  Opens in Tab              Regular Navigation
  (AppLayout)               (App.tsx routes)
         |                          |
         v                          v
  Renders from              Renders from
  componentMap              <Switch> routes
```

---

## Troubleshooting

### "404 Page Not Found" in Simple Layout Mode
- **Cause**: Route not added to `App.tsx`
- **Fix**: Add `<Route path="/your-page" component={YourPage} />` in the Simple Layout section

### Page Opens in Tab Even When FlexLayout is Disabled
- **Cause**: Sidebar navigation not checking `flexLayoutEnabled`
- **Fix**: Verify `Sidebar.tsx` has the layout preference check in `handleNavigation`

### Page Works in One Mode But Not the Other
- **Cause**: Route only added to one location
- **Fix**: Ensure route exists in **both** `AppLayout.tsx` and `App.tsx`

---

## Files to Modify Summary

| File | Purpose | What to Add |
|------|---------|-------------|
| `pages/YourPage.tsx` | Page component | Create your page |
| `components/layout/AppLayout.tsx` | FlexLayout routing | Add to `componentMap` |
| `App.tsx` | Simple Layout routing | Import + add `<Route>` |
| `config/navigation.ts` | Sidebar navigation | Add navigation item |

---

## Example: Adding a "Reports" Page

1. **Create page**: `client/src/pages/Reports.tsx`
2. **AppLayout.tsx**:
   ```tsx
   const componentMap = {
     '/reports': Reports,
   };
   ```
3. **App.tsx**:
   ```tsx
   import Reports from "@/pages/Reports";
   
   // In simple layout section:
   <Route path="/reports" component={Reports} />
   ```
4. **navigation.ts**:
   ```tsx
   {
     name: "Reports",
     href: "/reports",
     icon: FileText,
   }
   ```
5. **Test both modes** ✓

---

## Best Practices

1. **Always test both modes** before considering the feature complete
2. **Keep route paths consistent** across both implementations
3. **Use the same component** for both modes (don't create separate versions)
4. **Document any special behavior** if a page behaves differently in each mode
5. **Consider permissions** - they work the same way in both modes

---

## Related Files

- `client/src/App.tsx` - Main routing and Simple Layout mode
- `client/src/components/layout/AppLayout.tsx` - FlexLayout mode routing
- `client/src/components/layout/Sidebar.tsx` - Navigation handling
- `client/src/hooks/useLayoutPreference.tsx` - Layout preference management
- `client/src/config/navigation.ts` - Navigation configuration

---

## Questions?

If you're unsure whether your page needs special handling:
1. Check if similar pages exist and follow their pattern
2. Test in both modes early in development
3. When in doubt, add the route to both locations - it's better to be safe!
