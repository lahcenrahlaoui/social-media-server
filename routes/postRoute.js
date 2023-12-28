const express = require("express");
const { upload } = require("../config");
const {
    getAllPosts,
    getOnePost,
    createPost,
    deletePost,
    updatePost,
    updateLikes,
    getOneImage,
    uploadImage,
} = require("../controllers/postController");
const { requireAuth } = require("../middlewares/requireAuth");

const router = express.Router();

// middleware
router.use(requireAuth);

// get all posts
router.get("/", getAllPosts);

// get one post
router.get("/:id", getOnePost);

// get image one post
router.get("/image/:_id", getOneImage);

// create one post

router.post("/", upload.single("image"), createPost);

// to load high quality image
router.patch("/:id", upload.single("image"), uploadImage);

// update likes in the post
router.patch("/:_id/likes", updateLikes);

// delete one post
router.delete("/:id", deletePost);

module.exports = router;
