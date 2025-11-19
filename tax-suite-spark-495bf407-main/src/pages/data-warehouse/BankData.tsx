import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BankData = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Data</h1>
        <p className="text-muted-foreground">
          Manage and analyze bank transaction data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Data Management</CardTitle>
          <CardDescription>
            Import and analyze bank transactions
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

export default BankData;
