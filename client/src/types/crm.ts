export interface DealStage {
    id: string;
    name: string;
    description: string | null;
    color: string;
    order: number;
    is_closed: boolean;
    is_won: boolean;
    probability: number;
    created_at: string;
    updated_at: string;
}

export interface Deal {
    id: string;
    name: string;
    description: string | null;
    stage_id: string;
    deal_value: number | null;
    currency: string;
    expected_close_date: string | null;
    actual_close_date: string | null;
    probability: number;
    client_id: string | null;
    contact_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    company_name: string | null;
    owner_id: string;
    lead_source: string | null;
    status: 'open' | 'won' | 'lost' | 'abandoned';
    lost_reason: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Joined data
    stage?: {
        name: string;
        color: string;
    };
    owner?: {
        full_name: string;
        avatar_url: string | null;
    };
    clients?: {
        name: string;
    };
}

export interface DealActivity {
    id: string;
    deal_id: string;
    activity_type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'task';
    subject: string;
    description: string | null;
    due_date: string | null;
    completed_at: string | null;
    old_stage_id: string | null;
    new_stage_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Joined data
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
    old_stage?: DealStage;
    new_stage?: DealStage;
}

export interface DealContact {
    id: string;
    deal_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    is_primary: boolean;
    created_at: string;
}

export interface DealFilters {
    owner_id?: string;
    stage_id?: string;
    status?: 'open' | 'won' | 'lost' | 'abandoned';
    min_value?: number;
    max_value?: number;
    lead_source?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
}

export interface PipelineMetrics {
    total_deals: number;
    total_value: number;
    open_deals: number;
    open_value: number;
    won_deals: number;
    won_value: number;
    lost_deals: number;
    lost_value: number;
    average_deal_size: number;
    win_rate: number;
    expected_revenue: number;
    value_by_stage: Array<{
        stage_id: string;
        stage_name: string;
        count: number;
        total_value: number;
    }>;
    deals_by_owner: Array<{
        owner_id: string;
        owner_name: string;
        count: number;
        total_value: number;
    }>;
}

export interface CreateDealInput {
    name: string;
    description?: string;
    stage_id: string;
    deal_value?: number;
    currency?: string;
    expected_close_date?: string;
    probability?: number;
    contact_name: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    owner_id: string;
    lead_source?: string;
}

export interface UpdateDealInput {
    name?: string;
    description?: string;
    stage_id?: string;
    deal_value?: number;
    currency?: string;
    expected_close_date?: string;
    actual_close_date?: string;
    probability?: number;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    owner_id?: string;
    lead_source?: string;
    status?: 'open' | 'won' | 'lost' | 'abandoned';
    lost_reason?: string;
}

export interface CreateActivityInput {
    deal_id: string;
    activity_type: 'note' | 'call' | 'email' | 'meeting' | 'task';
    subject: string;
    description?: string;
    due_date?: string;
}

export interface CreateDealContactInput {
    deal_id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
}

export interface UpdateDealContactInput {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
}
