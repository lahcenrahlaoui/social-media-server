const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

requireAuth = async (req, res, next) => {
    // verify user

    console.log(req.headers)
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({ error: " Authorization denied " });
    }

    const token = authorization.split(" ")[1];
    try {
        const x = jwt.verify(token, process.env.JWT_KEY);
        console.log(x);

        // req.user = await User.findOne({ _id }).select("_id");
        next();
    } catch (e) {
        console.log(e);
    }
};
module.exports = { requireAuth };
