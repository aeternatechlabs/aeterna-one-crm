const { asyncHandler, ApiResponse } = require('../../utils/devilWrapper');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
} = require('./notification.service');

const getNotifications = asyncHandler(async (req, res) => {
  const result = await getUserNotifications(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result));
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, notification));
});

const markAllRead = asyncHandler(async (req, res) => {
  await markAllAsRead(req.user._id);
  res.status(200).json(new ApiResponse(200, { message: 'All notifications marked as read.' }));
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead,
};
