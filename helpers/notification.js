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
    data: { userId, type, message },
  });
}

/**
 * Get or create notification settings for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} Notification settings object
 */
export async function getNotificationSettings(userId) {
  let settings = await db.notificationSettings.findUnique({
    where: { userId }
  });

  if (!settings) {
    settings = await db.notificationSettings.create({
      data: {
        userId,
        preferences: {
          email: true,
          push: true,
          order: true,
          message: true,
          product: true,
          marketing: false
        }
      }
    });
  }

  return typeof settings.preferences === 'string' 
    ? JSON.parse(settings.preferences) 
    : settings.preferences;
}

/**
 * Update notification settings for a user
 * @param {number} userId - The user ID
 * @param {Object} preferences - The notification preferences object
 * @returns {Promise<Object>} Updated settings
 */
export async function updateNotificationSettings(userId, preferences) {
  return db.notificationSettings.upsert({
    where: { userId },
    update: { preferences },
    create: { userId, preferences }
  });
}

/**
 * Check if a user has a specific notification type enabled
 * @param {number} userId - The user ID
 * @param {string} notificationType - The notification type (email, push, order, message, product, marketing)
 * @returns {Promise<boolean>} Whether the notification type is enabled
 */
export async function isNotificationEnabled(userId, notificationType) {
  const preferences = await getNotificationSettings(userId);
  return preferences[notificationType] ?? true; // Default to true if not specified
}

/**
 * Add a new notification type to existing settings
 * @param {number} userId - The user ID
 * @param {string} notificationType - The new notification type
 * @param {boolean} defaultValue - Default value for the new type
 * @returns {Promise<Object>} Updated preferences
 */
export async function addNotificationType(userId, notificationType, defaultValue = true) {
  const preferences = await getNotificationSettings(userId);
  
  if (!(notificationType in preferences)) {
    preferences[notificationType] = defaultValue;
    await updateNotificationSettings(userId, preferences);
  }
  
  return preferences;
} 