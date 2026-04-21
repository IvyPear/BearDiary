const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated, ensureAuthenticated } = require('../middleware/auth');

// Debug: Kiểm tra xem file route đã được load
console.log('Auth routes loaded');

// ==========================================
// QUÊN VÀ ĐẶT LẠI MẬT KHẨU (NỘI BỘ)
// ==========================================
router.get('/forgot-password', forwardAuthenticated, authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

// Link từ Email (hoặc Terminal) sẽ dẫn về đây
// Việt cần tạo thêm hàm getResetPassword và postResetPassword trong controller sau này
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);

// ==========================================
// ĐĂNG KÝ & ĐĂNG NHẬP
// ==========================================
router.get('/register', forwardAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

router.get('/logout', authController.logout);

// ==========================================
// BẢO MẬT 2 LỚP (2FA) - NEW
// ==========================================

// 1. Trang xác thực mã 6 số (hiển thị sau khi nhập đúng pass nếu đã bật 2FA)
router.get('/verify-2fa', (req, res) => {
    if (!req.session.tempUser) return res.redirect('/auth/login');
    res.render('users/verify-2fa', { title: 'Xác thực 2 lớp', layout: false });
});

// 2. API kiểm tra mã 6 số
router.post('/verify-2fa', authController.postVerify2FA);

// 3. Kích hoạt 2FA (Chỉ cho phép khi đã đăng nhập)
router.get('/setup-2fa', ensureAuthenticated, authController.getSetup2FA);
router.post('/enable-2fa', ensureAuthenticated, authController.postEnable2FA);

module.exports = router;