const User = require('../models/User');

exports.getLogin = (req, res) => {
    res.render('users/login', { title: 'Đăng nhập - Moodiary', layout: false });
};

exports.getRegister = (req, res) => {
    res.render('users/register', { title: 'Đăng ký - Moodiary', layout: false });
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash('error_msg', 'Mật khẩu xác nhận không khớp!');
            return res.redirect('/auth/register');
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            req.flash('error_msg', 'Email này đã được sử dụng!');
            return res.redirect('/auth/register');
        }

        const newUser = new User({ name, email, password });
        await newUser.save(); 

        req.flash('success_msg', 'Đăng ký thành công! Hãy đăng nhập ngay 🐻');
        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
        res.redirect('/auth/register');
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error_msg', 'Email hoặc mật khẩu không chính xác!');
            return res.redirect('/auth/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Email hoặc mật khẩu không chính xác!');
            return res.redirect('/auth/login');
        }

        // Lưu session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email
        };

        res.redirect('/diaries/home');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
        res.redirect('/auth/login');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/auth/login');
    });
};