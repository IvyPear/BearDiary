const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true // Cái này bắt buộc vì lấy từ phiên đăng nhập (Session)
  },
  title: { 
    type: String, 
    default: 'Nhật ký trong ngày' // Tự động lấy tên này vì form không có ô nhập tiêu đề
  },
  content: { 
    type: String, 
    required: true // Đây là phần <textarea name="content"> từ UI gửi lên
  },
  mood: { 
    type: String, 
    enum: ['😊 Happy', '🥳 Excited', '😌 Calm', '🙏 Grateful', '😢 Sad', '😨 Anxious', '😴 Tired', '😡 Angry'],
    default: '😊 Happy' // Đặt mặc định là Vui vẻ, sau này có JS xử lý nút bấm thì tính tiếp
  },
  image: { 
    type: String 
  },
  isStarred: { 
    type: Boolean, 
    default: false // Thêm vào để sau này trang Timeline hiển thị nút sao
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('Diary', diarySchema);