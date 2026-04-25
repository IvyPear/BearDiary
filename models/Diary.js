const mongoose = require('mongoose');

const HighlightSchema = new mongoose.Schema({
    text: { 
        type: String, 
        required: true 
    },
    star: { 
        type: Number, 
        default: 3, 
        min: 1, 
        max: 5 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const diarySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        default: 'Nhật ký trong ngày' 
    },
    content: { 
        type: String, 
        required: true 
    },
    mood: { 
        type: String, 
        // Đã cập nhật enum để bao gồm cả các trạng thái tiếng Việt từ frontend gửi lên
        enum: [
    '😊 Happy', '🥳 Excited', '😌 Calm', '🙏 Grateful', '😢 Sad', '😨 Anxious', '😴 Tired', '😡 Angry',
    '😊 Vui vẻ', '🥳 Hào hứng', '😌 Bình yên', '🙏 Biết ơn', '😢 Buồn', '😢 Buồn bã', '😨 Lo lắng', '😴 Mệt mỏi', '😡 Tức giận', '😡 Giận dữ'
],
        default: '😊 Happy' 
    },
    images: [{ type: String }],           // ← Thay vì image (singular)
    highlights: [HighlightSchema],        // ← Mảng highlight quan trọng
    isStarred: { 
        type: Boolean, 
        default: false 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('Diary', diarySchema);