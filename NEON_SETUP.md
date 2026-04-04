# Neon PostgreSQL Setup Guide

## Local Setup

### 1. Create Neon Database
1. Go to https://console.neon.tech
2. Create a new project
3. Copy your connection string (looks like: `postgresql://username:password@hostname/dbname`)

### 2. Configure Local Environment
```powershell
# Create .env file in project root
$env:DATABASE_URL = "postgresql://username:password@hostname/dbname"
```

Or create `.env` file:
```
DATABASE_URL=postgresql://username:password@hostname/dbname
```

### 3. Install and Run
```powershell
.\install.ps1
.\start.ps1
```

The app will automatically:
- Create database tables
- Load sample dialogues into the database
- Store TTS cache in PostgreSQL

## Vercel Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Neon PostgreSQL integration"
git push origin main
```

### 2. Link to Vercel
```powershell
vercel --prod
```

### 3. Add Environment Variable in Vercel Dashboard
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add `DATABASE_URL` with your Neon connection string

**Important**: Use the connection string ending with `?sslmode=require` for Vercel:
```
postgresql://username:password@hostname/dbname?sslmode=require
```

### 4. Test Deployment
- Navigate to your Vercel URL
- API endpoints should work with database persistence

## Database Schema

**dialogues** - Stores dialogue content
- id (TEXT, PK)
- title (TEXT)
- lines (JSON)
- template (TEXT)
- created_at, updated_at

**dialogue_sessions** - Tracks user training sessions
- id (TEXT, PK)
- dialogue_id (TEXT, FK)
- user_id (TEXT, optional)
- session_data (JSON)
- completed (BOOLEAN)
- created_at, updated_at

**tts_cache** - Caches generated audio
- id (TEXT, PK - hash)
- text, voice, rate (TEXT)
- filename (TEXT)
- created_at

## Troubleshooting

**Connection refused?**
- Check DATABASE_URL is correct
- Ensure Neon database is running
- For Vercel, add `?sslmode=require` to URL

**Tables not creating?**
- Check database user has CREATE permissions
- View backend logs for errors

**Audio cache not persisting?**
- Verify TTS files are being stored to `/backend/app/cache/tts`
- Consider syncing cache to cloud storage for Vercel
