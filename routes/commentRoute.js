const express = require("express");

const {
    getOneComment,
    getComments,
    getCommentsByPost,
    createComment,
} = require("../controllers/commentController");
const { requireAuth } = require("../middlewares/requireAuth");

const router = express.Router();
// middleware
router.use(requireAuth);

// create comments in the post
router.post("/newComment/:postId", createComment);

// all comments
router.get("/", getComments);

// get all comments in the post
router.get("/post/", getCommentsByPost);

// get only one comment by id
router.get("/:_id", getOneComment);

module.exports = router;

//
//
//
//
//
//
//
//
//
//
//
// // get one post
// router.get("/:id", getOnePost);

// // get image one post
// router.get("/image/:id", getOneImage);

// // create one post
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, "./public/temp/");
//     },
//     filename: function (req, file, cb) {
//         const string = new Date()
//             .toISOString()
//             .split(".")
//             .join("")
//             .replace(/:/gi, "-");

//         cb(null, string + "--" + file.originalname);
//     },
// });

// // const storage = new multer.memoryStorage();
// const upload = multer({ storage: storage });
// router.post("/", upload.single("image"), createPost);

// router.patch("/:id", upload.single("image"), uploadImage);

// // update one post
// // router.patch("/:id", updatePost);

// // update one post
// router.patch("/:id/likes", updateLikes);

// // delete one post
// router.delete("/:id", deletePost);
