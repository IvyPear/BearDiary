const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  password: { type: String, required: true },
  
  // --- PHẦN BẢO MẬT NÂNG CAO ---
  
  // 1. Xác thực 2 lớp (2FA)
  twoFactorSecret: { type: String }, 
  isTwoFactorEnabled: { type: Boolean, default: false },
  
  // 2. Quên mật khẩu (Hệ thống nội bộ)
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // 3. Tracking & Lịch sử
  passwordChangedAt: { type: Date }, 
  lastLogin: {
    time: { type: Date },
    device: { type: String },   
    ip: { type: String }
  }
}, { timestamps: true });

// Middleware: Mã hóa mật khẩu trước khi lưu (SỬA LỖI NEXT TẠI ĐÂY)
userSchema.pre('save', async function() {
  // Nếu mật khẩu thay đổi, cập nhật mốc thời gian passwordChangedAt
  if (this.isModified('password')) {
    this.passwordChangedAt = Date.now();
    
    // Tạo chuỗi bảo mật (salt) và băm mật khẩu
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  // Trong phiên bản Mongoose mới, async function không cần gọi next()
});

// Hàm kiểm tra mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function(password) {
  // So sánh mật khẩu người dùng nhập vào với mật khẩu đã băm trong database
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);