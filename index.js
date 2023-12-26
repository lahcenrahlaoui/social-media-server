//imports
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

// import routes
const postRoutes = require("./routes/postRoute");
const commentRoute = require("./routes/commentRoute");
const authRoute = require("./routes/authRoute");
// initialise the app
const app = express();

//middlewares
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// constants
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 5000;

// routes
app.use("/home", (req, res) => {
    res.send({
        message: "message sucsses",
    });
});

app.use("/auth", authRoute);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoute);

//connect to the database
mongoose
    .connect(MONGO_URL)
    .then(() =>
        app.listen(PORT, () => console.log("connected to port ", PORT))
    );
