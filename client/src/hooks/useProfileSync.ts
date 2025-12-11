import { useEffect } from 'react';
import { useAuth } from './useAuth';

export function useProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const response = await fetch('/api/feed/profile-sync', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Error syncing profile to backend:', error);
        }
      } catch (err) {
        console.error('Error syncing profile:', err);
      }
    };

    syncProfile();
  }, [user]);
}
