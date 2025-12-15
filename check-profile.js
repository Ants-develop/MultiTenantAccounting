// Quick script to check user profiles
import {db} from './server/db.js';
import {profiles} from './shared/schema.js';

async function checkProfiles() {
  try {
    const allProfiles = await db.select().from(profiles);
    console.log('All profiles:');
    allProfiles.forEach(p => {
      console.log(`- ID: ${p.id}`);
      console.log(`  Email: ${p.email}`);
      console.log(`  Username: ${p.username}`);
      console.log(`  Global Role: ${p.globalRole}`);
      console.log(`  Full Name: ${p.fullName}`);
      console.log(`  Active: ${p.isActive}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkProfiles();