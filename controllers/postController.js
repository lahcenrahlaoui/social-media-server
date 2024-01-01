const fs = require("fs");
const jimp = require("jimp");

const Post = require("../models/postModel");
const User = require("../models/userModel");

const { resizeImage } = require("../utils/resizeImage");
const { uploadToCloudinary } = require("../utils/config");

// get all posts
const getAllPosts = async (req, res) => {
    const { _id } = req.user;

    try {
        const { following } = await User.findOne({ _id }).select("following");

        
        const posts = [];
        for (let i = 0; i < following.length; i++) {
            const x = await Post.find({ userId: following[i] });
            x.map((item) => posts.push(item));
        }
       
        
        // const posts = await Post.find({ userId: following[0] });

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

// get only one post with the id
const getOnePost = async (req, res) => {
    const { _id } = req.params;

    try {
        const post = await Post.find({ _id: _id });

        res.json(post);
    } catch (err) {
        res.json(err.message);
    }
};

// get only the image
const getOneImage = async (req, res) => {
    const { _id } = req.params;

    let image = undefined;
    try {
        while (!image) {
            const post = await Post.findOne({ _id: _id });
            image = post.image;
        }

        res.json(image);
    } catch (err) {
        res.json(err.message);
    }
};

// create new post
const createPost = async (req, res) => {
    const data = req.body;

    const path_normal = req.file.path;

    data.userId = req?.user?._id;
    await resizeImage(req, data);

    try {
        const post = await Post.create(data);

        const user = await User.findOne({ _id: data.userId });

        const item = {
            _id: post._id,
            content: post.content,
            tags: post.tags,
            image_small: post.image_small,
            image_thumbnail: post.image_thumbnail,
            image: post.image,
            comments: post.comments,
            createdAt: post.createdAt,
            likes: post.likes,
            name: user.name,
            image_user: user.image,
            userId: post.userId,
        };

        res.json(item);

        data.image = await uploadToCloudinary(path_normal);
        // // remove normal  image
        // fs.access(path_normal, fs.F_OK, async (err, ac) => {
        //     fs.unlink(path_normal, (ferr, fc) => {
        //         if (err) {
        //             throw err;
        //         }
        //         console.log("Delete File successfully. ");
        //     });
        // });

        const postx = await Post.findOneAndUpdate({ _id: post._id }, data);
    } catch (err) {
        res.send(err.message);
    }
};

// delete post
const deletePost = async (req, res) => {
    const { _id } = req.params;
    try {
        const post = await Post.findOneAndDelete({ _id });
        res.send(post);
    } catch (err) {
        res.send(err.message);
    }
};

// update post
const updatePost = async (req, res) => {
    const { _id } = req.params;
    const data = req.body;
    try {
        const post = await Post.findOneAndUpdate({ _id }, data);

        res.send(post);
    } catch (err) {
        res.send(err.message);
    }
};

// update likes
const updateLikes = async (req, res) => {
    const userId = req.user._id;
    const { _id } = req.params;

    try {
        const postx = await Post.findOne({ _id });
        let post;
        const user = await User.findOne({ _id: userId });

        const randUser = user.email;
        if (!postx.likes.includes(randUser)) {
            post = await Post.findOneAndUpdate(
                { _id },
                { $push: { likes: randUser } }
            );
            post.likes.push(randUser);
        } else {
            post = await Post.findOneAndUpdate(
                { _id },
                { $pull: { likes: randUser } }
            );
            post.likes.pull(randUser);
        }
        // if (!postx.likes.includes(randUser)) {
        //     post = await Post.findOneAndUpdate(
        //         { _id },
        //         { $push: { likes: randUser } }
        //     );
        //     post.likes.push(randUser);
        // } else {
        //     post = await Post.findOneAndUpdate(
        //         { _id },
        //         { $pull: { likes: randUser } }
        //     );
        //     post.likes.pull(randUser);
        // }

        res.send(post);
    } catch (err) {
        res.send(err.message);
    }
};

const uploadImage = () => {};

module.exports = {
    getAllPosts,
    getOnePost,
    createPost,
    deletePost,
    updatePost,
    updateLikes,
    getOneImage,
    uploadImage,
};
