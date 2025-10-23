# Supabase Setup Guide for Paisa Cashflow Calendar

## 🚀 Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `paisa-cashflow` (or any name you prefer)
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest to your location
6. Click "Create new project"

### 2. Get Your Project Credentials

1. Go to your project dashboard
2. Click on "Settings" in the left sidebar
3. Click on "API" in the settings menu
4. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 3. Update Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Set Up Database Tables

1. In your Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to execute the SQL

This will create:
- `transactions` table for storing income/expense records
- `recurring_rules` table for storing recurring transaction rules
- `app_settings` table for storing app configuration
- Proper indexes and triggers for performance

### 5. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser
3. Try adding a transaction - it should now save to Supabase!
4. Check your Supabase dashboard → "Table Editor" to see the data

## 🔧 Features Now Available

### ✅ **Data Persistence**
- All transactions are saved to Supabase database
- Recurring rules are stored in the cloud
- App settings (current month, starting balance) are synced

### ✅ **Real-time Updates**
- Data persists across browser sessions
- Multiple devices can access the same data
- No more data loss on browser refresh

### ✅ **Import/Export**
- Export data directly from Supabase
- Import CSV files that save to database
- Full data backup and restore capabilities

### ✅ **Scalability**
- Handles large amounts of transaction data
- Optimized database queries with indexes
- Ready for multiple users (with authentication)

## 🛠️ Advanced Configuration

### Row Level Security (RLS)
The database is set up with RLS enabled but with public access policies. For production:

1. Go to "Authentication" → "Policies" in Supabase
2. Create user authentication
3. Update RLS policies to restrict access to authenticated users

### Database Backups
Supabase automatically handles backups, but you can:
1. Go to "Settings" → "Database"
2. Configure backup schedules
3. Set up point-in-time recovery

### Performance Monitoring
1. Go to "Reports" in your Supabase dashboard
2. Monitor database performance
3. Set up alerts for issues

## 🚨 Troubleshooting

### Common Issues

**"Failed to load data from Supabase"**
- Check your environment variables are correct
- Ensure your Supabase project is active
- Verify the database tables were created

**"Error saving transaction"**
- Check your internet connection
- Verify Supabase project is not paused
- Check browser console for detailed error messages

**"Database connection failed"**
- Ensure your Supabase URL is correct
- Check if your project is paused (common on free tier)
- Verify your API key has the right permissions

### Getting Help

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
3. Check your project logs in Supabase dashboard

## 🎉 You're All Set!

Your Paisa Cashflow Calendar now has:
- ✅ Cloud data storage
- ✅ Real-time synchronization
- ✅ Professional database backend
- ✅ Scalable architecture

Enjoy your new cloud-powered cashflow calendar! 🚀
