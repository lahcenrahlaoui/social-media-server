// imports
const express = require("express");

const { loginUser, signupUser } = require("../controllers/authController");
const { upload } = require("../config");

// config
const router = express.Router();

router.post("/signin", loginUser);
router.post("/signup", upload.single("image"), signupUser);

module.exports = router;
