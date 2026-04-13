const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');

// --- THƯ VIỆN BẢO MẬT ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db'); // Nối Database
const authRoutes = require('./routes/authRoutes');
const diaryRoutes = require('./routes/diaryRoutes');

const app = express();

// Kết nối DB
connectDB();

// ==========================================
// CẤU HÌNH BẢO MẬT NÂNG CAO (SECURITY MIDDLEWARE)
// ==========================================

// 1. Đội mũ bảo hiểm cho HTTP Headers (Ẩn thông tin Server, chặn tấn công phổ biến)
app.use(helmet());

// 2. Chống bạo lực (Brute Force) & Spam truy cập
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 request/15 phút cho mỗi địa chỉ IP
    message: 'Bạn đã thao tác quá nhiều lần, vui lòng thử lại sau 15 phút! 🐻'
});
app.use(limiter);

// ==========================================

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Body Parser & Method Override
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session & Flash (Đã nâng cấp bảo mật Cookie)
app.use(session({
    secret: process.env.SESSION_SECRET || 'viet_bear_diary',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Chống đánh cắp Session qua mã độc JavaScript (XSS)
        secure: false,  // Đang dùng localhost (HTTP) nên để false. Khi nào up lên mạng có HTTPS thì đổi thành true
        maxAge: 1000 * 60 * 60 * 24 // Thời gian sống của Cookie: 1 ngày
    }
}));
app.use(flash());

// Biến toàn cục (Sử dụng được trong mọi file EJS)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/diaries', diaryRoutes);

// Tự động chuyển hướng URL gốc
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/diaries/home');
    } else {
        res.redirect('/auth/login');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Server bảo mật đang chạy mượt mà tại: http://localhost:${PORT}`);
});