const User = require("../models/userModel");
const mongoose = require("mongoose");
// login
const suggestions = async (req, res) => {
    const { _id } = req.user;

    
    try {
        const user = await User.findOne({ _id: _id }).select("following");
        const following = user.following;

        const followingListFlat = following
            .flatMap((element) => element)
            .flat(2);
        followingListFlat.push(_id);
        const users = await User.find({
            _id: {
                $nin: followingListFlat,
            },
        });

        

        const items = [];
        users.forEach((user) => {
            let x = {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
            };
            items.push(x);
        });

        res.json(items);
    } catch (error) {
        res.json({ error: error.message });
    }
};

module.exports = {
    suggestions,
};
