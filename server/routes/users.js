const router = require("express").Router();
const User = require("../models/User");

// Get all users or search
router.get("/", async (req, res) => {
    const q = req.query.username;
    try {
        const users = q
            ? await User.find({ username: { $regex: q, $options: "i" } }).select("-password")
            : await User.find({}).select("-password");
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get user by ID
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update user profile
router.put("/:id", async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).select("-password");
        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
