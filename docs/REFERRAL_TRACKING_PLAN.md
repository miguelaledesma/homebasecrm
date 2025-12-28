# Referral Tracking System - Implementation Plan

## Overview

Track who referred each lead, identify if referrers are existing customers, and enable sending gifts (email/SMS) to thank referrers.

## Database Schema Design

### Option 1: Add Referrer Model (Recommended)

```prisma
model Referrer {
  id          String   @id @default(cuid())
  firstName   String?
  lastName    String?
  phone       String?
  email       String?
  isCustomer  Boolean  @default(false) // True if they're an existing customer
  customerId  String?  // Link to Customer if they're in the system
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  referredLeads Lead[]
  customer      Customer? @relation(fields: [customerId], references: [id])

  @@index([phone])
  @@index([email])
  @@index([customerId])
  @@map("referrers")
}

// Update Lead model
model Lead {
  // ... existing fields
  referrerId  String?
  referrer    Referrer? @relation(fields: [referrerId], references: [id])

  // Gift tracking
  giftSentAt  DateTime?
  giftMethod  String?   // "EMAIL" | "SMS" | null
  giftStatus  String?   // "PENDING" | "SENT" | "FAILED"
}
```

### Option 2: Store Referrer Info Directly on Lead (Simpler)

```prisma
model Lead {
  // ... existing fields

  // Referral info
  referrerFirstName String?
  referrerLastName  String?
  referrerPhone     String?
  referrerEmail     String?
  referrerCustomerId String? // Link to existing customer if found
  referrerIsCustomer Boolean @default(false)

  // Gift tracking
  giftSentAt  DateTime?
  giftMethod  String?   // "EMAIL" | "SMS"
  giftStatus  String?   // "PENDING" | "SENT" | "FAILED"
}
```

**Recommendation:** Option 2 is simpler for MVP, Option 1 is better for long-term if you want to track referrer stats/history.

## UI/UX Flow

### 1. Lead Creation Form

When `sourceType === "REFERRAL"`:

- Show conditional "Referrer Information" section
- Fields:
  - Referrer First Name (optional)
  - Referrer Last Name (optional)
  - Referrer Phone OR Email (at least one required)
  - Auto-search: As user types phone/email, check if referrer exists as customer
  - Display: "✓ Found as existing customer: [Name]" if match found
  - Display: "New referrer" if no match

### 2. Lead Detail Page

- Show "Referral Information" card if lead has referrer
- Display:
  - Referrer name and contact info
  - Whether they're an existing customer (with link to customer profile)
  - Gift status (Pending/Sent/Failed)
  - "Send Gift" button (Email/SMS options)

### 3. Gift Sending Interface

- Modal/dropdown with:
  - Email option (if referrer has email)
  - SMS option (if referrer has phone)
  - Gift message template (customizable)
  - Send button
  - Status tracking

## Implementation Steps

### Phase 1: Database & Basic Tracking

1. ✅ Update Prisma schema (add referral fields to Lead)
2. ✅ Create migration
3. ✅ Update Lead creation API to accept referral info
4. ✅ Update Lead creation form UI (conditional referral section)
5. ✅ Add referrer lookup/search on form

### Phase 2: Referrer Matching

1. ✅ Create API endpoint to search for referrer by phone/email
2. ✅ Auto-populate referrer info if found as customer
3. ✅ Link referrer to existing customer if match found
4. ✅ Display referrer status on lead detail page

### Phase 3: Gift Sending

1. ✅ Add gift sending UI to lead detail page
2. ✅ Create API endpoint for sending gifts
3. ✅ Integrate email service (SendGrid, Resend, etc.)
4. ✅ Integrate SMS service (Twilio, etc.)
5. ✅ Track gift status in database
6. ✅ Add gift history/logging

### Phase 4: Reporting & Analytics

1. ✅ Referral dashboard (top referrers, referral stats)
2. ✅ Gift tracking report
3. ✅ Referral conversion metrics

## API Endpoints Needed

```
GET  /api/referrers/search?phone=...&email=...
POST /api/leads/:id/send-gift
GET  /api/referrals/stats
```

## Third-Party Integrations

### Email Service Options:

- **Resend** (recommended - simple, modern)
- **SendGrid** (popular, feature-rich)
- **AWS SES** (cost-effective at scale)

### SMS Service Options:

- **Twilio** (most popular, reliable)
- **AWS SNS** (cost-effective)
- **Vonage** (formerly Nexmo)

## Data Flow Example

1. User creates lead with sourceType = "REFERRAL"
2. User enters referrer phone: "555-1234"
3. System searches customers: `findCustomer({ phone: "555-1234" })`
4. If found:
   - Auto-populate referrer name
   - Set `referrerIsCustomer = true`
   - Set `referrerCustomerId = customer.id`
5. If not found:
   - Store referrer contact info
   - Set `referrerIsCustomer = false`
6. Lead created with referral info
7. Later, admin clicks "Send Gift" on lead detail page
8. System sends email/SMS to referrer
9. Update `giftSentAt`, `giftMethod`, `giftStatus`

## Questions to Consider

1. **Gift Type**: What kind of gift? (Gift card code, discount code, physical gift?)
2. **Automation**: Auto-send gift when lead converts to WON? Or manual only?
3. **Referrer Rewards**: Track multiple referrals per person? Reward tiers?
4. **Privacy**: Store referrer info even if they're not a customer?
5. **Notifications**: Notify referrer when their referral converts?

## Next Steps

1. Choose database schema approach (Option 1 or 2)
2. Decide on email/SMS service providers
3. Design gift message templates
4. Start with Phase 1 implementation
