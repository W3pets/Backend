import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAnalytics() {
  try {
    console.log('Testing Analytics Endpoints...\n');

    // Create a test seller
    const seller = await prisma.user.create({
      data: {
        email: 'test-seller@example.com',
        password: 'hashedpassword',
        role: 'seller',
        isSeller: true,
        isVerified: true,
        businessName: 'Test Pet Store'
      }
    });

    console.log('✅ Created test seller:', seller.email);

    // Create test products
    const product1 = await prisma.product.create({
      data: {
        title: 'Persian Cat',
        category: 'cat',
        breed: 'Persian',
        age: '2 years',
        gender: 'female',
        weight: 4.5,
        price: 80000,
        location: 'Lagos',
        description: 'Beautiful Persian cat',
        imageUrl: 'https://example.com/cat1.jpg',
        videoUrl: 'https://example.com/cat1.mp4',
        sellerId: seller.id
      }
    });

    const product2 = await prisma.product.create({
      data: {
        title: 'Golden Retriever',
        category: 'dog',
        breed: 'Golden Retriever',
        age: '1 year',
        gender: 'male',
        weight: 25.0,
        price: 120000,
        location: 'Abuja',
        description: 'Friendly Golden Retriever',
        imageUrl: 'https://example.com/dog1.jpg',
        videoUrl: 'https://example.com/dog1.mp4',
        sellerId: seller.id
      }
    });

    console.log('✅ Created test products');

    // Create test buyer
    const buyer = await prisma.user.create({
      data: {
        email: 'test-buyer@example.com',
        password: 'hashedpassword',
        role: 'customer',
        isVerified: true
      }
    });

    console.log('✅ Created test buyer');

    // Create test product views
    for (let i = 0; i < 10; i++) {
      await prisma.productView.create({
        data: {
          productId: product1.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Test Browser)'
        }
      });
    }

    for (let i = 0; i < 5; i++) {
      await prisma.productView.create({
        data: {
          productId: product2.id,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Test Browser)'
        }
      });
    }

    console.log('✅ Created test product views');

    // Create test orders
    const order1 = await prisma.order.create({
      data: {
        userId: buyer.id,
        totalPrice: 80000,
        status: 'completed',
        deliveryAddress: '123 Test Street',
        phoneNumber: '08012345678'
      }
    });

    const order2 = await prisma.order.create({
      data: {
        userId: buyer.id,
        totalPrice: 120000,
        status: 'completed',
        deliveryAddress: '456 Test Avenue',
        phoneNumber: '08087654321'
      }
    });

    console.log('✅ Created test orders');

    // Create order products
    await prisma.orderProduct.create({
      data: {
        orderId: order1.id,
        productId: product1.id,
        quantity: 1,
        price: 80000
      }
    });

    await prisma.orderProduct.create({
      data: {
        orderId: order2.id,
        productId: product2.id,
        quantity: 1,
        price: 120000
      }
    });

    console.log('✅ Created order products');

    // Test analytics queries
    console.log('\n📊 Testing Analytics Queries...\n');

    // Test summary analytics
    const summary = await prisma.order.aggregate({
      where: {
        products: {
          some: {
            product: {
              sellerId: seller.id
            }
          }
        },
        status: 'completed'
      },
      _sum: {
        totalPrice: true
      }
    });

    console.log('Total Revenue:', summary._sum.totalPrice || 0);

    const totalViews = await prisma.productView.count({
      where: {
        product: {
          sellerId: seller.id
        }
      }
    });

    console.log('Total Views:', totalViews);

    const totalSales = await prisma.order.count({
      where: {
        products: {
          some: {
            product: {
              sellerId: seller.id
            }
          }
        },
        status: 'completed'
      }
    });

    console.log('Total Sales:', totalSales);

    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
    console.log('Conversion Rate:', conversionRate.toFixed(2) + '%');

    console.log('\n✅ Analytics test completed successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('- Seller ID:', seller.id);
    console.log('- Product IDs:', product1.id, product2.id);
    console.log('- Buyer ID:', buyer.id);
    console.log('- Order IDs:', order1.id, order2.id);

  } catch (error) {
    console.error('❌ Error testing analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalytics(); 