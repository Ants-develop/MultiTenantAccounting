import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RsGeData = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">rs.ge Data</h1>
        <p className="text-muted-foreground">
          Manage data from rs.ge integration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>rs.ge Data Management</CardTitle>
          <CardDescription>
            Import and analyze rs.ge data
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

export default RsGeData;
