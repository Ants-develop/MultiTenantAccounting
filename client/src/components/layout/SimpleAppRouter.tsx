import { useLocation } from "wouter";
import { pageRegistry, resolvePath, extractParams, getPageMetadata } from "@/lib/pageRegistry";
import SimplePageLayout from "@/components/layout/SimplePageLayout";
import NotFound from "@/pages/not-found";
import { useMemo } from "react";
import { RouteParamsProvider } from "@/contexts/RouteParamsContext";

export default function SimpleAppRouter() {
    const [location] = useLocation();

    const { Component, params, resolvedPath } = useMemo(() => {
        // 1. Try exact match
        let metadata = getPageMetadata(location);
        let routeParams: Record<string, string> = {};
        let path = location;

        // 2. If no exact match, try dynamic routes
        if (!metadata) {
            for (const [routePath, routeMetadata] of Object.entries(pageRegistry)) {
                if (routeMetadata.isDynamic) {
                    const extracted = extractParams(routePath, location);
                    if (extracted) {
                        metadata = routeMetadata;
                        routeParams = extracted;
                        path = routePath;
                        break;
                    }
                }
            }
        }

        if (!metadata || !metadata.component) {
            return { Component: NotFound, params: {}, resolvedPath: location };
        }

        return {
            Component: metadata.component,
            params: routeParams,
            resolvedPath: path
        };
    }, [location]);

    // Map params to props expected by components
    const props: Record<string, any> = {};
    const routeParams = params as Record<string, string>;

    if (routeParams.id) {
        if (resolvedPath.includes("/tasks/") || resolvedPath === "/tasks/:id") {
            props.taskId = parseInt(routeParams.id);
        } else if (resolvedPath.includes("/clients/") && (resolvedPath.includes("/profile") || resolvedPath === "/clients/:id/profile")) {
            props.clientId = parseInt(routeParams.id);
        } else if (resolvedPath.includes("/clients/") && (resolvedPath.includes("/onboarding") || resolvedPath === "/clients/:id/onboarding")) {
            props.clientId = parseInt(routeParams.id);
        } else if (resolvedPath.includes("/jobs/") || resolvedPath === "/jobs/:id") {
            props.jobId = parseInt(routeParams.id);
        } else if (resolvedPath.includes("/pipelines/") || resolvedPath === "/pipelines/:id") {
            props.pipelineId = parseInt(routeParams.id);
        }
    }

    if (resolvedPath) {
        props._resolvedPath = resolvedPath;
    }

    return (
        <SimplePageLayout>
            <RouteParamsProvider params={params} path={resolvedPath}>
                <Component {...props} />
            </RouteParamsProvider>
        </SimplePageLayout>
    );
}
