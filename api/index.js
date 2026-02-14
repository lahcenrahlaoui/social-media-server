// Load environment variables (non-blocking)
try {
  require("dotenv").config();
} catch (e) {
  // Ignore - Vercel provides env vars
}

const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// CORS middleware - must be before bodyParser for preflight requests
app.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin;

  // Allow all origins (you can restrict this to specific domains in production)
  // For credentials: true, you should specify actual origins, not "*"
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, authorization, Accept, X-Requested-With, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");

  // Handle preflight requests immediately
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Middleware
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

// Simple routes FIRST - these must respond immediately
app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running", status: "ok" });
});

app.get("/home", (req, res) => {
  res.status(200).json({ message: "message success" });
});

// MongoDB - lazy loaded only when needed
let mongoose = null;
let connectionPromise = null;
let isConnecting = false;

function getMongoose() {
  if (!mongoose) {
    mongoose = require("mongoose");
  }
  return mongoose;
}

function ensureDBConnection() {
  const mongoose = getMongoose();
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (connectionPromise && isConnecting) return connectionPromise;

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      if (!process.env.MONGO_URL) throw new Error("MONGO_URL not set");
      await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 5000,
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

// Routes - lazy loaded
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

// Middleware to lazy load routes and DB for API endpoints
app.use((req, res, next) => {
  // Skip everything for simple routes
  if (req.path === "/" || req.path === "/home" || req.path === "/favicon.ico") {
    return next();
  }

  // Load routes and DB for API endpoints
  if (req.path.startsWith("/auth") || req.path.startsWith("/api")) {
    loadRoutes();
    const mongoose = getMongoose();
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
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

// Export Vercel-compatible handler (no serverless-http needed)
// Express app is callable as a function: app(req, res)
module.exports = app;
