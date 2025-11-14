import { useEffect, useRef, useState, useCallback } from "react";
import { Layout, Model, IJsonModel, TabNode, Actions, DockLocation, Node } from "flexlayout-react";
import "flexlayout-react/style/light.css";
import { pageRegistry, getPageMetadata, resolvePath, extractParams } from "@/lib/pageRegistry";
import { saveLayoutState, loadLayoutState, clearLayoutState } from "@/lib/flexLayoutStorage";
import { GoldenLayoutProvider, TabState, GoldenLayoutContextValue } from "@/hooks/useGoldenLayout";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RouteParamsProvider } from "@/contexts/RouteParamsContext";

interface FlexLayoutContainerProps {
  defaultPath?: string;
  onContextReady?: (context: GoldenLayoutContextValue) => void;
}

export default function FlexLayoutContainer({ defaultPath = "/home", onContextReady }: FlexLayoutContainerProps) {
  const layoutRef = useRef<Layout | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [tabs, setTabs] = useState<Map<string, TabState>>(new Map());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const contextNotifiedRef = useRef(false);
  const [layoutInitialized, setLayoutInitialized] = useState(false);

  // Component factory for FlexLayout
  // Factory receives a TabNode and returns the React component to render
  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    if (!component || typeof component !== "string") {
      return null;
    }

    // Component name format: "page_<path_with_underscores>"
    // Extract path and params from component name and config
    const config = node.getConfig();
    const path = config?.path || "";
    const params = config?.params || {};
    const resolvedPath = config?.resolvedPath || path;

    const metadata = getPageMetadata(path, params);
    if (!metadata) {
      console.error(`No metadata found for path: ${path}`);
      return null;
    }

    const Component = metadata.component;

    // Extract props from params (for dynamic routes)
    let props: Record<string, any> = {};
    if (params.id) {
      if (path.includes("/tasks/") || path === "/tasks/:id") {
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

    if (resolvedPath) {
      props._resolvedPath = resolvedPath;
    }

    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouteParamsProvider params={params} path={resolvedPath}>
            <Component {...props} />
          </RouteParamsProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    );
  }, []);

  // Convert FlexLayout model to tabs map
  const updateTabsFromModel = useCallback((model: Model) => {
    const newTabs = new Map<string, TabState>();
    let foundActiveId: string | null = null;

    // Visit all tab nodes in the model
    model.visitNodes((node: Node) => {
      if (node.getType() === "tab") {
        const tabNode = node as TabNode;
        const config = tabNode.getConfig();
        if (config?.path) {
          const { path, params = {}, resolvedPath } = config;
          const metadata = getPageMetadata(path, params);
          if (metadata) {
            const tabId = tabNode.getId();
            newTabs.set(tabId, {
              id: tabId,
              path: resolvedPath || (metadata.isDynamic ? resolvePath(metadata.path, params) : path),
              title: tabNode.getName() || metadata.title || "Untitled",
              params,
            });

            // Check if this tab is active
            const parent = tabNode.getParent();
            if (parent && parent.getSelectedNode() === tabNode) {
              foundActiveId = tabId;
            }
          }
        }
      }
    });

    setTabs(newTabs);
    if (foundActiveId) {
      setActiveTabId(foundActiveId);
    } else if (newTabs.size > 0) {
      // If no active tab found but we have tabs, set the first one as active
      const firstTabId = Array.from(newTabs.keys())[0];
      setActiveTabId(firstTabId);
    }
  }, []);

  // Create default model
  const createDefaultModel = useCallback((): IJsonModel => {
    const defaultPage = getPageMetadata(defaultPath);
    const resolvedPath = defaultPath;
    const componentName = `page_${resolvedPath.replace(/[^a-zA-Z0-9]/g, "_")}`;

    return {
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
                id: `tab_${Date.now()}`,
                name: defaultPage?.title || "Home",
                component: componentName,
                config: {
                  path: defaultPath,
                  params: {},
                  resolvedPath,
                },
              },
            ],
          },
        ],
      },
    };
  }, [defaultPath]);

  // Initialize layout
  useEffect(() => {
    // Load saved state or create default
    const savedState = loadLayoutState();
    let jsonModel: IJsonModel;

    if (savedState) {
      try {
        jsonModel = savedState;
      } catch (error) {
        console.error("Failed to parse saved layout state:", error);
        jsonModel = createDefaultModel();
        clearLayoutState();
      }
    } else {
      jsonModel = createDefaultModel();
    }

    // Create model
    const newModel = Model.fromJson(jsonModel);

    // Update tabs from initial model
    updateTabsFromModel(newModel);

    setModel(newModel);
    setLayoutInitialized(true);
  }, [defaultPath, createDefaultModel, updateTabsFromModel]);

  // Set active tab - use Actions API for proper model updates
  const setActiveTab = useCallback((tabId: string) => {
    if (!model) return;

    // Find the tab node
    let targetNode: TabNode | null = null;
    model.visitNodes((node: Node) => {
      if (node.getType() === "tab" && node.getId() === tabId) {
        targetNode = node as TabNode;
      }
    });

    if (targetNode) {
      const parent = targetNode.getParent();
      if (parent) {
        // Use setSelectedNode to activate the tab
        parent.setSelectedNode(targetNode);
      }
    }
  }, [model]);

  // Get active tab
  const getActiveTab = useCallback((): TabState | null => {
    if (!activeTabId) return null;
    return tabs.get(activeTabId) || null;
  }, [activeTabId, tabs]);

  // Get all tabs
  const getAllTabs = useCallback((): TabState[] => {
    return Array.from(tabs.values());
  }, [tabs]);

  // Close tab - use Actions API for proper model updates
  const closeTab = useCallback((tabId: string) => {
    if (!model) return;

    // Use Actions API to delete the node properly
    model.doAction(Actions.deleteTab(tabId));

    // Update local tabs state
    setTabs((prev) => {
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, [model]);

  // Open tab function
  const openTab = useCallback((path: string, params?: Record<string, string>, title?: string) => {
    if (!model) return;

    // Try to find metadata
    let metadata = getPageMetadata(path);
    let templatePath = path;
    let routeParams = params || {};

    // If no exact match and params provided, try to match dynamic route
    if (!metadata && params) {
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
      metadata = getPageMetadata(path);
      if (!metadata) {
        console.error(`No metadata found for path: ${path}`);
        return;
      }
      templatePath = metadata.path;
    }

    const resolvedPath = metadata.isDynamic ? resolvePath(templatePath, routeParams) : templatePath;
    const tabTitle = title || metadata?.title || "Untitled";

    // Check if a tab with this path already exists
    const existingTab = Array.from(tabs.values()).find(
      (tab) => tab.path === resolvedPath && 
      JSON.stringify(tab.params || {}) === JSON.stringify(routeParams)
    );

    if (existingTab) {
      // Switch to existing tab
      setActiveTab(existingTab.id);
      return;
    }

    // Find the first tabset to add the new tab to
    // FlexLayout pattern: tabs are always added to tabsets
    let targetTabsetId: string | null = null;
    model.visitNodes((node: Node) => {
      if (node.getType() === "tabset" && !targetTabsetId) {
        targetTabsetId = node.getId();
      }
    });

    // If no tabset exists (shouldn't happen with our default model, but handle it)
    if (!targetTabsetId) {
      console.warn("No tabset found, creating one");
      const root = model.getRoot();
      if (root) {
        // Create a tabset using Actions API
        const newTabsetId = `tabset_${Date.now()}`;
        model.doAction(
          Actions.addNode(
            {
              type: "tabset",
              id: newTabsetId,
              weight: 100,
              children: [],
            },
            root.getId(),
            DockLocation.CENTER,
            -1
          )
        );
        targetTabsetId = newTabsetId;
      } else {
        console.error("Cannot find root node for new tab");
        return;
      }
    }

    // Create new tab using Actions API
    const componentName = `page_${resolvedPath.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use Actions.addNode to properly add the tab
    model.doAction(
      Actions.addNode(
        {
          type: "tab",
          id: tabId,
          name: tabTitle,
          component: componentName,
          config: {
            path: templatePath,
            params: routeParams,
            resolvedPath,
          },
        },
        targetTabsetId,
        DockLocation.CENTER,
        -1 // Add at the end
      )
    );
  }, [tabs, setActiveTab, model]);

  const contextValue: GoldenLayoutContextValue = {
    openTab,
    closeTab,
    getActiveTab,
    getAllTabs,
    setActiveTab,
  };

  // Notify parent when context is ready
  useEffect(() => {
    if (onContextReady && layoutInitialized && !contextNotifiedRef.current && model) {
      onContextReady(contextValue);
      contextNotifiedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutInitialized, model]);

  // Handle model changes
  const handleModelChange = useCallback((newModel: Model) => {
    setModel(newModel);
    updateTabsFromModel(newModel);
    try {
      const json = newModel.toJson();
      saveLayoutState(json);
    } catch (error) {
      console.error("Failed to save layout state:", error);
    }
  }, [updateTabsFromModel]);

  if (!model) {
    return <div className="w-full h-full" />;
  }

  return (
    <div className="w-full h-full flexlayout-container">
      <Layout
        ref={layoutRef}
        model={model}
        factory={factory}
        onModelChange={handleModelChange}
      />
    </div>
  );
}

