const User = require('../models/User'); // Vẫn giữ MongoDB để lưu Tên người dùng
const { auth } = require('../config/firebase');
const { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut 
} = require('firebase/auth');
const fs = require('fs');
const path = require('path');

// ==========================================
// HÀM HỖ TRỢ LẤY AVATAR MẶC ĐỊNH
// ==========================================
function getDefaultAvatar(name) {
    const defaultAvatars = ['bear1.png', 'bear2.png', 'bear3.png', 'bear4.png'];
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    const randomAvatar = defaultAvatars[randomIndex];
    
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

// ==========================================
// XÓA AVATAR CŨ (KHI UPDATE)
// ==========================================
function deleteOldAvatar(avatarPath) {
    if (avatarPath && !avatarPath.includes('default-avatars')) {
        const fullPath = path.join(__dirname, '../public', avatarPath);
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (err) {
            console.error('Lỗi xóa avatar cũ:', err);
        }
    }
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

        // 1. Nhờ Firebase tạo tài khoản (Tự động kiểm tra trùng email & pass > 6 ký tự)
        await createUserWithEmailAndPassword(auth, email, password);

        // 2. Tạo avatar mặc định cho user
        const avatarPath = getDefaultAvatar(name);

        // 3. Lưu thông tin phụ (Tên + Avatar) vào MongoDB
        const newUser = new User({ 
            name, 
            email, 
            password: 'FIREBASE_AUTH', // Không cần lưu mật khẩu thật nữa
            avatar: avatarPath // Thêm avatar mặc định
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

        // 2. Lấy thông tin người dùng từ MongoDB (để lấy Tên và Avatar)
        const user = await User.findOne({ email });

        // 3. Lưu session (thêm avatar vào session)
        req.session.user = {
            _id: user ? user._id : null,
            name: user ? user.name : 'Người dùng ẩn danh',
            email: email,
            avatar: user ? user.avatar : null // Thêm avatar vào session
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

// ==========================================
// THÊM MỚI: CẬP NHẬT AVATAR
// ==========================================
exports.updateAvatar = async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Không tìm thấy file ảnh' });
        }

        // Lấy thông tin user cũ
        const oldUser = await User.findById(userId);
        
        // Xóa avatar cũ nếu có
        if (oldUser && oldUser.avatar) {
            deleteOldAvatar(oldUser.avatar);
        }

        // Lưu avatar mới
        const avatarPath = '/uploads/' + req.file.filename;
        
        // Cập nhật database
        const updated = await User.findByIdAndUpdate(
            userId, 
            { avatar: avatarPath },
            { new: true }
        );

        // Cập nhật session
        req.session.user.avatar = avatarPath;

        // Trả về response cho AJAX
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ 
                ok: true, 
                avatar: avatarPath,
                message: 'Cập nhật avatar thành công!'
            });
        }

        req.flash('success_msg', 'Cập nhật avatar thành công!');
        res.redirect('/diaries/profile');
    } catch (error) {
        console.error('Lỗi updateAvatar:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ ok: false, error: 'Có lỗi xảy ra!' });
        }
        req.flash('error_msg', 'Có lỗi xảy ra!');
        res.redirect('/diaries/profile');
    }
};