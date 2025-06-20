import express from "express";
import { loginRequired } from "../helpers/auth.js";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from "../controllers/userController.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user's unique ID.
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address.
 *         name:
 *           type: string
 *           description: The user's full name.
 *         phoneNumber:
 *           type: string
 *           description: The user's phone number.
 *         role:
 *           type: string
 *           description: The user's role (e.g., 'customer', 'seller').
 *         isSeller:
 *           type: boolean
 *           description: Flag indicating if the user is a seller.
 *         isVerified:
 *           type: boolean
 *           description: Flag indicating if the user's email is verified.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp of when the user was created.
 *     UserInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The user's full name.
 *         phoneNumber:
 *           type: string
 *           description: The user's phone number.
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management endpoints
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves the current user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/profile", loginRequired, getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates the current user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.put("/profile", loginRequired, updateUserProfile);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Delete user account
 *     description: Permanently deletes the current user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.delete("/account", loginRequired, deleteUserAccount);

export default router;
