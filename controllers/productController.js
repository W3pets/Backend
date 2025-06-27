import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create a new product (seller only)
export const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const product = await prisma.product.create({
      data: {
        ...req.body,
        sellerId
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Get all products with optional filtering
export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      breed,
      gender,
      minPrice,
      maxPrice,
      location,
      search
    } = req.query;

    let where = {};

    if (category) where.category = category;
    if (breed) where.breed = breed;
    if (gender) where.gender = gender;
    if (location) where.location = location;
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) })
      };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            isVerified: true
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            isVerified: true
          }
        }
      }
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// Update product (seller only)
export const updateProduct = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const productId = parseInt(req.params.id);

    // Check if product exists and belongs to seller
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (existingProduct.sellerId !== sellerId) {
      return res.status(403).json({ message: "You can only update your own products" });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: req.body
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Delete product (seller only)
export const deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.verified.id;
    const productId = parseInt(req.params.id);

    // Check if product exists and belongs to seller
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (existingProduct.sellerId !== sellerId) {
      return res.status(403).json({ message: "You can only delete your own products" });
    }

    await prisma.product.delete({
      where: { id: productId }
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

// Get products by seller ID
export const getProductsBySeller = async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            isVerified: true
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching seller's products", error: error.message });
  }
};

// Track product view for analytics
export const trackProductView = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create view record
    await prisma.productView.create({
      data: {
        productId,
        ipAddress,
        userAgent
      }
    });

    res.json({ message: "View tracked successfully" });
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({ message: "Error tracking product view", error: error.message });
  }
}; 