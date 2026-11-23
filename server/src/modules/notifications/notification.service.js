const { Notification } = require('./notification.model');

const createIdempotentNotification = async (payload) => {
  const { dedupKey, ...docData } = payload;

  if (dedupKey) {
    return Notification.findOneAndUpdate(
      { dedupKey },
      { $setOnInsert: { ...docData, dedupKey } },
      { upsert: true, new: true }
    );
  }

  return Notification.create(docData);
};

const getUserNotifications = async (userId, options = {}) => {
  const { isRead, page = 1, limit = 20 } = options;
  const filter = { recipient: userId };

  if (isRead !== undefined) {
    filter.isRead = isRead === 'true' || isRead === true;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
    unreadCount,
  };
};

const markNotificationAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).lean();
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { success: true };
};

module.exports = {
  createIdempotentNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
};
