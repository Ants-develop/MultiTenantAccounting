import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DealsKanban } from "@/components/crm/DealsKanban";
import { CreateDealDialog } from "@/components/crm/CreateDealDialog";
import { EditDealDialog } from "@/components/crm/EditDealDialog";
import { DealDetailsDrawer } from "@/components/crm/DealDetailsDrawer";
import { usePipelineMetrics } from "@/hooks/usePipelineMetrics";
import { useDealStages } from "@/hooks/useDealStages";
import { useUsers } from "@/hooks/useUsers";
import { Deal, DealFilters } from "@/types/crm";
import { Skeleton } from "@/components/ui/skeleton";

export default function CRM() {
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [filters, setFilters] = useState<DealFilters>({});
    const [searchQuery, setSearchQuery] = useState("");

    const { data: metrics, isLoading: metricsLoading } = usePipelineMetrics();
    const { data: stages } = useDealStages();
    const { data: users } = useUsers();

    const handleDealClick = (deal: Deal) => {
        setSelectedDeal(deal);
        setDetailsDrawerOpen(true);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setFilters(prev => ({ ...prev, search: value || undefined }));
    };

    const handleStageFilter = (value: string) => {
        setFilters(prev => ({
            ...prev,
            stage_id: value === "all" ? undefined : value
        }));
    };

    const handleOwnerFilter = (value: string) => {
        setFilters(prev => ({
            ...prev,
            owner_id: value === "all" ? undefined : value
        }));
    };

    const handleStatusFilter = (value: string) => {
        setFilters(prev => ({
            ...prev,
            status: value === "all" ? undefined : value as any
        }));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your sales opportunities and track progress</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Deal
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metricsLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold">{formatCurrency(metrics?.open_value || 0)}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics?.open_deals || 0} open deals
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metricsLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{metrics?.open_deals || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Active opportunities
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metricsLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{metrics?.win_rate.toFixed(1) || 0}%</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics?.won_deals || 0} won / {(metrics?.won_deals || 0) + (metrics?.lost_deals || 0)} closed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metricsLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold">{formatCurrency(metrics?.average_deal_size || 0)}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Per closed deal
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <Input
                                placeholder="Search deals..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stage</label>
                            <Select onValueChange={handleStageFilter} defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="All stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stages</SelectItem>
                                    {stages?.map(stage => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Owner</label>
                            <Select onValueChange={handleOwnerFilter} defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="All owners" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All owners</SelectItem>
                                    {users?.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select onValueChange={handleStatusFilter} defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="won">Won</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                    <SelectItem value="abandoned">Abandoned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Kanban Board */}
            <DealsKanban onDealClick={handleDealClick} filters={filters} />

            {/* Dialogs */}
            <CreateDealDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />

            {selectedDeal && (
                <>
                    <EditDealDialog
                        deal={selectedDeal}
                        open={editDialogOpen}
                        onOpenChange={setEditDialogOpen}
                    />

                    <DealDetailsDrawer
                        dealId={selectedDeal.id}
                        open={detailsDrawerOpen}
                        onOpenChange={setDetailsDrawerOpen}
                        onEdit={(deal) => {
                            setSelectedDeal(deal);
                            setDetailsDrawerOpen(false);
                            setEditDialogOpen(true);
                        }}
                    />
                </>
            )}
        </div>
    );
}
