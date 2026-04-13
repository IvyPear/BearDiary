const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');     // ← thêm dòng này

// Áp dụng middleware bảo vệ cho tất cả các route bên dưới
router.use(ensureAuthenticated);

// GET /home - Trang chính để viết nhật ký + xem timeline
router.get('/home', diaryController.getHome);

// POST tạo nhật ký mới (hỗ trợ upload ảnh từ folder)
router.post('/create', upload.single('image'), diaryController.createEntry);   // ← sửa dòng này

// Các route còn lại giữ nguyên
router.get('/timeline', diaryController.getTimeline);
router.get('/report', diaryController.getReport);
router.get('/profile', diaryController.getProfile);

module.exports = router;