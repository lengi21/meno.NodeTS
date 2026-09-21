-- Preserve the values a guest was charged at the time a cheque is closed.
-- Analytics uses these snapshots rather than recalculating historical cheques from current settings.
ALTER TABLE "Cheque"
  ADD COLUMN "subtotalAmount" DECIMAL(12,2),
  ADD COLUMN "serviceFeeAmount" DECIMAL(12,2),
  ADD COLUMN "serviceFeePercent" DECIMAL(5,2),
  ADD COLUMN "discountAmount" DECIMAL(12,2),
  ADD COLUMN "discountPercent" DECIMAL(5,2),
  ADD COLUMN "totalAmount" DECIMAL(12,2),
  ADD COLUMN "clientPaidAmount" DECIMAL(12,2);

CREATE INDEX "Cheque_restaurantId_closedAt_idx" ON "Cheque"("restaurantId", "closedAt");
CREATE INDEX "Cheque_restaurantId_openedAt_idx" ON "Cheque"("restaurantId", "openedAt");