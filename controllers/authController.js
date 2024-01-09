const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const { uploadToCloudinary } = require("../utils/config");

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
            image: user.image,
            name: user.name,
            following: user.following,
            token,
        });
    } catch (error) {
        res.json({ error: error.message });
    }
};

// sign up
const signupUser = async (req, res) => {
    const { email, password, name } = req.body;

    const path_normal = req.file.path;

    const image = await uploadToCloudinary(path_normal);

    try {
        const user = await User.signup(email, password, name, image);
        const token = createToken(user._id);

        res.json({
            email,
            image: user.image,
            name: user.name,
            following: user.following,
            token,
        });
    } catch (error) {
        res.json({ error: error.message });
    }
};

module.exports = {
    loginUser,
    signupUser,
};
