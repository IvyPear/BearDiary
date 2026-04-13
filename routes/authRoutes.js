const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated } = require('../middleware/auth');
// Debug: indicate this routes file was loaded
console.log('Auth routes loaded');
// Bỏ dấu // ở 2 dòng dưới đây
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

// Đăng ký
router.get('/register', forwardAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

// Đăng nhập
router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

// Đăng xuất
router.get('/logout', authController.logout);
// (Removed duplicate debug route)

module.exports = router;