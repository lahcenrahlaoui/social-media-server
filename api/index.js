require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

// routes
const postRoutes = require("../../routes/postRoute");
const commentRoute = require("../../routes/commentRoute");
const authRoute = require("../../routes/authRoute");
const suggestionRoute = require("../../routes/suggestionRoute");
const userRoute = require("../../routes/userRoute");

const app = express();

// middlewares
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

// routes
app.get("/home", (req, res) => {
  res.json({ message: "message success" });
});

app.use("/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoute);
app.use("/api/suggestions", suggestionRoute);

// ===== MongoDB cached connection (VERY IMPORTANT in Vercel) =====

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  ```
await mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

isConnected = true;
console.log("Mongo Connected");
```;
}

// wrapper so every request ensures DB connection
const handler = async (req, res) => {
  await connectDB();
  return app(req, res);
};

module.exports = serverless(handler);
