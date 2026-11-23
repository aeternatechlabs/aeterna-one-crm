const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllRead,
} = require('./notification.controller');
const { protect } = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllRead);

module.exports = router;
