export interface CalendarEvent {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    event_type: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    color: string;
    meeting_link: string | null;
    created_by: string;
    created_at: string;
    participants?: EventParticipant[];
    my_status?: 'pending' | 'accepted' | 'declined' | 'tentative';
    is_organizer?: boolean;
}

export interface EventParticipant {
    id: string;
    user_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
    is_organizer: boolean;
    full_name: string;
}
