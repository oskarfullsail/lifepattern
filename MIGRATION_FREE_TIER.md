# Running Migrations on Render Free Tier

## What I Changed

Since Render free tier doesn't have Shell access, I updated your Docker setup to run migrations automatically on every deployment.

### Files Modified:

1. **`Dockerfile`** - Updated to:
   - Build the `migrate` binary (in addition to `main` server)
   - Copy the `migrate` binary to final image
   - Copy the startup script
   - Run `entrypoint.sh` instead of directly starting server

2. **`backend/entrypoint.sh`** - Created startup script that:
   - Runs migrations first
   - Then starts the server
   - Ensures migrations always run before app starts

### Changes Summary:

**Before:**
```dockerfile
CMD ["./main"]  # Just start server
```

**After:**
```dockerfile
CMD ["./entrypoint.sh"]  # Run migrations → start server
```

---

## How to Deploy (3 Steps)

### Step 1: Commit Changes
```bash
cd /Users/oskarsanchez-chagollan/School_Projects/lifepattern

git add Dockerfile backend/entrypoint.sh
git commit -m "Add automatic migration on startup for free tier"
```

### Step 2: Push to GitHub
```bash
git push origin main
```

### Step 3: Wait for Render to Deploy
- Render will automatically detect the push (if autoDeploy is enabled)
- Or manually trigger: Dashboard → Manual Deploy → Deploy latest commit
- Watch the build logs - you'll see:
  ```
  🔄 Running database migrations...
  Running migration: 008_add_questionnaires.sql
  ✅ Migration successful
  🚀 Starting server...
  ```

---

## What Happens Now

Every time your container starts (deploy, restart, scale up):
1. ✅ Migrations run automatically
2. ✅ Tables get created if they don't exist
3. ✅ If migration already ran, it shows "Already applied" (safe!)
4. ✅ Then server starts normally

**Safe to run multiple times:** The migration system tracks what's been applied, so running it again won't break anything.

---

## Verify It Worked

### Method 1: Check Logs
1. Go to Render Dashboard
2. Click on your service
3. Go to "Logs" tab
4. Look for:
   ```
   🔄 Running database migrations...
   ✅ Migration successful
   ```

### Method 2: Test API
```bash
# Get login token
curl -X POST https://lifepattern-backend.onrender.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "user_1760927926921_e7h82",
    "passphrase": "n1lqnhyf3xpIDO49",
    "device_label": "Test"
  }'

# Copy access_token from response, then:
curl -X GET https://lifepattern-backend.onrender.com/api/admin/questionnaire-stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Success looks like:**
```json
{
  "total_screenings": 0,
  "qualified_testers": 0,
  "qualification_rate": 0,
  ...
}
```

**Failure looks like:**
- Timeout after 30 seconds
- Or "Unauthorized" error

---

## Troubleshooting

### Build Fails: "entrypoint.sh: not found"
**Fix:** Make sure you committed `backend/entrypoint.sh`
```bash
git add backend/entrypoint.sh
git commit --amend --no-edit
git push --force origin main
```

### Migration Fails: "database connection failed"
**Fix:** Check DATABASE_URL is set in Render environment variables
1. Dashboard → Settings → Environment
2. Verify `DATABASE_URL` exists

### Server Won't Start After Migration
**Fix:** Check logs for migration errors
- Migration might have SQL syntax error
- Database permissions issue
- Look for specific error in logs

### Already Applied Message
**This is GOOD!** It means:
- Migration ran before
- Tables already exist
- System is working correctly

---

## Rollback (If Needed)

If something goes wrong and you need to revert:

```bash
git revert HEAD
git push origin main
```

This will:
- Remove the migration step
- Server will start normally (but questionnaires won't work)
- Gives you time to debug

---

## Next Steps After Deploy

1. ✅ Push changes to GitHub
2. ✅ Wait for Render to rebuild (3-5 minutes)
3. ✅ Check logs for migration success
4. ✅ Test API endpoints
5. ✅ Test frontend questionnaire flow
6. ✅ Test admin dashboard

---

## Alternative: Manual Migration (One Time)

If you want to run migration ONCE without changing Dockerfile:

### Create a Script Endpoint (Temporary)

Add this to your backend code temporarily:

```go
// In cmd/server/main.go
router.HandleFunc("/run-migration", func(w http.ResponseWriter, r *http.Request) {
    // Run migration
    cmd := exec.Command("./migrate")
    output, err := cmd.CombinedOutput()
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    w.Write(output)
}).Methods("POST")
```

Then call it once:
```bash
curl -X POST https://lifepattern-backend.onrender.com/run-migration
```

**⚠️ Security Warning:** Remove this endpoint after use! It's only for one-time migration.

---

## Why This Approach?

**Pros:**
- ✅ Works on free tier (no Shell needed)
- ✅ Automatic - runs on every deploy
- ✅ Safe - migrations are idempotent
- ✅ No manual intervention needed

**Cons:**
- ⏱️ Adds ~5-10 seconds to startup time
- 🔄 Runs on every restart (but fast if already applied)

**Alternative approach would be:**
- Upgrade to paid tier for Shell access
- Or use external database connection from local machine

---

**Last Updated:** November 10, 2025
**Method:** Docker entrypoint with automatic migrations
**Status:** Ready to deploy
