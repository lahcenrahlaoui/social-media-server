const express = require("express");

const router = express.Router();

const { loginUser, signupUser } = require("../controllers/authController");


router.post("/signin", loginUser);

router.post("/signup", signupUser);

module.exports = router;
