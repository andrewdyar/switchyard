# Environment Variables Setup

## Required Environment Variables

Set these environment variables for Supabase integration:

### For Local Development

```bash
export SUPABASE_URL="https://epwngkevdzaehiivtzpd.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd25na2V2ZHphZWhpaXZ0enBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY2NjgxNCwiZXhwIjoyMDc5MjQyODE0fQ.Rn7QQ1oYT8mJFUf2MZC4iB5jJMC-HSCA0S4y0-D96dU"
export SUPABASE_ANON_KEY="<your-anon-key-if-needed>"
```

### For Vercel Deployment

Add these in **Vercel Dashboard → Project Settings → Environment Variables**:

1. `SUPABASE_URL` = `https://epwngkevdzaehiivtzpd.supabase.co`
2. `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd25na2V2ZHphZWhpaXZ0enBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY2NjgxNCwiZXhwIjoyMDc5MjQyODE0fQ.Rn7QQ1oYT8mJFUf2MZC4iB5jJMC-HSCA0S4y0-D96dU`

### Optional: Direct Database Connection

If you want to deploy SQL files via Python script using direct PostgreSQL connection:

```bash
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.epwngkevdzaehiivtzpd.supabase.co:5432/postgres"
```

Get the password from: **Supabase Dashboard → Settings → Database → Connection string**

## Where to Set Variables

### Local Terminal

Add to `~/.zshrc` or `~/.bashrc`:
```bash
export SUPABASE_URL="https://epwngkevdzaehiivtzpd.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd25na2V2ZHphZWhpaXZ0enBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY2NjgxNCwiZXhwIjoyMDc5MjQyODE0fQ.Rn7QQ1oYT8mJFUf2MZC4iB5jJMC-HSCA0S4y0-D96dU"
```

Then: `source ~/.zshrc`

### Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable
5. Redeploy

### .env File (Local Development)

Create `.env` file in project root:
```env
SUPABASE_URL=https://epwngkevdzaehiivtzpd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd25na2V2ZHphZWhpaXZ0enBkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY2NjgxNCwiZXhwIjoyMDc5MjQyODE0fQ.Rn7QQ1oYT8mJFUf2MZC4iB5jJMC-HSCA0S4y0-D96dU
```

**Note:** Add `.env` to `.gitignore` (should already be there)

## Verify Variables

```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

## Security Notes

- ✅ **Service Role Key** is safe for backend/server-side use
- ⚠️  **Never** expose service role key in frontend code
- ✅ **Anon Key** is safe for public/frontend use (if using client-side Supabase)
- ⚠️  RLS policies protect your data even if keys are exposed

