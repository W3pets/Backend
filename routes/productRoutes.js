import express from 'express';
import { loginRequired, sellerRequired } from '../helpers/auth.js';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller
} from '../controllers/productController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - title
 *         - category
 *         - breed
 *         - age
 *         - gender
 *         - weight
 *         - price
 *         - location
 *         - description
 *         - imageUrl
 *         - videoUrl
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID of the product
 *         title:
 *           type: string
 *           description: Title of the pet listing
 *         category:
 *           type: string
 *           description: Category of pet (e.g., dog, cat)
 *         breed:
 *           type: string
 *           description: Breed of the pet
 *         age:
 *           type: string
 *           description: Age of the pet
 *         gender:
 *           type: string
 *           description: Gender of the pet
 *         weight:
 *           type: number
 *           format: float
 *           description: Weight of the pet in kg
 *         price:
 *           type: number
 *           format: float
 *           description: Price of the pet
 *         location:
 *           type: string
 *           description: Location where the pet is available
 *         description:
 *           type: string
 *           description: Detailed description of the pet
 *         imageUrl:
 *           type: string
 *           description: URL of the pet's image
 *         videoUrl:
 *           type: string
 *           description: URL of the pet's video
 *         sellerId:
 *           type: integer
 *           description: ID of the seller
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the product was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the product was last updated
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with optional filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by pet category
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by pet breed
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *         description: Filter by pet gender
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products/seller/{sellerId}:
 *   get:
 *     summary: Get all products by seller ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seller ID
 *     responses:
 *       200:
 *         description: List of seller's products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
router.get('/seller/:sellerId', getProductsBySeller);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - breed
 *               - age
 *               - gender
 *               - weight
 *               - price
 *               - location
 *               - description
 *               - imageUrl
 *               - videoUrl
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               breed:
 *                 type: string
 *               age:
 *                 type: string
 *               gender:
 *                 type: string
 *               weight:
 *                 type: number
 *               price:
 *                 type: number
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Seller privileges required
 */
router.post('/', loginRequired, sellerRequired, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               breed:
 *                 type: string
 *               age:
 *                 type: string
 *               gender:
 *                 type: string
 *               weight:
 *                 type: number
 *               price:
 *                 type: number
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Seller privileges required or not owner of the product
 *       404:
 *         description: Product not found
 */
router.put('/:id', loginRequired, sellerRequired, updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Seller privileges required or not owner of the product
 *       404:
 *         description: Product not found
 */
router.delete('/:id', loginRequired, sellerRequired, deleteProduct);

export default router; 