module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.session && req.session.user) {
            return next();
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