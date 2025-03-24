import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Define enum values to match Prisma schema
enum UserRole {
  SALES = 'SALES',
  DESIGNER = 'DESIGNER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SHAREHOLDER = 'SHAREHOLDER',
  ADMIN = 'ADMIN'
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { name, email, password, role } = body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Prevent users from registering as ADMIN
    // If they try to register as ADMIN, set role to SALES instead
    const userRole = role === UserRole.ADMIN ? UserRole.SALES : role;
    
    // Create new user with hashed password and auto-approve them
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        // Auto-approve users by default
        isApproved: true
      }
    });
    
    // Return user without password
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during registration' },
      { status: 500 }
    );
  }
} 