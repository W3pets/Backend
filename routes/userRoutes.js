import express from "express";
import { 
  login, 
  register, 
  becomeSeller, 
  verifySellerIdentity, // Add this import
  refreshToken, 
  getCurrentUser 
} from "../controllers/userController.js";
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
 *     summary: Register a new regular user
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
 *                     username:
 *                       type: string
 *                     isSeller:
 *                       type: boolean
 *                 token:
 *                   type: string
 */
router.post("/register", preventLoggedUser, register);

/**
 * @swagger
 * /api/users/become-seller:
 *   post:
 *     summary: Upgrade a regular user to seller status
 *     description: Used when a regular user wants to become a seller. Requires authentication.
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
 *               - fullName
 *               - phoneNumber
 *               - address
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Full name of the seller
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number for the seller
 *               address:
 *                 type: string
 *                 description: Business address of the seller
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
 *                     phoneNumber:
 *                       type: string
 *                     address:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/users/seller/profile:
 *   post:
 *     summary: Step 1 - Create seller profile
 *     tags: [Sellers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - phoneNumber
 *               - address
 *               - city
 *               - state
 *               - location
 *             properties:
 *               businessName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               location:
 *                 type: object
 *               description:
 *                 type: string
 *               profileImage:
 *                 type: string
 */
router.post('/seller/profile', loginRequired, becomeSeller);

/**
 * @swagger
 * /api/users/seller/verify:
 *   post:
 *     summary: Step 2 - Submit seller verification
 *     tags: [Sellers]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - identityDocument
 *             properties:
 *               identityDocument:
 *                 type: string
 *                 format: binary
 */
router.post('/seller/verify', loginRequired, verifySellerIdentity);

/**
 * @swagger
 * /api/users/refresh-token:
 *   post:
 *     summary: Refresh the access token
 *     description: Uses the HTTP-only refresh token cookie to generate a new access token
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: No refresh token or invalid refresh token
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 isSeller:
 *                   type: boolean
 *                 isVerified:
 *                   type: boolean
 */
router.get("/me", loginRequired, getCurrentUser);

export default router;
