const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated } = require('../middleware/auth');

// Đăng ký
router.get('/register', forwardAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

// Đăng nhập
router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

// Đăng xuất
router.get('/logout', authController.logout);

module.exports = router;