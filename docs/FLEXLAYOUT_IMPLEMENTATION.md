# FlexLayout Implementation Documentation

## Overview

This application uses **FlexLayout React** for managing tabbed panel layouts. FlexLayout replaced GoldenLayout to provide a more modern, React-native solution for dockable panels and tabs.

## Architecture

### Component Structure

```
AppLayout
├── Sidebar (navigation)
├── TopBar (header)
└── FlexLayoutContainer
    └── FlexLayout Layout Component
        └── Tabs (page components)
```

### Key Files

- **`FlexLayoutContainer.tsx`** - Main container component that manages the FlexLayout model and tab operations
- **`flexLayoutStorage.ts`** - Handles persistence of layout state to localStorage
- **`useGoldenLayout.tsx`** - Context provider/hook for accessing layout functions (kept name for backward compatibility)
- **`AppLayout.tsx`** - Main layout wrapper that includes Sidebar, TopBar, and FlexLayoutContainer

## How It Works

### 1. Model-Based Layout

FlexLayout uses a JSON model to define the layout structure:

```typescript
{
  global: {},
  borders: [],
  layout: {
    type: "row",
    children: [
      {
        type: "tabset",
        weight: 100,
        children: [
          {
            type: "tab",
            id: "tab_123",
            name: "Tab Title",
            component: "page_home",
            config: {
              path: "/home",
              params: {},
              resolvedPath: "/home"
            }
          }
        ]
      }
    ]
  }
}
```

### 2. Component Factory Pattern

The factory function maps component names to React components:

```typescript
const factory = (node: TabNode) => {
  const component = node.getComponent(); // e.g., "page_home"
  const config = node.getConfig(); // Contains path, params, resolvedPath
  
  // Get component from pageRegistry
  const metadata = getPageMetadata(config.path, config.params);
  const Component = metadata.component;
  
  // Render with providers
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouteParamsProvider params={config.params} path={config.resolvedPath}>
          <Component {...props} />
        </RouteParamsProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};
```

### 3. Tab Management API

The container exposes these methods via context:

- **`openTab(path, params?, title?)`** - Opens or switches to a tab
- **`closeTab(tabId)`** - Closes a tab
- **`getActiveTab()`** - Returns currently active tab
- **`getAllTabs()`** - Returns all open tabs
- **`setActiveTab(tabId)`** - Switches to a specific tab

## Implementation Patterns

### ✅ DO: Use Actions API

Always use FlexLayout's Actions API for model mutations:

```typescript
// ✅ Correct - Using Actions API
model.doAction(Actions.addNode(tabConfig, tabsetId, DockLocation.CENTER, -1));
model.doAction(Actions.deleteTab(tabId));

// ❌ Wrong - Direct manipulation
model.addNode(...); // Don't do this
```

### ✅ DO: Store Custom Data in Config

Store route information in the tab's `config` property:

```typescript
{
  type: "tab",
  id: tabId,
  name: "Tab Title",
  component: "page_component_name",
  config: {
    path: "/tasks/:id",        // Template path
    params: { id: "123" },     // Route parameters
    resolvedPath: "/tasks/123" // Resolved path
  }
}
```

### ✅ DO: Use State for Model

Store the model in React state (not ref) so React re-renders on changes:

```typescript
const [model, setModel] = useState<Model | null>(null);

// Model changes trigger re-render
const handleModelChange = (newModel: Model) => {
  setModel(newModel);
  // Save to localStorage, update tabs, etc.
};
```

### ✅ DO: Sync State on Model Changes

Use `onModelChange` callback to keep local state in sync:

```typescript
<Layout
  model={model}
  factory={factory}
  onModelChange={(newModel) => {
    setModel(newModel);
    updateTabsFromModel(newModel);
    saveLayoutState(newModel.toJson());
  }}
/>
```

## Tab Operations

### Opening a Tab

```typescript
// From Sidebar or any component
const { openTab } = useGoldenLayout();

// Open a static route
openTab("/home");

// Open a dynamic route
openTab("/tasks/123", { id: "123" }, "Task Details");

// With custom title
openTab("/clients", undefined, "All Clients");
```

### Closing a Tab

```typescript
const { closeTab } = useGoldenLayout();
closeTab(tabId);
```

### Finding Existing Tabs

The implementation automatically checks for existing tabs before creating new ones:

```typescript
// If tab with same path and params exists, switches to it
// Otherwise, creates a new tab
openTab("/tasks/123");
```

## State Persistence

Layout state is automatically saved to localStorage:

- **Storage Key**: `flexLayoutState`
- **Format**: JSON model structure
- **Auto-save**: On every model change
- **Auto-load**: On component mount

The storage layer handles:
- Version validation
- Structure validation
- Error recovery (falls back to default layout)

## Styling

### CSS Classes

- `.flexlayout-container` - Main container wrapper
- `.flexlayout__layout` - FlexLayout's root element
- `.accounting-sidebar` - Sidebar (z-index: 10)
- TopBar elements (z-index: 10)

### Important Styles

FlexLayout is constrained to not cover sidebar/topbar:

```css
.flexlayout-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.flexlayout-container .flexlayout__layout {
  position: relative !important;
  z-index: 0 !important;
}
```

## Dynamic Routes

The implementation supports dynamic routes with parameters:

```typescript
// Route definition in pageRegistry
"/tasks/:id": {
  title: "Task Detail",
  component: TaskDetail,
  path: "/tasks/:id",
  isDynamic: true
}

// Opening with params
openTab("/tasks/123", { id: "123" });

// Params are extracted and passed to component via RouteParamsProvider
```

## Component Wrapping

All page components are wrapped with:

1. **QueryClientProvider** - For React Query
2. **ErrorBoundary** - For error handling
3. **RouteParamsProvider** - For route parameter access

This ensures consistent behavior across all tabs.

## Troubleshooting

### Tabs Not Opening

- Check browser console for errors
- Verify the path exists in `pageRegistry`
- Ensure `model` is initialized (not null)

### Sidebar/TopBar Disappearing

- Check z-index values in CSS
- Verify FlexLayout isn't using `position: fixed`
- Ensure container has proper height constraints

### Layout Not Persisting

- Check localStorage for `flexLayoutState`
- Verify `saveLayoutState` is being called
- Check for JSON serialization errors in console

### Component Not Rendering

- Verify factory function returns valid React component
- Check that component name matches in model and factory
- Ensure `config.path` matches a route in `pageRegistry`

## Migration Notes

This implementation replaced GoldenLayout. Key differences:

- **API**: Uses Actions API instead of direct model manipulation
- **State**: Model stored in React state (not ref)
- **Factory**: Component factory pattern instead of registration
- **Storage**: Different storage format (FlexLayout JSON vs GoldenLayout config)

The public API (`openTab`, `closeTab`, etc.) remains the same for backward compatibility.

## Future Enhancements

Potential improvements:

- [ ] Support for popout windows (multi-monitor)
- [ ] Custom tab rendering (icons, badges)
- [ ] Tab grouping/coloring
- [ ] Layout presets/templates
- [ ] Undo/redo for layout changes

## Resources

- [FlexLayout React GitHub](https://github.com/caplin/FlexLayout)
- [FlexLayout Documentation](https://github.com/caplin/FlexLayout/wiki)
- Internal: `MultiTenantAccounting/client/src/components/layout/FlexLayoutContainer.tsx`

