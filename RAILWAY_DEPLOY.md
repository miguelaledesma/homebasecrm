# Deploying to Railway

This guide will walk you through deploying your HomebaseCRM app to Railway.

## Prerequisites

- A Railway account (sign up at [railway.app](https://railway.app))
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (or your Git provider)
4. Connect your repository and select the `landscaping-crm` repository
5. Railway will automatically detect it's a Next.js app

## Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically added to your app

## Step 3: Configure Environment Variables

In your Railway project dashboard:

1. Go to your **app service** (not the database)
2. Click on the **"Variables"** tab
3. Add the following environment variables:

### Required Variables:

```
NEXTAUTH_URL=https://your-app-name.up.railway.app
NEXTAUTH_SECRET=your-random-secret-here
```

**Important Notes:**
- `NEXTAUTH_URL`: Replace `your-app-name` with your actual Railway app name. You'll get this after the first deployment.
- `NEXTAUTH_SECRET`: Generate a random secret:
  ```bash
  openssl rand -base64 32
  ```

### Automatic Variables (Railway provides these):
- `DATABASE_URL` - Automatically set when you add PostgreSQL
- `PORT` - Automatically set by Railway
- `RAILWAY_ENVIRONMENT` - Automatically set

## Step 4: Configure Build Settings

Railway should auto-detect Next.js, but verify these settings:

1. Go to your app service → **Settings** tab
2. Ensure:
   - **Build Command**: `npm run build` (or leave empty, Railway will auto-detect)
   - **Start Command**: `npm start` (or leave empty, Railway will auto-detect)
   - **Root Directory**: Leave empty (or set to `/` if needed)

## Step 5: Deploy and Run Migrations

### Option A: Using Railway's Deploy Hook (Recommended)

1. After your first deployment, Railway will provide a URL like: `https://your-app-name.up.railway.app`
2. Update `NEXTAUTH_URL` in Railway variables with this URL
3. Redeploy the app

### Option B: Using Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Link your project:
   ```bash
   railway link
   ```

4. Run database migrations:
   ```bash
   railway run npm run db:migrate:deploy
   ```

5. Seed the database (optional, for initial setup):
   ```bash
   railway run npm run db:seed
   ```

## Step 6: Set Up Database Migrations (Automated)

To automatically run migrations on each deploy, you can add a build script:

1. Create a `railway.json` file in your project root (optional):
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm run build"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. Or add a custom deploy script in `package.json`:
   ```json
   "scripts": {
     "deploy": "prisma migrate deploy && npm start"
   }
   ```

## Step 7: Verify Deployment

1. Visit your Railway app URL (e.g., `https://your-app-name.up.railway.app`)
2. You should see your app running
3. Try signing in with:
   - Email: `admin@homebasecrm.com`
   - Password: (any password)

## Step 8: Set Up Custom Domain (Optional)

1. In Railway dashboard, go to your app service
2. Click **"Settings"** → **"Networking"**
3. Click **"Generate Domain"** or **"Custom Domain"**
4. Follow the instructions to configure your domain

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Railway variables
- Check that PostgreSQL service is running in Railway dashboard
- Ensure migrations have run: `railway run npm run db:migrate:deploy`

### Build Failures

- Check build logs in Railway dashboard
- Ensure `postinstall` script runs (generates Prisma Client)
- Verify all dependencies are in `dependencies` (not just `devDependencies`)

### Migration Issues

- Run migrations manually: `railway run npm run db:migrate:deploy`
- Check Prisma schema is valid: `npx prisma validate`
- View database: `railway run npm run db:studio` (then open the forwarded port)

### Environment Variables

- Ensure `NEXTAUTH_URL` matches your Railway app URL exactly
- Generate a new `NEXTAUTH_SECRET` if authentication fails
- Check variables are set in the **app service**, not the database service

## Useful Railway Commands

```bash
# View logs
railway logs

# Run commands in Railway environment
railway run <command>

# Open database shell
railway run psql $DATABASE_URL

# Run migrations
railway run npm run db:migrate:deploy

# Seed database
railway run npm run db:seed

# Open Prisma Studio
railway run npm run db:studio
```

## Production Checklist

- [ ] PostgreSQL database added and running
- [ ] `DATABASE_URL` automatically set by Railway
- [ ] `NEXTAUTH_URL` set to your Railway app URL
- [ ] `NEXTAUTH_SECRET` set to a secure random string
- [ ] Database migrations run successfully
- [ ] Initial users seeded (admin and sales rep)
- [ ] App builds and starts successfully
- [ ] Can sign in and access the app
- [ ] Custom domain configured (if needed)

## Cost Considerations

Railway offers:
- **Free tier**: $5 credit/month (good for testing)
- **Hobby plan**: $5/month + usage
- **Pro plan**: $20/month + usage

PostgreSQL database typically costs ~$5-10/month depending on usage.

## Next Steps

- Set up monitoring and alerts
- Configure backups for your database
- Set up CI/CD for automatic deployments
- Add production error tracking (Sentry, etc.)
- Implement proper password hashing (currently MVP accepts any password)

