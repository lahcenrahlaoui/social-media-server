const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema(
    {
        userId: String,
        content: String,
        tags: [String],
        image: String,
        image_small: String,
        image_thumbnail: String,
        likes: { type: [String], default: [] },
        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("post", postSchema);
