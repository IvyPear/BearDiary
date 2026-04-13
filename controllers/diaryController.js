const Diary = require('../models/Diary');
const User = require('../models/User');

// GET /diaries/home
exports.getHome = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const diaries = await Diary.find({ userId }).sort({ createdAt: -1 });

        const recentEntries = diaries.slice(0, 3);
        const totalEntries = diaries.length;
        const totalStarred = diaries.filter(d => d.isStarred).length;

        res.render('diaries/home', {
            title: 'Trang chủ - Moodiary',
            recentEntries,
            totalEntries,
            totalStarred,
            diaries: diaries   // ← Truyền dữ liệu để hiển thị timeline
        });
    } catch (error) {
        console.error('Lỗi getHome:', error);
        res.send('Lỗi tải trang chủ');
    }
};

// POST /diaries/create - Lưu nhật ký + upload ảnh
exports.createEntry = async (req, res) => {
    try {
        const { title, content, mood } = req.body;

        const newDiary = new Diary({
            userId: req.session.user._id,
            title: title || 'Nhật ký trong ngày',
            content: content,
            mood: mood || '😊 Happy',
            image: req.file ? `/uploads/diary/${req.file.filename}` : null,
            date: new Date()
        });

        await newDiary.save();

        console.log('✅ Lưu nhật ký thành công!');
        res.redirect('/diaries/home');
    } catch (error) {
        console.error('❌ Lỗi lưu nhật ký:', error);
        res.redirect('/diaries/home');
    }
};

exports.getTimeline = async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Lấy tháng và năm từ query URL, mặc định là trống (tất cả)
        let query = { userId };
        const currentMonth = req.query.month || '';
        const currentYear = req.query.year || new Date().getFullYear().toString();

        if (currentMonth && currentYear) {
            const startDate = new Date(parseInt(currentYear), parseInt(currentMonth) - 1, 1);
            const endDate = new Date(parseInt(currentYear), parseInt(currentMonth), 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        // Lấy dữ liệu thật từ MongoDB
        const rawEntries = await Diary.find(query).sort({ date: -1 });

        // Tạo hàm phụ để chuyển đổi mood thành Color và Icon giống mảng tĩnh của bạn
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

        // Biến đổi dữ liệu DB cho khớp với cấu trúc EJS cũ của bạn
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
                date: dateStr, // Định dạng lại ngày giống code gốc của bạn
                mood: name,
                moodIcon: icon,
                moodColor: color,
                content: e.content,
                image: e.image || null,
                isStarred: e.isStarred || false,
                side: index % 2 === 0 ? 'left' : 'right' // Tạo xen kẽ trái phải
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

// --- HÀM REPORT MỚI XỬ LÝ LỊCH ĐỘNG ---
exports.getReport = async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        // Lấy tháng và năm từ query URL, mặc định là tháng hiện tại
        const today = new Date();
        let year = parseInt(req.query.year) || today.getFullYear();
        let month = parseInt(req.query.month) || (today.getMonth() + 1);

        // Xử lý logic chuyển đổi năm khi qua tháng 12 hoặc lùi qua tháng 1
        if (month < 1) { month = 12; year--; }
        if (month > 12) { month = 1; year++; }

        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;

        // Lấy ngày đầu và ngày cuối của tháng được chọn
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Truy vấn MongoDB các bài viết nằm trong khoảng tháng này
        const entries = await Diary.find({ 
            userId, 
            date: { $gte: startDate, $lte: endDate } 
        });

        // 1. TÍNH TOÁN LƯỚI LỊCH (CALENDAR GRID)
        const firstDayIndex = startDate.getDay(); // 0 (CN) -> 6 (T7)
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
        
        let calendarDays = [];
        
        // Thêm các ngày của tháng trước (in mờ)
        for (let i = firstDayIndex; i > 0; i--) {
            calendarDays.push({ day: daysInPrevMonth - i + 1, isOtherMonth: true, hasJournal: false });
        }
        
        // Thêm các ngày của tháng hiện tại
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month - 1, i);
            const isToday = currentDate.toDateString() === today.toDateString();
            
            // Lọc ra các bài viết thuộc ngày 'i'
            const dayEntries = entries.filter(e => {
                const eDate = e.date;
                return new Date(eDate).getDate() === i;
            });

            const hasJournal = dayEntries.length > 0;
            const isStarred = dayEntries.some(e => e.isStarred);
            const image = dayEntries.find(e => e.image)?.image || null;

            calendarDays.push({ day: i, isOtherMonth: false, isToday, hasJournal, isStarred, image });
        }
        
        // Thêm các ngày của tháng sau cho đủ khung (35 hoặc 42 ô)
        const totalGridCells = calendarDays.length > 35 ? 42 : 35;
        const remainingCells = totalGridCells - calendarDays.length;
        for (let i = 1; i <= remainingCells; i++) {
            calendarDays.push({ day: i, isOtherMonth: true, hasJournal: false });
        }

        // 2. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ TRÒN
        let moodCounts = {};
        entries.forEach(e => {
            const moodStr = e.mood || '😊 Vui vẻ';
            moodCounts[moodStr] = (moodCounts[moodStr] || 0) + 1;
        });

        const chartLabels = Object.keys(moodCounts);
        const chartData = Object.values(moodCounts);
        const totalEntries = await Diary.countDocuments({ userId }); // Tổng bài của user từ trước đến nay
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
            chartLabels: JSON.stringify(chartLabels), // Ép kiểu chuỗi để truyền xuống Frontend an toàn
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
    res.render('diaries/profile', { title: 'Hồ sơ - Moodiary' });
};