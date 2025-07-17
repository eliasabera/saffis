// server/config/db.js
const mongoose = require("mongoose");
const logger = require("./logger"); // Optional logger

// MongoDB connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maximum number of sockets the MongoDB driver will keep open
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Timeout for socket operations
  family: 4, // Use IPv4, skip trying IPv6
};

// MongoDB connection URI from environment variables
const mongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/saffis-delivery";

// Connection events
mongoose.connection.on("connected", () => {
  logger.info(`MongoDB connected to ${mongoURI}`);
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

// For nodemon restarts
process.once("SIGUSR2", () => {
  gracefulShutdown("nodemon restart", () => {
    process.kill(process.pid, "SIGUSR2");
  });
});

// For app termination
process.on("SIGINT", () => {
  gracefulShutdown("app termination", () => {
    process.exit(0);
  });
});

// For Heroku app termination
process.on("SIGTERM", () => {
  gracefulShutdown("Heroku app shutdown", () => {
    process.exit(0);
  });
});

// Graceful shutdown function
const gracefulShutdown = async (msg, callback) => {
  try {
    await mongoose.connection.close();
    logger.info(`MongoDB disconnected through ${msg}`);
    callback();
  } catch (err) {
    logger.error(`Error shutting down MongoDB connection: ${err}`);
    process.exit(1);
  }
};

// Database connection function
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info("Using existing MongoDB connection");
      return mongoose.connection;
    }

    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", (collectionName, method, query, doc) => {
        logger.debug(`MongoDB: ${collectionName}.${method}`, {
          query,
          doc,
        });
      });
    }

    await mongoose.connect(mongoURI, connectionOptions);
    return mongoose.connection;
  } catch (err) {
    logger.error(`MongoDB connection error: ${err}`);
    process.exit(1);
  }
};

// Connection health check
const checkDBHealth = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return {
      status: "up",
      db: mongoose.connection.db.databaseName,
      ping: "ok",
    };
  } catch (err) {
    return {
      status: "down",
      error: err.message,
    };
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  mongoose, // Export mongoose if needed for transactions
};
