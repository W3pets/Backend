import { db } from "../helpers/db.js";

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
    const { profile, listing } = req.body;

    // Validate required fields
    const requiredProfileFields = [
      "business_name",
      "contact_phone",
      "business_address",
      "city",
      "state",
    ];

    const requiredListingFields = [
      "product_title",
      "product_category",
      "product_breed",
      "age",
      "quantity",
      "weight",
      "price",
      "gender",
      "product_photos",
    ];

    // Check required profile fields
    for (const field of requiredProfileFields) {
      if (!profile[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Check required listing fields
    for (const field of requiredListingFields) {
      if (!listing[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Validate product photos
    if (!Array.isArray(listing.product_photos) || listing.product_photos.length === 0) {
      return res.status(400).json({
        message: "At least one product photo is required",
      });
    }

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
          profile.business_name,
          profile.contact_phone,
          profile.business_address,
          profile.city,
          profile.state,
          profile.location_coords,
          profile.seller_uniqueness,
          profile.brand_image,
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
          listing.product_title,
          listing.product_category,
          listing.product_breed,
          listing.age,
          listing.quantity,
          listing.weight,
          listing.price,
          listing.gender,
          listing.product_photos,
          listing.product_video,
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