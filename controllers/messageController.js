import { db } from "../helpers/db.js";
import { createNotification } from "../helpers/notification.js";

// Get all conversations for a user (customer or seller)
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.verified.id;
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true, isSeller: true }
        });

        let conversations;
        if (user.isSeller) {
            // Get conversations where user is the seller
            conversations = await db.conversation.findMany({
                where: { sellerId: userId },
                include: {
                    customer: {
                        select: {
                            id: true,
                            email: true,
                            businessName: true,
                            profileImage: true
                        }
                    },
                    product: {
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            price: true
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: {
                            messages: {
                                where: { isRead: false, senderId: { not: userId } }
                            }
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
        } else {
            // Get conversations where user is the customer
            conversations = await db.conversation.findMany({
                where: { customerId: userId },
                include: {
                    seller: {
                        select: {
                            id: true,
                            email: true,
                            businessName: true,
                            profileImage: true
                        }
                    },
                    product: {
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            price: true
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: {
                            messages: {
                                where: { isRead: false, senderId: { not: userId } }
                            }
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
        }

        // Transform data for frontend
        const transformedConversations = conversations.map(conv => ({
            id: conv.id,
            otherUser: user.isSeller ? conv.customer : conv.seller,
            product: conv.product,
            lastMessage: conv.messages[0] || null,
            unreadCount: conv._count.messages,
            subject: conv.subject,
            status: conv.status,
            updatedAt: conv.updatedAt
        }));

        res.json(transformedConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: "Error fetching conversations", error: error.message });
    }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
    try {
        const userId = req.user.verified.id;
        const conversationId = parseInt(req.params.conversationId);

        // Verify user has access to this conversation
        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { customerId: userId },
                    { sellerId: userId }
                ]
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Get messages
        const messages = await db.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        businessName: true,
                        profileImage: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Mark messages as read if they're from the other user
        await db.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false
            },
            data: { isRead: true }
        });

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: "Error fetching messages", error: error.message });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const userId = req.user.verified.id;
        const { conversationId, content, messageType = 'text', fileUrl } = req.body;

        // Verify user has access to this conversation
        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { customerId: userId },
                    { sellerId: userId }
                ]
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Create message
        const message = await db.message.create({
            data: {
                conversationId,
                senderId: userId,
                content,
                messageType,
                fileUrl
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        businessName: true,
                        profileImage: true
                    }
                }
            }
        });

        // Notify seller if the sender is not the seller
        if (conversation.sellerId !== userId) {
          await createNotification({
            userId: conversation.sellerId,
            type: "message",
            message: `New message from a customer.`
          });
        }

        // Update conversation timestamp
        await db.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: "Error sending message", error: error.message });
    }
};

// Start a new conversation
export const startConversation = async (req, res) => {
    try {
        const userId = req.user.verified.id;
        const { sellerId, productId, subject, initialMessage } = req.body;

        // Verify the seller exists and is actually a seller
        const seller = await db.user.findFirst({
            where: {
                id: sellerId,
                isSeller: true
            }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        // Check if conversation already exists
        let conversation = await db.conversation.findUnique({
            where: {
                customerId_sellerId_productId: {
                    customerId: userId,
                    sellerId,
                    productId: productId || null
                }
            }
        });

        if (!conversation) {
            // Create new conversation
            conversation = await db.conversation.create({
                data: {
                    customerId: userId,
                    sellerId,
                    productId,
                    subject
                }
            });
        }

        // Send initial message if provided
        let message = null;
        if (initialMessage) {
            message = await db.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: userId,
                    content: initialMessage,
                    messageType: 'text'
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            email: true,
                            businessName: true,
                            profileImage: true
                        }
                    }
                }
            });

            // Update conversation timestamp
            await db.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() }
            });
        }

        res.json({
            conversation,
            message
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({ message: "Error starting conversation", error: error.message });
    }
};

// Mark conversation as read
export const markConversationAsRead = async (req, res) => {
    try {
        const userId = req.user.verified.id;
        const conversationId = parseInt(req.params.conversationId);

        // Verify user has access to this conversation
        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { customerId: userId },
                    { sellerId: userId }
                ]
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Mark all unread messages as read
        await db.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({ message: "Conversation marked as read" });
    } catch (error) {
        console.error('Error marking conversation as read:', error);
        res.status(500).json({ message: "Error marking conversation as read", error: error.message });
    }
};

// Get unread message count for seller dashboard
export const getUnreadMessageCount = async (req, res) => {
    try {
        const sellerId = req.user.verified.id;

        const unreadCount = await db.message.count({
            where: {
                conversation: {
                    sellerId
                },
                senderId: { not: sellerId },
                isRead: false
            }
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error fetching unread message count:', error);
        res.status(500).json({ message: "Error fetching unread message count", error: error.message });
    }
}; 