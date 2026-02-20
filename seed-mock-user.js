require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Create Prisma client - configuration from prisma.config.ts
const prisma = new PrismaClient();

async function seedMockUser() {
  try {
    // Check if mock user already exists
    const existingUser = await prisma.user.findFirst({
      where: { id: 'user_mock_123' }
    });

    if (existingUser) {
      console.log('Mock user already exists');
      return;
    }

    // Create mock user
    const mockUser = await prisma.user.create({
      data: {
        id: 'user_mock_123',
        email: 'mock@example.com',
        name: 'Mock User',
        orgName: 'Test Organization'
      }
    });

    console.log('Created mock user:', mockUser);
  } catch (error) {
    console.error('Error creating mock user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMockUser();