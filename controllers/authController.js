const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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
// XÓA AVATAR CŨ
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

// ==========================================
// RENDER GIAO DIỆN
// ==========================================
exports.getLogin = (req, res) => {
    res.render('users/login', { title: 'Đăng nhập - Bear Diary', layout: false });
};

exports.getRegister = (req, res) => {
    res.render('users/register', { title: 'Đăng ký - Bear Diary', layout: false });
};

exports.getForgotPassword = (req, res) => {
    res.render('users/forgot-password', { title: 'Quên mật khẩu - Moodiary', layout: false });
};

// ==========================================
// ĐĂNG KÝ
// ==========================================
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

        const avatarPath = getDefaultAvatar(name);

        const newUser = new User({ 
            name, 
            email, 
            password, 
            avatar: avatarPath 
        });
        await newUser.save(); 

        req.flash('success_msg', 'Đăng ký thành công! Hãy đăng nhập ngay 🐻');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Đăng ký:", error);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
        res.redirect('/auth/register');
    }
};

// ==========================================
// ĐĂNG NHẬP
// ==========================================
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            req.flash('error_msg', 'Email hoặc mật khẩu không chính xác!');
            return res.redirect('/auth/login');
        }

        if (user.isTwoFactorEnabled) {
            req.session.tempUser = { _id: user._id };
            return res.redirect('/auth/verify-2fa');
        }

        const userAgent = req.headers['user-agent'] || '';
        let device = userAgent.includes('Windows') ? 'Chrome / Windows' : 'Thiết bị lạ';

        user.lastLogin = {
            time: Date.now(),
            device: device,
            ip: req.ip
        };
        await user.save();

        req.session.user = user.toObject();
        res.redirect('/diaries/home');
    } catch (error) {
        console.error("Lỗi Đăng nhập:", error);
        req.flash('error_msg', 'Có lỗi xảy ra!');
        res.redirect('/auth/login');
    }
};

// ==========================================
// XÁC THỰC 2FA KHI ĐĂNG NHẬP
// ==========================================
exports.postVerify2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const tempUser = req.session.tempUser;

        if (!tempUser) return res.redirect('/auth/login');

        const user = await User.findById(tempUser._id);
        
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1 
        });

        if (verified) {
            user.lastLogin = {
                time: Date.now(),
                device: 'Chrome / Windows',
                ip: req.ip
            };
            await user.save();

            req.session.user = user.toObject();
            delete req.session.tempUser;
            res.redirect('/diaries/home');
        } else {
            req.flash('error_msg', 'Mã xác thực không chính xác!');
            res.redirect('/auth/verify-2fa');
        }
    } catch (error) {
        console.error("Lỗi Verify 2FA:", error);
        res.redirect('/auth/login');
    }
};

// ==========================================
// THIẾT LẬP 2FA
// ==========================================
exports.getSetup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const secret = speakeasy.generateSecret({
            name: `BearDiary (${user.email})`,
            issuer: 'BearDiary'
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        req.session.tempSecret = secret.base32;

        res.render('users/setup-2fa', { 
            title: 'Cài đặt 2FA - Bear Diary', 
            qrCodeUrl, 
            layout: false 
        });
    } catch (error) {
        console.error("Lỗi Setup 2FA:", error);
        res.redirect('/diaries/profile');
    }
};

exports.postEnable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const secret = req.session.tempSecret;
        const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });

        if (verified) {
            const user = await User.findByIdAndUpdate(req.session.user._id, {
                twoFactorSecret: secret,
                isTwoFactorEnabled: true
            }, { new: true });
            
            req.session.user = user.toObject();
            delete req.session.tempSecret;
            req.flash('success_msg', 'Đã bật xác thực 2 lớp thành công! 🔐');
            res.redirect('/diaries/profile');
        } else {
            req.flash('error_msg', 'Mã xác nhận không khớp, hãy thử lại.');
            res.redirect('/auth/setup-2fa');
        }
    } catch (error) {
        console.error("Lỗi Enable 2FA:", error);
        res.redirect('/diaries/profile');
    }
};

// ==========================================
// TẮT 2FA (ĐÃ SỬA - CÓ LOG)
// ==========================================
exports.postDisable2FA = async (req, res) => {
    try {
        console.log('🔐 Disable 2FA called for user:', req.session.user._id);
        const user = await User.findByIdAndUpdate(req.session.user._id, {
            isTwoFactorEnabled: false,
            twoFactorSecret: null 
        }, { new: true });
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({ ok: false, error: 'User not found' });
        }
        
        req.session.user = user.toObject();
        console.log('✅ 2FA disabled successfully');
        
        return res.json({ 
            ok: true, 
            message: 'Đã tắt bảo mật 2 lớp thành công',
            isTwoFactorEnabled: false,
            statusText: 'Chưa kích hoạt'
        });
    } catch (error) {
        console.error("❌ Lỗi Disable 2FA:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

// ==========================================
// QUÊN MẬT KHẨU
// ==========================================
exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error_msg', 'Không tìm thấy tài khoản với email này.');
            return res.redirect('/auth/forgot-password');
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        console.log(`Link reset pass: http://${req.headers.host}/auth/reset-password/${token}`);

        req.flash('success_msg', 'Yêu cầu đã được ghi nhận. Hãy kiểm tra Terminal để lấy link reset.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Forgot Password:", error);
        res.redirect('/auth/forgot-password');
    }
};

exports.getResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error_msg', 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
            return res.redirect('/auth/forgot-password');
        }

        res.render('users/reset-password', { title: 'Đặt lại mật khẩu', token: req.params.token, layout: false });
    } catch (error) {
        console.error("Lỗi Get Reset Password:", error);
        res.redirect('/auth/forgot-password');
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
            return res.redirect('/auth/forgot-password');
        }

        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error_msg', 'Mật khẩu xác nhận không khớp.');
            return res.redirect('back');
        }

        user.password = req.body.password; 
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.flash('success_msg', 'Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("Lỗi Post Reset Password:", error);
        res.redirect('/auth/forgot-password');
    }
};

// ==========================================
// ĐĂNG XUẤT
// ==========================================
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/auth/login');
    });
};

// ==========================================
// CẬP NHẬT AVATAR
// ==========================================
exports.updateAvatar = async (req, res) => {
    try {
        const userId = req.session.user._id;
        if (!req.file) return res.status(400).json({ ok: false, error: 'Không tìm thấy file ảnh' });

        const oldUser = await User.findById(userId);
        if (oldUser && oldUser.avatar) deleteOldAvatar(oldUser.avatar);

        const avatarPath = '/uploads/' + req.file.filename;
        await User.findByIdAndUpdate(userId, { avatar: avatarPath });

        req.session.user.avatar = avatarPath;
        return res.json({ ok: true, avatar: avatarPath, message: 'Cập nhật avatar thành công!' });
    } catch (error) {
        console.error('Lỗi updateAvatar:', error);
        return res.status(500).json({ ok: false, error: 'Lỗi server' });
    }
};
// ==========================================
// THAY ĐỔI MẬT KHẨU (KHI ĐANG ĐĂNG NHẬP)
// ==========================================
exports.postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        
        // 1. Tìm người dùng đang đăng nhập bằng ID từ session
        const user = await User.findById(req.session.user._id);

        // 2. Kiểm tra mật khẩu hiện tại (dùng hàm comparePassword trong Model User.js)
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error_msg', 'Mật khẩu hiện tại không chính xác!');
            return res.redirect('/diaries/profile');
        }

        // 3. Kiểm tra mật khẩu mới và xác nhận mật khẩu có khớp không
        if (newPassword !== confirmNewPassword) {
            req.flash('error_msg', 'Mật khẩu mới xác nhận không khớp!');
            return res.redirect('/diaries/profile');
        }

        // 4. Gán mật khẩu mới (Lưu ý: Middleware pre('save') trong User.js sẽ tự băm mật khẩu này)
        user.password = newPassword;
        await user.save();
        // Cập nhật lại session user.passwordChangedAt để hiển thị đúng trên profile
        req.session.user.passwordChangedAt = user.passwordChangedAt;
        req.flash('success_msg', 'Đã thay đổi mật khẩu thành công! 🐻');
        res.redirect('/diaries/profile');
    } catch (error) {
        console.error("Lỗi Change Password:", error);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại.');
        res.redirect('/diaries/profile');
    }
};