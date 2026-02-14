require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();

// middlewares
// Note: Static file serving removed for serverless - files should be served via CDN
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
      return false;
    }
  })();

  return connectionPromise;
}

// Lazy load routes only when needed
let routesLoaded = false;
function loadRoutes() {
  if (routesLoaded) return;
  routesLoaded = true;

  try {
    const authRoute = require("../routes/authRoute");
    const userRoute = require("../routes/userRoute");
    const postRoutes = require("../routes/postRoute");
    const commentRoute = require("../routes/commentRoute");
    const suggestionRoute = require("../routes/suggestionRoute");

    app.use("/auth", authRoute);
    app.use("/api/user", userRoute);
    app.use("/api/posts", postRoutes);
    app.use("/api/comments", commentRoute);
    app.use("/api/suggestions", suggestionRoute);
  } catch (error) {
    console.error("Error loading routes:", error);
  }
}

// routes - define simple routes first (these don't need DB)
app.get("/", (req, res) => {
  res.json({ message: "API is running", status: "ok" });
});

app.get("/home", (req, res) => {
  res.json({ message: "message success" });
});

// Middleware: lazy load routes and ensure DB connection for API routes
app.use((req, res, next) => {
  // For health check, root, and static routes, skip everything
  if (req.path === "/" || req.path === "/home" || req.path.startsWith("/public") || req.path === "/favicon.ico") {
    return next();
  }

  // Load routes lazily for API endpoints
  if (req.path.startsWith("/auth") || req.path.startsWith("/api")) {
    loadRoutes();

    // Try to ensure DB connection in background (non-blocking)
    if (mongoose.connection.readyState !== 1 && !isConnecting) {
      ensureDBConnection().catch(() => { });
    }
  }

  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// wrapper for serverless
// serverless-http wraps the Express app, so we just pass the app directly
module.exports = serverless(app);
