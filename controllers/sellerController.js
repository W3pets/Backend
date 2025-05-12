import { db } from "../helpers/db.js";
import { getFileUrl } from "../helpers/fileUpload.js";

export const getDashboardStats = async (req, res) => {
    try {
        const sellerId = req.user.verified.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's views (you'll need to implement view tracking)
        const todaysViews = await db.productView.count({
            where: {
                product: {
                    sellerId: sellerId
                },
                createdAt: {
                    gte: today
                }
            }
        });

        // Get active products count
        const activeProducts = await db.product.count({
            where: {
                sellerId,
                status: 'active'
            }
        });

        // Get unread messages count
        const unreadMessages = await db.message.count({
            where: {
                recipientId: sellerId,
                read: false
            }
        });

        // Get total sales
        const totalSales = await db.order.aggregate({
            where: {
                products: {
                    some: {
                        product: {
                            sellerId
                        }
                    }
                },
                status: 'completed'
            },
            _sum: {
                totalPrice: true
            }
        });

        res.json({
            todaysViews,
            activeProducts,
            unreadMessages,
            totalSales: totalSales._sum.totalPrice || 0
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching dashboard stats", error: error.message });
    }
};

export const getSellerListings = async (req, res) => {
    try {
        const sellerId = req.user.verified.userId;
        
        const listings = await db.product.findMany({
            where: {
                sellerId
            },
            select: {
                id: true,
                title: true,
                price: true,
                category: true,
                breed: true,
                age: true,
                gender: true,
                imageUrl: true,
                status: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(listings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching listings", error: error.message });
    }
};

export const updateListing = async (req, res) => {
    try {
        const sellerId = req.user.verified.userId;
        const listingId = parseInt(req.params.id);
        
        // Verify ownership
        const listing = await db.product.findFirst({
            where: {
                id: listingId,
                sellerId
            }
        });

        if (!listing) {
            return res.status(404).json({ message: "Listing not found or unauthorized" });
        }

        // Update listing
        const updatedListing = await db.product.update({
            where: {
                id: listingId
            },
            data: req.body
        });

        res.json(updatedListing);
    } catch (error) {
        res.status(500).json({ message: "Error updating listing", error: error.message });
    }
};

export const getListingPreview = async (req, res) => {
    try {
        const sellerId = req.user.verified.userId;
        const listingId = parseInt(req.params.id);
        
        const listing = await db.product.findFirst({
            where: {
                id: listingId,
                sellerId
            },
            select: {
                id: true,
                title: true,
                price: true,
                category: true,
                breed: true,
                age: true,
                gender: true,
                imageUrl: true,
                status: true
            }
        });

        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        res.json(listing);
    } catch (error) {
        res.status(500).json({ message: "Error fetching listing preview", error: error.message });
    }
};

export const onboardSeller = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    // Validate required fields
    const requiredFields = [
      "business_name",
      "contact_phone",
      "business_address",
      "city",
      "state",
      "product_title",
      "product_category",
      "product_breed",
      "age",
      "quantity",
      "weight",
      "price",
      "gender",
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Validate files
    if (!files.brand_image || !files.product_photos) {
      return res.status(400).json({
        message: "Brand image and at least one product photo are required",
      });
    }

    // Get file URLs
    const brandImageUrl = getFileUrl(files.brand_image[0].key);
    const productPhotoUrls = files.product_photos.map(file => getFileUrl(file.key));
    const productVideoUrl = files.product_video ? getFileUrl(files.product_video[0].key) : null;

    // Start transaction
    const result = await db.tx(async (t) => {
      // Create seller profile
      const seller = await t.one(
        `INSERT INTO sellers (
          user_id,
          business_name,
          contact_phone,
          business_address,
          city,
          state,
          location_coords,
          seller_uniqueness,
          brand_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          userId,
          req.body.business_name,
          req.body.contact_phone,
          req.body.business_address,
          req.body.city,
          req.body.state,
          req.body.location_coords,
          req.body.seller_uniqueness,
          brandImageUrl,
        ]
      );

      // Create product listing
      const product = await t.one(
        `INSERT INTO products (
          seller_id,
          title,
          category,
          breed,
          age,
          quantity,
          weight,
          price,
          gender,
          photos,
          video_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          seller.id,
          req.body.product_title,
          req.body.product_category,
          req.body.product_breed,
          req.body.age,
          req.body.quantity,
          req.body.weight,
          req.body.price,
          req.body.gender,
          productPhotoUrls,
          productVideoUrl,
        ]
      );

      // Update user role to seller
      await t.none("UPDATE users SET role = 'seller' WHERE id = $1", [userId]);

      return { sellerId: seller.id, productId: product.id };
    });

    res.status(200).json({
      message: "Seller onboarding completed successfully",
      sellerId: result.sellerId,
    });
  } catch (error) {
    console.error("Seller onboarding error:", error);
    res.status(500).json({
      message: "Error during seller onboarding",
    });
  }
}; 