# HomebaseCRM

A CRM system for home-improvement businesses (flooring, kitchens, etc.).

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** + **shadcn/ui** for UI
- **Prisma ORM** with PostgreSQL
- **NextAuth.js** for authentication
- **Railway** (target hosting for app + Postgres + Redis)

## Deployment

See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed instructions on deploying to Railway.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET` - A random secret string

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

4. Seed initial data:
```bash
npm run db:seed
```

This creates:
- Admin user: `admin@homebasecrm.com` (any password)
- Sales Rep user: `sales@homebasecrm.com` (any password)

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Phase Status

### ✅ Phase 0 - Foundations (COMPLETE)
- Next.js App Router with TypeScript
- TailwindCSS + shadcn/ui components
- Prisma with PostgreSQL
- User model with roles (ADMIN, SALES_REP)
- NextAuth.js authentication
- RBAC helper functions
- App shell with navigation
- Dashboard page

### ✅ Phase 1 - Core CRM: Capture & Assign (COMPLETE)
- Customer and Lead models with Prisma schema
- New Lead form with customer info and lead details
- Lead creation with automatic customer reuse (by phone/email)
- Leads list page with status filtering
- Lead detail page with status editing and assignment
- Role-based access: SALES_REP sees only their leads, ADMIN sees all
- Admin can assign leads to sales reps

### ✅ Phase 2 - Appointments (COMPLETE)
- Appointment model with Prisma schema
- Appointment creation form on Lead detail page
- Appointments list page with status filtering and "upcoming only" filter
- Role-based access: SALES_REP sees only their appointments, ADMIN sees all
- Appointment status updates (Completed, Cancelled, No Show)
- Automatic lead status update to APPOINTMENT_SET when appointment is created

### ✅ Phase 3 - Quotes & Files (COMPLETE)
- Quote and QuoteFile models with Prisma schema
- Quote creation form on Lead detail page with amount, currency, expiration date
- Quote detail page with status management and file upload
- File upload API with storage abstraction (mock storage for MVP)
- Quotes list page with status filtering
- "Send Quote" functionality that sets sentAt and status to SENT
- Automatic lead status update to QUOTED when quote is created
- Role-based access: SALES_REP sees only their quotes, ADMIN sees all

## Project Structure

```
app/
  (protected)/          # Protected routes requiring auth
    dashboard/          # Dashboard page
    leads/             # Leads management (Phase 1)
    appointments/      # Appointments (Phase 2)
    quotes/            # Quotes (Phase 3)
    tasks/             # Tasks (Phase 4)
    admin/             # Admin dashboard (Phase 5)
  auth/                # Authentication pages
  api/                 # API routes
components/
  ui/                  # shadcn/ui components
  app-shell.tsx        # Main app layout
lib/
  auth.ts              # NextAuth configuration
  rbac.ts              # Role-based access control helpers
  prisma.ts            # Prisma client instance
  utils.ts             # Utility functions
prisma/
  schema.prisma        # Database schema
```

## Authentication

For MVP, authentication uses email/password with NextAuth.js. The password check is simplified for development - any password will work if the user exists in the database.

**Important:** In production, implement proper password hashing (bcrypt) and validation.

## Database

The database schema is managed with Prisma. Key models:

- **User**: id, name, email, role (ADMIN | SALES_REP), timestamps
- **Customer**: id, firstName, lastName, phone, email, address fields, sourceType (CALL_IN | WALK_IN | REFERRAL), timestamps
- **Lead**: id, customerId, leadType (FLOOR | KITCHEN | BATH | OTHER), description, status (NEW | ASSIGNED | APPOINTMENT_SET | QUOTED | WON | LOST), assignedSalesRepId, timestamps
- **Appointment**: id, leadId, salesRepId, scheduledFor, siteAddress fields, status (SCHEDULED | COMPLETED | CANCELLED | NO_SHOW), notes, timestamps
- **Quote**: id, leadId, appointmentId (nullable), salesRepId, amount, currency, sentAt (nullable), expiresAt (nullable), status (DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED), timestamps
- **QuoteFile**: id, quoteId, fileUrl, fileType, uploadedByUserId, uploadedAt

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:push` - Push schema changes to database (dev only)
- `npm run db:seed` - Seed database with initial users

