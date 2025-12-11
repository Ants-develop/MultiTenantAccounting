import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      // Upsert profile
      // We assume user.id (integer) maps to feed_profiles.id
      const { error } = await supabase
        .from('feed_profiles')
        .upsert({
          id: user.id,
          full_name: `${user.firstName} ${user.lastName}`.trim(),
          avatar_url: null, // We don't have avatar in main auth yet, maybe add later
          job_title: user.globalRole || 'User', // Fallback
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error syncing profile to Supabase:', error);
      }
    };

    syncProfile();
  }, [user]);
}

