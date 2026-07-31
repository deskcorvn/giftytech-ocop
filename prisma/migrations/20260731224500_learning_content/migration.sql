ALTER TABLE "TaskDefinition"
ADD COLUMN "contentSchema" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Existing pilot learners should see only one next action at a time.
-- Started, submitted and accepted work is preserved.
UPDATE "TaskProgress" AS progress
SET "state" = 'LOCKED'
FROM "TaskDefinition" AS task
WHERE progress."taskDefinitionId" = task."id"
  AND task."position" > 1
  AND progress."state" = 'READY'
  AND progress."startedAt" IS NULL;
