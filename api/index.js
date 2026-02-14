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

// ===== MongoDB cached connection (VERY IMPORTANT in Vercel) =====

let connectionPromise = null;
let isConnecting = false;

function ensureDBConnection() {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  // If connection is in progress, return the existing promise
  if (connectionPromise && isConnecting) {
    return connectionPromise;
  }

  // Start new connection attempt (non-blocking)
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      if (!process.env.MONGO_URL) {
        throw new Error("MONGO_URL environment variable is not set");
      }

      // Use very aggressive timeouts for serverless
      await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 3000, // 3 seconds
        socketTimeoutMS: 45000,
        connectTimeoutMS: 5000, // 5 seconds
        maxPoolSize: 1,
      });

      console.log("MongoDB Connected");
      isConnecting = false;
      return true;
    } catch (error) {
      console.error("MongoDB connection error:", error.message);
      isConnecting = false;
      connectionPromise = null;
      // Don't throw - let routes handle it
      return false;
    }
  })();

  return connectionPromise;
}

// Start connection attempt immediately (non-blocking)
ensureDBConnection().catch(() => { });

// Middleware to ensure DB connection for routes that need it (placed before routes)
app.use(async (req, res, next) => {
  // For health check and static routes, skip DB check
  if (req.path === "/home" || req.path.startsWith("/public")) {
    return next();
  }

  // Try to ensure connection, but don't block
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    // Start connection in background, but don't wait
    ensureDBConnection().catch(() => { });
  }

  next();
});

// routes
app.get("/home", (req, res) => {
  res.json({ message: "message success" });
});

app.use("/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoute);
app.use("/api/suggestions", suggestionRoute);

// wrapper for serverless
const handler = async (req, res) => {
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
