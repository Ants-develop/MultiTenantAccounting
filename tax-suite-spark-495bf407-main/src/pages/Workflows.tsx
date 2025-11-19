import { Card, CardContent } from "@/components/ui/card";

const Workflows = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflows</h1>
        <p className="text-muted-foreground">
          Manage workflow templates and client workflows
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Workflow management interface with templates and automation coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Workflows;
