const Diary = require('../models/Diary');
const User = require('../models/User');

exports.getHome = async (req, res) => {
    try {
        const userId = req.session.user._id;
        // Lấy 3 bài viết gần nhất
        const recentEntries = await Diary.find({ userId }).sort({ date: -1 }).limit(3);
        const totalEntries = await Diary.countDocuments({ userId });
        const totalStarred = await Diary.countDocuments({ userId, isStarred: true });

        res.render('diaries/home', {
            title: 'Trang chủ - Moodiary',
            recentEntries,
            totalEntries,
            totalStarred
        });
    } catch (error) {
        console.error(error);
        res.send('Lỗi tải trang chủ');
    }
};

exports.createEntry = async (req, res) => {
    try {
        const { content, mood } = req.body;
        const newDiary = new Diary({
            userId: req.session.user._id,
            content: content,
            // Nếu bạn có gắn thẻ input mood từ Frontend thì lấy, không thì mặc định
            mood: mood || '😊 Happy' 
        });

        await newDiary.save();
        res.redirect('/diaries/home');
    } catch (error) {
        console.error(error);
        res.redirect('/diaries/home');
    }
};

exports.getTimeline = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entries = await Diary.find({ userId }).sort({ date: -1 });
        
        res.render('diaries/timeline', {
            title: 'Dòng thời gian - Moodiary',
            entries
        });
    } catch (error) {
        console.error(error);
        res.send('Lỗi tải Timeline');
    }
};

exports.getReport = async (req, res) => {
    res.render('diaries/report', { title: 'Báo cáo - Moodiary' });
};

exports.getProfile = async (req, res) => {
    res.render('diaries/profile', { title: 'Hồ sơ - Moodiary' });
};