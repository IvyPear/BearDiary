const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Tất cả các route diary đều cần đăng nhập
router.use(requireAuth);

// Các route
router.get('/', (req, res) => {
    res.render('diaries/home');
});

router.get('/timeline', (req, res) => {
    res.render('diaries/timeline');
});

router.get('/report', (req, res) => {
    res.render('diaries/report');
});

router.get('/profile', (req, res) => {
    res.render('diaries/profile');
});

router.get('/create', (req, res) => {
    res.render('diaries/create');
});

router.get('/edit', (req, res) => {
    res.render('diaries/edit');
});

module.exports = router;