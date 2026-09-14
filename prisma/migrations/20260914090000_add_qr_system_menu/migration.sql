-- A restaurant has one protected public QR menu. Other menus remain POS menus.
CREATE TYPE "MenuPurpose" AS ENUM ('POS', 'QR');

ALTER TABLE "Menu"
  ADD COLUMN "purpose" "MenuPurpose" NOT NULL DEFAULT 'POS',
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Menu_restaurantId_code_key" ON "Menu"("restaurantId", "code");
