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