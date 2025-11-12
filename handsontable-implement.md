# Handsontable Implementation Guide

This guide documents the implementation of Handsontable in the Journal Entries Grid, including virtual scrolling setup, configuration, and troubleshooting.

## Overview

Handsontable is a powerful spreadsheet-like data grid that supports virtual scrolling for handling large datasets (thousands of rows) efficiently. Virtual scrolling renders only visible rows, making it performant even with massive datasets.

## Key Requirements

- **Fixed Height**: The grid must have a fixed numeric height (in pixels), not a CSS calc string
- **Container Overflow**: The container should allow Handsontable to manage its own overflow
- **Numeric Height Prop**: Use a numeric value, not CSS expressions like `"calc(100vh - 350px)"`

## Installation

```json
{
  "handsontable": "^16.1.1",
  "@handsontable/react-wrapper": "^16.1.1"
}
```

## Basic Setup

### 1. Import Required Modules

```typescript
import { registerAllModules } from "handsontable/registry";
import { HotTable, HotColumn } from "@handsontable/react-wrapper";
import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-main.css";

// Register all Handsontable modules
registerAllModules();
```

### 2. Minimal Working Configuration

```tsx
<HotTable
  ref={hotTableRef}
  themeName="ht-theme-main"
  data={tableData}
  width="100%"
  height={gridHeight}  // Must be numeric, not CSS calc string
  rowHeaders={true}
  colHeaders={true}
  licenseKey="non-commercial-and-evaluation"
>
  {/* HotColumn definitions or auto-generated from data */}
</HotTable>
```

## Virtual Scrolling

### How It Works

Virtual scrolling is **enabled by default** in Handsontable 16.2+. It automatically:
- Renders only visible rows plus a small buffer
- Dynamically loads rows as you scroll
- Maintains smooth performance with large datasets

### Requirements for Virtual Scrolling

1. **Numeric Height**: The `height` prop must be a number (pixels), not a CSS string
2. **No `renderAllRows`**: Don't set `renderAllRows: true` (this disables virtualization)
3. **Proper Container**: Container should have fixed dimensions

### Height Calculation Example

```typescript
const [gridHeight, setGridHeight] = useState<number>(600);

useEffect(() => {
  const calculateHeight = () => {
    const headerOffset = isFullscreen ? 250 : 350;
    const calculatedHeight = window.innerHeight - headerOffset;
    setGridHeight(Math.max(400, calculatedHeight)); // Minimum 400px
  };
  
  calculateHeight();
  window.addEventListener('resize', calculateHeight);
  return () => window.removeEventListener('resize', calculateHeight);
}, [isFullscreen]);
```

## Common Features

### Context Menu (Right-Click)

```tsx
contextMenu={true}
```

Enables right-click context menu with options like:
- Cut/Copy/Paste
- Insert/Remove rows
- Clear column
- Alignment options

### Filters

```tsx
filters={true}
```

Adds filter dropdowns in column headers for filtering data.

### Sorting

```tsx
multiColumnSorting={true}
```

Enables sorting by multiple columns simultaneously.

### Column Resize

```tsx
manualColumnResize={true}
```

Allows users to drag column borders to resize columns.

### Comments

```tsx
comments={true}
```

Enables cell comments feature.

### Dropdown Menu

```tsx
dropdownMenu={true}
```

Adds dropdown menu in column headers with various options.

## Data Format

Handsontable expects data as an **array of objects**:

```typescript
const tableData = [
  {
    id: 1,
    entryNumber: "JE-001",
    date: "2024-01-01",
    description: "Entry description",
    // ... other fields
  },
  // ... more rows
];
```

### Auto-Generated Columns

If you don't define `<HotColumn>` components, Handsontable automatically generates columns from the data object keys. This is useful for quick setup but provides less control.

### Custom Column Definitions

For better control, define columns explicitly:

```tsx
<HotTable data={tableData} height={600}>
  <HotColumn data="id" type="text" readOnly={true} width={80} />
  <HotColumn data="entryNumber" type="text" width={150} />
  <HotColumn data="date" type="date" dateFormat="YYYY-MM-DD" width={120} />
  <HotColumn data="amount" type="numeric" numericFormat={{ pattern: '0,0.00' }} width={150} />
</HotTable>
```

## CSS Configuration

### Minimal CSS (Recommended)

```css
.handsontable td {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  vertical-align: middle !important;
}

.handsontable th {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  vertical-align: middle !important;
}
```

### Important Notes

- **Don't override `.handsontable` overflow**: Let Handsontable manage its own overflow for virtual scrolling
- **Don't wrap in container with overflow hidden**: This can break scrolling
- **Avoid `preventOverflow="horizontal"`**: Can interfere with scrolling behavior

## Troubleshooting

### Issue: Scrolling Not Working

**Symptoms:**
- No scrollbar appears
- Can't scroll through data
- Only a few rows visible

**Solutions:**

1. **Check Height Type**
   ```tsx
   // ❌ Wrong - CSS calc string
   height="calc(100vh - 350px)"
   
   // ✅ Correct - Numeric value
   height={gridHeight}  // where gridHeight is a number
   ```

2. **Verify Height Value**
   ```typescript
   console.log('Grid height:', gridHeight); // Should be 400+
   console.log('Data rows:', tableData.length); // Should be > visible rows
   ```

3. **Check Container CSS**
   - Don't set `overflow: hidden` on `.handsontable` wrapper
   - Don't wrap HotTable in a div with fixed height and overflow hidden
   - Let Handsontable manage its own scrolling

4. **Remove Conflicting Options**
   ```tsx
   // ❌ Can interfere with scrolling
   autoWrapRow={true}
   autoWrapCol={true}
   preventOverflow="horizontal"
   
   // ✅ Use only what you need
   ```

### Issue: Only 20 Rows Showing

**Cause:** Data is being sliced or limited

**Solution:**
```typescript
// ❌ Wrong - limiting data
return journalEntries.slice(0, 20).map(...)

// ✅ Correct - show all data
return journalEntries.map(...)
```

### Issue: Performance Problems

**Solutions:**

1. **Enable Virtual Scrolling** (default in 16.2+)
   - Ensure `renderAllRows` is not set to `true`
   - Use fixed numeric height

2. **Limit Visible Columns**
   - Only show necessary columns
   - Hide columns that aren't needed

3. **Paginate Server-Side**
   - For extremely large datasets (100k+ rows)
   - Load data in chunks

## Best Practices

### 1. Use Dynamic Height Calculation

Always calculate height based on viewport:

```typescript
useEffect(() => {
  const calculateHeight = () => {
    const headerOffset = isFullscreen ? 250 : 350;
    const calculatedHeight = window.innerHeight - headerOffset;
    setGridHeight(Math.max(400, calculatedHeight));
  };
  
  calculateHeight();
  window.addEventListener('resize', calculateHeight);
  return () => window.removeEventListener('resize', calculateHeight);
}, [isFullscreen]);
```

### 2. Refresh Dimensions on Data Change

```typescript
useEffect(() => {
  if (tableData.length > 0 && hotTableRef.current?.hotInstance) {
    const hot = hotTableRef.current.hotInstance;
    setTimeout(() => {
      hot.refreshDimensions(); // Use this instead of hot.render()
    }, 100);
  }
}, [tableData]);
```

### 3. Avoid Unnecessary Renders

- Use `refreshDimensions()` instead of `render()` when possible
- `render()` can break virtual scrolling
- Only call `render()` when absolutely necessary

### 4. Handle Window Resize

```typescript
useEffect(() => {
  const handleResize = () => {
    const hot = hotTableRef.current?.hotInstance;
    if (hot) {
      hot.refreshDimensions(); // Refresh, don't render
    }
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## Example: Complete Implementation

```tsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { HotTable } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';

registerAllModules();

export default function DataGrid() {
  const hotTableRef = useRef<any>(null);
  const [gridHeight, setGridHeight] = useState<number>(600);
  
  // Calculate height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      const calculatedHeight = window.innerHeight - 350;
      setGridHeight(Math.max(400, calculatedHeight));
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);
  
  // Your data
  const tableData = useMemo(() => {
    // Transform your data here
    return data.map(item => ({ /* ... */ }));
  }, [data]);
  
  // Refresh dimensions when data changes
  useEffect(() => {
    if (tableData.length > 0 && hotTableRef.current?.hotInstance) {
      setTimeout(() => {
        hotTableRef.current.hotInstance.refreshDimensions();
      }, 100);
    }
  }, [tableData]);
  
  return (
    <HotTable
      ref={hotTableRef}
      themeName="ht-theme-main"
      data={tableData}
      width="100%"
      height={gridHeight}  // Numeric value!
      rowHeaders={true}
      colHeaders={true}
      contextMenu={true}
      filters={true}
      multiColumnSorting={true}
      manualColumnResize={true}
      licenseKey="non-commercial-and-evaluation"
    />
  );
}
```

## Key Takeaways

1. ✅ **Height must be numeric** - Use state variable, not CSS calc
2. ✅ **Virtual scrolling is automatic** - Don't disable `renderAllRows`
3. ✅ **Use `refreshDimensions()`** - Not `render()` for updates
4. ✅ **Let Handsontable manage overflow** - Don't override CSS
5. ✅ **Calculate height dynamically** - Respond to window resize
6. ✅ **Minimal CSS needed** - Don't interfere with Handsontable's internal styles

## Resources

- [Handsontable Documentation](https://handsontable.com/docs)
- [Virtual Scrolling Guide](https://handsontable.com/docs/row-virtualization/)
- [React Wrapper Documentation](https://handsontable.com/docs/react-installation/)

## Version

This guide is for **Handsontable 16.1.1+** with React wrapper.

