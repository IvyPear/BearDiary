const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');

// Multer storage for avatar uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, '..', 'public', 'uploads'));
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_');
		cb(null, Date.now() + '_' + name + ext);
	}
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
const { ensureAuthenticated } = require('../middleware/auth');

// Áp dụng middleware bảo vệ cho tất cả các route bên dưới
router.use(ensureAuthenticated);

router.get('/home', diaryController.getHome);
router.post('/create', diaryController.createEntry); // API lưu bài viết
router.get('/timeline', diaryController.getTimeline);
router.get('/edit/:id', diaryController.getEditEntry);
router.post('/update/:id', diaryController.updateEntry);
router.post('/delete/:id', diaryController.deleteEntry);
router.get('/report', diaryController.getReport);
router.get('/profile', diaryController.getProfile);
router.get('/profile/edit', diaryController.getEditProfile);

// Route update profile (hỗ trợ upload avatar)
// Chú ý: 'avatarFile' là tên field trong form gửi lên (giống với editProfile.ejs)
router.post('/profile/update', upload.single('avatarFile'), diaryController.updateProfile);

// ==========================================
// Route này cho phép upload avatar riêng biệt, không cần update toàn bộ profile
router.post('/profile/upload-avatar', upload.single('avatar'), authController.updateAvatar);

// ====================== ROUTES MỚI CHO TASK CỦA @TRƯƠNG THỦY LAM ======================
// Viết & lưu nhật ký (có upload nhiều ảnh + highlight quan trọng)
// Phải có trong commit tối nay

// GET: Hiển thị form viết nhật ký mới
router.get('/create', diaryController.getCreateDiary);

// POST: Lưu nhật ký mới (upload nhiều ảnh + highlight)
router.post('/create', diaryController.createDiary);

// GET: Timeline có hỗ trợ hiển thị highlight (không đè lên route cũ)
router.get('/timeline-highlight', diaryController.getTimelineWithHighlight);

// ====================== TASK MANAGEMENT ======================
// GET: Trang quản lý công việc (client-side state via localStorage)
router.get('/tasks', function(req, res) {
  res.render('diaries/tasks', {
    title: 'Công việc - Moodiary',
    user: req.user || null
  });
});

module.exports = router;