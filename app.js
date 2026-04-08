const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();

const app = express();

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sử dụng Layout
app.use(expressLayouts);
app.set('layout', 'layouts/main'); 

// Cấu hình file tĩnh (CSS, Image)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware để parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route giả lập để xem giao diện Home
app.get('/', (req, res) => {
    const userData = {
        name: "Việt" 
    };
    
    res.render('diaries/home', { 
        user: userData,
        title: 'Trang chủ - Moodiary' 
    });
});

app.get('/diaries/timeline', (req, res) => {
    res.render('diaries/timeline', { 
        title: 'Dòng thời gian - Moodiary' 
    });
});

app.get('/diaries/report', (req, res) => {
    res.render('diaries/report', { 
        title: 'Mood Report - Moodiary' 
    });
});

// Route profile - ĐẶT TRƯỚC app.use('/diaries', ...)
app.get('/diaries/profile', (req, res) => {
    const userData = {
        name: "Việt" 
    };
    
    res.render('diaries/profile', { 
        user: userData,
        title: 'Cá nhân - Moodiary' 
    });
});

// Route cho auth (login, register)
app.get('/auth/login', (req, res) => {
    res.render('users/login', { 
        title: 'Đăng nhập - Moodiary',
        layout: false
    });
});

app.get('/auth/register', (req, res) => {
    res.render('users/register', { 
        title: 'Đăng ký - Moodiary',
        layout: false 
    });
});

// Import routes (nếu bạn có file này)
// app.use('/diaries', require('./routes/diaryRoutes'));

// Đổi PORT thành 3001
const PORT = process.env.PORT || 3001; 
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`Trang chủ: http://localhost:${PORT}/`);
    console.log(`Profile: http://localhost:${PORT}/diaries/profile`);
});