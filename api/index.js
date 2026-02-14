// Load environment variables (non-blocking)
try {
  require("dotenv").config();
} catch (e) {
  // Ignore - Vercel provides env vars
}

// Log environment status for debugging (in development only)
if (process.env.NODE_ENV !== 'production') {
  console.log("Environment check:", {
    hasMongoUrl: !!process.env.MONGO_URL,
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
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

// Database health check endpoint
app.get("/health/db", async (req, res) => {
  try {
    const mongoose = getMongoose();
    const readyState = mongoose.connection.readyState;

    const status = {
      readyState: readyState,
      stateName: {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
      }[readyState],
      hasMongoUrl: !!process.env.MONGO_URL,
      mongoUrlPreview: process.env.MONGO_URL
        ? process.env.MONGO_URL.substring(0, 20) + "..."
        : "Not set"
    };

    if (readyState === 1) {
      // Try a simple ping to verify connection
      await mongoose.connection.db.admin().ping();
      return res.status(200).json({
        status: "connected",
        message: "Database is connected and responsive",
        ...status
      });
    } else {
      // Try to connect
      try {
        await ensureDBConnection();
        await mongoose.connection.db.admin().ping();
        return res.status(200).json({
          status: "connected",
          message: "Database connection established",
          ...status,
          readyStateAfter: mongoose.connection.readyState
        });
      } catch (connectError) {
        return res.status(503).json({
          status: "disconnected",
          message: "Database connection failed",
          error: connectError.message,
          ...status
        });
      }
    }
  } catch (error) {
    return res.status(503).json({
      status: "error",
      message: "Database health check failed",
      error: error.message,
      hasMongoUrl: !!process.env.MONGO_URL
    });
  }
});

// MongoDB - lazy loaded only when needed
let mongoose = null;
let connectionPromise = null;
let isConnecting = false;

function getMongoose() {
  if (!mongoose) {
    mongoose = require("mongoose");

    // Set mongoose options to match working test script
    mongoose.set('strictQuery', false);
    // Enable buffering with longer timeout to allow models to load before connection
    // But ensure connection happens quickly via middleware
    mongoose.set('bufferCommands', true);
    mongoose.set('bufferMaxEntries', 0); // Unlimited buffering
    mongoose.set('bufferTimeoutMS', 60000); // 60 seconds - gives us time to establish connection

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

  // If already connecting, wait for the existing promise
  if (connectionPromise && isConnecting) {
    console.log("[ensureDBConnection] Connection already in progress, waiting for existing promise...");
    return connectionPromise;
  }

  // If connection is in connecting state, wait for it to complete
  if (mongoose.connection.readyState === 2) {
    console.log("[ensureDBConnection] Connection in progress (state 2), waiting up to 10 seconds...");
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds
      const checkInterval = setInterval(() => {
        attempts++;
        const currentState = mongoose.connection.readyState;
        if (currentState === 1) {
          clearInterval(checkInterval);
          console.log("[ensureDBConnection] Connection completed successfully");
          resolve();
        } else if (currentState === 0 && attempts > 10) {
          // Connection failed, try to establish new one
          clearInterval(checkInterval);
          console.log("[ensureDBConnection] Connection failed, attempting new connection...");
          ensureDBConnection().then(resolve).catch(reject);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error("Connection timeout: connection attempt took too long"));
        }
      }, 100);
    });
  }

  // If disconnecting, wait for it to finish then connect
  if (mongoose.connection.readyState === 3) {
    console.log("[ensureDBConnection] Connection disconnecting (state 3), waiting...");
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      const checkInterval = setInterval(() => {
        attempts++;
        const currentState = mongoose.connection.readyState;
        if (currentState === 0) {
          clearInterval(checkInterval);
          console.log("[ensureDBConnection] Disconnection complete, starting new connection...");
          ensureDBConnection().then(resolve).catch(reject);
        } else if (currentState === 1) {
          clearInterval(checkInterval);
          console.log("[ensureDBConnection] Connection is ready");
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log("[ensureDBConnection] Timeout waiting for disconnection, forcing new connection...");
          ensureDBConnection().then(resolve).catch(reject);
        }
      }, 100);
    });
  }

  isConnecting = true;
  console.log("[ensureDBConnection] Starting new connection attempt...");
  connectionPromise = (async () => {
    try {
      if (!process.env.MONGO_URL) {
        const error = new Error("MONGO_URL environment variable is not set");
        console.error("[ensureDBConnection] Database configuration error:", error.message);
        console.error("[ensureDBConnection] Available env vars:", Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
        console.error("[ensureDBConnection] Environment:", {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          VERCEL_ENV: process.env.VERCEL_ENV
        });
        throw error;
      }

      console.log("[ensureDBConnection] MONGO_URL is set, length:", process.env.MONGO_URL.length);

      // Close existing connection if in a bad state
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.connection.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      const mongoUrl = process.env.MONGO_URL.trim();
      console.log("[ensureDBConnection] Attempting to connect to MongoDB...");
      console.log("[ensureDBConnection] Connection URL preview:", mongoUrl.substring(0, 30).replace(/:[^:@]*@/, ":****@") + "...");

      // Wait for 'connected' event to ensure connection is truly ready
      const connectionReady = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error("[ensureDBConnection] Connection timeout after 25 seconds");
          reject(new Error("Connection timeout: Did not connect within 25 seconds"));
        }, 25000);

        const onConnected = () => {
          console.log("[ensureDBConnection] 'connected' event fired");
          clearTimeout(timeout);
          mongoose.connection.removeListener("error", onError);
          resolve();
        };

        const onError = (err) => {
          console.error("[ensureDBConnection] Connection error event:", err.message);
          clearTimeout(timeout);
          mongoose.connection.removeListener("connected", onConnected);
          reject(err);
        };

        // Check if already connected
        if (mongoose.connection.readyState === 1) {
          console.log("[ensureDBConnection] Already connected");
          clearTimeout(timeout);
          resolve();
        } else {
          console.log("[ensureDBConnection] Setting up event listeners for connection");
          mongoose.connection.once("connected", onConnected);
          mongoose.connection.once("error", onError);
        }
      });

      // Use the same connection options that work in the test script
      console.log("[ensureDBConnection] Calling mongoose.connect()...");
      const connectPromise = mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 20000,
        maxPoolSize: 1,
      });

      // Wait for both connect() promise and 'connected' event
      console.log("[ensureDBConnection] Waiting for connection to establish...");
      await Promise.all([connectPromise, connectionReady]);
      console.log("[ensureDBConnection] Connection established, verifying with ping...");

      // Verify connection with a ping (same as test script)
      await mongoose.connection.db.admin().ping();
      console.log("[ensureDBConnection] Ping successful");

      // Double-check readyState
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Connection not ready after connect. State: ${mongoose.connection.readyState}`);
      }

      console.log("[ensureDBConnection] MongoDB Connected successfully");
      isConnecting = false;
      return true;
    } catch (error) {
      console.error("MongoDB connection error:", error.message);
      console.error("Error details:", {
        name: error.name,
        code: error.code,
        message: error.message,
        mongoUrl: process.env.MONGO_URL ? "Set (hidden)" : "Not set",
        mongoUrlLength: process.env.MONGO_URL ? process.env.MONGO_URL.length : 0,
        mongoUrlPreview: process.env.MONGO_URL
          ? process.env.MONGO_URL.substring(0, 30).replace(/:[^:@]*@/, ":****@") + "..."
          : "Not set",
        stack: error.stack
      });
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }
  })();
  return connectionPromise;
}

// Middleware to ensure DB connection for API endpoints
// MUST be registered BEFORE routes so it runs first
app.use(async (req, res, next) => {
  // Skip DB connection for simple routes
  if (req.path === "/" || req.path === "/home" || req.path === "/favicon.ico") {
    return next();
  }

  // Ensure DB connection before proceeding for API endpoints
  if (req.path.startsWith("/auth") || req.path.startsWith("/api")) {
    const mongoose = getMongoose();
    const readyState = mongoose.connection.readyState;

    console.log(`[DB Middleware] Path: ${req.path}, ReadyState: ${readyState}`);

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState !== 1) {
      try {
        console.log(`[DB Middleware] Connection not ready (${readyState}), attempting to connect...`);
        // ensureDBConnection() already verifies connection with ping before resolving
        await ensureDBConnection();

        console.log(`[DB Middleware] ensureDBConnection() completed, checking readyState...`);

        // Get fresh mongoose instance to ensure we're checking the right connection
        const mongooseAfterConnect = getMongoose();

        // Double-check readyState after connection with a small delay to ensure it's settled
        await new Promise(resolve => setTimeout(resolve, 50));

        if (mongooseAfterConnect.connection.readyState !== 1) {
          console.error(`[DB Middleware] Connection state after ensureDBConnection: ${mongooseAfterConnect.connection.readyState}`);
          console.error(`[DB Middleware] Connection details:`, {
            readyState: mongooseAfterConnect.connection.readyState,
            host: mongooseAfterConnect.connection.host,
            name: mongooseAfterConnect.connection.name
          });
          return res.status(503).json({
            error: "Database connection failed",
            message: "Unable to connect to database. Please try again later.",
            details: `Connection state: ${mongooseAfterConnect.connection.readyState} (expected 1)`,
            hasMongoUrl: !!process.env.MONGO_URL
          });
        }

        // Final verification with ping
        try {
          await mongooseAfterConnect.connection.db.admin().ping();
          console.log(`[DB Middleware] Connection verified with ping, proceeding...`);
        } catch (pingError) {
          console.error(`[DB Middleware] Ping failed:`, pingError.message);
          return res.status(503).json({
            error: "Database connection failed",
            message: "Database connection not responding to queries.",
            details: pingError.message
          });
        }
      } catch (error) {
        console.error("[DB Middleware] Database connection error:", {
          message: error.message,
          name: error.name,
          code: error.code,
          path: req.path,
          readyState: mongoose.connection.readyState,
          stack: error.stack
        });

        // Provide more helpful error message
        let errorMessage = "Unable to connect to database. Please try again later.";
        let errorDetails = {
          errorName: error.name,
          errorCode: error.code,
          hasMongoUrl: !!process.env.MONGO_URL
        };

        if (error.message.includes("MONGO_URL") || !process.env.MONGO_URL) {
          errorMessage = "Database configuration error: MONGO_URL environment variable is not set.";
          errorDetails.issue = "Missing MONGO_URL environment variable";
        } else if (error.message.includes("timeout") || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
          errorMessage = "Database connection timeout. Please check your network connection and MongoDB server availability.";
          errorDetails.issue = "Connection timeout or DNS resolution failed";
        } else if (error.code === "ENOTFOUND" || error.message.includes("getaddrinfo")) {
          errorMessage = "Cannot resolve MongoDB hostname. Please check your MONGO_URL connection string.";
          errorDetails.issue = "DNS resolution failed";
        } else if (error.message.includes("authentication") || error.code === 8000) {
          errorMessage = "MongoDB authentication failed. Please check your username and password in MONGO_URL.";
          errorDetails.issue = "Authentication failed";
        } else {
          errorDetails.issue = error.message;
        }

        return res.status(503).json({
          error: "Database connection failed",
          message: errorMessage,
          details: errorDetails
        });
      }
    }
  }
  next();
});

// Load routes AFTER middleware (routes are lightweight, mongoose is the heavy one)
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
