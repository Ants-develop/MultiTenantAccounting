import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NewConversationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export const NewConversationDialog = ({ open, onOpenChange, onSuccess }: NewConversationDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">Feature coming soon...</p>
            </DialogContent>
        </Dialog>
    );
};
