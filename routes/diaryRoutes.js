const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { ensureAuthenticated } = require('../middleware/auth');

// Áp dụng middleware bảo vệ cho tất cả các route bên dưới
router.use(ensureAuthenticated);

router.get('/home', diaryController.getHome);
router.post('/create', diaryController.createEntry); // API lưu bài viết
router.get('/timeline', diaryController.getTimeline);
router.get('/report', diaryController.getReport);
router.get('/profile', diaryController.getProfile);

module.exports = router;