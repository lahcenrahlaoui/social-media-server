const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema({
    id: String,

    title: String,
    content: String,

    tags: [String],
    image: String,
    image_small: String,
    image_thumbnail: String,
    likes: { type: [String], default: [] },
    
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]



});

module.exports = mongoose.model("post", postSchema);
