const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendSMS, sendEmail } = require("../config/notifications"); // Expanded notification service
const crypto = require("crypto");

// Token generation helper
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      // Add session identifier for enhanced security
      sessionId: crypto.randomBytes(16).toString("hex"),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

// Login controller with enhanced security
exports.login = async (req, res, next) => {
  try {
    const { email, phone, password, role } = req.body;

    // Validate input
    if (!(email || phone) || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields",
      });
    }

    // Add rate limiting check here or at middleware level
    if (req.rateLimit.remaining < 5) {
      console.warn(`Rate limiting approaching for IP: ${req.ip}`);
    }

    const user = await User.findOne({
      $or: [{ email }, { phone }],
      role,
    }).select("+password +loginAttempts +lockUntil");

    // Account lock check
    if (user?.lockUntil && user.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked. Try again in ${retryAfter} seconds`,
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Increment failed attempts
      if (user) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
        }
        await user.save();
      }

      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    const token = generateToken(user);
    user.password = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;

    // Set secure HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      token, // Also return token for mobile clients
      user,
      redirectTo: getDashboardRoute(user.role),
    });
  } catch (error) {
    next(error); // Pass to error handling middleware
  }
};

// Enhanced logout controller
exports.logout = async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie("token");

    // Optional: Add token to blacklist
    if (req.cookies.token) {
      await TokenBlacklist.create({ token: req.cookies.token });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// Password reset with enhanced security
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      // Don't reveal whether user exists
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate unique reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send reset link
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/reset-password/${resetToken}`;

    if (phone) {
      await sendSMS(
        phone,
        `Your password reset code: ${resetToken.substring(0, 6)}`
      );
    } else {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message: `Submit a PATCH request with your new password to: ${resetUrl}`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Token sent to email/phone",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with stored version
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Invalidate all existing sessions
    await Session.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
