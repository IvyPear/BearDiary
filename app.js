const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const diaryRoutes = require('./routes/diaryRoutes');

const app = express();

// 1. KẾT NỐI DATABASE
connectDB();

// 2. CẤU HÌNH BẢO MẬT HELMET (Sửa lỗi vỡ giao diện)
// Cấu hình này cho phép tải CSS/JS từ các nguồn phổ biến như Tailwind và FontAwesome
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
        }
    }
}));

// 3. GIỚI HẠN TỐC ĐỘ TRUY CẬP (Rate Limit)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // 100 request
    message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau 15 phút! 🐻'
});
app.use('/auth/', limiter); // Chỉ áp dụng giới hạn cho các trang đăng nhập/quên mật khẩu

// 4. CẤU HÌNH EJS & STATIC FILES
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use(express.static(path.join(__dirname, 'public')));

// 5. MIDDLEWARE XỬ LÝ DỮ LIỆU
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// 6. CẤU HÌNH SESSION & FLASH
app.use(session({
    secret: process.env.SESSION_SECRET || 'viet_bear_diary',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Chống XSS
        secure: false,  // Để false vì đang chạy localhost (HTTP)
        maxAge: 1000 * 60 * 60 * 24 // 1 ngày
    }
}));
app.use(flash());

// 7. BIẾN TOÀN CỤC CHO VIEW
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// 8. ĐỊNH NGHĨA ROUTES
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

// 9. KHỞI CHẠY SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Bear Diary đang chạy mượt mà tại: http://localhost:${PORT}`);
});