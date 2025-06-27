/*
  Warnings:

  - Added the required column `price` to the `OrderProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderProduct" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ProductView" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductView_productId_idx" ON "ProductView"("productId");

-- CreateIndex
CREATE INDEX "ProductView_createdAt_idx" ON "ProductView"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
