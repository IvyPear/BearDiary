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
        if (!req.session || !req.session.user || !req.session.user._id) {
            console.log('⚠️ Bắt được lỗi: Chưa có session user. Chuyển hướng về Login.');
            return res.redirect('/auth/login');
        }

        const { content, mood, isStarred } = req.body;
        const newDiary = new Diary({
            userId: req.session.user._id,
            content: content,
            mood: mood || '😊 Happy',
            isStarred: isStarred === 'true'
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

        // Lấy tham số và ép kiểu số để lọc logic
        const currentMonth = req.query.month ? parseInt(req.query.month) : null;
        const currentYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        // Bước 1: Lấy tất cả nhật ký 
        let rawEntries = await Diary.find({ userId }).sort({ date: -1 });

        // Bước 2: Lọc bằng Javascript
        if (currentYear) {
            rawEntries = rawEntries.filter(entry => {
                if (!entry.date) return false;
                const entryDate = new Date(entry.date);
                const entryYear = entryDate.getFullYear();
                const entryMonth = entryDate.getMonth() + 1; // getMonth() trả về 0-11

                if (currentMonth) {
                    return entryYear === currentYear && entryMonth === currentMonth;
                } else {
                    return entryYear === currentYear;
                }
            });
        }

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

        // Mảng tiếng Việt dịch thủ công
        const daysVN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

        const entries = rawEntries.map((e, index) => {
            const { icon, name, color } = parseMood(e.mood);
            const moodKey = name.toLowerCase();

            moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
            if (!uniqueMoods[moodKey]) uniqueMoods[moodKey] = { icon, name };

            const dateObj = new Date(e.date);
            const dateStr = `${daysVN[dateObj.getDay()]}, ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;

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
            currentMonth: currentMonth ? currentMonth.toString() : '',
            currentYear: currentYear.toString()
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

// ==========================================
// ĐÃ SỬA: Hàm updateEntry tối ưu nhất để nhận Date, Images và Highlights
exports.updateEntry = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const entryId = req.params.id;

        // Lấy tất cả dữ liệu từ form
        const { content, mood, date, isStarred, highlights } = req.body;

        let updateData = { 
            content: content ? content.trim() : '', 
            mood: mood || '😊 Vui vẻ',
            isStarred: isStarred === 'true'
        };

        // 1. Cập nhật ngày nếu user thay đổi
        if (date) {
            const newDate = new Date(date);
            const now = new Date(); // Giữ lại giờ phút hiện tại
            newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
            updateData.date = newDate;
        }

        // 2. Cập nhật Highlight
        if (highlights) {
            // Biến chuỗi thành mảng các object highlight
            let hArray = typeof highlights === 'string' ? highlights.split(',') : highlights;
            updateData.highlights = hArray
                .filter(text => text && text.trim() !== '')
                .map(text => ({ text: text.trim(), star: 3 }));
            
            // Nếu có đánh highlight thì tự động cho thành nổi bật
            if (updateData.highlights.length > 0) {
                updateData.isStarred = true;
            }
        } else {
            updateData.highlights = [];
        }

        // 3. Nếu user upload ảnh mới thì ghi đè ảnh cũ
        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => `/uploads/diary/${file.filename}`);
            // Đặt lại thuộc tính image cũ (nếu có dùng ở phiên bản schema trước) để tránh lỗi
            updateData.image = undefined; 
        }

        await Diary.findOneAndUpdate(
            { _id: entryId, userId },
            updateData,
            { new: true }
        );

        res.redirect('/diaries/timeline');
    } catch (error) {
        console.error('Lỗi khi cập nhật nhật ký:', error);
        res.redirect('/diaries/timeline');
    }
};
// ==========================================

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

        let lastLoginDevice = '';
        let lastLoginTime = '';
        if (user.lastLogin && user.lastLogin.device) {
            lastLoginDevice = user.lastLogin.device;
            if (user.lastLogin.time) {
                const d = new Date(user.lastLogin.time);
                lastLoginTime = d.toLocaleString('vi-VN', { hour12: false });
            }
        }

        res.render('diaries/profile', {
            title: 'Hồ sơ - Moodiary',
            user: {
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                memberSince,
                dayStreak,
                totalEntries,
                daysJournaled,
                starredEntries,
                isTwoFactorEnabled: user.isTwoFactorEnabled,
                passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleString('vi-VN', { hour12: false }) : null,
                lastLoginDevice,
                lastLoginTime
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
            avatarPath = '/uploads/diary/' + req.file.filename;
        } else if (req.body.avatar) {
            avatarPath = req.body.avatar.trim();
        }

        if (!name || !email) return res.redirect('/diaries/profile');

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing && String(existing._id) !== String(userId)) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ ok: false, error: 'Email đã được sử dụng!' });
            }
            req.flash('error_msg', 'Email đã được sử dụng!');
            return res.redirect('/diaries/profile/edit');
        }

        const updateData = { name: name.trim(), email: email.trim().toLowerCase() };
        if (avatarPath !== undefined) updateData.avatar = avatarPath;

        const updated = await User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after', runValidators: true }).lean();

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
};

exports.getCreateDiary = (req, res) => {
    res.render('diaries/create', {
        title: 'Viết Nhật Ký - Bear Diary'
    });
};

exports.createDiary = async (req, res) => {
    try {
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.redirect('/auth/login');
        }

        const { title, content, mood, highlights, date } = req.body;
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

        const images = req.files ? req.files.map(file => `/uploads/diary/${file.filename}`) : [];

        let entryDate = new Date();
        if (date) {
            entryDate = new Date(date);
            const now = new Date();
            entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        }

        const newDiary = new Diary({
            userId,
            title: title || 'Nhật ký trong ngày',
            content: content.trim(),
            mood: mood || '😊 Happy',
            images: images,
            highlights: highlightArray,
            isStarred: req.body.isStarred === 'true' || highlightArray.length > 0,
            date: entryDate
        });

        await newDiary.save();
        res.redirect('/diaries/timeline');
    } catch (error) {
        console.error('Lỗi tạo nhật ký:', error);
        res.redirect('/diaries/home');
    }
};

exports.getTimelineWithHighlight = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const rawEntries = await Diary.find({ userId }).sort({ date: -1 });
        const daysVN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

        const entries = rawEntries.map((e, index) => {
            const dateObj = new Date(e.date);
            const dateStr = `${daysVN[dateObj.getDay()]}, ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;

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