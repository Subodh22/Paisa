#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Basiq API Configuration
BASIQ_API_KEY=your_basiq_api_key_here

# Firebase Configuration (if using Firebase auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
`;

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
  console.log('📝 Please update the environment variables with your actual values:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - BASIQ_API_KEY');
} else {
  console.log('⚠️  .env.local already exists');
}

console.log('\n🔧 To fix the current errors:');
console.log('1. Update your .env.local file with the correct values');
console.log('2. Restart your development server (npm run dev)');
console.log('3. Make sure your Supabase database is set up with the schema from supabase-schema.sql');
