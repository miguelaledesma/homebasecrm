# HomebaseCRM User Guide

Welcome to HomebaseCRM! This guide will help you get started using the CRM system to manage your leads, appointments, and quotes.

## Table of Contents

1. [Signing In](#signing-in)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Leads](#managing-leads)
4. [Scheduling Appointments](#scheduling-appointments)
5. [Creating Quotes](#creating-quotes)
6. [User Roles](#user-roles)
7. [Tips & Best Practices](#tips--best-practices)

---

## Signing In

### First Time Login

1. Go to your CRM URL (provided by your administrator)
2. You'll see the sign-in page
3. Enter your email address:
   - **Admin users**: `admin@homebasecrm.com`
   - **Sales Rep users**: `sales@homebasecrm.com`
4. Enter any password (for now, any password will work)
5. Click **"Sign In"**

### Login Credentials

- **Admin Account**:

  - Email: `admin@homebasecrm.com`
  - Password: Any password

- **Sales Rep Account**:
  - Email: `sales@homebasecrm.com`
  - Password: Any password

> **Note**: Currently, the system accepts any password as long as the email address exists. This will be updated with secure passwords in the future.

---

## Dashboard Overview

After signing in, you'll see the main dashboard with:

- **Navigation Menu** (left side):

  - Dashboard
  - Leads
  - Appointments
  - Quotes
  - Tasks
  - Admin (Admin users only)

- **Quick Stats**: Overview of your leads, appointments, and quotes
- **Recent Activity**: Latest updates in the system

---

## Managing Leads

Leads are potential customers who have expressed interest in your services.

### Viewing Leads

1. Click **"Leads"** in the navigation menu
2. You'll see a list of all leads (or your leads if you're a Sales Rep)
3. Use filters to find specific leads:
   - **Status Filter**: NEW, ASSIGNED, APPOINTMENT_SET, QUOTED, WON, LOST
   - **My Leads Only**: Check this box to see only leads assigned to you

### Creating a New Lead

1. Click **"New Lead"** button (top right)
2. Fill in the **Customer Information**:

   - First Name \* (required)
   - Last Name \* (required)
   - Phone
   - Email
   - Address (Line 1, Line 2, City, State, ZIP)
   - Source Type \* (required): How did they find you?
     - Call In
     - Walk In
     - Referral

3. Fill in the **Lead Information**:

   - Lead Type \* (required): What are they interested in?
     - Floor
     - Kitchen
     - Bath
     - Other
   - Description: Additional notes about the lead

4. Click **"Create Lead"**

### Viewing Lead Details

1. Click on any lead from the leads list
2. You'll see:
   - Customer information
   - Lead status
   - Assigned sales rep (Admin can change this)
   - Related appointments
   - Related quotes
   - Timeline of activities

### Updating Lead Status

1. Open the lead details page
2. Use the **Status** dropdown to update:

   - **NEW**: Just created
   - **ASSIGNED**: Assigned to a sales rep
   - **APPOINTMENT_SET**: An appointment has been scheduled
   - **QUOTED**: A quote has been sent
   - **WON**: Customer accepted
   - **LOST**: Customer declined or unresponsive

3. Changes save automatically

### Assigning Leads (Admin Only)

1. Open the lead details page
2. Use the **"Assign to Sales Rep"** dropdown
3. Select a sales rep
4. Click **"Update Assignment"**

---

## Scheduling Appointments

Appointments help you track on-site visits and consultations.

### Creating an Appointment

1. Open a lead's detail page
2. Scroll to the **"Appointments"** section
3. Click **"Create Appointment"** button
4. Fill in the appointment details:

   - **Scheduled Date & Time** \* (required)
   - **Site Address**: Where will you meet?
     - Address Line 1
     - Address Line 2
     - City
     - State
     - ZIP
   - **Notes**: Any special instructions or notes

5. Click **"Create Appointment"**

> **Note**: Creating an appointment automatically updates the lead status to "APPOINTMENT_SET"

### Viewing All Appointments

1. Click **"Appointments"** in the navigation menu
2. You'll see a list of all appointments
3. Use filters:
   - **Status Filter**: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
   - **Upcoming Only**: Check to see only future appointments

### Updating Appointment Status

1. Open an appointment from the appointments list or lead detail page
2. Use the **Status** dropdown to update:

   - **SCHEDULED**: Future appointment
   - **COMPLETED**: Appointment finished successfully
   - **CANCELLED**: Appointment was cancelled
   - **NO_SHOW**: Customer didn't show up

3. You can also add or update notes

---

## Creating Quotes

Quotes are estimates you provide to potential customers.

### Creating a Quote

1. Open a lead's detail page
2. Scroll to the **"Quotes"** section
3. Click **"Create Quote"** button
4. Fill in the quote details:

   - **Amount** \* (required): The quote amount
   - **Currency**: Defaults to USD
   - **Expiration Date**: When does this quote expire?
   - **Related Appointment**: (Optional) Link to an appointment
   - **Status**: Starts as DRAFT

5. Click **"Create Quote"**

> **Note**: Creating a quote automatically updates the lead status to "QUOTED"

### Managing Quotes

1. Click **"Quotes"** in the navigation menu to see all quotes
2. Use the **Status Filter** to find quotes by status:
   - **DRAFT**: Not yet sent
   - **SENT**: Sent to customer
   - **ACCEPTED**: Customer accepted
   - **DECLINED**: Customer declined
   - **EXPIRED**: Quote expired

### Sending a Quote

1. Open a quote's detail page
2. Upload any files (PDFs, images, etc.) using the **"Upload File"** button
3. Click **"Send Quote"** button
4. The status will automatically change to "SENT" and the sent date will be recorded

### Uploading Quote Files

1. Open a quote's detail page
2. Click **"Upload File"** button
3. Select your file (PDF, images, etc.)
4. File will be attached to the quote

### Updating Quote Status

1. Open a quote's detail page
2. Use the **Status** dropdown to update:
   - Mark as **ACCEPTED** when customer agrees
   - Mark as **DECLINED** if customer says no
   - Mark as **EXPIRED** if quote expires

---

## User Roles

### Admin Role

**What you can do:**

- View ALL leads, appointments, and quotes (not just your own)
- Assign leads to any sales rep
- Access the Admin dashboard
- Manage all users and settings

**When to use Admin features:**

- Distributing leads to team members
- Reviewing overall company performance
- Managing user accounts

### Sales Rep Role

**What you can do:**

- View and manage your assigned leads
- Create appointments for your leads
- Create and send quotes
- Update status of your leads, appointments, and quotes

**What you can't do:**

- See other sales reps' leads (unless assigned to you)
- Assign leads to other reps
- Access admin settings

---

## Tips & Best Practices

### Lead Management

✅ **Do:**

- Create a lead immediately when you get a call or walk-in
- Fill in as much customer information as possible
- Add descriptive notes in the description field
- Update lead status regularly as it progresses

❌ **Don't:**

- Create duplicate leads (check if customer exists first)
- Leave leads in "NEW" status after assigning them
- Forget to update status when milestones are reached

### Appointment Scheduling

✅ **Do:**

- Schedule appointments as soon as possible after lead creation
- Include detailed site address
- Add notes about special requirements
- Update status to COMPLETED after the visit

❌ **Don't:**

- Create appointments without a scheduled date/time
- Forget to update appointment status
- Leave appointments in SCHEDULED status after completion

### Quote Management

✅ **Do:**

- Create quotes shortly after appointments
- Include all relevant files (PDFs, images)
- Set appropriate expiration dates
- Update status when customer responds
- Mark as WON when quote is accepted

❌ **Don't:**

- Send quotes without files if they exist
- Leave quotes in DRAFT status indefinitely
- Forget to update status when customer responds

### General Workflow

**Typical Customer Journey:**

1. **Lead Created** (Status: NEW)

   - Customer calls or walks in
   - Create lead with all information

2. **Lead Assigned** (Status: ASSIGNED)

   - Admin assigns to sales rep
   - Or sales rep takes ownership

3. **Appointment Scheduled** (Status: APPOINTMENT_SET)

   - Create appointment for site visit
   - Add site address and notes

4. **Appointment Completed** (Status: APPOINTMENT_SET)

   - Mark appointment as COMPLETED
   - Add any follow-up notes

5. **Quote Created** (Status: QUOTED)

   - Create quote with amount and details
   - Upload any relevant files
   - Send quote to customer

6. **Quote Accepted/Declined** (Status: QUOTED or WON/LOST)
   - Update quote status based on customer response
   - Update lead status accordingly:
     - **WON**: Quote accepted
     - **LOST**: Quote declined or customer unresponsive

---

## Getting Help

If you encounter any issues:

1. **Check your role**: Make sure you have permission for the action
2. **Refresh the page**: Sometimes a simple refresh helps
3. **Contact your administrator**: For account or permission issues
4. **Check the browser console**: For technical issues (F12 → Console)

---

## Keyboard Shortcuts

- **Escape**: Close modals/dialogs
- **Enter**: Submit forms
- **Tab**: Navigate between form fields

---

## Need More Help?

For technical support or feature requests, contact your system administrator.

**Last Updated**: December 2024
