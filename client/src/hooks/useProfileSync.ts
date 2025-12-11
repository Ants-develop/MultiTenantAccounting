import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from "@/lib/queryClient";

export function useProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        await apiRequest("POST", '/api/feed/profile-sync');
      } catch (err) {
        console.error('Error syncing profile:', err);
      }
    };

    syncProfile();
  }, [user]);
}
