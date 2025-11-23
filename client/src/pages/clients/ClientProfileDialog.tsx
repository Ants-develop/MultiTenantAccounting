import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { ClientProfile } from "./ClientProfile";

interface ClientProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    clientName?: string;
}

export const ClientProfileDialog: React.FC<ClientProfileDialogProps> = ({
    open,
    onOpenChange,
    clientId,
    clientName,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>Client Profile</DialogTitle>
                    <DialogDescription>View and edit client information</DialogDescription>
                </VisuallyHidden>
                <div className="overflow-y-auto p-6">
                    <ClientProfile clientId={clientId} onClose={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
};
