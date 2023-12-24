const fs = require("fs");
const mongoose = require("mongoose");

const Comment = require("../models/commentModel");
const Post = require("../models/postModel");

// get all comments
const createComment = async (req, res) => {
    const { postId, userId } = req.params;
    const dataBody = req.body;
    console.log("----------------");

    const com = {
        content: dataBody.content,
        postId,
        userId,
    };

    try {
        const comment = await Comment.create(com);
        const post = await Post.findByIdAndUpdate(
            { _id: postId },

            { $push: { comments: comment } }
        );

        console.log(post);

        res.json(comment);
    } catch (err) {
        res.send(err.message);
    }
};
// get all comments
const getComments = async (req, res) => {
    const { _id } = req.params;
    console.log("_id");
    console.log(_id);
    try {
        const comments = await Comment.find({ _id }).limit(3);
        console.log(comments);
        res.send(comments);
    } catch (err) {
        res.json(err.message);
    }
};

// get one comment
const getOneComment = async (req, res) => {
    const { _id } = req.params;

    try {
        const comment = await Comment.findOne({ _id });
        console.log(comment);
        res.send(comment);
    } catch (err) {
        res.json(err.message);
    }
};
// get one comment
const getCommentsByPost = async (req, res) => {
    const { postId } = req.query;
    const skip = parseInt(req.query.skip);
console.log(skip)
    try {
        const comments = await Comment.find({ postId })
            .skip(skip)
            .limit((3));
        console.log(comments)
        res.send(comments);
    } catch (err) {
        res.json(err.message);
    }
};

module.exports = {
    getComments,
    getOneComment,
    getCommentsByPost,
    createComment,
};
