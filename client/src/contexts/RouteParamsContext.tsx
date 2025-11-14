import { createContext, useContext, ReactNode } from "react";

interface RouteParamsContextValue {
  params: Record<string, string>;
  path: string;
}

const RouteParamsContext = createContext<RouteParamsContextValue | null>(null);

export function RouteParamsProvider({
  children,
  params = {},
  path = "",
}: {
  children: ReactNode;
  params?: Record<string, string>;
  path?: string;
}) {
  return (
    <RouteParamsContext.Provider value={{ params, path }}>
      {children}
    </RouteParamsContext.Provider>
  );
}

export function useRouteParams(): RouteParamsContextValue {
  const context = useContext(RouteParamsContext);
  if (!context) {
    // Fallback: try to read from URL
    const pathname = window.location.pathname;
    const params: Record<string, string> = {};
    
    // Simple extraction for common patterns
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      // Try to match common patterns like /tasks/:id
      if (pathParts[0] === "tasks" && pathParts[1]) {
        params.id = pathParts[1];
      } else if (pathParts[0] === "jobs" && pathParts[1]) {
        params.id = pathParts[1];
      } else if (pathParts[0] === "pipelines" && pathParts[1]) {
        params.id = pathParts[1];
      } else if (pathParts[0] === "clients" && pathParts[1] && pathParts[2]) {
        params.id = pathParts[1];
      }
    }
    
    return { params, path: pathname };
  }
  return context;
}

