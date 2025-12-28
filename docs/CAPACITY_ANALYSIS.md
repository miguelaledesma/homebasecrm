# Capacity Analysis & Performance Optimization

## Current Infrastructure

- **Database**: PostgreSQL on Railway
- **Application**: Next.js 14 on Railway
- **Typical Railway Starter Plan**: 1GB RAM, 1 CPU, ~10GB storage

## Current Capacity Estimates

### Without Optimization (Current State)

- **Leads**: ~10,000 - 50,000 leads
  - Performance will start degrading around 10,000 leads
  - Dashboard queries will become slow
  - List views will have noticeable lag

### With Database Indexes (Recommended)

- **Leads**: ~100,000 - 500,000 leads
  - Good performance for most queries
  - Dashboard loads in < 1 second
  - List views remain responsive

### With Larger Database Instance

- **Leads**: 1,000,000+ leads
  - Railway Pro plan: 4GB+ RAM, 2+ CPUs
  - Can handle millions of leads with proper indexing
  - May need query optimization for very large datasets

## Critical Missing Indexes

The current schema is missing indexes on frequently queried fields:

1. **Leads Table**:

   - `status` - Used in almost every query
   - `assignedSalesRepId` - Used for filtering by sales rep
   - `createdAt` - Used for ordering (ORDER BY createdAt DESC)

2. **Appointments Table**:

   - `salesRepId` - Used for filtering by sales rep
   - `status` - Used for filtering
   - `scheduledFor` - Used for date range queries
   - `leadId` - Foreign key (should have index)

3. **Customers Table**:

   - `phone` - Used for customer lookups
   - `email` - Used for customer lookups

4. **Quotes Table**:
   - `salesRepId` - Used for filtering
   - `status` - Used for filtering
   - `leadId` - Foreign key

## Performance Impact

### Without Indexes:

- Customer lookup by phone/email: **O(n)** - Full table scan
- Lead queries by status: **O(n)** - Full table scan
- Dashboard stats: **Slow** - Multiple full table scans
- List views: **Degrades** as data grows

### With Indexes:

- Customer lookup by phone/email: **O(log n)** - Index lookup
- Lead queries by status: **O(log n)** - Index lookup
- Dashboard stats: **Fast** - Index-based counts
- List views: **Consistent** performance regardless of size

## Recommendations

1. **Immediate**: Add database indexes (see migration file)
2. **Short-term**: Monitor query performance, add pagination limits
3. **Long-term**: Consider database scaling, query optimization, caching

## Storage Estimates

- **Lead record**: ~500 bytes
- **Customer record**: ~300 bytes
- **Appointment record**: ~400 bytes
- **Quote record**: ~300 bytes

**Per 10,000 leads**:

- Leads: ~5 MB
- Customers: ~3 MB
- Appointments: ~4 MB (assuming 1 per lead)
- Quotes: ~3 MB (assuming 0.5 per lead)
- **Total**: ~15 MB

**Per 100,000 leads**: ~150 MB
**Per 1,000,000 leads**: ~1.5 GB

Storage is not a limiting factor - query performance is.
