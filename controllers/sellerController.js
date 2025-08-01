import { db } from "../helpers/db.js";
import { getFileUrl } from "../helpers/fileUpload.js";
import { createNotification, getNotificationSettings, updateNotificationSettings } from "../helpers/notification.js";

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

        // Get unread messages count using the new message system
        const unreadMessages = await db.message.count({
            where: {
                conversation: {
                    sellerId
                },
                senderId: { not: sellerId },
                isRead: false
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
    const files = req.files || {};

    // Debug logging
    console.log('Files received:', JSON.stringify(files, null, 2));
    console.log('Request body keys:', Object.keys(req.body));

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

    // Validate files - check if files exist and have content
    if (!files.brand_image || !Array.isArray(files.brand_image) || files.brand_image.length === 0) {
      console.log('Brand image validation failed:', files.brand_image);
      return res.status(400).json({
        message: "Brand image is required",
      });
    }

    if (!files.product_photos || !Array.isArray(files.product_photos) || files.product_photos.length === 0) {
      console.log('Product photos validation failed:', files.product_photos);
      return res.status(400).json({
        message: "At least one product photo is required",
      });
    }

    // Get file URLs
    const brandImageUrl = getFileUrl(files.brand_image[0].key);
    const productPhotoUrls = files.product_photos.map(file => getFileUrl(file.key));
    const productVideoUrl = files.product_video && Array.isArray(files.product_video) && files.product_video.length > 0 
      ? getFileUrl(files.product_video[0].key) 
      : null;
    const verificationIdUrl = files.verification_id && Array.isArray(files.verification_id) && files.verification_id.length > 0 
      ? getFileUrl(files.verification_id[0].key) 
      : null;

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

// Get seller notifications
export const getSellerNotifications = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const notifications = await db.notification.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        read: true
      }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
}; 

// Customer Support
export const getSellerSupport = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    
    // For now, return a basic support structure
    // In a real app, this would fetch support tickets, FAQs, etc.
    res.json({
      supportTickets: [],
      faqs: [
        {
          question: "How do I add more products?",
          answer: "Go to Products section and click 'New Product' to add more listings."
        },
        {
          question: "How do I track my sales?",
          answer: "Check the Analytics section to view your sales performance and revenue."
        },
        {
          question: "How do I respond to customer messages?",
          answer: "Go to Messages section to view and respond to customer inquiries."
        }
      ],
      contactInfo: {
        email: "support@w3pets.com",
        phone: "+234 123 456 7890",
        hours: "Monday - Friday, 9AM - 6PM"
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching support information", error: error.message });
  }
};

// Settings - Profile Management
export const getSellerProfileSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    
    const seller = await db.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        email: true,
        businessName: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        description: true,
        profileImage: true,
        location: true
      }
    });

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile settings", error: error.message });
  }
};

export const updateSellerProfileSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const { businessName, phoneNumber, address, city, state, description, location } = req.body;

    // Validate input
    if (phoneNumber && !/^[+]?[\d\s-()]+$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Validate required fields are not empty strings
    const fields = { businessName, city, state };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value.trim() === '') {
        return res.status(400).json({ message: `${key} cannot be empty` });
      }
    }

    const updatedSeller = await db.user.update({
      where: { id: sellerId },
      data: {
        businessName,
        phoneNumber,
        address,
        city,
        state,
        description,
        location: location ? JSON.stringify(location) : null
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        description: true,
        profileImage: true,
        location: true
      }
    });

    res.json(updatedSeller);
  } catch (error) {
    res.status(500).json({ message: "Error updating profile settings", error: error.message });
  }
};

// Settings - Notification Preferences
export const getSellerNotificationSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    
    // Get notification settings using helper function
    const preferences = await getNotificationSettings(sellerId);

    // Return with legacy field names for backward compatibility
    res.json({
      emailNotifications: preferences.email ?? true,
      pushNotifications: preferences.push ?? true,
      orderNotifications: preferences.order ?? true,
      messageNotifications: preferences.message ?? true,
      productNotifications: preferences.product ?? true,
      marketingNotifications: preferences.marketing ?? false
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching notification settings", error: error.message });
  }
};

export const updateSellerNotificationSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const { emailNotifications, pushNotifications, orderNotifications, messageNotifications, productNotifications, marketingNotifications } = req.body;

    // Convert legacy field names to new JSON structure
    const preferences = {
      email: emailNotifications,
      push: pushNotifications,
      order: orderNotifications,
      message: messageNotifications,
      product: productNotifications,
      marketing: marketingNotifications
    };

    // Update notification settings using helper function
    await updateNotificationSettings(sellerId, preferences);

    res.json({
      message: "Notification settings updated successfully",
      settings: {
        emailNotifications: preferences.email,
        pushNotifications: preferences.push,
        orderNotifications: preferences.order,
        messageNotifications: preferences.message,
        productNotifications: preferences.product,
        marketingNotifications: preferences.marketing
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification settings", error: error.message });
  }
};

// Settings - Security
export const getSellerSecuritySettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    
    // For now, return basic security info
    res.json({
      twoFactorEnabled: false,
      lastPasswordChange: new Date().toISOString(),
      loginHistory: [],
      activeSessions: 1
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching security settings", error: error.message });
  }
};

export const updateSellerSecuritySettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const { currentPassword, newPassword, twoFactorEnabled } = req.body;

    if (newPassword) {
      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
        return res.status(400).json({ message: "Password must contain uppercase, lowercase, numbers, and special characters" });
      }

      // Verify current password
      const seller = await db.user.findUnique({
        where: { id: sellerId },
        select: { password: true }
      });

      const bcrypt = await import('bcrypt');
      const isMatch = await bcrypt.compare(currentPassword, seller.password);
      
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.user.update({
        where: { id: sellerId },
        data: { password: hashedPassword }
      });
    }

    res.json({ message: "Security settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating security settings", error: error.message });
  }
};

// Settings - Payment
export const getSellerPaymentSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    
    // For now, return basic payment info
    res.json({
      bankAccount: {
        accountNumber: "****1234",
        bankName: "First Bank",
        accountName: "John Doe"
      },
      payoutSchedule: "weekly",
      minimumPayout: 5000,
      totalEarnings: 150000,
      pendingPayout: 25000
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching payment settings", error: error.message });
  }
};

export const updateSellerPaymentSettings = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const { bankAccount, payoutSchedule, minimumPayout } = req.body;

    // In a real app, this would update payment settings in a separate table
    res.json({ message: "Payment settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating payment settings", error: error.message });
  }
};

// Product Management
export const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const productData = req.body;

    // Validate required fields
    const { title, price, category, description } = productData;
    if (!title || !price || !category) {
      return res.status(400).json({ message: "Missing required fields: title, price, category" });
    }

    // Validate price is a number
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    const product = await db.product.create({
      data: {
        title,
        price: parseFloat(price),
        category,
        description,
        breed: productData.breed,
        age: productData.age,
        gender: productData.gender,
        weight: productData.weight,
        location: productData.location,
        imageUrl: productData.imageUrl,
        videoUrl: productData.videoUrl,
        status: 'active',
        sellerId
      }
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const productId = parseInt(req.params.id);

    // Verify ownership
    const product = await db.product.findFirst({
      where: {
        id: productId,
        sellerId
      }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    await db.product.delete({
      where: { id: productId }
    });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
}; 