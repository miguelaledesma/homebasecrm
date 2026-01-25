-- CreateTable
CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "memberNames" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_members" (
    "crewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("crewId","userId")
);

-- CreateTable
CREATE TABLE "job_crew_assignments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "job_crew_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crew_members_crewId_idx" ON "crew_members"("crewId");

-- CreateIndex
CREATE INDEX "crew_members_userId_idx" ON "crew_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "job_crew_assignments_leadId_crewId_key" ON "job_crew_assignments"("leadId", "crewId");

-- CreateIndex
CREATE INDEX "job_crew_assignments_leadId_idx" ON "job_crew_assignments"("leadId");

-- CreateIndex
CREATE INDEX "job_crew_assignments_crewId_idx" ON "job_crew_assignments"("crewId");

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_crew_assignments" ADD CONSTRAINT "job_crew_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_crew_assignments" ADD CONSTRAINT "job_crew_assignments_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
