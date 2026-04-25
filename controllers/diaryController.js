const Diary = require('../models/Diary');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ====================== MULTER CONFIG ======================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/diary/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ====================== CONTROLLERS ======================

exports.getHome = async (req, res) => {
    try {
        const userId = req.session.user._id;
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
        // 1. Kiểm tra an toàn: Đảm bảo session và thông tin user tồn tại
        if (!req.session || !req.session.user || !req.session.user._id) {
            console.log('⚠️ Bắt được lỗi: Chưa có session user. Chuyển hướng về Login.');
            return res.redirect('/auth/login');
        }

        const { content, mood } = req.body;
        const newDiary = new Diary({
            userId: req.session.user._id,
            content: content,
            mood: mood || '😊 Happy'
        });
        
        await newDiary.save();
        res.redirect('/diaries/home');
    } catch (error) {
        console.error('Lỗi khi tạo nhật ký:', error);
        res.redirect('/diaries/home');
    }
};

exports.getTimeline = async (req, res) => {
    try {
        const userId = req.session.user._id;

        let query = { userId };
        const currentMonth = req.query.month || '';
        const currentYear = req.query.year || new Date().getFullYear().toString();

        if (currentMonth && currentYear) {
            const startDate = new Date(parseInt(currentYear), parseInt(currentMonth) - 1, 1);
            const endDate = new Date(parseInt(currentYear), parseInt(currentMonth), 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const rawEntries = await Diary.find(query).sort({ date: -1 });

        const parseMood = (moodString) => {
            const str = moodString || '😊 Happy';
            const parts = str.split(' ');
            const icon = parts[0] || '😐';
            const name = parts.slice(1).join(' ') || 'Normal';

            let color = 'blue';
            const nLower = name.toLowerCase();
            if (nLower.includes('happy') || nLower.includes('vui')) color = 'yellow';
            else if (nLower.includes('calm') || nLower.includes('bình')) color = 'emerald';
            else if (nLower.includes('sad') || nLower.includes('buồn')) color = 'rose';
            else if (nLower.includes('excited') || nLower.includes('hào')) color = 'purple';
            else if (nLower.includes('grateful') || nLower.includes('biết')) color = 'blue';

            return { icon, name, color };
        };

        let moodCounts = { all: rawEntries.length };
        let uniqueMoods = {};

        const entries = rawEntries.map((e, index) => {
            const { icon, name, color } = parseMood(e.mood);
            const moodKey = name.toLowerCase();

            moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
            if (!uniqueMoods[moodKey]) uniqueMoods[moodKey] = { icon, name };

            const dateObj = new Date(e.date);
            const dateStr = dateObj.toLocaleDateString('en-US', {
                weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
            });

            return {
                _id: e._id,
                date: dateStr,
                mood: name,
                moodIcon: icon,
                moodColor: color,
                content: e.content,
                images: e.images || [],
                isStarred: e.isStarred || false,
                side: index % 2 === 0 ? 'left' : 'right'
            };
        });

        res.render('diaries/timeline', {
            title: 'Dòng thời gian - Moodiary',
            entries,
            moodCounts,
            uniqueMoods,
            currentMonth,
            currentYear
        });
    } catch (error) {
        console.error(error);
        res.send('Lỗi tải Timeline');
    }
};

exports.getEditEntry = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entryId = req.params.id;
        const entry = await Diary.findOne({ _id: entryId, userId });

        if (!entry) return res.redirect('/diaries/timeline');

        res.render('diaries/edit', {
            title: 'Chỉnh sửa nhật ký - Bear Diary',
            entry
        });
    } catch (error) {
        console.error(error);
        res.redirect('/diaries/timeline');
    }
};

exports.updateEntry = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entryId = req.params.id;
        const { content, mood } = req.body;

        await Diary.findOneAndUpdate(
            { _id: entryId, userId },
            { content: content.trim(), mood: mood || '😊 Happy' },
            { new: true }
        );

        res.redirect('/diaries/timeline');
    } catch (error) {
        console.error(error);
        res.redirect('/diaries/timeline');
    }
};

exports.deleteEntry = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entryId = req.params.id;

        await Diary.findOneAndDelete({ _id: entryId, userId });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ ok: true });
        }
        res.redirect('/diaries/timeline');
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ ok: false });
        }
        res.redirect('/diaries/timeline');
    }
};

exports.getReport = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const today = new Date();
        let year = parseInt(req.query.year) || today.getFullYear();
        let month = parseInt(req.query.month) || (today.getMonth() + 1);

        if (month < 1) { month = 12; year--; }
        if (month > 12) { month = 1; year++; }

        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const entries = await Diary.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        });

        const firstDayIndex = startDate.getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

        let calendarDays = [];

        for (let i = firstDayIndex; i > 0; i--) {
            calendarDays.push({ day: daysInPrevMonth - i + 1, isOtherMonth: true, hasJournal: false });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month - 1, i);
            const isToday = currentDate.toDateString() === today.toDateString();
            const dayEntries = entries.filter(e => new Date(e.date).getDate() === i);
            const hasJournal = dayEntries.length > 0;
            const isStarred = dayEntries.some(e => e.isStarred);
            const images = dayEntries.find(e => e.images && e.images.length > 0)?.images || [];
            if (hasJournal) console.log('Ngày có nhật ký:', i, 'entries:', dayEntries.length);
            calendarDays.push({ day: i, isOtherMonth: false, isToday, hasJournal, isStarred, images });  
        }

        const totalGridCells = calendarDays.length > 35 ? 42 : 35;
        const remainingCells = totalGridCells - calendarDays.length;
        for (let i = 1; i <= remainingCells; i++) {
            calendarDays.push({ day: i, isOtherMonth: true, hasJournal: false });
        }

        let moodCounts = {};
        entries.forEach(e => {
            const moodStr = e.mood || '😊 Vui vẻ';
            moodCounts[moodStr] = (moodCounts[moodStr] || 0) + 1;
        });

        const chartLabels = Object.keys(moodCounts);
        const chartData = Object.values(moodCounts);
        const totalEntries = await Diary.countDocuments({ userId });
        const totalStarred = await Diary.countDocuments({ userId, isStarred: true });

        let topMood = 'Chưa có dữ liệu';
        let maxCount = 0;
        for (const [mood, count] of Object.entries(moodCounts)) {
            if (count > maxCount) { maxCount = count; topMood = mood; }
        }

        res.render('diaries/report', {
            title: 'Báo cáo - Moodiary',
            currentMonth: month,
            currentYear: year,
            prevMonth, prevYear,
            nextMonth, nextYear,
            calendarDays,
            chartLabels: JSON.stringify(chartLabels),
            chartData: JSON.stringify(chartData),
            totalEntries,
            totalStarred,
            topMood,
            entriesCount: entries.length
        });
    } catch (error) {
        console.error(error);
        res.send('Lỗi tải Báo cáo');
    }
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).lean();
        if (!user) return res.redirect('/auth/login');

        const entries = await Diary.find({ userId }).sort({ date: -1 }).lean();
        const totalEntries = entries.length;
        const starredEntries = entries.filter(e => e.isStarred).length;

        const uniqueDays = new Set(entries.map(e => new Date(e.date).toDateString()));
        const daysJournaled = uniqueDays.size;

        let dayStreak = 0;
        if (entries.length > 0) {
            let streakDate = new Date();
            const daySet = new Set(entries.map(e => new Date(e.date).toISOString().slice(0, 10)));
            while (true) {
                const key = streakDate.toISOString().slice(0, 10);
                if (daySet.has(key)) {
                    dayStreak++;
                    streakDate.setDate(streakDate.getDate() - 1);
                } else break;
            }
        }

        const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
        const avatar = user.avatar || (user.name ? user.name.charAt(0).toUpperCase() : 'U');

            res.render('diaries/profile', {
                title: 'Hồ sơ - Moodiary',
                user: {
                    name: user.name,
                    email: user.email,
                    avatar,
                    memberSince,
                    dayStreak,
                    totalEntries,
                    daysJournaled,
                    starredEntries,
                    isTwoFactorEnabled: user.isTwoFactorEnabled,
                    passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleString('vi-VN', { hour12: false }) : null
                }
            });
    } catch (error) {
        console.error(error);
        res.redirect('/diaries/home');
    }
};

exports.getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).lean();
        if (!user) return res.redirect('/auth/login');

        res.render('diaries/editProfile', {
            title: 'Chỉnh sửa hồ sơ - Bear Diary',
            user
        });
    } catch (err) {
        console.error(err);
        res.redirect('/diaries/profile');
    }
};

// POST update profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { name, email } = req.body;

        let avatarPath;

        if (req.file) {
            const oldUser = await User.findById(userId);
            if (oldUser && oldUser.avatar && !oldUser.avatar.includes('default-avatars')) {
                const oldAvatarPath = path.join(__dirname, '../public', oldUser.avatar);
                try {
                    if (fs.existsSync(oldAvatarPath)) fs.unlinkSync(oldAvatarPath);
                } catch (err) {
                    console.error('Lỗi xóa avatar cũ:', err);
                }
            }
            avatarPath = '/uploads/' + req.file.filename;
        } else if (req.body.avatar) {
            avatarPath = req.body.avatar.trim();
        }

        if (!name || !email) return res.redirect('/diaries/profile');

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing && String(existing._id) !== String(userId)) {
            req.flash('error_msg', 'Email đã được sử dụng!');
            return res.redirect('/diaries/profile/edit');
        }

        const updateData = { name: name.trim(), email: email.trim().toLowerCase() };
        if (avatarPath !== undefined) updateData.avatar = avatarPath;

        const updated = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).lean();

        req.session.user.name = updated.name;
        req.session.user.email = updated.email;
        req.session.user.avatar = updated.avatar;

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ ok: true, redirect: '/diaries/profile', avatar: updated.avatar });
        }

        req.flash('success_msg', 'Cập nhật thành công!');
        res.redirect('/diaries/profile');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ ok: false, error: 'Có lỗi xảy ra' });
        }
        req.flash('error_msg', 'Có lỗi xảy ra!');
        res.redirect('/diaries/profile');
    }
// ↑ THIS WAS THE MISSING }; — now correctly closed above
};

// ====================== THÊM MỚI CHO TASK ======================

exports.getCreateDiary = (req, res) => {
    res.render('diaries/create', {
        title: 'Viết Nhật Ký - Bear Diary'
    });
};

exports.createDiary = [
    upload.array('images', 10),
    async (req, res) => {
        try {
            // Kiểm tra an toàn session
            if (!req.session || !req.session.user || !req.session.user._id) {
                console.log('⚠️ Bắt được lỗi: Chưa có session user. Chuyển hướng về Login.');
                return res.redirect('/auth/login');
            }

            const { title, content, mood, highlights } = req.body;
            const userId = req.session.user._id;

            let highlightArray = [];
            if (highlights) {
                if (Array.isArray(highlights)) {
                    highlightArray = highlights
                        .filter(text => text && text.trim() !== '')
                        .map(text => ({ text: text.trim(), star: 3 }));
                } else if (typeof highlights === 'string' && highlights.trim() !== '') {
                    highlightArray = [{ text: highlights.trim(), star: 3 }];
                }
            }

            const newDiary = new Diary({
                userId,
                title: title || 'Nhật ký trong ngày',
                content: content.trim(),
                mood: mood || '😊 Happy',
                images: req.files ? req.files.map(file => `/uploads/diary/${file.filename}`) : [],
                highlights: highlightArray,
                isStarred: highlightArray.length > 0
            });

            await newDiary.save();
            res.redirect('/diaries/timeline');
        } catch (error) {
            console.error('Lỗi tạo nhật ký (kèm ảnh):', error);
            res.redirect('/diaries/home');
        }
    }
];

exports.getTimelineWithHighlight = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const rawEntries = await Diary.find({ userId }).sort({ date: -1 });

        const entries = rawEntries.map((e, index) => {
            const dateObj = new Date(e.date);
            const dateStr = dateObj.toLocaleDateString('vi-VN', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });

            return {
                _id: e._id,
                date: dateStr,
                mood: e.mood || '😊 Happy',
                content: e.content,
                images: e.images || (e.image ? [e.image] : []),
                highlights: e.highlights || [],
                isStarred: e.isStarred || (e.highlights && e.highlights.length > 0),
                side: index % 2 === 0 ? 'left' : 'right'
            };
        });

        res.render('diaries/timeline', {
            title: 'Dòng thời gian - Bear Diary',
            entries,
            showHighlights: true,
            currentMonth: '',
            currentYear: new Date().getFullYear().toString()
        });
    } catch (error) {
        console.error('Lỗi tải Timeline với highlight:', error);
        res.send('Lỗi tải Timeline');
    }
};
exports.createDiary = async (req, res) => {
    try {
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.redirect('/auth/login');
        }

        const { title, content, mood, highlights } = req.body;
        const userId = req.session.user._id;

        // Xử lý highlights
        let highlightArray = [];
        if (highlights) {
            if (Array.isArray(highlights)) {
                highlightArray = highlights
                    .filter(text => text && text.trim() !== '')
                    .map(text => ({ text: text.trim(), star: 3 }));
            } else if (typeof highlights === 'string' && highlights.trim() !== '') {
                highlightArray = [{ text: highlights.trim(), star: 3 }];
            }
        }

        // Xử lý ảnh
        const images = req.files ? req.files.map(file => `/uploads/diary/${file.filename}`) : [];

        const newDiary = new Diary({
            userId,
            title: title || 'Nhật ký trong ngày',
            content: content.trim(),
            mood: mood || '😊 Happy',
            images: images,
            highlights: highlightArray,
            isStarred: req.body.isStarred === 'true'
        });

        await newDiary.save();
        res.redirect('/diaries/home');
    } catch (error) {
        console.error('Lỗi tạo nhật ký:', error);
        res.redirect('/diaries/home');
    }
};
exports.toggleStar = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entryId = req.params.id;
        const entry = await Diary.findOne({ _id: entryId, userId });
        if (!entry) return res.status(404).json({ ok: false });
        entry.isStarred = !entry.isStarred;
        await entry.save();
        return res.json({ ok: true, isStarred: entry.isStarred });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false });
    }
};