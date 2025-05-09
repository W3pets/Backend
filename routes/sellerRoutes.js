import express from "express";
import { loginRequired, sellerRequired } from "../helpers/auth.js";
import { 
    getDashboardStats,
    getSellerListings,
    updateListing,
    getListingPreview
} from "../controllers/sellerController.js";

const router = express.Router();

/**
 * @swagger
 * /api/seller/dashboard/stats:
 *   get:
 *     summary: Get seller dashboard statistics
 *     description: Retrieves overview statistics for the seller dashboard including views, active products, messages, and sales
 *     tags: [Seller Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todaysViews:
 *                   type: number
 *                   description: Number of views today
 *                 activeProducts:
 *                   type: number
 *                   description: Number of active product listings
 *                 unreadMessages:
 *                   type: number
 *                   description: Number of unread messages
 *                 totalSales:
 *                   type: number
 *                   description: Total sales amount in Naira
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as a seller
 *       500:
 *         description: Server error
 */
router.get("/dashboard/stats", loginRequired, sellerRequired, getDashboardStats);

/**
 * @swagger
 * /api/seller/listings:
 *   get:
 *     summary: Get seller's product listings
 *     description: Retrieves all listings for the current seller with basic information
 *     tags: [Seller Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller's listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   title:
 *                     type: string
 *                   price:
 *                     type: number
 *                   category:
 *                     type: string
 *                   breed:
 *                     type: string
 *                   age:
 *                     type: string
 *                   gender:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, sold]
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as a seller
 *       500:
 *         description: Server error
 */
router.get("/listings", loginRequired, sellerRequired, getSellerListings);

/**
 * @swagger
 * /api/seller/listings/{id}/edit:
 *   put:
 *     summary: Update a product listing
 *     description: Updates an existing product listing with new information
 *     tags: [Seller Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the listing to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the product
 *               price:
 *                 type: number
 *                 description: Price in Naira
 *               category:
 *                 type: string
 *                 description: Product category
 *               breed:
 *                 type: string
 *                 description: Breed of the animal
 *               age:
 *                 type: string
 *                 description: Age of the animal
 *               gender:
 *                 type: string
 *                 description: Gender of the animal
 *               description:
 *                 type: string
 *                 description: Detailed description
 *               imageUrl:
 *                 type: string
 *                 description: URL to the product image
 *               videoUrl:
 *                 type: string
 *                 description: URL to the product video
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as a seller
 *       404:
 *         description: Listing not found or not owned by seller
 *       500:
 *         description: Server error
 */
router.put("/listings/:id/edit", loginRequired, sellerRequired, updateListing);

/**
 * @swagger
 * /api/seller/listings/{id}/preview:
 *   get:
 *     summary: Get preview of a listing
 *     description: Retrieves preview data for a specific listing
 *     tags: [Seller Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the listing to preview
 *     responses:
 *       200:
 *         description: Listing preview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 title:
 *                   type: string
 *                 price:
 *                   type: number
 *                 category:
 *                   type: string
 *                 breed:
 *                   type: string
 *                 age:
 *                   type: string
 *                 gender:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *                 status:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as a seller
 *       404:
 *         description: Listing not found
 *       500:
 *         description: Server error
 */
router.get("/listings/:id/preview", loginRequired, sellerRequired, getListingPreview);

/**
 * @swagger
 * /api/seller/onboarding:
 *   post:
 *     summary: Complete seller onboarding
 *     description: Creates seller profile and initial product listing
 *     tags: [Seller Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profile
 *               - listing
 *             properties:
 *               profile:
 *                 type: object
 *                 required:
 *                   - business_name
 *                   - contact_phone
 *                   - business_address
 *                   - city
 *                   - state
 *                 properties:
 *                   business_name:
 *                     type: string
 *                     description: Name of the business
 *                   contact_phone:
 *                     type: string
 *                     description: Business contact phone number
 *                   business_address:
 *                     type: string
 *                     description: Business address
 *                   city:
 *                     type: string
 *                     description: City where business is located
 *                   state:
 *                     type: string
 *                     description: State where business is located
 *                   location_coords:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *                   seller_uniqueness:
 *                     type: string
 *                     description: What makes the seller unique
 *                   brand_image:
 *                     type: string
 *                     description: URL to brand image/logo
 *               listing:
 *                 type: object
 *                 required:
 *                   - product_title
 *                   - product_category
 *                   - product_brand
 *                   - age
 *                   - quantity
 *                   - weight
 *                   - price
 *                   - gender
 *                   - product_photos
 *                 properties:
 *                   product_title:
 *                     type: string
 *                     description: Title of the product
 *                   product_category:
 *                     type: string
 *                     description: Category of the product
 *                   product_brand:
 *                     type: string
 *                     description: Brand of the product
 *                   age:
 *                     type: string
 *                     description: Age of the animal
 *                   quantity:
 *                     type: number
 *                     description: Available quantity
 *                   weight:
 *                     type: number
 *                     description: Weight of the animal
 *                   price:
 *                     type: number
 *                     description: Price in Naira
 *                   gender:
 *                     type: string
 *                     description: Gender of the animal
 *                   product_photos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Array of product photo URLs
 *                   product_video:
 *                     type: string
 *                     description: URL to product video (max 20MB)
 *     responses:
 *       200:
 *         description: Seller onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sellerId:
 *                   type: number
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post("/onboarding", loginRequired, onboardSeller);

export default router; 