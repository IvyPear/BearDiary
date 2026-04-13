const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const upload = require('../middleware/upload');

// Các route chính
router.get('/home', diaryController.getHome);
router.post('/create', upload.single('image'), diaryController.createEntry);
router.get('/timeline', diaryController.getTimeline);
router.get('/report', diaryController.getReport);
router.get('/profile', diaryController.getProfile);

module.exports = router;