import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with Service Role Key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase credentials missing. Feed integration will be disabled.");
}

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

export async function postToFeed(
  userId: number,
  content: string,
  meta?: any
) {
  if (!supabaseAdmin) return;

  try {
    // First, ensure the user profile exists in Supabase
    // In a real app, you'd sync this more robustly, but this is a fallback
    // We assume the user ID in Supabase matches the local user ID (or we use a mapping)
    // For this implementation, we'll just post with the author_id and hope the frontend resolves it
    // or the profile sync has happened.

    const { error } = await supabaseAdmin.from("feed_posts").insert({
      author_id: userId.toString(), // Assuming Supabase uses string IDs or we map them
      content,
      visibility: "public",
      likes: 0,
      comments_count: 0,
      // You might need to adjust this based on your actual Supabase schema
      // If you have a 'type' or 'meta' column, use it.
      // For now, we'll just put the text content.
    });

    if (error) {
      console.error("Supabase Feed Error:", error);
    }
  } catch (error) {
    console.error("Failed to post to feed:", error);
  }
}
