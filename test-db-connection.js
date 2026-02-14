// Database Connection Diagnostic Script
// Run this with: node test-db-connection.js

require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
  console.log("=== MongoDB Connection Diagnostic ===\n");

  // Check if MONGO_URL is set
  if (!process.env.MONGO_URL) {
    console.error("❌ ERROR: MONGO_URL environment variable is not set!");
    console.log("\nTo fix this:");
    console.log("1. Create a .env file in the server directory");
    console.log("2. Add: MONGO_URL=your_mongodb_connection_string");
    console.log("\nExample MongoDB connection strings:");
    console.log("  - Local: mongodb://localhost:27017/your-database-name");
    console.log("  - MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database-name");
    console.log("  - MongoDB Atlas (with options): mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority");
    return;
  }

  const mongoUrl = process.env.MONGO_URL.trim();
  console.log("✓ MONGO_URL is set");
  console.log(`  Length: ${mongoUrl.length} characters`);
  
  // Show preview (hide credentials)
  const urlPreview = mongoUrl.replace(/:[^:@]*@/, ":****@");
  console.log(`  Preview: ${urlPreview.substring(0, 80)}${urlPreview.length > 80 ? '...' : ''}`);

  // Validate URL format
  if (!mongoUrl.startsWith("mongodb://") && !mongoUrl.startsWith("mongodb+srv://")) {
    console.error("\n❌ ERROR: Invalid MONGO_URL format!");
    console.log("MONGO_URL must start with 'mongodb://' or 'mongodb+srv://'");
    return;
  }

  console.log("✓ URL format appears valid\n");

  // Try to connect
  console.log("Attempting to connect to MongoDB...");
  console.log("(This may take up to 20 seconds)\n");

  try {
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
      maxPoolSize: 1,
    });

    console.log("✓ Successfully connected to MongoDB!");
    
    // Test with a ping
    await mongoose.connection.db.admin().ping();
    console.log("✓ Database ping successful!");
    
    // Show connection info
    console.log("\nConnection Details:");
    console.log(`  Host: ${mongoose.connection.host}`);
    console.log(`  Port: ${mongoose.connection.port}`);
    console.log(`  Database: ${mongoose.connection.name}`);
    console.log(`  Ready State: ${mongoose.connection.readyState} (1 = connected)`);

    // Close connection
    await mongoose.connection.close();
    console.log("\n✓ Connection closed successfully");
    console.log("\n✅ All tests passed! Your database connection is working.");

  } catch (error) {
    console.error("\n❌ Connection failed!");
    console.error(`\nError: ${error.message}`);
    console.error(`Error Code: ${error.code || 'N/A'}`);
    console.error(`Error Name: ${error.name || 'N/A'}`);

    // Provide specific troubleshooting based on error
    console.log("\n--- Troubleshooting ---");
    
    if (error.message.includes("authentication") || error.code === 8000) {
      console.log("• Authentication failed - Check your username and password in MONGO_URL");
    } else if (error.message.includes("timeout") || error.code === "ETIMEDOUT") {
      console.log("• Connection timeout - Check your network connection");
      console.log("• If using MongoDB Atlas, check your IP whitelist");
      console.log("• Verify the MongoDB server is running and accessible");
    } else if (error.code === "ENOTFOUND" || error.message.includes("getaddrinfo")) {
      console.log("• DNS resolution failed - Check the hostname in your MONGO_URL");
      console.log("• Verify the cluster URL is correct (for MongoDB Atlas)");
    } else if (error.message.includes("SRV")) {
      console.log("• SRV record issue - Make sure you're using 'mongodb+srv://' for Atlas");
      console.log("• Check your DNS settings");
    } else {
      console.log("• Verify your MONGO_URL connection string is correct");
      console.log("• Check MongoDB server status");
      console.log("• Review firewall/network settings");
    }

    console.log("\nCommon fixes:");
    console.log("1. For MongoDB Atlas: Add your IP to the whitelist");
    console.log("2. Check if MongoDB service is running (for local installations)");
    console.log("3. Verify username/password are correct");
    console.log("4. Ensure the database name in the connection string is correct");
  }
}

// Run the test
testConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
