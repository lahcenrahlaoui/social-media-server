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

    // Set buffer timeout globally to prevent buffering timeout errors
    mongoose.set('bufferTimeoutMS', 30000); // 30 seconds

    // Set up connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      isConnecting = false;
      connectionPromise = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnecting = false;
      connectionPromise = null;
    });

    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected");
      isConnecting = false;
    });
  }
  return mongoose;
}

function ensureDBConnection() {
  const mongoose = getMongoose();

  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  // If already connecting, return the existing promise
  if (connectionPromise && isConnecting) {
    return connectionPromise;
  }

  // Check if connection is in a bad state and needs to be reset
  if (mongoose.connection.readyState === 2 || mongoose.connection.readyState === 3) {
    // Connecting or disconnecting - wait a bit and try again
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          ensureDBConnection().then(resolve).catch(reject);
        }
      }, 100);
    });
  }

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      if (!process.env.MONGO_URL) {
        const error = new Error("MONGO_URL environment variable is not set");
        console.error("Database configuration error:", error.message);
        throw error;
      }

      // Close existing connection if in a bad state
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.connection.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      const mongoUrl = process.env.MONGO_URL.trim();
      console.log("Attempting to connect to MongoDB...");

      // Set up connection event listener BEFORE connecting
      const connectionReady = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout: Did not connect within 25 seconds"));
        }, 25000);

        const onConnected = () => {
          clearTimeout(timeout);
          mongoose.connection.removeListener("error", onError);
          console.log("MongoDB 'connected' event fired");
          resolve();
        };

        const onError = (err) => {
          clearTimeout(timeout);
          mongoose.connection.removeListener("connected", onConnected);
          reject(err);
        };

        // Check if already connected
        if (mongoose.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          mongoose.connection.once("connected", onConnected);
          mongoose.connection.once("error", onError);
        }
      });

      // Start the connection
      const connectPromise = mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 20000,
        maxPoolSize: 1,
        minPoolSize: 0,
        retryWrites: true,
        bufferCommands: true,
        bufferMaxEntries: 0,
      }).catch(err => {
        // If connect fails, reject the connectionReady promise
        throw err;
      });

      // Wait for both the connect() promise AND the 'connected' event
      await Promise.all([connectPromise, connectionReady]);

      // Final verification - ensure readyState is 1
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Connection not ready after connect. State: ${mongoose.connection.readyState}`);
      }

      console.log("MongoDB Connected successfully");
      isConnecting = false;
      return true;
    } catch (error) {
      console.error("MongoDB connection error:", error.message);
      console.error("Error details:", {
        name: error.name,
        code: error.code,
        message: error.message,
        mongoUrl: process.env.MONGO_URL ? "Set (hidden)" : "Not set"
      });
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }
  })();
  return connectionPromise;
}

// Load routes immediately (routes are lightweight, mongoose is the heavy one)
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

// Middleware to ensure DB connection for API endpoints
app.use(async (req, res, next) => {
  // Skip DB connection for simple routes
  if (req.path === "/" || req.path === "/home" || req.path === "/favicon.ico") {
    return next();
  }

  // Ensure DB connection before proceeding for API endpoints
  if (req.path.startsWith("/auth") || req.path.startsWith("/api")) {
    const mongoose = getMongoose();
    const readyState = mongoose.connection.readyState;

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState !== 1) {
      try {
        await ensureDBConnection();

        // Wait a bit more to ensure connection is truly ready for queries
        // This is especially important with bufferCommands settings
        let waitAttempts = 0;
        const maxWaitAttempts = 50; // 5 seconds max wait (50 * 100ms)
        while (mongoose.connection.readyState !== 1 && waitAttempts < maxWaitAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitAttempts++;
        }

        // Double-check connection state after attempting connection
        const newReadyState = mongoose.connection.readyState;
        if (newReadyState !== 1) {
          console.error(`Connection state after ensureDBConnection: ${newReadyState}`);
          return res.status(503).json({
            error: "Database connection failed",
            message: "Unable to connect to database. Please try again later.",
            details: process.env.MONGO_URL ? "Connection string is configured" : "MONGO_URL environment variable is missing"
          });
        }
      } catch (error) {
        console.error("Database connection error in middleware:", {
          message: error.message,
          name: error.name,
          code: error.code,
          path: req.path
        });

        // Provide more helpful error message
        let errorMessage = "Unable to connect to database. Please try again later.";
        if (error.message.includes("MONGO_URL")) {
          errorMessage = "Database configuration error: MONGO_URL environment variable is not set.";
        } else if (error.message.includes("timeout") || error.code === "ETIMEDOUT") {
          errorMessage = "Database connection timeout. Please check your network connection and try again.";
        }

        return res.status(503).json({
          error: "Database connection failed",
          message: errorMessage
        });
      }
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
