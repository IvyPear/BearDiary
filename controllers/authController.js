exports.getLogin = (req, res) => {
    // Render file views/users/login.ejs
    res.render('users/login', { 
        title: 'Đăng nhập - Moodiary',
        layout: false // Thường trang login không dùng chung layout với trang chủ
    });
};

exports.getRegister = (req, res) => {
    res.render('users/register', { 
        title: 'Đăng ký - Moodiary',
        layout: false 
    });
};