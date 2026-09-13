-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sequenceInCheque" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Order_chequeId_sequenceInCheque_idx" ON "Order"("chequeId", "sequenceInCheque");
