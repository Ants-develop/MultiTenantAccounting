import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const JournalEntries = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
        <p className="text-muted-foreground">
          Manage accounting journal entries
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>
            Create and manage accounting journal entries
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

export default JournalEntries;
