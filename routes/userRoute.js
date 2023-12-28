// imports
const express = require("express");

const { setFollowingList , getFollowingList } = require("../controllers/usercontroller");
const { requireAuth } = require("../middlewares/requireAuth");

// config
const router = express.Router();

// middleware
router.use(requireAuth);

router.get("/get/following", getFollowingList);

router.patch("/set/following", setFollowingList);

module.exports = router;
