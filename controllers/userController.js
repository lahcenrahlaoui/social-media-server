const Post = require("../models/postModel");
const User = require("../models/userModel");

const setFollowingList = async (req, res) => {
    const { _id } = req.user;
    const followingUserEmail = req.query.following;

    try {
        const followingUserId = await User.findOne({
            email: followingUserEmail,
        }).select("_id");

        const userx = await User.findById({ _id });

        // to add the following user in the database
        let user;
        if (!userx.following.includes(followingUserId._id)) {
            user = await User.findOneAndUpdate(
                { _id },
                { $push: { following: followingUserId._id } }
            );
            user.following.push(followingUserId._id);
        } else {
            user = await User.findOneAndUpdate(
                { _id },
                { $pull: { following: followingUserId._id } }
            );
            user.following.pull(followingUserId._id);
        }
        const following = user.following;

        const items = [];
        for (let i = 0; i < following.length; i++) {
            const item = await User.findOne({
                _id: following[i],
            });
            let x = {
                _id: item._id,
                name: item.name,
                email: item.email,
                image: item.image,
            };

            items.push(x);
        }

        res.json(items);
    } catch (e) {
        res.json(e);
    }
};

const getFollowingList = async (req, res) => {
    const { _id } = req.user;

    try {
        const followingList = await User.findById({ _id }).select("following");

        const items = [];
        for (let i = 0; i < followingList.following.length; i++) {
            const item = await User.findOne({
                _id: followingList.following[i],
            });
            let x = {
                _id: item._id,
                name: item.name,
                email: item.email,
                image: item.image,
            };

            items.push(x);
        }

        res.json(items);
    } catch (e) {
        res.json(e);
    }
};

const getUserInformation = async (req, res) => {
    const { allLikes: emails } = req.query;

    try {
        // const x = allLikes.map(async (email) => {
        //     console.log(email);
        //     const user = await User.findOne({
        //         email,
        //     });
        //     return user;
        // });

        const users = [];
        for (let i = 0; i < emails.length; i++) {
            const user = await User.findOne({
                email: emails[i],
            }).select("image name");

            users.push(user);
        }

        res.json(users);
    } catch (e) {
        res.json({ message: e.message });
    }
};

const getPostsFromUser = async (req, res) => {
    console.log("Getting all posts");
    const { _id } = req.params;
    console.log(_id);
    try {
        const posts = await Post.find({ userId: _id });

        const results = [];
        for (let i = 0; i < posts.length; i++) {
            const user = await User.findOne({ _id: posts[i].userId });
            const item = {
                _id: posts[i]._id,
                content: posts[i].content,
                tags: posts[i].tags,
                image_small: posts[i].image_small,
                image_thumbnail: posts[i].image_thumbnail,
                image: posts[i].image,
                comments: posts[i].comments,
                createdAt: posts[i].createdAt,
                likes: posts[i].likes,
                name: user.name,
                image_user: user.image,
                userId: posts[i].userId,
            };
            results.push(item);
        }

        res.send(results.reverse());
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    setFollowingList,
    getFollowingList,
    getUserInformation,
    getPostsFromUser,
};
