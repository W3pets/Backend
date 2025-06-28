import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    
    // Find or create cart for user
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
    }

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: "Error fetching cart" });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if product already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: parseInt(productId)
        }
      }
    });

    if (existingItem) {
      // Update quantity
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: true }
      });
      res.json(updatedItem);
    } else {
      // Add new item
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: parseInt(productId),
          quantity
        },
        include: { product: true }
      });
      res.status(201).json(newItem);
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: "Error adding to cart" });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    // Verify cart ownership
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: { userId }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: parseInt(itemId) },
      data: { quantity },
      include: { product: true }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: "Error updating cart item" });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { itemId } = req.params;

    // Verify cart ownership
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: { userId }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    await prisma.cartItem.delete({
      where: { id: parseInt(itemId) }
    });

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: "Error removing from cart" });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.verified.id;

    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });
    }

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: "Error clearing cart" });
  }
};

// View cart
export const viewCart = async (req, res) => {
  try {
    const userId = req.user.verified.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) {
      return res.json({ items: [], total: 0 });
    }

    // Calculate total
    const total = cart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.json({ items: cart.items, total });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error: error.message });
  }
};

// Update item quantity
export const updateQuantity = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartItem = await prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: parseInt(productId)
        }
      },
      data: {
        quantity: parseInt(quantity)
      }
    });

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ message: "Error updating quantity", error: error.message });
  }
};

// Initialize payment
export const initializePayment = async (req, res) => {
  try {
    const userId = req.user.verified.id;
    const { deliveryAddress, phoneNumber } = req.body;

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        totalPrice: totalAmount,
        deliveryAddress,
        phoneNumber,
        products: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        }
      }
    });

    // Generate transaction reference
    const txnRef = `ORDER-${order.id}-${Date.now()}`;

    // Generate hash
    const hash = crypto.createHash('sha512')
      .update(`${process.env.INTERSWITCH_PRODUCT_ID}${txnRef}${Math.round(totalAmount * 100)}${process.env.INTERSWITCH_MAC_KEY}`)
      .digest('hex');

    // Prepare payment data for Interswitch web checkout
    const paymentData = {
      merchantCode: process.env.INTERSWITCH_MERCHANT_CODE,
      payItemId: process.env.INTERSWITCH_PRODUCT_ID,
      customerEmail: req.user.email,
      redirectUrl: `${process.env.FRONTEND_URL}/payment/callback`,
      amount: Math.round(totalAmount * 100), // Convert to kobo
      transactionReference: txnRef,
      hash: hash
    };

    // Update order with payment reference
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: txnRef,
        status: 'processing'
      }
    });

    // Clear cart after successful order creation
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    res.json({
      paymentData,
      orderId: order.id
    });
  } catch (error) {
    res.status(500).json({ message: "Error initializing payment", error: error.message });
  }
};

// Handle payment webhook
export const handlePaymentWebhook = async (req, res) => {
  try {
    const { reference, status, amount } = req.body;

    // Verify payment with Interswitch
    const payment = await interswitch.verify(reference);

    if (!payment.verified) {
      throw new Error('Payment verification failed');
    }

    // Extract order ID from reference
    const orderId = parseInt(reference.replace('ORDER-', ''));

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: payment.status === 'successful' ? 'paid' : 'failed',
        paymentStatus: payment.status
      }
    });

    res.json({ message: "Webhook processed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error processing webhook", error: error.message });
  }
}; 