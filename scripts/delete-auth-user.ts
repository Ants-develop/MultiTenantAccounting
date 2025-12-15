#!/usr/bin/env tsx
import { supabaseAdmin } from "../server/supabase";

async function deleteAuthUser() {
  const email = 'a.avalishvili@ants.ge';
  
  console.log(`Looking for user with email: ${email}...`);
  
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const admin = data.users.find(u => u.email === email);
  
  if (admin) {
    console.log(`Found user: ${admin.id}`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(admin.id);
    if (error) {
      console.error('Delete error:', error);
    } else {
      console.log('✅ User deleted from Supabase Auth');
    }
  } else {
    console.log('User not found in Supabase Auth');
  }
}

deleteAuthUser();
