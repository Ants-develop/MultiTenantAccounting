import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Billing = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">Invoices and payments</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>
      
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Billing system coming soon...
      </div>
    </div>
  );
};

export default Billing;
