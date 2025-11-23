# FlexLayout Theming Guide

## Overview

This document explains how FlexLayout is themed to match the application's design system using CSS variables. This approach ensures consistent visual appearance across light and dark modes while maintaining a single source of truth for styling.

## Problem Statement

FlexLayout React comes with default styles that don't match our application's theme. The main issues were:

1. **White background strips** appearing behind tabs due to wrapper elements
2. **No rounded corners** matching the app's card component design
3. **Hardcoded colors** that don't respect theme switching
4. **Inconsistent styling** with the rest of the application

## Solution: CSS Variable-Based Theming

We use CSS custom properties (CSS variables) defined in `client/src/index.css` to theme FlexLayout. This approach:

- ✅ Automatically adapts to light/dark mode
- ✅ Maintains consistency with the app's design system
- ✅ Provides a single source of truth for colors
- ✅ Requires minimal maintenance

## Theme Variables

All theme colors are defined in `client/src/index.css` using HSL format:

### Light Mode (`:root`)
```css
--background: 210 20% 98%;      /* Very light blue-gray */
--foreground: 215 25% 15%;      /* Dark text */
--card: 0 0% 100%;              /* Pure white */
--card-foreground: 215 25% 15%; /* Dark text on cards */
--border: 210 25% 88%;          /* Light border */
--primary: 210 85% 48%;         /* Blue primary color */
--muted: 210 20% 95%;           /* Light muted background */
--radius: 0.5rem;               /* Border radius (8px) */
```

### Dark Mode (`.dark`)
```css
--background: 215 30% 10%;      /* Very dark blue-gray */
--foreground: 210 20% 98%;      /* Light text */
--card: 215 28% 14%;            /* Dark card background */
--card-foreground: 210 20% 98%; /* Light text on cards */
--border: 215 25% 22%;          /* Dark border */
--primary: 210 85% 55%;         /* Lighter blue primary */
--muted: 215 25% 18%;           /* Dark muted background */
--radius: 0.5rem;               /* Same border radius */
```

## Implementation Location

All FlexLayout styles are located in `client/src/index.css` starting around line 8, after the AG Grid import. This consolidates all custom component styles in one place.

## Key Selectors and Their Purpose

### 1. Container and Layout
```css
.flexlayout-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.flexlayout__layout {
  width: 100% !important;
  height: 100% !important;
  background: hsl(var(--background)) !important;
}
```

### 2. Tab Styling
```css
.flexlayout__tab {
  background: hsl(var(--card)) !important;
  color: hsl(var(--foreground)) !important;
  border-color: hsl(var(--border)) !important;
  border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0 !important;
  border: 1px solid hsl(var(--border)) !important;
  border-bottom: none !important;
  margin-right: 2px !important;
}

.flexlayout__tab--selected {
  background: hsl(var(--background)) !important;
  border-bottom: 2px solid hsl(var(--primary)) !important;
  color: hsl(var(--foreground)) !important;
  z-index: 2 !important;
}
```

**Key Points:**
- Tabs use `--card` for background (white in light, dark in dark mode)
- Selected tab uses `--background` to stand out
- Rounded top corners match the app's design
- Primary color border indicates selection

### 3. Tabset (Tab Container)
```css
.flexlayout__tabset {
  background: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  border-radius: var(--radius) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow: var(--shadow-sm) !important;
  overflow: hidden !important;
}
```

**Key Points:**
- Full border radius for card-like appearance
- Subtle shadow for depth
- Matches the app's card component styling

### 4. Wrapper Elements (Fixes White Strip Issue)

The most critical fix was targeting FlexLayout's internal wrapper elements that create white backgrounds:

```css
/* Main tab bar wrapper - fixes white strip behind tabs */
.flexlayout__tabset_tabbar_outer,
.flexlayout__tabset_tabbar_inner {
  background: hsl(var(--card)) !important;
}

/* Remove any leftover border or shadow from tab bar wrappers */
.flexlayout__tabset_tabbar_outer,
.flexlayout__tabset_tabbar_inner {
  border: none !important;
  box-shadow: none !important;
}

/* Tab container spacer element - fixes white space on right side */
.flexlayout__tabset_tabbar_inner_tab_container {
  background: transparent !important;
}

/* Toolbar area - fixes white space in toolbar area */
.flexlayout__tab_toolbar {
  background: transparent !important;
}

/* Tabset content area - fixes white strip below tabs */
.flexlayout__tabset_content {
  background: hsl(var(--card)) !important;
}
```

**Why This Was Necessary:**
FlexLayout creates multiple wrapper elements for layout management. These wrappers have default light backgrounds that show through even when tabs are styled correctly. By targeting all wrapper elements, we ensure no white strips appear.

### 5. Tab Content Area
```css
.flexlayout__tab_content {
  background: hsl(var(--background)) !important;
  color: hsl(var(--foreground)) !important;
  border-radius: 0 0 var(--radius) var(--radius) !important;
  padding: 1rem !important;
}
```

**Key Points:**
- Uses `--background` (lighter than card) for content area
- Rounded bottom corners complete the card appearance
- Padding provides breathing room

### 6. Additional Elements
```css
/* Border panels */
.flexlayout__border {
  background: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  border-radius: var(--radius) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow: var(--shadow-sm) !important;
}

/* Splitters (resize handles) */
.flexlayout__splitter {
  background: hsl(var(--border)) !important;
}

.flexlayout__splitter:hover {
  background: hsl(var(--primary)) !important;
}
```

## How Theme Switching Works

The theme automatically switches based on the `.dark` class on the root element:

1. **Light Mode (default)**: CSS variables in `:root` are used
2. **Dark Mode**: When `.dark` class is added to `<html>`, variables in `.dark` selector override `:root`

Example:
```css
/* Light mode */
:root {
  --card: 0 0% 100%;  /* White */
}

/* Dark mode */
.dark {
  --card: 215 28% 14%;  /* Dark */
}
```

When using `hsl(var(--card))`, the browser automatically uses the correct value based on the current theme.

## Debugging Theme Issues

### Problem: White Strip Appears Behind Tabs

**Solution Checklist:**

1. **Check wrapper elements** in DevTools:
   - Inspect `.flexlayout__tabset_tabbar_outer`
   - Inspect `.flexlayout__tabset_tabbar_inner`
   - Inspect `.flexlayout__tabset_tabbar_inner_tab_container`
   - Inspect `.flexlayout__tab_toolbar`
   - Inspect `.flexlayout__tabset_content`

2. **Identify the culprit:**
   - Hover elements in DevTools to see which one highlights the white area
   - If it covers the whole bar → `tabset_tabbar_outer` or `tabset_tabbar_inner`
   - If it covers only the right side → `tab_toolbar` or `tabset_tabbar_inner_tab_container`
   - If it's below the tabs → `tabset_content`

3. **Add the fix:**
   ```css
   .flexlayout__[element-name] {
     background: hsl(var(--card)) !important;  /* or transparent */
   }
   ```

### Problem: Colors Don't Match Theme

**Check:**
1. Are you using `hsl(var(--variable-name))` format?
2. Is the `.dark` class properly applied to `<html>`?
3. Are CSS variables defined in both `:root` and `.dark`?

### Problem: Rounded Corners Missing

**Check:**
1. Is `border-radius: var(--radius)` applied?
2. Is `overflow: hidden` set on parent container?
3. Are child elements overriding the border-radius?

## Best Practices

### 1. Always Use CSS Variables
```css
/* ✅ Good */
background: hsl(var(--card)) !important;

/* ❌ Bad */
background: #ffffff !important;
background: white !important;
```

### 2. Use !important Sparingly but Strategically
FlexLayout's default styles have high specificity. Use `!important` when necessary to override defaults, but document why.

### 3. Match App Component Styling
FlexLayout should look like it belongs to the app:
- Use same border radius as cards (`var(--radius)`)
- Use same shadows (`var(--shadow-sm)`)
- Use same spacing patterns

### 4. Test Both Themes
Always verify styles work in both light and dark modes.

### 5. Document New Selectors
When adding new FlexLayout selectors, document:
- What element it targets
- Why it's needed
- What problem it solves

## File Structure

```
client/src/
├── index.css                    # All FlexLayout styles (lines 8-143)
├── components/
│   └── layout/
│       └── FlexLayoutContainer.tsx  # Component using FlexLayout
└── css/
    └── (flexlayout-custom.css removed - now in index.css)
```

## Migration History

**Before:** FlexLayout styles were in `client/src/css/flexlayout-custom.css` and imported separately.

**After:** All styles consolidated in `client/src/index.css` for:
- Single source of truth
- Better maintainability
- Consistent with other component styles (AG Grid)
- Easier to see all theme-related code in one place

## Future Maintenance

### Adding New FlexLayout Elements

1. Identify the element's class name using DevTools
2. Add styles to `client/src/index.css` in the FlexLayout section
3. Use CSS variables for colors
4. Match existing patterns (border-radius, shadows, etc.)
5. Test in both light and dark modes
6. Document the selector in this file

### Updating Theme Colors

1. Modify CSS variables in `client/src/index.css` (`:root` and `.dark`)
2. FlexLayout will automatically update (no changes needed to FlexLayout styles)
3. Test all components to ensure consistency

### Debugging New Issues

1. Use browser DevTools to inspect the problematic element
2. Identify the exact class name
3. Check if it's already styled in `index.css`
4. If not, add appropriate styles using theme variables
5. Update this documentation with the new selector

## Example: Adding Styles for a New Element

Let's say FlexLayout adds a new `.flexlayout__toolbar` element that needs theming:

```css
/* Add to client/src/index.css in FlexLayout section */

/* Toolbar styling - matches app's toolbar design */
.flexlayout__toolbar {
  background: hsl(var(--card)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  border-radius: var(--radius) var(--radius) 0 0 !important;
  padding: 0.5rem 1rem !important;
}
```

Then document it:
- **Selector**: `.flexlayout__toolbar`
- **Purpose**: Styles the toolbar element
- **Theme**: Uses `--card` for background, `--foreground` for text
- **Location**: `client/src/index.css` line ~XXX

## Related Documentation

- `docs/FLEXLAYOUT_IMPLEMENTATION.md` - General FlexLayout usage and architecture
- `client/src/index.css` - Theme variable definitions and FlexLayout styles
- `client/src/components/layout/FlexLayoutContainer.tsx` - Component implementation

## Summary

The FlexLayout theming approach uses CSS variables to ensure:
- ✅ Automatic theme switching (light/dark)
- ✅ Consistency with app design system
- ✅ Single source of truth for colors
- ✅ Easy maintenance and updates
- ✅ No hardcoded colors
- ✅ Proper handling of wrapper elements

By following this approach, FlexLayout seamlessly integrates with the application's visual design while maintaining flexibility for future theme changes.

