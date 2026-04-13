const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const upload = require('../middleware/upload');

// Không dùng ensureAuthenticated tạm thời để test dễ hơn
// router.use(ensureAuthenticated);   ← comment dòng này lại

router.get('/home', diaryController.getHome);
router.post('/create', upload.single('image'), diaryController.createEntry);

module.exports = router;