# Vercel Deployment Guide

## ⚠️ CRITICAL: Data Files Must Be Committed to Git

For the application to work on Vercel, **all files in the `/data` folder MUST be committed to your Git repository**.

### Why This is Important

- Vercel's serverless functions use a **read-only file system** at runtime
- Files must be in your Git repository to be accessible on Vercel
- If `/data` folder is not committed, login will fail because `users.json` cannot be read

### Steps to Ensure Proper Deployment

#### 1. Check if `/data` folder is tracked by Git

```bash
# If git is initialized, check status
git status data/

# If files are not tracked, add them:
git add data/
git commit -m "Add data folder for deployment"
git push
```

#### 2. Verify Files Exist in Repository

Your `/data` folder should contain these files:
- ✅ `users.json` - **REQUIRED** for login to work
- ✅ `milkEntries.json`
- ✅ `payments.json`
- ✅ `customerRates.json`
- ✅ `backup/` directory (can be empty)

#### 3. Default Users (if `users.json` is empty)

If `users.json` is empty or missing on Vercel, the app will use these default users:

**Admin:**
- User ID: `ADMIN001`
- Password: `admin123`

**Customer:**
- User ID: `CUST001`
- Password: `1234`

### Common Issues

#### ❌ Issue: Login fails with "Internal server error"

**Cause:** `users.json` file is not accessible (not committed to Git or not in repository)

**Solution:**
1. Ensure `/data` folder and all JSON files are committed to Git
2. Push to GitHub
3. Redeploy on Vercel

#### ❌ Issue: "File does not exist" errors

**Cause:** Data files are not in the Git repository

**Solution:**
```bash
# Add data folder to git
git add data/

# Commit changes
git commit -m "Add data files for Vercel deployment"

# Push to GitHub
git push

# Redeploy on Vercel (or it will auto-deploy if connected to GitHub)
```

### Verifying Deployment

After deploying to Vercel:

1. Check Vercel function logs:
   - Go to your Vercel dashboard
   - Click on your project
   - Go to "Functions" tab
   - Check logs for any file read errors

2. Test login:
   - Try logging in with `ADMIN001` / `admin123`
   - If it works, files are accessible ✅
   - If it fails, check logs for "File does not exist" errors

### Important Notes

- ⚠️ **File writes don't work on Vercel** - The file system is read-only at runtime
- ⚠️ **Data persistence** - Any data changes will be lost on redeploy
- ✅ **Use Backup/Restore** - Use the Settings page to backup data before redeploying
- ✅ **Read operations work** - Files in Git repository are readable

### Alternative Solution: Use a Database

For production use with persistent data, consider migrating to:
- MongoDB
- PostgreSQL
- Supabase
- Firebase

This will solve the file system limitations on Vercel.
