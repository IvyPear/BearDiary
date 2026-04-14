const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  password: { type: String, required: true }
}, { timestamps: true });

// Mã hóa mật khẩu trước khi lưu 
userSchema.pre('save', async function() {
  // Nếu không thay đổi mật khẩu thì bỏ qua
  if (!this.isModified('password')) return; 
  
  // Tạo chuỗi bảo mật và băm mật khẩu
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Hàm kiểm tra mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema); 