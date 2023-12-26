const express = require("express");
const multer = require("multer");

const {
    getAllPosts,
    getOnePost,
    createPost,
    deletePost,
    updatePost,
    updateLikes,
    getOneImage , 
    uploadImage
} = require("../controllers/postController");
const { requireAuth } = require("../middlewares/requireAuth");

const router = express.Router();

router.use(requireAuth)

// get all posts
router.get("/",  getAllPosts);

// get one post
router.get("/:id", getOnePost);

// get image one post
router.get("/image/:id", getOneImage);

// create one post
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp/");
    },
    filename: function (req, file, cb) {
        const string = new Date()
            .toISOString()
            .split(".")
            .join("")
            .replace(/:/gi, "-");

        cb(null, string + "--" + file.originalname);
    },
});

// const storage = new multer.memoryStorage()das;
const upload = multer({ storage: storage });
router.post("/", upload.single("image"), createPost);

router.patch("/:id", upload.single("image"), uploadImage);

// update one post
// router.patch("/:id", updatePost);

// update one post
router.patch("/:id/likes", updateLikes);

// delete one post
router.delete("/:id", deletePost);

module.exports = router;
