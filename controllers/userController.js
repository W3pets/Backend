import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, getUserByEmail } from "../models/User.js";
import dotenv from "dotenv";

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
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(200).json({ token });
};

const register = async (req, res) => {
  try {
    const { username, name, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      username,
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user: { email: newUser.email },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

export { login, register };
