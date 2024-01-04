// imports
const express = require("express");

const {
    setFollowingList,
    getFollowingList,
    getUsersInformation,
    getUserInformationById,
    getPostsFromUser,
} = require("../controllers/userController");
const { requireAuth } = require("../middlewares/requireAuth");

// config
const router = express.Router();

// middleware
router.use(requireAuth);

router.get("/get/following", getFollowingList);

router.get("/get/posts/:_id", getPostsFromUser);

router.patch("/set/following", setFollowingList);

router.get("/get/user-information", getUsersInformation);

router.get("/get/user-information/:_id", getUserInformationById);

module.exports = router;
