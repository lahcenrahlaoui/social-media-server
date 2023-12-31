// imports
const express = require("express");

const { suggestions } = require("../controllers/suggestionsController");
const { requireAuth } = require("../middlewares/requireAuth");
 

// config
const router = express.Router();

// middleware
router.use(requireAuth);

router.get("/suggestions", suggestions);

module.exports = router;
