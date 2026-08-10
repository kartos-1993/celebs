-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductInventory_productId_quantity_idx" ON "ProductInventory"("product_id", "quantity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_userId_status_idx" ON "Order"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cart_updatedAt_idx" ON "Cart"("updatedAt");
