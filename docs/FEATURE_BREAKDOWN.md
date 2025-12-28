# HomebaseCRM - Feature Breakdown

## Core Features

### 1. Authentication & User Management
- Email/password authentication (NextAuth.js)
- Role-based access control (Admin, Sales Rep)
- User invitation system
- Secure session management

### 2. Lead Management
- Lead creation with customer information capture
- Automatic customer deduplication (by phone/email)
- Lead status workflow (NEW → ASSIGNED → APPOINTMENT_SET → QUOTED → WON/LOST)
- Lead assignment to sales representatives
- Lead filtering and search
- Multiple lead types support (Flooring, Kitchen, Bath, Landscaping, Roofing, etc.)
- Lead notes/comments with timestamps and user attribution

### 3. Customer Management
- Customer profile creation and management
- Contact information (name, phone, email, address)
- Source tracking (Call In, Walk In, Referral)
- Customer history and relationship tracking

### 4. Referral Tracking
- Referrer information capture
- Automatic customer matching for referrers
- Referrer relationship linking
- Gift tracking fields (for future implementation)

### 5. Appointment Scheduling
- Appointment creation linked to leads
- Date/time scheduling
- Site address management
- Appointment status tracking (Scheduled, Completed, Cancelled, No Show)
- Appointment notes and details
- Upcoming appointments filtering

### 6. Quote Management
- Quote creation with amount and currency
- Quote expiration date tracking
- Quote status workflow (Draft → Sent → Accepted/Declined/Expired)
- File attachments (PDFs, images)
- Quote-to-appointment linking
- Send quote functionality with timestamp

### 7. Dashboard & Analytics
- Overview statistics (leads, appointments, quotes)
- Recent activity tracking
- Role-based dashboard views

### 8. Admin Features
- User management
- Lead assignment across team
- Full system access and oversight
- Sales rep performance visibility

### 9. Data Management
- PostgreSQL database with Prisma ORM
- Automated database migrations
- Data integrity and relationships
- Performance indexes for scalability

## Technical Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui, Radix UI
- **Deployment**: Railway (app + database hosting)

## Access Control

- **Admin Role**: Full system access, can view and manage all leads/appointments/quotes, assign leads, manage users
- **Sales Rep Role**: Access limited to assigned leads, can create appointments/quotes for assigned leads only

## Data Features

- Automatic customer deduplication
- Lead-to-appointment-to-quote workflow
- Status automation (appointment creation updates lead status)
- Timestamped notes and activity tracking
- Multi-service type support (11+ service categories)



