ALTER TABLE "Hall"
  ADD COLUMN IF NOT EXISTS "menuId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "DiningTable"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Hall_menuId_idx" ON "Hall"("menuId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Hall_menuId_fkey') THEN
    ALTER TABLE "Hall"
      ADD CONSTRAINT "Hall_menuId_fkey"
      FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
