-- Check for duplicate crew member assignments
SELECT "crewId", "userId", COUNT(*) as count
FROM "crew_members"
GROUP BY "crewId", "userId"
HAVING COUNT(*) > 1;
