import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log('Starting user seeding...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'testadmin@example.com' },
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation');
      return;
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('testpassword', saltRounds);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        isApproved: true, // Admin is automatically approved
      },
    });
    
    console.log(`Created admin user: ${admin.name} (${admin.email})`);
    console.log('User seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedUsers()
  .then(() => console.log('Done!'))
  .catch(e => console.error(e)); 