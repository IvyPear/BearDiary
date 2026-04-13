module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.session && req.session.user) {
            return next();
        }
        // If request expects JSON (AJAX/fetch), return 401 JSON instead of redirecting to login HTML
        const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        if (wantsJson) {
            return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }
        req.flash('error_msg', 'Vui lòng đăng nhập để xem nhật ký của bạn 🐻');
        res.redirect('/auth/login');
    },
    // Nếu đã đăng nhập rồi thì không cho vào trang Login/Register nữa
    forwardAuthenticated: function(req, res, next) {
        if (!req.session.user) {
            return next();
        }
        res.redirect('/diaries/home');      
    }
};