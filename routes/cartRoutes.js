import express from 'express';
import { loginRequired } from '../helpers/auth.js';
import {
  addToCart,
  removeFromCart,
  viewCart,
  updateQuantity,
  initializePayment
} from '../controllers/cartController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Cart item ID
 *           example: 1
 *         productId:
 *           type: integer
 *           description: Product ID
 *           example: 5
 *         quantity:
 *           type: integer
 *           description: Quantity of the product
 *           example: 2
 *         product:
 *           $ref: '#/components/schemas/Product'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the cart item was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the cart item was last updated
 *     Cart:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total:
 *           type: number
 *           format: float
 *           description: Total price of all items in cart
 *           example: 1250.00
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Order ID
 *           example: 1
 *         userId:
 *           type: integer
 *           description: User ID who placed the order
 *           example: 42
 *         totalPrice:
 *           type: number
 *           format: float
 *           description: Total price of the order
 *           example: 1250.00
 *         status:
 *           type: string
 *           description: Current status of the order
 *           enum: [pending, processing, paid, failed, delivered]
 *           example: processing
 *         paymentId:
 *           type: string
 *           description: Payment transaction reference
 *           example: ORDER-123-1234567890
 *         deliveryAddress:
 *           type: string
 *           description: Delivery address for the order
 *           example: 123 Main Street, Lagos, Nigeria
 *         phoneNumber:
 *           type: string
 *           description: Contact phone number for delivery
 *           example: +234 123 456 7890
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *         error:
 *           type: string
 *           description: Detailed error information
 */

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: View cart contents
 *     description: Retrieves the current user's cart with all items and total price
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *             example:
 *               items:
 *                 - id: 1
 *                   productId: 5
 *                   quantity: 2
 *                   product:
 *                     id: 5
 *                     title: Golden Retriever Puppy
 *                     price: 500.00
 *                     imageUrl: http://example.com/image.jpg
 *               total: 1000.00
 *       401:
 *         description: Unauthorized - User not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', loginRequired, viewCart);

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the cart or increase its quantity if already exists
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 5
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item successfully added to cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized - User not logged in
 *       500:
 *         description: Server error
 */
router.post('/add', loginRequired, addToCart);

/**
 * @swagger
 * /api/cart/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a specific product from the cart completely
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to remove
 *         example: 5
 *     responses:
 *       200:
 *         description: Item successfully removed from cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Item removed from cart
 *       404:
 *         description: Cart or product not found
 *       401:
 *         description: Unauthorized - User not logged in
 *       500:
 *         description: Server error
 */
router.delete('/:productId', loginRequired, removeFromCart);

/**
 * @swagger
 * /api/cart/{productId}:
 *   put:
 *     summary: Update item quantity
 *     description: Update the quantity of a specific product in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to update
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity for the product
 *                 example: 3
 *     responses:
 *       200:
 *         description: Item quantity successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Invalid quantity
 *       404:
 *         description: Cart or product not found
 *       401:
 *         description: Unauthorized - User not logged in
 *       500:
 *         description: Server error
 */
router.put('/:productId', loginRequired, updateQuantity);

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Initialize payment and create order
 *     description: Creates an order and returns Interswitch web checkout payment data
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryAddress
 *               - phoneNumber
 *             properties:
 *               deliveryAddress:
 *                 type: string
 *                 description: Full delivery address
 *                 example: 123 Main Street, Lagos, Nigeria
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number for delivery
 *                 example: +234 123 456 7890
 *     responses:
 *       200:
 *         description: Order created and payment data generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentData:
 *                   type: object
 *                   properties:
 *                     merchantCode:
 *                       type: string
 *                       description: Interswitch merchant code
 *                     payItemId:
 *                       type: string
 *                       description: Interswitch product ID
 *                     customerEmail:
 *                       type: string
 *                       description: Customer's email address
 *                     redirectUrl:
 *                       type: string
 *                       description: URL to redirect after payment
 *                     amount:
 *                       type: integer
 *                       description: Amount in kobo
 *                     transactionReference:
 *                       type: string
 *                       description: Unique transaction reference
 *                     hash:
 *                       type: string
 *                       description: Security hash for payment verification
 *                 orderId:
 *                   type: integer
 *                   description: ID of the created order
 *             example:
 *               paymentData:
 *                 merchantCode: "MX12345"
 *                 payItemId: "Default_Payable_MX12345"
 *                 customerEmail: "customer@example.com"
 *                 redirectUrl: "https://yourapp.com/payment/callback"
 *                 amount: 125000
 *                 transactionReference: "ORDER-123-1234567890"
 *                 hash: "a1b2c3d4..."
 *               orderId: 123
 *       400:
 *         description: Empty cart or invalid request data
 *       401:
 *         description: Unauthorized - User not logged in
 *       500:
 *         description: Server error
 */
router.post('/checkout', loginRequired, initializePayment);

export default router; 