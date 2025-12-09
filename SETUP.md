# First-Time Setup Guide

Follow these steps to run the app for the first time:

## Prerequisites

1. **Node.js 18+** - Make sure you have Node.js installed
2. **PostgreSQL Database** - You need a running PostgreSQL database

## Step-by-Step Setup

### 1. Install Dependencies ✅
Already done! Dependencies have been installed.

### 2. Set Up Environment Variables

You need to create a `.env` file in the root directory with the following variables:

```env
# Database - Update with your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/homebasecrm?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="VXjgFnvSctSEWfMYl1y/tG4iZA+v6J3+rgC4N7JKlM0="
```

**Important:** 
- Replace `username`, `password`, `localhost`, `5432`, and `homebasecrm` in `DATABASE_URL` with your actual PostgreSQL credentials
- The `NEXTAUTH_SECRET` above is randomly generated - you can use it or generate a new one with: `openssl rand -base64 32`

### 3. Set Up PostgreSQL Database

If you don't have PostgreSQL installed, you can:
- Install locally: https://www.postgresql.org/download/
- Use Docker: `docker run --name postgres-crm -e POSTGRES_PASSWORD=password -e POSTGRES_DB=homebasecrm -p 5432:5432 -d postgres`
- Use a cloud service (Railway, Supabase, Neon, etc.)

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Set Up Database Schema

Run migrations to create the database tables:

```bash
npm run db:migrate
```

This will:
- Create all the database tables based on the Prisma schema
- Set up relationships between tables

### 6. Seed Initial Data

Seed the database with initial users:

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@homebasecrm.com` (any password works)
- Sales Rep user: `sales@homebasecrm.com` (any password works)

**Note:** For MVP, authentication accepts any password - just use the correct email.

### 7. Start the Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### 8. Sign In

Go to http://localhost:3000 and sign in with:
- Email: `admin@homebasecrm.com`
- Password: (any password)

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Verify your `DATABASE_URL` in `.env` is correct
- Test connection: `psql "postgresql://username:password@localhost:5432/homebasecrm"`

### Migration Issues
- If migrations fail, try: `npm run db:push` (for development only)
- Check Prisma Studio: `npm run db:studio` to inspect your database

### Port Already in Use
- Change the port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

## Useful Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes (dev only)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with initial data

