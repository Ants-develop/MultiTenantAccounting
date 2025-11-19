import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useDealStages } from "@/hooks/useDealStages";
import { useUsers } from "@/hooks/useUsers";
import { useDealMutations } from "@/hooks/useDeals";
import { useToast } from "@/hooks/use-toast";

interface CreateDealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateDealDialog = ({ open, onOpenChange }: CreateDealDialogProps) => {
    const { data: stages } = useDealStages();
    const { data: users } = useUsers();
    const { createDeal } = useDealMutations();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        deal_value: "",
        stage_id: "",
        owner_id: "",
        expected_close_date: "",
        description: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        createDeal.mutate(
            {
                ...formData,
                deal_value: formData.deal_value ? parseFloat(formData.deal_value) : undefined,
                currency: "USD",
                status: "open",
                probability: stages?.find(s => s.id === formData.stage_id)?.probability || 0,
            },
            {
                onSuccess: () => {
                    toast({ title: "Deal created successfully" });
                    onOpenChange(false);
                    setFormData({
                        name: "",
                        company_name: "",
                        contact_name: "",
                        contact_email: "",
                        contact_phone: "",
                        deal_value: "",
                        stage_id: "",
                        owner_id: "",
                        expected_close_date: "",
                        description: "",
                    });
                },
                onError: () => {
                    toast({ title: "Failed to create deal", variant: "destructive" });
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Deal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Deal Name *</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Annual Tax Services"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input
                                id="company_name"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="Acme Corporation"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact_name">Contact Name *</Label>
                            <Input
                                id="contact_name"
                                required
                                value={formData.contact_name}
                                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_email">Contact Email</Label>
                            <Input
                                id="contact_email"
                                type="email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_phone">Contact Phone</Label>
                            <Input
                                id="contact_phone"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="deal_value">Deal Value</Label>
                            <Input
                                id="deal_value"
                                type="number"
                                value={formData.deal_value}
                                onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                                placeholder="50000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expected_close_date">Expected Close Date</Label>
                            <Input
                                id="expected_close_date"
                                type="date"
                                value={formData.expected_close_date}
                                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stage_id">Stage *</Label>
                            <Select
                                value={formData.stage_id}
                                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                                required
                            >
                                <SelectTrigger id="stage_id">
                                    <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages?.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner_id">Owner *</Label>
                            <Select
                                value={formData.owner_id}
                                onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                                required
                            >
                                <SelectTrigger id="owner_id">
                                    <SelectValue placeholder="Select owner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users?.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Deal details..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createDeal.isPending}>
                            {createDeal.isPending ? "Creating..." : "Create Deal"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
