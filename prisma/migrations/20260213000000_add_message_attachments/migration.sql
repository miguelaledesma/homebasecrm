-- CreateTable (with IF NOT EXISTS for idempotency)
CREATE TABLE IF NOT EXISTS "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (with IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- AddForeignKey (check if constraint exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_attachments_messageId_fkey'
    ) THEN
        ALTER TABLE "message_attachments" 
        ADD CONSTRAINT "message_attachments_messageId_fkey" 
        FOREIGN KEY ("messageId") 
        REFERENCES "messages"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;
