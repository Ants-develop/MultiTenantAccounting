import { useQuery } from "@tanstack/react-query";

// Mock user data
interface User {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

const mockUsers: User[] = [
    { id: "1", full_name: "John Doe", avatar_url: null },
    { id: "2", full_name: "Jane Smith", avatar_url: null },
    { id: "3", full_name: "Bob Johnson", avatar_url: null },
];

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/users");
            // return await response.json();
            return mockUsers;
        },
    });
}
