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
// RENDER GIAO DIỆN CƠ BẢN
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
// LOGIC ĐĂNG KÝ
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
// LOGIC ĐĂNG NHẬP (HỖ TRỢ CHỜ 2FA)
// ==========================================
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

        // Kiểm tra nếu User đã bật 2FA
        if (user.isTwoFactorEnabled) {
            req.session.tempUser = { _id: user._id };
            return res.redirect('/auth/verify-2fa');
        }

        // Xử lý thông tin thiết bị thân thiện với giao diện
        const userAgent = req.headers['user-agent'] || '';
        let device = 'Thiết bị lạ';
        if (userAgent.includes('Windows')) device = 'Chrome / Windows';
        else if (userAgent.includes('Macintosh')) device = 'Safari / MacOS';
        else if (userAgent.includes('iPhone') || userAgent.includes('Android')) device = 'Mobile App';

        user.lastLogin = {
            time: Date.now(),
            device: device,
            ip: req.ip
        };
        await user.save();

        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        };

        res.redirect('/diaries/home');
    } catch (error) {
        console.error("Lỗi Đăng nhập:", error);
        req.flash('error_msg', 'Có lỗi xảy ra!');
        res.redirect('/auth/login');
    }
};

// ==========================================
// XÁC THỰC MÃ 2FA KHI ĐĂNG NHẬP
// ==========================================
exports.postVerify2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const tempUser = req.session.tempUser;

        if (!tempUser) return res.redirect('/auth/login');

        const user = await User.findById(tempUser._id);
        
        // Rà soát: Thêm window: 1 để tránh lỗi lệch giây
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1 
        });

        if (verified) {
            const userAgent = req.headers['user-agent'] || '';
            let device = 'Thiết bị lạ';
            if (userAgent.includes('Windows')) device = 'Chrome / Windows';
            
            user.lastLogin = {
                time: Date.now(),
                device: device,
                ip: req.ip
            };
            await user.save();

            req.session.user = {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            };
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
// THIẾT LẬP 2FA (QUÉT MÃ QR)
// ==========================================
exports.getSetup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        
        const secret = speakeasy.generateSecret({
            name: `BearDiary (${user.email})`
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

        // Rà soát: Thêm window: 1 để quét mã lần đầu dễ hơn
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (verified) {
            await User.findByIdAndUpdate(req.session.user._id, {
                twoFactorSecret: secret,
                isTwoFactorEnabled: true
            });
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
// QUÊN VÀ ĐẶT LẠI MẬT KHẨU NỘI BỘ
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