require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const serverless = require("serverless-http");

// routes
const postRoutes = require("../routes/postRoute");
const commentRoute = require("../routes/commentRoute");
const authRoute = require("../routes/authRoute");
const suggestionRoute = require("../routes/suggestionRoute");
const userRoute = require("../routes/userRoute");

const app = express();

// middlewares
app.use(express.static(path.join(__dirname, "../public")));
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

let cachedConnection = null;

async function connectDB() {
  // Check if mongoose is already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If connection is in progress, wait for it with timeout
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 8000);

      mongoose.connection.once("connected", () => {
        clearTimeout(timeout);
        resolve();
      });
      mongoose.connection.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // If we have a cached connection promise, return it
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL environment variable is not set");
    }

    // Create connection promise with aggressive timeouts for serverless
    cachedConnection = Promise.race([
      mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 5000, // 5 seconds to select server
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        connectTimeoutMS: 8000, // 8 seconds connection timeout
        maxPoolSize: 1, // Limit connections in serverless
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB connection timeout after 8 seconds")), 8000)
      ),
    ]);

    await cachedConnection;
    console.log("MongoDB Connected successfully");
    cachedConnection = null; // Clear cache on success
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    cachedConnection = null; // Clear cache on error
    // Reset connection state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close().catch(() => { });
    }
    throw error;
  }
}

// wrapper so every request ensures DB connection
const handler = async (req, res) => {
  try {
    // Ensure DB connection with timeout
    await connectDB();
  } catch (error) {
    console.error("DB connection error:", error.message);
    // If DB connection fails, return error immediately
    if (!res.headersSent) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Database connection failed. Please try again later."
      });
    }
  }

  try {
    return await app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
    return res;
  }
};

module.exports = serverless(handler);
