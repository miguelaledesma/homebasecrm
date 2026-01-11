# Custom Lead ID System - Implementation Plan

## Overview

Add a human-readable custom ID system for leads with the format `105-XXXX` (e.g., `105-A100`, `105-B247`). This ID will be separate from the database primary key and serve as a user-facing identifier for easier lead differentiation and communication.

## Requirements

- **Format**: `105-XXXX` where:
  - `105-` is a fixed prefix
  - `XXXX` is a variable suffix (can be alphanumeric, sequential, or random)
- **Uniqueness**: Must be unique across all leads
- **Non-breaking**: Existing database IDs remain unchanged
- **Display**: Visible in UI for identification purposes
- **Searchable**: Optional - consider allowing search by custom ID

## Database Schema Changes

### 1. Add New Field to Lead Model

Add a new field to the `Lead` model in `prisma/schema.prisma`:

```prisma
model Lead {
  // ... existing fields
  leadNumber String? @unique // Custom ID: "105-XXXX" format
  // ... rest of fields
}
```

**Considerations:**
- Field is **nullable** initially to handle existing leads
- Field is **unique** to prevent duplicates
- Could add an index for faster lookups if search functionality is needed

### 2. Migration Strategy

**Option A: Add field as nullable, backfill later**
- Add field as `String? @unique`
- Generate custom IDs for existing leads during migration or via a script
- Make field required (`String @unique`) in a follow-up migration

**Option B: Add field as required immediately**
- Generate custom IDs for all existing leads in the migration script
- More complex migration but ensures all leads have IDs immediately

**Recommendation**: Start with Option A for safety, then backfill and make required.

## ID Generation Strategy

### Format Options

**Option 1: Sequential (e.g., A001, A002, A003...)**
- Simple counter with letter prefix
- Predictable and ordered
- **Pros**: Easy to understand, sequential
- **Cons**: Reveals volume, might need multiple letter prefixes after 999

**Option 2: Alphanumeric Random (e.g., A1B2, X9K4, M7N3)**
- Random alphanumeric combination
- **Pros**: Doesn't reveal sequence/volume
- **Cons**: Less intuitive, harder to remember

**Option 3: Alphanumeric Sequential (e.g., A100, A101, A102... or A100, B100, C100)**
- More structured than pure random
- **Pros**: Balance between randomness and structure
- **Cons**: Still somewhat predictable

**Option 4: Short Random String (e.g., A1B2, X9K4)**
- Random 4-character alphanumeric suffix
- **Pros**: Good balance, unique enough
- **Cons**: Need collision checking

**Recommendation**: Start with **Option 4** (short random alphanumeric like `A1B2`, `X9K4`) for a good balance.

### Generation Logic

```typescript
// Pseudocode
function generateLeadNumber(): string {
  const prefix = "105-";
  let suffix: string;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate random alphanumeric suffix (e.g., 4 characters)
    suffix = generateRandomAlphanumeric(4); // e.g., "A1B2", "X9K4"
    
    // Check uniqueness in database
    isUnique = await checkIfUnique(prefix + suffix);
  }
  
  return prefix + suffix;
}
```

**Implementation location**: 
- Create utility function in `lib/lead-utils.ts` or similar
- Call during lead creation in `app/api/leads/route.ts`

### Uniqueness Guarantee

- Check database before assignment (retry if collision)
- Database unique constraint as backup
- Transaction-safe generation (handle race conditions)

## UI/UX Considerations

### Where to Display Custom ID

**1. Leads List Page (`/leads/page.tsx`)**
- Add new column: "Lead ID" or "Reference #"
- Display custom ID prominently
- Could be first column or after customer name
- Make it copyable (click to copy functionality)

**2. Lead Detail Page (`/leads/[id]/page.tsx`)**
- Display at top of page, near lead status
- Large, prominent display
- Copy-to-clipboard button
- Include in page title/header

**3. Other Locations to Consider**
- Quote pages (if quotes reference lead IDs)
- Appointment pages
- Export/print views
- Email communications (if sending quotes/details)

### Visual Design

- **Format**: Monospace font (e.g., `font-mono`) for better readability
- **Styling**: Badge or chip style to make it stand out
- **Color**: Subtle but distinguishable (e.g., gray badge with blue text)
- **Size**: Medium size - visible but not overwhelming

### Search/Filter Functionality

**Optional Enhancement**: Add ability to search/filter by custom ID
- Add search input in leads page
- Filter leads where `leadNumber` matches search term
- Could be part of existing search or separate filter

## API Considerations

### Lead Creation (`POST /api/leads`)

**Changes needed:**
- Generate custom ID during lead creation
- Include in creation transaction
- Return in API response

**Code location**: `app/api/leads/route.ts` - in the `POST` handler

### Lead Retrieval (`GET /api/leads` and `GET /api/leads/[id]`)

**Changes needed:**
- Include `leadNumber` in all responses
- No breaking changes (just additional field)

### Lead Updates (`PATCH /api/leads/[id]`)

**Decision needed**: Should custom ID be editable?
- **Recommendation**: Make it **read-only** after creation
  - Prevents confusion
  - Maintains data integrity
  - Simpler implementation

### Type Definitions

Update TypeScript types in:
- `app/(protected)/leads/page.tsx` - Lead type
- `app/(protected)/leads/[id]/page.tsx` - Lead type
- Any other places where Lead type is defined

## Migration Plan for Existing Leads

### Step 1: Add Field (Migration 1)

1. Add `leadNumber` field as nullable, unique
2. Deploy migration
3. Verify no errors

### Step 2: Backfill Existing Leads (Script)

Create a script to generate IDs for existing leads:

```typescript
// scripts/backfill-lead-numbers.ts
// Generate custom IDs for all leads that don't have one
```

**Options:**
- Run as one-time migration script
- Or create API endpoint for admins to trigger backfill

### Step 3: Make Field Required (Migration 2, Optional)

1. After all leads have IDs, consider making field required
2. Or keep nullable for flexibility

**Recommendation**: Keep nullable for flexibility, but ensure all new leads get IDs.

## Edge Cases & Considerations

### 1. Race Conditions
- Multiple leads created simultaneously
- Use database transactions
- Retry logic if unique constraint violation

### 2. ID Generation Failures
- What if generation fails repeatedly?
- Have fallback mechanism
- Log errors appropriately

### 3. Existing Lead References
- URLs still use database ID (`/leads/[id]`)
- Custom ID is for display/search only
- No changes needed to routing

### 4. Export/Import
- Include custom ID in exports
- Handle imports (generate if missing)

### 5. Testing
- Test ID generation uniqueness
- Test with concurrent creation
- Test migration script
- Test UI display in all locations

## Implementation Phases

### Phase 1: Database & Generation (Backend)
1. Add `leadNumber` field to schema
2. Create migration
3. Implement ID generation utility
4. Update lead creation API

### Phase 2: UI Display
1. Update TypeScript types
2. Add column to leads list page
3. Add display to lead detail page
4. Style appropriately

### Phase 3: Backfill Existing Leads
1. Create backfill script
2. Test on development
3. Run on production
4. Verify all leads have IDs

### Phase 4: Enhancements (Optional)
1. Add search by custom ID
2. Copy-to-clipboard functionality
3. Include in exports
4. Make field required (if desired)

## Open Questions

1. **Suffix Format**: What format for the suffix? (Random, sequential, etc.)
   - **Suggestion**: Start with 4-character alphanumeric random (A-Z, 0-9)

2. **Required vs Optional**: Should field be required after backfill?
   - **Suggestion**: Keep nullable for flexibility

3. **Search Functionality**: Should users be able to search by custom ID?
   - **Suggestion**: Yes, add in Phase 4

4. **Editable**: Should custom ID be editable after creation?
   - **Suggestion**: No, keep read-only

5. **Prefix Configurable**: Should "105-" be configurable or hardcoded?
   - **Suggestion**: Start hardcoded, make configurable later if needed

## Files That Will Need Changes

### Database
- `prisma/schema.prisma` - Add `leadNumber` field
- `prisma/migrations/` - Create migration

### Backend/API
- `app/api/leads/route.ts` - Generate ID on creation
- `lib/lead-utils.ts` - NEW: ID generation utility (or add to existing utils)

### Frontend/UI
- `app/(protected)/leads/page.tsx` - Add column, update types
- `app/(protected)/leads/[id]/page.tsx` - Display ID, update types
- `app/(protected)/leads/new/page.tsx` - May need to show generated ID after creation

### Scripts (Optional)
- `scripts/backfill-lead-numbers.ts` - NEW: Backfill script for existing leads

## Success Criteria

- ✅ All new leads get a custom ID with format `105-XXXX`
- ✅ Custom ID is unique across all leads
- ✅ Custom ID is displayed in UI (list and detail pages)
- ✅ Existing leads can be backfilled with custom IDs
- ✅ No breaking changes to existing functionality
- ✅ System handles race conditions properly
