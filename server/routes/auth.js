const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  skipSuccessfulRequests: true, // only count failed requests
});

// Public routes
router.post("/login", authLimiter, authController.login);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.put("/reset-password", authLimiter, authController.resetPassword);
router.post("/register", authLimiter, authController.register); // Added registration route

// Protected routes
router.post("/logout", protect, authController.logout);
router.get("/validate-token", protect, authController.validateToken); // Added token validation

module.exports = router;
