import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, getUserByEmail, getUserById } from "../models/User.js";
import { createRefreshToken, getRefreshToken, deleteRefreshToken } from "../models/Token.js";
import dotenv from "dotenv";
import { db } from "../helpers/db.js";

dotenv.config();

const login = async (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  const user = await getUserByEmail(email);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Check if the password is correct
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return res.status(400).json({ message: "Invalid password" });

  // Generate JWT token
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m", // Short-lived access token
  });

  // Generate refresh token
  const refreshToken = await createRefreshToken({ userId: user.id });

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(200).json({ 
    user: { 
      email: user.email,
      isSeller: user.isSeller,
      username: user.username 
    },
    accessToken
  });
};

const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      fullName,
      email,
      password: hashedPassword
    });

    // Generate JWT token
    const accessToken = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "15m"
    });

    // Generate refresh token
    const refreshToken = await createRefreshToken({ userId: newUser.id });

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: "Registration successful",
      user: { 
        email: newUser.email,
        fullName: newUser.fullName,
        isSeller: newUser.isSeller
      },
      accessToken
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

const becomeSeller = async (req, res) => {
  try {
    const { 
      businessName,
      phoneNumber, 
      address,
      city,
      state,
      location,
      description,
      profileImage 
    } = req.body;
    
    const userId = req.user.verified.userId;

    // Validate required fields
    if (!businessName || !phoneNumber || !address || !city || !state) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isSeller: true,
        businessName,
        phoneNumber,
        address,
        city,
        state,
        location,
        description,
        profileImage,
        role: "seller"
      }
    });

    res.status(200).json({
      message: "Seller profile created successfully",
      user: {
        email: updatedUser.email,
        businessName: updatedUser.businessName,
        isSeller: updatedUser.isSeller,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        location: updatedUser.location,
        description: updatedUser.description,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating seller profile", error: error.message });
  }
};

// Add new function for identity verification
const verifySellerIdentity = async (req, res) => {
  try {
    const userId = req.user.verified.userId;
    const { identityDocument } = req.body;

    if (!identityDocument) {
      return res.status(400).json({ message: "Identity document is required" });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        identityDocument,
        verificationStatus: 'pending'
      }
    });

    res.status(200).json({
      message: "Identity verification submitted successfully",
      verificationStatus: updatedUser.verificationStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Error submitting verification", error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }
    
    // Verify refresh token
    const storedToken = await getRefreshToken({ token: refreshToken });
    if (!storedToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Get user
    const user = await getUserById(storedToken.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Generate new refresh token
    await deleteRefreshToken({ token: refreshToken });
    const newRefreshToken = await createRefreshToken({ userId: user.id });

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ token: accessToken });
  } catch (error) {
    res.status(500).json({ message: "Error refreshing token" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      email: user.email,
      username: user.username,
      isSeller: user.isSeller,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSeller: true,
        isVerified: true,
        businessName: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        description: true,
        profileImage: true,
        verificationStatus: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { email, phoneNumber, address, city, state } = req.body;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined
      },
      select: {
        id: true,
        email: true,
        role: true,
        isSeller: true,
        isVerified: true,
        businessName: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        description: true,
        profileImage: true,
        verificationStatus: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Error updating user profile" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Start transaction
    await db.tx(async (t) => {
      // Delete user's refresh tokens
      await t.none("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);

      // Delete user's seller profile if exists
      await t.none("DELETE FROM sellers WHERE user_id = $1", [userId]);

      // Delete user's products if any
      await t.none("DELETE FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id = $1)", [userId]);

      // Finally delete the user
      await t.none("DELETE FROM users WHERE id = $1", [userId]);
    });

    res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete user account error:", error);
    res.status(500).json({
      message: "Error deleting user account",
    });
  }
};

export { 
  login, 
  register, 
  becomeSeller, 
  verifySellerIdentity,
  refreshToken, 
  getCurrentUser 
};
