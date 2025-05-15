import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../helpers/db.js";
import { sendEmail } from "../helpers/email.js";
import { generateToken } from "../helpers/utils.js";

// Temporary storage for unverified users
const unverifiedUsers = new Map();
// Temporary storage for password reset tokens
const passwordResetTokens = new Map();

export const signup = async (req, res) => {
  try {
    const { username, email, password, redirectUrl } = req.body;

    // Check if user already exists
    const existingUser = await db.oneOrNone(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Generate verification token
    const verificationToken = generateToken({ email }, "verification");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user data temporarily
    unverifiedUsers.set(verificationToken, {
      username,
      email,
      password: hashedPassword,
      redirectUrl,
      createdAt: new Date(),
    });

    // Create verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // Send verification email
    await sendEmail({
      to: email,
      subject: "Verify your email",
      text: `Click here to verify your email: ${verificationLink}`,
      html: `
        <h1>Welcome to W3Pets!</h1>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        ">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });

    res.status(200).json({
      message: "Verification link sent to your email",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: error,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Get user data from temporary storage
    const userData = unverifiedUsers.get(token);

    if (!userData) {
      return res.status(400).json({
        message: "Invalid or expired verification link",
      });
    }

    // Check if token is expired (24 hours)
    const isExpired = Date.now() - userData.createdAt > 24 * 60 * 60 * 1000;
    if (isExpired) {
      unverifiedUsers.delete(token);
      return res.status(400).json({
        message: "Verification link has expired",
      });
    }

    // Create user in database
    const newUser = await db.one(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role`,
      [userData.username, userData.email, userData.password, "user"]
    );

    // Generate tokens
    const accessToken = generateToken(newUser, "access");
    const refreshToken = generateToken(newUser, "refresh");

    // Store refresh token
    await db.none(
      "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)",
      [newUser.id, refreshToken]
    );

    // Clear temporary data
    unverifiedUsers.delete(token);

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // If there's a redirect URL, include it in the response
    const response = {
      message: "Email verified successfully",
      accessToken,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };

    if (userData.redirectUrl) {
      response.redirectUrl = userData.redirectUrl;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      message: "Error during email verification",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await db.oneOrNone(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );

    if (!user) {
      // Return success even if user doesn't exist for security
      return res.status(200).json({
        message: "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate reset token
    const resetToken = generateToken({ id: user.id }, "reset");
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      createdAt: new Date(),
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/forgot_reset/${resetToken}`;
    await sendEmail({
      to: email,
      subject: "Reset your password",
      text: `Click here to reset your password: ${resetLink}`,
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.status(200).json({
      message: "If your email is registered, you will receive a password reset link",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Error processing password reset request",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Get token data
    const tokenData = passwordResetTokens.get(token);

    if (!tokenData) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    // Check if token is expired (1 hour)
    const isExpired = Date.now() - tokenData.createdAt > 60 * 60 * 1000;
    if (isExpired) {
      passwordResetTokens.delete(token);
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.none("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      tokenData.userId,
    ]);

    // Get user data for token generation
    const user = await db.one(
      "SELECT id, username, email, role FROM users WHERE id = $1",
      [tokenData.userId]
    );

    // Generate new tokens
    const accessToken = generateToken(user, "access");
    const refreshToken = generateToken(user, "refresh");

    // Update refresh token
    await db.none(
      "UPDATE refresh_tokens SET token = $1 WHERE user_id = $2",
      [refreshToken, user.id]
    );

    // Clear reset token
    passwordResetTokens.delete(token);

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Password reset successful",
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      message: "Error resetting password",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await db.oneOrNone(
      "SELECT id, username, email, password, role FROM users WHERE email = $1",
      [email]
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Remove password from user object
    delete user.password;

    // Generate tokens
    const accessToken = generateToken(user, "access");
    const refreshToken = generateToken(user, "refresh");

    // Store refresh token in DB
    await db.none(
      `INSERT INTO refresh_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token`,
      [user.id, refreshToken]
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Check if token exists in DB
    const dbToken = await db.oneOrNone(
      "SELECT token FROM refresh_tokens WHERE user_id = $1",
      [payload.id]
    );
    if (!dbToken || dbToken.token !== token) {
      return res.status(401).json({ message: "Refresh token not found or does not match" });
    }

    // Get user info
    const user = await db.oneOrNone(
      "SELECT id, username, email, role FROM users WHERE id = $1",
      [payload.id]
    );
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Issue new tokens
    const newAccessToken = generateToken(user, "access");
    const newRefreshToken = generateToken(user, "refresh");

    // Update refresh token in DB
    await db.none(
      `UPDATE refresh_tokens SET token = $1 WHERE user_id = $2`,
      [newRefreshToken, user.id]
    );

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      accessToken: newAccessToken,
      user,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Error refreshing token" });
  }
};
 