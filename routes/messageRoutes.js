import express from "express";
import { loginRequired } from "../helpers/auth.js";
import { 
    getConversations,
    getConversationMessages,
    sendMessage,
    startConversation,
    markConversationAsRead,
    getUnreadMessageCount
} from "../controllers/messageController.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Conversation ID
 *         otherUser:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             businessName:
 *               type: string
 *             profileImage:
 *               type: string
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *             imageUrl:
 *               type: string
 *             price:
 *               type: number
 *         lastMessage:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *         unreadCount:
 *           type: integer
 *         subject:
 *           type: string
 *         status:
 *           type: string
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         content:
 *           type: string
 *         messageType:
 *           type: string
 *           enum: [text, image, file]
 *         fileUrl:
 *           type: string
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         sender:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             businessName:
 *               type: string
 *             profileImage:
 *               type: string
 *
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get user's conversations
 *     description: Retrieves all conversations for the authenticated user (customer or seller)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/conversations", loginRequired, getConversations);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     description: Retrieves all messages for a specific conversation and marks them as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the conversation
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.get("/conversations/:conversationId/messages", loginRequired, getConversationMessages);

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Send a message
 *     description: Sends a message in an existing conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: integer
 *                 description: ID of the conversation
 *               content:
 *                 type: string
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               fileUrl:
 *                 type: string
 *                 description: URL for file/image (if messageType is not text)
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.post("/send", loginRequired, sendMessage);

/**
 * @swagger
 * /api/messages/conversations/start:
 *   post:
 *     summary: Start a new conversation
 *     description: Creates a new conversation between a customer and seller
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *             properties:
 *               sellerId:
 *                 type: integer
 *                 description: ID of the seller
 *               productId:
 *                 type: integer
 *                 description: ID of the product (optional)
 *               subject:
 *                 type: string
 *                 description: Conversation subject (optional)
 *               initialMessage:
 *                 type: string
 *                 description: Initial message to send (optional)
 *     responses:
 *       200:
 *         description: Conversation started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Seller not found
 *       500:
 *         description: Server error
 */
router.post("/conversations/start", loginRequired, startConversation);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/read:
 *   put:
 *     summary: Mark conversation as read
 *     description: Marks all messages in a conversation as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the conversation
 *     responses:
 *       200:
 *         description: Conversation marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Conversation marked as read"
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.put("/conversations/:conversationId/read", loginRequired, markConversationAsRead);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     description: Gets the count of unread messages for the authenticated user (typically used for seller dashboard)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   description: Number of unread messages
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/unread-count", loginRequired, getUnreadMessageCount);

export default router; 