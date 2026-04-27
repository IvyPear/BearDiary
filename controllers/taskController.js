const Task = require('../models/Task');

exports.getTasks = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const tasks = await Task.find({ userId }).sort({ deadline: 1 });
        res.render('diaries/tasks', {
            title: 'Công việc - Bear Diary',
            tasks: JSON.stringify(tasks)
        });
    } catch (error) {
        console.error(error);
        res.redirect('/diaries/home');
    }
};

exports.createTask = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { name, priority, deadline } = req.body;
        const task = new Task({ userId, name, priority, deadline });
        await task.save();
        res.json({ ok: true, task });
    } catch (error) {
        console.error(error);
        res.json({ ok: false });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { name, priority, deadline, status } = req.body;
        await Task.findOneAndUpdate(
            { _id: req.params.id, userId },
            { name, priority, deadline, status },
            { new: true }
        );
        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.json({ ok: false });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const userId = req.session.user._id;
        await Task.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.json({ ok: false });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const task = await Task.findOne({ _id: req.params.id, userId });
        if (!task) return res.json({ ok: false });
        task.status = task.status === 'done' ? 'todo' : 'done';
        await task.save();
        res.json({ ok: true, status: task.status });
    } catch (error) {
        console.error(error);
        res.json({ ok: false });
    }
};