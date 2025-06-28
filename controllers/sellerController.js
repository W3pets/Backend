import { db } from "../helpers/db.js";
import { getFileUrl } from "../helpers/fileUpload.js";

export const getDashboardStats = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;
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
        const sellerId = req.user.verified.id;
        
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
        const sellerId = req.user.verified.id;
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
        const sellerId = req.user.verified.id;
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
    const userId = req.user.verified.id;
    const files = req.files;

    // Parse JSON strings from frontend
    let listingData, profileData;
    try {
      listingData = JSON.parse(req.body.listing);
      profileData = JSON.parse(req.body.profile);
    } catch (error) {
      return res.status(400).json({
        message: "Invalid JSON data in listing or profile fields",
      });
    }

    // Validate required fields from profile
    const requiredProfileFields = [
      "business_name",
      "contact_phone", 
      "business_address",
      "city",
      "state"
    ];

    for (const field of requiredProfileFields) {
      if (!profileData[field]) {
        return res.status(400).json({
          message: `Missing required profile field: ${field}`,
        });
      }
    }

    // Validate required fields from listing
    const requiredListingFields = [
      "product_title",
      "product_category",
      "product_brand", // Note: frontend uses product_brand, not product_breed
      "age",
      "quantity",
      "weight",
      "price",
      "gender"
    ];

    for (const field of requiredListingFields) {
      if (!listingData[field]) {
        return res.status(400).json({
          message: `Missing required listing field: ${field}`,
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
    const verificationIdUrl = files.verification_id ? getFileUrl(files.verification_id[0].key) : null;

    // Start transaction using Prisma
    const result = await db.$transaction(async (tx) => {
      // Update user with seller information
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: 'seller',
          isSeller: true,
          businessName: profileData.business_name,
          phoneNumber: profileData.contact_phone,
          address: profileData.business_address,
          city: profileData.city,
          state: profileData.state,
          location: profileData.location_coords ? JSON.stringify(profileData.location_coords) : null,
          description: profileData.seller_uniqueness,
          profileImage: brandImageUrl,
          identityDocument: verificationIdUrl,
          verificationStatus: verificationIdUrl ? 'pending' : null
        }
      });

      // Create product listing
      const product = await tx.product.create({
        data: {
          title: listingData.product_title,
          category: listingData.product_category,
          breed: listingData.product_brand, // Map product_brand to breed
          age: listingData.age.toString(),
          gender: listingData.gender,
          weight: parseFloat(listingData.weight),
          price: parseFloat(listingData.price),
          location: profileData.city + ', ' + profileData.state,
          description: listingData.product_title, // Use title as description for now
          imageUrl: productPhotoUrls[0], // Use first photo as main image
          videoUrl: productVideoUrl || '',
          sellerId: userId
        }
      });

      return { userId: updatedUser.id, productId: product.id };
    });

    res.status(200).json({
      message: "Seller onboarding completed successfully",
      sellerId: result.userId,
      productId: result.productId
    });
  } catch (error) {
    console.error("Seller onboarding error:", error);
    res.status(500).json({
      message: "Error during seller onboarding",
      error: error.message
    });
  }
};

// Analytics Controller Functions
export const getAnalyticsSummary = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Get today's revenue
        const todayRevenue = await db.order.aggregate({
            where: {
                products: {
                    some: {
                        product: {
                            sellerId
                        }
                    }
                },
                status: 'completed',
                createdAt: {
                    gte: today
                }
            },
            _sum: {
                totalPrice: true
            }
        });

        // Get yesterday's revenue for comparison
        const yesterdayRevenue = await db.order.aggregate({
            where: {
                products: {
                    some: {
                        product: {
                            sellerId
                        }
                    }
                },
                status: 'completed',
                createdAt: {
                    gte: yesterday,
                    lt: today
                }
            },
            _sum: {
                totalPrice: true
            }
        });

        // Calculate revenue change percentage
        const todayRev = todayRevenue._sum.totalPrice || 0;
        const yesterdayRev = yesterdayRevenue._sum.totalPrice || 0;
        const revenueChange = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : 0;

        // Get total sales count
        const totalSales = await db.order.count({
            where: {
                products: {
                    some: {
                        product: {
                            sellerId
                        }
                    }
                },
                status: 'completed'
            }
        });

        // Get total views
        const totalViews = await db.productView.count({
            where: {
                product: {
                    sellerId
                }
            }
        });

        // Get conversion rate (sales / views * 100)
        const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

        res.json({
            todayRevenue: todayRev,
            revenueChange: Math.round(revenueChange * 100) / 100, // Round to 2 decimal places
            totalSales,
            totalViews,
            conversionRate: Math.round(conversionRate * 100) / 100
        });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: "Error fetching analytics summary", error: error.message });
    }
};

export const getRevenueAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;
        const { period = 'week' } = req.query; // week, month, year

        let startDate, endDate, groupBy;
        const now = new Date();

        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                groupBy = 'week';
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                groupBy = 'month';
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
        }

        // Get revenue data grouped by period
        const revenueData = await db.$queryRaw`
            SELECT 
                CASE 
                    WHEN ${groupBy} = 'day' THEN DATE(o."createdAt")
                    WHEN ${groupBy} = 'week' THEN DATE_TRUNC('week', o."createdAt")
                    WHEN ${groupBy} = 'month' THEN DATE_TRUNC('month', o."createdAt")
                END as label,
                SUM(o."totalPrice") as value
            FROM "Order" o
            JOIN "OrderProduct" op ON o.id = op."orderId"
            JOIN "Product" p ON op."productId" = p.id
            WHERE p."sellerId" = ${sellerId}
                AND o.status = 'completed'
                AND o."createdAt" >= ${startDate}
            GROUP BY label
            ORDER BY label
        `;

        res.json(revenueData);
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ message: "Error fetching revenue analytics", error: error.message });
    }
};

export const getViewsAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;
        const { period = 'week' } = req.query; // week, month, year

        let startDate, groupBy;
        const now = new Date();

        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                groupBy = 'week';
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                groupBy = 'month';
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
        }

        // Get views data grouped by period
        const viewsData = await db.$queryRaw`
            SELECT 
                CASE 
                    WHEN ${groupBy} = 'day' THEN DATE(pv."createdAt")
                    WHEN ${groupBy} = 'week' THEN DATE_TRUNC('week', pv."createdAt")
                    WHEN ${groupBy} = 'month' THEN DATE_TRUNC('month', pv."createdAt")
                END as label,
                COUNT(*) as value
            FROM "ProductView" pv
            JOIN "Product" p ON pv."productId" = p.id
            WHERE p."sellerId" = ${sellerId}
                AND pv."createdAt" >= ${startDate}
            GROUP BY label
            ORDER BY label
        `;

        res.json(viewsData);
    } catch (error) {
        console.error('Error fetching views analytics:', error);
        res.status(500).json({ message: "Error fetching views analytics", error: error.message });
    }
};

export const getRecentSales = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;
        const { limit = 10 } = req.query;

        const recentSales = await db.order.findMany({
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
            select: {
                id: true,
                totalPrice: true,
                createdAt: true,
                user: {
                    select: {
                        email: true
                    }
                },
                products: {
                    select: {
                        product: {
                            select: {
                                title: true
                            }
                        },
                        quantity: true,
                        price: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });

        // Transform data to match frontend expectations
        const transformedSales = recentSales.map(order => {
            const firstProduct = order.products[0]?.product;
            return {
                key: order.id.toString(),
                item: firstProduct?.title || 'Unknown Product',
                price: order.totalPrice,
                date: order.createdAt.toISOString().split('T')[0],
                buyer: order.user.email
            };
        });

        res.json(transformedSales);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ message: "Error fetching recent sales", error: error.message });
    }
};

export const getProductPerformance = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;

        const productPerformance = await db.product.findMany({
            where: {
                sellerId
            },
            select: {
                id: true,
                title: true,
                price: true,
                category: true,
                _count: {
                    select: {
                        views: true,
                        orders: true
                    }
                }
            },
            orderBy: {
                views: {
                    _count: 'desc'
                }
            }
        });

        // Transform data to include performance metrics
        const performanceData = productPerformance.map(product => ({
            id: product.id,
            title: product.title,
            price: product.price,
            category: product.category,
            views: product._count.views,
            sales: product._count.orders,
            conversionRate: product._count.views > 0 ? 
                (product._count.orders / product._count.views) * 100 : 0
        }));

        res.json(performanceData);
    } catch (error) {
        console.error('Error fetching product performance:', error);
        res.status(500).json({ message: "Error fetching product performance", error: error.message });
    }
}; 