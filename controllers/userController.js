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
    const { username, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const accessToken = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "15m", // Short-lived access token
    });

    // Generate refresh token
    const refreshToken = await createRefreshToken({ userId: newUser.id });

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: "User created successfully",
      user: { 
        email: newUser.email,
        username: newUser.username,
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
    const { name, phoneNumber } = req.body;
    const userId = req.user.verified.userId; // From JWT token

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isSeller: true,
        name,
        phoneNumber,
        role: "seller"
      }
    });

    res.status(200).json({
      message: "Successfully became a seller",
      user: {
        email: updatedUser.email,
        isSeller: updatedUser.isSeller,
        name: updatedUser.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user to seller", error: error.message });
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

    res.json({ accessToken });
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

export { login, register, becomeSeller, refreshToken, getCurrentUser };
