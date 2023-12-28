const fs = require("fs");
const mongoose = require("mongoose");

const Comment = require("../models/commentModel");
const Post = require("../models/postModel");
const User = require("../models/userModel");

// create comments
const createComment = async (req, res) => {
    const userId = req.user?._id;
    const { postId } = req.params;

    
    const com = {
        content: req.body.content,
        postId,
        userId,
    };

    try {
        const comment = await Comment.create(com);
        const post = await Post.findByIdAndUpdate(
            { _id: postId },

            { $push: { comments: comment } }
        );


        const user = await User.findOne({ _id: userId });

        const item = {
            postId: comment.postId,
            createdAt: comment.createdAt,
            content: comment.content,
            image: user.image,
            name: user.name,
        };
 
        
        res.json(item);
    } catch (err) {
        res.send(err.message);
    }
};

// get all comments
const getComments = async (req, res) => {
    const { _id } = req.params;

    try {
        const comments = await Comment.find({ _id }).limit(3);

        
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
     
        
        res.send(comment);
    } catch (err) {
        res.json(err.message);
    }
};

// get one comment
const getCommentsByPost = async (req, res) => {
    const { postId } = req.query;
    const skip = parseInt(req.query.skip);

    try {
        const comments = await Comment.find({ postId }).skip(skip).limit(3);
     
        

        const results = [];
        for (let i = 0; i < comments.length; i++) {
            const user = await User.findOne({
                _id: comments[i].userId,
            });

            const item = {
                postId: comments[i].postId,
                createdAt: comments[i].createdAt,
                image: user.image,
                content: comments[i].content,
                name: user.name,
            };
            results.push(item);
        }

        res.send(results);
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
