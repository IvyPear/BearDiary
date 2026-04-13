const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');   // multer middleware

// Bảo vệ tất cả route bằng authentication
router.use(ensureAuthenticated);

// GET Home - Form viết nhật ký + Timeline
router.get('/home', diaryController.getHome);

// POST Tạo nhật ký mới - Quan trọng: phải có upload.single('image')
router.post('/create', upload.single('image'), diaryController.createEntry);

module.exports = router;