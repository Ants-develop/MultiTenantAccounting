<!-- d3b4b479-7bd8-44e9-9248-56498b6d3731 6e634a96-3828-4461-b43e-637a2d0877f7 -->
# Implement Excel-like Transaction Grid

## Recommended Solution: AG Grid Community Edition

After researching available options, AG Grid Community (free) is the best fit for your requirements:

- Inline cell editing with Excel-like behavior
- Keyboard navigation (arrow keys, Tab, Enter)
- Copy-paste functionality
- CSV export (Excel export requires Enterprise, but CSV is free)
- Resizable and sortable columns
- Large dataset performance
- Active community and excellent documentation

## Implementation Steps

### 1. Install AG Grid Dependencies

```bash
npm install ag-grid-react ag-grid-community
```

### 2. Update Journal Entries Component

File: `client/src/pages/transactions/JournalEntries.tsx`

- Replace Ant Design Table with AG Grid
- Configure AG Grid with:
  - Column definitions for all Georgian accounting columns
  - Inline cell editing enabled
  - Default column properties (resizable, sortable)
  - Grid options for Excel-like behavior
  - CSV export functionality

### 3. Configure Grid Features

**Column Definitions:**

- All 18 Georgian columns (დოკ. თარიღი, დოკ. ნომერი, N, დბ, etc.)
- Editable cells for appropriate columns
- Custom cell renderers for currency formatting
- Date pickers for date columns
- Dropdown editors for account selection

**Grid Options:**

- `editable: true` - Enable inline editing
- `singleClickEdit: true` - Excel-like single click editing
- `stopEditingWhenCellsLoseFocus: true`
- `enableRangeSelection: true` - Enable copy-paste
- `enableCellTextSelection: true`
- `suppressMovableColumns: false` - Allow column reordering
- `animateRows: true` - Smooth animations

**Keyboard Navigation:**

- Tab/Shift+Tab: Move between cells
- Enter: Start/stop editing
- Arrow keys: Navigate cells
- Ctrl+C/V: Copy-paste

### 4. Add Window-Like Container Styling

File: `client/src/index.css`

- Update CSS for AG Grid theme
- Add window-like container for professional appearance
- Style with borders, shadows, and professional colors
- Ensure Georgian font support

### 5. Implement Export Functionality

Add toolbar buttons for:

- Export to CSV with current filters/sorting
- Optional: Print functionality
- Column visibility toggle

### 6. Integration Points

**Data Flow:**

- Fetch journal entries from existing API
- Transform data for AG Grid format
- Handle cell edits with mutations to backend
- Real-time updates via React Query

**Form Integration:**

- Keep existing dialog form for complex entry creation
- Use AG Grid for quick inline edits
- Validate data before saving

## Key Benefits

1. **Performance**: Handles 10,000+ rows smoothly
2. **Excel-like UX**: Familiar interface for accountants
3. **Free**: No licensing costs with Community Edition
4. **Maintainable**: Well-documented, active community
5. **Future-proof**: Can upgrade to Enterprise later if needed

## Migration Strategy

- Phase 1: Implement AG Grid alongside current table
- Phase 2: Test with real data and user feedback
- Phase 3: Remove old Ant Design table
- Phase 4: Add advanced features (filtering, grouping)

## Files to Modify

1. `client/src/pages/transactions/JournalEntries.tsx` - Main implementation
2. `client/src/index.css` - Styling for AG Grid
3. `package.json` - Add AG Grid dependencies

## Alternative: React Data Grid (Adazzle)

If AG Grid proves too complex, React Data Grid by Adazzle is a simpler open-source alternative with similar features but less configuration overhead.

### To-dos

- [ ] Install ag-grid-react and ag-grid-community packages
- [ ] Define column definitions for all 18 Georgian accounting columns with appropriate editors
- [ ] Replace Ant Design Table with AG Grid component in JournalEntries.tsx
- [ ] Configure grid options for Excel-like behavior (editing, keyboard nav, copy-paste)
- [ ] Add window-like styling for AG Grid container with professional appearance
- [ ] Add CSV export functionality with toolbar button
- [ ] Connect grid cell edits to backend API mutations for data persistence
- [ ] Test inline editing, keyboard navigation, copy-paste, and export features