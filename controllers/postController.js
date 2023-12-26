const fs = require("fs");
const mongoose = require("mongoose");
const sharp = require("sharp");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");

const { uploadToCloudinary } = require("../cloudinaryConfig");



// get all posts
const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find({});
        console.log(posts);
        res.send(posts.reverse());
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// get only one post with the id
const getOnePost = async (req, res) => {
    const { id } = req.params;

    try {
        const post = await Post.find({ id: id });

        res.json(post);
    } catch (err) {
        res.json(err.message);
    }
};
// get only one post with the id
const getOneImage = async (req, res) => {
    const { id } = req.params;

    let image = undefined;
    try {
        while (!image) {
            const post = await Post.findOne({ id: id });
            image = post.image;
        }

        res.json(image);
    } catch (err) {
        res.json(err.message);
    }
};

const resizeImage = async (req, data) => {
    const size_thumbnail = {
        w: 5,
        h: 5,
    };
    const size_small = {
        w: 50,
        h: 50,
    };

    //  upload to cloudinary small image
    const path_normal = req.file.path;
    const path_thumbnail =
        req.file.path.split("--")[0] + "_thumbnail_" + req.file.originalname;
    await sharp(path_normal)
        .resize(size_thumbnail.w, size_thumbnail.h)
        .toFile(path_thumbnail);
    data.image_thumbnail = await uploadToCloudinary(path_thumbnail);

    const path_small =
        req.file.path.split("--")[0] + "_small_" + req.file.originalname;
    await sharp(path_normal)
        .resize(size_small.w, size_small.h)
        .toFile(path_small);
    data.image_small = await uploadToCloudinary(path_small);

    // remove small image
    fs.access(path_small, fs.F_OK, async (err, ac) => {
        fs.unlink(path_small, (ferr, fc) => {
            if (err) {
                throw err;
            }
            console.log("Delete File successfully. ");
        });
    });

    // remove thumbnail image
    fs.unlink(path_thumbnail, (err) => {
        if (err) {
            throw err;
        }
        console.log("Delete File successfully thumbnail ");
    });
};

// create new post
const createPost = async (req, res) => {
    const data = req.body;
    const path_normal = req.file.path;

    await resizeImage(req, data);

    data.id = Math.random().toString(36).slice(-10);

    try {
        const post = await Post.create(data);

        res.json(post);

        data.image = await uploadToCloudinary(path_normal);
        // remove normal  image
        fs.access(path_normal, fs.F_OK, async (err, ac) => {
            fs.unlink(path_normal, (ferr, fc) => {
                if (err) {
                    throw err;
                }
                console.log("Delete File successfully. ");
            });
        });

        const postx = await Post.findOneAndUpdate({ id: data.id }, data);
    } catch (err) {
        res.send(err.message);
    }
};

// delete post
const deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findOneAndDelete({ id });
        res.send(post);
    } catch (err) {
        res.send(err.message);
    }
};

// update post
const updatePost = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const post = await Post.findOneAndUpdate({ id }, data);

        res.send(post);
    } catch (err) {
        res.send(err.message);
    }
};

// update likes
const updateLikes = async (req, res) => {
    const listUsers = ["james", "noah", "jane"];
    const rand = Math.floor(Math.random() * 3);

    const randUser = listUsers[rand];

    const { id } = req.params;

    try {
        const postx = await Post.findOne({ id });
        let post;

        if (!postx.likes.includes(randUser)) {
            post = await Post.findOneAndUpdate(
                { id },
                { $push: { likes: randUser } }
            );
            post.likes.push(randUser);
        } else {
            post = await Post.findOneAndUpdate(
                { id },
                { $pull: { likes: randUser } }
            );
            post.likes.pull(randUser);
        }

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
