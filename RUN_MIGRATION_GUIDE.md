# How to Run Database Migration on Render

## Quick Guide: Run Migration in 3 Steps

### ⭐ Recommended Method: Render Shell

This is the **easiest and safest** way to run migrations on Render.

---

## Method 1: Using Render Web Shell (Recommended)

### Step 1: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Log in to your account
3. Find your backend service (e.g., "lifepattern-backend")
4. Click on it to open service details

### Step 2: Open Shell
1. Look at the top navigation tabs: Overview | Events | **Shell** | Logs | Settings
2. Click on **"Shell"** tab
3. Wait for the terminal to load (should show a command prompt)

### Step 3: Run Migration
In the shell, type these commands:

```bash
# Navigate to backend directory
cd backend

# Run the migration
go run cmd/migrate/main.go
```

### Expected Output:
```
🔄 Running database migrations...
📁 Reading migration files from: migrations/
Running migration: 001_create_users.sql
✅ Already applied
Running migration: 002_create_credentials.sql
✅ Already applied
Running migration: 003_create_sessions.sql
✅ Already applied
...
Running migration: 008_add_questionnaires.sql
✅ Migration successful - Created screening_responses table
✅ Migration successful - Created usability_survey_responses table
🎉 All migrations completed successfully!
```

### Verify Success:
```bash
# Optional: Check tables exist
psql $DATABASE_URL -c "\dt" | grep screening
```

Should show:
```
 public | screening_responses           | table | ...
 public | usability_survey_responses    | table | ...
```

**Done!** ✅ Your questionnaire tables are now created!

---

## Method 2: Automatic Migration on Every Deploy

This adds migration to your build process so it runs automatically.

### Step 1: Update Build Command
1. In Render Dashboard, go to your service
2. Click **"Settings"** tab
3. Scroll to **"Build Command"**
4. Current command probably looks like:
   ```bash
   cd backend && go build -o bin/server cmd/server/main.go
   ```

5. **Change it to:**
   ```bash
   cd backend && go run cmd/migrate/main.go && go build -o bin/server cmd/server/main.go
   ```

### Step 2: Save & Deploy
1. Click **"Save Changes"** button at bottom
2. Go back to service overview
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Result:
- Migration runs BEFORE building the app
- Every future deploy will run migrations automatically
- Safe: migrations are idempotent (can run multiple times)

---

## Method 3: Using Render's One-Off Job

If you prefer not to use Shell, you can create a one-time job.

### Step 1: Navigate to Jobs
1. In your service dashboard
2. Look for sidebar: Dashboard | **Jobs** | Settings
3. Click **"Jobs"**

### Step 2: Create Manual Job
1. Click **"New Job"** or **"Run Manual Job"**
2. Enter command:
   ```bash
   cd backend && go run cmd/migrate/main.go
   ```
3. Click **"Run Job"**

### Step 3: Monitor
1. Job will appear in jobs list
2. Click on it to see logs
3. Wait for completion (should take 5-30 seconds)

---

## Method 4: Local Migration (If External Access Enabled)

If your Render PostgreSQL database allows external connections:

### Step 1: Get Database Connection String
1. In Render Dashboard, go to your PostgreSQL database (not the service)
2. Look for **"Connections"** section
3. Copy the **"External Database URL"** (starts with `postgres://`)

### Step 2: Set Environment Variable Locally
```bash
export DATABASE_URL="postgres://user:password@host:5432/database"
```

### Step 3: Run Migration from Local Machine
```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern/backend
go run cmd/migrate/main.go
```

**Note:** This only works if external database access is enabled in Render.

---

## Troubleshooting

### Error: "migration file not found"
**Fix:**
```bash
# Make sure you're in the backend directory
pwd  # Should show /app/backend or similar

# List files to verify migrations folder exists
ls migrations/

# Should see: 008_add_questionnaires.sql
```

### Error: "database connection failed"
**Fix:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# If empty, check Render environment variables:
# Settings → Environment → DATABASE_URL should be set
```

### Error: "permission denied"
**Fix:**
- Render shell runs as user with correct permissions
- If using local migration, ensure your DATABASE_URL has correct credentials

### Migration Hangs
**Fix:**
```bash
# Press Ctrl+C to cancel
# Check database is accessible:
psql $DATABASE_URL -c "SELECT 1;"

# If that works, try migration again
```

### Migration Says "Already Applied"
**Good!** This means:
- Migration tracking table exists
- This migration was already run before
- Tables should already exist

Verify with:
```bash
psql $DATABASE_URL -c "\dt screening_responses"
```

---

## After Migration: Verify Everything Works

### Test 1: Check Tables Exist
```bash
psql $DATABASE_URL -c "\dt" | grep -E "(screening|usability)"
```

Expected:
```
 public | screening_responses        | table
 public | usability_survey_responses | table
```

### Test 2: Test API Endpoint

Get a new login token:
```bash
curl -X POST https://lifepattern-backend.onrender.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "user_1760927926921_e7h82",
    "passphrase": "n1lqnhyf3xpIDO49",
    "device_label": "Test"
  }'
```

Copy the `access_token` from response, then test:
```bash
curl -X GET https://lifepattern-backend.onrender.com/api/admin/questionnaire-stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "total_screenings": 0,
  "qualified_testers": 0,
  "qualification_rate": 0,
  "avg_qualification_score": 0,
  "total_surveys": 0,
  "avg_sus_score": null,
  "avg_rating": null,
  "sus_distribution": {
    "excellent": 0,
    "good": 0,
    "ok": 0,
    "poor": 0
  }
}
```

If you get this response (even with zeros), **migration was successful!** ✅

---

## What the Migration Creates

### Tables Created:

1. **screening_responses**
   - Purpose: Store candidate screening questionnaire data
   - Fields: 17 columns (age, gender, occupation, tech comfort, etc.)
   - Constraints: One per user (UNIQUE on user_id)
   - Auto-calculated: is_qualified_tester, qualification_score

2. **usability_survey_responses**
   - Purpose: Store SUS-based usability testing surveys
   - Fields: 17 columns (10 Likert ratings + 3 text + metadata)
   - Constraints: Multiple allowed per user
   - Auto-calculated: sus_score (0-100), average_rating

### Indexes Created:
- `idx_screening_qualified` - Fast lookup of qualified testers
- `idx_screening_created_at` - Sort by submission date
- `idx_usability_user_id` - User's survey lookup
- `idx_usability_created_at` - Sort surveys by date
- `idx_usability_sus_score` - Filter by SUS score

### Triggers Created:
- Auto-update `updated_at` timestamp on row changes
- Applied to both tables

---

## Common Questions

### Q: Will this affect my existing data?
**A:** No. The migration only **adds** new tables. Existing tables (users, sessions, etc.) are untouched.

### Q: Can I run the migration multiple times?
**A:** Yes! The migration system tracks what's been applied. Running it again will show "Already applied" for migrations that were previously run.

### Q: What if the migration fails halfway?
**A:** PostgreSQL transactions ensure either the entire migration succeeds or nothing changes. Your database stays in a consistent state.

### Q: How long does it take?
**A:** Usually 5-30 seconds. Creating tables and indexes is fast.

### Q: Do I need to restart the service?
**A:** No. Once tables exist, the running service will immediately be able to use them. No restart needed.

### Q: Can I undo the migration?
**A:** Yes, you can drop the tables:
```sql
DROP TABLE IF EXISTS screening_responses CASCADE;
DROP TABLE IF EXISTS usability_survey_responses CASCADE;
```
But this will delete all questionnaire data!

---

## Success Checklist

After running migration, verify:

- [ ] Migration command completed without errors
- [ ] Saw "Migration successful" messages
- [ ] Tables appear in `\dt` list
- [ ] API endpoint `/api/admin/questionnaire-stats` returns JSON (not timeout)
- [ ] Can submit screening questionnaire from frontend
- [ ] Admin dashboard loads statistics

If all checked, **you're done!** 🎉

---

## Next Steps After Migration

1. ✅ Test frontend questionnaire flow
2. ✅ Test admin dashboard
3. ✅ Submit test screening questionnaire
4. ✅ Submit test usability survey
5. ✅ Export CSV to verify format
6. ✅ Test on mobile devices (iOS/Android)

---

## Need Help?

**If migration fails:**
1. Check Render logs for error messages
2. Verify DATABASE_URL environment variable is set
3. Confirm PostgreSQL service is running
4. Check migrations folder exists: `ls backend/migrations/`

**If API still times out after migration:**
1. Check tables actually exist: `\dt screening_responses`
2. Restart service: Manual Deploy → Deploy latest commit
3. Check logs for database connection errors

---

**Last Updated:** November 10, 2025
**Migration File:** `008_add_questionnaires.sql`
**Status:** Ready to run
