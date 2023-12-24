const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
    content: { type: String, default: "" },
     

    userId: String,
    postId: String,
});

module.exports = mongoose.model("Comment", commentSchema);
