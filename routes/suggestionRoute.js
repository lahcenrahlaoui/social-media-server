// imports
const express = require("express");

const { suggestions } = require("../controllers/suggestionsController");
 

// config
const router = express.Router();

router.get("/", suggestions);

module.exports = router;
