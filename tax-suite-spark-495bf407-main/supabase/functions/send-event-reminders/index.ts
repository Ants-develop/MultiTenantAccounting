import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  reminder_minutes: number;
  last_reminded_at: string | null;
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    location: string | null;
    meeting_link: string | null;
  };
  profile: {
    full_name: string;
    email: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting event reminder check...');

    // Get current time
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Query for participants who need reminders
    // We need to check if: start_time - reminder_minutes falls within the next 5 minutes
    const { data: participants, error: fetchError } = await supabase
      .from('calendar_event_participants')
      .select(`
        id,
        event_id,
        user_id,
        reminder_minutes,
        last_reminded_at,
        event:calendar_events!inner (
          id,
          title,
          start_time,
          end_time,
          location,
          meeting_link
        ),
        profile:user_id (
          full_name,
          email
        )
      `)
      .gte('event.start_time', now.toISOString())
      .not('reminder_minutes', 'is', null) as { data: EventParticipant[] | null; error: any };

    if (fetchError) {
      console.error('Error fetching participants:', fetchError);
      throw fetchError;
    }

    if (!participants || participants.length === 0) {
      console.log('No participants with reminders found');
      return new Response(
        JSON.stringify({ message: 'No reminders to send', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${participants.length} participants to check`);

    let remindersProcessed = 0;
    const remindersToSend: EventParticipant[] = [];

    // Filter participants who need reminders now
    for (const participant of participants) {
      const eventStartTime = new Date(participant.event.start_time);
      const reminderTime = new Date(
        eventStartTime.getTime() - participant.reminder_minutes * 60 * 1000
      );

      // Check if reminder time is in the past or within the next 5 minutes
      const shouldSendReminder = reminderTime <= fiveMinutesFromNow;

      // Check if we haven't sent a reminder yet for this event
      const hasNotBeenReminded = !participant.last_reminded_at || 
        new Date(participant.last_reminded_at) < reminderTime;

      if (shouldSendReminder && hasNotBeenReminded) {
        remindersToSend.push(participant);
      }
    }

    console.log(`Found ${remindersToSend.length} reminders to send`);

    // Send reminders and update last_reminded_at
    for (const participant of remindersToSend) {
      try {
        const eventTime = new Date(participant.event.start_time);
        const formattedTime = eventTime.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        // Build notification message
        let message = `Event "${participant.event.title}" starts at ${formattedTime}`;
        if (participant.event.location) {
          message += ` at ${participant.event.location}`;
        }
        if (participant.event.meeting_link) {
          message += `. Meeting link: ${participant.event.meeting_link}`;
        }

        // Create notification
        const { error: notificationError } = await supabase.rpc('create_notification', {
          _user_id: participant.user_id,
          _type: 'event_reminder',
          _title: `Reminder: ${participant.event.title}`,
          _message: message,
          _link: '/calendar',
        });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          continue;
        }

        // Update last_reminded_at
        const { error: updateError } = await supabase
          .from('calendar_event_participants')
          .update({ last_reminded_at: now.toISOString() })
          .eq('id', participant.id);

        if (updateError) {
          console.error('Error updating last_reminded_at:', updateError);
          continue;
        }

        remindersProcessed++;
        console.log(
          `Sent reminder to ${participant.profile.full_name} for event "${participant.event.title}"`
        );
      } catch (error) {
        console.error(`Error processing reminder for participant ${participant.id}:`, error);
      }
    }

    console.log(`Successfully processed ${remindersProcessed} reminders`);

    return new Response(
      JSON.stringify({
        message: 'Event reminders processed',
        processed: remindersProcessed,
        checked: participants.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-event-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
