import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Deal } from "@/types/crm";

interface EditDealDialogProps {
    deal: Deal;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const EditDealDialog = ({ deal, open, onOpenChange }: EditDealDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Deal: {deal.name}</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">Edit functionality coming soon...</p>
            </DialogContent>
        </Dialog>
    );
};
