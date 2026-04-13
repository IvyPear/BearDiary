const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const upload = require('../middleware/upload');

// Tạm thời bỏ auth để test dễ
router.get('/home', diaryController.getHome);
router.post('/create', upload.single('image'), diaryController.createEntry);

module.exports = router;