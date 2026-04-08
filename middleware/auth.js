// Kiểm tra người dùng đã đăng nhập chưa
const requireAuth = (req, res, next) => {
    // Kiểm tra session tồn tại và có userId
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Kiểm tra người dùng đã đăng nhập thì không vào login/register
const requireGuest = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    requireAuth,
    requireGuest
};