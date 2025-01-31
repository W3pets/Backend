import express from "express";
import { login, register, becomeSeller } from "../controllers/userController.js";
import { preventLoggedUser, loginRequired } from "../helpers/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.post("/login", preventLoggedUser, login);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 */
router.post("/register", preventLoggedUser, register);

/**
 * @swagger
 * /api/users/become-seller:
 *   post:
 *     summary: Upgrade a regular user to seller status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumber
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the seller
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number for the seller
 *     responses:
 *       200:
 *         description: Successfully upgraded to seller status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully became a seller
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     isSeller:
 *                       type: boolean
 *                     name:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post("/become-seller", loginRequired, becomeSeller);

export default router;
