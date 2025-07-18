import { db } from "./db.js";

/**
 * Create a notification for a user (seller)
 * @param {Object} param0
 * @param {number} param0.userId - The user (seller) ID
 * @param {string} param0.type - Notification type (order, message, product, system)
 * @param {string} param0.message - Notification message
 */
export async function createNotification({ userId, type, message }) {
  return db.notification.create({
    data: {
      userId,
      type,
      message,
    },
  });
} 