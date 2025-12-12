import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface User {
    id: string | number;
    full_name: string;
    avatar_url: string | null;
    email?: string;
}

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, phone, job_title");
            
            if (error) throw error;
            return (data || []) as User[];
        },
    });
}
