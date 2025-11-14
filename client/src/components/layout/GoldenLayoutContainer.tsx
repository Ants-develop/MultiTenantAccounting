import { useEffect, useRef, useState, useCallback } from "react";
import { GoldenLayout } from "golden-layout";
import "golden-layout/dist/css/goldenlayout-base.css";
import "golden-layout/dist/css/themes/goldenlayout-light-theme.css";
import { createRoot, Root } from "react-dom/client";
import { pageRegistry, getPageMetadata, resolvePath, extractParams } from "@/lib/pageRegistry";
import { saveLayoutState, loadLayoutState, clearLayoutState } from "@/lib/goldenLayoutStorage";
import { GoldenLayoutProvider, TabState, GoldenLayoutContextValue } from "@/hooks/useGoldenLayout";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RouteParamsProvider } from "@/contexts/RouteParamsContext";

interface ComponentContainer {
  container: any;
  reactRoot: Root | null;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

const componentContainers = new Map<string, ComponentContainer>();

// Global component registry for Golden Layout
function registerComponent(
  componentName: string,
  component: React.ComponentType<any>,
  props?: Record<string, any>
) {
  if (!componentContainers.has(componentName)) {
    componentContainers.set(componentName, {
      container: null,
      reactRoot: null,
      component,
      props,
    });
  }
}

// Render React component into Golden Layout container
function renderComponent(container: any, componentName: string, componentState?: any) {
  const componentInfo = componentContainers.get(componentName);
  if (!componentInfo) {
    console.error(`Component ${componentName} not registered`);
    return;
  }

  // Golden Layout v2+ uses container.element instead of container.getElement()
  const element = container.element || container.getElement?.()?.[0];
  if (!element) return;

  // Clean up previous root if exists
  if (componentInfo.reactRoot) {
    componentInfo.reactRoot.unmount();
  }

  // Create new React root and render
  const root = createRoot(element);
  componentInfo.reactRoot = root;
  componentInfo.container = container;

  const Component = componentInfo.component;
  
  // Extract props from component state (for dynamic routes)
  let props: Record<string, any> = {};
  if (componentState) {
    const { path, params = {}, resolvedPath } = componentState;
    
    // Extract route parameters and pass as props
    if (params.id) {
      // For routes like /tasks/:id, /jobs/:id, /clients/:id/profile
      if (path.includes("/tasks/") || path === "/tasks/:id") {
        // TaskDetail reads from URL, but we can also pass as prop if component supports it
        // For now, we'll set a data attribute that components can read
        props.taskId = parseInt(params.id);
      } else if (path.includes("/clients/") && (path.includes("/profile") || path === "/clients/:id/profile")) {
        props.clientId = parseInt(params.id);
      } else if (path.includes("/clients/") && (path.includes("/onboarding") || path === "/clients/:id/onboarding")) {
        props.clientId = parseInt(params.id);
      } else if (path.includes("/jobs/") || path === "/jobs/:id") {
        props.jobId = parseInt(params.id);
      } else if (path.includes("/pipelines/") || path === "/pipelines/:id") {
        props.pipelineId = parseInt(params.id);
      }
    }
    
    // Store resolved path for components that read from URL
    if (resolvedPath) {
      props._resolvedPath = resolvedPath;
    }
  }

  root.render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouteParamsProvider params={componentState?.params || {}} path={componentState?.resolvedPath || componentState?.path || ""}>
          <Component {...props} />
        </RouteParamsProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );

  // Cleanup on container close
  container.on("destroy", () => {
    if (componentInfo.reactRoot) {
      componentInfo.reactRoot.unmount();
      componentInfo.reactRoot = null;
    }
  });
}

interface GoldenLayoutContainerProps {
  defaultPath?: string;
  onContextReady?: (context: GoldenLayoutContextValue) => void;
}

/**
 * Bulletproof sanitizer for Golden Layout v2 configs.
 * Ensures ALL titles at any depth are converted to strings.
 * Prevents trimStart errors and removes forbidden runtime properties.
 * 
 * CRITICAL: This function must be called on EVERY config before loadLayout()
 */
function sanitizeGoldenLayoutConfig(node: any): any {
  // Handle null/undefined
  if (node == null) return node;
  
  // Handle primitives (strings, numbers, booleans)
  if (typeof node !== "object") return node;

  // Handle arrays and objects
  const clone: any = Array.isArray(node) ? [] : {};

  const forbiddenKeys = [
    "_isInitialised",
    "_layoutManager",
    "_contentItems",
    "parent",
    "container",
    "element",
    "$content",
    "header",
    "contentItem",
  ];

  for (const key in node) {
    // Skip forbidden runtime properties
    if (forbiddenKeys.includes(key)) continue;

    let value = node[key];

    // CRITICAL: Convert ALL titles to strings (this is what causes trimStart errors)
    if (key === "title") {
      if (value == null || value === undefined) {
        value = "";
      } else if (typeof value !== "string") {
        value = String(value);
      }
      // Ensure it's a string even if it was already a string (defensive)
      clone[key] = String(value);
      continue;
    }

    // Ensure componentType is a string (no errors thrown, just convert)
    if (key === "componentType") {
      if (value == null || value === undefined) {
        value = "";
      } else if (typeof value !== "string") {
        value = String(value);
      }
      clone[key] = String(value);
      continue;
    }

    // Ensure componentState is always an object
    if (key === "componentState") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        value = {};
      }
      // Recursively sanitize componentState
      clone[key] = sanitizeGoldenLayoutConfig(value);
      continue;
    }

    // Recurse into arrays or objects (this handles nested structures)
    clone[key] = sanitizeGoldenLayoutConfig(value);
  }

  return clone;
}

export default function GoldenLayoutContainer({ defaultPath = "/home", onContextReady }: GoldenLayoutContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<any>(null);
  const [tabs, setTabs] = useState<Map<string, TabState>>(new Map());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const contextNotifiedRef = useRef(false);
  const [layoutInitialized, setLayoutInitialized] = useState(false);

  // Convert v1 config format (content) to v2+ format (root)
  const convertToV2Config = (config: any): any => {
    if (!config || typeof config !== "object") return config;
    
    // If it already has root, it's already v2 format
    if (config.root) {
      return config; // Don't sanitize here, will be sanitized later
    }
    
    // Convert v1 format (content) to v2 format (root)
    if (config.content && Array.isArray(config.content)) {
      // v2 expects a single root item, so wrap content in a row or stack
      const root = config.content.length === 1 ? config.content[0] : {
        type: "row",
        content: config.content,
      };
      return { root };
    }
    
    return config;
  };

  // Validate layout config structure
  const validateLayoutConfig = (config: any): boolean => {
    if (!config || typeof config !== "object") return false;
    if (!config.root || typeof config.root !== "object") return false;
    return true;
  };

  // Safe load layout helper with error handling and fallback
  const safeLoadLayout = (config: any, layoutInstance: any) => {
    try {
      // Sanitize config first
      const sanitized = sanitizeGoldenLayoutConfig(config);
      
      // Validate structure
      if (!validateLayoutConfig(sanitized)) {
        throw new Error("Invalid layout config structure");
      }
      
      // Load the layout
      layoutInstance.loadLayout(sanitized);
    } catch (error) {
      console.error("Failed to load layout:", error);
      // Fallback to default config
      const defaultPage = getPageMetadata(defaultPath);
      const defaultConfig = {
        root: {
          type: "stack",
          content: [
            {
              type: "component",
              componentType: "PageComponent",
              title: String(defaultPage?.title || "Home"),
              componentState: {
                path: defaultPath,
                params: {},
              },
            },
          ],
        },
      };
      const sanitizedDefault = sanitizeGoldenLayoutConfig(defaultConfig);
      try {
        layoutInstance.loadLayout(sanitizedDefault);
      } catch (fallbackError) {
        console.error("Failed to load default layout:", fallbackError);
        clearLayoutState();
      }
    }
  };

  // Initialize Golden Layout
  useEffect(() => {
    if (!containerRef.current) return;

    // Register all page components (must happen before layout initialization)
    // Register components for all routes upfront
    Object.entries(pageRegistry).forEach(([path, metadata]) => {
      const resolvedPath = path; // For static routes
      const componentName = `page_${resolvedPath.replace(/[^a-zA-Z0-9]/g, "_")}`;
      if (!componentContainers.has(componentName)) {
        registerComponent(componentName, metadata.component);
      }
    });

    // Load saved state or create default
    const savedState = loadLayoutState();
    let config: any;

    if (savedState) {
      // Convert saved state to v2 format if needed
      config = convertToV2Config(savedState);
    } else {
      // Default config with single stack containing default page (v2 format)
      const defaultPage = getPageMetadata(defaultPath);

      config = {
        root: {
          type: "stack",
          content: [
            {
              type: "component",
              componentType: "PageComponent",
              title: String(defaultPage?.title || "Home"),
              componentState: {
                path: defaultPath,
                params: {},
              },
            },
          ],
        },
      };
    }

    // Ensure config is fully sanitized and in v2 format
    config = convertToV2Config(config);
    
    // Validate config has valid structure before proceeding
    if (!validateLayoutConfig(config)) {
      console.error("Invalid Golden Layout config, using default");
      const defaultPage = getPageMetadata(defaultPath);
      config = {
        root: {
          type: "stack",
          content: [
            {
              type: "component",
              componentType: "PageComponent",
              title: String(defaultPage?.title || "Home"),
              componentState: {
                path: defaultPath,
                params: {},
              },
            },
          ],
        },
      };
      // Clear potentially corrupted saved state
      clearLayoutState();
    }

    // Sanitize config before creating layout
    config = sanitizeGoldenLayoutConfig(config);

    // Create Golden Layout instance (v2+ - no config in constructor)
    // v2+ container is set via constructor or automatically when loadLayout is called
    const layout = new GoldenLayout(containerRef.current);

    // Register a generic component factory that handles all pages (v2+ API)
    layout.registerComponent("PageComponent", (container: any, componentState: any) => {
      const { path, params = {} } = componentState || {};
      const metadata = getPageMetadata(path, params);

      if (!metadata) {
        console.error(`No metadata found for path: ${path}`);
        return;
      }

      // For dynamic routes, we need to create a unique component name based on the resolved path
      const resolvedPath = metadata.isDynamic ? resolvePath(metadata.path, params) : path;
      const componentName = `page_${resolvedPath.replace(/[^a-zA-Z0-9]/g, "_")}`;
      
      // Register component if not already registered (for dynamic routes)
      if (!componentContainers.has(componentName)) {
        registerComponent(componentName, metadata.component);
      }
      
      renderComponent(container, componentName, { ...componentState, resolvedPath });

      // Track tab state (v2+ uses different container structure)
      const tabId = container.parent?.config?.id || container.config?.id || `tab_${Date.now()}`;
      const tabState: TabState = {
        id: tabId,
        path: resolvedPath,
        title: String(metadata?.title || "Untitled"),
        params,
      };

      setTabs((prev) => new Map(prev).set(tabId, tabState));
    });

    // Handle tab selection
    layout.on("tabCreated", (tab: any) => {
      const componentState = tab.contentItem?.config?.componentState;
      if (componentState) {
        const tabId = tab.contentItem?.config?.id || `tab_${Date.now()}`;
        setActiveTabId(tabId);
      }
    });

    // v2+ uses different event names - listen for state changes
    layout.on("stateChanged", () => {
      try {
        const state = layout.saveLayout();
        // Sanitize state before saving to prevent future issues
        const sanitizedState = sanitizeGoldenLayoutConfig(convertToV2Config(state));
        // Validate structure before storing
        if (sanitizedState && sanitizedState.root && typeof sanitizedState === "object") {
          saveLayoutState(sanitizedState);
        } else {
          console.warn("Invalid layout state structure, skipping save");
        }
      } catch (error) {
        console.error("Failed to save layout state:", error);
      }
      
      // Update tabs map from current layout state
      const newTabs = new Map<string, TabState>();
      const collectTabs = (item: any) => {
        if (item.type === "component" && item.componentState) {
          const { path, params = {} } = item.componentState;
          const metadata = getPageMetadata(path, params);
          if (metadata) {
            const tabId = item.id || `tab_${Date.now()}`;
            newTabs.set(tabId, {
              id: tabId,
              path: metadata.isDynamic ? resolvePath(metadata.path, params) : path,
              title: String(item.title || metadata?.title || "Untitled"),
              params,
            });
          }
        }
        if (item.content) {
          item.content.forEach(collectTabs);
        }
      };
      let foundActiveId: string | null = null;
      
      const findActiveTab = (item: any): void => {
        if (item.type === "component") {
          const tabId = item.id || item.config?.id;
          if (tabId && (item.isSelected || item.parent?.config?.activeItemIndex === item.parent?.content?.indexOf(item))) {
            foundActiveId = tabId;
          }
        }
        if (item.content) {
          item.content.forEach(findActiveTab);
        }
      };
      
      // Get state again after sanitization for tab collection
      // CRITICAL: Sanitize immediately after saveLayout() as it may return non-string titles
      const stateForTabsRaw = layout.saveLayout();
      const stateForTabs = sanitizeGoldenLayoutConfig(stateForTabsRaw);
      if (stateForTabs?.root) {
        collectTabs(stateForTabs.root);
        findActiveTab(stateForTabs.root);
      }
      setTabs(newTabs);
      if (foundActiveId) {
        setActiveTabId(foundActiveId);
      }
    });


    // Load layout (v2+ API - replaces init()) using safe helper
    safeLoadLayout(config, layout);

    layoutRef.current = layout;
    setLayoutInitialized(true);

    // Cleanup
    return () => {
      // Unmount all React roots
      componentContainers.forEach((info) => {
        if (info.reactRoot) {
          info.reactRoot.unmount();
          info.reactRoot = null;
        }
      });
      componentContainers.clear();

      if (layoutRef.current) {
        layoutRef.current.destroy();
        layoutRef.current = null;
      }
    };
  }, [defaultPath]);

  // Set active tab - define first since openTab uses it
  const setActiveTab = useCallback((tabId: string) => {
    if (!layoutRef.current) return;

    // v2+ API - get current state, find component, and reload with it as active
    // CRITICAL: Sanitize immediately after saveLayout() as it may return non-string titles
    const currentStateRaw = layoutRef.current.saveLayout();
    const currentState = sanitizeGoldenLayoutConfig(currentStateRaw);
    let foundComponent: any = null;

    const findComponent = (item: any): boolean => {
      if (item.type === "component" && item.id === tabId) {
        foundComponent = item;
        return true;
      }
      if (item.content) {
        for (const child of item.content) {
          if (findComponent(child)) return true;
        }
      }
      return false;
    };

    if (currentState?.root) {
      findComponent(currentState.root);
    }

    if (foundComponent) {
      // In v2+, we need to reload the layout with the component's stack set as active
      // For now, just update the active tab ID - the stateChanged event will handle the rest
      setActiveTabId(tabId);
    }
  }, []);

  // Get active tab
  const getActiveTab = useCallback((): TabState | null => {
    if (!activeTabId) return null;
    return tabs.get(activeTabId) || null;
  }, [activeTabId, tabs]);

  // Get all tabs
  const getAllTabs = useCallback((): TabState[] => {
    return Array.from(tabs.values());
  }, [tabs]);

  // Close tab function (v2+ API)
  const closeTab = useCallback((tabId: string) => {
    if (!layoutRef.current) return;

    // v2+ API - get current state, remove component, and reload
    // CRITICAL: Sanitize immediately after saveLayout() as it may return non-string titles
    const currentStateRaw = layoutRef.current.saveLayout();
    const sanitizedRaw = sanitizeGoldenLayoutConfig(currentStateRaw);
    const currentState = JSON.parse(JSON.stringify(sanitizedRaw)); // Deep clone of sanitized state
    
    const removeComponent = (item: any): boolean => {
      if (item.type === "component" && item.id === tabId) {
        return true; // Mark for removal
      }
      if (item.content) {
        const filtered = item.content.filter((child: any) => !removeComponent(child));
        if (filtered.length !== item.content.length) {
          item.content = filtered;
          return true;
        }
      }
      return false;
    };

    if (currentState?.root) {
      removeComponent(currentState.root);
      // Sanitize before reloading to ensure all titles are strings
      const sanitizedState = sanitizeGoldenLayoutConfig(currentState);
      
      // Use safeLoadLayout for error handling
      try {
        if (validateLayoutConfig(sanitizedState)) {
          layoutRef.current.loadLayout(sanitizedState);
        } else {
          console.warn("Invalid layout config after removing component, skipping reload");
        }
      } catch (error) {
        console.error("Failed to reload layout after closing tab:", error);
        // Layout state is already updated, error is logged
      }
    }

    setTabs((prev) => {
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  // Open tab function - checks for existing tabs and switches to them
  const openTab = useCallback((path: string, params?: Record<string, string>, title?: string) => {
    if (!layoutRef.current) return;

    // Try to find metadata - first try exact match, then try as dynamic route
    let metadata = getPageMetadata(path);
    let templatePath = path;
    let routeParams = params || {};

    // If no exact match and params provided, try to match dynamic route
    if (!metadata && params) {
      // Try to find a dynamic route that matches
      for (const [routePath, routeMetadata] of Object.entries(pageRegistry)) {
        if (routeMetadata.isDynamic) {
          const extracted = extractParams(routePath, path);
          if (extracted) {
            metadata = routeMetadata;
            templatePath = routePath;
            routeParams = extracted;
            break;
          }
        }
      }
    }

    if (!metadata) {
      // Try exact path match one more time
      metadata = getPageMetadata(path);
      if (!metadata) {
        console.error(`No metadata found for path: ${path}`);
        return;
      }
      templatePath = metadata.path;
    }

    const resolvedPath = metadata.isDynamic ? resolvePath(templatePath, routeParams) : templatePath;
    // Ensure tabTitle is always a string (Golden Layout requires strings for titles)
    const tabTitle = String(title || metadata?.title || "Untitled");

    // Check if a tab with this path already exists
    const existingTab = Array.from(tabs.values()).find(
      (tab) => tab.path === resolvedPath && 
      JSON.stringify(tab.params || {}) === JSON.stringify(routeParams)
    );

    if (existingTab) {
      // Switch to existing tab instead of creating a new one
      setActiveTab(existingTab.id);
      return;
    }

    // Find or create a stack (v2+ API - use saveLayout/loadLayout pattern)
    // CRITICAL: Sanitize immediately after saveLayout() as it may return non-string titles
    const currentStateRaw = layoutRef.current.saveLayout();
    const sanitizedRaw = sanitizeGoldenLayoutConfig(currentStateRaw);
    const currentState = JSON.parse(JSON.stringify(sanitizedRaw)); // Deep clone of sanitized state
    const rootContent = currentState?.root;
    let stack: any = null;

    // Try to find existing stack
    const findStack = (item: any): any => {
      if (item.type === "stack") {
        return item;
      }
      if (item.content) {
        for (const child of item.content) {
          const found = findStack(child);
          if (found) return found;
        }
      }
      return null;
    };

    if (rootContent) {
      stack = findStack(rootContent);
      // CRITICAL: Sanitize the stack object itself as it may have non-string titles
      if (stack) {
        stack = sanitizeGoldenLayoutConfig(stack);
      }
    }

    // If no stack found, create one by modifying the config
    if (!stack) {
      const newConfig = {
        root: {
          type: "stack",
          content: rootContent ? [rootContent] : [],
        },
      };
      // Sanitize before loading
      const sanitizedConfig = sanitizeGoldenLayoutConfig(newConfig);
      try {
        if (validateLayoutConfig(sanitizedConfig)) {
          layoutRef.current.loadLayout(sanitizedConfig);
        } else {
          throw new Error("Invalid stack config structure");
        }
      } catch (error) {
        console.error("Failed to create stack in layout:", error);
        // Continue without creating stack - will be handled by next attempt
      }
      // Get updated state (deep clone again)
      // CRITICAL: Sanitize immediately after saveLayout() as it may return non-string titles
      const updatedStateRaw = layoutRef.current.saveLayout();
      const sanitizedUpdatedState = sanitizeGoldenLayoutConfig(updatedStateRaw);
      const updatedState = JSON.parse(JSON.stringify(sanitizedUpdatedState)); // Deep clone of sanitized state
      stack = sanitizedUpdatedState?.root;
      // Update currentState to match (use sanitized version)
      currentState.root = sanitizedUpdatedState.root;
    }

    // Add new component to stack by modifying config and reloading
    if (stack) {
      // Sanitize componentState before adding to config
      const sanitizedComponentState = sanitizeGoldenLayoutConfig({
        path: templatePath, // Store template path, not resolved
        params: routeParams,
      });
      
      // Create new component with all fields properly sanitized
      const newComponent = {
        type: "component",
        componentType: "PageComponent",
        title: String(tabTitle || ""), // Explicitly ensure string
        componentState: sanitizedComponentState,
      };
      
      // Sanitize the new component itself before adding
      const sanitizedNewComponent = sanitizeGoldenLayoutConfig(newComponent);
      
      // Add component to stack's content
      if (!stack.content) {
        stack.content = [];
      }
      stack.content.push(sanitizedNewComponent);
      
      // CRITICAL: Sanitize the entire config structure including the stack
      // This must happen AFTER adding the component to ensure all nested titles are strings
      // Multiple sanitization passes to ensure deep nested structures are caught
      let sanitizedState = sanitizeGoldenLayoutConfig(currentState);
      
      // Double-check: ensure root and all nested structures are sanitized
      if (sanitizedState?.root) {
        sanitizedState.root = sanitizeGoldenLayoutConfig(sanitizedState.root);
        // Also sanitize the stack if it exists
        if (sanitizedState.root.type === "stack" && sanitizedState.root.content) {
          sanitizedState.root.content = sanitizedState.root.content.map((item: any) => 
            sanitizeGoldenLayoutConfig(item)
          );
        }
      }
      
      // Final sanitization pass to catch anything we might have missed
      sanitizedState = sanitizeGoldenLayoutConfig(sanitizedState);
      
      // Use safeLoadLayout helper for error handling
      try {
        if (validateLayoutConfig(sanitizedState)) {
          layoutRef.current.loadLayout(sanitizedState);
        } else {
          throw new Error("Invalid layout config after adding component");
        }
      } catch (error) {
        console.error("Failed to add component to layout:", error);
        // Component was added to state but layout failed to load
        // The stateChanged event will handle recovery
      }
    }
  }, [tabs, setActiveTab]);

  const contextValue: GoldenLayoutContextValue = {
    openTab,
    closeTab,
    getActiveTab,
    getAllTabs,
    setActiveTab,
  };

  // Notify parent when context is ready (only once when layout is initialized)
  useEffect(() => {
    if (onContextReady && layoutInitialized && !contextNotifiedRef.current) {
      onContextReady(contextValue);
      contextNotifiedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutInitialized]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
}

