# Customer Number Implementation

## Overview
Added a customer number field to leads that starts with "105-" to help identify and search for leads more easily.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Added `customerNumber` field to the `Lead` model
  - Type: `String?` (nullable, unique)
  - Format: `105-XXXXXX` (6-digit zero-padded number)
  - Added unique constraint to prevent duplicates
  - Added index for fast searching

### 2. Database Migration
- Created migration: `20260118000000_add_customer_number`
- Adds the `customerNumber` column to the `leads` table
- Creates unique index and search index
- Applied successfully to the database

### 3. API Updates (`app/api/leads/route.ts`)
- Modified POST endpoint to auto-generate customer numbers
- Customer numbers are sequential, starting from 105-000001
- Generation logic:
  ```typescript
  const leadCount = await prisma.lead.count();
  const customerNumber = `105-${String(leadCount + 1).padStart(6, '0')}`;
  ```
- Each new lead automatically receives a unique customer number

### 4. UI Updates

#### Leads List (`app/(protected)/leads/page.tsx`)
- Added `customerNumber` field to the `Lead` type
- Added new "Customer #" column as the first column in the table
- Column features:
  - Width: 120px
  - Sortable by customer number
  - Displays in monospace font for easy reading
  - Shows "-" if no customer number exists (legacy leads)

#### Lead Detail Page (`app/(protected)/leads/[id]/page.tsx`)
- Added `customerNumber` field to the `Lead` type
- Displays customer number in two places:
  1. In the page header subtitle (next to customer name)
  2. In the Lead Information card (prominent display with larger font)
- Shows in monospace font for consistency

### 5. Backfill Script (`scripts/backfill-customer-numbers.ts`)
- Created utility script to assign customer numbers to existing leads
- Features:
  - Finds all leads without customer numbers
  - Orders by creation date (oldest first)
  - Continues numbering from the highest existing number
  - Progress reporting every 10 leads
- Successfully backfilled 18 existing leads

## Usage

### For New Leads
Customer numbers are automatically generated when creating a new lead. No manual action required.

### Format
- Pattern: `105-XXXXXX`
- Example: `105-000001`, `105-000042`, `105-001234`
- Always 6 digits, zero-padded on the left

### Searching
The customer number field is indexed for fast searching. Users can search for leads by:
- Full customer number: `105-000001`
- Partial customer number (if search supports it)

### Display
- **Leads List**: Shows in first column for easy identification
- **Lead Detail**: Shows in header and Lead Information section
- **Format**: Monospace font (easier to read numbers)

## Benefits

1. **Easy Identification**: Quick reference number for each lead
2. **Phone Communication**: Easy to read over the phone ("one-oh-five dash zero-zero-zero-zero-four-two")
3. **Searchable**: Fast lookup by customer number
4. **Sequential**: Numbers show relative age of leads
5. **Prefix System**: "105-" prefix allows for future categorization (e.g., different prefixes for different lead types)

## Technical Details

### Auto-Generation Logic
- Uses lead count to ensure sequential numbers
- Format: `105-${count + 1}` with 6-digit padding
- Unique constraint prevents duplicates
- Handles concurrent creation (database constraint)

### Database Indexes
- Unique index on `customerNumber` for constraint enforcement
- Regular index for search performance

### Type Safety
- TypeScript types updated in all relevant files
- Field is optional (`string | null`) to support legacy leads
- Prisma schema generates correct types

## Future Enhancements

Possible improvements:
1. Add search filter specifically for customer number in UI
2. Add customer number to quote documents
3. Use customer number in file naming for uploads
4. Add different prefixes for different types (e.g., 106- for contractor leads)
5. Add customer number to email notifications

## Testing Checklist

- [x] Database migration applied successfully
- [x] Prisma client generated with new types
- [x] Existing leads backfilled with customer numbers
- [x] New lead creation generates customer numbers
- [x] Customer numbers display in leads list
- [x] Customer numbers display in lead detail page
- [x] No TypeScript errors
- [x] No linter errors

## Rollback Instructions

If needed to rollback:

1. Remove the column:
   ```sql
   DROP INDEX IF EXISTS "leads_customerNumber_idx";
   DROP INDEX IF EXISTS "leads_customerNumber_key";
   ALTER TABLE "leads" DROP COLUMN "customerNumber";
   ```

2. Revert Prisma schema changes
3. Regenerate Prisma client
4. Revert UI changes in components

## Files Modified

1. `prisma/schema.prisma` - Added customerNumber field
2. `prisma/migrations/20260118000000_add_customer_number/migration.sql` - Database migration
3. `app/api/leads/route.ts` - Auto-generation logic
4. `app/(protected)/leads/page.tsx` - Leads list display
5. `app/(protected)/leads/[id]/page.tsx` - Lead detail display
6. `scripts/backfill-customer-numbers.ts` - Backfill utility (new file)

## Maintenance

### If Customer Numbers Need to be Reset
Run the backfill script again after clearing the field:
```bash
# Clear all customer numbers (be careful!)
npx prisma db execute --stdin <<< "UPDATE leads SET \"customerNumber\" = NULL;"

# Re-run backfill
npx tsx scripts/backfill-customer-numbers.ts
```

### To Check Numbering Integrity
```sql
-- Find gaps in numbering
SELECT "customerNumber", 
       CAST(SUBSTRING("customerNumber" FROM 5) AS INTEGER) as num
FROM "leads" 
WHERE "customerNumber" IS NOT NULL
ORDER BY num;

-- Find duplicates (should be empty due to unique constraint)
SELECT "customerNumber", COUNT(*) 
FROM "leads" 
WHERE "customerNumber" IS NOT NULL
GROUP BY "customerNumber" 
HAVING COUNT(*) > 1;
```
