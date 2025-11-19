import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DataWarehouse = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Warehouse</h1>
        <p className="text-muted-foreground">
          Manage and analyze your business data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Warehouse</CardTitle>
          <CardDescription>
            Your centralized data storage and analytics platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section is under development. Features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataWarehouse;
