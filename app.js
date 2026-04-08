const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

const connectDB = require('./config/db'); // Nối Database
const authRoutes = require('./routes/authRoutes');
const diaryRoutes = require('./routes/diaryRoutes');

const app = express();

// Kết nối DB
connectDB();

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

// Session & Flash
app.use(session({
    secret: process.env.SESSION_SECRET || 'viet_bear_diary',
    resave: false,
    saveUninitialized: false
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
    console.log(`✅ Server đang chạy mượt mà tại: http://localhost:${PORT}`);
});