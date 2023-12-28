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
const suggestionRoute = require("./routes/suggestionRoute");
const userRoute = require("./routes/userRoute");
// initialise the app
const app = express();
// to delete old results

console.clear();

//middlewares
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(
    cors({
        origin: ["https://social-media-client-blue.vercel.app/"],
    })
);

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
app.use("/api/user", userRoute);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoute);

app.use("/api/suggestions", suggestionRoute);

//connect to the database
mongoose
    .connect(MONGO_URL)
    .then(() =>
        app.listen(PORT, () => console.log("connected to port ", PORT))
    );
