const User = require("../models/userModel");

// login
const suggestions = async (req, res) => {
    try {
        const users = await User.find({});

        res.json(users);
    } catch (error) {
        res.json({ error: error.message });
    }
};

module.exports = {
    suggestions,
};
