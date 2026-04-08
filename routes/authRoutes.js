const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Đường dẫn này thực tế sẽ là /auth/login
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);

module.exports = router;