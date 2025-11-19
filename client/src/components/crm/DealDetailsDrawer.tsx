import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Deal } from "@/types/crm";

interface DealDetailsDrawerProps {
    dealId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (deal: Deal) => void;
}

export const DealDetailsDrawer = ({ dealId, open, onOpenChange, onEdit }: DealDetailsDrawerProps) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Deal Details</SheetTitle>
                </SheetHeader>
                <p className="text-muted-foreground mt-4">Deal details view coming soon...</p>
            </SheetContent>
        </Sheet>
    );
};
