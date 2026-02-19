const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (user) return res.status(400).json("User already exists!");

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // Generate token
        const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

        const { password: pw, ...others } = savedUser._doc;

        res.status(200).json({ ...others, token });
    } catch (err) {
        res.status(500).json(err);
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json("User not found!");

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json("Wrong password!");

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, token });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
