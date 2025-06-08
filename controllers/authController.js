import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../helpers/db.js";
import { sendEmail } from "../helpers/email.js";
import { generateToken } from "../helpers/utils.js";

const isProduction = process.env.NODE_ENV === "production";
const { DEV_CLIENT_ORIGIN, PROD_CLIENT_ORIGIN } = process.env;

// Temporary storage for unverified users
const unverifiedUsers = new Map();
// Temporary storage for password reset tokens
const passwordResetTokens = new Map();

export const signup = async (req, res) => {
  try {
    const { email, password, phone, redirectUrl } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user data temporarily (for email verification)
    const userData = {
      email,
      password: hashedPassword,
      phoneNumber: phone || null,
      role: 'customer',
      isSeller: false,
      isVerified: false,
      redirectUrl
    };

    // Generate verification token
    const verificationToken = generateToken({ email }, "verification");

    // Clean up expired unverified users (older than 7 days)
    for (const [token, data] of unverifiedUsers.entries()) {
      if (Date.now() - data.createdAt > 7 * 24 * 60 * 60 * 1000) {
        unverifiedUsers.delete(token);
      }
    }

    // Store user data temporarily
    unverifiedUsers.set(verificationToken, {
      ...userData,
      createdAt: new Date()
    });

    // Send verification email
    const host = `${req.protocol}://${req.get('host')}`
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
        <h1>Welcome to W3pets!</h1>
        <p>Click the button below to verify your email:</p>
        <a href="${host}/api/auth/verify-email/${verificationToken}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you did not sign up for W3pets, please ignore this email.</p>
        <p>This verification link will expire in 7 days.</p>
      `,
    });

    res.status(201).json({
      message: "Verification link sent successfully",
      redirectUrl,
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Error during signup", error: error.message });
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

    // Check if token is expired (7 days)
    const isExpired = Date.now() - userData.createdAt > 7 * 24 * 60 * 60 * 1000;
    if (isExpired) {
      unverifiedUsers.delete(token);
      return res.status(400).json({
        message: "Verification link has expired",
      });
    }

    // Create user in database
    const newUser = await db.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
        isSeller: userData.isSeller,
        isVerified: true
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        isSeller: true,
        isVerified: true
      }
    });

    // Generate tokens
    const accessToken = generateToken(newUser, "access");
    const refreshToken = generateToken(newUser, "refresh");

    // Store refresh token
    await db.refreshToken.create({
      data: {
        userId: newUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // // Clear temporary data
    // unverifiedUsers.delete(token);

    // Set refresh token cookie with domain
    const domain = isProduction ? PROD_CLIENT_ORIGIN : DEV_CLIENT_ORIGIN;
    const cookieDomain = domain.split("//")[1].split(":")[0];

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax",
      domain: cookieDomain,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return success response with redirect information
    res.redirect(`${domain}${userData.redirectUrl}?token=${accessToken}}`);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error during email verification",
      error: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true
      }
    });

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
    await db.user.update({
      where: { id: tokenData.userId },
      data: { password: hashedPassword }
    });

    // Get user data for token generation
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSeller: true,
        isVerified: true
      }
    });

    // Generate new tokens
    const accessToken = generateToken(user, "access");
    const refreshToken = generateToken(user, "refresh");

    // Update refresh token
    await db.refreshToken.updateMany({
      where: { userId: user.id },
      data: { token: refreshToken }
    });

    // Clear reset token
    passwordResetTokens.delete(token);

    // Set refresh token cookie with domain
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      domain: process.env.COOKIE_DOMAIN,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Password reset successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isSeller: user.isSeller,
        isVerified: user.isVerified
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
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isSeller: true,
        isVerified: true
      }
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link."
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Generate tokens
    const accessToken = generateToken(userWithoutPassword, "access");
    const refreshToken = generateToken(userWithoutPassword, "refresh");

    // Store refresh token in DB
    await db.refreshToken.upsert({
      where: {
        userId: user.id
      },
      update: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      create: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Set refresh token cookie with domain
    const domain = isProduction ? PROD_CLIENT_ORIGIN : DEV_CLIENT_ORIGIN;
    const cookieDomain = domain.split("//")[1].split(":")[0];

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax",
      domain: cookieDomain,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error.message); // Only log error message, not the full error
    res.status(500).json({ message: "Error during login" });
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
    const dbToken = await db.refreshToken.findUnique({
      where: { userId: payload.id },
      select: { token: true }
    });
    if (!dbToken || dbToken.token !== token) {
      return res.status(401).json({ message: "Refresh token not found or does not match" });
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        isSeller: true,
        isVerified: true
      }
    });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Issue new tokens
    const newAccessToken = generateToken(user, "access");
    const newRefreshToken = generateToken(user, "refresh");

    // Update refresh token in DB
    await db.refreshToken.update({
      where: { userId: user.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      domain: process.env.COOKIE_DOMAIN,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      accessToken: newAccessToken,
      user,
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    res.status(500).json({ message: "Error refreshing token" });
  }
};
