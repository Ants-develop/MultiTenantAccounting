import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Table, Grid3x3, Palette, FormInput, BarChart3, Beaker, Database } from "lucide-react";

interface DemoCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  status: "available" | "coming-soon";
}

const demos: DemoCard[] = [
  {
    title: "Handsontable Demo",
    description:
      "Comprehensive demo showcasing advanced Handsontable features including nested headers, filters, sorting, and various column types",
    icon: Beaker,
    path: "/testing/handsontable",
    status: "available",
  },
  {
    title: "TanStack Table Demo",
    description: "Headless table with custom styling, compact rows, context menu, and advanced sorting/filtering",
    icon: Table,
    path: "/testing/tanstack",
    status: "available",
  },
  {
    title: "AG Grid Demo",
    description: "Enterprise-grade grid with Excel-style filters, quick search, and virtualization",
    icon: BarChart3,
    path: "/testing/ag-grid",
    status: "available",
  },
  {
    title: "Tabulator Demo",
    description: "Scrollable financial grid with clipboard integration, header filters, and context actions",
    icon: Grid3x3,
    path: "/testing/tabulator",
    status: "available",
  },
  {
    title: "Syncfusion DataGrid Demo",
    description: "Community-licensed grid with virtualization, Excel filters, exports, and compact ledger styling",
    icon: Database,
    path: "/testing/syncfusion",
    status: "available",
  },
  {
    title: "Form Components",
    description: "Test various form components, validation, and input types",
    icon: FormInput,
    path: "/testing/forms",
    status: "coming-soon",
  },
  {
    title: "UI Components",
    description: "Browse and test shadcn/ui components library",
    icon: Palette,
    path: "/testing/ui-components",
    status: "coming-soon",
  },
  {
    title: "Charts & Visualizations",
    description: "Interactive charts and data visualization examples",
    icon: BarChart3,
    path: "/testing/charts",
    status: "coming-soon",
  },
];

export default function TestingDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Testing Playground</h1>
        <p className="text-muted-foreground">
          Explore and test UI components, data grids, and various features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((demo) => {
          const Icon = demo.icon;
          const isAvailable = demo.status === "available";

          return (
            <Card key={demo.path} className={!isAvailable ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{demo.title}</CardTitle>
                      {!isAvailable && (
                        <span className="text-xs text-muted-foreground">Coming Soon</span>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">{demo.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => isAvailable && setLocation(demo.path)}
                  disabled={!isAvailable}
                  className="w-full"
                  variant={isAvailable ? "default" : "secondary"}
                >
                  {isAvailable ? "Open Demo" : "Coming Soon"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Testing Module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This Testing module is a playground for exploring and testing various UI components and features
            used throughout the application. It's designed to help developers and administrators:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Test new component implementations before integrating them</li>
            <li>Explore advanced features and configurations</li>
            <li>Compare different approaches and libraries</li>
            <li>Verify component behavior in isolation</li>
            <li>Prototype new features and interactions</li>
          </ul>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This module is only accessible to global administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

