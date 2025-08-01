/*
  Warnings:

  - You are about to drop the column `emailNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `marketingNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `messageNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `orderNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `productNotifications` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotifications` on the `NotificationSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "NotificationSettings_userId_idx";

-- AlterTable
ALTER TABLE "NotificationSettings" DROP COLUMN "emailNotifications",
DROP COLUMN "marketingNotifications",
DROP COLUMN "messageNotifications",
DROP COLUMN "orderNotifications",
DROP COLUMN "productNotifications",
DROP COLUMN "pushNotifications",
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{"email":true,"push":true,"order":true,"message":true,"product":true,"marketing":false}';
