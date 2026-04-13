const User = require('../models/User');
const { auth } = require('../config/firebase');
const fs = require('fs');
const path = require('path');
const { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut 
} = require('firebase/auth');

// Hàm copy avatar mặc định
function getDefaultAvatar(name) {
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    const randomAvatar = defaultAvatars[randomIndex];
    
    // Tạo tên file mới dựa trên tên user
    const ext = path.extname(randomAvatar);
    const newFilename = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const sourcePath = path.join(__dirname, '../public/default-avatars', randomAvatar);
    const destPath = path.join(__dirname, '../public/uploads', newFilename);
    
    try {
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            return `/uploads/${newFilename}`;
        }
    } catch (err) {
        console.error('Lỗi copy avatar mặc định:', err);
    }
    return null;
}

exports.getLogin = (req, res) => {
    res.render('users/login', { title: 'Đăng nhập - Bear Diary', layout: false });
};

exports.getRegister = (req, res) => {
    res.render('users/register', { title: 'Đăng ký - Bear Diary', layout: false });
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

        // 1. Nhờ Firebase tạo tài khoản
        await createUserWithEmailAndPassword(auth, email, password);

        // 2. Tạo avatar mặc định cho user
        const avatarPath = getDefaultAvatar(name);

        // 3. Lưu thông tin vào MongoDB (bao gồm avatar)
        const newUser = new User({ 
            name, 
            email, 
            password: 'FIREBASE_AUTH',
            avatar: avatarPath // Lưu đường dẫn avatar
        });
        await newUser.save(); 

        req.flash('success_msg', 'Đăng ký thành công! Hãy đăng nhập ngay 🐻');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Firebase Đăng ký:", error.code);
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

        await signInWithEmailAndPassword(auth, email, password);

        const user = await User.findOne({ email });

        req.session.user = {
            _id: user ? user._id : null,
            name: user ? user.name : 'Người dùng ẩn danh',
            email: email,
            avatar: user ? user.avatar : null
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
    signOut(auth).then(() => {
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
// QUÊN MẬT KHẨU
// ==========================================
exports.getForgotPassword = (req, res) => {
    res.render('users/forgot-password', { title: 'Quên mật khẩu - Moodiary', layout: false });
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await sendPasswordResetEmail(auth, email);
        req.flash('success_msg', 'Đã gửi link khôi phục! Vui lòng kiểm tra hộp thư của bạn.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Firebase Gửi Mail:", error.code);
        req.flash('error_msg', 'Không tìm thấy tài khoản với email này hoặc có lỗi xảy ra.');
        res.redirect('/auth/forgot-password');
    }
};