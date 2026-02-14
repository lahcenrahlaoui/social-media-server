// Load environment variables
require("dotenv").config();

// Import the Express app from api/index.js
const app = require("./api/index");

// Get port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
try {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
} catch (error) {
  console.error("Error starting server:", error);
  process.exit(1);
}
