const fs = require("fs");
const mongoose = require("mongoose");
const sharp = require("sharp");
const User = require("../models/userModel");
const { uploadToCloudinary } = require("../cloudinaryConfig");
const jwt = require("jsonwebtoken");

// var payload = {
//     name: "Roger",
//     role: "Admin",
// };

const jwtKey = process.env.JWT_KEY;
const createToken = (_id) => {
    return jwt.sign({ _id }, jwtKey, { expiresIn: "2d" });
};

// login
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.json({
            email,
            token,
        });
    } catch (error) {
        res.json({ error: error.message });
    }
};

// sign up
const signupUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.signup(email, password);
        const token = createToken(user._id);

        res.json({
            email,
            token,
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    loginUser,
    signupUser,
};
