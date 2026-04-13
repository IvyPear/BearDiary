const mongoose = require('mongoose');

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
    enum: ['😊 Happy', '🥳 Excited', '😌 Calm', '🙏 Grateful', '😢 Sad', '😨 Anxious', '😴 Tired', '😡 Angry'],
    default: '😊 Happy' 
  },
  image: { 
    type: String 
  },
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