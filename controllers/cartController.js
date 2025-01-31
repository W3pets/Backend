import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.verified.userId;
    const { productId, quantity = 1 } = req.body;

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get or create user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Add or update cart item
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: parseInt(productId)
        }
      },
      update: {
        quantity: {
          increment: parseInt(quantity)
        }
      },
      create: {
        cartId: cart.id,
        productId: parseInt(productId),
        quantity: parseInt(quantity)
      }
    });

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error: error.message });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.verified.userId;
    const { productId } = req.params;

    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await prisma.cartItem.delete({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: parseInt(productId)
        }
      }
    });

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ message: "Error removing from cart", error: error.message });
  }
};

// View cart
export const viewCart = async (req, res) => {
  try {
    const userId = req.user.verified.userId;

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
    const userId = req.user.verified.userId;
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
    const userId = req.user.verified.userId;
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