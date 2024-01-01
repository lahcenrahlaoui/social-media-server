// imports
const express = require("express");

const { setFollowingList , getFollowingList , getUserInformation } = require("../controllers/userController");
const { requireAuth } = require("../middlewares/requireAuth");

// config
const router = express.Router();

// middleware
router.use(requireAuth);

router.get("/get/following", getFollowingList);

router.patch("/set/following", setFollowingList);



router.get("/get/user-information", getUserInformation);

module.exports = router;
