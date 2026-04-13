const User = require('../models/User'); // Vẫn giữ MongoDB để lưu Tên người dùng
const { auth } = require('../config/firebase');
const { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut 
} = require('firebase/auth');

exports.getLogin = (req, res) => {
    res.render('users/login', { title: 'Đăng nhập - Moodiary', layout: false });
};

exports.getRegister = (req, res) => {
    res.render('users/register', { title: 'Đăng ký - Moodiary', layout: false });
};

// ==========================================
// ĐĂNG KÝ BẰNG FIREBASE
// ==========================================
exports.postRegister = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash('error_msg', 'Mật khẩu xác nhận không khớp!');
            return res.redirect('/auth/register');
        }

        // 1. Nhờ Firebase tạo tài khoản (Tự động kiểm tra trùng email & pass > 6 ký tự)
        await createUserWithEmailAndPassword(auth, email, password);

        // 2. Lưu thông tin phụ (Tên) vào MongoDB
        const newUser = new User({ 
            name, 
            email, 
            password: 'FIREBASE_AUTH' // Không cần lưu mật khẩu thật nữa
        });
        await newUser.save(); 

        req.flash('success_msg', 'Đăng ký thành công! Hãy đăng nhập ngay 🐻');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Firebase Đăng ký:", error.code);
        // Bắt lỗi tiếng Anh của Firebase và dịch sang tiếng Việt cho người dùng
        if (error.code === 'auth/email-already-in-use') {
            req.flash('error_msg', 'Email này đã được sử dụng!');
        } else if (error.code === 'auth/weak-password') {
            req.flash('error_msg', 'Mật khẩu quá yếu! Vui lòng nhập ít nhất 6 ký tự.');
        } else {
            req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
        }
        res.redirect('/auth/register');
    }
};

// ==========================================
// ĐĂNG NHẬP BẰNG FIREBASE
// ==========================================
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra đăng nhập với Firebase
        await signInWithEmailAndPassword(auth, email, password);

        // 2. Lấy thông tin người dùng từ MongoDB (để lấy Tên)
        const user = await User.findOne({ email });

        // 3. Lưu session
        req.session.user = {
            _id: user ? user._id : null,
            name: user ? user.name : 'Người dùng ẩn danh',
            email: email
        };

        res.redirect('/diaries/home');
    } catch (error) {
        console.error("Lỗi Firebase Đăng nhập:", error.code);
        req.flash('error_msg', 'Email hoặc mật khẩu không chính xác!');
        res.redirect('/auth/login');
    }
};

// ==========================================
// ĐĂNG XUẤT
// ==========================================
exports.logout = (req, res) => {
    // Đăng xuất khỏi Firebase trước
    signOut(auth).then(() => {
        // Sau đó hủy Session của hệ thống
        req.session.destroy((err) => {
            if (err) console.error(err);
            res.redirect('/auth/login');
        });
    }).catch((error) => {
        console.error(error);
        res.redirect('/diaries/home');
    });
};

// ==========================================
// QUÊN MẬT KHẨU (GỬI MAIL TỰ ĐỘNG)
// ==========================================
exports.getForgotPassword = (req, res) => {
    res.render('users/forgot-password', { title: 'Quên mật khẩu - Moodiary', layout: false });
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Chỉ 1 dòng code duy nhất: Ra lệnh cho Firebase gửi mail
        await sendPasswordResetEmail(auth, email);

        req.flash('success_msg', 'Đã gửi link khôi phục! Vui lòng kiểm tra hộp thư của bạn.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Firebase Gửi Mail:", error.code);
        req.flash('error_msg', 'Không tìm thấy tài khoản với email này hoặc có lỗi xảy ra.');
        res.redirect('/auth/forgot-password');
    }
};