const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'med', 'low'],
        default: 'med'
    },
    status: {
        type: String,
        enum: ['todo', 'done'],
        default: 'todo'
    },
    deadline: {
        type: Date,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);