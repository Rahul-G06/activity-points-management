import express from 'express';
import { isAuthenticated } from '../middleware/isAuthenticated.js';
import { isAdmin } from '../middleware/isAdmin.js'; 
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { syncUserPoints } from '../services/pointsService.js';

const router = express.Router();

router.get("/students", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { branch, year, search } = req.query;
        
        let query = { role: 'student' }; 

        if (branch && branch !== "") {
            query.branch = branch;
        }

        if (year && year !== "") {
            query.currentYear = Number(year);
        }

        if (search && search.trim() !== "") {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { usn: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await User.find(query)
            .select('username email usn branch currentYear confirmedPoints pendingPoints counselorEmail')
            .sort({ username: 1 });

        res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.get("/students/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
            .select('-googleId -avatar')
            .populate('activities');

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.status(200).json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.get("/student-activities/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.params.id });
        res.status(200).json(activities);
    } catch (error) {
        console.error("Error fetching student activities:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.put("/update-activity-status", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { activityId, status, studentId } = req.body;

        const activity = await Activity.findByIdAndUpdate(
            activityId, 
            { status }, 
            { new: true }
        );

        if (!activity) {
            return res.status(404).json({ success: false, message: "Activity not found" });
        }
        await syncUserPoints(studentId);

        const updatedStudent = await User.findById(studentId).select('confirmedPoints pendingPoints');

        res.status(200).json({ 
            success: true, 
            message: `Status updated to ${status}`,
            confirmedPoints: updatedStudent.confirmedPoints,
            pendingPoints: updatedStudent.pendingPoints
        });

    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

router.get("/all-submissions", isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { eventName, date } = req.query;
        
        let query = { status: 'pending' };

        if (eventName) {
            query.eventName = { $regex: eventName, $options: 'i' };
        }

        if (date) {
            query.date = new Date(date);
        }

        const submissions = await Activity.find(query)
            .populate('user', 'username usn branch')
            .sort({ date: 1 });

        res.status(200).json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

export default router;