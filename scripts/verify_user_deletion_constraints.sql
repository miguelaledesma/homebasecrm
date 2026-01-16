-- Script to verify and fix user deletion constraints
-- Run this to check if the migration was applied correctly

-- Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('appointments', 'quotes', 'quote_files', 'lead_notes')
    AND rc.constraint_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- If the above shows RESTRICT instead of SET NULL, run the migration manually:
-- The migration file is at: prisma/migrations/20260115220334_make_user_relations_nullable_on_delete_set_null/migration.sql
