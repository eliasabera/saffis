require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("../server/config/db");
const logger = require("../server/config/logger");
const { initializeTwilio } = require("../server/config/twilio");

// Initialize Express
const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", limiter);

// Body Parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use(
  express.static(path.join(__dirname, "../public"), {
    maxAge: "1y",
    setHeaders: (res, path) => {
      if (path.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// Database Connection
(async () => {
  try {
    await connectDB();
    logger.info("MongoDB connected successfully");

    // Initialize Twilio after DB connection
    initializeTwilio();

    // Routes
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/delivery", require("./routes/delivery"));
    app.use("/api/sms", require("./routes/sms"));
    app.use("/api/admin", require("./routes/admin"));

    // Health Check Endpoint
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        database:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      });
    });

    // Serve Frontend (must be after API routes)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../public", "index.html"));
    });

    // Error Handling Middleware
    app.use((err, req, res, next) => {
      logger.error(`Error: ${err.message}`, {
        url: req.originalUrl,
        method: req.method,
        stack: err.stack,
      });

      res.status(err.status || 500).json({
        success: false,
        error:
          process.env.NODE_ENV === "development" ? err.message : "Server Error",
      });
    });

    // Start Server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    logger.error(`Server initialization failed: ${err.message}`);
    process.exit(1);
  }
})();

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  mongoose.connection.close(false, () => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
});
